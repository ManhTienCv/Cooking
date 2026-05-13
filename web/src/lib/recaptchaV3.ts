import { getRecaptchaSiteKey } from './recaptchaSiteKey';

type RecaptchaAction = 'login' | 'register' | 'forgot_password' | 'admin_login';

type GrecaptchaV3 = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: RecaptchaAction }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: GrecaptchaV3;
    recaptchaV3Loader?: Promise<void>;
  }
}

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  if (window.recaptchaV3Loader) return window.recaptchaV3Loader;

  window.recaptchaV3Loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load reCAPTCHA.'));
    document.head.appendChild(script);
  });

  return window.recaptchaV3Loader;
}

export async function executeRecaptchaV3(action: RecaptchaAction): Promise<string> {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey) return '';

  await loadRecaptchaScript(siteKey);
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error('reCAPTCHA is not available.');

  return new Promise<string>((resolve, reject) => {
    grecaptcha.ready(() => {
      grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject);
    });
  });
}
