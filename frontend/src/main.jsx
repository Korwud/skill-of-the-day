import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadProfile, seedProfile, UPDATE_INTERVAL_DAYS } from "./data";
import { Link } from "./components/UI";
import { Landing, Market, Auth } from "./pages/PublicPages";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import "./styles.css";

function routeFromLocation() {
  return location.hash.startsWith("#/")
    ? location.hash.slice(2).split("?")[0]
    : "";
}
function App() {
  const [route, setRoute] = useState(routeFromLocation),
    [profile, setProfile] = useState(loadProfile),
    [menu, setMenu] = useState(false);
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
    };
    document.title = `${titles[route] || "Страница не найдена"} — Навык дня`;
  }, [route]);
  function update(next) {
    setProfile(next);
    try {
      localStorage.setItem("skill-day-profile", JSON.stringify(next));
    } catch {}
  }
  function deleteProfile() {
    setProfile(structuredClone(seedProfile));
    try {
      localStorage.removeItem("skill-day-profile");
    } catch {}
    location.hash = "/login";
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
            <Link to="login" className="button">
              Вход
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {route === "" ? (
          <Landing />
        ) : route === "market" ? (
          <Market />
        ) : ["login", "register", "reset"].includes(route) ? (
          <Auth key={route} mode={route} />
        ) : route === "plan" ? (
          <Dashboard profile={profile} update={update} />
        ) : route === "profile" ? (
          <Profile profile={profile} update={update} onDelete={deleteProfile} />
        ) : route === "admin" ? (
          <Admin />
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
            <span className="small">Демо · вымышленные вакансии</span>
            <span className="small">
              Обновление данных — каждые {UPDATE_INTERVAL_DAYS} дней
            </span>
            <Link to="admin" className="small">
              Панель администратора
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
