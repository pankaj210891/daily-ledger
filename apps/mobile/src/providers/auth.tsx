import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { api, type User } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string, householdName?: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<string>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    api.initializeSession().then(setUser).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    signIn: async (email, password) => { setUser(await api.signIn(email.trim(), password)); },
    signUp: async (name, email, password, householdName) => { setUser(await api.signUp(name.trim(), email.trim(), password, householdName?.trim())); },
    signOut: async () => { try { await api.signOut(); } finally { setUser(null); } },
    requestPasswordReset: async (email) => (await api.forgotPassword(email.trim())).message,
  }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
