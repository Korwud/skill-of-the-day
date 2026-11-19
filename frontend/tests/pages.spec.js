import { test, expect } from "@playwright/test";
import { demoProfile } from "../src/data.js";

test.beforeEach(async ({ page }) => {
  let user = {
    id: "browser-test-user",
    email: "alex@example.test",
    roles: ["User", "Admin"],
  };
  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/config"))
      return route.fulfill({ status: 200, json: { requireConfirmedEmail: true } });
    if (path.endsWith("/refresh") || path.endsWith("/login"))
      return route.fulfill({
        status: user ? 200 : 401,
        json: user
          ? { accessToken: "browser-test-token", expiresIn: 600, user }
          : { title: "Войдите заново" },
      });
    if (
      path.endsWith("/account") ||
      path.endsWith("/change-password") ||
      path.endsWith("/logout")
    ) {
      user = null;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 202 });
  });
});

async function partialProfile(page, overrides = {}) {
  await page.goto("/");
  await page.evaluate(
    (profile) =>
      localStorage.setItem(
        "skill-day-profile:browser-test-user",
        JSON.stringify(profile),
      ),
    { ...demoProfile, ...overrides },
  );
  await page.reload();
}
async function fits(page) {
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.width,
  );
}

test("Deficit selection recalculates both views and evidence; tabs remain next to data", async ({
  page,
}) => {
  await partialProfile(page);
  await page.goto("/#/plan");
  await expect(page.locator(".scope-line")).toContainText(
    "Дата среза: 20.10.2026",
  );
  await page.getByRole("button", { name: "Слой 3 · 46", exact: true }).click();
  await expect(page.locator(".metrics")).toContainText("Охват · 0 из 46");
  await page.getByRole("button", { name: "Git", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toContainText("+52,2 п.п.");
  await page.getByRole("button", { name: "Git", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".vacancy-example"),
  ).toHaveCount(24);
  await expect(page.getByRole("dialog")).toContainText("24 из 46");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Таблица", exact: true }).click();
  const rows = page.locator(".plan-table-row");
  for (const [i, value] of ["+24", "+14", "+8"].entries())
    await expect(rows.nth(i)).toContainText(value);
  const placement = await page.evaluate(() => ({
    filter: document.querySelector(".layers").getBoundingClientRect().bottom,
    tabs: document.querySelector("[role=tablist]").getBoundingClientRect().top,
    data: document.querySelector("#plan-view").getBoundingClientRect().top,
    legend: document
      .querySelector(".requirement-legend")
      .getBoundingClientRect().bottom,
  }));
  expect(placement.filter).toBeLessThan(placement.tabs);
  expect(placement.legend).toBeLessThan(placement.tabs);
  expect(placement.tabs).toBeLessThan(placement.data);
  await expect(page.locator(".table-order").first()).toHaveCSS(
    "text-align",
    "center",
  );
  await page.getByRole("button", { name: "Все · 120", exact: true }).click();
  await expect(rows.nth(1)).toContainText("+16");
  await page.getByRole("tab", { name: "Таблица" }).press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "Граф", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("Level filters landing statistics, market and saved profile; mentioned counts are labelled correctly", async ({
  page,
}) => {
  await partialProfile(page);
  await page.goto("/");
  await page.getByLabel("Уровень", { exact: true }).selectOption("junior");
  for (const card of await page.locator(".market-card").all())
    await expect(card).toContainText("Вакансий в срезе: 30");
  await page.goto("/#/market");
  await page.getByLabel("Уровень", { exact: true }).selectOption("middle");
  await expect(page.locator(".market-summary")).toContainText(
    "Вакансий в срезе: 30",
  );
  await page
    .getByLabel("Тип требования", { exact: true })
    .selectOption("mentioned");
  await expect(page.locator(".ranking-row").first()).toContainText(
    "Вакансий с упоминанием",
  );
  await page.goto("/#/profile");
  await page.getByLabel("Уровень", { exact: true }).selectOption("senior");
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await page.goto("/#/plan");
  await expect(page.getByLabel("Уровень", { exact: true })).toHaveValue(
    "senior",
  );
  await expect(page.locator(".metrics")).toContainText("из 30");
  await page.reload();
  await expect(page.getByLabel("Уровень", { exact: true })).toHaveValue(
    "senior",
  );
});

test("Twenty skills remain name-only and fit a bounded responsive graph", async ({
  page,
}) => {
  await page.route(/\/src\/data\.js(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const stress = `\nconst stressSkills=Array.from({length:20},(_,i)=>'Навык '+(i+1));directions.analyst.skills.push(...stressSkills);datasets.analyst=stressSkills.map((_,i)=>({id:'stress-'+i,title:'Тестовая вакансия',region:'Москва',remote:false,level:'junior',required:[...basicSkills.analyst,...stressSkills.slice(0,i+1)],desired:[],mentioned:[],rawMentions:[],structureRecognized:true,url:null}));`;
    await route.fulfill({ response, body: (await response.text()) + stress });
  });
  await partialProfile(page);
  await page.goto("/#/plan");
  await expect(page.locator(".roadmap-step")).toHaveCount(20);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await fits(page);
    if (width < 760) {
      const dimensions = await page.locator(".compact-map").evaluate((el) => ({
        content: el.scrollHeight,
        visible: el.clientHeight,
      }));
      expect(dimensions.content).toBeGreaterThan(dimensions.visible);
    }
    const box = await page.locator(".compact-map").boundingBox();
    expect(box.height).toBeLessThanOrEqual(width < 760 ? 560 : 640);
    await expect(page.locator(".roadmap-step .skill-node").last()).toHaveText(
      "Навык 20",
    );
  }
});

test.describe("Touch interaction", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("A tap opens the skill hint; another tap opens its full card", async ({
    page,
  }) => {
    await partialProfile(page);
    await page.goto("/#/plan");
    const node = page.getByRole("button", { name: "Git", exact: true });
    await node.tap();
    await expect(page.getByRole("tooltip")).toContainText(
      "Вакансии-основания: 24",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await node.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("dialog").locator(".vacancy-example"),
    ).toHaveCount(24);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Слой 3 · 46", exact: true }).click();
    // A previous mouse interaction must not turn the first touch into a click-through.
    await node.hover();
    await node.tap();
    await expect(page.getByRole("tooltip")).toContainText("+52,2 п.п.");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await node.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test("All pages and both roadmap views fit desktop, tablet and mobile", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await partialProfile(page);
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "",
      "market",
      "login",
      "register",
      "reset",
      "plan",
      "profile",
      "admin",
    ]) {
      await page.goto("/#/" + route);
      await expect(page.locator("h1")).toBeVisible();
      await fits(page);
      if (route === "plan") {
        await expect(
          page.getByRole("region", {
            name: "Графический roadmap",
            exact: true,
          }),
        ).toBeVisible();
        await page.getByRole("tab", { name: "Таблица", exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "Табличный список рекомендаций" }),
        ).toBeVisible();
        await fits(page);
      }
    }
  }
  expect(errors).toEqual([]);
});

test("Public statistics use real selectors and filters, with five skills per landing card", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".market-card")).toHaveCount(3);
  for (const card of await page.locator(".market-card").all())
    await expect(card.locator(".market-card-row")).toHaveCount(5);
  await expect(page.locator(".slice-date")).toContainText("20.10.2026");
  await page.goto("/#/market");
  await page.getByLabel("Направление", { exact: true }).selectOption("csharp");
  await expect(page.locator(".ranking-row").first()).toContainText("C#");
  await page.getByLabel("Поиск навыка", { exact: true }).fill("Docker");
  await expect(page.locator(".ranking-row")).toHaveCount(1);
  await page
    .getByLabel("Тип требования", { exact: true })
    .selectOption("desired");
  await expect(page.locator(".ranking-row .tag")).toHaveText("Желательный");
  await page.getByLabel("Регион", { exact: true }).selectOption("Владивосток");
  await expect(page.locator(".ranking-list")).toContainText(
    "Вакансий в срезе нет",
  );
  await expect(page.locator(".market-summary")).toContainText(
    "Вакансий в срезе: 0",
  );
  await expect(
    page.getByText("Сортировка: вакансий с требованием"),
  ).toHaveCount(0);
  await expect(page.locator(".trends")).toContainText("каждые 5 дней");
});

test("Zero state becomes a graphical roadmap through real skill selection and persists", async ({
  page,
}) => {
  await page.goto("/#/plan");
  await expect(
    page.getByRole("heading", { name: "Неизученные базовые навыки" }),
  ).toBeVisible();
  await expect(page.locator(".graph-plan")).toHaveCount(0);
  await page.getByLabel("Анализ требований", { exact: true }).click();
  await expect(page.locator(".graph-plan")).toBeVisible();
  await expect(page.locator(".graph-basic-nodes .skill-node")).toHaveCount(4);
  for (const skill of ["Моделирование данных", "UML"]) {
    await page.getByRole("button", { name: skill, exact: true }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Отметить навык изученным")
      .check();
    await page.keyboard.press("Escape");
  }
  await expect(page.locator(".metrics").first()).toContainText(
    "Охват · 24 из 120",
  );
  await expect(page.locator(".graph-basic-nodes .skill-node")).toHaveCount(2);
  await page.locator(".roadmap-step .skill-node").first().hover();
  await expect(page.getByRole("tooltip")).toContainText("Вклад навыка: +24");
  await expect(page.locator(".layer-controls button")).toHaveCount(6);
  await page.reload();
  await expect(page.locator(".metrics")).toContainText("Охват · 24 из 120");
});

test("Graph, table and selected skill share the same forecast; learned markers reflect actual knowledge", async ({
  page,
}) => {
  await partialProfile(page);
  await page.goto("/#/plan");
  await expect(page.locator(".roadmap-step")).toHaveCount(3);
  const step = page.locator(".roadmap-step").first();
  await expect(step).toHaveText("Git");
  const opener = step.getByRole("button", { name: "Git", exact: true });
  await opener.hover();
  await expect(page.getByRole("tooltip")).toContainText("Вклад навыка: +24");
  await expect(page.getByRole("tooltip")).toContainText(
    "Прирост охвата: +20 п.п.",
  );
  await page.keyboard.press("Escape");
  await opener.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(opener).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText("Вклад навыка: +24");
  await page.keyboard.press("Escape");
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".coverage-comparison")).toContainText(
    "72 из 120 (60%)",
  );
  await expect(dialog.locator(".coverage-comparison")).toContainText(
    "96 из 120 (80%)",
  );
  await expect(dialog.locator(".vacancy-example")).toHaveCount(24);
  const first = dialog.locator(".vacancy-example").first();
  await expect(first).toContainText("Анализ требований — изучен");
  await expect(first).toContainText("SQL — не изучен");
  await expect(first).toContainText("REST API — не изучен");
  await expect(dialog.getByRole("tab")).toHaveCount(0);
  await expect(dialog).not.toContainText("прокручиваемый");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.getByRole("tab", { name: "Таблица", exact: true }).click();
  await expect(page.locator(".plan-table-row")).toHaveCount(3);
  for (const [index, value] of ["+24", "+16", "+8"].entries())
    await expect(page.locator(".plan-table-row").nth(index)).toContainText(
      value,
    );
  await page.getByRole("button", { name: "Git", exact: true }).click();
  await expect(dialog.locator(".coverage-comparison")).toContainText(
    "96 из 120 (80%)",
  );
  await dialog.getByLabel("Отметить навык изученным").check();
  await expect(
    dialog
      .locator(".required-skills li.studied")
      .filter({ hasText: "Git" })
      .first(),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".plan-table-row").first()).toContainText("BPMN");
});

test("Manual recalculation uses the worker and finishes without changing the forecast", async ({
  page,
}) => {
  await partialProfile(page);
  await page.goto("/#/plan");
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(/\/plan\.worker[^/]*\.js(?:\?|$)/, async (route) => {
    await gate;
    await route.continue();
  });
  const workerRequest = page.waitForEvent("worker");
  await page
    .getByRole("button", { name: "Пересчитать план", exact: true })
    .click();
  try {
    await expect(page.getByRole("status")).toContainText(
      "Пересчёт выполняется",
    );
    await expect(page.locator(".plan-content")).toHaveAttribute("disabled", "");
    await expect(page.locator(".roadmap-step button").first()).toBeDisabled();
    await expect(page.locator(".roadmap-step").first()).toHaveText("Git");
  } finally {
    release();
    await workerRequest;
  }
  await expect(
    page.getByRole("button", { name: "Пересчитать план", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".plan-content")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.locator(".roadmap-step .skill-node").first().hover();
  await expect(page.getByRole("tooltip")).toContainText("Вклад навыка: +24");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Region settings support search and keyboard dismissal; an empty scope has no layers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await partialProfile(page);
  await page.goto("/#/profile");
  const picker = page.locator(".region-picker");
  await picker.locator("summary").click();
  await page.getByLabel("Поиск региона").fill("Влади");
  await expect(
    page.getByLabel("Удалённая работа", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Владивосток", { exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(picker.locator("summary")).toBeFocused();
  await page
    .getByRole("button", { name: "Убрать Москва", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Убрать Удалённая работа", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await page.goto("/#/plan");
  await expect(
    page.getByRole("heading", { name: "Вакансий в срезе нет" }),
  ).toBeVisible();
  await expect(page.locator(".layers")).toContainText("Слоёв нет");
  await expect(page.locator(".basic-node")).toHaveCount(2);
  await fits(page);
});

test("Admin actions and two manual vacancy flags are persisted locally", async ({
  page,
}) => {
  await page.goto("/#/admin");
  await expect(page.locator(".admin-metrics")).toContainText("7,5% · 9 из 120");
  await expect(page.locator(".raw-count")).toHaveText(["42", "32", "18", "9"]);
  const first = page.locator(".raw-row").first();
  await first
    .getByRole("button", { name: "Создать навык", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Канонический навык")
    .fill("PostgreSQL");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await expect(page.locator(".raw-row")).toHaveCount(3);
  await page
    .locator(".raw-row")
    .first()
    .getByRole("button", { name: "Связать с навыком", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Канонический навык")
    .selectOption("REST API");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await page
    .locator(".raw-row")
    .first()
    .getByRole("button", { name: "Отклонить", exact: true })
    .click();
  await expect(page.locator(".raw-row")).toHaveCount(1);
  await page.getByLabel("Требует ручной проверки", { exact: true }).check();
  await page.getByLabel("Исключить из расчёта", { exact: true }).check();
  await page
    .getByRole("button", { name: "Сохранить пометки", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".raw-row")).toHaveCount(1);
  await expect(
    page.getByLabel("Требует ручной проверки", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Исключить из расчёта", { exact: true }),
  ).toBeChecked();
});

test("Account actions send requests, keep passwords ephemeral and require deletion confirmation", async ({
  page,
}) => {
  await page.goto("/#/profile");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("danil@example.test");
  await page
    .getByLabel("Пароль для смены почты", { exact: true })
    .fill("Current passphrase 123");
  const changeEmail = page.waitForRequest((request) =>
    request.url().endsWith("/change-email"),
  );
  await page
    .getByRole("button", { name: "Подтвердить новую почту", exact: true })
    .click();
  expect((await changeEmail).postDataJSON()).toEqual({
    newEmail: "danil@example.test",
    currentPassword: "Current passphrase 123",
  });
  await expect(page.getByRole("status")).toContainText("письмо отправлено");
  await page.getByText("Изменить пароль", { exact: true }).click();
  await page
    .getByLabel("Текущий пароль", { exact: true })
    .fill("Current passphrase 123");
  await page
    .getByLabel("Новый пароль", { exact: true })
    .fill("New passphrase 123");
  await page
    .getByLabel("Повторите новый пароль", { exact: true })
    .fill("Different passphrase 123");
  await page
    .getByRole("button", { name: "Сменить пароль", exact: true })
    .click();
  await expect(page.locator(".password-settings [role=status]")).toContainText(
    "не совпадают",
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "passphrase",
  );
  await page
    .getByRole("button", { name: "Удалить учётную запись", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Отмена", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Удалить учётную запись", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Пароль для удаления", { exact: true })
    .fill("Current passphrase 123");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Да, удалить", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/login$/);
});

test("Registration validates password confirmation and recovery displays a neutral response", async ({
  page,
}) => {
  await page.goto("/#/register");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("alex@example.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("Testing passphrase 123");
  await page
    .getByLabel("Повторите пароль", { exact: true })
    .fill("Different passphrase 123");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Пароли не совпадают");
  await page
    .getByLabel("Повторите пароль", { exact: true })
    .fill("Testing passphrase 123");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Подтвердите почту");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "passphrase",
  );
  await page.goto("/#/reset");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("alex@example.test");
  await page
    .getByRole("button", { name: "Отправить ссылку", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Если адрес зарегистрирован",
  );
});

test("Registration without email confirmation offers immediate login and hides resend", async ({ page }) => {
  await page.route("**/api/auth/config", route => route.fulfill({ status: 200, json: { requireConfirmedEmail: false } }));
  await page.goto("/#/register");
  await expect(page.getByText("Подтверждение почты не требуется.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Отправить подтверждение почты повторно" })).toHaveCount(0);
  await page.getByLabel("Электронная почта", { exact: true }).fill("direct@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("Testing passphrase 123");
  await page.getByLabel("Повторите пароль", { exact: true }).fill("Testing passphrase 123");
  await page.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Можно сразу войти");
  await page.getByRole("link", { name: "Перейти ко входу", exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole("heading", { name: "С возвращением", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Отправить подтверждение почты повторно" })).toHaveCount(0);
  await page.getByLabel("Электронная почта", { exact: true }).fill("direct@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("Testing passphrase 123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ваш roadmap", exact: true })).toBeVisible();
});

test("Registration can retry unavailable confirmation settings without guessing the policy", async ({ page }) => {
  await page.route("**/api/auth/config", route => route.fulfill({ status: 503, json: { title: "Настройки временно недоступны" } }));
  await page.goto("/#/register");
  await expect(page.getByRole("alert")).toContainText("Настройки временно недоступны");
  await expect(page.getByRole("button", { name: "Зарегистрироваться", exact: true })).toBeDisabled();
  await page.route("**/api/auth/config", route => route.fulfill({ status: 200, json: { requireConfirmedEmail: false } }));
  await page.getByRole("button", { name: "Повторить загрузку настроек" }).click();
  await expect(page.getByRole("button", { name: "Зарегистрироваться", exact: true })).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("A successful login recovers from an earlier auth-service outage", async ({
  page,
}) => {
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 503,
      json: { title: "Сервис временно недоступен" },
    }),
  );
  await page.goto("/#/profile");
  await expect(
    page.getByRole("heading", { name: "Авторизация временно недоступна" }),
  ).toBeVisible();
  await page.goto("/#/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("alex@example.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("A valid test passphrase 123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ваш roadmap", exact: true }),
  ).toBeVisible();
});
