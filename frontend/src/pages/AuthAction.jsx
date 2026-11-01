import React, { useState } from "react";
import { Link } from "../components/UI";
import { request } from "../auth";
import { useAuth } from "../components/AuthProvider";

export default function AuthAction({ mode }) {
  const { clearSession } = useAuth();
  const [message, setMessage] = useState(""),
    [pending, setPending] = useState(false),
    [done, setDone] = useState(false);
  const reset = mode === "reset-password",
    change = mode === "confirm-email-change";
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const valid =
    params.has("userId") &&
    params.has("code") &&
    (!change || params.has("newEmail"));
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (reset && form.get("password") !== form.get("repeat")) {
      setMessage("Пароли не совпадают.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const body = {
        userId: params.get("userId"),
        code: params.get("code"),
        ...(reset ? { newPassword: form.get("password") } : {}),
        ...(change ? { newEmail: params.get("newEmail") } : {}),
      };
      await request(
        reset
          ? "/reset-password"
          : change
            ? "/confirm-email-change"
            : "/confirm-email",
        body,
      );
      if (reset || change) clearSession();
      setDone(true);
      setMessage(
        reset
          ? "Пароль изменён. Войдите с новым паролем."
          : change
            ? "Новая почта подтверждена. Войдите заново."
            : "Почта подтверждена. Теперь можно войти.",
      );
      // Remove one-time action tokens from browser history after successful use.
      history.replaceState(
        null,
        "",
        location.pathname + location.search + `#/${mode}`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="container page">
      <div className="panel auth-action">
        <h1>
          {reset
            ? "Новый пароль"
            : change
              ? "Подтверждение новой почты"
              : "Подтверждение почты"}
        </h1>
        {!valid && !done ? (
          <p role="alert">Ссылка неполная. Запросите новое письмо.</p>
        ) : (
          !done && (
            <form onSubmit={submit}>
              {reset && (
                <>
                  <label>
                    Новый пароль
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    Повторите пароль
                    <input
                      type="password"
                      name="repeat"
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </label>
                  <p className="small">
                    От 12 до 128 символов. Можно использовать длинную фразу.
                  </p>
                </>
              )}
              <button className="button" disabled={pending}>
                {pending
                  ? "Выполняется…"
                  : reset
                    ? "Сохранить пароль"
                    : "Подтвердить почту"}
              </button>
            </form>
          )
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <div className="actions">
          <Link to="login" className="button secondary">
            Ко входу
          </Link>
          <Link to="reset" className="text-link">
            Запросить восстановление
          </Link>
        </div>
      </div>
    </section>
  );
}
