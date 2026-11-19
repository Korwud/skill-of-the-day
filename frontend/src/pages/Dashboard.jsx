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
  filterByLayer,
  skillContext,
  basisJobs,
  minimumDeficit,
  SNAPSHOT_DATE,
  UPDATE_INTERVAL_DAYS,
  formatNumber,
  vacancyText,
} from "../data";
import {
  Link,
  TypeTag,
  RequirementLegend,
  LevelSelect,
} from "../components/UI";
import SkillDialog from "../components/SkillDialog";
import RoadmapGraph from "../components/RoadmapGraph";

export default function Dashboard({ profile, update }) {
  const [mode, setMode] = useState("graph"),
    [selected, setSelected] = useState(null),
    [query, setQuery] = useState("");
  const [layer, setLayer] = useState(null),
    [processing, setProcessing] = useState(false),
    [error, setError] = useState("");
  const worker = useRef(null),
    tabs = useRef(null);
  const baseJobs = useMemo(
    () => getScope(profile),
    [profile.direction, profile.regions, profile.level],
  );
  const layerValues = useMemo(
    () => layers(baseJobs, profile.skills),
    [baseJobs, profile.skills],
  );
  const activeLayer =
    layer !== null && layerValues.some(([value]) => value === layer)
      ? layer
      : null;
  const jobs = useMemo(
    () => filterByLayer(baseJobs, profile.skills, activeLayer),
    [baseJobs, profile.skills, activeLayer],
  );
  const computed = useMemo(
    () => buildPlan(jobs, profile.skills, profile.direction),
    [jobs, profile.skills, profile.direction],
  );
  const [steps, setSteps] = useState(computed);
  useEffect(() => {
    setLayer(null);
    setSelected(null);
  }, [profile.direction, profile.regions, profile.level]);
  useEffect(() => {
    if (layer !== activeLayer) setLayer(activeLayer);
  }, [layer, activeLayer]);
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
    if (processing || !jobs.length) return;
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
    instance.onmessage = ({ data }) =>
      requestAnimationFrame(() => {
        if (worker.current !== instance) return;
        if (data.error) setError(data.error);
        else setSteps(data.steps);
        setProcessing(false);
        instance.terminate();
      });
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
  const open = (skill, step) =>
    setSelected({
      skill,
      step,
      context: skillContext(profile.skills, step, skill),
      jobs,
    });
  function chooseLayer(value) {
    setSelected(null);
    setLayer(value);
    setError("");
  }
  function switchTab(value) {
    setMode(value);
  }
  function tabKeys(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "graph"
        : event.key === "End"
          ? "table"
          : mode === "graph"
            ? "table"
            : "graph";
    setMode(next);
    tabs.current.querySelector("#plan-tab-" + next).focus();
  }
  return (
    <section className="container page dashboard">
      <div className="page-heading">
        <h1>Ваш roadmap</h1>
        <Link to="profile" className="button secondary">
          Настроить профиль
        </Link>
      </div>
      <div className="scope-settings">
        <p className="scope-line">
          {directions[profile.direction].name} ·{" "}
          {profile.regions.join(" + ") || "Вся Россия"}
          <span>Дата среза: {SNAPSHOT_DATE}</span>
        </p>
        <LevelSelect
          value={profile.level || "all"}
          disabled={processing}
          onChange={(level) => update({ ...profile, level })}
        />
      </div>
      <section className="notice trends-notice">
        <strong>Обновление трендов навыков</strong>
        <p>
          SQL: +3 · REST API: +3 к предыдущему срезу. Обновление каждые{" "}
          {UPDATE_INTERVAL_DAYS} дней.
        </p>
      </section>
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
      {(!noSkills || !baseJobs.length) && (
        <LayerPanel
          jobs={baseJobs}
          skills={profile.skills}
          selected={activeLayer}
          choose={chooseLayer}
          processing={processing}
        />
      )}
      {!noSkills && (
        <div className="plan-navigation">
          <div
            ref={tabs}
            className="segments plan-tabs"
            role="tablist"
            aria-label="Представление плана"
            onKeyDown={tabKeys}
          >
            {[
              ["graph", "Граф"],
              ["table", "Таблица"],
            ].map(([value, name]) => (
              <button
                type="button"
                role="tab"
                id={"plan-tab-" + value}
                key={value}
                aria-selected={mode === value}
                aria-controls="plan-view"
                tabIndex={mode === value ? 0 : -1}
                disabled={processing}
                onClick={() => switchTab(value)}
              >
                {name}
              </button>
            ))}
          </div>
          <button
            className="button recalculate"
            onClick={recalculate}
            disabled={processing || !jobs.length}
          >
            {processing ? "Пересчёт выполняется…" : "Пересчитать план"}
          </button>
        </div>
      )}
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
      <div
        id="plan-view"
        role={noSkills ? undefined : "tabpanel"}
        aria-labelledby={noSkills ? undefined : "plan-tab-" + mode}
      >
        <fieldset
          className={`plan-content${processing ? " processing" : ""}`}
          disabled={processing}
          aria-busy={processing}
        >
          {!jobs.length ? (
            <>
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
              <Link to="profile" className="button secondary">
                Изменить параметры среза
              </Link>
            </>
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
            <div className="plan-layout compact-plan-layout">
              <RoadmapGraph
                remaining={remaining}
                steps={steps}
                profile={profile}
                jobs={jobs}
                open={open}
                processing={processing}
              />
              <aside className="plan-aside">
                <section className="panel">
                  <h2>Как читать план</h2>
                  <p>
                    На узле — название навыка. Остальные показатели появляются в
                    подсказке.
                  </p>
                  <p className="small">
                    Вклад навыка равен числу вакансий-оснований. Процентный
                    пункт — разница между процентами охвата.
                  </p>
                  <p className="small">
                    Расчёт по {vacancyText(jobs.length)}
                    {activeLayer === null
                      ? " выбранного среза"
                      : " слоя " + activeLayer}
                    .
                  </p>
                </section>
              </aside>
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
              <p className="notice">
                Граф и таблица показывают один план для{" "}
                {vacancyText(jobs.length)}
                {activeLayer === null
                  ? " выбранного среза"
                  : " слоя " + activeLayer}
                . Каждый шаг учитывает предыдущие.
              </p>
            </>
          )}
        </fieldset>
      </div>
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
          jobs={selected.jobs}
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
                <TypeTag key={skill} />
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
                    basisJobs(
                      jobs,
                      skillContext(profile.skills, step, skill),
                      skill,
                    ).length,
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

function LayerPanel({ jobs, skills, selected, choose, processing }) {
  const values = layers(jobs, skills);
  return (
    <section
      className="panel layers plan-layer-filter"
      aria-label="Слои дефицита"
    >
      <h2>Слои дефицита</h2>
      <p className="small">
        Слой — число недостающих обязательных навыков. Например, слой 2: для
        каждой вакансии не хватает двух навыков.
      </p>
      {!values.length ? (
        <>
          <p className="empty-layer">Слоёв нет</p>
          <p className="small">
            Вакансий в срезе нет. Измените параметры среза.
          </p>
        </>
      ) : (
        <>
          <div
            className="layer-controls"
            role="group"
            aria-label="Фильтр по дефициту"
          >
            <button
              type="button"
              aria-pressed={selected === null}
              disabled={processing}
              onClick={() => choose(null)}
            >
              Все · {jobs.length}
            </button>
            {values.map(([value, count]) => (
              <button
                type="button"
                key={value}
                aria-pressed={selected === value}
                disabled={processing}
                onClick={() => choose(value)}
              >
                Слой {value} · {count}
              </button>
            ))}
          </div>
          <p className="small" aria-live="polite">
            {selected === null
              ? `Все ${vacancyText(jobs.length)}. Показано слоёв: ${values.length}; число слоёв зависит от среза.`
              : `Выбран слой ${selected}: ${vacancyText(values.find(([value]) => value === selected)[1])}. План и показатели пересчитаны по этим вакансиям.`}
          </p>
        </>
      )}
    </section>
  );
}
