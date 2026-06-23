import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ccba_access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI
      .me()
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem("ccba_access_token");
        localStorage.removeItem("ccba_refresh_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { data } = await authAPI.login({ username, password });
    localStorage.setItem("ccba_access_token", data.access);
    localStorage.setItem("ccba_refresh_token", data.refresh);
    const { data: me } = await authAPI.me();
    setUser(me);
    return me;
  };

  const logout = () => {
    localStorage.removeItem("ccba_access_token");
    localStorage.removeItem("ccba_refresh_token");
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    role: user?.role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}