import React from "react";
import { Modal, TypeTag } from "./UI";
import {
  coverage,
  percent,
  skillCategory,
  safeExternalUrl,
  vacancyText,
} from "../data";

export default function SkillDialog({
  selection,
  profile,
  jobs,
  toggle,
  close,
}) {
  const { skill, step } = selection;
  const context = [...new Set([...profile.skills, ...(step?.before || [])])];
  const before = coverage(jobs, context),
    after = coverage(jobs, [...context, skill]);
  const basis = jobs.filter((job) => job.required.includes(skill));
  return (
    <Modal title="Навык в вашем плане" close={close} className="skill-dialog">
      <h3 className="selected-skill-name">{skill}</h3>
      <div className="skill-classification">
        <TypeTag type={skillCategory(jobs, skill)} />
        <span>
          Вакансий с требованием {skill}: {basis.length}
        </span>
      </div>
      <section className="coverage-comparison" aria-label="Охват до и после">
        <h3>Охват до → после</h3>
        <p>
          {before} из {jobs.length} ({percent(before, jobs.length)}){" "}
          <span aria-hidden="true">→</span> {after} из {jobs.length} (
          {percent(after, jobs.length)})
        </p>
      </section>
      <p className="context-note">
        {step
          ? `Прогноз шага ${step.index + 1}: основы и предыдущие шаги учитываются.`
          : "Прогноз относительно ваших текущих изученных навыков."}
      </p>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={profile.skills.includes(skill)}
          onChange={() => toggle(skill)}
        />
        Отметить навык изученным
      </label>
      <h3>Вакансии-основания · {basis.length}</h3>
      <section className="vacancy-examples panel">
        <h4>Примеры вакансий</h4>
        <div className="vacancy-scroll">
          {basis.map((job) => {
            const url = safeExternalUrl(job.url);
            return (
              <article className="vacancy-example" key={job.id}>
                <div className="vacancy-title">
                  <strong>{job.title}</strong>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Открыть ↗
                    </a>
                  ) : (
                    <span className="small muted">{job.id} · демо</span>
                  )}
                </div>
                <p className="small">Обязательные навыки вакансии</p>
                <ul className="required-skills">
                  {job.required.map((required) => (
                    <li
                      className={
                        profile.skills.includes(required) ? "studied" : ""
                      }
                      key={required}
                    >
                      <span className="skill-check" aria-hidden="true">
                        {profile.skills.includes(required) ? "✓" : "○"}
                      </span>
                      <span>
                        {required}
                        <span className="sr-only">
                          {" "}
                          —{" "}
                          {profile.skills.includes(required)
                            ? "изучен"
                            : "не изучен"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
          {!basis.length && (
            <p>В выбранном срезе вакансий с этим требованием нет.</p>
          )}
        </div>
        <p className="small muted">
          {vacancyText(basis.length)}. В демонстрационных данных внешних ссылок
          нет.
        </p>
      </section>
    </Modal>
  );
}
