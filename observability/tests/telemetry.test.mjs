import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client, account, password } from "../../auth-service/tests/helpers.mjs";

const dashboard = process.env.ASPIRE_TEST_ORIGIN || "http://127.0.0.1:18888";
const value = (attributes, key) => attributes?.find(item => item.key === key)?.value?.stringValue;
const records = (json, kind) => (json.data?.[kind === "logs" ? "resourceLogs" : "resourceSpans"] || [])
  .flatMap(resource => (resource[kind === "logs" ? "scopeLogs" : "scopeSpans"] || [])
    .flatMap(scope => (scope[kind === "logs" ? "logRecords" : "spans"] || [])
      .map(record => ({ ...record, service: value(resource.resource?.attributes, "service.name") }))));

async function telemetry(traceId, status) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const responses = await Promise.all([
      fetch(`${dashboard}/api/telemetry/traces/${traceId}`),
      fetch(`${dashboard}/api/telemetry/logs?traceId=${traceId}`),
    ]);
    if (responses.every(response => response.ok)) {
      const [trace, journal] = await Promise.all(responses.map(response => response.json()));
      const spans = records(trace, "spans"), logs = records(journal, "logs");
      const requestLogs = logs.filter(log => value(log.attributes, "StatusCode") === String(status));
      if (["api-gateway", "auth-service"].every(service =>
        spans.some(span => span.service === service) && requestLogs.some(log => log.service === service)))
        return { trace, journal, spans, logs, requestLogs };
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.fail(`No correlated Gateway/Auth telemetry for trace ${traceId} within 15 seconds`);
}

test("Aspire correlates successful and rejected logins across Gateway/Auth without request secrets", async () => {
  const { email, client } = await account();
  try {
    const successful = await client.login(email);
    const rejected = await new Client().call("/login", { email, password: "Deliberately wrong password 42" }, { expected: 401 });
    const queryMarker = `private-query-${randomUUID()}`;
    const me = await client.call(`/me?code=${queryMarker}`, undefined, { method: "GET", auth: true, expected: 200 });
    for (const [response, status] of [[successful, 200], [rejected, 401], [me, 200]]) {
      const traceId = response.headers.get("x-trace-id");
      assert.match(traceId, /^[a-f0-9]{32}$/);
      assert.equal(response.headers.get("x-request-id"), traceId);
      const { trace, journal, spans, logs, requestLogs } = await telemetry(traceId, status);
      assert.ok(spans.every(span => span.traceId === traceId));
      assert.ok(logs.every(log => log.traceId === traceId));
      const root = spans.find(span => span.service === "api-gateway" && !span.parentSpanId);
      const auth = spans.find(span => span.service === "auth-service" && span.kind === 2);
      assert.ok(root && auth, "Trace contains Gateway and Auth server spans");
      const ancestors = new Set();
      for (let span = auth; span; span = spans.find(candidate => candidate.spanId === span.parentSpanId)) {
        assert.ok(!ancestors.has(span.spanId), "Trace must be acyclic");
        ancestors.add(span.spanId);
      }
      assert.ok(ancestors.has(root.spanId), "Auth span is a descendant of the Gateway span");
      assert.ok(requestLogs.every(log => value(log.attributes, "RequestId") === traceId));
      if (status === 401) assert.ok(requestLogs.every(log => log.severityText === "Warning"));
      const serialized = JSON.stringify({ trace, journal });
      for (const secret of [password, "Deliberately wrong password 42", client.token, client.cookie.split("=").slice(1).join("="), queryMarker]) {
        assert.ok(secret.length > 0);
        assert.ok(!serialized.includes(secret), "Telemetry must omit passwords, access/refresh tokens and query values");
      }
      assert.ok(spans.every(span => !value(span.attributes, "url.query")));
      if (response === successful) console.log(`Login trace: ${dashboard}/traces/detail/${traceId}`);
    }
    const resources = await fetch(`${dashboard}/api/telemetry/resources`).then(response => response.json());
    assert.ok(["api-gateway", "auth-service"].every(name => resources.some(resource =>
      resource.name === name && resource.hasLogs && resource.hasTraces && resource.hasMetrics)));
  } finally {
    await client.call("/account", { currentPassword: password }, { method: "DELETE", auth: true, expected: 204 });
  }
});
