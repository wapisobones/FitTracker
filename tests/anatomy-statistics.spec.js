import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { readDatabase, writeRecords } from './helpers/storage.js';
import { FIXED_NOW, benchId } from './helpers/history.js';
import { heatmapHistory } from './helpers/muscle-heatmap.js';
import { normalizeHistory, calculate, periodBounds } from '../src/features/progress/metrics.js';
import { heatmapDays, muscleHeat } from '../src/features/progress/muscle-heatmap.js';
import { MUSCLE_GROUPS } from '../src/data/exercises.js';

process.env.TZ = 'America/Santiago';
test.use({ timezoneId: 'America/Santiago' });
const now = new Date(FIXED_NOW);
const map = (page) => page.locator('.stats-muscles .anatomy-map--informative');
const list = (page) => page.locator('.stats-muscles .muscle-list');
const fills = { none: 'rgb(140, 149, 159)', low: 'rgb(155, 244, 92)', medium: 'rgb(255, 194, 68)', high: 'rgb(248, 113, 113)' };
async function start(page, mode = 'personal', route = 'inicio') {
  await page.clock.install({ time: now });
  await page.goto(`./#/${route}`);
  await page.getByRole('button', { name: mode === 'demo' ? 'Explorar demostración' : 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
}
async function assertMap(page, stats, days) {
  await expect(map(page)).toBeVisible();
  await expect(map(page)).toHaveAttribute('role', 'img');
  await expect(map(page)).toHaveAccessibleName(/grupos generales, no la activación de cada músculo/);
  await expect(map(page).locator('[tabindex], [role="button"], button, [aria-pressed], [data-map-muscle]')).toHaveCount(0);
  await expect(map(page).locator('svg')).toHaveCount(2);
  const groups = new Map(stats.muscles.map((group) => [group.name, group.count]));
  for (const name of MUSCLE_GROUPS) {
    const count = groups.get(name) ?? 0;
    const heat = muscleHeat(count, days);
    const regions = map(page).locator(`[data-muscle-group="${name}"]`);
    const levels = await regions.evaluateAll((nodes) => [...new Set(nodes.map((node) => node.dataset.heatLevel))]);
    expect(levels).toEqual([heat.level]);
    await expect(regions.locator('path').first()).toHaveCSS('fill', fills[heat.level]);
    await expect(map(page)).toHaveAccessibleName(new RegExp(`${name}: ${count} series`));
  }
  await expect(list(page).locator('li')).toHaveCount(stats.muscles.length);
  for (const group of stats.muscles) {
    const row = list(page).locator('li').filter({ has: page.locator('div > span', { hasText: new RegExp(`^${group.name}$`) }) });
    await expect(row.locator('small')).toHaveText(`${group.count} series`);
    await expect(row.locator('strong')).toHaveText(`${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(group.percent)} %`);
    await expect(row.locator('.muscle-heat-level')).toContainText(muscleHeat(group.count, days).label);
    expect(await row.locator('.progress-track > span').evaluate((span) => Number.parseFloat(span.style.width))).toBeCloseTo(group.percent, 3);
  }
  await expect(page.locator('.muscle-heat-legend > span')).toHaveCount(4);
}

for (const width of [1536, 390, 320]) {
  test(`FT-012C ${width}px: colores, últimos siete días, períodos y filtros conservados`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await start(page);
    const source = heatmapHistory();
    await writeRecords(page, 'personal', source);
    const before = await readDatabase(page, 'personal');
    const history = normalizeHistory(source);
    const weekly = calculate(history, { period: '7', now });
    await page.goto('./#/inicio?ambito=personal&periodo=all');
    await assertMap(page, weekly, 7);
    await expect(page.locator('.stats-muscles')).toContainText('Últimos 7 días');
    await expect(page.locator('.muscle-heat-legend')).toContainText('Bajo: 1–5');
    const content = await list(page).innerText();
    await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('week');
    await assertMap(page, weekly, 7);
    expect(await list(page).innerText()).toBe(content);
    await mkdir('.cache/ft012c', { recursive: true });
    await page.locator('.stats-muscles').screenshot({ path: `.cache/ft012c/inicio-${width}.png` });

    await page.goto('./#/progreso?ambito=personal&periodo=30&vista=muscles');
    const periods = width === 1536 ? ['30', '90', 'all', 'month', 'week'] : ['30', 'all'];
    for (const period of periods) {
      await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption(period);
      const stats = calculate(history, { period, now });
      const days = heatmapDays(periodBounds(period, now), history.rows[0].date);
      await assertMap(page, stats, days);
      await expect(page.locator('[data-metric="sets"] .metric-value')).toHaveText(String(stats.totalSets));
      if (days > 7) await expect(page.locator('.muscle-heat-scale')).toContainText(`series × 7 / ${days} días`);
    }
    await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('all');
    const days = heatmapDays(periodBounds('all', now), history.rows[0].date);
    await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption(benchId);
    await assertMap(page, calculate(history, { period: 'all', now, exerciseId: benchId }), days);
    await expect(map(page).locator('[data-anatomy-region="triceps"]')).toHaveAttribute('data-heat-level', 'none');
    await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('');
    await page.locator('.stats-muscles').screenshot({ path: `.cache/ft012c/progreso-${width}.png` });
    const geometry = await map(page).locator('svg').evaluateAll((figures) => figures.map((svg) => ({ height: svg.getBoundingClientRect().height, viewBox: svg.getAttribute('viewBox'), aspect: svg.getAttribute('preserveAspectRatio') })));
    for (const figure of geometry) {
      expect(figure.height).toBe(width <= 600 ? 200 : 240);
      expect(figure.viewBox).toBe('0 0 320 760');
      expect(figure.aspect).not.toBe('none');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const url = page.url();
    await map(page).locator('[data-anatomy-region="pectorals"] path').first().click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(page.url()).toBe(url);
    await page.getByRole('button', { name: 'Resumen', exact: true }).click();
    await expect(page.locator('.stats-donut')).toBeVisible();
    await expect(map(page)).toHaveCount(0);
    await expect(page.locator('.muscle-heat-legend')).toHaveCount(0);
    expect(await readDatabase(page, 'personal')).toEqual(before);
    expect(errors).toEqual([]);
  });
}

test('FT-012C: historial vacío muestra todas las zonas neutras con leyenda y sin actividad ficticia', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await start(page);
  const before = await readDatabase(page, 'personal');
  for (const route of ['inicio', 'progreso?ambito=personal&vista=muscles']) {
    await page.goto(`./#/${route}`);
    await assertMap(page, { muscles: [] }, 7);
    await expect(map(page).locator('[data-active="true"]')).toHaveCount(0);
    await expect(page.locator('.stats-muscles')).toContainText('Sin series completadas');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
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
