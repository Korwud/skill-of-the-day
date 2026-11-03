import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "./helpers.mjs";
// Run separately after a service restart to get an isolated rate-limit window.
test("Mail endpoints eventually return 429 with Retry-After", async () => {
  const client = new Client();
  let limited;
  for (let i = 0; i < 22; i++) {
    const response = await client.call("/forgot-password", {
      email: "auth-test-nonexistent@example.test",
    });
    if (response.status === 429) {
      limited = response;
      break;
    }
    assert.equal(response.status, 202);
  }
  assert.ok(limited);
  assert.equal(limited.headers.get("retry-after"), "60");
});
