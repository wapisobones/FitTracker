import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { readDatabase, writeRecords } from './helpers/storage.js';
import { knownHistory, FIXED_NOW, benchId } from './helpers/history.js';

test.use({ timezoneId: 'America/Santiago' });
const map = (page) => page.locator('.stats-muscles .anatomy-map--informative');
const list = (page) => page.locator('.stats-muscles .muscle-list');
async function start(page, mode = 'personal', route = 'inicio') {
  await page.clock.install({ time: new Date(FIXED_NOW) });
  await page.goto(`./#/${route}`);
  await page.getByRole('button', { name: mode === 'demo' ? 'Explorar demostración' : 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
}
async function assertMap(page, activeGroups) {
  await expect(map(page)).toBeVisible();
  await expect(map(page)).toHaveAttribute('role', 'img');
  await expect(map(page)).toHaveAccessibleName(/grupos generales, no la activación de cada músculo/);
  await expect(map(page).locator('[tabindex], [role="button"], button, [aria-pressed], [data-map-muscle]')).toHaveCount(0);
  await expect(map(page).locator('svg')).toHaveCount(2);
  const active = await map(page).locator('[data-active="true"]').evaluateAll((regions) => [...new Set(regions.map((region) => region.dataset.muscleGroup))].sort());
  expect(active).toEqual([...activeGroups].sort());
  const fills = await map(page).locator('[data-active="true"] path').evaluateAll((paths) => [...new Set(paths.map((path) => getComputedStyle(path).fill))]);
  expect(fills).toEqual(['rgb(155, 244, 92)']);
}

test('FT-010B: demo, cifras conservadas, mapa informativo y responsive en Inicio y Progreso', async ({ page }) => {
  await start(page, 'demo');
  const before = await readDatabase(page, 'demo');
  // Independent count from persisted primary snapshots; no secondary muscles.
  const counts = new Map();
  for (const set of before.setRecords.filter((set) => set.completed)) {
    const workout = before.workouts.find((item) => item.id === set.workoutId && ['complete', 'partial'].includes(item.status));
    const entry = workout?.entries.find((item) => item.prescription.id === set.prescriptionId && item.exercise.id === set.exerciseId);
    if (entry) counts.set(entry.exercise.mainMuscle, (counts.get(entry.exercise.mainMuscle) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  expect(counts.size).toBe(6);
  await mkdir('.cache', { recursive: true });
  for (const width of [1536, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['inicio', 'progreso']) {
      await page.goto(`./#/${route}?ambito=demo&periodo=all${route === 'progreso' ? '&vista=muscles' : ''}`);
      await assertMap(page, [...counts.keys()]);
      await expect(list(page).locator('li')).toHaveCount(6);
      for (const [name, count] of counts) {
        const row = list(page).locator('li').filter({ has: page.locator('div > span', { hasText: new RegExp(`^${name}$`) }) });
        await expect(row.locator('small')).toHaveText(`${count} series`);
        await expect(row.locator('strong')).toHaveText(`${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(count / total * 100)} %`);
        const bar = await row.locator('.progress-track > span').evaluate((span) => Number.parseFloat(span.style.width));
        // CSSOM serializes widths with fewer digits than the source number.
        expect(bar).toBeCloseTo(count / total * 100, 3);
      }
      const geometry = await map(page).locator('svg').evaluateAll((figures) => figures.map((svg) => ({ height: svg.getBoundingClientRect().height, viewBox: svg.getAttribute('viewBox'), aspect: svg.getAttribute('preserveAspectRatio') })));
      for (const figure of geometry) {
        expect(figure.height).toBe(width <= 600 ? 200 : 240);
        expect(figure.viewBox).toBe('0 0 320 760');
        expect(figure.aspect).not.toBe('none');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const card = await page.locator('.stats-muscles').boundingBox();
      expect(card.height).toBeLessThan(620);
      await page.locator('.stats-muscles').screenshot({ path: `.cache/ft010b-${route}-${width}.png` });
    }
  }
  const url = page.url();
  const content = await list(page).innerText();
  await map(page).locator('[data-anatomy-region="pectorals"] path').first().click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  expect(page.url()).toBe(url);
  expect(await list(page).innerText()).toBe(content);
  await page.getByRole('button', { name: 'Resumen', exact: true }).click();
  await expect(page.locator('.stats-donut')).toBeVisible();
  await expect(map(page)).toHaveCount(0);
  expect(await readDatabase(page, 'demo')).toEqual(before);
});

test('FT-010B: vacío, varios grupos y un grupo, sin atribuir actividad secundaria ni cambiar historial', async ({ page }) => {
  await start(page);
  for (const route of ['inicio', 'progreso?ambito=personal&vista=muscles']) {
    await page.goto(`./#/${route}`);
    await expect(page.locator('.stats-muscles')).toContainText('Sin series completadas');
    await expect(map(page)).toHaveCount(0);
  }
  await writeRecords(page, 'personal', knownHistory());
  const before = await readDatabase(page, 'personal');
  for (const route of ['inicio', 'progreso']) {
    await page.goto(`./#/${route}?ambito=personal&periodo=month${route === 'progreso' ? '&vista=muscles' : ''}`);
    await assertMap(page, ['Pecho', 'Espalda']);
    await expect(list(page).locator('li strong')).toHaveText(['75 %', '25 %']);
    await expect(list(page).locator('li small')).toHaveText(['3 series', '1 series']);
    await expect(map(page).locator('[data-active="true"]')).toHaveCount(3);
  }
  await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption(benchId);
  await assertMap(page, ['Pecho']);
  await expect(list(page).locator('li strong')).toHaveText(['100 %']);
  await expect(list(page).locator('li small')).toHaveText(['3 series']);
  await expect(map(page).locator('[data-active="true"]')).toHaveCount(1);
  await expect(map(page).locator('[data-anatomy-region="triceps"]')).toHaveAttribute('data-active', 'false');
  await expect(page.locator('[data-metric="sets"] .metric-value')).toHaveText('3');
  expect(await readDatabase(page, 'personal')).toEqual(before);
});

test('FT-010B: Generador conserva IDs, selección bilateral, teclado y sincronización entre vistas', async ({ page }) => {
  await start(page, 'personal', 'generador');
  const biceps = page.locator('#map-front-biceps');
  await biceps.focus();
  await page.keyboard.press('Enter');
  await expect(biceps).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-generator-muscle="Brazos"]')).toHaveAttribute('aria-pressed', 'mixed');
  await expect(page.locator('#anatomy-front-biceps-right-1')).toHaveCSS('fill', 'rgb(155, 244, 92)');
  await expect(page.locator('#anatomy-front-biceps-left-1')).toHaveCSS('fill', 'rgb(155, 244, 92)');
  await page.keyboard.press('Space');
  await expect(biceps).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-generator-muscle="Hombros"]').click();
  const views = page.getByRole('group', { name: 'Vista del cuerpo', exact: true });
  await views.getByRole('button', { name: 'Espalda', exact: true }).click();
  await expect(page.locator('#map-back-lateral-deltoid')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#anatomy-back-lateral-deltoid-left-1').click();
  await expect(page.locator('[data-generator-region="lateral-deltoid"]')).toHaveAttribute('aria-pressed', 'false');
  await views.getByRole('button', { name: 'Frente', exact: true }).click();
  await expect(page.locator('#map-front-lateral-deltoid')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.generator-available-list')).not.toBeEmpty();
});
