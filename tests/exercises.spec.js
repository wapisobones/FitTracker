import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { readDatabase, selectMode } from './helpers/storage.js';

async function openLibrary(page) {
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
}

test('Biblioteca base, búsqueda por nombre y filtros combinados sin duplicados', async ({ page }) => {
  await openLibrary(page);
  await expect(page.locator('.exercise-card')).toHaveCount(72);
  expect((await readDatabase(page, 'personal')).exercises).toHaveLength(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
  await expect(page.locator('.exercise-card')).toHaveCount(72);
  const filters = page.getByRole('search', { name: 'Buscar y filtrar ejercicios' });
  await filters.getByRole('searchbox', { name: 'Buscar por nombre' }).fill('PRESS');
  await expect(page.locator('.exercise-card')).toHaveCount(10);
  await filters.getByLabel('Grupo muscular').selectOption('Pecho');
  await expect(page.locator('.exercise-card')).toHaveCount(5);
  await filters.getByLabel('Equipamiento').selectOption('Barra y banco');
  await filters.getByLabel('Dificultad').selectOption('Intermedio');
  await expect(page.locator('.exercise-card h2')).toHaveText(['Press de banca']);
  await filters.getByLabel('Dificultad').selectOption('Principiante');
  await expect(page.getByRole('heading', { name: 'No hay ejercicios que coincidan' })).toBeVisible();
  await page.locator('.clear-filters').click();
  await expect(page.locator('.exercise-card')).toHaveCount(72);
  await filters.getByRole('searchbox').fill('biceps');
  await expect(page.locator('.exercise-card h2')).toHaveText(['Curl de bíceps', 'Curl de bíceps con barra', 'Curl de bíceps en polea']);
  await page.locator('.clear-filters').click();
  await page.locator('[data-muscle="Espalda"]').click();
  await filters.getByLabel('Equipamiento').selectOption('Polea');
  await expect(page.locator('.exercise-card')).toHaveCount(3);
  await page.locator('.clear-filters').click();
  await expect(page.locator('.exercise-card [data-edit-exercise], .exercise-card [data-delete-exercise]')).toHaveCount(0);
  await mkdir('.cache', { recursive: true });
  await page.screenshot({ path: '.cache/ft003-catalog-desktop.png', fullPage: true });
});

test('Personalizados: validación, escritura fallida recuperable, CRUD persistente y aislamiento', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: 'Crear ejercicio', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Crear ejercicio personalizado', exact: true });
  await editor.getByLabel('Nombre', { exact: true }).fill('  ');
  await editor.getByLabel('Músculo principal').selectOption('Espalda');
  await editor.getByLabel('Equipamiento', { exact: true }).fill('Banda elástica');
  await editor.getByRole('button', { name: 'Guardar ejercicio' }).click();
  await expect(editor.getByRole('alert')).toContainText('El nombre debe tener');
  expect((await readDatabase(page, 'personal')).exercises).toHaveLength(0);
  await editor.getByLabel('Nombre', { exact: true }).fill('<b>Remo propio</b>');
  await editor.getByLabel('Notas').fill('Pausa al tirar.\n<img src=x onerror=alert(1)>');
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    window.denyExerciseWrite = true;
    IDBObjectStore.prototype.add = function () {
      if (window.denyExerciseWrite && this.name === 'exercises') throw new DOMException('Prueba de cuota', 'QuotaExceededError');
      return add.apply(this, arguments);
    };
  });
  await editor.getByRole('button', { name: 'Guardar ejercicio' }).click();
  await expect(editor.getByRole('alert')).toContainText('No hay espacio suficiente');
  await expect(editor.getByLabel('Nombre', { exact: true })).toHaveValue('<b>Remo propio</b>');
  expect((await readDatabase(page, 'personal')).exercises).toHaveLength(0);
  await page.evaluate(() => { window.denyExerciseWrite = false; });
  await editor.getByRole('button', { name: 'Guardar ejercicio' }).click();
  await expect(editor).not.toBeVisible();
  await page.reload();
  const card = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name: '<b>Remo propio</b>', exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.locator('h2 b')).toHaveCount(0);
  const created = (await readDatabase(page, 'personal')).exercises[0];
  expect(created.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
  await card.getByRole('button', { name: 'Ver técnica de <b>Remo propio</b>', exact: true }).click();
  const technique = page.getByRole('dialog', { name: '<b>Remo propio</b>', exact: true });
  await expect(technique.locator('.exercise-notes')).toContainText('<img src=x onerror=alert(1)>');
  await expect(technique.locator('img')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await card.getByRole('button', { name: 'Editar <b>Remo propio</b>', exact: true }).click();
  const editing = page.getByRole('dialog', { name: 'Editar ejercicio personalizado', exact: true });
  await editing.getByLabel('Nombre', { exact: true }).fill('Remo con banda propio');
  await editing.getByLabel('Notas').fill('Mantener pausa.\nVolver con control.');
  await editing.getByRole('button', { name: 'Guardar ejercicio' }).click();
  await expect(editing).not.toBeVisible();
  const personalBefore = (await readDatabase(page, 'personal')).exercises;
  expect(personalBefore[0].id).toBe(created.id);
  expect(personalBefore[0].createdAt).toBe(created.createdAt);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Remo con banda propio', exact: true })).toBeVisible();

  await selectMode(page, 'demo');
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
  await expect(page.locator('.exercise-card')).toHaveCount(72);
  await expect(page.getByRole('heading', { name: 'Remo con banda propio', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Crear ejercicio', exact: true }).click();
  const demoEditor = page.getByRole('dialog', { name: 'Crear ejercicio personalizado', exact: true });
  await demoEditor.getByLabel('Nombre', { exact: true }).fill('Remo de prueba demo');
  await demoEditor.getByLabel('Músculo principal').selectOption('Espalda');
  await demoEditor.getByLabel('Equipamiento', { exact: true }).fill('Banda elástica');
  await demoEditor.getByRole('button', { name: 'Guardar ejercicio' }).click();
  await expect(demoEditor).not.toBeVisible();
  expect((await readDatabase(page, 'personal')).exercises).toEqual(personalBefore);
  const demoBefore = (await readDatabase(page, 'demo')).exercises;
  await selectMode(page, 'personal');
  await expect(page.getByRole('heading', { name: 'Remo con banda propio', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Remo de prueba demo', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Eliminar Remo con banda propio', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: '¿Eliminar ejercicio personalizado?', exact: true });
  await expect(confirm.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await confirm.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Remo con banda propio', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar Remo con banda propio', exact: true }).click();
  await confirm.getByRole('button', { name: 'Eliminar ejercicio', exact: true }).click();
  await expect(confirm).not.toBeVisible();
  await expect(page.locator('.exercise-card')).toHaveCount(72);
  expect((await readDatabase(page, 'personal')).exercises).toHaveLength(0);
  expect((await readDatabase(page, 'demo')).exercises).toEqual(demoBefore);
});

test('Catálogo móvil y técnica accesible, con recuperación de lectura de personalizados', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const getAll = IDBObjectStore.prototype.getAll;
    window.denyExerciseRead = true;
    IDBObjectStore.prototype.getAll = function () {
      if (window.denyExerciseRead && this.name === 'exercises') throw new DOMException('Prueba de lectura', 'SecurityError');
      return getAll.apply(this, arguments);
    };
  });
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('La biblioteca base sigue disponible');
  await expect(page.locator('.exercise-card')).toHaveCount(72);
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeDisabled();
  await page.evaluate(() => { window.denyExerciseRead = false; });
  await page.getByRole('button', { name: 'Reintentar carga', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Filtros', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Equipamiento', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filtros', exact: true }).click();
  await mkdir('.cache', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.cache/ft003-catalog-mobile.png', fullPage: true });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  const trigger = page.getByRole('button', { name: 'Ver técnica de Press de banca', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const modal = page.getByRole('dialog', { name: 'Press de banca', exact: true });
  await expect(modal).toBeVisible();
  await expect(modal.getByText('La demostración es una secuencia de dos fotografías, no un vídeo continuo.', { exact: true })).toBeVisible();
  await expect(modal.locator('video, iframe, .exercise-attribute')).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Añadir a rutina', exact: true })).toBeEnabled();
  await modal.evaluate((dialog) => { dialog.scrollTop = dialog.scrollHeight; });
  await expect(modal.getByRole('button', { name: 'Cerrar ventana', exact: true })).toBeInViewport();
  await modal.evaluate((dialog) => { dialog.scrollTop = 0; });
  await page.screenshot({ path: '.cache/ft003-technique-mobile.png' });
  for (let index = 0; index < 4; index++) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await modal.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
  await expect(modal).not.toBeVisible();
});
