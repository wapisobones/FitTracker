import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { parseBackup } from '../src/features/profile/backup.js';
import { backupFixture } from './helpers/backup.js';
import { readDatabase, selectMode } from './helpers/storage.js';

const plank = BASE_EXERCISES[20];
const action = (page, name) => page.getByRole('button', { name, exact: true });
const modal = page => page.getByRole('dialog', { name: 'Configurar ejercicio', exact: true });
const range = { targetType: 'duration', durationMinSeconds: 30, durationMaxSeconds: 45 };

function legacyPlankBackup() {
  const legacy = backupFixture();
  legacy.stores.exercises = [];
  for (const session of legacy.stores.routineSessions) for (const item of session.prescriptions) item.exerciseId = plank.id;
  for (const workout of legacy.stores.workouts) {
    workout.sessionSnapshot.prescriptions[0].exerciseId = plank.id;
    const entry = workout.entries[0];
    entry.exercise = structuredClone(plank); delete entry.exercise.recordingMode;
    entry.prescription.exerciseId = plank.id;
    for (const set of entry.sets) if (set.exerciseId) set.exerciseId = plank.id;
  }
  for (const set of legacy.stores.setRecords) set.exerciseId = plank.id;
  return legacy;
}

async function start(page, route = 'mis-rutinas') {
  await page.goto(`./#/${route}`);
  await action(page, 'Comenzar mi entrenamiento').click();
  await expect(page.getByRole('banner')).toContainText('Modo personal');
}
async function options(page, label) {
  const button = action(page, label);
  if (await button.isVisible() && await button.getAttribute('aria-expanded') === 'false') await button.click();
}
async function edit(page) {
  await options(page, 'Opciones de Plancha');
  await action(page, 'Editar objetivos de Plancha').click();
  return modal(page);
}
async function save(page) {
  await modal(page).getByRole('button', { name: 'Guardar objetivos', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
}
async function fit(page, width, label, controls) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  for (const control of controls) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: `.cache/ft013c/${label}-${width}.png`, fullPage: true });
}

for (const width of [320, 390]) test(`Objetivos de Plancha: crear, editar, copiar, entrenar y respaldo a ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await selectMode(page, 'demo');
  await expect(page.getByRole('banner')).toContainText('Demostración');
  const demo = await readDatabase(page, 'demo');
  await selectMode(page, 'personal');
  await expect(page.getByRole('banner')).toContainText('Modo personal');
  await action(page, 'Crear rutina').click();
  const create = page.getByRole('dialog', { name: 'Crear rutina', exact: true });
  await create.getByLabel('Nombre de rutina', { exact: true }).fill('Duración sintética');
  await action(page, 'Guardar rutina').click();
  await expect(create).not.toBeVisible();
  await action(page, 'Añadir ejercicio').click();
  await page.locator('[data-picker-search]').fill('Plancha');
  await page.locator(`[data-pick-exercise="${plank.id}"]`).click();
  await expect(modal(page).getByLabel('Duración mínima (segundos)')).toHaveValue('30');
  await expect(modal(page).getByLabel('Duración máxima (segundos)')).toHaveValue('45');
  await expect(modal(page).locator('[name="repsMin"]')).toHaveCount(0);
  await modal(page).getByLabel('Series', { exact: true }).fill('1');
  await fit(page, width, 'editor', [modal(page).getByLabel('Duración mínima (segundos)'), modal(page).getByLabel('Duración máxima (segundos)'), modal(page).getByRole('button', { name: 'Guardar objetivos', exact: true })]);
  await save(page);
  await expect(page.locator('.prescription-targets')).toContainText('30–45 s');
  const created = await readDatabase(page, 'personal');
  const source = created.routines[0];
  const first = created.routineSessions[0].prescriptions[0];
  expect(first).toMatchObject(range);
  expect(first.repsMin).toBeUndefined();
  await edit(page);
  await modal(page).getByLabel('Duración mínima (segundos)').fill('60');
  await modal(page).getByRole('button', { name: 'Guardar objetivos', exact: true }).click();
  await expect(modal(page).getByRole('alert')).toContainText('mínima no puede superar');
  await modal(page).getByLabel('Duración máxima (segundos)').fill('90');
  await save(page);
  await page.reload();
  await expect(page.locator('.prescription-targets')).toContainText('60–90 s');
  await edit(page);
  await modal(page).getByLabel('Duración mínima (segundos)').fill('30');
  await modal(page).getByLabel('Duración máxima (segundos)').fill('45');
  await save(page);
  const edited = await readDatabase(page, 'personal');
  expect(edited.routineSessions[0].prescriptions[0].id).toBe(first.id);
  expect(edited.routines[0].revision).toBe(source.revision + 2);
  await options(page, 'Opciones de sesión');
  await action(page, 'Duplicar sesión').click();
  await expect(page.locator('.session-tabs button')).toHaveCount(2);
  await options(page, 'Opciones de rutina');
  await action(page, 'Duplicar rutina').click();
  await expect(page.locator('.routine-list-card')).toHaveCount(2);
  const copies = await readDatabase(page, 'personal');
  expect(copies.routineSessions).toHaveLength(4);
  const ids = new Set();
  for (const session of copies.routineSessions) {
    expect(session.prescriptions[0]).toMatchObject(range);
    ids.add(session.prescriptions[0].id);
  }
  expect(ids.size).toBe(4);
  await fit(page, width, 'rutina', [action(page, 'Añadir ejercicio')]);
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await action(page, 'Iniciar entrenamiento').click();
  await page.locator('[data-workout-exercise="0"]').click();
  await expect(page.locator('.workout-targets')).toContainText('30–45 s');
  await expect(page.locator('.workout-exercises')).toContainText('30–45 s');
  const seconds = page.locator('[data-set-field="durationSeconds"]');
  await seconds.fill('37');
  await expect(page.locator('.workout-feedback')).toContainText('Cambios guardados');
  const draft = (await readDatabase(page, 'personal')).workouts[0];
  expect(draft.entries[0].prescription).toMatchObject(range);
  await page.reload();
  await action(page, 'Continuar entrenamiento').click();
  await expect(seconds).toHaveValue('37');
  await fit(page, width, 'entrenamiento', [seconds, action(page, 'Completar serie 1')]);
  await action(page, 'Completar serie 1').click();
  await expect(action(page, 'Desmarcar serie 1')).toBeVisible();
  await action(page, 'Finalizar entrenamiento').click();
  await action(page, 'Guardar completo').click();
  await expect(page.locator('.workout-result')).toContainText('37 s');
  const finished = await readDatabase(page, 'personal');
  expect(finished.setRecords[0]).toMatchObject({ durationSeconds: 37, reps: 0, weightKg: 0 });
  expect(finished.workouts[0].sessionSnapshot.prescriptions[0]).toMatchObject(range);
  await page.goto('./#/perfil');
  const downloading = page.waitForEvent('download');
  await action(page, 'Exportar respaldo personal').click();
  const content = await readFile(await (await downloading).path(), 'utf8');
  expect(parseBackup(content).stores).toEqual(finished);
  await page.locator('[data-import-personal]').setInputFiles({ name: 'synthetic-duration.json', mimeType: 'application/json', buffer: Buffer.from(content) });
  await action(page, 'Reemplazar datos personales').click();
  await expect(page.getByRole('dialog', { name: 'Restaurar respaldo personal' })).not.toBeVisible();
  expect(await readDatabase(page, 'personal')).toEqual(finished);
  expect(await readDatabase(page, 'demo')).toEqual(demo);
  expect(errors).toEqual([]);
});

test('Plancha antigua: importar, conservar objetivos, confirmar sustitución y proteger borrador e historial', async ({ page }) => {
  await start(page, 'perfil');
  const legacy = legacyPlankBackup();
  const content = JSON.stringify(legacy);
  parseBackup(content);
  await page.locator('[data-import-personal]').setInputFiles({ name: 'synthetic-legacy.json', mimeType: 'application/json', buffer: Buffer.from(content) });
  await action(page, 'Reemplazar datos personales').click();
  await expect(page.getByRole('dialog', { name: 'Restaurar respaldo personal' })).not.toBeVisible();
  const before = await readDatabase(page, 'personal');
  await page.goto('./#/mis-rutinas');
  await expect(page.locator('.prescription-targets')).toContainText('8–12');
  await expect(page.locator('.prescription-notes')).toContainText('Objetivos heredados');
  await edit(page);
  await expect(modal(page).getByLabel('Repeticiones mínimas')).toHaveValue('8');
  await save(page);
  let stored = await readDatabase(page, 'personal');
  expect(stored.routineSessions[0].prescriptions).toEqual(before.routineSessions[0].prescriptions);
  await edit(page);
  await action(page, 'Confirmar cambio a segundos').click();
  await expect(modal(page).getByLabel('Duración mínima (segundos)')).toHaveValue('30');
  // Conversion stays local until saving; cancel must preserve the inherited plan.
  await modal(page).getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await readDatabase(page, 'personal')).routineSessions).toEqual(stored.routineSessions);
  await edit(page);
  await action(page, 'Confirmar cambio a segundos').click();
  await save(page);
  stored = await readDatabase(page, 'personal');
  expect(stored.routineSessions[0].prescriptions[0]).toMatchObject(range);
  expect(stored.routineSessions[0].prescriptions[0].id).toBe(before.routineSessions[0].prescriptions[0].id);
  expect(stored.workouts).toEqual(before.workouts);
  expect(stored.setRecords).toEqual(before.setRecords);
  await page.goto('./#/rutina-activa');
  await action(page, 'Continuar entrenamiento').click();
  await expect(page.locator('[data-set-field="reps"]').first()).toBeVisible();
  await expect(page.locator('[data-set-field="durationSeconds"]')).toHaveCount(0);
  await expect(page.locator('.workout-targets')).toContainText('8–12');
  // New-format backup can contain a seconds plan and untouched legacy snapshots.
  expect(parseBackup(JSON.stringify({ ...legacy, stores: stored })).stores).toEqual(stored);
});

test('Altas desde catálogo y propuesta del Generador usan segundos editables', async ({ page }) => {
  await start(page, 'ejercicios');
  await page.locator(`[data-exercise-id="${plank.id}"] [data-technique]`).click();
  await action(page, 'Añadir a rutina').click();
  await expect(page.getByRole('dialog', { name: 'Añadir a rutina' })).toContainText('30–45 s');
  await action(page, 'Añadir ejercicio').click();
  await page.getByRole('link', { name: 'Ver rutina y objetivos', exact: true }).click();
  await expect(page.locator('.prescription-targets')).toContainText('30–45 s');
  await page.goto('./#/generador');
  await page.locator('[data-generator-muscle="Core"]').click();
  await action(page, 'Generar propuesta').click();
  const row = page.locator('.prescription-row').filter({ has: action(page, 'Editar objetivos de Plancha') });
  await expect(row).toContainText('30–45 s');
  await action(page, 'Editar objetivos de Plancha').click();
  await modal(page).getByLabel('Duración mínima (segundos)').fill('40');
  await modal(page).getByLabel('Duración máxima (segundos)').fill('60');
  await save(page);
  await expect(row).toContainText('40–60 s');
  await action(page, 'Guardar en Mis rutinas').click();
  await page.getByRole('link', { name: 'Ver en Mis rutinas', exact: true }).click();
  const data = await readDatabase(page, 'personal');
  const generated = data.routines.find(item => item.origin === 'generator');
  expect(data.routineSessions.find(item => item.routineId === generated.id).prescriptions.find(item => item.exerciseId === plank.id)).toMatchObject({ targetType: 'duration', durationMinSeconds: 40, durationMaxSeconds: 60 });
});

test('Iniciar Plancha con objetivo heredado avisa de las unidades y permite registrar segundos reales', async ({ page }) => {
  await start(page, 'perfil');
  const legacy = legacyPlankBackup();
  legacy.stores.workouts = legacy.stores.workouts.filter(workout => workout.status === 'complete');
  legacy.stores.settings = legacy.stores.settings.filter(setting => setting.id !== 'active-workout');
  await page.locator('[data-import-personal]').setInputFiles({ name: 'synthetic-legacy-plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
  await action(page, 'Reemplazar datos personales').click();
  await expect(page.getByRole('dialog', { name: 'Restaurar respaldo personal' })).not.toBeVisible();
  const before = await readDatabase(page, 'personal');
  await page.goto('./#/rutina-activa');
  await action(page, 'Iniciar entrenamiento').click();
  await expect(page.locator('.workout-targets')).toContainText('8–12');
  await expect(page.locator('.workout-targets')).not.toContainText('8–12 s');
  await expect(page.locator('.workout-reference-note').first()).toContainText('Objetivos heredados');
  await expect(page.locator('[data-set-field="durationSeconds"]').first()).toHaveValue('');
  await page.locator('[data-set-field="durationSeconds"]').first().fill('33');
  await action(page, 'Completar serie 1').click();
  await expect(action(page, 'Desmarcar serie 1')).toBeVisible();
  await action(page, 'Finalizar entrenamiento').click();
  await action(page, 'Guardar parcial').click();
  await expect(page.locator('.workout-result')).toContainText('33 s');
  const after = await readDatabase(page, 'personal');
  expect(after.routineSessions).toEqual(before.routineSessions);
  expect(after.workouts.find(workout => workout.id === before.workouts[0].id)).toEqual(before.workouts[0]);
  const added = after.workouts.find(workout => workout.status === 'partial');
  expect(added.entries[0].prescription).toMatchObject({ repsMin: 8, repsMax: 12 });
  expect(added.entries[0].sets[0]).toMatchObject({ durationSeconds: 33, reps: 0, weightKg: 0 });
  expect(parseBackup(JSON.stringify({ ...legacy, stores: after })).stores).toEqual(after);
});
