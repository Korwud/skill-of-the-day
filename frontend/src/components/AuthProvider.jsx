import React, { createContext, useContext, useEffect, useState } from "react";
import {
  clearSession,
  login,
  logout,
  onSessionChange,
  refresh,
  request,
  sessionExpiresAt,
} from "../auth";
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function restore() {
    setLoading(true);
    setError("");
    try {
      await refresh();
    } catch (error) {
      clearSession();
      if (error.status !== 401) setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const unsubscribe = onSessionChange((next) => {
      setUser(next);
      if (next) setError("");
    });
    restore();
    return unsubscribe;
  }, []);
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(
      async () => {
        try {
          await refresh();
        } catch (error) {
          clearSession();
          if (error.status !== 401) setError(error.message);
        }
      },
      Math.max(1000, sessionExpiresAt() - Date.now() - 60000),
    );
    return () => clearTimeout(timer);
  }, [user]);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        restore,
        login,
        logout,
        request,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function RequireAuth({ children, admin = false, loginPage }) {
  const { user, loading, error, restore } = useAuth();
  if (loading)
    return (
      <section className="container page">
        <h1>Проверяем сессию</h1>
        <p role="status">Загрузка…</p>
      </section>
    );
  if (error)
    return (
      <section className="container page">
        <h1>Авторизация временно недоступна</h1>
        <p role="alert">{error}</p>
        <button className="button" onClick={restore}>
          Повторить
        </button>
      </section>
    );
  if (!user) return loginPage;
  if (admin && !user.roles.includes("Admin"))
    return (
      <section className="container page">
        <h1>Доступ ограничен</h1>
        <p>Для этой страницы нужны права администратора.</p>
      </section>
    );
  return children;
}
