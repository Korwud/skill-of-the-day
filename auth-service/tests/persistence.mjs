import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { account, password } from "./helpers.mjs";
const { client } = await account();
const before = await client.call("/.well-known/jwks.json", undefined, {
  method: "GET",
  expected: 200,
});
await promisify(execFile)("docker", ["compose", "restart", "auth-service"]);
let ready = false;
for (let i = 0; i < 60; i++) {
  try {
    const response = await client.call("/me", undefined, {
      method: "GET",
      auth: true,
    });
    if (response.status === 200) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
assert.ok(ready, "Existing access token must survive a container restart");
const after = await client.call("/.well-known/jwks.json", undefined, {
  method: "GET",
  expected: 200,
});
assert.deepEqual(after.json, before.json);
await client.call("/refresh", undefined, { expected: 200 });
await client.call(
  "/account",
  { currentPassword: password },
  { method: "DELETE", auth: true, expected: 204 },
);
console.log(
  "PASS: users, sessions, signing keys and refresh tokens survive a restart",
);
