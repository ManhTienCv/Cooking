import crypto from 'node:crypto';
import https from 'node:https';
import { env } from '../env.js';
import { pool } from '../db/pool.js';

export interface MoMoCreatePaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl?: string;
  shortLink?: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

export interface MoMoIpnBody {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number | string;
  orderInfo: string;
  orderType: string;
  transId: number | string;
  resultCode: number | string;
  message: string;
  payType: string;
  responseTime: number | string;
  extraData: string;
  signature: string;
}

/**
 * Ghi nhận giao dịch thanh toán khởi tạo vào bảng payment_transactions
 */
export async function recordPaymentTransaction(params: {
  orderId: number;
  gatewayOrderId: string;
  amount: number;
  status: string;
  requestPayload?: unknown;
}): Promise<number> {
  try {
    const res = await pool.query<{ id: number }>(
      `INSERT INTO payment_transactions (order_id, gateway, gateway_order_id, amount, status, request_payload, created_at, updated_at)
       VALUES ($1, 'momo', $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [params.orderId, params.gatewayOrderId, params.amount, params.status, params.requestPayload ? JSON.stringify(params.requestPayload) : null]
    );
    return res.rows[0]?.id ?? 0;
  } catch (err) {
    console.warn('[MoMo] Lưu payment_transactions thất bại:', err);
    return 0;
  }
}

/**
 * Cập nhật kết quả giao dịch thanh toán vào bảng payment_transactions
 */
export async function updatePaymentTransaction(params: {
  orderId?: number;
  gatewayOrderId?: string;
  transId?: string | number;
  resultCode: number;
  message?: string;
  responsePayload?: unknown;
}): Promise<boolean> {
  try {
    const isSuccess = Number(params.resultCode) === 0;
    const status = isSuccess ? 'paid' : 'failed';
    const query = `
      UPDATE payment_transactions
      SET status = $1,
          result_code = $2,
          message = $3,
          transaction_id = $4,
          response_payload = $5,
          paid_at = ${isSuccess ? 'NOW()' : 'NULL'},
          updated_at = NOW()
      WHERE (gateway_order_id = $6 OR order_id = $7)
    `;
    const res = await pool.query(query, [
      status,
      params.resultCode,
      params.message || '',
      params.transId ? String(params.transId) : null,
      params.responsePayload ? JSON.stringify(params.responsePayload) : null,
      params.gatewayOrderId || '',
      params.orderId || 0,
    ]);
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.warn('[MoMo] Cập nhật payment_transactions thất bại:', err);
    return false;
  }
}

/**
 * Tạo URL thanh toán MoMo Sandbox All-In-One (payWithMethod: Quét QR + Thẻ ATM Napas/NCB + Visa)
 */
export async function createPaymentUrl(params: {
  orderId: number | string;
  amount: number;
  orderInfo?: string;
  redirectUrl?: string;
  ipnUrl?: string;
  requestType?: string;
}): Promise<MoMoCreatePaymentResponse> {
  const partnerCode = env.momo.partnerCode;
  const accessKey = env.momo.accessKey;
  const secretKey = env.momo.secretKey;
  const orderId = String(params.orderId);
  const requestId = `${orderId}_${Date.now()}`;

  // Safeguard: MoMo Sandbox giới hạn số tiền 1.000đ - 50.000.000đ
  let amount = Math.round(params.amount);
  if (amount > 50_000_000) {
    console.warn(`[MoMo] Đơn hàng có số tiền (${amount}đ) vượt quá giới hạn MoMo Sandbox (50.000.000đ). Tự động điều chỉnh về 50.000.000đ để tạo link test thành công.`);
    amount = 50_000_000;
  } else if (amount < 1_000) {
    amount = 1_000;
  }

  const orderInfo = params.orderInfo || `Thanh toan don hang #${orderId} tai Cooking`;
  const redirectUrl = params.redirectUrl || env.momo.redirectUrl;
  const ipnUrl = params.ipnUrl || env.momo.ipnUrl;
  // Bắt buộc dùng payWithMethod để hiển thị đủ các tab nhập thẻ ATM, Visa, QR
  const requestType = params.requestType || env.momo.requestType || 'payWithMethod';
  const extraData = '';

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

  const payloadObj = {
    partnerCode,
    accessKey,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    extraData,
    requestType,
    signature,
    lang: 'vi',
  };
  const requestBody = JSON.stringify(payloadObj);

  // Ghi nhận transaction khởi tạo
  const numOrderId = Number(String(orderId).replace(/\D/g, ''));
  if (numOrderId > 0) {
    await recordPaymentTransaction({
      orderId: numOrderId,
      gatewayOrderId: orderId,
      amount,
      status: 'initiated',
      requestPayload: payloadObj,
    });
  }

  const url = new URL(env.momo.endpoint);

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
        rejectUnauthorized: env.momo.verifySsl,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw) as MoMoCreatePaymentResponse;
            if (data.resultCode === 0 && data.payUrl) {
              resolve(data);
            } else {
              reject(new Error(data.message || `MoMo Error code ${data.resultCode}: ${raw}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse MoMo response: ${raw}`));
          }
        });
      }
    );

    // Hỗ trợ Timeout 8s theo yêu cầu nghiệp vụ
    req.setTimeout(8000, () => {
      req.destroy(new Error('MoMo gateway request timeout (8s)'));
    });

    req.on('error', (err) => reject(err));
    req.write(requestBody);
    req.end();
  });
}

/**
 * Xác thực chữ ký HMAC-SHA256 của Webhook IPN / Callback gửi từ MoMo
 */
export function verifyIpnSignature(body: Record<string, any>): boolean {
  if (!body || !body.signature) return false;

  const accessKey = env.momo.accessKey;
  const secretKey = env.momo.secretKey;

  const rawSignature = `accessKey=${accessKey}&amount=${body.amount}&extraData=${body.extraData || ''}&message=${body.message}&orderId=${body.orderId}&orderInfo=${body.orderInfo}&orderType=${body.orderType || ''}&partnerCode=${body.partnerCode}&payType=${body.payType || ''}&requestId=${body.requestId}&responseTime=${body.responseTime}&resultCode=${body.resultCode}&transId=${body.transId}`;

  const calculatedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  if (calculatedSignature.length !== body.signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(body.signature));
}

export function verifyMoMoSignature(body: any): boolean {
  return verifyIpnSignature(body);
}


