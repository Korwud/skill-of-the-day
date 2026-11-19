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
  basisJobs,
  filterByLayer,
  skillContext,
  countLabel,
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

test("Vacancy evidence is the marginal coverage gain in the same step context", () => {
  const jobs = getScope(demoProfile),
    plan = buildPlan(jobs, demoProfile.skills);
  const context = skillContext(demoProfile.skills, plan[0], "Git");
  const evidence = basisJobs(jobs, context, "Git");
  assert.equal(evidence.length, 24);
  assert.equal(evidence.length, skillGain(jobs, context, "Git"));
  for (const job of evidence) {
    assert.ok(!job.required.every((skill) => context.includes(skill)));
    assert.ok(
      job.required.every((skill) => context.includes(skill) || skill === "Git"),
    );
  }
  assert.deepEqual(basisJobs([], demoProfile.skills, "SQL"), []);
  assert.equal(skillGain([], demoProfile.skills, "SQL"), 0);
});

test("Selecting a deficit layer recomputes a new plan and denominator from its vacancies", () => {
  const all = getScope(demoProfile),
    selected = filterByLayer(all, demoProfile.skills, 3);
  assert.equal(selected.length, 46);
  const plan = buildPlan(selected, demoProfile.skills);
  assert.deepEqual(
    plan.map((step) => step.gain),
    [24, 14, 8],
  );
  assert.equal(plan[0].percentagePoints, (24 / 46) * 100);
  assert.equal(plan.at(-1).afterCoverage, 46);
  assert.equal(
    coverage(filterByLayer(all, demoProfile.skills, 0), demoProfile.skills),
    24,
  );
  assert.deepEqual(
    buildPlan(filterByLayer(all, demoProfile.skills, 0), demoProfile.skills),
    [],
  );
});

test("Level is a real slice filter and mention counts use a distinct label", () => {
  for (const level of ["intern", "junior", "middle", "senior"]) {
    const jobs = getScope({ ...demoProfile, level });
    assert.equal(jobs.length, 30);
    assert.ok(jobs.every((job) => job.level === level));
  }
  assert.equal(getScope({ ...demoProfile, level: "all" }).length, 120);
  assert.equal(countLabel("mentioned"), "Вакансий с упоминанием");
});

test("The roadmap supports twenty sequential skills without a fixed three-step cap", () => {
  const skills = Array.from({ length: 20 }, (_, i) => "Навык " + (i + 1));
  const jobs = skills.map((_, i) => ({ required: skills.slice(0, i + 1) }));
  const plan = buildPlan(jobs, []);
  assert.equal(plan.length, 20);
  assert.deepEqual(
    plan.flatMap((step) => step.skills),
    skills,
  );
  assert.ok(plan.every((step) => step.gain === 1));
  assert.equal(plan.at(-1).afterCoverage, 20);
});
