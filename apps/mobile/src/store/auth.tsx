import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  clearSession,
  loadMode,
  loadSession,
  Mode,
  normalizeEtPhone,
  saveMode,
  setSessionLostHandler,
  startSession,
  storeUser,
  User,
} from '../lib/api';

interface AuthState {
  user: User | null;
  ready: boolean;
  /**
   * Which side of the app this person is using. Registering as a technician
   * flips the account's role for good, so the role alone cannot answer it -
   * a technician who needs a plumber at home is a customer that evening.
   * Anyone who is not a technician is always in 'customer'.
   */
  mode: Mode;
  /** True only for a technician, who is the only one with two sides. */
  canSwitchMode: boolean;
  setMode: (mode: Mode) => void;
  passwordLogin: (username: string, password: string) => Promise<User>;
  requestOtp: (phone: string) => Promise<{ devCode?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  updateName: (name: string) => Promise<void>;
  /** Re-read the account (e.g. after becoming a technician changes the role). */
  refreshUser: () => Promise<User | null>;
  /** Choose a username + password so future sign-ins skip the SMS code. */
  setCredentials: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [modeState, setModeState] = useState<Mode>('customer');

  useEffect(() => {
    setSessionLostHandler(() => setUser(null));
    Promise.all([loadSession(), loadMode()]).then(([u, m]) => {
      setUser(u);
      // a technician lands on their own side unless they last chose otherwise
      setModeState(u?.role === 'PROVIDER' ? (m ?? 'technician') : 'customer');
      setReady(true);
    });
  }, []);

  const canSwitchMode = user?.role === 'PROVIDER';
  // someone who is not a technician has no second side to be on
  const mode: Mode = canSwitchMode ? modeState : 'customer';

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    saveMode(next);
  }, []);

  const passwordLogin = useCallback(async (username: string, password: string) => {
    const res = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: username.trim(), password }),
    });
    await startSession(res.accessToken, res.refreshToken, res.user);
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
    await startSession(res.accessToken, res.refreshToken, res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const updateName = useCallback(async (name: string) => {
    const updated = await api<User>('/users/me', { method: 'PATCH', body: JSON.stringify({ name }) });
    setUser((prev) => (prev ? { ...prev, name: updated.name } : prev));
  }, []);

  const setCredentials = useCallback(async (username: string, password: string) => {
    const updated = await api<User>('/users/me/credentials', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setUser((prev) => (prev ? { ...prev, username: updated.username } : prev));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await api<User>('/users/me');
      setUser(fresh);
      await storeUser(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      mode,
      canSwitchMode,
      setMode,
      passwordLogin,
      requestOtp,
      verifyOtp,
      updateName,
      setCredentials,
      refreshUser,
      signOut,
    }),
    [
      user,
      ready,
      mode,
      canSwitchMode,
      setMode,
      passwordLogin,
      requestOtp,
      verifyOtp,
      updateName,
      setCredentials,
      refreshUser,
      signOut,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
