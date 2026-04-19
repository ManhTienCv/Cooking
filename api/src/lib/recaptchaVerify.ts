/** Google reCAPTCHA v2 / checkbox — siteverify */
export async function verifyRecaptchaV2(
  secret: string,
  token: string | undefined,
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
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
