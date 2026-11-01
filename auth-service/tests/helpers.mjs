import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export const base = process.env.AUTH_TEST_ORIGIN || "http://127.0.0.1:8080";
export const inbox = process.env.MAILPIT_URL || "http://127.0.0.1:8025";
export const password = "A long test passphrase 24680";
export class Client {
  cookie = "";
  token = "";
  async call(
    path,
    body,
    {
      method = "POST",
      auth = false,
      origin = base,
      expected,
      cookie = this.cookie,
      token = this.token,
    } = {},
  ) {
    const response = await fetch(`${base}/api/auth${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(origin ? { Origin: origin } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (expected !== undefined)
      assert.equal(
        response.status,
        expected,
        `${method} ${path}: ${response.status}, ${json?.title || response.statusText}`,
      );
    if (json?.accessToken) this.token = json.accessToken;
    return { status: response.status, json, headers: response.headers };
  }
  login(email, value = password) {
    return this.call("/login", { email, password: value }, { expected: 200 });
  }
}
export async function mailLink(email, route) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const search = await fetch(
      `${inbox}/api/v1/search?query=${encodeURIComponent("to:" + email)}`,
    ).then((r) => r.json());
    for (const item of search.messages || []) {
      const message = await fetch(`${inbox}/api/v1/message/${item.ID}`).then(
        (r) => r.json(),
      );
      const link = (message.Text || "")
        .match(/https?:\/\/[^\s<>]+/g)
        ?.find((value) => value.includes(`/#/${route}?`));
      if (link)
        return Object.fromEntries(
          new URLSearchParams(new URL(link).hash.split("?")[1]),
        );
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No ${route} email delivered to the test mailbox`);
}
export async function account({ confirmed = true, loggedIn = true } = {}) {
  const email = `auth-test-${randomUUID()}@example.test`,
    client = new Client();
  await client.call("/register", { email, password }, { expected: 202 });
  const confirmation = await mailLink(email, "confirm-email");
  if (confirmed)
    await client.call("/confirm-email", confirmation, { expected: 204 });
  if (loggedIn && confirmed) await client.login(email);
  return { email, client, confirmation };
}
