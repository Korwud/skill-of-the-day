// Local demo provider. The production source will be the API Gateway.
export const SNAPSHOT_DATE = "20.10.2026";
export const UPDATE_INTERVAL_DAYS = 5;
export const PUBLIC_SKILL_COUNT = 5;
export const directions = {
  analyst: {
    name: "Системный анализ",
    short: "Системный аналитик",
    prefix: "SYS",
    skills: [
      "Анализ требований",
      "Моделирование данных",
      "SQL",
      "REST API",
      "UML",
      "Git",
      "BPMN",
      "SOAP",
    ],
  },
  csharp: {
    name: "Разработка C#",
    short: "Разработчик C#",
    prefix: "CS",
    skills: [
      "C#",
      ".NET",
      "SQL",
      "REST API",
      "Git",
      "Docker",
      "Entity Framework",
      "Тестирование",
    ],
  },
  qa: {
    name: "Тестирование ПО",
    short: "Тестировщик",
    prefix: "QA",
    skills: [
      "Тест-дизайн",
      "Тест-кейсы",
      "SQL",
      "REST API",
      "Postman",
      "Git",
      "Автотесты",
      "Python",
    ],
  },
};
export const regions = [
  "Москва",
  "Санкт-Петербург",
  "Екатеринбург",
  "Владивосток",
];
export const basicSkills = Object.fromEntries(
  Object.entries(directions).map(([key, value]) => [
    key,
    value.skills.slice(0, 5),
  ]),
);
export const seedProfile = {
  direction: "analyst",
  regions: ["Москва", "Удалённая работа"],
  skills: [],
  email: "alex@example.test",
};
export const demoProfile = {
  ...seedProfile,
  skills: ["Анализ требований", "Моделирование данных", "UML"],
};
export const requirementTypes = {
  required: "Обязательный",
  desired: "Желательный",
  mentioned: "Упомянутый",
};
const groups = [
  { count: 24, extra: [] },
  { count: 18, extra: [2] },
  { count: 18, extra: [3] },
  { count: 12, extra: [2, 3] },
  { count: 24, extra: [2, 3, 5] },
  { count: 14, extra: [2, 3, 6] },
  { count: 8, extra: [2, 3, 7] },
  { count: 2, extra: [2, 3, 5, 6] },
];
const datasets = Object.fromEntries(
  Object.entries(directions).map(([key, direction]) => {
    let index = 0;
    const jobs = groups.flatMap((group) =>
      Array.from({ length: group.count }, () => {
        const i = index++,
          required = [0, 1, ...(i % 3 === 0 ? [4] : []), ...group.extra].map(
            (n) => direction.skills[n],
          );
        const other = direction.skills.filter(
          (skill) => !required.includes(skill),
        );
        const desired = other.length ? [other[i % other.length]] : [];
        return {
          id: `${direction.prefix}-${String(i + 1).padStart(3, "0")}`,
          title:
            key === "analyst"
              ? [
                  "Системный аналитик · API",
                  "Аналитик внутренних сервисов",
                  "Системный аналитик · интеграции",
                  "Аналитик продуктовой команды",
                ][i % 4]
              : `${direction.short} · ${i % 2 ? "junior" : "middle"}`,
          region: i % 4 === 0 ? "Удалённо" : "Москва",
          remote: i % 4 === 0,
          required,
          desired,
          mentioned: other
            .filter((skill) => !desired.includes(skill))
            .slice(0, 1),
          structureRecognized: i < 111,
          url: null,
          rawMentions: [
            ...(i < 42 ? ["Postgre SQL"] : []),
            ...(i < 32 ? ["RESTful"] : []),
            ...(i < 18 ? ["gRPC"] : []),
            ...(i < 9 ? ["team player"] : []),
          ],
        };
      }),
    );
    return [key, jobs];
  }),
);
export const vacancies = (direction) => datasets[direction] || [];
export function getScope(profile) {
  return vacancies(profile.direction).filter(
    (job) =>
      !profile.regions.length ||
      profile.regions.includes(job.region) ||
      (profile.regions.includes("Удалённая работа") && job.remote),
  );
}
export const coverage = (jobs, skills) =>
  jobs.filter((job) => job.required.every((skill) => skills.includes(skill)))
    .length;
export const skillGain = (jobs, skills, skill) =>
  coverage(jobs, [...new Set([...skills, skill])]) - coverage(jobs, skills);
export const formatNumber = (value) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
export const percent = (value, total) =>
  total ? `${formatNumber((value / total) * 100)}%` : "0%";
export const vacancyText = (n) =>
  `${n} ${n % 100 >= 11 && n % 100 <= 14 ? "вакансий" : n % 10 === 1 ? "вакансия" : n % 10 >= 2 && n % 10 <= 4 ? "вакансии" : "вакансий"}`;
export const deficit = (job, skills) =>
  job.required.filter((skill) => !skills.includes(skill));
export function layers(jobs, skills) {
  const counts = new Map();
  for (const job of jobs) {
    const n = deficit(job, skills).length;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a - b);
}
export function minimumDeficit(jobs, skills) {
  const values = jobs.map((job) => deficit(job, skills).length).filter(Boolean);
  return values.length ? Math.min(...values) : null;
}
export function statistics(jobs, skills, type = "all", query = "") {
  return skills
    .filter((skill) => skill.toLowerCase().includes(query.toLowerCase()))
    .map((skill) => {
      const counts = Object.keys(requirementTypes).map((key) => [
        key,
        jobs.filter((job) => job[key].includes(skill)).length,
      ]);
      const [category, count] =
        type === "all"
          ? counts.sort((a, b) => b[1] - a[1])[0]
          : counts.find(([key]) => key === type);
      return { skill, category, count, delta: Math.min(8, 2 + (count % 7)) };
    })
    .filter((item) => item.count)
    .sort((a, b) => b.count - a.count);
}
export function skillCategory(jobs, skill) {
  return Object.keys(requirementTypes).sort(
    (a, b) =>
      jobs.filter((j) => j[b].includes(skill)).length -
      jobs.filter((j) => j[a].includes(skill)).length,
  )[0];
}
// Bases stay above the three specialised steps, as in the approved roadmap.
// Each specialised step is evaluated after the missing bases and previous steps.
export function buildPlan(jobs, skills, direction = "analyst") {
  let context = [...new Set([...skills, ...basicSkills[direction]])];
  const steps = [];
  for (let index = 0; index < 3; index++) {
    const missing = jobs
      .map((job) => deficit(job, context))
      .filter((item) => item.length);
    if (!missing.length) break;
    const nearest = Math.min(...missing.map((item) => item.length));
    const bundles = [
      ...new Map(
        missing
          .filter((item) => item.length === nearest)
          .map((item) => [[...item].sort().join("\u0000"), item]),
      ).values(),
    ];
    bundles.sort(
      (a, b) =>
        coverage(jobs, [...context, ...b]) - coverage(jobs, [...context, ...a]),
    );
    const chosen = bundles[0].slice(0, 5),
      before = [...context],
      beforeCoverage = coverage(jobs, before);
    context = [...new Set([...context, ...chosen])];
    const afterCoverage = coverage(jobs, context);
    steps.push({
      index,
      skills: chosen,
      before,
      beforeCoverage,
      afterCoverage,
      gain: afterCoverage - beforeCoverage,
      percentagePoints: jobs.length
        ? ((afterCoverage - beforeCoverage) / jobs.length) * 100
        : 0,
      partial: bundles[0].length > 5,
      minimumBefore: nearest,
      minimumAfter: minimumDeficit(jobs, context),
    });
  }
  return steps;
}
export function rawRecords(jobs) {
  const counts = new Map();
  for (const job of jobs)
    for (const term of job.rawMentions)
      counts.set(term, (counts.get(term) || 0) + 1);
  return [...counts]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
}
export function safeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}
export function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem("skill-day-profile"));
    if (
      !saved ||
      !Object.hasOwn(directions, saved.direction) ||
      !Array.isArray(saved.skills) ||
      !Array.isArray(saved.regions)
    )
      return structuredClone(seedProfile);
    return {
      direction: saved.direction,
      skills: [
        ...new Set(
          saved.skills
            .filter((s) => typeof s === "string")
            .map((s) =>
              s === "Работа с требованиями" ? "Анализ требований" : s,
            ),
        ),
      ],
      regions: saved.regions.filter(
        (r) => regions.includes(r) || r === "Удалённая работа",
      ),
      email: typeof saved.email === "string" ? saved.email : "",
    };
  } catch {
    return structuredClone(seedProfile);
  }
}
