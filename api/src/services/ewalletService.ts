import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { env } from '../env.js';
import { httpError } from '../lib/httpError.js';
import { sendOtpEmail } from './mailService.js';
import { createMoMoPayment, verifyMoMoSignature } from './momoService.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const BCRYPT_COST = 12;

function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

// Schemas
export const bankAccountSchema = z.object({
  bank_bin: z.string().min(3, 'Mã BIN ngân hàng phải có ít nhất 3 ký tự').max(10),
  bank_name: z.string().min(1, 'Tên ngân hàng không được để trống').max(100),
  account_number: z.string().min(3, 'Số tài khoản phải có ít nhất 3 ký tự').max(50),
  account_name: z.string().min(1, 'Tên chủ tài khoản không được để trống').max(100).toUpperCase(),
});

function parsePayload<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw httpError(422, parsed.error.issues[0]?.message ?? 'Dữ liệu yêu cầu không hợp lệ.', {
      details: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

// Service functions
export async function getBankAccounts(userId: number) {
  const r = await pool.query(
    'SELECT id, bank_bin, bank_name, account_number, account_name, is_default, created_at FROM user_bank_accounts WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return { success: true, accounts: r.rows };
}

export async function getWallet(userId: number) {
  // Get or create wallet
  let walletRes = await pool.query(
    'SELECT id, balance, frozen_balance, currency FROM wallets WHERE user_id = $1',
    [userId]
  );
  
  if (walletRes.rows.length === 0) {
    walletRes = await pool.query(
      'INSERT INTO wallets (user_id) VALUES ($1) RETURNING id, balance, frozen_balance, currency',
      [userId]
    );
  }
  
  const wallet = walletRes.rows[0];

  // Get latest 20 transactions
  const txRes = await pool.query(
    'SELECT id, amount, type, status, description, created_at FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 20',
    [wallet.id]
  );

  return { success: true, wallet, transactions: txRes.rows };
}

export async function addBankAccount(userId: number, body: unknown) {
  const payload = parsePayload(
    z.object({
      bank: bankAccountSchema,
      otpCode: z.string().length(6),
    }),
    body
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await verifyEwalletOtp(client, userId, 'add_bank', payload.otpCode);

    const r = await client.query(
      `INSERT INTO user_bank_accounts (user_id, bank_bin, bank_name, account_number, account_name, is_default)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, bank_bin, bank_name, account_number, account_name, is_default, created_at`,
      [userId, payload.bank.bank_bin, payload.bank.bank_name, payload.bank.account_number, payload.bank.account_name]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Thêm tài khoản ngân hàng thành công', account: r.rows[0] };
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw httpError(409, 'Tài khoản ngân hàng này đã được thêm.');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteBankAccount(userId: number, accountId: string) {
  const r = await pool.query(
    'DELETE FROM user_bank_accounts WHERE id = $1 AND user_id = $2 RETURNING id',
    [accountId, userId]
  );
  
  if ((r.rowCount ?? 0) === 0) {
    throw httpError(404, 'Không tìm thấy tài khoản ngân hàng hoặc bạn không có quyền xóa.');
  }

  return { success: true, message: 'Xóa tài khoản ngân hàng thành công.' };
}

export async function createWithdrawalRequest(userId: number, body: unknown) {
  const payload = parsePayload(
    z.object({
      amount: z.number().min(50000, "Số tiền rút tối thiểu là 50.000 VNĐ"),
      bankAccountId: z.string().uuid(),
      otpCode: z.string().length(6),
    }),
    body
  );

  const AUTO_WITHDRAW_THRESHOLD = 5000000; // 5.000.000 VNĐ

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify OTP using transaction client
    await verifyEwalletOtp(client, userId, 'withdraw', payload.otpCode);

    // 2. Pessimistic Lock on user's wallet
    const walletRes = await client.query(
      'SELECT id, balance, frozen_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    const wallet = walletRes.rows[0];

    if (!wallet) {
      throw httpError(404, 'Không tìm thấy ví của người dùng.');
    }

    if (Number(wallet.balance) < payload.amount) {
      throw httpError(400, 'Số dư khả dụng không đủ để thực hiện lệnh rút này.');
    }

    // 3. Validate Bank Account ownership
    const bankRes = await client.query(
      'SELECT bank_name, account_number FROM user_bank_accounts WHERE id = $1 AND user_id = $2',
      [payload.bankAccountId, userId]
    );
    if (bankRes.rows.length === 0) {
      throw httpError(403, 'Tài khoản ngân hàng không hợp lệ.');
    }
    const bank = bankRes.rows[0];
    const bankDesc = `Rút tiền về ${bank.bank_name} (${bank.account_number.slice(-4)})`;

    const isAuto = payload.amount < AUTO_WITHDRAW_THRESHOLD;

    if (isAuto) {
      // Direct Deduct Balance (Instant auto-withdraw)
      await client.query(
        `UPDATE wallets 
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [payload.amount, wallet.id]
      );

      // Create Completed Withdrawal Request
      const requestRes = await client.query(
        `INSERT INTO withdrawal_requests (user_id, bank_account_id, amount, status, admin_note)
         VALUES ($1, $2, $3, 'completed', 'Duyệt tự động (Hệ thống chi hộ dưới 5M)')
         RETURNING id`,
        [userId, payload.bankAccountId, payload.amount]
      );
      const requestId = requestRes.rows[0].id;

      // Create Completed Transaction Log
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, type, status, reference_id, description)
         VALUES ($1, $2, 'withdrawal', 'completed', $3, $4)`,
        [wallet.id, payload.amount, 'withdraw-' + requestId, bankDesc]
      );

      await client.query('COMMIT');
      return { success: true, message: `Rút tiền thành công! Đã tự động chi hộ ${payload.amount.toLocaleString('vi-VN')}đ về tài khoản ngân hàng.` };
    } else {
      // Manual approval flow: Deduct balance, increase frozen balance
      await client.query(
        `UPDATE wallets 
         SET balance = balance - $1, frozen_balance = frozen_balance + $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [payload.amount, wallet.id]
      );

      // Create Pending Withdrawal Request
      const requestRes = await client.query(
        `INSERT INTO withdrawal_requests (user_id, bank_account_id, amount, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id`,
        [userId, payload.bankAccountId, payload.amount]
      );
      const requestId = requestRes.rows[0].id;

      // Create Pending Transaction Log
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, type, status, reference_id, description)
         VALUES ($1, $2, 'withdrawal', 'pending', $3, $4)`,
        [wallet.id, payload.amount, 'withdraw-' + requestId, bankDesc]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Tạo lệnh rút tiền thành công. Số tiền rút đã được đóng băng. Vui lòng chờ quản trị viên duyệt (Lệnh rút trên 5.000.000đ).' };
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function requestEwalletOtp(userId: number, action: string) {
  if (!['add_bank', 'withdraw', 'topup'].includes(action)) {
    throw httpError(400, 'Hành động xác thực OTP không hợp lệ.');
  }

  const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) throw httpError(404, 'Không tìm thấy thông tin người dùng.');
  const email = userRes.rows[0].email;

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_COST);
  const exp = new Date(Date.now() + OTP_EXPIRY_MS);

  await pool.query(
    `INSERT INTO ewallet_otps (user_id, otp_hash, action, expires_at, attempt_count, resend_count)
     VALUES ($1, $2, $3, $4, 0, 1)
     ON CONFLICT (user_id) DO UPDATE SET
       otp_hash = EXCLUDED.otp_hash,
       action = EXCLUDED.action,
       expires_at = EXCLUDED.expires_at,
       attempt_count = 0,
       resend_count = ewallet_otps.resend_count + 1,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, otpHash, action, exp]
  );

  const sent = await sendOtpEmail(email, otp, 'ewallet');
  if (!sent) throw httpError(503, 'Không thể gửi email chứa mã OTP.');

  return { success: true, message: 'Mã OTP đã được gửi đến email của bạn.' };
}

export async function verifyEwalletOtp(client: any, userId: number, action: string, otpCode: string) {
  const r = await client.query(
    'SELECT otp_hash, action, expires_at, attempt_count FROM ewallet_otps WHERE user_id = $1 FOR UPDATE',
    [userId]
  );
  const row = r.rows[0];

  if (!row || row.action !== action) {
    throw httpError(400, 'Không tìm thấy yêu cầu OTP đang hoạt động cho hành động này.');
  }

  if (row.expires_at < new Date()) {
    await client.query('DELETE FROM ewallet_otps WHERE user_id = $1', [userId]);
    throw httpError(400, 'Mã OTP đã hết hạn. Vui lòng gửi yêu cầu lấy mã mới.');
  }

  if (row.attempt_count >= OTP_MAX_ATTEMPTS) {
    await client.query('DELETE FROM ewallet_otps WHERE user_id = $1', [userId]);
    throw httpError(429, 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã OTP mới.');
  }

  const otpOk = (/^\d{6}$/.test(env.testOtpCode) && otpCode === env.testOtpCode) || (await bcrypt.compare(otpCode, row.otp_hash));
  if (!otpOk) {
    const nextAttempts = row.attempt_count + 1;
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      await client.query('DELETE FROM ewallet_otps WHERE user_id = $1', [userId]);
      throw httpError(429, 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã OTP mới.');
    }
    await client.query('UPDATE ewallet_otps SET attempt_count = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [
      nextAttempts,
      userId,
    ]);
    throw httpError(401, 'Mã OTP không chính xác. Bạn còn lại ' + (OTP_MAX_ATTEMPTS - nextAttempts) + ' lần thử.');
  }

  // OTP is valid. Consume it.
  await client.query('DELETE FROM ewallet_otps WHERE user_id = $1', [userId]);
  return true;
}

/* ================================================================
 * CookPay — Thanh toán đơn hàng bằng số dư ví
 * ================================================================ */

export async function payOrder(userId: number, orderId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock order row
    const orderRes = await client.query(
      'SELECT id, total_amount, payment_status, status FROM orders WHERE id = $1 AND buyer_id = $2 FOR UPDATE',
      [orderId, userId]
    );
    const order = orderRes.rows[0];
    if (!order) throw httpError(404, 'Đơn hàng không tồn tại.');
    if (order.payment_status === 'paid') throw httpError(400, 'Đơn hàng đã được thanh toán.');
    if (order.status === 'cancelled') throw httpError(400, 'Đơn hàng đã bị hủy.');

    const amount = Number(order.total_amount);

    // 2. Lock wallet + check balance
    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    const wallet = walletRes.rows[0];
    if (!wallet) throw httpError(404, 'Bạn chưa có Ví Cook. Vui lòng nạp tiền trước.');
    if (Number(wallet.balance) < amount) {
      throw httpError(400, 'Số dư Ví Cook không đủ. Vui lòng nạp thêm tiền.');
    }

    // 3. Deduct balance
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, wallet.id]
    );

    // 4. Record transaction
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, type, status, reference_id, description)
       VALUES ($1, $2, 'payment', 'completed', $3, $4)`,
      [wallet.id, amount, 'pay-order-' + orderId, 'Thanh toán đơn hàng #' + orderId]
    );

    // 5. Update order payment status + auto-confirm
    await client.query(
      `UPDATE orders SET payment_status = 'paid', paid_amount = $1, paid_via = 'cookpay',
       status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
       updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [amount, orderId]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Thanh toán thành công bằng Ví Cook!' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Hoàn tiền vào Ví Cook khi đơn hàng bị hủy.
 * Chỉ hoàn nếu đơn đã thanh toán qua CookPay.
 */
export async function refundOrder(orderId: number, buyerId: number, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert wallet
    await client.query(
      'INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [buyerId]
    );

    // Credit balance
    const walletRes = await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING id',
      [amount, buyerId]
    );
    const walletId = walletRes.rows[0]?.id;
    if (!walletId) {
      await client.query('ROLLBACK');
      return;
    }

    // Record refund transaction
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, type, status, reference_id, description)
       VALUES ($1, $2, 'refund', 'completed', $3, $4)`,
      [walletId, amount, 'refund-order-' + orderId, 'Hoàn tiền đơn hàng #' + orderId + ' bị hủy']
    );

    // Update order payment_status
    await client.query(
      "UPDATE orders SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [orderId]
    );

    await client.query('COMMIT');
    console.info('[cookpay] Refunded ' + amount + ' to user ' + buyerId + ' for order #' + orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[cookpay] Refund failed for order #' + orderId, err instanceof Error ? err.message : err);
  } finally {
    client.release();
  }
}

/* ================================================================
 * MoMo — Nạp tiền qua MoMo
 * ================================================================ */

export async function createMomoTopup(userId: number, amount: number, otpCode?: string) {
  if (amount < 10000) throw httpError(400, 'Số tiền nạp tối thiểu là 10,000 VND');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (amount >= 5000000) {
      if (!otpCode) {
        throw httpError(400, 'Giao dịch nạp tiền từ 5.000.000đ trở lên yêu cầu xác thực OTP.');
      }
      await verifyEwalletOtp(client, userId, 'topup', otpCode);
    }
    
    const walletData = await getWallet(userId);
    
    // Create pending deposit transaction
    const transRes = await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, type, status, description)
       VALUES ($1, $2, 'deposit', 'pending', 'Nạp tiền qua MoMo')
       RETURNING id`,
      [walletData.wallet.id, amount]
    );
    const transId = transRes.rows[0].id;
    
    // Generate MoMo Payment URL
    const orderInfo = `Nạp ${amount} VND vào Ví Cook`;
    const momoResponse = await createMoMoPayment(transId, amount, orderInfo);
    
    if (momoResponse && momoResponse.resultCode === 0) {
      await client.query('COMMIT');
      return { payUrl: momoResponse.payUrl };
    } else {
      throw new Error(momoResponse.message || 'Lỗi từ MoMo');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw httpError(500, err instanceof Error ? err.message : 'Lỗi tạo giao dịch nạp tiền');
  } finally {
    client.release();
  }
}

export async function createBankTopup(userId: number, amount: number, bankAccountId: string, otpCode?: string) {
  if (amount < 10000) throw httpError(400, 'Số tiền nạp tối thiểu là 10.000 VNĐ');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (amount >= 5000000) {
      if (!otpCode) {
        throw httpError(400, 'Giao dịch nạp tiền từ 5.000.000đ trở lên yêu cầu xác thực OTP.');
      }
      await verifyEwalletOtp(client, userId, 'topup', otpCode);
    }

    // Check if bank account exists and belongs to user
    const bankRes = await client.query(
      'SELECT bank_name, account_number FROM user_bank_accounts WHERE id = $1 AND user_id = $2',
      [bankAccountId, userId]
    );
    if (bankRes.rows.length === 0) {
      throw httpError(404, 'Không tìm thấy tài khoản ngân hàng liên kết.');
    }
    const bank = bankRes.rows[0];

    const walletData = await getWallet(userId);

    // Update balance directly
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, walletData.wallet.id]
    );

    // Create completed deposit transaction
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, type, status, description)
       VALUES ($1, $2, 'deposit', 'completed', $3)`,
      [walletData.wallet.id, amount, `Nạp tiền từ ${bank.bank_name} (${bank.account_number.slice(-4)})`]
    );

    await client.query('COMMIT');
    return { success: true, message: `Nạp thành công ${amount.toLocaleString('vi-VN')}đ từ ngân hàng ${bank.bank_name}.` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function processMomoIpn(query: any) {
  const isValid = verifyMoMoSignature(query);
  if (!isValid) {
    throw httpError(400, 'Chữ ký MoMo không hợp lệ');
  }
  
  const transId = query.orderId;
  const resultCode = query.resultCode;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Lock transaction
    const transRes = await client.query(
      'SELECT * FROM wallet_transactions WHERE id = $1 FOR UPDATE',
      [transId]
    );
    
    if (transRes.rowCount === 0) {
      throw new Error('Không tìm thấy giao dịch');
    }
    
    const transaction = transRes.rows[0];
    
    if (transaction.status !== 'pending') {
      await client.query('ROLLBACK');
      return { message: 'Giao dịch nạp tiền đã được xử lý thành công trước đó.' };
    }
    
    if (resultCode === 0) {
      // Success - Update balance and transaction status
      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [transaction.amount, transaction.wallet_id]
      );
      await client.query(
        'UPDATE wallet_transactions SET status = $1, reference_id = $2 WHERE id = $3',
        ['completed', query.transId?.toString() || '', transId]
      );
    } else {
      // Failed
      await client.query(
        'UPDATE wallet_transactions SET status = $1, reference_id = $2 WHERE id = $3',
        ['failed', query.transId?.toString() || '', transId]
      );
    }
    
    await client.query('COMMIT');
    return { message: 'OK' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('MoMo IPN processing error:', err);
    throw httpError(500, 'Lỗi xử lý IPN');
  } finally {
    client.release();
  }
}
