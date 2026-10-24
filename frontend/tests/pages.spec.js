import { test, expect } from "@playwright/test";
import { demoProfile } from "../src/data.js";

async function partialProfile(page, overrides = {}) {
  await page.goto("/");
  await page.evaluate(
    (profile) =>
      localStorage.setItem("skill-day-profile", JSON.stringify(profile)),
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
        await page
          .getByRole("button", { name: "Таблица", exact: true })
          .click();
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
  await expect(page.locator(".basic-node")).toHaveCount(4);
  await page.getByLabel("Моделирование данных", { exact: true }).click();
  await page.getByLabel("UML", { exact: true }).click();
  await expect(page.locator(".metrics").first()).toContainText(
    "Охват · 24 из 120",
  );
  await expect(page.locator(".basic-node")).toHaveCount(2);
  await expect(page.locator(".step-card").first()).toContainText(
    "Вклад навыка: +24",
  );
  await expect(page.locator(".layers li")).toHaveCount(5);
  await page.reload();
  await expect(page.locator(".metrics")).toContainText("Охват · 24 из 120");
});

test("Graph, table and selected skill share the same forecast; learned markers reflect actual knowledge", async ({
  page,
}) => {
  await partialProfile(page);
  await page.goto("/#/plan");
  await expect(page.locator(".step-card")).toHaveCount(3);
  const step = page.locator(".step-card").first();
  await expect(step).toContainText("Вклад навыка: +24");
  await expect(step).toContainText("Прирост охвата: +20 п.п.");
  const opener = step.getByRole("button", { name: "1. Git", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".coverage-comparison")).toContainText(
    "72 из 120 (60%)",
  );
  await expect(dialog.locator(".coverage-comparison")).toContainText(
    "96 из 120 (80%)",
  );
  await expect(dialog.locator(".vacancy-example")).toHaveCount(26);
  const first = dialog.locator(".vacancy-example").first();
  await expect(first).toContainText("Анализ требований — изучен");
  await expect(first).toContainText("SQL — не изучен");
  await expect(first).toContainText("REST API — не изучен");
  await expect(dialog.getByRole("tab")).toHaveCount(0);
  await expect(dialog).not.toContainText("прокручиваемый");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.getByRole("button", { name: "Таблица", exact: true }).click();
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
    await expect(page.locator(".step-card input").first()).toBeDisabled();
    await expect(page.locator(".step-card").first()).toContainText(
      "Вклад навыка: +24",
    );
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
  await expect(page.locator(".step-card").first()).toContainText(
    "Вклад навыка: +24",
  );
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

test("Account email persists, passwords stay ephemeral, deletion requires confirmation", async ({
  page,
}) => {
  await page.goto("/#/profile");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("danil@example.ru");
  await page
    .getByRole("button", { name: "Сохранить email", exact: true })
    .click();
  await page.getByLabel("Направление", { exact: true }).selectOption("qa");
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByLabel("Электронная почта", { exact: true }),
  ).toHaveValue("danil@example.ru");
  await page.getByText("Изменить пароль", { exact: true }).click();
  await page
    .getByLabel("Текущий пароль", { exact: true })
    .fill("current-secret");
  await page.getByLabel("Новый пароль", { exact: true }).fill("new-secret");
  await page
    .getByLabel("Повторите новый пароль", { exact: true })
    .fill("other-secret");
  await page
    .getByRole("button", { name: "Сменить пароль", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("не совпадают");
  await page
    .getByLabel("Повторите новый пароль", { exact: true })
    .fill("new-secret");
  await page
    .getByRole("button", { name: "Сменить пароль", exact: true })
    .click();
  await expect(page.getByLabel("Новый пароль", { exact: true })).toHaveValue(
    "",
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "secret",
  );
  await page
    .getByRole("button", { name: "Удалить учётную запись", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Отмена", exact: true })
    .click();
  await expect(
    page.getByLabel("Электронная почта", { exact: true }),
  ).toHaveValue("danil@example.ru");
  await page
    .getByRole("button", { name: "Удалить учётную запись", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Да, удалить", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("skill-day-profile")),
  ).toBeNull();
});

test("Auth forms validate input and explicitly keep the session in demo mode", async ({
  page,
}) => {
  await page.goto("/#/register");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("alex@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("demo-pass");
  await page
    .getByLabel("Повторите пароль", { exact: true })
    .fill("another-pass");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Пароли не совпадают");
  await page.getByLabel("Повторите пароль", { exact: true }).fill("demo-pass");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Учётная запись не создаётся",
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "demo-pass",
  );
  await page.goto("/#/reset");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("alex@example.test");
  await page
    .getByRole("button", { name: "Отправить ссылку", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "письмо не отправляется",
  );
});
