import { env } from '../env.js';
import https from 'node:https';

interface GhnResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
}

export interface GhnDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code: string;
}

export interface GhnWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
}

export interface GhnFeeResult {
  total: number;
  service_fee: number;
  insurance_fee: number;
  pick_station_fee: number;
}

export interface CreateGhnOrderInput {
  orderId: number;
  toName: string;
  toPhone: string;
  toAddress: string;
  toDistrictId: number;
  toWardCode: string;
  weightInGrams?: number;
  codAmount?: number;
  items: Array<{
    name: string;
    code?: string;
    quantity: number;
    price: number;
    weight?: number;
  }>;
  note?: string;
}

// In-memory cache for provinces to improve latency
let provincesCache: GhnProvince[] | null = null;
let provincesCacheTime = 0;

function ghnRequest<T>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Token': env.ghn.apiToken,
      'Content-Type': 'application/json',
    };
    if (env.ghn.shopId) {
      headers['ShopId'] = String(env.ghn.shopId);
    }
    if (postData) {
      headers['Content-Length'] = String(Buffer.byteLength(postData));
    }

    const base = env.ghn.apiUrl.replace(/\/v2\/?$/, '').replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    const url = new URL(`${base}/${cleanPath}`);
    const req = https.request(
      url,
      {
        method,
        headers,
        rejectUnauthorized: env.ghn.verifySsl,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw) as GhnResponse<T>;
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300 && parsed.code === 200) {
              resolve(parsed.data);
            } else {
              reject(new Error(parsed.message || `GHN API Error status ${res.statusCode}: ${raw}`));
            }
          } catch (err) {
            reject(new Error(`Failed to parse GHN response (${res.statusCode}): ${raw.slice(0, 300)}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Lấy danh sách 63 Tỉnh/Thành phố từ GHN
 */
export async function getProvinces(): Promise<GhnProvince[]> {
  const now = Date.now();
  if (provincesCache && now - provincesCacheTime < 3600_000) {
    return provincesCache;
  }

  const data = await ghnRequest<GhnProvince[]>('master-data/province', 'GET');
  provincesCache = data || [];
  provincesCacheTime = now;
  return provincesCache;
}

/**
 * Lấy danh sách Quận/Huyện theo Tỉnh/Thành phố
 */
export async function getDistricts(provinceId: number): Promise<GhnDistrict[]> {
  return ghnRequest<GhnDistrict[]>('master-data/district', 'POST', {
    province_id: Number(provinceId),
  });
}

/**
 * Lấy danh sách Phường/Xã theo Quận/Huyện
 */
export async function getWards(districtId: number): Promise<GhnWard[]> {
  return ghnRequest<GhnWard[]>(`master-data/ward?district_id=${districtId}`, 'GET');
}

/**
 * Tính cước vận chuyển chuẩn GHN Express
 */
export async function calculateShippingFee(params: {
  toDistrictId: number;
  toWardCode: string;
  weight?: number; // gram
  insuranceValue?: number;
}): Promise<GhnFeeResult> {
  const payload = {
    from_district_id: env.ghn.senderDistrictId,
    service_type_id: 2, // Chuẩn E-commerce
    to_district_id: Number(params.toDistrictId),
    to_ward_code: String(params.toWardCode),
    height: 10,
    length: 15,
    width: 15,
    weight: Math.max(100, Number(params.weight) || 500),
    insurance_value: Math.min(5000000, Math.max(0, Number(params.insuranceValue) || 0)),
  };

  const data = await ghnRequest<GhnFeeResult>('v2/shipping-order/fee', 'POST', payload);
  return data;
}

/**
 * Tạo vận đơn thực tế trên hệ thống GHN Express
 */
export async function createShippingOrder(input: CreateGhnOrderInput): Promise<{
  order_code: string;
  expected_delivery_time: string;
  total_fee: number;
}> {
  const totalWeight = input.weightInGrams || 500;
  const items = input.items.map((it) => ({
    name: it.name,
    code: it.code || `PROD-${Date.now()}`,
    quantity: it.quantity,
    price: it.price,
    weight: it.weight || Math.round(totalWeight / Math.max(1, input.items.length)),
  }));

  const payload = {
    payment_type_id: 1, // 1: Người gửi trả tiền, 2: Người nhận trả tiền
    note: input.note || `Đơn hàng #${input.orderId} từ Cooking Web`,
    required_note: 'CHOXEMHANGKHONGTHU',
    from_district_id: env.ghn.senderDistrictId,
    from_ward_code: env.ghn.senderWardCode,
    to_name: input.toName,
    to_phone: input.toPhone,
    to_address: input.toAddress,
    to_ward_code: String(input.toWardCode),
    to_district_id: Number(input.toDistrictId),
    cod_amount: Number(input.codAmount) || 0,
    weight: totalWeight,
    length: 15,
    width: 15,
    height: 10,
    service_type_id: 2,
    items,
  };

  const res = await ghnRequest<{
    order_code: string;
    expected_delivery_time: string;
    total_fee: number;
  }>('v2/shipping-order/create', 'POST', payload);

  return res;
}

/**
 * Tra cứu hành trình đơn hàng từ mã vận đơn GHN
 */
export async function getOrderDetail(orderCode: string): Promise<any> {
  return ghnRequest<any>('v2/shipping-order/detail', 'POST', { order_code: orderCode });
}
