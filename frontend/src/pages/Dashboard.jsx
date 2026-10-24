import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  basicSkills,
  directions,
  getScope,
  buildPlan,
  coverage,
  percent,
  skillGain,
  layers,
  minimumDeficit,
  SNAPSHOT_DATE,
  UPDATE_INTERVAL_DAYS,
  formatNumber,
  vacancyText,
  skillCategory,
} from "../data";
import { Link, TypeTag, RequirementLegend } from "../components/UI";
import SkillDialog from "../components/SkillDialog";

export default function Dashboard({ profile, update }) {
  const [mode, setMode] = useState("graph"),
    [selected, setSelected] = useState(null),
    [query, setQuery] = useState("");
  const [processing, setProcessing] = useState(false),
    [error, setError] = useState("");
  const worker = useRef(null);
  const jobs = useMemo(
    () => getScope(profile),
    [profile.direction, profile.regions],
  );
  const computed = useMemo(
    () => buildPlan(jobs, profile.skills, profile.direction),
    [jobs, profile.skills, profile.direction],
  );
  const [steps, setSteps] = useState(computed);
  useEffect(() => {
    worker.current?.terminate();
    setProcessing(false);
    setSteps(computed);
  }, [computed]);
  useEffect(() => () => worker.current?.terminate(), []);
  const bases = basicSkills[profile.direction],
    remaining = bases.filter((skill) => !profile.skills.includes(skill));
  const covered = coverage(jobs, profile.skills),
    minimum = minimumDeficit(jobs, profile.skills);
  const noSkills = !directions[profile.direction].skills.some((skill) =>
    profile.skills.includes(skill),
  );
  function toggle(skill) {
    update({
      ...profile,
      skills: profile.skills.includes(skill)
        ? profile.skills.filter((s) => s !== skill)
        : [...profile.skills, skill],
    });
  }
  function recalculate() {
    if (processing) return;
    setProcessing(true);
    setError("");
    let instance;
    try {
      instance = new Worker(new URL("../plan.worker.js", import.meta.url), {
        type: "module",
      });
    } catch {
      setError("Не удалось пересчитать план. Попробуйте ещё раз.");
      setProcessing(false);
      return;
    }
    worker.current = instance;
    instance.onmessage = ({ data }) => {
      requestAnimationFrame(() => {
        if (worker.current !== instance) return;
        if (data.error) setError(data.error);
        else setSteps(data.steps);
        setProcessing(false);
        instance.terminate();
      });
    };
    instance.onerror = () => {
      setError("Не удалось пересчитать план. Попробуйте ещё раз.");
      setProcessing(false);
      instance.terminate();
    };
    instance.postMessage({
      jobs,
      skills: profile.skills,
      direction: profile.direction,
    });
  }
  const open = (skill, step) => setSelected({ skill, step });
  return (
    <section className="container page dashboard">
      <div className="page-heading">
        <h1>Ваш roadmap</h1>
        <Link to="profile" className="button secondary">
          Настроить профиль
        </Link>
      </div>
      <p className="scope-line">
        {directions[profile.direction].name} ·{" "}
        {profile.regions.join(" + ") || "Вся Россия"} · {SNAPSHOT_DATE}
      </p>
      <section className="notice trends-notice">
        <strong>Обновление трендов навыков</strong>
        <p>
          SQL: +3 · REST API: +3 к предыдущему срезу. Обновление каждые{" "}
          {UPDATE_INTERVAL_DAYS} дней.
        </p>
      </section>
      <div className="plan-navigation">
        <div className="segments" aria-label="Представление плана">
          <button
            className={mode === "graph" ? "button" : "button secondary"}
            onClick={() => setMode("graph")}
            aria-pressed={mode === "graph"}
          >
            Визуальный roadmap
          </button>
          <button
            className={mode === "table" ? "button" : "button secondary"}
            onClick={() => setMode("table")}
            aria-pressed={mode === "table"}
          >
            Таблица
          </button>
        </div>
        <button
          className="button recalculate"
          onClick={recalculate}
          disabled={processing}
        >
          {processing ? "Пересчёт выполняется…" : "Пересчитать план"}
        </button>
      </div>
      {processing && (
        <p role="status" className="notice">
          Пересчёт выполняется… Показан предыдущий результат.
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {!noSkills && (
        <div className="metrics">
          <section className="metric metric-primary">
            <h2>
              Охват · {covered} из {jobs.length}
            </h2>
            <p>{percent(covered, jobs.length)} · обязательные навыки изучены</p>
          </section>
          <section className="metric metric-dark">
            <h2>Минимальный дефицит</h2>
            <p>
              {!jobs.length
                ? "Нет данных"
                : minimum === null
                  ? "Все требования закрыты"
                  : `Недостающих обязательных навыков: ${minimum}`}
            </p>
          </section>
          <section className="metric">
            <h2>
              Базовые навыки · {bases.length - remaining.length} из{" "}
              {bases.length}
            </h2>
          </section>
        </div>
      )}
      <RequirementLegend />
      <fieldset
        className={`plan-content${processing ? " processing" : ""}`}
        disabled={processing}
        aria-busy={processing}
      >
        {!jobs.length ? (
          <div className="plan-layout">
            <div>
              <div className="notice">
                <h2>Вакансий в срезе нет</h2>
                <p>
                  Персональные рекомендации появятся после изменения параметров
                  среза.
                </p>
              </div>
              <Basics
                remaining={remaining}
                profile={profile}
                jobs={jobs}
                toggle={toggle}
                open={open}
              />
            </div>
            <aside>
              <LayerPanel jobs={jobs} skills={profile.skills} />
              <Link to="profile" className="button full">
                Изменить параметры среза
              </Link>
            </aside>
          </div>
        ) : noSkills ? (
          <>
            <p className="zero-intro">
              Начнём с основ. Отметьте знакомые навыки — затем появится
              персональный план.
            </p>
            <div className="plan-layout">
              <section className="panel zero-basics">
                <h2>Неизученные базовые навыки</h2>
                {remaining.map((skill) => (
                  <div className="zero-skill" key={skill}>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggle(skill)}
                      />
                      {skill}
                    </label>
                    <TypeTag />
                    <button className="text-link" onClick={() => open(skill)}>
                      Подробнее
                    </button>
                  </div>
                ))}
              </section>
              <aside className="panel">
                <p>
                  Каждый базовый навык остаётся в списке до отметки «изучен».
                </p>
                <Link to="profile" className="button secondary">
                  Выбрать навыки в профиле
                </Link>
              </aside>
            </div>
          </>
        ) : mode === "graph" ? (
          <div className="plan-layout">
            <section
              className="panel graph-plan"
              aria-label="Графический roadmap"
            >
              <h2>Графический roadmap</h2>
              <p className="small graph-caption">
                Базовые навыки сверху; специализированные — по убыванию вклада
                навыка.
              </p>
              <Basics
                remaining={remaining}
                profile={profile}
                jobs={jobs}
                toggle={toggle}
                open={open}
              />
              {remaining.length > 0 && steps.length > 0 && (
                <div className="flow-arrow base-connector" aria-hidden="true">
                  ↓
                </div>
              )}
              <div className="roadmap-steps">
                {steps.map((step, index) => (
                  <React.Fragment key={step.skills.join("+")}>
                    {index > 0 && (
                      <div className="flow-arrow" aria-hidden="true">
                        ↓
                      </div>
                    )}
                    <StepCard
                      step={step}
                      profile={profile}
                      jobs={jobs}
                      toggle={toggle}
                      open={open}
                    />
                  </React.Fragment>
                ))}
              </div>
              {!steps.length && (
                <p className="notice">
                  {remaining.length
                    ? "После изучения основ все требования этого среза будут закрыты."
                    : "Все навыки этого среза изучены. Можно изменить направление или регион."}
                </p>
              )}
              <p className="notice small roadmap-explanation">
                Стрелки показывают порядок изучения. Изученные базовые навыки
                скрываются.
              </p>
            </section>
            <PlanAside jobs={jobs} profile={profile} />
          </div>
        ) : (
          <>
            <Basics
              remaining={remaining}
              profile={profile}
              jobs={jobs}
              toggle={toggle}
              open={open}
            />
            <PlanTable
              steps={steps}
              profile={profile}
              jobs={jobs}
              toggle={toggle}
              open={open}
            />
            <div className="table-bottom">
              <LayerPanel jobs={jobs} skills={profile.skills} />
              <div className="notice">
                Тот же порядок рекомендаций и тот же контекст охвата, что в
                графическом roadmap. Основы учитываются перед
                специализированными шагами.
              </div>
            </div>
          </>
        )}
      </fieldset>
      {!noSkills && (
        <section className="panel learned">
          <h2>Изученные навыки</h2>
          <input
            type="search"
            aria-label="Поиск изученного навыка"
            placeholder="Найти изученный навык…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="chips">
            {profile.skills
              .filter((skill) =>
                skill.toLowerCase().includes(query.toLowerCase()),
              )
              .map((skill) => (
                <button
                  key={skill}
                  disabled={processing}
                  onClick={() => toggle(skill)}
                  aria-label={`Снять отметку ${skill}`}
                >
                  ✓ {skill} ×
                </button>
              ))}
          </div>
        </section>
      )}
      {selected && (
        <SkillDialog
          selection={selected}
          profile={profile}
          jobs={jobs}
          toggle={toggle}
          close={() => setSelected(null)}
        />
      )}
    </section>
  );
}
function Basics({ remaining, profile, jobs, toggle, open }) {
  return (
    <section className="basics">
      <h3>Базовые навыки · пока не изучены</h3>
      {remaining.length ? (
        <div className="basic-grid">
          {remaining.map((skill) => (
            <article className="basic-node" key={skill}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={profile.skills.includes(skill)}
                  onChange={() => toggle(skill)}
                />
                {skill}
              </label>
              <div className="node-tags">
                <TypeTag />
                <span className="small">
                  Вклад навыка: +{skillGain(jobs, profile.skills, skill)}
                </span>
              </div>
              <button className="text-link" onClick={() => open(skill)}>
                Вакансии-основания
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="small">Все базовые навыки изучены ✓</p>
      )}
    </section>
  );
}
function StepCard({ step, profile, jobs, toggle, open }) {
  return (
    <article className={`step-card${step.index === 0 ? " next-step" : ""}`}>
      {step.skills.map((skill, index) => (
        <div className="step-skill" key={skill}>
          <div className="step-title">
            <label className="checkbox-only">
              <input
                aria-label={`Изучен ${skill}`}
                type="checkbox"
                checked={profile.skills.includes(skill)}
                onChange={() => toggle(skill)}
              />
            </label>
            <button className="skill-link" onClick={() => open(skill, step)}>
              {index === 0 ? `${step.index + 1}. ` : ""}
              {skill}
            </button>
          </div>
          <div className="node-tags">
            <TypeTag type={skillCategory(jobs, skill)} />
            <span className="contribution">
              Вклад навыка: +{skillGain(jobs, step.before, skill)}
            </span>
          </div>
          <button
            className="text-link basis-link"
            onClick={() => open(skill, step)}
          >
            Вакансии-основания ·{" "}
            {jobs.filter((job) => job.required.includes(skill)).length}
          </button>
        </div>
      ))}
      <p className="step-gain">
        Прирост охвата: +{formatNumber(step.percentagePoints)} п.п.
      </p>
      {step.partial && (
        <p className="small">
          Частичный шаг: минимальный дефицит уменьшается; оставшиеся навыки — на
          следующем шаге.
        </p>
      )}
    </article>
  );
}
function PlanTable({ steps, profile, jobs, toggle, open }) {
  return (
    <section className="panel table-plan">
      <h2>Табличный список рекомендаций</h2>
      <div className="plan-table">
        <div className="plan-table-head" aria-hidden="true">
          <span>Порядок</span>
          <span>Навык</span>
          <span>Тип требования</span>
          <span>Вклад навыка</span>
          <span>Прирост охвата, п.п.</span>
          <span>Изучен</span>
          <span>Основания</span>
        </div>
        {steps.map((step) => (
          <article className="plan-table-row" key={step.index}>
            <span className="table-order">{step.index + 1}</span>
            <div>
              {step.skills.map((skill) => (
                <button
                  className="skill-link"
                  key={skill}
                  onClick={() => open(skill, step)}
                >
                  {skill}
                </button>
              ))}
            </div>
            <div className="table-types">
              {step.skills.map((skill) => (
                <TypeTag key={skill} type={skillCategory(jobs, skill)} />
              ))}
            </div>
            <span>
              <span className="mobile-field">Вклад навыка: </span>+{step.gain}
            </span>
            <span>
              <span className="mobile-field">Прирост охвата: </span>+
              {formatNumber(step.percentagePoints)} п.п.
            </span>
            <div>
              {step.skills.map((skill) => (
                <label className="checkbox-only" key={skill}>
                  <input
                    aria-label={`Изучен ${skill}`}
                    type="checkbox"
                    checked={profile.skills.includes(skill)}
                    onChange={() => toggle(skill)}
                  />
                </label>
              ))}
            </div>
            <div>
              {step.skills.map((skill) => (
                <button
                  className="text-link"
                  key={skill}
                  onClick={() => open(skill, step)}
                >
                  {vacancyText(
                    jobs.filter((job) => job.required.includes(skill)).length,
                  )}{" "}
                  ↗
                </button>
              ))}
            </div>
          </article>
        ))}
        {!steps.length && (
          <p className="empty-message">
            Нет дополнительных рекомендаций для этого среза.
          </p>
        )}
      </div>
    </section>
  );
}
function PlanAside({ jobs, profile }) {
  const afterBasics = coverage(jobs, [
    ...new Set([...profile.skills, ...basicSkills[profile.direction]]),
  ]);
  return (
    <aside className="plan-aside">
      <LayerPanel jobs={jobs} skills={profile.skills} />
      <p className="notice">
        Сейчас охват {percent(coverage(jobs, profile.skills), jobs.length)}.
        После базовых навыков — {percent(afterBasics, jobs.length)}. Прирост
        охвата каждого шага учитывает предыдущие.
      </p>
      <p className="notice">
        Базовые навыки остаются сверху, пока не отмечены изученными.
      </p>
      <p className="small">
        Класс относится к требованию вакансии, а не к виду навыка: базовый /
        специализированный.
      </p>
    </aside>
  );
}
function LayerPanel({ jobs, skills }) {
  const values = layers(jobs, skills);
  return (
    <section className="panel layers">
      <h2>Слои дефицита</h2>
      {!values.length ? (
        <>
          <p className="empty-layer">Слоёв нет</p>
          <p className="small">
            Вакансий в срезе нет. Измените параметры среза.
          </p>
        </>
      ) : (
        <>
          <p className="small">Слой — число недостающих обязательных навыков</p>
          <ul>
            {values.map(([n, count]) => (
              <li key={n}>
                <span>Слой {n}</span>
                <strong>{vacancyText(count)}</strong>
              </li>
            ))}
          </ul>
          <p className="small">
            Показано слоёв: {values.length}. Всего {vacancyText(jobs.length)};
            число слоёв зависит от среза.
          </p>
        </>
      )}
    </section>
  );
}
