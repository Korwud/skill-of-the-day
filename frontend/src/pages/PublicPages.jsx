import { useAuth } from "../components/AuthProvider";
import { request } from "../auth";
import React, { useEffect, useMemo, useState } from "react";
import {
  directions,
  statistics,
  getScope,
  PUBLIC_SKILL_COUNT,
  SNAPSHOT_DATE,
  UPDATE_INTERVAL_DAYS,
  vacancyText,
  requirementTypes,
  countLabel,
} from "../data";
import { Link, RouteExample, TypeTag, LevelSelect } from "../components/UI";

function MarketCards({ level = "all" }) {
  return (
    <div className="three-columns market-cards">
      {Object.entries(directions).map(([key, direction]) => {
        const jobs = getScope({ direction: key, regions: [], level }),
          ranking = statistics(jobs, direction.skills).slice(
            0,
            PUBLIC_SKILL_COUNT,
          );
        return (
          <article className="panel market-card" key={key}>
            <h3>{direction.name}</h3>
            <p>Вакансий в срезе: {jobs.length}</p>
            <div className="market-card-heading small">
              <span>Навык / тип требования</span>
              <span>Вакансий с навыком</span>
            </div>
            {ranking.map((item) => (
              <div className="market-card-row" key={item.skill}>
                <div>
                  <strong>{item.skill}</strong>
                  <TypeTag type={item.category} />
                </div>
                <span className="market-count">
                  <span className="sr-only">{countLabel(item.category)}: </span>
                  {item.count}
                </span>
              </div>
            ))}
          </article>
        );
      })}
    </div>
  );
}
export function Landing() {
  const [level, setLevel] = useState("all");
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Личный roadmap по требованиям рынка</span>
            <h1>
              Ваш следующий навык.
              <br />
              Больше возможностей.
            </h1>
            <p>
              Отметьте знакомые навыки — узнайте, что изучать дальше и какие
              вакансии это откроет.
            </p>
            <div className="actions">
              <Link to="plan" className="button inverse">
                Составить мой план
              </Link>
              <Link to="market" className="button on-dark">
                Посмотреть статистику
              </Link>
            </div>
            <p className="small hero-steps">
              Ваши навыки → требования вакансий → личный план
            </p>
          </div>
          <RouteExample />
        </div>
      </section>
      <section className="container principles three-columns">
        {[
          [
            "01",
            "Учитываем исходные навыки",
            "Выберите направление, регион и отметьте изученные навыки.",
          ],
          [
            "02",
            "Показываем прирост охвата",
            "У каждого шага — вклад навыка и число новых подходящих вакансий.",
          ],
          [
            "03",
            "Объясняем основания",
            "Откройте вакансии, на требованиях которых построена рекомендация.",
          ],
        ].map(([number, title, description]) => (
          <article className="feature-card" key={number}>
            <span className="feature-number">{number}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
      <section className="container section">
        <div className="section-heading">
          <h2>Сводная статистика по направлениям</h2>
          <Link to="market" className="button secondary">
            Подробная статистика
          </Link>
        </div>
        <div className="public-scope">
          <p className="slice-date">Дата среза · {SNAPSHOT_DATE}</p>
          <LevelSelect value={level} onChange={setLevel} />
        </div>
        <MarketCards level={level} />
      </section>
      <section className="container cta">
        <h2>Один новый навык — больше подходящих вакансий.</h2>
        <Link to="plan" className="button inverse">
          Открыть мой roadmap
        </Link>
      </section>
    </>
  );
}
export function Market() {
  const [direction, setDirection] = useState("analyst"),
    [level, setLevel] = useState("all"),
    [region, setRegion] = useState("all"),
    [type, setType] = useState("all"),
    [query, setQuery] = useState("");
  const jobs = useMemo(
    () =>
      getScope({ direction, regions: region === "all" ? [] : [region], level }),
    [direction, region, level],
  );
  const ranking = statistics(
    jobs,
    directions[direction].skills,
    type,
    query,
  ).slice(0, PUBLIC_SKILL_COUNT);
  const chart = ["SQL", "REST API"].map((skill) => ({
    skill,
    count: jobs.filter((job) => job.required.includes(skill)).length,
  }));
  return (
    <section className="container page">
      <h1>Какие навыки нужны работодателям</h1>
      <div className="market-summary">
        <p className="slice-date">Дата среза · {SNAPSHOT_DATE}</p>
        <p>Вакансий в срезе: {jobs.length}</p>
      </div>
      <div className="market-filters">
        <label>
          Направление
          <select
            aria-label="Направление"
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
          >
            {Object.entries(directions).map(([key, value]) => (
              <option value={key} key={key}>
                {value.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Регион
          <select
            aria-label="Регион"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          >
            <option value="all">Москва + удалённо</option>
            <option>Москва</option>
            <option>Удалённая работа</option>
            <option>Владивосток</option>
          </select>
        </label>
        <LevelSelect value={level} onChange={setLevel} />
        <label>
          Тип требования
          <select
            aria-label="Тип требования"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">Все типы требований</option>
            {Object.entries(requirementTypes).map(([key, name]) => (
              <option value={key} key={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <RequirementLegendLocal />
      <section className="panel ranking">
        <h2>Рейтинг навыков выбранного среза</h2>
        <input
          type="search"
          aria-label="Поиск навыка"
          placeholder="Найти навык…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="ranking-list">
          {ranking.map((item) => (
            <article className="ranking-row" key={item.skill}>
              <strong>{item.skill}</strong>
              <TypeTag type={item.category} />
              <span>
                {countLabel(item.category)}: {item.count}
              </span>
              <span className="small">+{item.delta} к срезу 15.10</span>
              <Link to="plan" className="text-link">
                {vacancyText(item.count)} ↗
              </Link>
            </article>
          ))}
          {!ranking.length && (
            <p className="empty-message">
              {jobs.length
                ? "Навык не найден. Измените поиск или тип требования."
                : "Вакансий в срезе нет. Измените регион."}
            </p>
          )}
        </div>
      </section>
      <section className="panel trends">
        <h2>Тренды навыков по срезам</h2>
        <div className="trend-layout">
          <p>✓ SQL &nbsp; ✓ REST API</p>
          <div className="trend-chart">
            <h3>SQL и REST API · вакансий с требованием</h3>
            <p className="small">SQL — синий · REST API — тёмный</p>
            <div className="chart-groups">
              {["10.10", "15.10", "20.10"].map((date, index) => (
                <div className="chart-group" key={date}>
                  <div className="chart-bars">
                    {chart.map(({ skill, count }, series) => {
                      const value = Math.max(0, count - (2 - index) * 3);
                      return (
                        <div
                          key={skill}
                          className={`chart-bar series-${series}`}
                          style={{
                            height: `${Math.max(8, (value / Math.max(1, jobs.length)) * 112)}px`,
                          }}
                          aria-label={`${skill}, ${date}: ${value}`}
                        >
                          <span>{value}</span>
                        </div>
                      );
                    })}
                  </div>
                  <span className="small">{date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="small muted">
          Демонстрационные срезы. Обновление данных — каждые{" "}
          {UPDATE_INTERVAL_DAYS} дней.
        </p>
      </section>
      <div className="notice">
        Рейтинг показывает требования вакансий. Персональный порядок изучения
        зависит от ваших навыков.
      </div>
      <div className="actions end">
        <Link to="plan" className="button">
          Перейти к персональному roadmap
        </Link>
      </div>
    </section>
  );
}
function RequirementLegendLocal() {
  return (
    <section className="panel requirement-legend">
      <h2>Классификация требований вакансии</h2>
      <div className="legend-tags">
        {Object.keys(requirementTypes).map((type) => (
          <TypeTag type={type} key={type} />
        ))}
      </div>
    </section>
  );
}
export function Auth({ mode }) {
  const [message, setMessage] = useState(""),
    [show, setShow] = useState(false),
    [policy, setPolicy] = useState(null),
    [policyError, setPolicyError] = useState(""),
    [policyAttempt, setPolicyAttempt] = useState(0),
    [registered, setRegistered] = useState(false);
  const register = mode === "register",
    reset = mode === "reset";
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    setPolicyError("");
    request("/config", undefined, { method: "GET" })
      .then((value) => {
        if (typeof value?.requireConfirmedEmail !== "boolean")
          throw new Error("Не удалось загрузить настройки регистрации.");
        if (active) setPolicy(value);
      })
      .catch((error) => {
        if (active) setPolicyError(error.message);
      });
    return () => { active = false; };
  }, [policyAttempt]);
  async function submit(event) {
    event.preventDefault();
    if (register && !policy) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    if (register && form.get("password") !== form.get("repeat")) {
      setMessage("Пароли не совпадают. Проверьте повтор пароля.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const email = form.get("email").trim(),
        password = form.get("password");
      if (reset) {
        await request("/forgot-password", { email });
        setMessage(
          "Если адрес зарегистрирован и восстановление доступно, письмо для восстановления отправлено.",
        );
      } else if (register) {
        await request("/register", { email, password });
        setMessage(
          policy.requireConfirmedEmail
            ? "Если адрес доступен для регистрации, мы отправили письмо. Подтвердите почту перед входом."
            : "Можно сразу войти с указанной почтой и паролем. Для существующего аккаунта используйте прежний пароль.",
        );
        setRegistered(true);
      } else {
        await login(email, password);
        location.hash = "/plan";
      }
      element.reset();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }
  async function resend(event) {
    const email = new FormData(
      event.currentTarget.closest("section").querySelector("form"),
    )
      .get("email")
      .trim();
    if (!email) {
      setMessage("Введите почту в поле выше.");
      return;
    }
    setPending(true);
    try {
      await request("/resend-confirmation", { email });
      setMessage("Если почта ожидает подтверждения, новое письмо отправлено.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="container auth-page">
      <div className="auth-story">
        <h1>
          Сегодня — навык.
          <br />
          Завтра — возможность.
        </h1>
        <p>
          Ваш план начинается с того, что вы уже знаете. Отметьте навыки и
          двигайтесь по roadmap.
        </p>
        <section className="auth-mini-route">
          <h2>От основ — к следующей возможности</h2>
          <div>
            {["SQL", "REST API", "Git"].map((skill, i) => (
              <React.Fragment key={skill}>
                {i > 0 && (
                  <span className="mini-arrow" aria-hidden="true">
                    →
                  </span>
                )}
                <article>
                  <strong>{skill}</strong>
                  <span className="small">
                    {i < 2 ? "Базовый навык" : "Следующий шаг"}
                  </span>
                </article>
              </React.Fragment>
            ))}
          </div>
          <p className="small">Демо: охват 20% → 35% → 60% → 80%</p>
        </section>
      </div>
      <section className="panel auth-card">
        <h2>
          {reset
            ? "Восстановите доступ"
            : register
              ? "Создайте профиль"
              : "С возвращением"}
        </h2>
        <p>
          {reset
            ? "Укажите электронную почту"
            : register
              ? "Ваш первый шаг к roadmap"
              : "Войдите в свой аккаунт"}
        </p>
        {!reset && (
          <nav className="segments" aria-label="Вход и регистрация">
            <Link
              to="login"
              className={!register ? "button" : "button secondary"}
              aria-current={!register ? "page" : undefined}
            >
              Вход
            </Link>
            <Link
              to="register"
              className={register ? "button" : "button secondary"}
              aria-current={register ? "page" : undefined}
            >
              Регистрация
            </Link>
          </nav>
        )}
        {policyError && (
          <div role="alert" className="notice">
            <p>{policyError}</p>
            <button type="button" className="text-link" onClick={() => setPolicyAttempt((value) => value + 1)}>
              Повторить загрузку настроек
            </button>
          </div>
        )}
        {register && policy?.requireConfirmedEmail === false && (
          <p className="small">Подтверждение почты не требуется. После регистрации можно сразу войти.</p>
        )}
        <form onSubmit={submit}>
          <label>
            Электронная почта
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="alex@example.test"
            />
          </label>
          {!reset && (
            <>
              <label>
                Пароль
                <div className="password-field">
                  <input
                    aria-label="Пароль"
                    name="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={register ? 12 : 1}
                    maxLength={128}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                  />
                  <button type="button" onClick={() => setShow(!show)}>
                    {show ? "Скрыть" : "Показать"}
                  </button>
                </div>
              </label>
              {register && (
                <label>
                  Повторите пароль
                  <input
                    name="repeat"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </label>
              )}
            </>
          )}
          <button className="button full" disabled={pending || (register && !policy)}>
            {pending
              ? "Подождите…"
              : reset
                ? "Отправить ссылку"
                : register
                  ? "Зарегистрироваться"
                  : "Войти"}
          </button>
        </form>
        {!reset && !register && (
          <Link to="reset" className="button secondary full">
            Забыли пароль?
          </Link>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {register && registered && policy?.requireConfirmedEmail === false && (
          <Link to="login" className="button full">Перейти ко входу</Link>
        )}
        {register && (
          <p className="small muted">
            Пароль от 12 до 128 символов. Подойдёт длинная фраза.
          </p>
        )}
        {!reset && policy?.requireConfirmedEmail && (
          <button
            type="button"
            className="text-link"
            disabled={pending}
            onClick={resend}
          >
            Отправить подтверждение почты повторно
          </button>
        )}
      </section>
    </section>
  );
}
