import React, { useState } from "react";
import { directions, basicSkills } from "../data";
import { Link, TypeTag } from "../components/UI";
import RegionPicker from "../RegionPicker";
import AccountSettings from "../AccountSettings";

export default function Profile({ profile, update, onDelete }) {
  const [draft, setDraft] = useState(structuredClone(profile)),
    [message, setMessage] = useState("");
  const skills = directions[draft.direction].skills;
  function toggle(skill) {
    setDraft({
      ...draft,
      skills: draft.skills.includes(skill)
        ? draft.skills.filter((s) => s !== skill)
        : [...draft.skills, skill],
    });
    setMessage("");
  }
  function save(event) {
    event.preventDefault();
    update({ ...draft, email: profile.email });
    setMessage("Параметры сохранены. План обновлён с учётом ваших изменений.");
  }
  return (
    <section className="container page">
      <h1>Ваш профиль</h1>
      <div className="profile-layout">
        <form className="panel profile-form" onSubmit={save}>
          <h2>Цель, география и навыки</h2>
          <label>
            Направление
            <select
              aria-label="Направление"
              value={draft.direction}
              onChange={(event) => {
                setDraft({ ...draft, direction: event.target.value });
                setMessage("");
              }}
            >
              {Object.entries(directions).map(([key, value]) => (
                <option value={key} key={key}>
                  {value.name}
                </option>
              ))}
            </select>
          </label>
          <RegionPicker
            selected={draft.regions}
            onChange={(regions) => {
              setDraft({ ...draft, regions });
              setMessage("");
            }}
          />
          <SkillGroup
            key={`${draft.direction}-basic`}
            title="Базовые навыки"
            skills={basicSkills[draft.direction]}
            selected={draft.skills}
            toggle={toggle}
          />
          <SkillGroup
            key={`${draft.direction}-specialized`}
            title="Специализированные навыки"
            skills={skills.filter(
              (skill) => !basicSkills[draft.direction].includes(skill),
            )}
            selected={draft.skills}
            toggle={toggle}
          />
          {draft.skills.some((skill) => !skills.includes(skill)) && (
            <p className="small muted">
              Навыки других направлений сохранены в профиле.
            </p>
          )}
          <div className="notice">
            В профиле доступен полный список. Изученные базовые навыки
            скрываются только из рекомендаций плана.
          </div>
          <div className="actions">
            <button className="button">Сохранить изменения</button>
            <Link to="plan" className="button secondary">
              Вернуться к roadmap
            </Link>
          </div>
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </form>
        <aside className="profile-side">
          <AccountSettings
            email={profile.email}
            saveEmail={(email) => update({ ...profile, email })}
            onDelete={onDelete}
          />
          <section className="panel requirement-legend">
            <h2>Классификация требований вакансии</h2>
            <div className="legend-tags wrap">
              <TypeTag />
              <TypeTag type="desired" />
              <TypeTag type="mentioned" />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
function SkillGroup({ title, skills, selected, toggle }) {
  const [query, setQuery] = useState("");
  const filtered = skills.filter((skill) =>
    skill.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <fieldset className="skill-group panel">
      <legend>{title}</legend>
      <input
        type="search"
        aria-label={`Поиск: ${title.toLowerCase()}`}
        placeholder="Найти навык…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {filtered.map((skill) => (
        <div className="profile-skill-row" key={skill}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={selected.includes(skill)}
              onChange={() => toggle(skill)}
            />
            {skill}
          </label>
          <TypeTag />
        </div>
      ))}
      {!filtered.length && <p className="small muted">Навык не найден.</p>}
    </fieldset>
  );
}
