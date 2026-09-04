import crypto from 'node:crypto';
import https from 'node:https';
import { env } from '../env.js';

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
 * Tạo URL thanh toán MoMo Sandbox qua cổng gateway captureWallet
 */
export async function createPaymentUrl(params: {
  orderId: number | string;
  amount: number;
  orderInfo?: string;
  redirectUrl?: string;
  ipnUrl?: string;
}): Promise<MoMoCreatePaymentResponse> {
  const partnerCode = env.momo.partnerCode;
  const accessKey = env.momo.accessKey;
  const secretKey = env.momo.secretKey;
  const orderId = String(params.orderId);
  const requestId = `${orderId}_${Date.now()}`;
  const amount = Math.round(params.amount);
  const orderInfo = params.orderInfo || `Thanh toan don hang #${orderId} tai Cooking`;
  const redirectUrl = params.redirectUrl || env.momo.redirectUrl;
  const ipnUrl = params.ipnUrl || env.momo.ipnUrl;
  const requestType = 'captureWallet';
  const extraData = '';

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

  const requestBody = JSON.stringify({
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
  });

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

    req.on('error', (err) => reject(err));
    req.write(requestBody);
    req.end();
  });
}

/**
 * Xác thực chữ ký HMAC-SHA256 của Webhook IPN gửi từ MoMo
 */
export function verifyIpnSignature(body: MoMoIpnBody): boolean {
  if (!body || !body.signature) return false;

  const accessKey = env.momo.accessKey;
  const secretKey = env.momo.secretKey;

  const rawSignature = `accessKey=${accessKey}&amount=${body.amount}&extraData=${body.extraData || ''}&message=${body.message}&orderId=${body.orderId}&orderInfo=${body.orderInfo}&orderType=${body.orderType}&partnerCode=${body.partnerCode}&payType=${body.payType}&requestId=${body.requestId}&responseTime=${body.responseTime}&resultCode=${body.resultCode}&transId=${body.transId}`;

  const calculatedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  return calculatedSignature === body.signature;
}

/**
 * Hàm tương thích ngược cho ewalletService
 */
export async function createMoMoPayment(orderId: number | string, amount: number, orderInfo?: string) {
  return createPaymentUrl({ orderId, amount, orderInfo });
}

export function verifyMoMoSignature(body: any): boolean {
  return verifyIpnSignature(body);
}

