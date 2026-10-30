import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoProfile,
  getScope,
  coverage,
  skillGain,
  buildPlan,
  layers,
  minimumDeficit,
  basicSkills,
  rawRecords,
  safeExternalUrl,
  loadProfile,
} from "../../src/data.js";

test("Coverage, individual skill contribution and cumulative roadmap are consistent", () => {
  const jobs = getScope(demoProfile);
  assert.equal(jobs.length, 120);
  assert.equal(coverage(jobs, demoProfile.skills), 24);
  assert.equal(skillGain(jobs, demoProfile.skills, "SQL"), 18);
  const plan = buildPlan(jobs, demoProfile.skills);
  assert.deepEqual(
    plan.map((step) => step.skills),
    [["Git"], ["BPMN"], ["SOAP"]],
  );
  assert.deepEqual(
    plan.map((step) => step.gain),
    [24, 16, 8],
  );
  assert.deepEqual(
    plan.map((step) => step.afterCoverage),
    [96, 112, 120],
  );
  assert.equal(skillGain(jobs, plan[0].before, "Git"), plan[0].gain);
  assert.equal(skillGain(jobs, [...plan[0].before, "Git"], "Git"), 0);
  assert.equal(coverage(jobs, basicSkills.analyst), 72);
  assert.equal(
    layers(jobs, demoProfile.skills).reduce((sum, [, count]) => sum + count, 0),
    120,
  );
  assert.equal(layers(jobs, demoProfile.skills).length, 5);
});

test("Multiple regions form a union; empty scopes have neither layers nor recommendations", () => {
  assert.equal(
    getScope({ ...demoProfile, regions: ["Удалённая работа"] }).length,
    30,
  );
  assert.equal(getScope({ ...demoProfile, regions: ["Москва"] }).length, 90);
  assert.equal(getScope({ ...demoProfile, regions: [] }).length, 120);
  const empty = getScope({ ...demoProfile, regions: ["Владивосток"] });
  assert.deepEqual(layers(empty, []), []);
  assert.deepEqual(buildPlan(empty, []), []);
  assert.equal(minimumDeficit(empty, []), null);
});

test("Joint requirements and five-skill limit handle zero individual gain", () => {
  const job = { required: ["a", "b", "c", "d", "e", "f"] };
  assert.equal(skillGain([job], [], "a"), 0);
  const plan = buildPlan([job], []);
  assert.equal(plan[0].skills.length, 5);
  assert.equal(plan[0].gain, 0);
  assert.equal(plan[0].partial, true);
  assert.equal(plan[0].minimumBefore, 6);
  assert.equal(plan[0].minimumAfter, 1);
  assert.equal(plan[1].gain, 1);
});

test("Raw terms are sorted by encounters and vacancy links only accept http(s)", () => {
  assert.deepEqual(
    rawRecords(getScope(demoProfile)).map((record) => record.count),
    [42, 32, 18, 9],
  );
  for (const url of [
    null,
    "javascript:alert(1)",
    "data:text/html,hi",
    "/relative",
  ])
    assert.equal(safeExternalUrl(url), null);
  assert.equal(
    safeExternalUrl("https://example.test/jobs/1"),
    "https://example.test/jobs/1",
  );
});

test("Saved profiles are validated and older skill names are migrated", () => {
  const original = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: () => "{invalid" };
    assert.deepEqual(loadProfile().skills, []);
    globalThis.localStorage = {
      getItem: () =>
        JSON.stringify({
          ...demoProfile,
          skills: ["Работа с требованиями", "Анализ требований", 3],
          regions: ["Москва", "invalid"],
        }),
    };
    assert.deepEqual(loadProfile().skills, ["Анализ требований"]);
    assert.deepEqual(loadProfile().regions, ["Москва"]);
  } finally {
    globalThis.localStorage = original;
  }
});
