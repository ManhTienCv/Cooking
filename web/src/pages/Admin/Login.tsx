import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type ReCAPTCHA from 'react-google-recaptcha';
import { RecaptchaCook } from '../../components/RecaptchaCook';
import { hasRecaptchaSiteKey } from '../../lib/recaptchaSiteKey';
import { apiFetch, resetCsrfCache } from '../../lib/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const recaptchaToken = recaptchaRef.current?.getValue() ?? '';
    try {
      const r = await apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, recaptchaToken }),
      });
      const data = (await r.json()) as {
        success?: boolean;
        message?: string;
        captchaRequired?: boolean;
      };
      if (!r.ok) {
        if (data.captchaRequired) {
          setCaptchaRequired(true);
          if (!hasRecaptchaSiteKey()) {
            setError('Server requires reCAPTCHA. Add VITE_RECAPTCHA_SITE_KEY to web/.env and restart Vite.');
          } else {
            setError(data.message ?? 'Login failed');
            recaptchaRef.current?.reset();
          }
        } else {
          setError(data.message ?? 'Login failed');
        }
        return;
      }
      setCaptchaRequired(false);
      resetCsrfCache();
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow p-6 border border-slate-200">
        <h1 className="text-2xl font-bold mb-1">Admin Login</h1>
        <p className="text-slate-500 mb-5 text-sm">Sign in to management console.</p>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <label className="block text-sm mb-1">Password</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
        <RecaptchaCook visible={captchaRequired} recaptchaRef={recaptchaRef} />
        <button
          disabled={loading}
          className="w-full bg-black text-white rounded-lg py-2.5 disabled:opacity-60"
          type="submit"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
