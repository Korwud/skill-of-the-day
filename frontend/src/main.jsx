import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadProfile, UPDATE_INTERVAL_DAYS } from "./data";
import { Link } from "./components/UI";
import { AuthProvider, RequireAuth, useAuth } from "./components/AuthProvider";
import { Landing, Market, Auth } from "./pages/PublicPages";
import AuthAction from "./pages/AuthAction";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import "./styles.css";

function routeFromLocation() {
  return location.hash.startsWith("#/")
    ? location.hash.slice(2).split("?")[0]
    : "";
}
function UserPages({ route }) {
  const { user } = useAuth();
  const storageKey = `skill-day-profile:${user.id}`;
  const [stored, setStored] = useState(() => loadProfile(storageKey));
  const profile = { ...stored, email: user.email };
  function update(next) {
    const saved = { ...next, email: user.email };
    setStored(saved);
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {}
  }
  function removeLocal() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }
  return route === "plan" ? (
    <Dashboard profile={profile} update={update} />
  ) : (
    <Profile profile={profile} update={update} onDelete={removeLocal} />
  );
}
function App() {
  const { user, loading, logout } = useAuth();
  const [route, setRoute] = useState(routeFromLocation),
    [menu, setMenu] = useState(false),
    [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    const change = () => {
      if (location.hash === "#main") return;
      setRoute(routeFromLocation());
      setMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const titles = {
      "": "Ваш следующий навык",
      market: "Публичная статистика",
      plan: "Ваш roadmap",
      profile: "Настройки профиля",
      admin: "Панель администратора",
      login: "Вход",
      register: "Регистрация",
      reset: "Восстановление пароля",
      "reset-password": "Новый пароль",
      "confirm-email": "Подтверждение почты",
      "confirm-email-change": "Подтверждение новой почты",
    };
    document.title = `${titles[route] || "Страница не найдена"} — Навык дня`;
  }, [route]);
  async function signOut() {
    try {
      await logout();
      setLogoutError("");
      location.hash = "/login";
    } catch (error) {
      setLogoutError(error.message);
    }
  }
  return (
    <>
      <a className="skip" href="#main">
        К содержимому
      </a>
      <header className="header">
        <div className="container header-inner">
          <Link to="" className="brand">
            навык дня.
          </Link>
          <button
            className="button menu-toggle"
            aria-expanded={menu}
            aria-controls="navigation"
            onClick={() => setMenu(!menu)}
          >
            Меню
          </button>
          <nav
            id="navigation"
            aria-label="Главная навигация"
            className={menu ? "nav open" : "nav"}
          >
            <Link
              to="market"
              aria-current={route === "market" ? "page" : undefined}
            >
              Статистика
            </Link>
            <Link
              to="plan"
              aria-current={route === "plan" ? "page" : undefined}
            >
              Личный кабинет
            </Link>
            <Link
              to="profile"
              aria-current={route === "profile" ? "page" : undefined}
            >
              Настройки
            </Link>
            {user ? (
              <button className="button" onClick={signOut}>
                Выйти
              </button>
            ) : (
              <Link to="login" className="button">
                {loading ? "Подождите…" : "Вход"}
              </Link>
            )}
          </nav>
        </div>
      </header>
      {logoutError && (
        <p className="container notice" role="alert">
          {logoutError}
        </p>
      )}
      <main id="main" tabIndex={-1}>
        {route === "" ? (
          <Landing />
        ) : route === "market" ? (
          <Market />
        ) : ["login", "register", "reset"].includes(route) ? (
          <Auth key={route} mode={route} />
        ) : [
            "reset-password",
            "confirm-email",
            "confirm-email-change",
          ].includes(route) ? (
          <AuthAction key={route} mode={route} />
        ) : ["plan", "profile"].includes(route) ? (
          <RequireAuth loginPage={<Auth mode="login" />}>
            <UserPages key={user?.id} route={route} />
          </RequireAuth>
        ) : route === "admin" ? (
          <RequireAuth admin loginPage={<Auth mode="login" />}>
            <Admin />
          </RequireAuth>
        ) : (
          <section className="container page">
            <h1>Страница не найдена</h1>
            <Link to="" className="button">
              На главную
            </Link>
          </section>
        )}
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <Link to="" className="brand">
            навык дня.
          </Link>
          <p>Ваш следующий навык — новые возможности.</p>
          <div>
            <span className="small">
              Статистика и roadmap · демонстрационные вакансии
            </span>
            <span className="small">
              Обновление данных — каждые {UPDATE_INTERVAL_DAYS} дней
            </span>
            {user?.roles.includes("Admin") && (
              <Link to="admin" className="small">
                Панель администратора
              </Link>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
