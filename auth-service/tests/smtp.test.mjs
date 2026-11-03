import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Build the service first. Invalid settings must fail before any network or DB access.
const project = fileURLToPath(new URL("../src/AuthService/", import.meta.url));
const assembly = fileURLToPath(
  new URL(
    "../src/AuthService/bin/Debug/net10.0/AuthService.dll",
    import.meta.url,
  ),
);
const password = "synthetic-smtp-secret-for-tests";
const cases = [
  ["external plaintext", { Smtp__Security: "None" }, "SMTP_SECURITY"],
  [
    "optional external TLS",
    { Smtp__Security: "StartTlsWhenAvailable" },
    "SMTP_SECURITY",
  ],
  ["automatic external TLS", { Smtp__Security: "Auto" }, "SMTP_SECURITY"],
  ["missing account", { Smtp__Username: "" }, "SMTP_USERNAME"],
  ["missing password", { Smtp__Password: "" }, "SMTP_PASSWORD"],
  ["test sender", { Smtp__From: "sender@example.test" }, "SMTP_FROM"],
  ["missing sender", { Smtp__From: "" }, "SMTP_FROM"],
  ["invalid server", { Smtp__Host: "not a hostname" }, "Smtp:Host"],
  ["invalid port", { Smtp__Port: "0" }, "Smtp:Port"],
  [
    "production plaintext",
    {
      ASPNETCORE_ENVIRONMENT: "Production",
      Smtp__Host: "mailpit",
      Smtp__Security: "None",
    },
    "SMTP_SECURITY",
  ],
];

for (const [name, settings, field] of cases) {
  test(`SMTP rejects ${name} without exposing credentials`, () => {
    const result = spawnSync("dotnet", [assembly, "--check-smtp"], {
      cwd: project,
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: "Development",
        Smtp__Host: "smtp.gmail.com",
        Smtp__Port: "587",
        Smtp__Security: "StartTls",
        Smtp__Username: "sender@example.com",
        Smtp__Password: password,
        Smtp__From: "sender@example.com",
        ...settings,
      },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stderr.includes(field), result.stderr);
    assert.ok(!`${result.stdout}${result.stderr}`.includes(password));
  });
}
