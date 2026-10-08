"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getMe,
  getToken,
  login as apiLogin,
  register as apiRegister,
  setToken,
  LOGGED_OUT_EVENT,
  type RegisterParams,
  type User,
} from "@/api";

interface AuthContextType {
  user: User | null;
  /** True until the stored session has been checked. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (params: RegisterParams) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the stored token.
  useEffect(() => {
    let active = true;
    const restore = getToken() ? getMe() : Promise.resolve(null);
    restore
      .then((me) => active && setUser(me))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // The API client clears the token on a 401; drop the user so screens redirect to login.
  useEffect(() => {
    const onLoggedOut = () => setUser(null);
    window.addEventListener(LOGGED_OUT_EVENT, onLoggedOut);
    return () => window.removeEventListener(LOGGED_OUT_EVENT, onLoggedOut);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (params: RegisterParams) => {
    const result = await apiRegister(params);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
