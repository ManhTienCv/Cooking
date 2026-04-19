import { useEffect, useState, type RefObject } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { getRecaptchaSiteKey } from '../lib/recaptchaSiteKey';

type Props = {
  visible: boolean;
  recaptchaRef: RefObject<ReCAPTCHA | null>;
};

/** reCAPTCHA v2 — chỉ render khi server yêu cầu và đã cấu hình site key. */
export function RecaptchaCook({ visible, recaptchaRef }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const siteKey = getRecaptchaSiteKey();
  if (!mounted || !visible || !siteKey) return null;

  return (
    <div className="w-full flex justify-center my-3">
      <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey} theme="light" size="normal" />
    </div>
  );
}
