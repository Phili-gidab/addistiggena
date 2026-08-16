'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, saveSession, User } from '../../lib/api';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stage, setStage] = useState<'password' | 'phone' | 'code' | 'name'>('password');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function passwordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api<{ accessToken: string; refreshToken: string; user: User }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) },
      );
      saveSession(res.accessToken, res.user, res.refreshToken);
      router.push(res.user.role === 'ADMIN' ? '/admin' : res.user.role === 'PROVIDER' ? '/provider' : next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api<{ sent: boolean; devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setDevCode(res.devCode ?? null);
      setStage('code');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api<{ accessToken: string; refreshToken: string; user: User }>(
        '/auth/otp/verify',
        { method: 'POST', body: JSON.stringify({ phone, code }) },
      );
      saveSession(res.accessToken, res.user, res.refreshToken);
      // first sign-in: ask for a display name so technicians and customers
      // greet each other by name instead of "Customer"/"Technician"
      if (!res.user.name) {
        setStage('name');
      } else {
        router.push(next);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const updated = await api<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      });
      saveSession(localStorage.getItem('tg_token')!, updated);
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 880 }}>
        <span className="sec-no">Welcome · እንኳን ደህና መጡ</span>
        <h1 className="page-title">ይግቡ · Sign in</h1>
        <p className="page-sub">
          {stage === 'password'
            ? 'Sign in with your username and password.'
            : 'One phone number is all you need — we will text you a code.'}
        </p>

        <div className="login-grid">
          <div className="panel">
            {error && <div className="error-box">{error}</div>}

            {stage === 'password' && (
              <form onSubmit={passwordLogin}>
                <div className="field">
                  <label>Username · መለያ ስም</label>
                  <input
                    placeholder="e.g. customer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    autoComplete="username"
                  />
                </div>
                <div className="field">
                  <label>Password · የይለፍ ቃል</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={busy || username.trim().length < 2 || password.length < 6}
                >
                  {busy ? 'Signing in…' : 'Sign in · ይግቡ'}
                </button>
                <button
                  type="button"
                  className="btn btn-line btn-sm mt"
                  onClick={() => {
                    setError('');
                    setStage('phone');
                  }}
                >
                  Use phone code instead · በስልክ ኮድ ይግቡ
                </button>
                <p className="hint mt">
                  Demo — customer: <code>customer / customer1234</code> · technician:{' '}
                  <code>technician / tech1234</code> · admin: <code>admin / admin1234</code>
                </p>
              </form>
            )}

            {stage === 'phone' && (
              <form onSubmit={requestOtp}>
                <div className="field">
                  <label>Phone number · ስልክ ቁጥር</label>
                  <input
                    placeholder="09… or +2519…"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.trim())}
                    autoFocus
                    inputMode="tel"
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={busy || phone.length < 10}
                >
                  {busy ? 'Sending…' : 'Send code · ኮድ ላክ'}
                </button>
                <button
                  type="button"
                  className="btn btn-line btn-sm mt"
                  onClick={() => {
                    setError('');
                    setStage('password');
                  }}
                >
                  ← Username &amp; password
                </button>
              </form>
            )}

            {stage === 'code' && (
              <form onSubmit={verifyOtp}>
                <div className="field">
                  <label>6-digit code sent to {phone}</label>
                  <input
                    className="otp-input"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    inputMode="numeric"
                  />
                </div>
                {devCode && (
                  <p className="hint mb">
                    Dev mode (no SMS gateway yet) — your code is <code>{devCode}</code>
                  </p>
                )}
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={busy || code.length !== 6}
                >
                  {busy ? 'Verifying…' : 'Verify · አረጋግጥ'}
                </button>
                <button
                  type="button"
                  className="btn btn-line btn-sm mt"
                  onClick={() => {
                    setStage('phone');
                    setCode('');
                  }}
                >
                  ← Change number
                </button>
              </form>
            )}

            {stage === 'name' && (
              <form onSubmit={submitName}>
                <div className="ok-box">Verified ✓ — welcome to Addis Tiggena.</div>
                <div className="field">
                  <label>Your name · ስምዎ</label>
                  <input
                    placeholder="e.g. Marta Abebe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    maxLength={100}
                  />
                </div>
                <p className="hint mb">
                  Shown to your technician when they arrive — you can change it any time.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={busy || name.trim().length < 2}
                >
                  {busy ? 'Saving…' : 'Continue · ይቀጥሉ'}
                </button>
                <button
                  type="button"
                  className="btn btn-line btn-sm mt"
                  onClick={() => router.push(next)}
                >
                  Skip for now
                </button>
              </form>
            )}
          </div>
          <div className="login-figure" aria-hidden>
            {/* Photo: Emmanuel Ikwuegbu on Unsplash (free license) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=900&auto=format&fit=crop"
              alt=""
            />
            <div className="quote">
              <div className="am">የተረጋገጡ ባለሙያዎች፣ በደቂቃዎች።</div>
              <div className="en">Verified professionals, minutes away — across Addis Ababa.</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
