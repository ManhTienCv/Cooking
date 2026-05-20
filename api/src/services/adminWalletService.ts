import { z } from 'zod';
import { pool } from '../db/pool.js';
import { httpError } from '../lib/httpError.js';

// Schemas
export const adminBankAccountSchema = z.object({
  bank_bin: z.string().min(3).max(10),
  bank_name: z.string().min(2).max(100),
  account_number: z.string().min(5).max(50),
  account_name: z.string().min(2).max(100).toUpperCase(),
});

function parsePayload<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw httpError(422, parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.', {
      details: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export async function getAdminWallet(adminId: number) {
  // 1. Calculate total commission earned (sum of all 'fee' transactions)
  const earnedRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total_earned 
     FROM wallet_transactions 
     WHERE type = 'fee' AND status = 'completed'`
  );
  const totalEarned = Number(earnedRes.rows[0]?.total_earned || 0);

  // 2. Calculate total withdrawn by this admin
  const withdrawnRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total_withdrawn 
     FROM admin_withdrawals 
     WHERE admin_id = $1 AND status = 'completed'`,
    [adminId]
  );
  const totalWithdrawn = Number(withdrawnRes.rows[0]?.total_withdrawn || 0);

  // 3. Current active balance
  const balance = totalEarned - totalWithdrawn;

  // 4. Get bank accounts
  const banksRes = await pool.query(
    `SELECT id, bank_bin, bank_name, account_number, account_name, created_at 
     FROM admin_bank_accounts 
     WHERE admin_id = $1 
     ORDER BY created_at DESC`,
    [adminId]
  );

  // 5. Get unified history (fees and withdrawals)
  const historyRes = await pool.query(
    `SELECT 'fee' AS type, amount, description, created_at, 'completed' AS status
     FROM wallet_transactions 
     WHERE type = 'fee' AND status = 'completed'
     UNION ALL
     SELECT 'withdrawal' AS type, amount, 'Rút tiền hoa hồng về ngân hàng' AS description, created_at, status
     FROM admin_withdrawals 
     WHERE admin_id = $1
     ORDER BY created_at DESC 
     LIMIT 50`,
    [adminId]
  );

  return {
    success: true,
    wallet: {
      balance,
      total_earned: totalEarned,
      total_withdrawn: totalWithdrawn,
    },
    banks: banksRes.rows,
    transactions: historyRes.rows,
  };
}

export async function addAdminBankAccount(adminId: number, body: unknown) {
  const payload = parsePayload(adminBankAccountSchema, body);

  try {
    const r = await pool.query(
      `INSERT INTO admin_bank_accounts (admin_id, bank_bin, bank_name, account_number, account_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, bank_bin, bank_name, account_number, account_name, created_at`,
      [adminId, payload.bank_bin, payload.bank_name, payload.account_number, payload.account_name]
    );

    return { success: true, message: 'Liên kết tài khoản ngân hàng admin thành công.', account: r.rows[0] };
  } catch (err: any) {
    if (err.code === '23505') {
      throw httpError(409, 'Tài khoản ngân hàng này đã được liên kết.');
    }
    throw err;
  }
}

export async function deleteAdminBankAccount(adminId: number, accountId: string) {
  const r = await pool.query(
    'DELETE FROM admin_bank_accounts WHERE id = $1 AND admin_id = $2 RETURNING id',
    [accountId, adminId]
  );

  if ((r.rowCount ?? 0) === 0) {
    throw httpError(404, 'Không tìm thấy tài khoản ngân hàng hoặc bạn không có quyền xóa.');
  }

  return { success: true, message: 'Xóa liên kết ngân hàng thành công.' };
}

export async function createAdminWithdrawal(adminId: number, body: unknown) {
  const payload = parsePayload(
    z.object({
      amount: z.number().min(50000, "Số tiền rút tối thiểu là 50.000 VNĐ"),
      bankAccountId: z.string().uuid(),
    }),
    body
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Calculate active commission balance under pessimistic control (if multiple admins withdraw simultaneously)
    const earnedRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_earned 
       FROM wallet_transactions 
       WHERE type = 'fee' AND status = 'completed'`
    );
    const totalEarned = Number(earnedRes.rows[0]?.total_earned || 0);

    // Lock admin withdrawals
    const withdrawnRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_withdrawn 
       FROM admin_withdrawals 
       WHERE admin_id = $1 AND status = 'completed' FOR UPDATE`,
      [adminId]
    );
    const totalWithdrawn = Number(withdrawnRes.rows[0]?.total_withdrawn || 0);

    const balance = totalEarned - totalWithdrawn;

    if (balance < payload.amount) {
      throw httpError(400, 'Số dư hoa hồng khả dụng của hệ thống không đủ.');
    }

    // 2. Validate Bank Account ownership
    const bankRes = await client.query(
      'SELECT id FROM admin_bank_accounts WHERE id = $1 AND admin_id = $2',
      [payload.bankAccountId, adminId]
    );
    if (bankRes.rows.length === 0) {
      throw httpError(403, 'Tài khoản ngân hàng liên kết không hợp lệ.');
    }

    // 3. Create Withdrawal Request (instantly completed)
    await client.query(
      `INSERT INTO admin_withdrawals (admin_id, admin_bank_account_id, amount, status)
       VALUES ($1, $2, $3, 'completed')`,
      [adminId, payload.bankAccountId, payload.amount]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Rút tiền hoa hồng thành công. Tiền đã được chuyển vào tài khoản ngân hàng ảo của bạn.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
