import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { readDatabase, writeRecords } from './helpers/storage.js';

const bench = BASE_EXERCISES[0];
const row = BASE_EXERCISES[5];
const modal = (page, name) => page.getByRole('dialog', { name, exact: true });
const weight = (page, n) => page.getByRole('spinbutton', { name: `Peso en kg, serie ${n}`, exact: true });
const reps = (page, n) => page.getByRole('spinbutton', { name: `Repeticiones, serie ${n}`, exact: true });
const panelTechnique = (page) => page.locator('.workout-register [data-workout-technique]');
const listTechnique = (page, index) => page.locator(`.workout-exercises [data-workout-technique="${index}"]`);
const animations = (requests) => requests.filter((url) => /\/assets\/exercises\/[^/]+\/[^/]+\.webp$/.test(url) && !url.endsWith('-poster.webp'));

async function start(page, custom = false) {
  await page.clock.install({ time: new Date('2026-11-06T15:00:00Z') });
  await page.goto('./#/rutina-activa');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prepara tu primer entrenamiento', exact: true })).toBeVisible();
  const now = new Date().toISOString();
  const first = custom ? { ...structuredClone(row), id: crypto.randomUUID(), origin: 'custom', name: 'Remo propio sin fotografía', mainRegion: 'latissimus', secondaryRegions: [], secondaryMuscles: [], technique: null, visual: null, video: null, notes: 'Mantén el tronco estable.', createdAt: now, updatedAt: now } : bench;
  const routineId = crypto.randomUUID(), sessionId = crypto.randomUUID();
  const prescriptions = [first, row].map((exercise, order) => ({ id: crypto.randomUUID(), exerciseId: exercise.id, order, sets: order ? 1 : 2, repsMin: 6, repsMax: 8, restSeconds: 90, notes: '' }));
  await writeRecords(page, 'personal', {
    exercises: custom ? [first] : [],
    routines: [{ id: routineId, name: 'Rutina multimedia de prueba', description: '', origin: 'manual', revision: 1, sessionIds: [sessionId], nextSessionId: sessionId, cyclePolicy: 'sequential-wrap', createdAt: now, updatedAt: now }],
    routineSessions: [{ id: sessionId, routineId, name: 'Sesión multimedia', order: 0, prescriptions, createdAt: now, updatedAt: now }],
  });
  await page.reload();
  await page.getByRole('button', { name: 'Iniciar entrenamiento', exact: true }).click();
  await expect(page.locator('.workout-exercises > li')).toHaveCount(2);
  return first;
}

async function enter(page, position, kg, repetitions) {
  await weight(page, position).fill(kg);
  await expect(page.locator('.workout-feedback')).toContainText('Cambios guardados');
  await reps(page, position).fill(repetitions);
  await expect(page.locator('.workout-feedback')).toContainText('Cambios guardados');
}
async function fits(page, dialog) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (dialog) expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
}
async function geometry(page, panel = false) {
  const sizes = await page.locator(panel ? '.workout-visual' : '.workout-exercise').evaluateAll((nodes, panel) => nodes.map((node) => {
    const size = (element) => { const { width, height } = element.getBoundingClientRect(); return { width, height }; };
    const current = size(node);
    let original = node.cloneNode(true);
    for (const still of original.querySelectorAll('.exercise-media-still')) still.replaceWith(still.querySelector('svg'));
    if (panel) {
      const caption = document.createElement('span');
      caption.textContent = 'Ilustración de referencia';
      caption.style.cssText = 'display:block;color:#bac7d6;padding:5px 10px 9px;font-size:12px;text-align:right';
      original.querySelector('button').replaceWith(caption);
    } else {
      const button = document.createElement('button');
      button.className = original.className;
      const number = document.createElement('span');
      number.className = 'workout-number';
      number.innerHTML = original.querySelector('.workout-number').innerHTML;
      button.append(number, ...original.querySelector('.workout-technique-preview').children, original.querySelector('.workout-exercise-state'));
      original = button;
    }
    node.after(original);
    const previous = size(original);
    original.remove();
    return { current, previous };
  }), panel);
  for (const { current, previous } of sizes) {
    expect(current.width).toBeCloseTo(previous.width, 1);
    expect(current.height).toBeCloseTo(previous.height, 1);
  }
}

for (const width of [1536, 390, 320]) {
  test(`FT-013A ${width}px: fotos, técnica, entradas, descanso y pausa sin cambios accidentales`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    const requests = [], errors = [];
    page.on('request', (request) => requests.push(request.url()));
    page.on('pageerror', (error) => errors.push(error.message));
    await start(page);
    await expect(listTechnique(page, 0).locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
    await expect(listTechnique(page, 0).locator('img')).toHaveAttribute('src', './assets/exercises/pecho/press-de-banca-poster.webp');
    await expect(listTechnique(page, 1).locator('img')).toHaveAttribute('src', './assets/exercises/espalda/remo-en-polea-poster.webp');
    expect((await listTechnique(page, 0).locator('.workout-thumb').boundingBox()).width).toBe(width <= 700 ? 58 : 78);
    await geometry(page);
    expect(animations(requests)).toHaveLength(0);
    const initial = await readDatabase(page, 'personal');
    await listTechnique(page, 1).locator('.workout-thumb').click();
    const other = modal(page, row.name);
    await expect(other).toBeVisible();
    await expect(other.locator('.technique-steps li')).toHaveText(row.technique.steps);
    await page.keyboard.press('Escape');
    await expect(listTechnique(page, 1)).toBeFocused();
    await listTechnique(page, 1).locator('strong').click();
    await other.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
    expect(await readDatabase(page, 'personal')).toEqual(initial);
    await expect(page.locator('[data-workout-exercise="0"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-workout-exercise="1"]')).toHaveAttribute('aria-pressed', 'false');

    await page.locator('[data-workout-exercise="0"]').click();
    await expect(page.locator('#register-heading')).toHaveText(bench.name);
    await expect(page.locator('.workout-visual .exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
    await expect(page.locator('.workout-visual img')).toHaveCSS('object-fit', 'contain');
    await geometry(page, true);
    await enter(page, 1, '42.5', '7');
    await enter(page, 2, '51.25', '6');
    const pending = await readDatabase(page, 'personal');
    await panelTechnique(page).press('Enter');
    const technique = modal(page, bench.name);
    await expect(technique.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
    await expect(technique.locator('.technique-tips li span')).toHaveText(bench.technique.tips);
    await expect(technique.locator('.exercise-anatomy dd')).toHaveCount(3);
    await expect(technique.locator('.media-sources')).not.toHaveAttribute('open');
    await technique.locator('.media-sources > summary').click();
    await expect(technique.getByRole('link', { name: 'Unlicense', exact: true })).toBeVisible();
    expect(animations(requests)).toHaveLength(0);
    await technique.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
    await expect.poll(() => technique.locator('.technique-player').evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
    expect(animations(requests)).toHaveLength(1);
    await technique.getByRole('button', { name: 'Volver a la imagen', exact: true }).click();
    await expect(technique.locator('.technique-player')).toHaveCount(0);
    await fits(page, technique);
    await mkdir('.cache/ft013a', { recursive: true });
    await page.screenshot({ path: `.cache/ft013a/technique-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(panelTechnique(page)).toBeFocused();
    await expect(weight(page, 2)).toHaveValue('51.25');
    await expect(reps(page, 2)).toHaveValue('6');
    expect(await readDatabase(page, 'personal')).toEqual(pending);

    // Freeze after input commits, then advance only the test clock while open.
    await page.clock.pauseAt(new Date('2026-11-06T15:01:00Z'));
    await page.getByRole('button', { name: 'Completar serie 1', exact: true }).click();
    await expect(page.getByLabel('Tiempo de descanso restante')).toHaveText('01:30');
    const running = await readDatabase(page, 'personal');
    await panelTechnique(page).click();
    await page.clock.runFor(4000);
    await expect(page.getByLabel('Tiempo de descanso restante', { exact: true, includeHidden: true })).toHaveText('01:26');
    await page.keyboard.press('Escape');
    expect(await readDatabase(page, 'personal')).toEqual(running);
    await expect(page.locator('#register-heading')).toHaveText(bench.name);
    await expect(weight(page, 2)).toHaveValue('51.25');
    await page.getByRole('button', { name: 'Pausar descanso', exact: true }).click();
    const restPaused = await readDatabase(page, 'personal');
    const frozen = await page.getByLabel('Tiempo de descanso restante').textContent();
    await panelTechnique(page).press('Space');
    await page.clock.runFor(11000);
    await technique.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
    await expect(page.getByLabel('Tiempo de descanso restante')).toHaveText(frozen);
    expect(await readDatabase(page, 'personal')).toEqual(restPaused);

    const toolbar = page.locator(width <= 700 ? '.workout-register-actions' : '.workout-session-actions');
    await toolbar.getByRole('button', { name: 'Pausar sesión', exact: true }).click();
    const sessionPaused = await readDatabase(page, 'personal');
    await panelTechnique(page).click();
    await page.clock.runFor(3000);
    await page.keyboard.press('Escape');
    await expect(weight(page, 2)).toBeDisabled();
    await expect(page.getByLabel('Tiempo de descanso restante')).toHaveText(frozen);
    expect(await readDatabase(page, 'personal')).toEqual(sessionPaused);
    await fits(page);
    await page.locator('.workout-visual').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.cache/ft013a/register-${width}.png` });
    expect(errors).toEqual([]);
  });
}

test('FT-013A: personalizado sin foto usa SVG en lista, panel y técnica', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const custom = await start(page, true);
  await expect(listTechnique(page, 0).locator('svg.exercise-visual')).toBeVisible();
  await expect(listTechnique(page, 0).locator('img')).toHaveCount(0);
  await page.locator('[data-workout-exercise="0"]').click();
  await expect(page.locator('.workout-visual svg.exercise-visual')).toBeVisible();
  await expect(page.locator('.workout-visual img')).toHaveCount(0);
  const before = await readDatabase(page, 'personal');
  await panelTechnique(page).click();
  const technique = modal(page, custom.name);
  await expect(technique.locator('svg.exercise-visual')).toBeVisible();
  await expect(technique.locator('.exercise-notes')).toHaveText(custom.notes);
  await expect(technique.locator('img, [data-load-demonstration], .media-sources')).toHaveCount(0);
  await page.keyboard.press('Escape');
  expect(await readDatabase(page, 'personal')).toEqual(before);
});

test('FT-013A: error de fotografía recupera SVG y respeta movimiento reducido', async ({ page }) => {
  await page.route('**/assets/exercises/pecho/press-de-banca-poster.webp', (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await expect(listTechnique(page, 0).locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(page.locator('.workout-visual .exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(page.locator('.workout-visual svg.exercise-visual')).toBeVisible();
  await panelTechnique(page).click();
  const technique = modal(page, bench.name);
  await expect(technique.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(technique.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeDisabled();
  await expect(technique.locator('.technique-steps li')).toHaveText(bench.technique.steps);
  await page.keyboard.press('Escape');
});

test('FT-013A: la consulta conserva entradas pendientes y protección tras fallo de guardado', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    window.failWorkoutMediaWrite = true;
    IDBObjectStore.prototype.put = function () {
      if (window.failWorkoutMediaWrite && this.name === 'workouts') throw new DOMException('Prueba de escritura pendiente', 'QuotaExceededError');
      return put.apply(this, arguments);
    };
  });
  const before = await readDatabase(page, 'personal');
  await weight(page, 1).fill('87.5');
  await expect(page.locator('.workout-error')).toContainText('No hay espacio suficiente');
  await reps(page, 1).fill('5');
  await panelTechnique(page).click();
  await page.keyboard.press('Escape');
  await expect(weight(page, 1)).toHaveValue('87.5');
  await expect(reps(page, 1)).toHaveValue('5');
  expect(await readDatabase(page, 'personal')).toEqual(before);
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  })).toBe(true);
  await page.evaluate(() => { window.failWorkoutMediaWrite = false; });
  await page.getByRole('button', { name: 'Reintentar guardado', exact: true }).click();
  await expect(page.locator('.workout-feedback')).toContainText('Cambios guardados');
  const saved = (await readDatabase(page, 'personal')).workouts[0];
  expect(saved.entries[0].sets[0]).toMatchObject({ weightKg: '87.5', reps: '5', completed: false });
  expect(saved.currentExercise).toBe(0);
  expect(saved.timer).toBeNull();
});
