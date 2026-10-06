import React, { useEffect, useRef, useState } from 'react';

function DeleteDialog({ onDelete, close }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} className="skill-dialog" aria-labelledby="delete-title" onCancel={close}>
    <h2 id="delete-title">Удалить учётную запись?</h2>
    <p>В прототипе будут удалены email, навыки и фильтры, сохранённые в этом браузере. Это действие нельзя отменить.</p>
    <div className="actions">
      <button type="button" className="button danger" onClick={onDelete}>Да, удалить</button>
      <button type="button" className="text-link" onClick={close}>Отмена</button>
    </div>
  </dialog>;
}

export default function AccountSettings({ email, saveEmail, onDelete }) {
  const [address, setAddress] = useState(email || '');
  const [emailMessage, setEmailMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  function changeEmail(event) {
    event.preventDefault();
    saveEmail(address.trim());
    setEmailMessage('Email сохранён в локальном профиле.');
  }
  function changePassword(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('newPassword') !== data.get('repeatPassword')) {
      setPasswordMessage('Новые пароли не совпадают.');
      return;
    }
    event.currentTarget.reset();
    setPasswordMessage('Форма проверена. Смена пароля станет доступна после подключения сервера.');
  }
  return <>
    <section className="panel account-panel">
      <span className="eyebrow">Учётная запись</span>
      <h3>Данные и доступ</h3>
      <p className="small muted">Прототип: email сохраняется в браузере. Пароли не сохраняются и не отправляются.</p>
      <form onSubmit={changeEmail}>
        <label>Электронная почта<input name="accountEmail" type="email" autoComplete="email" required value={address} onChange={event => { setAddress(event.target.value); setEmailMessage(''); }} placeholder="you@example.ru" /></label>
        <button className="button full">Сохранить email</button>
        {emailMessage && <p role="status" className="notice">{emailMessage}</p>}
      </form>
      <details className="password-settings">
        <summary>Изменить пароль</summary>
        <form onSubmit={changePassword}>
          <label>Текущий пароль<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
          <label>Новый пароль<input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label>Повторите новый пароль<input name="repeatPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          <button className="button full">Сменить пароль</button>
          {passwordMessage && <p role="status" className="notice">{passwordMessage}</p>}
        </form>
      </details>
    </section>
    <section className="panel reset-panel">
      <h3>Удаление учётной записи</h3>
      <p className="small muted">Удаление требует подтверждения. В прототипе удаляются только данные этого браузера.</p>
      <button type="button" className="text-link danger-text" onClick={() => setConfirm(true)}>Удалить учётную запись →</button>
    </section>
    {confirm && <DeleteDialog onDelete={onDelete} close={() => setConfirm(false)} />}
  </>;
}
