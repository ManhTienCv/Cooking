import crypto from 'crypto';

interface MoMoPaymentRequest {
  partnerCode: string;
  partnerName: string;
  storeId: string;
  requestId: string;
  amount: number;
  orderId: string;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  requestType: string;
  extraData: string;
  lang: string;
  signature: string;
}

// Tạo yêu cầu thanh toán MoMo (Nạp tiền ví điện tử): Xây dựng chữ ký SHA256 bảo mật và gọi endpoint của MoMo để lấy link thanh toán
export const createMoMoPayment = async (orderId: string, amount: number, orderInfo: string) => {
  const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
  const accessKey = process.env.MOMO_ACCESS_KEY || 'MOCK_ACCESS_KEY';
  const secretKey = process.env.MOMO_SECRET_KEY || 'MOCK_SECRET_KEY';
  const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';

  const apiBaseUrl = (process.env.API_URL || 'https://abc123.ngrok-free.app').replace(/\/+$/, '');
  const feBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const redirectUrl = `${feBaseUrl}/wallet`;
  const ipnUrl = `${apiBaseUrl}/api/ewallet/topup/momo-ipn`;
  const requestType = 'payWithMethod';
  const extraData = '';
  const requestId = partnerCode + new Date().getTime();
  
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  
  const signature = crypto.createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  const requestBody = {
    partnerCode,
    partnerName: 'Cook',
    storeId: partnerCode,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: 'vi',
    requestType,
    autoCapture: true,
    extraData,
    signature
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('MoMo API Error:', error);
    throw new Error('Could not create MoMo payment request');
  }
};

// Xác thực chữ ký phản hồi (IPN/Callback) từ MoMo để kiểm tra xem dữ liệu giao dịch trả về có tin cậy và không bị chỉnh sửa
export const verifyMoMoSignature = (query: any): boolean => {
  const secretKey = process.env.MOMO_SECRET_KEY || 'MOCK_SECRET_KEY';
  
  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    payType,
    responseTime,
    extraData,
    signature
  } = query;

  const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY || 'MOCK_ACCESS_KEY'}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
  
  const expectedSignature = crypto.createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  return signature === expectedSignature;
};
