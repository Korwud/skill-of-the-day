import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  basisJobs,
  coverage,
  formatNumber,
  percent,
  skillContext,
  vacancyText,
} from "../data";
import { TypeTag } from "./UI";

export default function SkillNode({
  skill,
  step,
  jobs,
  profile,
  open,
  disabled = false,
}) {
  const [visible, setVisible] = useState(false),
    [position, setPosition] = useState(null),
    [touchHintOpen, setTouchHintOpen] = useState(false);
  const button = useRef(null),
    hint = useRef(null),
    timer = useRef(null),
    touch = useRef(false);
  const id = useId();
  const info = useMemo(() => {
    const context = skillContext(profile.skills, step, skill);
    const before = coverage(jobs, context),
      after = coverage(jobs, [...context, skill]);
    return {
      before,
      after,
      gain: basisJobs(jobs, context, skill).length,
      points: jobs.length ? ((after - before) / jobs.length) * 100 : 0,
    };
  }, [jobs, profile.skills, step, skill]);
  function hide() {
    setVisible(false);
    setTouchHintOpen(false);
  }
  function hideSoon() {
    clearTimeout(timer.current);
    timer.current = setTimeout(hide, 120);
  }
  function show() {
    if (!disabled) {
      clearTimeout(timer.current);
      setVisible(true);
    }
  }
  function details() {
    hide();
    open(skill, step);
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (disabled) hide();
  }, [disabled]);
  useLayoutEffect(() => {
    if (!visible) return;
    function place() {
      if (!button.current || !hint.current) return;
      const r = button.current.getBoundingClientRect(),
        h = hint.current.getBoundingClientRect();
      const top =
        r.bottom + h.height + 8 <= innerHeight
          ? r.bottom + 8
          : r.top - h.height - 8;
      setPosition({
        left: Math.max(16, Math.min(r.left, innerWidth - h.width - 16)),
        top: Math.max(8, top),
      });
    }
    function outside(event) {
      if (
        !button.current?.contains(event.target) &&
        !hint.current?.contains(event.target)
      )
        hide();
    }
    function escape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        hide();
      }
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [visible, info]);
  return (
    <>
      <button
        ref={button}
        type="button"
        className="skill-node"
        disabled={disabled}
        aria-describedby={visible ? id : undefined}
        onPointerDown={(event) => {
          touch.current = event.pointerType === "touch";
          if (!touch.current) setTouchHintOpen(false);
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") hideSoon();
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) show();
        }}
        onBlur={hide}
        onKeyDown={(event) => {
          touch.current = false;
          setTouchHintOpen(false);
          if (event.key === "Escape") {
            event.stopPropagation();
            hide();
          }
        }}
        onClick={() => {
          if (touch.current && (!visible || !touchHintOpen)) {
            setTouchHintOpen(true);
            show();
          } else details();
        }}
      >
        {skill}
      </button>
      {visible &&
        createPortal(
          <div
            ref={hint}
            id={id}
            role="tooltip"
            className="skill-tooltip"
            style={position || { left: 16, top: 8, visibility: "hidden" }}
            onPointerEnter={show}
            onPointerLeave={hideSoon}
          >
            <strong className="tooltip-skill-name">{skill}</strong>
            <TypeTag />
            <p>
              Вклад навыка:{" "}
              <strong>
                +{info.gain}{" "}
                {vacancyText(info.gain).split(" ").slice(1).join(" ")}
              </strong>
            </p>
            <p>
              Прирост охвата: <strong>+{formatNumber(info.points)} п.п.</strong>
            </p>
            <p className="small">
              Процентные пункты — разница между процентами охвата:{" "}
              {percent(info.before, jobs.length)} →{" "}
              {percent(info.after, jobs.length)}.
            </p>
            <p>
              Вакансии-основания: <strong>{info.gain}</strong>
            </p>
            <p className="small muted">
              {step?.skills.length > 1 && (
                <span>
                  Учтено изучение остальных навыков шага:{" "}
                  {step.skills.filter((value) => value !== skill).join(", ")}
                  .{" "}
                </span>
              )}
              {touchHintOpen
                ? "Нажмите навык ещё раз, чтобы открыть карточку."
                : "Нажмите навык, чтобы открыть карточку. Escape — закрыть подсказку."}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
