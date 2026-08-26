import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  clearSession,
  loadSession,
  normalizeEtPhone,
  saveSession,
  setSessionLostHandler,
  User,
} from '../lib/api';

interface AuthState {
  user: User | null;
  ready: boolean;
  passwordLogin: (username: string, password: string) => Promise<User>;
  requestOtp: (phone: string) => Promise<{ devCode?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  updateName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionLostHandler(() => setUser(null));
    loadSession().then((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const passwordLogin = useCallback(async (username: string, password: string) => {
    const res = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: username.trim(), password }),
    });
    await saveSession(res.accessToken, res.user, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    return api<{ sent: boolean; devCode?: string }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone: normalizeEtPhone(phone) }),
    });
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    const res = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone: normalizeEtPhone(phone), code }),
    });
    await saveSession(res.accessToken, res.user, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const updateName = useCallback(async (name: string) => {
    const updated = await api<User>('/users/me', { method: 'PATCH', body: JSON.stringify({ name }) });
    setUser((prev) => (prev ? { ...prev, name: updated.name } : prev));
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, passwordLogin, requestOtp, verifyOtp, updateName, signOut }),
    [user, ready, passwordLogin, requestOtp, verifyOtp, updateName, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
