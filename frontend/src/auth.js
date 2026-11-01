// Access tokens only live in memory. The browser manages the HttpOnly refresh cookie.
let token = null;
let expiresAt = 0;
let refreshPromise = null;
let listener = () => {};
export function onSessionChange(callback) {
  listener = callback;
  return () => {
    listener = () => {};
  };
}
export function clearSession() {
  token = null;
  expiresAt = 0;
  listener(null);
}
export const sessionExpiresAt = () => expiresAt;
const sessionLock = (action) =>
  navigator.locks
    ? navigator.locks.request("skill-day-auth-refresh", action)
    : action();
async function responseBody(response) {
  if (response.status === 204 || response.status === 202) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}
export async function request(
  path,
  body,
  { method = "POST", authenticated = false, retry = true } = {},
) {
  const headers = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let response;
  try {
    response = await fetch(`/api/auth${path}`, {
      method,
      headers,
      credentials: "same-origin",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("Сервис авторизации недоступен. Повторите попытку позже.");
  }
  if (response.status === 401 && authenticated && retry) {
    try {
      await refresh();
    } catch {
      clearSession();
      throw new Error("Сессия завершена. Войдите снова.");
    }
    return request(path, body, { method, authenticated, retry: false });
  }
  const data = await responseBody(response);
  if (!response.ok) {
    if (response.status === 401 && authenticated) clearSession();
    const error = new Error(
      data?.title ||
        (response.status === 429
          ? "Слишком много запросов. Повторите через минуту."
          : "Не удалось выполнить запрос. Повторите попытку."),
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
function accept(session) {
  token = session.accessToken;
  expiresAt = Date.now() + session.expiresIn * 1000;
  listener(session.user);
  return session.user;
}
export function refresh() {
  if (!refreshPromise) {
    const rotate = () => request("/refresh").then(accept);
    // Serialise rotation across browser tabs so an old cookie is not replayed.
    refreshPromise = sessionLock(rotate).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
export async function login(email, password) {
  await refreshPromise?.catch(() => {});
  return sessionLock(async () =>
    accept(await request("/login", { email, password })),
  );
}
export async function logout() {
  await sessionLock(async () => {
    await request("/logout");
    clearSession();
  });
}
