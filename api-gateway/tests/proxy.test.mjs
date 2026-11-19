import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const project = fileURLToPath(new URL("../src/ApiGateway/", import.meta.url));
let backend, gateway, base, port, logs = "", lastRequest;

async function listen(server, selectedPort = 0) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(selectedPort, "127.0.0.1", resolve);
  });
  return server.address().port;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

before(async () => {
  backend = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    lastRequest = { method: request.method, url: request.url, headers: request.headers, body };
    if (request.url === "/health/ready") {
      response.writeHead(200, { "Content-Type": "application/json" });
      return response.end('{"status":"ready"}');
    }
    if (request.url === "/auth/slow") return;
    if (request.url === "/auth/refresh") {
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": "skill-day.refresh=rotated; Path=/api/auth; HttpOnly; SameSite=Strict",
      });
      return response.end('{"accessToken":"upstream-token"}');
    }
    if (request.url === "/auth/me") {
      response.writeHead(401, { "Content-Type": "application/problem+json", "WWW-Authenticate": "Bearer" });
      return response.end('{"status":401,"title":"Upstream authentication required"}');
    }
    response.writeHead(request.method === "DELETE" ? 204 : 200, { "Content-Type": "application/json" });
    response.end(request.method === "DELETE" ? undefined : JSON.stringify(lastRequest));
  });
  port = await listen(backend);
  const reservation = createServer();
  const gatewayPort = await listen(reservation);
  await close(reservation);
  base = `http://127.0.0.1:${gatewayPort}`;
  gateway = spawn("dotnet", ["bin/Release/net10.0/ApiGateway.dll", "--urls", base], {
    cwd: project,
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: "Development",
      ReverseProxy__Clusters__auth__Destinations__primary__Address: `http://127.0.0.1:${port}/`,
      ReverseProxy__Clusters__auth__HttpRequest__ActivityTimeout: "00:00:01",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  gateway.stdout.on("data", chunk => { logs += chunk; });
  gateway.stderr.on("data", chunk => { logs += chunk; });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (gateway.exitCode !== null) throw new Error("Gateway failed to start: " + logs);
    try {
      if ((await fetch(base + "/health/live")).ok) return;
    } catch { /* Wait for Kestrel to bind the port. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Gateway startup timed out: " + logs);
});

after(async () => {
  if (gateway && gateway.exitCode === null) {
    const stopped = new Promise(resolve => gateway.once("exit", resolve));
    gateway.kill("SIGTERM");
    const timer = setTimeout(() => gateway.kill("SIGKILL"), 5000);
    await stopped;
    clearTimeout(timer);
  }
  if (backend?.listening) await close(backend);
});

test("Gateway preserves the method, query, JSON body, Bearer, cookie and Origin while removing /api once", async () => {
  const response = await fetch(base + "/api/auth/confirm-email?marker=example%2Bvalue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer transport-test",
      Cookie: "skill-day.refresh=transport-cookie",
      Origin: "http://127.0.0.1:8080",
      Forwarded: "for=203.0.113.77;proto=https",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify({ code: "query-and-body-secret", userId: "sample" }),
  });
  assert.equal(response.status, 200);
  const received = await response.json();
  assert.equal(received.url, "/auth/confirm-email?marker=example%2Bvalue");
  assert.equal(received.method, "POST");
  assert.deepEqual(JSON.parse(received.body), { code: "query-and-body-secret", userId: "sample" });
  assert.equal(received.headers.authorization, "Bearer transport-test");
  assert.equal(received.headers.cookie, "skill-day.refresh=transport-cookie");
  assert.equal(received.headers.origin, "http://127.0.0.1:8080");
  assert.equal(received.headers.forwarded, undefined);
  assert.match(response.headers.get("x-request-id"), /^[a-f0-9]{32}$/);
  assert.equal(received.headers["x-request-id"], response.headers.get("x-request-id"));
  assert.equal(response.headers.get("x-trace-id"), response.headers.get("x-request-id"));
  assert.match(received.headers.traceparent, new RegExp(`^00-${response.headers.get("x-trace-id")}-[a-f0-9]{16}-[a-f0-9]{2}$`));
  assert.equal(parseInt(received.headers.traceparent.split("-")[3], 16) & 1, 1);
});

test("Refresh preserves Set-Cookie attributes and response cache policy", async () => {
  const response = await fetch(base + "/api/auth/refresh", { method: "POST", headers: { Origin: base } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).accessToken, "upstream-token");
  assert.equal(response.headers.get("set-cookie"), "skill-day.refresh=rotated; Path=/api/auth; HttpOnly; SameSite=Strict");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("Service status codes, authentication challenges and DELETE responses survive proxying", async () => {
  const denied = await fetch(base + "/api/auth/me");
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("www-authenticate"), "Bearer");
  assert.equal((await denied.json()).title, "Upstream authentication required");
  const deleted = await fetch(base + "/api/auth/account", { method: "DELETE", body: '{"currentPassword":"test"}' });
  assert.equal(deleted.status, 204);
  assert.equal(lastRequest.method, "DELETE");
  assert.equal(await deleted.text(), "");
});

test("Unknown API routes return JSON 404 and cannot reach internal Auth health endpoints", async () => {
  for (const path of ["/api/profile", "/auth/me", "/api/health/not-exposed", "/api/other/openapi.json"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get("content-type"), /application\/problem\+json/);
    const body = await response.json();
    assert.equal(body.status, 404);
    assert.equal(body.requestId, response.headers.get("x-request-id"));
  }
});

test("JWKS and OpenAPI paths are forwarded without being consumed as static files", async () => {
  for (const suffix of ["/.well-known/jwks.json", "/openapi/v1.json"]) {
    const response = await fetch(base + "/api/auth" + suffix);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).url, "/auth" + suffix);
  }
});

test("An unresponsive service returns JSON 504 instead of an HTML error page", async () => {
  const response = await fetch(base + "/api/auth/slow");
  assert.equal(response.status, 504);
  assert.match(response.headers.get("content-type"), /application\/problem\+json/);
  assert.equal((await response.json()).requestId, response.headers.get("x-request-id"));
});

test("Backend failure gives JSON 502, failed readiness and an independent live endpoint", async () => {
  assert.equal((await fetch(base + "/api/health/ready")).status, 200);
  await close(backend);
  const response = await fetch(base + "/api/auth/me");
  assert.equal(response.status, 502);
  assert.match(response.headers.get("content-type"), /application\/problem\+json/);
  const problem = await response.json();
  assert.equal(problem.status, 502);
  assert.equal(problem.requestId, response.headers.get("x-request-id"));
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await fetch(base + "/health/ready")).status, 503);
  assert.equal((await fetch(base + "/health/live")).status, 200);
  assert.ok(!logs.includes("query-and-body-secret"));
  assert.ok(!logs.includes("transport-cookie"));
  assert.ok(!logs.includes("Bearer transport-test"));
  assert.ok(!logs.includes("marker=example"));
});
