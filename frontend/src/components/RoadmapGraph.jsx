import React, { useEffect, useRef, useState } from "react";
import SkillNode from "./SkillNode";

export default function RoadmapGraph({
  remaining,
  steps,
  profile,
  jobs,
  open,
  processing,
}) {
  const map = useRef(null),
    [columns, setColumns] = useState(3);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setColumns(entry.contentRect.width < 560 ? 2 : 3),
    );
    observer.observe(map.current);
    return () => observer.disconnect();
  }, []);
  const cell = (index) => {
    const row = Math.floor(index / columns);
    return {
      row,
      col: row % 2 ? columns - 1 - (index % columns) : index % columns,
    };
  };
  return (
    <section className="panel graph-plan" aria-label="Графический roadmap">
      <h2>Графический roadmap</h2>
      <p className="small graph-caption">
        Базовые навыки сверху; специализированные — по убыванию вклада навыка.
      </p>
      <section className="graph-basics" aria-label="Базовые навыки плана">
        <h3>Базовые навыки · пока не изучены</h3>
        {remaining.length ? (
          <div className="graph-basic-nodes">
            {remaining.map((skill) => (
              <SkillNode
                key={skill}
                skill={skill}
                jobs={jobs}
                profile={profile}
                open={open}
                disabled={processing}
              />
            ))}
          </div>
        ) : (
          <p className="small">Все базовые навыки изучены ✓</p>
        )}
      </section>
      {remaining.length > 0 && steps.length > 0 && (
        <div className="compact-base-arrow" aria-hidden="true">
          ↓
        </div>
      )}
      <div
        ref={map}
        className="compact-map"
        role="group"
        aria-label={
          "План: " + steps.flatMap((step) => step.skills).length + " навыков"
        }
      >
        <div
          className="roadmap-steps compact-roadmap"
          style={{
            gridTemplateColumns: Array(columns)
              .fill("minmax(0, 1fr)")
              .join(" 24px "),
            gridTemplateRows: Array(
              Math.max(1, Math.ceil(steps.length / columns)),
            )
              .fill("auto")
              .join(" 32px "),
          }}
        >
          {steps.map((step, index) => {
            const { row, col } = cell(index),
              next = steps[index + 1] ? cell(index + 1) : null;
            return (
              <React.Fragment key={step.skills.join("+")}>
                <div
                  className="roadmap-step"
                  role="group"
                  aria-label={"Шаг " + (index + 1)}
                  style={{ gridRow: row * 2 + 1, gridColumn: col * 2 + 1 }}
                >
                  {step.skills.map((skill) => (
                    <SkillNode
                      key={skill}
                      skill={skill}
                      step={step}
                      profile={profile}
                      jobs={jobs}
                      open={open}
                      disabled={processing}
                    />
                  ))}
                </div>
                {next && (
                  <span
                    className="map-connector"
                    aria-hidden="true"
                    style={{
                      gridRow: next.row === row ? row * 2 + 1 : row * 2 + 2,
                      gridColumn:
                        next.row === row
                          ? Math.min(col, next.col) * 2 + 2
                          : col * 2 + 1,
                    }}
                  >
                    {next.row !== row ? "↓" : next.col > col ? "→" : "←"}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {!steps.length && (
        <p className="notice">
          Дополнительных рекомендаций для выбранных вакансий нет. Можно изменить
          слой или параметры среза.
        </p>
      )}
      <p className="small roadmap-explanation">
        Наведите на навык или перейдите к нему клавиатурой, чтобы увидеть вклад,
        прирост охвата и вакансии-основания. На телефоне нажмите на узел.
      </p>
    </section>
  );
}
