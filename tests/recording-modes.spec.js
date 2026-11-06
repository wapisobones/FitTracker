import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { DATA_STORES } from '../src/db/schema.js';
import { validateBackup } from '../src/features/profile/backup.js';
import { readDatabase, writeRecords } from './helpers/storage.js';

const now = '2026-11-06T15:00:00.000Z';
const modes = ['bodyweight_reps', 'weight_reps', 'duration'];
const exercises = [3, 0, 20].map(index => BASE_EXERCISES[index]);
const input = (page, field) => page.locator(`[data-set-field="${field}"]`);
const action = (page, name) => page.getByRole('button', { name, exact: true });
const backup = stores => ({ app: 'FitTracker', scope: 'personal', schemaVersion: 1, exportedAt: now, stores });

function planning() {
  const routineId = crypto.randomUUID();
  const session = { id: crypto.randomUUID(), routineId, name: 'Tres modalidades', order: 0,
    prescriptions: exercises.map((exercise, order) => ({ id: crypto.randomUUID(), exerciseId: exercise.id, order, sets: 1, repsMin: 8, repsMax: 12, restSeconds: 90, notes: '' })), createdAt: now, updatedAt: now };
  const routine = { id: routineId, name: 'Rutina sintética', description: '', origin: 'manual', revision: 1, sessionIds: [session.id], nextSessionId: session.id, cyclePolicy: 'sequential-wrap', createdAt: now, updatedAt: now };
  return { routines: [routine], routineSessions: [session] };
}

async function fixture(page) {
  await page.clock.install({ time: new Date(now) });
  await page.goto('./#/rutina-activa');
  await action(page, 'Comenzar mi entrenamiento').click();
  await expect(page.getByRole('heading', { name: 'Prepara tu primer entrenamiento' })).toBeVisible();
  const plan = planning();
  await writeRecords(page, 'personal', plan);
  await page.reload();
  await action(page, 'Iniciar entrenamiento').click();
  await page.locator('[data-workout-exercise="0"]').click();
  await expect(page.locator('#register-heading')).toBeVisible();
  return plan;
}

async function complete(page) {
  await action(page, 'Completar serie 1').click();
  await expect(action(page, 'Desmarcar serie 1')).toHaveAttribute('aria-pressed', 'true');
}

async function fit(page, width, label) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  for (const control of [page.locator('.workout-set input').first(), page.locator('.set-complete')]) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: `.cache/ft013b/${label}-${width}.png`, fullPage: true });
}

for (const width of [320, 390]) test(`Flujo de las tres modalidades, recuperación, pausa, referencias e historial a ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await fixture(page);
  await expect(input(page, 'weightKg')).toHaveCount(0);
  await expect(input(page, 'durationSeconds')).toHaveCount(0);
  await fit(page, width, 'flexiones');
  await input(page, 'reps').fill('-1');
  await action(page, 'Completar serie 1').click();
  await expect(page.locator('.set-validation')).toContainText('repeticiones enteras');
  await input(page, 'reps').fill('10');
  await complete(page);
  await expect(page.locator('.workout-exercise-done')).not.toContainText('incremento');
  await expect(page.locator('#register-heading')).toHaveText('Flexiones');
  await action(page, 'Siguiente ejercicio').click();
  await expect(input(page, 'weightKg')).toHaveCount(1);
  await input(page, 'weightKg').fill('-1');
  await input(page, 'reps').fill('10');
  await action(page, 'Completar serie 1').click();
  await expect(page.locator('.set-validation')).toContainText('Introduce un peso');
  await input(page, 'weightKg').fill('40');
  await complete(page);
  await fit(page, width, 'banca');
  await action(page, 'Siguiente ejercicio').click();
  await expect(input(page, 'weightKg')).toHaveCount(0);
  await expect(input(page, 'reps')).toHaveCount(0);
  await expect(page.locator('.workout-targets')).not.toContainText('Reps');
  for (const value of ['', '-1', '0', '1.5']) {
    await input(page, 'durationSeconds').fill(value);
    await action(page, 'Completar serie 1').click();
    await expect(page.locator('.set-validation')).toContainText('segundos enteros');
    await expect(input(page, 'durationSeconds')).toBeFocused();
  }
  await input(page, 'durationSeconds').fill('45');
  await complete(page);
  await expect(page.locator('.workout-exercise-done')).not.toContainText('incremento');
  await fit(page, width, 'plancha');
  await page.clock.runFor(4000);
  await expect(page.getByLabel('Tiempo de descanso restante')).toHaveText('01:26');
  await action(page, 'Pausar sesión').click();
  await expect(input(page, 'durationSeconds')).toBeDisabled();
  const paused = (await readDatabase(page, 'personal')).workouts[0];
  expect(paused.timer.status).toBe('paused');
  await page.clock.runFor(10000);
  await page.reload();
  await action(page, 'Continuar entrenamiento').click();
  await expect(input(page, 'durationSeconds')).toHaveValue('45');
  await expect(action(page, 'Reanudar descanso')).toBeVisible();
  expect((await readDatabase(page, 'personal')).workouts[0].timer.remainingMs).toBe(paused.timer.remainingMs);
  await action(page, 'Reanudar descanso').click();
  await action(page, 'Pausar descanso').click();
  await action(page, 'Desmarcar serie 1').click();
  await input(page, 'durationSeconds').fill('46');
  await expect(page.locator('.workout-feedback')).toContainText('Cambios guardados');
  await page.reload();
  await action(page, 'Continuar entrenamiento').click();
  await expect(input(page, 'durationSeconds')).toHaveValue('46');
  await expect(action(page, 'Completar serie 1')).toHaveAttribute('aria-pressed', 'false');
  await input(page, 'durationSeconds').fill('45');
  await complete(page);
  await action(page, 'Finalizar entrenamiento').click();
  await action(page, 'Guardar completo').click();
  await expect(page.locator('.workout-result')).toContainText('45 s');
  const saved = await readDatabase(page, 'personal');
  expect(saved.setRecords).toHaveLength(3);
  expect(saved.workouts[0].entries.map(entry => entry.exercise.recordingMode)).toEqual(modes);
  expect(saved.setRecords.find(set => set.exerciseId === exercises[0].id).weightKg).toBe(0);
  expect(saved.setRecords.find(set => set.exerciseId === exercises[2].id)).toMatchObject({ weightKg: 0, reps: 0, durationSeconds: 45 });
  expect(validateBackup(backup(saved))).toEqual(backup(saved));
  await page.goto('./#/progreso?periodo=all');
  await expect(page.locator('[data-metric="sets"] .metric-value')).toHaveText('3');
  await expect(page.locator('[data-metric="volume"] .metric-value')).toHaveText('400 kg');
  await page.locator('.stats-session summary').click();
  await expect(page.locator('.stats-session-detail')).toContainText('45 s');
  await expect(page.locator('.stats-session-detail')).toContainText('40 kg × 10 reps');
  await expect(page.locator('.stats-session-detail')).toContainText('Serie 1: 10 reps');
  await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption(exercises[2].id);
  await expect(page.locator('[data-metric="sets"] .metric-value')).toHaveText('1');
  await expect(page.locator('[data-metric="volume"] .metric-value')).toHaveText('0 kg');
  await expect(page.locator('.stats-strength .history-chart')).toHaveCount(0);
  await expect(page.locator('.stats-record-list')).toHaveCount(0);
  await page.goto('./#/rutina-activa');
  await action(page, 'Iniciar entrenamiento').click();
  await page.locator('[data-workout-exercise="0"]').click();
  for (const [index, text] of ['Anterior: 10 reps', 'Anterior: 40 kg × 10 reps', 'Anterior: 45 s'].entries()) {
    await expect(page.locator('.set-reference')).toContainText(text);
    await expect(action(page, 'Completar serie 1')).toHaveAttribute('aria-pressed', 'false');
    if (index < 2) await action(page, 'Siguiente ejercicio').click();
  }
  const pending = await readDatabase(page, 'personal');
  expect(pending.workouts.find(workout => workout.id === saved.workouts[0].id)).toEqual(saved.workouts[0]);
  expect(pending.setRecords).toEqual(saved.setRecords);
  expect(validateBackup(backup(pending))).toEqual(backup(pending));
  if (width === 390) {
    await page.goto('./#/perfil');
    const downloaded = page.waitForEvent('download');
    await action(page, 'Exportar respaldo personal').click();
    const download = await downloaded;
    const content = await readFile(await download.path(), 'utf8');
    const exported = JSON.parse(content);
    expect(exported.stores).toEqual(pending);
    await page.locator('[data-import-personal]').setInputFiles({ name: 'synthetic-modalities.json', mimeType: 'application/json', buffer: Buffer.from(content) });
    await expect(page.getByRole('dialog', { name: 'Restaurar respaldo personal' })).toBeVisible();
    await action(page, 'Reemplazar datos personales').click();
    await expect(page.getByRole('dialog', { name: 'Restaurar respaldo personal' })).not.toBeVisible();
    expect(await readDatabase(page, 'personal')).toEqual(pending);
    await page.goto('./#/rutina-activa');
    await action(page, 'Continuar entrenamiento').click();
    await expect(input(page, 'durationSeconds')).toHaveValue('45');
    await expect(action(page, 'Completar serie 1')).toHaveAttribute('aria-pressed', 'false');
  }
  expect(errors).toEqual([]);
});

test('Respaldo antiguo: conserva borrador e historia y no convierte repeticiones a segundos', async ({ page }) => {
  await page.goto('./#/perfil');
  await action(page, 'Comenzar mi entrenamiento').click();
  await expect(action(page, 'Exportar respaldo personal')).toBeEnabled();
  const plan = planning();
  const session = plan.routineSessions[0];
  const id = crypto.randomUUID();
  const entries = exercises.map((exercise, order) => {
    const snapshot = structuredClone(exercise); delete snapshot.recordingMode;
    const prescription = session.prescriptions[order];
    const set = { id: crypto.randomUUID(), workoutId: id, exerciseId: exercise.id, prescriptionId: prescription.id, exerciseOrder: order, position: 0,
      weightKg: order === 1 ? 40 : 0, reps: order === 2 ? 12 : 10, completed: true, completedAt: now, reference: null };
    return { exercise: snapshot, prescription, sets: [set] };
  });
  const finished = { id, formatVersion: 1, revision: 2, status: 'complete', routineId: plan.routines[0].id, sessionId: session.id,
    routineRevision: 1, routineName: plan.routines[0].name, sessionName: session.name, sessionSnapshot: session, startedAt: now, updatedAt: now, endedAt: now, currentExercise: null, timer: null, entries };
  const draft = { ...structuredClone(finished), id: crypto.randomUUID(), status: 'paused', revision: 1, endedAt: null, currentExercise: 2 };
  for (const entry of draft.entries) entry.sets = [{ id: crypto.randomUUID(), position: 0, weightKg: 0, reps: '12', completed: false, completedAt: null, reference: null }];
  const stores = Object.fromEntries(DATA_STORES.map(name => [name, []]));
  Object.assign(stores, plan, { workouts: [finished, draft], setRecords: entries.flatMap(entry => entry.sets), settings: [{ id: 'active-workout', workoutId: draft.id }] });
  for (const records of Object.values(stores)) records.sort((a, b) => a.id.localeCompare(b.id));
  const original = backup(stores);
  validateBackup(original);
  await page.locator('[data-import-personal]').setInputFiles({ name: 'synthetic-legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(original)) });
  await action(page, 'Reemplazar datos personales').click();
  await expect(page.getByRole('dialog', { name: 'Restaurar respaldo personal' })).not.toBeVisible();
  expect(await readDatabase(page, 'personal')).toEqual(stores);
  await page.goto('./#/rutina-activa');
  await action(page, 'Continuar entrenamiento').click();
  await expect(page.locator('#register-heading')).toHaveText('Plancha');
  await expect(input(page, 'reps')).toHaveValue('12');
  await expect(input(page, 'durationSeconds')).toHaveCount(0);
  await action(page, 'Descartar').click();
  await action(page, 'Confirmar descarte').click();
  await action(page, 'Iniciar entrenamiento').click();
  await expect(page.locator('.set-reference')).toContainText('Anterior: 10 reps');
  await expect(input(page, 'weightKg')).toHaveCount(0);
  await action(page, 'Siguiente ejercicio').click();
  await expect(page.locator('.set-reference')).toContainText('Anterior: 40 kg × 10 reps');
  await action(page, 'Siguiente ejercicio').click();
  await expect(input(page, 'durationSeconds')).toHaveValue('');
  await expect(page.locator('.set-reference')).toHaveCount(0);
  const after = await readDatabase(page, 'personal');
  expect(after.workouts.find(workout => workout.id === id)).toEqual(finished);
  expect(after.setRecords).toEqual(stores.setRecords);
  // An old externally loaded variant must not become a zero-load reference.
  await action(page, 'Descartar').click();
  await action(page, 'Confirmar descarte').click();
  await expect(action(page, 'Iniciar entrenamiento')).toBeVisible();
  finished.entries[0].sets[0].weightKg = 5;
  await writeRecords(page, 'personal', { workouts: [finished], setRecords: finished.entries[0].sets });
  await action(page, 'Iniciar entrenamiento').click();
  await expect(input(page, 'weightKg')).toHaveCount(0);
  await expect(input(page, 'reps')).toHaveValue('');
  await expect(page.locator('.set-reference')).toHaveCount(0);
  expect((await readDatabase(page, 'personal')).workouts.find(workout => workout.id === id)).toEqual(finished);
});

test('Personalizados: selector de modalidad, compatibilidad anterior y snapshot de sesión aislado', async ({ page }) => {
  await fixture(page);
  await action(page, 'Descartar').click();
  await action(page, 'Confirmar descarte').click();
  await expect(action(page, 'Iniciar entrenamiento')).toBeVisible();
  await page.goto('./#/ejercicios');
  await action(page, 'Crear ejercicio').click();
  const dialog = page.getByRole('dialog', { name: 'Crear ejercicio personalizado' });
  await dialog.getByLabel('Nombre', { exact: true }).fill('Isométrico sintético');
  await dialog.getByRole('combobox', { name: 'Músculo principal', exact: true }).selectOption('Core');
  await dialog.getByLabel('Equipamiento', { exact: true }).fill('Colchoneta');
  await expect(dialog.getByLabel('Modalidad de registro')).toHaveValue('weight_reps');
  await dialog.getByLabel('Modalidad de registro').selectOption('duration');
  await action(page, 'Guardar ejercicio').click();
  await expect(dialog).not.toBeVisible();
  const created = (await readDatabase(page, 'personal')).exercises[0];
  expect(created.recordingMode).toBe('duration');
  const plan = planning();
  plan.routineSessions[0].prescriptions = [{ ...plan.routineSessions[0].prescriptions[0], exerciseId: created.id }];
  await writeRecords(page, 'personal', plan);
  await page.goto(`./#/rutina-activa?rutina=${plan.routines[0].id}&ambito=personal`);
  await action(page, 'Iniciar entrenamiento').click();
  await expect(input(page, 'durationSeconds')).toBeVisible();
  const before = (await readDatabase(page, 'personal')).workouts;
  await page.goto('./#/ejercicios');
  await action(page, 'Editar Isométrico sintético').click();
  await page.getByRole('dialog').getByLabel('Modalidad de registro').selectOption('bodyweight_reps');
  await action(page, 'Guardar ejercicio').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await readDatabase(page, 'personal')).workouts).toEqual(before);
  await page.goto('./#/rutina-activa');
  await action(page, 'Continuar entrenamiento').click();
  await expect(input(page, 'durationSeconds')).toBeVisible();
  await page.goto('./#/ejercicios');
  const legacy = { ...created }; delete legacy.recordingMode;
  await writeRecords(page, 'personal', { exercises: [legacy] });
  await page.reload();
  await action(page, 'Editar Isométrico sintético').click();
  await expect(page.getByRole('dialog').getByLabel('Modalidad de registro')).toHaveValue('weight_reps');
});
