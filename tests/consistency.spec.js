import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { backupFixture } from './helpers/backup.js';
import { readDatabase, writeRecords, selectMode, requestReset } from './helpers/storage.js';

async function personal(page, route = 'perfil') {
  await page.goto(`./#/${route}`);
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}
const leave = page => page.getByRole('dialog', { name: '¿Salir sin guardar el Perfil?', exact: true });

for (const unit of ['kg', 'lb']) {
  test(`Validación de series en ${unit}: campo, unidades y recuperación sin falsos errores de almacenamiento`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await personal(page);
    const fixture = backupFixture();
    fixture.stores.settings.find(item => item.id === 'preferences').weightUnit = unit;
    await writeRecords(page, 'personal', fixture.stores);
    await page.goto('./#/rutina-activa');
    await page.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
    const weight = page.getByRole('spinbutton', { name: `Peso en ${unit}, serie 1`, exact: true });
    const reps = page.getByRole('spinbutton', { name: 'Repeticiones, serie 1', exact: true });
    const complete = page.getByRole('button', { name: 'Completar serie 1', exact: true });
    const max = unit === 'kg' ? '2.000 kg' : '4.409,2452 lb';
    for (const value of ['', '-1', unit === 'kg' ? '2001' : '4410']) {
      await weight.fill(value);
      await complete.click();
      await expect(weight).toBeFocused();
      await expect(weight).toHaveAttribute('aria-invalid', 'true');
      await expect(weight).toHaveAccessibleDescription(new RegExp(max.replaceAll('.', '\\.')));
      await expect(page.locator('.set-validation')).toBeInViewport();
      await expect(page.locator('.workout-error')).toBeEmpty();
      await expect(page.getByRole('button', { name: 'Reintentar guardado', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Recargar entrenamiento', exact: true })).toHaveCount(0);
      if (unit === 'lb') await expect(page.locator('.set-validation')).not.toContainText('kg');
    }
    await weight.fill('100');
    await reps.fill('0');
    await complete.click();
    await expect(reps).toBeFocused();
    await expect(reps).toHaveAccessibleDescription(/repeticiones enteras entre 1 y 1000/);
    await mkdir('.cache', { recursive: true });
    await page.screenshot({ path: `.cache/ft009d-series-${unit}.png` });
    await reps.fill('8');
    await expect(reps).not.toHaveAttribute('aria-invalid');
    await complete.click();
    await expect(page.getByRole('button', { name: 'Desmarcar serie 1', exact: true })).toBeVisible();
    const saved = await readDatabase(page, 'personal');
    const active = saved.workouts.find(item => item.status === 'active');
    expect(active.entries[0].sets[0].weightKg).toBeCloseTo(unit === 'kg' ? 100 : 45.359237, 8);
    expect(active.entries[0].sets[0].completed).toBe(true);
    expect(saved.setRecords).toHaveLength(fixture.stores.setRecords.length);
    expect(saved.setRecords).toEqual(expect.arrayContaining(fixture.stores.setRecords));
    expect(saved.workouts.find(item => item.status === 'complete')).toEqual(fixture.stores.workouts.find(item => item.status === 'complete'));
  });
}

for (const width of [1536, 390]) {
  test(`Perfil pendiente a ${width}px: navegación, historial del navegador, modo y guardado explícito`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await personal(page, 'calculadora-1rm');
    await page.goto('./#/perfil');
    const before = await readDatabase(page, 'personal');
    const alias = page.getByRole('textbox', { name: 'Alias', exact: true });
    await alias.fill('Pendiente');
    await expect(page.locator('.profile-dirty')).toContainText('sin guardar');
    await page.goto('./#/calculadora-1rm');
    await expect(leave(page).getByRole('button', { name: 'Continuar editando', exact: true })).toBeFocused();
    await leave(page).getByRole('button', { name: 'Continuar editando', exact: true }).click();
    await expect(alias).toHaveValue('Pendiente');
    await expect(alias).toBeFocused();
    await expect(page).toHaveURL(/#\/perfil$/);
    await page.goBack();
    // Cancelling a hash navigation can leave two adjacent Perfil entries.
    if (!await leave(page).isVisible()) await page.goBack();
    await expect(leave(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(alias).toHaveValue('Pendiente');
    await selectMode(page, 'demo');
    await expect(leave(page)).toBeVisible();
    await leave(page).getByRole('button', { name: 'Continuar editando', exact: true }).click();
    await expect(page.locator('.current-mode')).toHaveText('Modo personal');
    expect(await readDatabase(page, 'personal')).toEqual(before);
    // Reverting the form clears the pending state without any writes.
    await alias.fill('');
    await expect(page.locator('.profile-dirty')).toBeEmpty();
    await page.goto('./#/calculadora-1rm');
    await expect(page.getByRole('button', { name: 'Calcular 1RM', exact: true })).toBeVisible();
    await page.goto('./#/perfil');
    await alias.fill('Guardado');
    await page.getByRole('spinbutton', { name: 'Sesiones por semana (opcional)' }).fill('4');
    await page.getByRole('combobox', { name: 'Unidades de peso', exact: true }).selectOption('lb');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.locator('.profile-feedback')).toContainText('guardados');
    await expect(page.locator('.profile-dirty')).toBeEmpty();
    await page.reload();
    await expect(alias).toHaveValue('Guardado');
    await expect(page.getByRole('combobox', { name: 'Unidades de peso', exact: true })).toHaveValue('lb');
    await expect(page.getByRole('spinbutton', { name: 'Sesiones por semana (opcional)' })).toHaveValue('4');
    const saved = await readDatabase(page, 'personal');
    await alias.fill('Descartable');
    await selectMode(page, 'demo');
    await expect(leave(page)).toBeVisible();
    await mkdir('.cache', { recursive: true });
    await page.screenshot({ path: `.cache/ft009d-profile-${width}.png` });
    await leave(page).getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await expect(page.locator('.current-mode')).toHaveText('Demostración');
    expect(await readDatabase(page, 'personal')).toEqual(saved);
    await selectMode(page, 'personal');
    await expect(alias).toHaveValue('Guardado');
    await alias.fill('Otra edición');
    await page.goto('./#/calculadora-1rm');
    await leave(page).getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Calcular 1RM', exact: true })).toBeVisible();
    expect(await readDatabase(page, 'personal')).toEqual(saved);
  });
}

test('Perfil: advertencia nativa al recargar y unidad pendiente sin guardado automático', async ({ page }) => {
  await personal(page);
  const before = await readDatabase(page, 'personal');
  await page.getByRole('combobox', { name: 'Unidades de peso', exact: true }).selectOption('lb');
  await page.goto('./#/calculadora-1rm');
  await expect(leave(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox', { name: 'Unidades de peso', exact: true })).toHaveValue('lb');
  // Give the page a real user activation before testing the native browser guard.
  await page.getByRole('textbox', { name: 'Alias', exact: true }).click();
  const warning = page.waitForEvent('dialog');
  // A cancelled reload has no load event to wait for.
  await page.evaluate(() => { setTimeout(() => location.reload(), 0); });
  const dialog = await warning;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(page.getByRole('combobox', { name: 'Unidades de peso', exact: true })).toHaveValue('lb');
  expect(await readDatabase(page, 'personal')).toEqual(before);
});

test('Textos actuales y aviso de éxito cerrable y retirado por navegación', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.welcome-view')).toContainText('registra tus series');
  await expect(page.locator('.welcome-view')).not.toContainText('cuando estén disponibles');
  await page.getByRole('button', { name: 'Explorar demostración', exact: true }).click();
  await expect(page.locator('.search-preview input')).toBeDisabled();
  await expect(page.locator('.search-preview')).toHaveAttribute('title', /buscar ejercicios dentro del catálogo/);
  await page.getByRole('button', { name: 'Cambiar modo', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cambiar modo', exact: true })).toContainText('respaldo personal JSON desde Perfil');
  await page.keyboard.press('Escape');
  let reset = await requestReset(page);
  await reset.getByRole('button', { name: 'Restablecer demostración', exact: true }).click();
  await expect(page.locator('.operation-status')).toContainText('Los datos personales se conservaron');
  await page.getByRole('button', { name: 'Cerrar aviso', exact: true }).click();
  await expect(page.locator('.operation-notice')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Cambiar modo', exact: true })).toBeFocused();
  reset = await requestReset(page);
  await reset.getByRole('button', { name: 'Restablecer demostración', exact: true }).click();
  await expect(page.locator('.operation-status')).toContainText('restablecida');
  await page.locator('.sidebar [data-page="calculadora-1rm"]').click();
  await expect(page.locator('.operation-status')).toBeEmpty();
  await expect(page.locator('.operation-notice')).toBeHidden();
  await expect(page.locator('.current-mode')).toHaveText('Demostración');
});

test('Un respaldo personal no borra cambios pendientes del formulario demo', async ({ page }) => {
  await personal(page);
  await selectMode(page, 'demo');
  const before = await readDatabase(page, 'demo');
  const alias = page.getByRole('textbox', { name: 'Alias', exact: true });
  await alias.fill('Edición demo pendiente');
  const backup = backupFixture();
  await page.locator('[data-import-personal]').setInputFiles({ name: 'sintetico.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('dialog', { name: 'Restaurar respaldo personal', exact: true }).getByRole('button', { name: 'Reemplazar datos personales', exact: true }).click();
  await expect(page.locator('.profile-feedback')).toContainText('Respaldo restaurado');
  await expect(alias).toHaveValue('Edición demo pendiente');
  await expect(page.locator('.profile-dirty')).toContainText('sin guardar');
  expect(await readDatabase(page, 'demo')).toEqual(before);
  await page.goto('./#/calculadora-1rm');
  await expect(leave(page)).toBeVisible();
  await leave(page).getByRole('button', { name: 'Descartar cambios', exact: true }).click();
  await selectMode(page, 'personal');
  await page.goto('./#/perfil');
  await expect(alias).toHaveValue('Deportista de prueba');
});

test('Generador: singular y frecuencia efectiva con memoria del programa', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await personal(page, 'generador');
  const modality = page.getByRole('combobox', { name: 'Modalidad', exact: true });
  const frequency = page.getByRole('combobox', { name: 'Sesiones por semana', exact: true });
  await expect(frequency).toBeDisabled();
  await expect(frequency).toHaveValue('1');
  await modality.selectOption('program');
  await expect(frequency).toHaveValue('3');
  await frequency.selectOption('4');
  await modality.selectOption('session');
  await expect(frequency).toBeDisabled();
  await expect(frequency).toHaveValue('1');
  await page.locator('[data-generator-muscle="Pecho"]').click();
  await expect(page.locator('.generator-match-count')).toContainText('1 compatible');
  const before = await readDatabase(page, 'personal');
  await page.getByRole('button', { name: 'Generar propuesta', exact: true }).click();
  await expect(page.locator('.generator-proposal-facts')).toContainText('1 sesión');
  await expect(page.locator('.generator-proposal-facts')).toContainText('1 ejercicio planificado');
  await expect(page.locator('.routine-meta')).toContainText('1 sesión en secuencia');
  await expect(page.locator('.session-heading')).toContainText('1 ejercicio');
  await expect(page.locator('.generator-result')).not.toContainText('1 sesiones');
  await expect(page.locator('.generator-result')).not.toContainText('1 ejercicios');
  expect(await readDatabase(page, 'personal')).toEqual(before);
  await mkdir('.cache', { recursive: true });
  await page.screenshot({ path: '.cache/ft009d-generator-mobile.png' });
  await modality.selectOption('program');
  await expect(frequency).toHaveValue('4');
  await expect(page.locator('.session-tabs button')).toHaveCount(1);
  await page.goto('./#/calculadora-1rm');
  await page.goto('./#/generador');
  await expect(frequency).toHaveValue('4');
  await expect(page.locator('.session-tabs button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
  await expect(page.locator('.generator-saved')).toContainText('1 sesión.');
  await page.getByRole('link', { name: 'Ver en Mis rutinas', exact: true }).click();
  await expect(page.locator('.routine-list-card')).toContainText('1 sesión');
  await expect(page.locator('.routine-list-card')).toContainText('1 ejercicio planificado');
  await expect(page.getByRole('link', { name: 'Iniciar sesión', exact: true })).toHaveCount(1);
});
