import React, { useState } from "react";
import { Modal } from "./components/UI";
import { useAuth } from "./components/AuthProvider";

export default function AccountSettings({ email, onDelete }) {
  const { request, clearSession } = useAuth();
  const [address, setAddress] = useState(email || ""),
    [emailMessage, setEmailMessage] = useState(""),
    [passwordMessage, setPasswordMessage] = useState("");
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [deleteError, setDeleteError] = useState("");
  async function changeEmail(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const currentPassword = new FormData(form).get("currentPassword");
    setBusy(true);
    setEmailMessage("");
    try {
      await request(
        "/change-email",
        { newEmail: address.trim(), currentPassword },
        { authenticated: true },
      );
      form.querySelector("[type=password]").value = "";
      setEmailMessage(
        "Если адрес доступен, письмо отправлено на новую почту. Подтвердите её по ссылке.",
      );
    } catch (error) {
      setEmailMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    if (data.get("newPassword") !== data.get("repeatPassword")) {
      setPasswordMessage("Новые пароли не совпадают.");
      return;
    }
    setBusy(true);
    setPasswordMessage("");
    try {
      await request(
        "/change-password",
        {
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
        },
        { authenticated: true },
      );
      form.reset();
      clearSession();
      location.hash = "/login";
    } catch (error) {
      setPasswordMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount(event) {
    event.preventDefault();
    const currentPassword = new FormData(event.currentTarget).get(
      "currentPassword",
    );
    setBusy(true);
    setDeleteError("");
    try {
      await request(
        "/account",
        { currentPassword },
        { method: "DELETE", authenticated: true },
      );
      onDelete();
      clearSession();
      location.hash = "/login";
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel account-panel">
        <span className="eyebrow">Учётная запись</span>
        <h3>Данные и доступ</h3>
        <p className="small muted">
          Смена почты требует подтверждения нового адреса. После смены пароля
          нужно войти заново на всех устройствах.
        </p>
        <form onSubmit={changeEmail}>
          <label>
            Электронная почта
            <input
              name="accountEmail"
              type="email"
              autoComplete="email"
              required
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setEmailMessage("");
              }}
            />
          </label>
          <label>
            Пароль для смены почты
            <input
              type="password"
              name="currentPassword"
              required
              maxLength={128}
              autoComplete="current-password"
            />
          </label>
          <button className="button full" disabled={busy}>
            Подтвердить новую почту
          </button>
          {emailMessage && (
            <p role="status" className="notice">
              {emailMessage}
            </p>
          )}
        </form>
        <details className="password-settings">
          <summary>Изменить пароль</summary>
          <form onSubmit={changePassword}>
            <label>
              Текущий пароль
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <label>
              Новый пароль
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <label>
              Повторите новый пароль
              <input
                name="repeatPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <p className="small">От 12 до 128 символов.</p>
            <button className="button full" disabled={busy}>
              Сменить пароль
            </button>
            {passwordMessage && (
              <p role="status" className="notice">
                {passwordMessage}
              </p>
            )}
          </form>
        </details>
      </section>
      <section className="panel reset-panel">
        <h3>Удаление учётной записи</h3>
        <p className="small muted">
          Учётная запись и её сессии будут удалены. Персональные настройки на
          этом устройстве также очистятся.
        </p>
        <button
          type="button"
          className="button secondary danger-text"
          onClick={() => setConfirm(true)}
        >
          Удалить учётную запись
        </button>
      </section>
      {confirm && (
        <Modal
          title="Удалить учётную запись?"
          close={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p>
            Это действие нельзя отменить. Подтвердите удаление текущим паролем.
          </p>
          <form onSubmit={deleteAccount}>
            <label>
              Пароль для удаления
              <input
                type="password"
                name="currentPassword"
                required
                maxLength={128}
                autoComplete="current-password"
              />
            </label>
            <div className="actions">
              <button className="button danger" disabled={busy}>
                Да, удалить
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Отмена
              </button>
            </div>
            {deleteError && (
              <p role="alert" className="notice">
                {deleteError}
              </p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
