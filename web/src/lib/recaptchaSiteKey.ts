const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() ?? '';

export function hasRecaptchaSiteKey(): boolean {
  return Boolean(siteKey);
}

export function getRecaptchaSiteKey(): string {
  return siteKey;
}
