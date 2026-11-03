import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { readDatabase, writeRecords, selectMode } from './helpers/storage.js';

const bench = 'c1700000-0000-4000-8000-000000000001';
const row = 'c1700000-0000-4000-8000-000000000006';
const modal = (page, name) => page.getByRole('dialog', { name, exact: true });
const weight = (page, number) => page.getByRole('spinbutton', { name: `Peso en kg, serie ${number}`, exact: true });
const reps = (page, number) => page.getByRole('spinbutton', { name: `Repeticiones, serie ${number}`, exact: true });

async function fixture(page) {
  await page.goto('./#/mis-rutinas');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear rutina', exact: true })).toBeEnabled();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const prescription = (exerciseId, sets, order) => ({ id: crypto.randomUUID(), exerciseId, sets, order, repsMin: 6, repsMax: 8, restSeconds: 90, notes: 'Movimiento controlado.' });
  const sessions = ['Sesión A', 'Sesión B'].map((name, order) => ({ id: crypto.randomUUID(), routineId: id, name, order, prescriptions: order ? [prescription(bench, 2, 0)] : [prescription(bench, 2, 0), prescription(row, 1, 1)], createdAt: now, updatedAt: now }));
  const routine = { id, name: 'Ciclo de prueba', description: '', origin: 'manual', revision: 1, sessionIds: sessions.map((session) => session.id), nextSessionId: sessions[0].id, cyclePolicy: 'sequential-wrap', createdAt: now, updatedAt: now };
  await writeRecords(page, 'personal', { routines: [routine], routineSessions: sessions });
  await page.reload();
  await expect(page.locator('.routine-detail h2')).toHaveText('Ciclo de prueba');
  return { routine, sessions };
}

async function start(page, session) {
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  if (session) await page.getByRole('combobox', { name: 'Sesión', exact: true }).selectOption({ label: session });
  await page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true }).click();
  await expect(page.locator('.workout-session h2')).toHaveText('Ciclo de prueba');
}

async function complete(page, position, kg = '60', repetitions = '8') {
  await weight(page, position).fill(kg);
  await reps(page, position).fill(repetitions);
  await page.getByRole('button', { name: `Completar serie ${position}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Desmarcar serie ${position}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
}

async function finish(page, partial = false) {
  await page.getByRole('button', { name: 'Finalizar entrenamiento', exact: true }).click();
  await modal(page, 'Guardar entrenamiento').getByRole('button', { name: partial ? 'Guardar parcial' : 'Guardar completo', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Entrenamiento ${partial ? 'parcial' : 'completo'} guardado`, exact: true })).toBeVisible();
}

test('Inicio desde rutina, validación, persistencia, snapshots y ciclo completo con referencias', async ({ page }) => {
  const { routine, sessions } = await fixture(page);
  await start(page);
  await expect(weight(page, 1)).toHaveValue('');
  await expect(reps(page, 1)).toHaveValue('');
  await page.getByRole('button', { name: 'Completar serie 1', exact: true }).click();
  await expect(page.locator('.workout-error')).toContainText('Introduce un peso');
  await complete(page, 1);
  await expect(page.locator('#register-heading')).toHaveText('Press de banca');
  await mkdir('.cache', { recursive: true });
  await page.screenshot({ path: '.cache/ft005-active-desktop.png', fullPage: true });
  await weight(page, 2).fill('62.5');
  await reps(page, 2).fill('7');
  await expect(page.locator('.workout-feedback')).toContainText('Cambios guardados');
  const beforeReload = await readDatabase(page, 'personal');
  expect(beforeReload.setRecords).toHaveLength(0);
  expect(beforeReload.workouts[0].entries[0].sets[0].completed).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tienes una sesión pendiente' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
  await expect(weight(page, 2)).toHaveValue('62.5');
  await expect(reps(page, 2)).toHaveValue('7');
  await page.getByRole('button', { name: 'Completar serie 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Desmarcar serie 2', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente ejercicio', exact: true }).click();
  await expect(page.locator('#register-heading')).toHaveText('Remo en polea');
  await complete(page, 1, '30', '10');
  // Editing the plan during training cannot rewrite the captured prescription.
  await writeRecords(page, 'personal', { routineSessions: [{ ...sessions[0], name: 'Plan editado', prescriptions: sessions[0].prescriptions.map((item) => ({ ...item, repsMax: 12 })) }] });
  await finish(page);
  const first = await readDatabase(page, 'personal');
  expect(first.setRecords).toHaveLength(3);
  expect(first.workouts[0].sessionName).toBe('Sesión A');
  expect(first.workouts[0].entries[0].prescription.repsMax).toBe(8);
  expect(first.routines[0].nextSessionId).toBe(sessions[1].id);
  await page.getByRole('link', { name: 'Elegir otra sesión', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Sesión', exact: true })).toHaveValue(sessions[1].id);
  await page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true }).click();
  await expect(weight(page, 1)).toHaveValue('60');
  await expect(weight(page, 2)).toHaveValue('62.5');
  await expect(reps(page, 2)).toHaveValue('7');
  await expect(page.locator('.workout-reference-note')).toContainText('referencias editables');
  await expect(page.getByRole('button', { name: 'Completar serie 1', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await complete(page, 1, '60', '8');
  await complete(page, 2, '60', '8');
  await finish(page);
  const second = await readDatabase(page, 'personal');
  expect(second.routines[0].nextSessionId).toBe(sessions[0].id);
  expect(second.workouts.find((item) => item.id === first.workouts[0].id)).toEqual(first.workouts[0]);
  expect(second.setRecords.filter((item) => item.workoutId === first.workouts[0].id)).toEqual(first.setRecords);
  expect(second.routines[0].id).toBe(routine.id);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Entrenamiento completo guardado', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver progreso', exact: true }).click();
  await expect(page.locator('[data-metric="volume"] .metric-value')).toHaveText('2.177,5 kg');
  await page.goto('./#/inicio');
  await expect(page.locator('[data-metric="week-volume"] .metric-value')).toHaveText('2.177,5 kg');
  await expect(page.locator('[data-metric="week-sessions"] .metric-value')).toHaveText('2');
  await page.locator('.sidebar [data-page="progreso"]').click();
  await expect(page.locator('[data-metric="volume"] .metric-value')).toHaveText('2.177,5 kg');
  await expect(page.locator('[data-metric="sets"] .metric-value')).toHaveText('5');
});

test('Elección manual, parcial con solo series realizadas, descarte confirmado y recuperación visible', async ({ page }) => {
  const { sessions } = await fixture(page);
  await start(page, 'Sesión B');
  await weight(page, 1).fill('25');
  await reps(page, 1).fill('0');
  await page.getByRole('button', { name: 'Completar serie 1', exact: true }).click();
  await expect(page.locator('.workout-error')).toContainText('repeticiones enteras');
  await complete(page, 1, '25', '9');
  await weight(page, 2).fill('99');
  await reps(page, 2).fill('9');
  await page.getByRole('button', { name: 'Finalizar entrenamiento', exact: true }).click();
  await expect(modal(page, 'Guardar entrenamiento').getByRole('button', { name: 'Guardar completo', exact: true })).toBeDisabled();
  await modal(page, 'Guardar entrenamiento').getByRole('button', { name: 'Guardar parcial', exact: true }).click();
  await expect(page.locator('.workout-result h2')).toHaveText('Entrenamiento parcial guardado');
  const partial = await readDatabase(page, 'personal');
  expect(partial.routines[0].nextSessionId).toBe(sessions[0].id);
  expect(partial.setRecords).toHaveLength(1);
  expect(partial.setRecords[0].weightKg).toBe(25);
  expect(partial.workouts[0].entries[0].sets).toHaveLength(1);
  expect(partial.workouts[0].entries[0].prescription.sets).toBe(2);
  await page.getByRole('link', { name: 'Elegir otra sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true }).click();
  await expect(weight(page, 1)).toHaveValue('25');
  await expect(weight(page, 2)).toHaveValue('');
  await page.goto('./#/mis-rutinas');
  await expect(page.getByRole('link', { name: 'Continuar sesión', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Continuar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar entrenamiento', exact: true }).click();
  await expect(modal(page, '¿Descartar entrenamiento?').getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await modal(page, '¿Descartar entrenamiento?').getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await readDatabase(page, 'personal')).workouts).toHaveLength(2);
  await page.getByRole('button', { name: 'Descartar entrenamiento', exact: true }).click();
  await modal(page, '¿Descartar entrenamiento?').getByRole('button', { name: 'Confirmar descarte', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true })).toBeVisible();
  const after = await readDatabase(page, 'personal');
  expect(after.workouts).toEqual(partial.workouts);
  expect(after.setRecords).toEqual(partial.setRecords);
  expect(after.routines).toEqual(partial.routines);
  await page.goto('./#/inicio');
  await expect(page.locator('[data-metric="week-volume"] .metric-value')).toHaveText('225 kg');
  await expect(page.locator('[data-metric="week-sessions"] .metric-value')).toHaveText('1');
});

test('Móvil: descanso por timestamps, pausa, recarga, navegación manual y corrección de serie', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await start(page);
  await page.locator('[data-workout-exercise="0"]').click();
  await expect(page.locator('#register-heading')).toBeVisible();
  await complete(page, 1, '40', '8');
  await expect(page.getByLabel('Tiempo de descanso restante')).toHaveText(/01:[2345]\d/);
  const started = (await readDatabase(page, 'personal')).workouts[0];
  const expires = started.timer.endsAt;
  await page.reload();
  await page.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
  expect((await readDatabase(page, 'personal')).workouts[0].timer.endsAt).toBe(expires);
  await page.getByRole('button', { name: 'Pausar descanso', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reanudar descanso', exact: true })).toBeEnabled();
  const paused = (await readDatabase(page, 'personal')).workouts[0].timer.remainingMs;
  await page.reload();
  await page.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
  expect((await readDatabase(page, 'personal')).workouts[0].timer.remainingMs).toBe(paused);
  await page.getByRole('button', { name: 'Reanudar descanso', exact: true }).click();
  await page.getByRole('button', { name: 'Omitir descanso', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciar descanso', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar descanso', exact: true }).click();
  await page.getByRole('button', { name: 'Desmarcar serie 1', exact: true }).click();
  await expect(weight(page, 1)).toBeEnabled();
  await complete(page, 1, '42.5', '7');
  await page.getByRole('button', { name: 'Siguiente ejercicio', exact: true }).click();
  await expect(page.locator('#register-heading')).toHaveText('Remo en polea');
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(weight(page, 1)).toHaveValue('42.5');
  await mkdir('.cache', { recursive: true });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.cache/ft005-register-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Ver rutina', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reanudar sesión', exact: true })).toBeEnabled();
  const sessionPaused = (await readDatabase(page, 'personal')).workouts[0];
  expect(sessionPaused.status).toBe('paused');
  expect(sessionPaused.timer.status).toBe('paused');
  await page.goto('./#/inicio');
  await expect(page.locator('[data-metric="week-volume"] .metric-value')).toHaveText('0 kg');
  await page.goto('./#/rutina-activa');
  await page.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
  await expect(weight(page, 2)).toBeEnabled();
  expect((await readDatabase(page, 'personal')).workouts[0].status).toBe('active');
  await page.getByRole('button', { name: 'Ver rutina', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.cache/ft005-overview-mobile.png', fullPage: true });
});

test('Un único activo entre pestañas, conflicto de revisión e aislamiento demo/personal', async ({ page, context }) => {
  await fixture(page);
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true })).toBeEnabled();
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByRole('button', { name: 'Iniciar entrenamiento', exact: true })).toBeEnabled();
  await Promise.all([page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true }).click(), other.getByRole('button', { name: 'Iniciar entrenamiento', exact: true }).click()]);
  expect((await readDatabase(page, 'personal')).workouts).toHaveLength(1);
  for (const tab of [page, other]) {
    if (await tab.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).isVisible()) await tab.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
  }
  await complete(page, 1, '55', '8');
  await other.getByRole('button', { name: 'Pausar sesión', exact: true }).click();
  await expect(other.locator('.workout-error')).toContainText('otra pestaña');
  await other.getByRole('button', { name: 'Recargar entrenamiento', exact: true }).click();
  await other.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
  await expect(weight(other, 1)).toHaveValue('55');
  await weight(page, 2).fill('56');
  await expect(page.locator('.workout-feedback')).toContainText('Cambios guardados');
  await weight(other, 2).fill('57');
  await expect(other.locator('.workout-error')).toContainText('otra pestaña');
  await other.getByRole('button', { name: 'Recargar entrenamiento', exact: true }).click();
  await expect(modal(other, '¿Recargar entrenamiento?').getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await modal(other, '¿Recargar entrenamiento?').getByRole('button', { name: 'Recargar versión guardada', exact: true }).click();
  await other.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
  await expect(weight(other, 2)).toHaveValue('56');
  await other.close();
  const personal = await readDatabase(page, 'personal');
  await selectMode(page, 'demo');
  await expect(page.getByRole('heading', { name: 'Prepara tu primer entrenamiento' })).toBeVisible();
  await page.goto('./#/predisenadas');
  await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
  await page.getByRole('link', { name: 'Ver copia en Mis rutinas', exact: true }).click();
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true }).click();
  await expect(page.locator('.workout-session h2')).toHaveText('Full body básico');
  await expect(weight(page, 1)).toHaveValue('');
  await complete(page, 1, '10', '10');
  expect(await readDatabase(page, 'personal')).toEqual(personal);
  await selectMode(page, 'personal');
  await page.getByRole('button', { name: 'Continuar entrenamiento', exact: true }).click();
  await expect(weight(page, 1)).toHaveValue('55');
});

test('Fallo de almacenamiento: reintento de borrador y rollback de cierre, series y ciclo', async ({ page }) => {
  const { sessions } = await fixture(page);
  await start(page, 'Sesión B');
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    window.failDraft = true;
    IDBObjectStore.prototype.put = function () {
      if (window.failDraft && this.name === 'workouts') throw new DOMException('Prueba', 'QuotaExceededError');
      return put.apply(this, arguments);
    };
  });
  await weight(page, 1).fill('50');
  await expect(page.locator('.workout-error')).toContainText('No hay espacio suficiente');
  await reps(page, 1).fill('8');
  expect((await readDatabase(page, 'personal')).workouts[0].entries[0].sets[0].weightKg).toBe('');
  await page.locator('.sidebar [data-page="mis-rutinas"]').click();
  await expect(page.locator('.workout-feedback')).toContainText('antes de salir');
  await expect(weight(page, 1)).toHaveValue('50');
  expect(new URL(page.url()).hash).toContain('/rutina-activa');
  await page.evaluate(() => { window.failDraft = false; });
  await page.getByRole('button', { name: 'Reintentar guardado', exact: true }).click();
  await expect(page.locator('.workout-feedback')).toContainText('Cambios guardados');
  await page.getByRole('button', { name: 'Completar serie 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Desmarcar serie 1', exact: true })).toBeVisible();
  await complete(page, 2, '50', '8');
  const before = await readDatabase(page, 'personal');
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    window.failCycle = true;
    IDBObjectStore.prototype.put = function () {
      if (window.failCycle && this.name === 'routines') throw new DOMException('Prueba', 'QuotaExceededError');
      return put.apply(this, arguments);
    };
  });
  await page.getByRole('button', { name: 'Finalizar entrenamiento', exact: true }).click();
  await modal(page, 'Guardar entrenamiento').getByRole('button', { name: 'Guardar completo', exact: true }).click();
  await expect(modal(page, 'Guardar entrenamiento').getByRole('alert')).toContainText('No hay espacio suficiente');
  const failed = await readDatabase(page, 'personal');
  expect(failed.workouts).toEqual(before.workouts);
  expect(failed.setRecords).toEqual(before.setRecords);
  expect(failed.routines).toEqual(before.routines);
  expect(failed.settings).toEqual(before.settings);
  await page.evaluate(() => { window.failCycle = false; });
  await modal(page, 'Guardar entrenamiento').getByRole('button', { name: 'Guardar completo', exact: true }).click();
  await expect(page.locator('.workout-result h2')).toHaveText('Entrenamiento completo guardado');
  const after = await readDatabase(page, 'personal');
  expect(after.setRecords).toHaveLength(2);
  expect(after.workouts[0].status).toBe('complete');
  expect(after.routines[0].nextSessionId).toBe(sessions[0].id);
  await page.screenshot({ path: '.cache/ft005-result-desktop.png', fullPage: true });
});
