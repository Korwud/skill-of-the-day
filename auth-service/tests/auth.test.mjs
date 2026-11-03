import test from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, verify, randomUUID } from "node:crypto";
import { Client, account, mailLink, password, base } from "./helpers.mjs";

// Run against local Compose. These scenarios exercise the actual PostgreSQL, SMTP and HTTP stack.
test("Registration requires email confirmation and rejects an invalid password", async () => {
  const { email, client, confirmation } = await account({ confirmed: false });
  await client.call("/login", { email, password }, { expected: 401 });
  await client.call(
    "/confirm-email",
    { ...confirmation, code: "bad" },
    { expected: 400 },
  );
  await client.call("/confirm-email", confirmation, { expected: 204 });
  const login = await client.login(email);
  assert.equal(login.json.user.email, email);
  assert.deepEqual(login.json.user.roles, ["User"]);
  await client.call(
    "/register",
    { email: `auth-test-${randomUUID()}@example.test`, password: "short" },
    { expected: 400 },
  );
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("JWT has a verifiable RS256 signature, bounded lifetime and no password or email", async () => {
  const { client } = await account();
  const result = await client.call("/.well-known/jwks.json", undefined, {
    method: "GET",
    expected: 200,
  });
  const [header, body, signature] = client.token.split(".");
  const metadata = JSON.parse(Buffer.from(header, "base64url"));
  const claims = JSON.parse(Buffer.from(body, "base64url"));
  assert.equal(metadata.alg, "RS256");
  const jwk = result.json.keys.find((key) => key.kid === metadata.kid);
  assert.ok(jwk && !jwk.d);
  assert.ok(
    verify(
      "RSA-SHA256",
      Buffer.from(`${header}.${body}`),
      createPublicKey({ key: jwk, format: "jwk" }),
      Buffer.from(signature, "base64url"),
    ),
  );
  assert.equal(claims.iss, "skill-day-auth");
  assert.equal(claims.aud, "skill-day-api");
  assert.ok(claims.exp - claims.iat <= 600);
  assert.ok(!claims.password && !claims.email);
  await client.call("/me", undefined, {
    method: "GET",
    auth: true,
    expected: 200,
  });
  await client.call("/me", undefined, {
    method: "GET",
    auth: true,
    token: client.token.slice(0, -5) + "xxxxx",
    expected: 401,
  });
  await client.call("/admin/check", undefined, {
    method: "GET",
    auth: true,
    expected: 403,
  });
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("Refresh rotates an HttpOnly SameSite cookie; replay invalidates the session family", async () => {
  const { email, client } = await account();
  const oldCookie = client.cookie;
  const result = await client.call("/refresh", undefined, { expected: 200 });
  assert.notEqual(client.cookie, oldCookie);
  assert.match(result.headers.get("set-cookie"), /httponly/i);
  assert.match(result.headers.get("set-cookie"), /samesite=strict/i);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.ok(!("refreshToken" in result.json));
  const attacker = new Client();
  await attacker.call("/refresh", undefined, {
    cookie: oldCookie,
    expected: 401,
  });
  await client.call("/me", undefined, {
    method: "GET",
    auth: true,
    expected: 401,
  });
  await client.login(email);
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("Logout immediately revokes the access token and logout-all revokes other devices", async () => {
  const { email, client } = await account();
  const other = new Client();
  await other.login(email);
  await client.call("/logout", undefined, { expected: 204 });
  await client.call("/me", undefined, {
    method: "GET",
    auth: true,
    expected: 401,
  });
  await other.call("/me", undefined, {
    method: "GET",
    auth: true,
    expected: 200,
  });
  await client.login(email);
  await client.call("/logout-all", undefined, { auth: true, expected: 204 });
  await other.call("/refresh", undefined, { expected: 401 });
  await client.login(email);
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("Password reset is single-use, needs a valid token and revokes existing sessions", async () => {
  const { email, client } = await account();
  await client.call("/forgot-password", { email }, { expected: 202 });
  const link = await mailLink(email, "reset-password"),
    newPassword = "My changed passphrase 13579";
  await client.call(
    "/reset-password",
    { ...link, code: "invalid", newPassword },
    { expected: 400 },
  );
  await client.call(
    "/reset-password",
    { ...link, newPassword },
    { expected: 204 },
  );
  await client.call("/me", undefined, {
    method: "GET",
    auth: true,
    expected: 401,
  });
  await client.call(
    "/reset-password",
    { ...link, newPassword },
    { expected: 400 },
  );
  await client.call("/login", { email, password }, { expected: 401 });
  await client.login(email, newPassword);
  await client.call(
    "/account",
    { currentPassword: newPassword },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("Changing password checks the old password and invalidates every session", async () => {
  const { email, client } = await account(),
    other = new Client();
  await other.login(email);
  const newPassword = "A different passphrase 97531";
  await client.call(
    "/change-password",
    { currentPassword: "wrong", newPassword },
    { auth: true, expected: 400 },
  );
  await client.call(
    "/change-password",
    { currentPassword: password, newPassword },
    { auth: true, expected: 204 },
  );
  await other.call("/refresh", undefined, { expected: 401 });
  await client.login(email, newPassword);
  await client.call(
    "/account",
    { currentPassword: newPassword },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("Email changes only after confirmation at the new address, then old sessions expire", async () => {
  const { email, client } = await account(),
    newEmail = `auth-test-${randomUUID()}@example.test`;
  await client.call(
    "/change-email",
    { newEmail, currentPassword: "wrong" },
    { auth: true, expected: 400 },
  );
  await client.call(
    "/change-email",
    { newEmail, currentPassword: password },
    { auth: true, expected: 202 },
  );
  assert.equal(
    (
      await client.call("/me", undefined, {
        method: "GET",
        auth: true,
        expected: 200,
      })
    ).json.email,
    email,
  );
  const link = await mailLink(newEmail, "confirm-email-change");
  await client.call("/confirm-email-change", link, { expected: 204 });
  await client.call("/me", undefined, {
    method: "GET",
    auth: true,
    expected: 401,
  });
  await client.call("/login", { email, password }, { expected: 401 });
  await client.login(newEmail);
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("Cookie endpoints reject cross-origin and missing-origin requests", async () => {
  const { client } = await account();
  await client.call("/refresh", undefined, {
    origin: "https://attacker.test",
    expected: 403,
  });
  await client.call("/refresh", undefined, { origin: "", expected: 403 });
  await client.call("/logout", undefined, {
    origin: "https://attacker.test",
    expected: 403,
  });
  await client.call("/me", undefined, {
    method: "GET",
    auth: true,
    expected: 200,
  });
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("Registration and recovery responses do not reveal account existence", async () => {
  const { email, client } = await account();
  const missingEmail = `auth-test-${randomUUID()}@example.test`;
  assert.deepEqual(
    (await client.call("/register", { email, password }, { expected: 202 }))
      .json,
    null,
  );
  const known = await client.call(
    "/forgot-password",
    { email },
    { expected: 202 },
  );
  const unknown = await client.call(
    "/forgot-password",
    { email: missingEmail },
    { expected: 202 },
  );
  assert.deepEqual(known.json, unknown.json);
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
});

test("Account deletion requires password and removes access and refresh sessions", async () => {
  const { email, client } = await account();
  await client.call(
    "/account",
    { currentPassword: "wrong" },
    { method: "DELETE", auth: true, expected: 400 },
  );
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
  await client.call("/me", undefined, {
    method: "GET",
    auth: true,
    expected: 401,
  });
  await client.call("/refresh", undefined, { expected: 401 });
  await client.call("/login", { email, password }, { expected: 401 });
});

test("Five failed logins lock an account even when the next password is correct", async () => {
  const { email, client } = await account();
  for (let i = 0; i < 5; i++)
    await client.call(
      "/login",
      { email, password: "wrong password" },
      { expected: 401 },
    );
  await client.call("/login", { email, password }, { expected: 401 });
  // Existing sessions remain usable; a failed-login attack must not eject the owner.
  await client.call(
    "/account",
    { currentPassword: password },
    { method: "DELETE", auth: true, expected: 204 },
  );
});
