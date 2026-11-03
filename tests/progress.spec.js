import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { knownHistory, FIXED_NOW, benchId } from './helpers/history.js';
import { readDatabase, writeRecords, selectMode, requestReset } from './helpers/storage.js';

test.use({ timezoneId: 'America/Santiago' });
const value = (page, key) => page.locator(`[data-metric="${key}"] .metric-value`);
async function personal(page) {
  await page.clock.install({ time: new Date(FIXED_NOW) });
  await page.goto('./');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aún no tienes entrenamientos guardados', exact: true })).toBeVisible();
}

test('Dashboard y Progreso comparten cálculos, filtros, snapshots e historial accesible', async ({ page }) => {
  await personal(page);
  await writeRecords(page, 'personal', knownHistory());
  const before = await readDatabase(page, 'personal');
  await page.reload();
  await expect(value(page, 'top')).toHaveText('Press histórico');
  await expect(value(page, 'record')).toHaveText('60 kg');
  await expect(value(page, 'week-volume')).toHaveText('1.430 kg');
  await expect(value(page, 'week-sessions')).toHaveText('2');
  await expect(page.locator('.goals-card')).toContainText('2 / 3');
  await expect(page.locator('.goals-card')).toContainText('1.430 / 2.000 kg');
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('all');
  await expect(value(page, 'record')).toHaveText('80 kg');
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('month');
  await page.getByRole('combobox', { name: 'Ejercicio del gráfico', exact: true }).selectOption(benchId);
  await page.getByText('Ver datos del gráfico', { exact: true }).click();
  await expect(page.getByRole('table')).toContainText('60');
  await mkdir('.cache', { recursive: true });
  await page.screenshot({ path: '.cache/ft006-dashboard-desktop.png', fullPage: true });
  await page.locator('.sidebar [data-page="progreso"]').click();
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('month');
  await expect(value(page, 'volume')).toHaveText('1.430 kg');
  await expect(value(page, 'sessions')).toHaveText('2');
  await expect(value(page, 'sets')).toHaveText('4');
  await expect(page.locator('.stats-records')).toContainText('70 kg');
  await expect(page.locator('.stats-muscles')).toContainText('75 %');
  await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption(benchId);
  await expect(value(page, 'volume')).toHaveText('1.030 kg');
  await expect(value(page, 'sets')).toHaveText('3');
  await page.getByRole('button', { name: 'Historial', exact: true }).click();
  await page.locator('.stats-session summary').filter({ hasText: 'Parcial conocida' }).click();
  await expect(page.locator('.stats-session[open]')).toContainText('Serie 1: 60 kg × 5 reps');
  await expect(page.locator('.stats-session[open]')).not.toContainText('999');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Ejercicio', exact: true })).toHaveValue(benchId);
  await expect(page.getByRole('button', { name: 'Historial', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await readDatabase(page, 'personal')).toEqual(before);
  await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Resumen', exact: true }).click();
  await page.screenshot({ path: '.cache/ft006-progress-desktop.png', fullPage: true });
  for (const width of [320, 390, 768, 1024, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.cache/ft006-progress-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Fuerza por ejercicio', exact: true }).click();
  await page.getByRole('combobox', { name: 'Métrica de fuerza', exact: true }).selectOption('estimated1RM');
  await expect(page.locator('.history-chart')).toContainText('1RM estimado');
  await page.getByRole('button', { name: 'Volumen', exact: true }).click();
  await expect(page.locator('.stats-volume')).toBeVisible();
  await page.getByRole('button', { name: 'Grupos musculares', exact: true }).click();
  await expect(page.locator('.stats-donut')).toBeVisible();
});

test('Demo estructurada idempotente, cambios conservados, aislamiento y reset confirmado', async ({ page }) => {
  await personal(page);
  await writeRecords(page, 'personal', knownHistory());
  const personalBefore = await readDatabase(page, 'personal');
  await selectMode(page, 'demo');
  await expect(page.locator('.demo-notice')).toContainText('ficticio');
  const seeded = await readDatabase(page, 'demo');
  expect(seeded.workouts).toHaveLength(18);
  expect(seeded.setRecords.length).toBeGreaterThan(200);
  const modified = structuredClone(seeded);
  modified.workouts[0].sessionName = '<b>Mi sesión demo</b>';
  const record = modified.setRecords.find((set) => set.workoutId === modified.workouts[0].id);
  record.weightKg = 500;
  await writeRecords(page, 'demo', { workouts: modified.workouts, setRecords: modified.setRecords, settings: [...modified.settings, { id: 'dashboard-preview', data: { marker: 'Vista antigua modificada' } }] });
  const saved = await readDatabase(page, 'demo');
  await page.reload();
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('all');
  await expect(value(page, 'record')).toHaveText('500 kg');
  expect(await readDatabase(page, 'demo')).toEqual(saved);
  expect(await readDatabase(page, 'personal')).toEqual(personalBefore);
  const reset = await requestReset(page);
  await reset.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await readDatabase(page, 'demo')).toEqual(saved);
  const confirmed = await requestReset(page);
  await confirmed.getByRole('button', { name: 'Restablecer demostración', exact: true }).click();
  await expect(page.locator('.operation-status')).toContainText('restablecida');
  expect((await readDatabase(page, 'demo')).workouts).toHaveLength(18);
  expect(await readDatabase(page, 'personal')).toEqual(personalBefore);
  // Simulate an existing demo from before the structured-history seed. Its
  // records must be used as-is rather than merged with generated sessions.
  await page.evaluate((source) => new Promise((resolve, reject) => {
    const request = indexedDB.open('fittracker-demo');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['settings', 'workouts', 'setRecords'], 'readwrite');
      tx.objectStore('settings').delete('history-demo-v1');
      tx.objectStore('workouts').clear(); tx.objectStore('setRecords').clear();
      for (const record of source.workouts) tx.objectStore('workouts').add(record);
      for (const record of source.setRecords) tx.objectStore('setRecords').add(record);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
    request.onerror = () => reject(request.error);
  }), knownHistory());
  const legacy = await readDatabase(page, 'demo');
  await page.reload();
  await expect(page.locator('.demo-notice')).toBeVisible();
  const preserved = await readDatabase(page, 'demo');
  expect(preserved.workouts).toEqual(legacy.workouts);
  expect(preserved.setRecords).toEqual(legacy.setRecords);
  expect(preserved.settings.find((record) => record.id === 'history-demo-v1').status).toBe('preserved');
  expect(await readDatabase(page, 'personal')).toEqual(personalBefore);
});

test('Estados vacíos, error recuperable y nuevos registros visibles sin recarga completa', async ({ page }) => {
  await personal(page);
  await expect(value(page, 'week-volume')).toHaveText('0 kg');
  await expect(value(page, 'record')).toHaveText('—');
  await expect(page.locator('.goals-card')).toContainText('No hay objetivos');
  await page.locator('.sidebar [data-page="progreso"]').click();
  await expect(value(page, 'sets')).toHaveText('0');
  await page.evaluate(() => {
    const getAll = IDBObjectStore.prototype.getAll;
    window.failHistoryRead = true;
    IDBObjectStore.prototype.getAll = function () {
      if (window.failHistoryRead && this.name === 'setRecords') throw new DOMException('Prueba', 'SecurityError');
      return getAll.apply(this, arguments);
    };
  });
  await page.locator('.sidebar [data-page="inicio"]').click();
  await expect(page.getByRole('alert')).toContainText('No se pudo acceder');
  await page.evaluate(() => { window.failHistoryRead = false; });
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(value(page, 'week-sessions')).toHaveText('0');
  await writeRecords(page, 'personal', knownHistory());
  await page.locator('.sidebar [data-page="progreso"]').click();
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('month');
  await expect(value(page, 'sessions')).toHaveText('2');
  await page.locator('.sidebar [data-page="inicio"]').click();
  await expect(value(page, 'week-sessions')).toHaveText('2');
});
