type RecaptchaSiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
};

function isRecaptchaResponse(value: unknown): value is RecaptchaSiteVerifyResponse {
  return typeof value === 'object' && value !== null;
}

export async function verifyRecaptchaV3(
  secret: string,
  token: string | undefined,
  expectedAction: string,
  minScore: number,
  remoteip?: string
): Promise<boolean> {
  if (!token?.trim()) return false;

  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', token.trim());
  if (remoteip) params.set('remoteip', remoteip);

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;

    const data: unknown = await res.json();
    if (!isRecaptchaResponse(data)) return false;

    const score = typeof data.score === 'number' ? data.score : 0;
    return data.success === true && data.action === expectedAction && score >= minScore;
  } catch {
    return false;
  }
}
