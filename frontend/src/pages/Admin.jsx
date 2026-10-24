import React, { useState } from "react";
import {
  directions,
  vacancies,
  rawRecords,
  percent,
  SNAPSHOT_DATE,
} from "../data";
import { Modal } from "../components/UI";

function loadAdmin() {
  try {
    const value = JSON.parse(localStorage.getItem("skill-day-admin"));
    if (
      Array.isArray(value?.processed) &&
      value.processed.every((x) => typeof x === "string") &&
      value.flags &&
      typeof value.flags === "object" &&
      Array.isArray(value.skills)
    )
      return value;
  } catch {}
  return { processed: [], flags: {}, skills: [] };
}
export default function Admin() {
  const [state, setState] = useState(loadAdmin),
    [query, setQuery] = useState(""),
    [jobId, setJobId] = useState("SYS-120");
  const [action, setAction] = useState(null),
    [message, setMessage] = useState("");
  const jobs = vacancies("analyst"),
    job = jobs.find((item) => item.id === jobId) || jobs[0];
  const [review, setReview] = useState(Boolean(state.flags[jobId]?.review)),
    [excluded, setExcluded] = useState(Boolean(state.flags[jobId]?.excluded));
  const records = rawRecords(jobs).filter(
    (record) =>
      !state.processed.includes(record.term) &&
      record.term.toLowerCase().includes(query.toLowerCase()),
  );
  const unrecognized = jobs.filter((item) => !item.structureRecognized).length;
  const skills = [
    ...new Set([
      ...Object.values(directions).flatMap((item) => item.skills),
      ...state.skills,
    ]),
  ].sort((a, b) => a.localeCompare(b, "ru"));
  function persist(next) {
    setState(next);
    try {
      localStorage.setItem("skill-day-admin", JSON.stringify(next));
    } catch {}
  }
  function process(term, text, canonical) {
    persist({
      ...state,
      processed: [...state.processed, term],
      skills:
        canonical && !skills.includes(canonical)
          ? [...state.skills, canonical]
          : state.skills,
    });
    setMessage(
      `${term}: ${text}. Изменение сохранено в демонстрационных данных.`,
    );
    setAction(null);
  }
  function selectJob(id) {
    setJobId(id);
    setReview(Boolean(state.flags[id]?.review));
    setExcluded(Boolean(state.flags[id]?.excluded));
    setMessage("");
  }
  return (
    <section className="container page admin-page">
      <h1>Контроль качества данных</h1>
      <p className="scope-line">
        Системный анализ · Москва + удалённо · {SNAPSHOT_DATE}
      </p>
      <div className="two-columns admin-metrics">
        <section className="metric metric-dark">
          <h2>Доля вакансий с нераспознанной структурой</h2>
          <p>
            {percent(unrecognized, jobs.length)} · {unrecognized} из{" "}
            {jobs.length} вакансий
          </p>
        </section>
        <section className="metric metric-primary">
          <h2>Вакансий в срезе: {jobs.length}</h2>
          <p>Демонстрационный срез системных аналитиков</p>
        </section>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <section className="panel accumulator">
        <h2>Накопитель необработанного</h2>
        <div className="section-heading">
          <input
            type="search"
            placeholder="Найти термин…"
            aria-label="Поиск необработанной записи"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="small">Сортировка: число встреч ↓</span>
        </div>
        <div className="raw-header" aria-hidden="true">
          <span>Необработанная запись</span>
          <span>Число встреч ↓</span>
          <span>Три действия над каждой записью</span>
        </div>
        {records.map((record) => (
          <article className="raw-row" key={record.term}>
            <strong>{record.term}</strong>
            <span className="raw-count">{record.count}</span>
            <div className="raw-actions">
              <button
                className="button compact"
                onClick={() => setAction({ ...record, type: "create" })}
              >
                Создать навык
              </button>
              <button
                className="button secondary compact"
                onClick={() => setAction({ ...record, type: "link" })}
              >
                Связать с навыком
              </button>
              <button
                className="button secondary compact"
                onClick={() => process(record.term, "запись отклонена")}
              >
                Отклонить
              </button>
            </div>
          </article>
        ))}
        {!records.length && (
          <p className="empty-message">
            Необработанных записей по этому запросу нет.
          </p>
        )}
      </section>
      <div className="admin-review-layout">
        <section className="panel vacancy-review">
          <h2>Вакансия / ручная проверка</h2>
          <label>
            Выбор вакансии
            <select
              aria-label="Выбор вакансии"
              value={jobId}
              onChange={(event) => selectJob(event.target.value)}
            >
              {jobs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} · {item.title}
                </option>
              ))}
            </select>
          </label>
          <h3>
            {job.title} · {job.id}
          </h3>
          <div className="notice">
            <strong>Текст вакансии · демонстрация</strong>
            <p>
              Нужен специалист для работы с интеграциями и данными. Требования:{" "}
              {job.required.join(", ")}.
            </p>
          </div>
          <div className="notice">
            <strong>Результат разбора</strong>
            <p>Обязательные: {job.required.join(", ")}.</p>
            <p>
              Желательные: {job.desired.join(", ") || "нет"}. Упомянутые:{" "}
              {job.mentioned.join(", ") || "нет"}.
            </p>
          </div>
        </section>
        <aside>
          <section className="panel flags">
            <h2>Две ручные пометки вакансии</h2>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={review}
                onChange={(event) => setReview(event.target.checked)}
              />
              Требует ручной проверки
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={excluded}
                onChange={(event) => setExcluded(event.target.checked)}
              />
              Исключить из расчёта
            </label>
            <button
              className="button full"
              onClick={() => {
                persist({
                  ...state,
                  flags: { ...state.flags, [jobId]: { review, excluded } },
                });
                setMessage(
                  `${jobId}: пометки сохранены в демонстрационных данных.`,
                );
              }}
            >
              Сохранить пометки
            </button>
          </section>
          <p className="small muted">
            Действия изменяют локальный демонстрационный набор. Серверные данные
            не затрагиваются.
          </p>
        </aside>
      </div>
      {action && (
        <Modal
          title={
            action.type === "create" ? "Создать навык" : "Связать с навыком"
          }
          close={() => setAction(null)}
        >
          <p>
            Запись: <strong>{action.term}</strong>
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget)
                .get("skill")
                .trim();
              if (!value) return;
              process(
                action.term,
                action.type === "create"
                  ? `создан навык «${value}»`
                  : `связано с «${value}»`,
                value,
              );
            }}
          >
            <label>
              Канонический навык
              {action.type === "create" ? (
                <input
                  name="skill"
                  required
                  maxLength={120}
                  defaultValue={action.term}
                />
              ) : (
                <select aria-label="Канонический навык" name="skill">
                  {skills.map((skill) => (
                    <option key={skill}>{skill}</option>
                  ))}
                </select>
              )}
            </label>
            <div className="actions">
              <button className="button">Сохранить</button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setAction(null)}
              >
                Отмена
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
