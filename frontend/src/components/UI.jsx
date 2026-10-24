import React, { useEffect, useRef } from "react";
import { requirementTypes } from "../data";

export const Link = ({ to, children, className = "", ...props }) => (
  <a href={`#/${to}`} className={className} {...props}>
    {children}
  </a>
);
export const TypeTag = ({ type = "required" }) => (
  <span className={`tag tag-${type}`}>{requirementTypes[type]}</span>
);
export function RequirementLegend() {
  return (
    <section
      className="panel requirement-legend"
      aria-label="Классификация требований вакансии"
    >
      <h2>Классификация требований вакансии</h2>
      <div className="legend-tags">
        {Object.keys(requirementTypes).map((type) => (
          <TypeTag key={type} type={type} />
        ))}
      </div>
    </section>
  );
}
export function Modal({ title, close, children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      onCancel={close}
      onClick={(event) => {
        if (event.target !== ref.current) return;
        const bounds = ref.current.getBoundingClientRect();
        if (
          event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom
        ) close();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="button secondary compact" onClick={close} autoFocus>
          Закрыть
        </button>
      </div>
      {children}
    </dialog>
  );
}
export const Notice = ({ children, role = "status", className = "" }) => (
  <div role={role} className={`notice ${className}`}>
    {children}
  </div>
);
export function RouteExample() {
  return (
    <section
      className="route-example panel"
      aria-label="Пример графического roadmap"
    >
      <h2>От основ — к возможностям</h2>
      {[
        ["SQL", "35%"],
        ["REST API", "60%"],
        ["Git", "80%"],
      ].map(([skill, value], index) => (
        <React.Fragment key={skill}>
          {index > 0 && (
            <div className="flow-arrow" aria-hidden="true">
              ↓
            </div>
          )}
          <div className="example-node">
            <strong>{skill}</strong>
            <span>Охват {value}</span>
          </div>
        </React.Fragment>
      ))}
      <p className="small">
        Пример: SQL → REST API → Git. Все показатели демонстрационные.
      </p>
    </section>
  );
}
