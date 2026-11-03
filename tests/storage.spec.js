import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { DATABASES, DATA_STORES } from '../src/db/schema.js';
import { readDatabase, writeRecords, sentinelRecords, selectMode, requestReset } from './helpers/storage.js';

test('Primera visita personal, preferencia persistente y ausencia de semillas personales', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tu entrenamiento empieza aquí');
  await expect(page.getByRole('button', { name: 'Explorar demostración', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aún no tienes entrenamientos guardados' })).toBeVisible();
  const empty = await readDatabase(page, 'personal');
  expect(Object.keys(empty).sort()).toEqual([...DATA_STORES].sort());
  expect(Object.values(empty).every((records) => records.length === 0)).toBe(true);
  expect((await readDatabase(page, 'app')).settings[0].mode).toBe('personal');
  const databases = await page.evaluate(() => indexedDB.databases());
  expect(databases.some((database) => database.name === DATABASES.demo)).toBe(false);
  expect(databases.every((database) => database.version === 1)).toBe(true);
  await page.reload();
  await expect(page.locator('.current-mode')).toHaveText('Modo personal');
  await expect(page.locator('.metric-value')).toHaveText(['—', '—', '0 kg', '0']);
  await expect(page.locator('.load-chart, .muscle-figure, .demo-notice')).toHaveCount(0);
  await mkdir('.cache', { recursive: true });
  await page.screenshot({ path: '.cache/ft002-personal-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Cambiar modo', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '.cache/ft002-personal-mobile.png', fullPage: true });
});

test('Semilla idempotente, aislamiento y reset confirmado solo de la demo', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.locator('.current-mode')).toHaveText('Modo personal');
  await writeRecords(page, 'personal', sentinelRecords('personal'));
  const personalBefore = await readDatabase(page, 'personal');

  await selectMode(page, 'demo');
  await expect(page.locator('.demo-notice')).toBeVisible();
  const seeded = await readDatabase(page, 'demo');
  const custom = seeded.workouts.filter((workout) => workout.status === 'complete').at(-1);
  custom.entries.forEach((entry) => { entry.exercise.name = '<b>Demo persistida</b>'; });
  await writeRecords(page, 'demo', { workouts: [custom], settings: [{ id: 'dashboard-preview', data: { marker: 'Conservar vista previa antigua' } }] });
  const demoSaved = await readDatabase(page, 'demo');
  await page.reload();
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('all');
  await expect(page.getByRole('combobox', { name: 'Ejercicio del gráfico', exact: true })).toContainText('<b>Demo persistida</b>');
  await expect(page.locator('.metric-value b')).toHaveCount(0);
  expect(await readDatabase(page, 'demo')).toEqual(demoSaved);
  expect(await readDatabase(page, 'personal')).toEqual(personalBefore);

  await selectMode(page, 'personal');
  await expect(page.locator('.current-mode')).toHaveText('Modo personal');
  await expect(page.locator('.metric-value')).toHaveText(['—', '—', '0 kg', '0']);
  const demoBefore = await readDatabase(page, 'demo');
  const preferenceBefore = await readDatabase(page, 'app');
  const confirmation = await requestReset(page);
  await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await readDatabase(page, 'demo')).toEqual(demoBefore);
  const confirmed = await requestReset(page);
  await confirmed.getByRole('button', { name: 'Restablecer demostración', exact: true }).click();
  await expect(page.locator('.operation-status')).toContainText('Demostración restablecida');
  expect(await readDatabase(page, 'personal')).toEqual(personalBefore);
  expect(await readDatabase(page, 'app')).toEqual(preferenceBefore);
  const demoAfter = await readDatabase(page, 'demo');
  expect(demoAfter.settings.find((record) => record.id === 'history-demo-v1').status).toBe('seeded');
  expect(demoAfter.workouts).toHaveLength(18);
  expect(demoAfter.setRecords.length).toBeGreaterThan(200);
  expect(DATA_STORES.filter((name) => !['settings', 'workouts', 'setRecords'].includes(name)).every((name) => demoAfter[name].length === 0)).toBe(true);
  await page.reload();
  await expect(page.locator('.current-mode')).toHaveText('Modo personal');
  await expect(page.locator('.load-chart')).toHaveCount(0);
});

test('Errores al abrir y guardar no cambian de ámbito ni dejan cifras antiguas', async ({ page }) => {
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    const put = IDBObjectStore.prototype.put;
    window.denyOpen = true;
    IDBFactory.prototype.open = function (...args) {
      if (window.denyOpen) throw new DOMException('Bloqueado para la prueba', 'SecurityError');
      return open.apply(this, args);
    };
    IDBObjectStore.prototype.put = function (record) {
      if (window.denyPreference && record.id === 'active-mode') throw new DOMException('Cuota de prueba', 'QuotaExceededError');
      return put.apply(this, arguments);
    };
  });
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('No se pudo acceder');
  await expect(page.locator('.metric')).toHaveCount(0);
  await page.evaluate(() => { window.denyOpen = false; });
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await page.getByRole('button', { name: 'Explorar demostración', exact: true }).click();
  await expect(page.locator('.demo-notice')).toBeVisible();
  await page.evaluate(() => { window.denyPreference = true; });
  await selectMode(page, 'personal');
  await expect(page.getByRole('alert')).toContainText('No hay espacio suficiente');
  expect((await readDatabase(page, 'app')).settings[0].mode).toBe('demo');
  await expect(page.locator('.metric, .load-chart')).toHaveCount(0);
  await page.evaluate(() => { window.denyPreference = false; });
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.locator('.current-mode')).toHaveText('Modo personal');
  expect((await readDatabase(page, 'app')).settings[0].mode).toBe('personal');
  await expect(page.locator('.metric-value')).toHaveText(['—', '—', '0 kg', '0']);
});

test('Historial inválido conservado y reset atómico ante una escritura fallida', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explorar demostración', exact: true }).click();
  await expect(page.locator('.demo-notice')).toBeVisible();
  const broken = (await readDatabase(page, 'demo')).setRecords[0];
  broken.weightKg = 'Inválido';
  await writeRecords(page, 'demo', { setRecords: [broken], routines: sentinelRecords('demo').routines });
  await page.reload();
  await expect(page.locator('.stats-warning')).toContainText('Se omitieron 1 series');
  const before = await readDatabase(page, 'demo');
  await page.evaluate(() => {
    const clear = IDBObjectStore.prototype.clear;
    window.denyReset = true;
    IDBObjectStore.prototype.clear = function () {
      if (window.denyReset && this.name === 'routines') throw new DOMException('Fallo de prueba', 'QuotaExceededError');
      return clear.apply(this, arguments);
    };
  });
  const confirmation = await requestReset(page);
  await confirmation.getByRole('button', { name: 'Restablecer demostración', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No hay espacio suficiente');
  expect(await readDatabase(page, 'demo')).toEqual(before);
  await page.evaluate(() => { window.denyReset = false; });
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.locator('.demo-notice')).toBeVisible();
  await expect(page.locator('.metric')).toHaveCount(4);
  await expect(page.locator('.stats-warning')).toHaveCount(0);
  expect((await readDatabase(page, 'demo')).routines).toHaveLength(0);
});
