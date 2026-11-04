import { test, expect } from '@playwright/test';
import { readDatabase, writeRecords, selectMode } from './helpers/storage.js';
import { backupFixture } from './helpers/backup.js';

async function open(page, route, demo = false) {
  await page.goto(`./#/${route}`);
  await page.getByRole('button', { name: demo ? 'Explorar demostración' : 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
}
async function navigate(page, route) {
  await page.goto(`./#/${route}`);
  await expect(page.locator(`.sidebar [data-page="${route}"]`)).toHaveAttribute('aria-current', 'page');
}
async function fits(page, width) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}
async function capture(page, name, width) {
  await page.screenshot({ path: `.cache/ft009e-${name}-${width}.png`, fullPage: true });
}
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true });

test('FT-009E rutinas: filas compactas, opciones con teclado e inicio antes de ejercicios', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'predisenadas');
  await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
  await page.getByRole('link', { name: 'Ver copia en Mis rutinas', exact: true }).click();
  await expect(page.locator('.prescription-row')).toHaveCount(5);
  for (const width of [320, 390, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await fits(page, width);
    const start = page.getByRole('link', { name: 'Iniciar sesión', exact: true });
    expect((await start.boundingBox()).y).toBeLessThan((await page.locator('.prescription-row').first().boundingBox()).y);
    if (width < 600) {
      for (const row of await page.locator('.prescription-row').all()) expect((await row.boundingBox()).height).toBeLessThan(150);
      await expect(page.getByRole('button', { name: 'Editar rutina', exact: true })).toBeHidden();
      const options = page.getByRole('button', { name: 'Opciones de rutina', exact: true });
      await options.focus();
      await page.keyboard.press('Enter');
      await expect(options).toHaveAttribute('aria-expanded', 'true');
    }
    await page.getByRole('button', { name: 'Editar rutina', exact: true }).click();
    await expect(dialog(page, 'Editar rutina')).toBeVisible();
    await page.keyboard.press('Escape');
    // Canceling an editor keeps the selected routine and a visible focus target.
    await expect(page.getByRole('button', { name: 'Editar rutina', exact: true })).toBeFocused();
    if (width < 600) await page.getByRole('button', { name: 'Opciones de rutina', exact: true }).click();
    await page.locator('.routine-detail').evaluate(el => el.scrollIntoView());
    await capture(page, 'routines', width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const first = page.locator('.prescription-row').first();
  await first.getByRole('button', { name: /^Opciones de/ }).click();
  const edit = first.getByRole('button', { name: /^Editar objetivos/ });
  expect((await edit.boundingBox()).width).toBeGreaterThanOrEqual(44);
  await edit.click();
  await dialog(page, 'Configurar ejercicio').getByRole('spinbutton', { name: 'Series', exact: true }).fill('2');
  await dialog(page, 'Configurar ejercicio').getByRole('button', { name: 'Guardar objetivos' }).click();
  await expect(first.locator('.prescription-targets dd').first()).toHaveText('2');
  await page.getByRole('button', { name: 'Opciones de sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Editar sesión', exact: true }).click();
  await expect(dialog(page, 'Editar sesión')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Opciones de rutina', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicar rutina', exact: true }).click();
  await expect(page.locator('.routine-list-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Opciones de rutina', exact: true }).click();
  const before = await readDatabase(page, 'personal');
  await page.getByRole('button', { name: 'Eliminar rutina', exact: true }).click();
  await dialog(page, '¿Eliminar rutina?').getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await readDatabase(page, 'personal')).toEqual(before);
});

test('FT-009E series: pendiente sin check, progreso por ejercicio y controles conservados', async ({ page }) => {
  await open(page, 'predisenadas');
  await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
  await page.getByRole('link', { name: 'Ver copia en Mis rutinas', exact: true }).click();
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true }).click();
  for (const width of [320, 390, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('[data-workout-exercise="0"]').click();
    const first = page.locator('.workout-set').first();
    const complete = page.getByRole('button', { name: 'Completar serie 1', exact: true });
    await expect(complete).toHaveAttribute('aria-pressed', 'false');
    expect(await complete.textContent()).not.toContain('✓');
    await expect(complete.locator('svg')).toHaveCount(0);
    for (const control of await first.locator('input, button').all()) expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(48);
    await first.getByRole('spinbutton', { name: /^Peso/ }).fill('40');
    await first.getByRole('spinbutton', { name: /^Repeticiones/ }).fill('8');
    await complete.click();
    await expect(first.locator('button svg')).toHaveCount(1);
    await expect(page.locator('.register-set-progress')).toHaveText('1 de 3 series completadas');
    await fits(page, width);
    await first.scrollIntoViewIfNeeded();
    await capture(page, 'sets', width);
    await page.getByRole('button', { name: 'Desmarcar serie 1', exact: true }).click();
    await expect(page.locator('.register-set-progress')).toHaveText('0 de 3 series completadas');
    if (width < 700) await page.getByRole('button', { name: 'Ver rutina', exact: true }).click();
    await expect(page.locator('.workout-exercise').first().locator('.exercise-set-progress')).toHaveText('0 de 3 series completadas');
  }
});

test('FT-009E rutinas: nombres largos y prescripciones máximas sin recortes', async ({ page }) => {
  await open(page, 'mis-rutinas');
  await expect(page.getByRole('button', { name: 'Crear rutina', exact: true })).toBeEnabled();
  const fixture = backupFixture();
  fixture.stores.exercises[0].name = 'Ejercicio de prueba con un nombre largo para comprobar la lectura en móvil';
  Object.assign(fixture.stores.routineSessions[0].prescriptions[0], { sets: 20, repsMin: 1, repsMax: 100, restSeconds: 900 });
  await writeRecords(page, 'personal', { exercises: fixture.stores.exercises, routines: fixture.stores.routines, routineSessions: fixture.stores.routineSessions });
  await page.reload();
  await expect(page.locator('.prescription-row')).toHaveCount(1);
  for (const width of [320, 390, 1024, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await fits(page, width);
    await expect(page.locator('.prescription-targets dd')).toHaveText(['20', '1–100', '900 s']);
    const sizes = await page.locator('.prescription-row, .prescription-targets').evaluateAll(elements => elements.map(el => ({ client: el.clientWidth, scroll: el.scrollWidth })));
    for (const size of sizes) expect(size.scroll).toBeLessThanOrEqual(size.client);
  }
});

test('FT-009E calorías: un formulario compacto, resultado visible y datos temporales', async ({ page }) => {
  await open(page, 'calculadora-calorias');
  await expect(page.locator('[name="age"]')).toBeVisible();
  const before = await readDatabase(page, 'personal');
  for (const width of [320, 390, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('combobox', { name: 'Sexo usado por la fórmula' }).selectOption('male');
    await page.getByRole('spinbutton', { name: 'Edad (años)' }).fill('32');
    await page.getByRole('spinbutton', { name: 'Peso (kg)', exact: true }).fill('95');
    await page.getByRole('spinbutton', { name: 'Estatura (cm)' }).fill('172');
    await page.getByRole('combobox', { name: 'Nivel de actividad' }).selectOption('moderate');
    await page.getByRole('radio', { name: 'Déficit (−15 %)' }).check();
    if (width < 700) {
      expect((await page.locator('.calculator-form').boundingBox()).height).toBeLessThan(700);
      for (const field of await page.locator('.calculator-fields input').all()) expect((await field.boundingBox()).width).toBeGreaterThan(60);
    }
    const calculate = page.getByRole('button', { name: 'Calcular calorías', exact: true });
    await calculate.click();
    const result = page.getByLabel('Gasto diario estimado');
    await expect(result).toHaveText('2.899 kcal/día');
    await expect(page.locator('.macro-list')).toContainText('185 g');
    if (width < 700) {
      await expect(page.locator('#calorie-result-heading')).toBeFocused();
      const box = await result.boundingBox();
      expect(box.y).toBeGreaterThan(0);
      expect(box.y + box.height).toBeLessThan((await page.locator('.bottom-nav').boundingBox()).y);
    } else await expect(calculate).toBeFocused();
    await fits(page, width);
    await capture(page, 'calories', width);
    await page.getByRole('spinbutton', { name: 'Edad (años)' }).fill('17');
    await calculate.click();
    await expect(page.locator('.calculation-error')).toContainText('18 y 100');
    await expect(result).toHaveCount(0);
  }
  expect(await readDatabase(page, 'personal')).toEqual(before);
});

test('FT-009E respaldo: columnas legibles a 320px y cancelación intacta', async ({ page }) => {
  await open(page, 'perfil');
  await expect(page.locator('[data-import-personal]')).toBeVisible();
  const before = await readDatabase(page, 'personal');
  for (const width of [320, 390, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('[data-import-personal]').setInputFiles({ name: 'respaldo-sintetico.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backupFixture())) });
    const preview = dialog(page, 'Restaurar respaldo personal');
    await expect(preview).toBeVisible();
    await expect(preview.locator('thead th')).toHaveText(['Contenido', 'Actual', 'Respaldo']);
    const geometry = await preview.locator('.backup-preview').evaluate(table => {
      const headings = [...table.querySelectorAll('thead th')].map(th => {
        const range = document.createRange(); range.selectNodeContents(th);
        return { lines: range.getClientRects().length, text: range.getBoundingClientRect().toJSON(), cell: th.getBoundingClientRect().toJSON() };
      });
      return { headings, width: table.clientWidth, scroll: table.scrollWidth };
    });
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
    for (const th of geometry.headings) {
      expect(th.lines).toBe(1);
      expect(th.text.left).toBeGreaterThanOrEqual(th.cell.left);
      expect(th.text.right).toBeLessThanOrEqual(th.cell.right);
    }
    await capture(page, 'backup', width);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-import-personal]')).toBeFocused();
    expect(await readDatabase(page, 'personal')).toEqual(before);
  }
});

test('FT-009E catálogo y tipografía: tarjetas visibles, filtros, creación y navegación a 320/390px', async ({ page }) => {
  await open(page, 'ejercicios');
  await expect(page.locator('.exercise-card')).toHaveCount(72);
  for (const width of [320, 390, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    await fits(page, width);
    if (width < 600) {
      expect((await page.locator('.exercise-card').first().boundingBox()).y).toBeLessThan(460);
      const nav = page.getByRole('navigation', { name: 'Navegación móvil' });
      for (const label of await nav.locator('a span').all()) {
        expect(await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
        expect((await label.boundingBox()).height).toBeLessThanOrEqual(20);
      }
      const toggle = page.getByRole('button', { name: 'Filtros', exact: true });
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('combobox', { name: 'Grupo muscular', exact: true }).selectOption('Pecho');
      await expect(page.locator('.exercise-card')).toHaveCount(12);
      await toggle.click();
      await page.locator('.clear-filters').click();
      await expect(page.locator('.exercise-card')).toHaveCount(72);
    }
    await capture(page, 'catalog', width);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole('button', { name: 'Crear ejercicio', exact: true }).click();
  const editor = dialog(page, 'Crear ejercicio personalizado');
  await editor.getByLabel('Nombre', { exact: true }).fill('Ejercicio móvil de prueba');
  await editor.getByLabel('Músculo principal').selectOption('Espalda');
  await editor.getByLabel('Equipamiento', { exact: true }).fill('Banda');
  await editor.getByRole('button', { name: 'Guardar ejercicio' }).click();
  await expect(editor).not.toBeVisible();
  await expect(page.locator('.catalog-scope-note')).toContainText('modo personal');
  await page.getByRole('searchbox', { name: 'Buscar por nombre' }).fill('móvil de prueba');
  await expect(page.locator('.exercise-card')).toHaveCount(1);
  await selectMode(page, 'demo');
  await expect(page.locator('.catalog-scope-note')).toContainText('demostración');
  expect((await readDatabase(page, 'demo')).exercises).toHaveLength(0);
  for (const width of [320, 390, 1024, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['inicio', 'progreso', 'generador']) {
      await navigate(page, route);
      await expect(page.locator(route === 'generador' ? '.generator-help' : '.metric-detail').first()).toBeVisible();
      await fits(page, width);
      const small = await page.locator('.metric-detail, .card-caption, .chart-data, .history-chart figcaption, .stats-session small, .date-tile, .date-tile strong, .stats-record-list small, .muscle-list small, .generator-help, .generator-steps li').evaluateAll(nodes => nodes.filter(el => el.getClientRects().length).map(el => parseFloat(getComputedStyle(el).fontSize)));
      expect(small.every(size => size >= 12)).toBe(true);
      await capture(page, route, width);
    }
  }
});
