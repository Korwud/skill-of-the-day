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
  await page.locator('.region-picker summary').click();
  await page.getByLabel('Удалённая работа',{exact:true}).check();
  await page.getByRole('button',{name:'Сохранить изменения'}).click();
  await expect(page.getByRole('status')).toContainText('сохранены');
  await page.goto('/#/plan');
  await expect(page.locator('.scope-bar')).toContainText('Удалённая работа');
  await expect(page.locator('.metrics')).toContainText('/ 30');
});

test('Landing shows five skills per direction and selected step uses the same forecast', async ({page})=>{
  await page.goto('/');
  await expect(page.locator('.market-card')).toHaveCount(3);
  for (const card of await page.locator('.market-card').all()) await expect(card.locator('.market-row')).toHaveCount(5);
  await page.goto('/#/plan');
  await page.getByRole('button',{name:'Частично освоены',exact:true}).click();
  const row=page.locator('.skill-row').filter({has:page.getByRole('button',{name:'UML',exact:true})});
  await expect(row.locator('strong')).toContainText('+24');
  await row.getByRole('button',{name:'UML',exact:true}).click();
  await expect(page.getByRole('dialog').locator('.skill-impact')).toContainText('+24');
  await expect(page.getByRole('dialog')).toContainText('Прогноз для шага 3');
});

test('Mobile region picker keeps remote visible, supports search, chips and Escape', async ({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.goto('/#/profile');
  const picker=page.locator('.region-picker');
  await expect(picker).not.toHaveAttribute('open','');
  await picker.locator('summary').click();
  await page.getByLabel('Поиск региона').fill('Екат');
  await expect(page.getByLabel('Удалённая работа',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Екатеринбург',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Москва',{exact:true})).toHaveCount(0);
  await page.getByLabel('Екатеринбург',{exact:true}).check();
  await page.getByLabel('Удалённая работа',{exact:true}).check();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(picker).not.toHaveAttribute('open','');
  await expect(picker.locator('summary')).toBeFocused();
  await page.getByRole('button',{name:'Убрать Екатеринбург',exact:true}).click();
  await page.getByRole('button',{name:'Сохранить изменения'}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'Убрать Удалённая работа'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Убрать Екатеринбург',exact:true})).toHaveCount(0);
});

test('Account forms preserve email, never save passwords, and require deletion confirmation', async ({page})=>{
  await page.goto('/#/profile');
  await page.getByLabel('Электронная почта',{exact:true}).fill('danil@example.ru');
  await page.getByRole('button',{name:'Сохранить email',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Email сохранён');
  await page.getByLabel('Направление',{exact:true}).selectOption('qa');
  await page.getByRole('button',{name:'Сохранить изменения'}).click();
  await page.reload();
  await expect(page.getByLabel('Электронная почта',{exact:true})).toHaveValue('danil@example.ru');
  await page.getByText('Изменить пароль',{exact:true}).click();
  await page.getByLabel('Текущий пароль',{exact:true}).fill('current-secret');
  await page.getByLabel('Новый пароль',{exact:true}).fill('new-secret');
  await page.getByLabel('Повторите новый пароль',{exact:true}).fill('different-secret');
  await page.getByRole('button',{name:'Сменить пароль',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('не совпадают');
  await page.getByLabel('Повторите новый пароль',{exact:true}).fill('new-secret');
  await page.getByRole('button',{name:'Сменить пароль',exact:true}).click();
  await expect(page.getByLabel('Новый пароль',{exact:true})).toHaveValue('');
  expect(await page.evaluate(()=>localStorage.getItem('skill-day-profile'))).not.toContain('secret');
  await page.getByRole('button',{name:'Удалить учётную запись →',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Отмена',exact:true}).click();
  await expect(page.getByLabel('Электронная почта',{exact:true})).toHaveValue('danil@example.ru');
  await page.getByRole('button',{name:'Удалить учётную запись →',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Да, удалить',exact:true}).click();
  await expect(page).toHaveURL(/#\/login$/);
  expect(await page.evaluate(()=>localStorage.getItem('skill-day-profile'))).toBeNull();
  await page.goto('/#/plan');
  await expect(page.getByRole('heading',{name:'Начнём с основ'})).toBeVisible();
});

test('Accent text meets the 4.5:1 contrast requirement on its tinted background',async({page})=>{
  await page.goto('/#/plan');
  await page.getByRole('button',{name:'Частично освоены',exact:true}).click();
  await page.getByRole('button',{name:'SQL',exact:true}).click();
  const ratio=await page.locator('.skill-impact').evaluate(el=>{
    const luminance=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
    const background=luminance(getComputedStyle(el).backgroundColor);
    const foreground=luminance(getComputedStyle(el.querySelector('strong')).color);
    return (Math.max(background,foreground)+.05)/(Math.min(background,foreground)+.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
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
