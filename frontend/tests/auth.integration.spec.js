import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  mailLink,
  password,
  Client,
} from "../../auth-service/tests/helpers.mjs";

test.describe("Real auth-service through Nginx", () => {
  test.skip(
    !process.env.AUTH_INTEGRATION,
    "Run with AUTH_INTEGRATION=1 against Docker Compose",
  );
  test("Registration, confirmation, session restoration, logout and password reset work in the browser", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const email = `auth-browser-${randomUUID()}@example.test`;
    await page.goto("/#/register");
    await page.getByLabel("Электронная почта", { exact: true }).fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill(password);
    await page.getByLabel("Повторите пароль", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Зарегистрироваться", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Подтвердите почту");
    const confirmation = await mailLink(email, "confirm-email");
    await page.goto("/#/confirm-email?" + new URLSearchParams(confirmation));
    await page
      .getByRole("button", { name: "Подтвердить почту", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Почта подтверждена");
    await page.getByRole("link", { name: "Ко входу", exact: true }).click();
    await page.getByLabel("Электронная почта", { exact: true }).fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Ваш roadmap", exact: true }),
    ).toBeVisible();
    const otherTab = await page.context().newPage();
    await Promise.all([page.reload(), otherTab.goto("/#/plan")]);
    await expect(
      otherTab.getByRole("heading", { name: "Ваш roadmap", exact: true }),
    ).toBeVisible();
    await otherTab.close();
    await expect(
      page.getByRole("heading", { name: "Ваш roadmap", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("accessToken");
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "skill-day.refresh",
    );
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await expect(page).toHaveURL(/#\/login$/);
    await page.goto("/#/reset");
    await page.getByLabel("Электронная почта", { exact: true }).fill(email);
    await page
      .getByRole("button", { name: "Отправить ссылку", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "письмо для восстановления отправлено",
    );
    const recovery = await mailLink(email, "reset-password");
    await page.goto("/#/reset-password?" + new URLSearchParams(recovery));
    const newPassword = "A new browser passphrase 456";
    await page.getByLabel("Новый пароль", { exact: true }).fill(newPassword);
    await page
      .getByLabel("Повторите пароль", { exact: true })
      .fill(newPassword);
    await page
      .getByRole("button", { name: "Сохранить пароль", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Пароль изменён");
    expect(page.url()).not.toContain("code=");
    const api = new Client();
    await api.login(email, newPassword);
    await api.call(
      "/account",
      { currentPassword: newPassword },
      { method: "DELETE", auth: true, expected: 204 },
    );
  });
  test("An anonymous visitor cannot open the profile or admin panel", async ({
    page,
  }) => {
    await page.goto("/#/profile");
    await expect(
      page.getByRole("heading", { name: "С возвращением" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ваш профиль" }),
    ).toHaveCount(0);
    await page.goto("/#/admin");
    await expect(
      page.getByRole("heading", { name: "Контроль качества данных" }),
    ).toHaveCount(0);
  });
});
