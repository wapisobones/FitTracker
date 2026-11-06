import { test, expect } from '@playwright/test';
import { evolutionHistory, EVOLUTION_NOW, bench, deadbug, plank } from './helpers/evolution-history.js';
import { readDatabase, writeRecords } from './helpers/storage.js';

test.use({ timezoneId: 'America/Santiago' });
const action = (page, name) => page.getByRole('button', { name, exact: true });
const filter = (page, name) => page.getByRole('combobox', { name, exact: true });
const card = page => page.locator('.stats-strength');
const cells = page => card(page).locator('tbody td');

async function table(page, values, unit) {
  await card(page).locator('.chart-data summary').click();
  await expect(cells(page)).toHaveText(values);
  await expect(card(page).locator('.history-chart-unit')).toHaveText(unit);
}

for (const width of [320, 390]) test(`Evolución por snapshot, filtros, unidades e historial intacto a ${width}px`, async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 844 });
  await page.clock.install({ time: new Date(EVOLUTION_NOW) });
  await page.goto('./#/progreso');
  await action(page, 'Comenzar mi entrenamiento').click();
  await expect(page.getByRole('heading', { name: 'Aún no tienes entrenamientos guardados', exact: true })).toBeVisible();
  await writeRecords(page, 'personal', evolutionHistory());
  const before = await readDatabase(page, 'personal');
  await page.goto(`./#/progreso?ambito=personal&periodo=month&vista=strength&ejercicio=${bench}`);
  await expect(card(page).locator('h2')).toHaveText('Evolución de carga');
  await table(page, ['55', '60'], 'kg');
  await filter(page, 'Métrica de fuerza').selectOption('estimated1RM');
  await table(page, ['66', '73,5'], 'kg');
  await expect(card(page).locator('figcaption')).toContainText('1RM estimado');
  await expect(page.locator('[data-metric="volume"] .metric-value')).toHaveText('1.494 kg');
  // The strength metric remains selected, but cannot override reps or seconds.
  await filter(page, 'Ejercicio').selectOption(deadbug);
  await expect(card(page).locator('h2')).toHaveText('Evolución de repeticiones');
  await expect(filter(page, 'Métrica de fuerza')).toHaveCount(0);
  await table(page, ['12', '15'], 'reps');
  await expect(card(page)).not.toContainText('1RM');
  await expect(card(page)).not.toContainText('0 kg');
  await expect(page.locator('.stats-record-list')).toHaveCount(0);
  await page.screenshot({ path: `.cache/ft014a/repeticiones-${width}.png`, fullPage: true });
  await filter(page, 'Ejercicio').selectOption(plank);
  await expect(card(page).locator('h2')).toHaveText('Evolución de duración');
  await table(page, ['45', '60'], 's');
  await expect(card(page)).not.toContainText('1RM');
  await expect(card(page)).not.toContainText('0 kg');
  await page.screenshot({ path: `.cache/ft014a/segundos-${width}.png`, fullPage: true });
  for (const name of ['Período', 'Ejercicio', 'Modalidad del gráfico']) {
    const box = await filter(page, name).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  // Changing period leaves the selected snapshot modality stable.
  await filter(page, 'Período').selectOption('all');
  await table(page, ['45', '60'], 's');
  await filter(page, 'Modalidad del gráfico').selectOption('weight_reps');
  await expect(card(page).locator('h2')).toHaveText('Evolución de carga');
  await table(page, ['12,7'], 'kg');
  await expect(card(page).locator('figcaption')).toContainText('Un único registro; aún no hay una tendencia');
  await expect(card(page)).not.toContainText('Duración máxima diaria');
  await filter(page, 'Métrica de fuerza').selectOption('weight');
  await table(page, ['10'], 'kg');
  await page.reload();
  await expect(filter(page, 'Modalidad del gráfico')).toHaveValue('weight_reps');
  await expect(card(page).locator('h2')).toHaveText('Evolución de carga');
  await filter(page, 'Período').selectOption('month');
  await expect(card(page)).toContainText('No hay registros para este gráfico');
  await filter(page, 'Modalidad del gráfico').selectOption('duration');
  await table(page, ['45', '60'], 's');
  await action(page, 'Historial').click();
  await page.locator('.stats-session summary').first().click();
  await expect(page.locator('.stats-session[open]')).toContainText('Plan original: 1 series de 30–45 s');
  await expect(page.locator('.stats-session[open]')).toContainText('50 s');
  // A future period has no observations; the mode-specific empty state gives
  // no force/1RM advice for time, and the exercise selection is retained.
  await page.clock.setFixedTime(new Date('2026-12-06T15:00:00.000Z'));
  await page.goto(`./#/progreso?ambito=personal&periodo=month&vista=strength&ejercicio=${plank}`);
  await expect(card(page).locator('h2')).toHaveText('Evolución de duración');
  await expect(card(page)).toContainText('No hay registros para este gráfico');
  await expect(card(page)).not.toContainText('1RM');
  await filter(page, 'Período').selectOption('all');
  await table(page, ['45', '60'], 's');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  expect(await readDatabase(page, 'personal')).toEqual(before);
  // Preferences only convert weight; saved repetitions and seconds stay whole.
  if (width === 390) {
    await writeRecords(page, 'personal', { settings: [{ id: 'preferences', weightUnit: 'lb', updatedAt: EVOLUTION_NOW }] });
    const pounds = await readDatabase(page, 'personal');
    await page.goto(`./#/progreso?ambito=personal&periodo=all&vista=strength&ejercicio=${bench}`);
    await table(page, ['176,4', '121,3', '132,3'], 'lb');
    await filter(page, 'Métrica de fuerza').selectOption('estimated1RM');
    await table(page, ['145,5', '162'], 'lb');
    await filter(page, 'Ejercicio').selectOption(deadbug);
    await table(page, ['12', '15'], 'reps');
    await filter(page, 'Ejercicio').selectOption(plank);
    await table(page, ['45', '60'], 's');
    // Also keep the chart-only exercise filter functional in the summary.
    await filter(page, 'Ejercicio').selectOption('');
    await filter(page, 'Ejercicio del gráfico').selectOption(deadbug);
    await table(page, ['12', '15'], 'reps');
    expect(await readDatabase(page, 'personal')).toEqual(pounds);
  }
  expect(errors).toEqual([]);
});
