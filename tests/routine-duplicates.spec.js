import { test, expect } from '@playwright/test';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { newRoutine, newSession, validateRoutine } from '../src/features/routines/model.js';
import { parseBackup } from '../src/features/profile/backup.js';
import { backupFixture } from './helpers/backup.js';
import { readDatabase, writeRecords } from './helpers/storage.js';

const plank = BASE_EXERCISES[20].id;
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true });
const action = (page, name) => page.getByRole('button', { name, exact: true });
const pick = (page, id) => page.locator(`[data-pick-exercise="${id}"]`);

async function start(page) {
  await page.goto('./#/mis-rutinas');
  await action(page, 'Comenzar mi entrenamiento').click();
  await expect(action(page, 'Crear rutina')).toBeEnabled();
}

async function fixture(page) {
  await start(page);
  const now = new Date().toISOString();
  const draft = newRoutine('Rutina sintética', '', 'Sesión A');
  draft.sessions.push(newSession(draft.id, 'Sesión B'));
  const valid = validateRoutine(draft);
  const { sessions, ...routine } = valid;
  Object.assign(routine, { revision: 1, sessionIds: sessions.map(session => session.id), createdAt: now, updatedAt: now });
  // Same visible name, different stable ID: it must remain available.
  const custom = { ...backupFixture().stores.exercises[0], name: 'Plancha' };
  await writeRecords(page, 'personal', { routines: [routine], routineSessions: sessions.map(session => ({ ...session, createdAt: now, updatedAt: now })), exercises: [custom] });
  await page.reload();
  await expect(page.locator('.routine-detail h2')).toHaveText(routine.name);
  return { routine, sessions, custom };
}

async function picker(page) {
  await action(page, 'Añadir ejercicio').click();
  const modal = dialog(page, 'Añadir ejercicio a la sesión');
  await expect(modal).toBeVisible();
  await modal.getByRole('searchbox').fill('Plancha');
  return modal;
}

async function configure(page, id = plank) {
  await picker(page);
  await pick(page, id).click();
  return dialog(page, 'Configurar ejercicio');
}

async function save(page, repeat = false) {
  const modal = dialog(page, 'Configurar ejercicio');
  if (repeat) await modal.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  else await modal.getByRole('button', { name: 'Guardar objetivos', exact: true }).click();
  await expect(modal).not.toBeVisible();
}

test('Plancha desaparece por ID, reaparece al quitarla y puede añadirse en otra sesión; móvil', async ({ page }) => {
  const { sessions, custom } = await fixture(page);
  await configure(page);
  await save(page, true);
  await expect(page.locator('.prescription-name strong')).toHaveText(['Plancha']);
  const modal = await picker(page);
  await expect(pick(page, plank)).toHaveCount(0);
  await expect(pick(page, custom.id)).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(pick(page, custom.id)).toBeVisible();
    const box = await pick(page, custom.id).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `.cache/ft013b1/picker-${width}.png` });
  }
  // Simulate a stale/tampered selector button. The local guard gives feedback.
  await pick(page, custom.id).evaluate((button, id) => { button.dataset.pickExercise = id; button.click(); }, plank);
  await expect(modal.getByRole('alert')).toContainText('ya pertenece a esta sesión');
  expect((await readDatabase(page, 'personal')).routineSessions.find(session => session.id === sessions[0].id).prescriptions).toHaveLength(1);
  await modal.getByRole('searchbox').fill('Sin coincidencias sintéticas');
  await expect(modal).toContainText('No hay ejercicios disponibles');
  await modal.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
  await page.setViewportSize({ width: 1536, height: 1024 });
  await action(page, 'Quitar Plancha').click();
  await dialog(page, '¿Quitar ejercicio de la sesión?').getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(page.locator('.prescription-row')).toHaveCount(0);
  await configure(page);
  await save(page);
  await page.locator(`[data-select-session="${sessions[1].id}"]`).click();
  await configure(page);
  await save(page);
  await page.reload();
  const data = await readDatabase(page, 'personal');
  for (const session of data.routineSessions) expect(session.prescriptions.map(item => item.exerciseId)).toEqual([plank]);
});

test('Dos pestañas con formularios abiertos: el guardado rechaza el alta duplicada sin escribir', async ({ page, context }) => {
  const { sessions } = await fixture(page);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(action(other, 'Añadir ejercicio')).toBeEnabled();
  await configure(page);
  const stale = await configure(other);
  await save(page);
  const before = await readDatabase(page, 'personal');
  await stale.getByRole('button', { name: 'Guardar objetivos', exact: true }).click();
  await expect(stale.getByRole('alert')).toContainText('ya pertenece a esta sesión');
  expect(await readDatabase(page, 'personal')).toEqual(before);
  expect(before.routineSessions.find(session => session.id === sessions[0].id).prescriptions).toHaveLength(1);
});

test('Duplicados heredados: respaldo válido, consulta, edición, orden, copia y nuevas altas legítimas', async ({ page }) => {
  await start(page);
  const legacy = backupFixture();
  const session = legacy.stores.routineSessions[0];
  session.prescriptions.push({ ...session.prescriptions[0], id: crypto.randomUUID(), order: 1, notes: 'Segunda prescripción heredada' });
  expect(parseBackup(JSON.stringify(legacy))).toEqual(legacy);
  await writeRecords(page, 'personal', legacy.stores);
  await page.reload();
  await expect(page.locator('.prescription-row')).toHaveCount(2);
  const before = await readDatabase(page, 'personal');
  const ids = session.prescriptions.map(item => item.id);
  await page.locator(`[data-item-action="edit"][data-item-id="${ids[1]}"]`).click();
  await dialog(page, 'Configurar ejercicio').getByRole('spinbutton', { name: 'Series', exact: true }).fill('4');
  await save(page);
  await page.locator(`[data-item-action="up"][data-item-id="${ids[1]}"]`).click();
  await expect(page.locator('.prescription-row').first().locator('[data-item-action="edit"]')).toHaveAttribute('data-item-id', ids[1]);
  await action(page, 'Añadir ejercicio').click();
  await dialog(page, 'Añadir ejercicio a la sesión').getByRole('searchbox').fill('Press de banca');
  await pick(page, BASE_EXERCISES[0].id).click();
  await save(page);
  await action(page, 'Duplicar sesión').click();
  await expect(page.locator('.session-tabs strong')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.prescription-row')).toHaveCount(3);
  const after = await readDatabase(page, 'personal');
  const edited = after.routineSessions.find(item => item.id === session.id);
  expect(edited.prescriptions.slice(0, 2).map(item => item.id)).toEqual([ids[1], ids[0]]);
  expect(edited.prescriptions[0]).toMatchObject({ exerciseId: session.prescriptions[0].exerciseId, sets: 4, order: 0, notes: 'Segunda prescripción heredada' });
  expect(edited.prescriptions[1]).toEqual({ ...session.prescriptions[0], order: 1 });
  expect(after.workouts).toEqual(before.workouts);
  expect(after.setRecords).toEqual(before.setRecords);
  expect(parseBackup(JSON.stringify({ ...legacy, stores: after })).stores).toEqual(after);
});
