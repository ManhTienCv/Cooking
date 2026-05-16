import { env } from '../env.js';

export async function verifyRecaptchaToken(token: string, remoteIp?: string): Promise<boolean> {
  if (!env.recaptchaSecretKey) return true; // not configured => skip
  try {
    const params = new URLSearchParams();
    params.append('secret', env.recaptchaSecretKey);
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) return false;
    const payload = await res.json();
    // payload: { success, score, action, ... }
    if (!payload.success) return false;
    const score = Number(payload.score ?? 0);
    return score >= env.recaptchaMinScore;
  } catch (e) {
    console.error('recaptcha verify failed', e);
    return false;
  }
}
