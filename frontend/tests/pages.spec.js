import { test, expect } from '@playwright/test';

test('All screens fit desktop and 360px mobile without runtime errors', async ({page}) => {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,360]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['', 'market','login','register','reset','plan','profile']) {
      await page.goto('/#/'+route);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('Zero state, partial plan, skill effect and persistence work together', async ({page}) => {
  await page.goto('/#/plan');
  await page.getByRole('button',{name:'Без навыков',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Начнём с основ'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Следующие шаги'})).toHaveCount(0);
  await page.getByRole('button',{name:'Частично освоены',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Следующие шаги'})).toBeVisible();
  await page.getByRole('button',{name:'SQL',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.skill-impact')).toContainText('+12');
  await dialog.getByLabel('Навык освоен').check();
  await expect(dialog.locator('.skill-impact')).toContainText('+0');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.metrics').first()).toContainText('24');
  await page.reload();
  await expect(page.locator('.metrics').first()).toContainText('24');
  await page.goto('/#/profile');
  await page.getByLabel('Удалённая работа',{exact:true}).check();
  await page.getByRole('button',{name:'Сохранить изменения'}).click();
  await expect(page.getByRole('status')).toContainText('сохранены');
  await page.goto('/#/plan');
  await expect(page.locator('.scope-bar')).toContainText('Удалённая работа');
  await expect(page.locator('.metrics')).toContainText('/ 30');
});

test('Registration validates matching passwords and stays a demo', async ({page})=>{
  await page.goto('/#/register');
  await page.getByLabel('Email',{exact:true}).fill('test@example.ru');
  await page.getByLabel('Пароль',{exact:true}).fill('password123');
  await page.getByLabel('Повторите пароль').fill('different123');
  await page.getByRole('button',{name:'Зарегистрироваться'}).click();
  await expect(page.getByRole('status')).toContainText('не совпадают');
  await page.getByLabel('Повторите пароль').fill('password123');
  await page.getByRole('button',{name:'Зарегистрироваться'}).click();
  await expect(page.getByRole('status')).toContainText('не создаётся');
});
