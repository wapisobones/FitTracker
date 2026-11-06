import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { readDatabase } from './helpers/storage.js';

const dialog = (page, name) => page.getByRole('dialog', { name, exact: true });
const animationRequests = (requests) => requests.filter((url) => /\/assets\/exercises\/[^/]+\/[^/]+\.webp$/.test(url) && !url.endsWith('-poster.webp'));
const fields = (form) => form.evaluate((node) => [...new FormData(node)]);

async function savedRoutine(page) {
  await page.goto('./#/predisenadas');
  const welcome = page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true });
  if (await welcome.isVisible()) await welcome.click();
  await page.getByRole('button', { name: /^Torso \/ Pierna/ }).click();
  await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
  await page.getByRole('link', { name: 'Ver copia en Mis rutinas', exact: true }).click();
  await expect(page.locator('.prescription-row').first()).toBeVisible();
}

async function fits(page, modal) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (modal) expect(await modal.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
}

async function unchangedGeometry(page) {
  const sizes = await page.locator('.prescription-row').evaluateAll((rows) => rows.map((row) => {
    const measure = (node) => { const { width, height } = node.getBoundingClientRect(); return { width, height }; };
    const current = { row: measure(row), thumb: measure(row.querySelector('.prescription-thumb')) };
    const reference = row.cloneNode(true);
    const button = reference.querySelector('.compact-technique');
    button.querySelector('.exercise-media-still')?.replaceWith(button.querySelector('svg.exercise-visual'));
    const oldName = document.createElement('div');
    oldName.className = 'prescription-name';
    oldName.innerHTML = button.innerHTML;
    button.replaceWith(oldName);
    row.after(reference);
    const previous = { row: measure(reference), thumb: measure(reference.querySelector('.prescription-thumb')) };
    reference.remove();
    return { current, previous };
  }));
  for (const { current, previous } of sizes) {
    for (const part of ['row', 'thumb']) {
      expect(current[part].width).toBeCloseTo(previous[part].width, 1);
      expect(current[part].height).toBeCloseTo(previous[part].height, 1);
    }
    expect(current.thumb.width).toBe(page.viewportSize().width <= 600 ? 36 : 62);
  }
}

async function checkTechnique(page, exercise) {
  const modal = dialog(page, exercise.name);
  await expect(modal.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
  await expect(modal.locator('.technique-steps li')).toHaveText(exercise.technique.steps);
  await expect(modal.locator('.technique-tips li span')).toHaveText(exercise.technique.tips);
  await expect(modal.locator('.exercise-anatomy dd')).toHaveCount(3);
  await expect(modal.locator('.media-sources')).not.toHaveAttribute('open');
  await modal.locator('.media-sources > summary').click();
  await expect(modal.locator('.media-credit')).toContainText('Unlicense');
  await expect(modal.getByRole('link', { name: 'Fuente', exact: true })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db');
  await fits(page, modal);
  await modal.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
  const player = modal.locator('img.technique-player');
  await expect.poll(() => player.evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
  expect(await player.evaluate((img) => new URL(img.src).pathname)).toMatch(/^\/FitTracker\/assets\/exercises\//);
  await modal.getByRole('button', { name: 'Volver a la imagen', exact: true }).click();
  await expect(player).toHaveCount(0);
  await expect(modal.locator('.exercise-media-still')).toBeVisible();
  return modal;
}

for (const width of [1536, 390, 320]) {
  test(`FT-012A.1 ${width}px: rutina guardada, selector y editor conservan estado y objetivos pendientes`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    const errors = [];
    const requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => requests.push(request.url()));
    await savedRoutine(page);
    await page.locator('[data-select-session]').nth(2).click();
    const session = await page.locator('[data-select-session][aria-pressed="true"]').getAttribute('data-select-session');
    const before = await readDatabase(page, 'personal');
    const url = page.url();
    const markup = await page.locator('.routine-detail').innerHTML();
    const trigger = page.locator('.prescription-row .compact-technique').first();
    const id = await trigger.getAttribute('data-technique');
    const selected = BASE_EXERCISES.find((item) => item.id === id);
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
    await expect(trigger.locator('img')).toHaveAttribute('src', './assets/exercises/pecho/press-inclinado-con-mancuernas-poster.webp');
    await expect(trigger.locator('img')).toHaveCSS('object-fit', 'contain');
    await unchangedGeometry(page);
    expect(animationRequests(requests)).toHaveLength(0);
    await trigger.locator('.prescription-thumb').click();
    expect(animationRequests(requests)).toHaveLength(0);
    const technique = await checkTechnique(page, selected);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await trigger.locator('strong').click();
    await technique.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
    await expect(trigger).toBeFocused();
    expect(page.url()).toBe(url);
    expect(await page.locator('.routine-detail').innerHTML()).toBe(markup);
    await expect(page.locator(`[data-select-session="${session}"]`)).toHaveAttribute('aria-pressed', 'true');
    expect(await readDatabase(page, 'personal')).toEqual(before);
    await fits(page);
    await mkdir('.cache/ft012a1', { recursive: true });
    await page.screenshot({ path: `.cache/ft012a1/detail-${width}.png` });

    // Consulting from the picker keeps its search and does not add an exercise.
    await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click();
    const picker = dialog(page, 'Añadir ejercicio a la sesión');
    await picker.getByRole('searchbox').fill('Press de banca');
    const pickerTrigger = picker.getByRole('button', { name: 'Ver técnica de Press de banca', exact: true });
    await expect(pickerTrigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
    await pickerTrigger.locator('.prescription-thumb').click();
    await expect(dialog(page, 'Press de banca')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(pickerTrigger).toBeFocused();
    await expect(picker.getByRole('searchbox')).toHaveValue('Press de banca');
    expect(await readDatabase(page, 'personal')).toEqual(before);
    await fits(page, picker);
    await page.screenshot({ path: `.cache/ft012a1/picker-${width}.png` });

    // The explicit add button configures, but only Save persists its objectives.
    await picker.getByRole('button', { name: 'Añadir Press de banca', exact: true }).click();
    const editor = dialog(page, 'Configurar ejercicio');
    await editor.getByRole('spinbutton', { name: 'Series', exact: true }).fill('5');
    await editor.getByRole('spinbutton', { name: 'Repeticiones mínimas', exact: true }).fill('6');
    await editor.getByRole('spinbutton', { name: 'Repeticiones máximas', exact: true }).fill('9');
    await editor.getByRole('spinbutton', { name: 'Descanso (segundos)', exact: true }).fill('135');
    await editor.getByRole('textbox', { name: 'Notas del ejercicio', exact: true }).fill('Pendiente: conservar control y pausa.');
    const pending = await fields(editor.locator('form'));
    const editorTrigger = editor.getByRole('button', { name: 'Ver técnica de Press de banca', exact: true });
    await editorTrigger.press('Enter');
    const banca = BASE_EXERCISES.find((item) => item.name === 'Press de banca');
    await checkTechnique(page, banca);
    await page.keyboard.press('Escape');
    await expect(editorTrigger).toBeFocused();
    expect(await fields(editor.locator('form'))).toEqual(pending);
    expect(await readDatabase(page, 'personal')).toEqual(before);
    await editorTrigger.press('Space');
    await dialog(page, 'Press de banca').getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
    expect(await fields(editor.locator('form'))).toEqual(pending);
    await fits(page, editor);
    await page.screenshot({ path: `.cache/ft012a1/editor-${width}.png` });
    await editor.getByRole('button', { name: 'Guardar objetivos', exact: true }).click();
    await expect(editor).not.toBeVisible();
    const after = await readDatabase(page, 'personal');
    const stored = after.routineSessions.find((item) => item.id === session).prescriptions.at(-1);
    expect(stored).toMatchObject({ exerciseId: banca.id, sets: 5, repsMin: 6, repsMax: 9, restSeconds: 135, notes: 'Pendiente: conservar control y pausa.' });
    await expect(page.locator('.prescription-row').last().locator('.prescription-targets dd')).toHaveText(['5', '6–9', '135 s']);
    expect(after.workouts).toEqual(before.workouts);
    expect(after.setRecords).toEqual(before.setRecords);
    const row = page.locator('.prescription-row').last();
    const options = row.getByRole('button', { name: 'Opciones de Press de banca', exact: true });
    if (await options.isVisible()) await options.click();
    await row.getByRole('button', { name: 'Editar objetivos de Press de banca', exact: true }).click();
    await editor.getByRole('spinbutton', { name: 'Series', exact: true }).fill('6');
    await editor.getByRole('textbox', { name: 'Notas del ejercicio', exact: true }).fill('Edición aún pendiente.');
    await editor.getByRole('button', { name: 'Ver técnica de Press de banca', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(editor.getByRole('spinbutton', { name: 'Series', exact: true })).toHaveValue('6');
    await expect(editor.getByRole('textbox', { name: 'Notas del ejercicio', exact: true })).toHaveValue('Edición aún pendiente.');
    expect(await readDatabase(page, 'personal')).toEqual(after);
    await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(await readDatabase(page, 'personal')).toEqual(after);
    expect(errors).toEqual([]);
  });
}

test('FT-012A.1: personalizado sin fotografía conserva SVG en selector, editor y detalle', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await page.getByRole('button', { name: 'Crear ejercicio', exact: true }).click();
  const custom = dialog(page, 'Crear ejercicio personalizado');
  await custom.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Remo propio sin foto');
  await custom.getByRole('combobox', { name: 'Músculo principal', exact: true }).selectOption('Espalda');
  await custom.getByRole('combobox', { name: 'Equipamiento', exact: true }).fill('Banda');
  await custom.getByRole('textbox', { name: 'Notas (opcional)', exact: true }).fill('Mantén el tronco estable.');
  await custom.getByRole('button', { name: 'Guardar ejercicio', exact: true }).click();
  await expect(custom).not.toBeVisible();
  await savedRoutine(page);
  await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click();
  const picker = dialog(page, 'Añadir ejercicio a la sesión');
  await picker.getByRole('searchbox').fill('Remo propio sin foto');
  const name = 'Ver técnica de Remo propio sin foto';
  await expect(picker.getByRole('button', { name, exact: true }).locator('svg.exercise-visual')).toBeVisible();
  await expect(picker.locator('img')).toHaveCount(0);
  await picker.getByRole('button', { name: 'Añadir Remo propio sin foto', exact: true }).click();
  const editor = dialog(page, 'Configurar ejercicio');
  const before = await readDatabase(page, 'personal');
  await editor.getByRole('spinbutton', { name: 'Series', exact: true }).fill('4');
  await editor.getByRole('button', { name, exact: true }).click();
  const technique = dialog(page, 'Remo propio sin foto');
  await expect(technique.locator('svg.exercise-visual')).toBeVisible();
  await expect(technique.locator('.exercise-notes')).toHaveText('Mantén el tronco estable.');
  await expect(technique.locator('img, [data-load-demonstration], .media-sources')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(editor.getByRole('spinbutton', { name: 'Series', exact: true })).toHaveValue('4');
  expect(await readDatabase(page, 'personal')).toEqual(before);
  await editor.getByRole('button', { name: 'Guardar objetivos', exact: true }).click();
  const row = page.locator('.prescription-row').last();
  await expect(row.locator('svg.exercise-visual')).toBeVisible();
  await expect(row.locator('img')).toHaveCount(0);
  await row.getByRole('button', { name, exact: true }).click();
  await page.keyboard.press('Escape');
  await fits(page);
});

test('FT-012A.1: editor compartido de propuestas conserva borrador y protección de salida', async ({ page }) => {
  await page.goto('./#/generador');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await page.locator('[data-generator-muscle="Pecho"]').click();
  await page.getByRole('button', { name: 'Generar propuesta', exact: true }).click();
  const draft = page.locator('.generator-editor');
  const before = await readDatabase(page, 'personal');
  const trigger = draft.getByRole('button', { name: 'Ver técnica de Flexiones', exact: true });
  await trigger.click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await draft.getByRole('button', { name: 'Editar objetivos de Flexiones', exact: true }).click();
  const editor = dialog(page, 'Configurar ejercicio');
  await editor.getByRole('spinbutton', { name: 'Series', exact: true }).fill('5');
  await editor.getByRole('textbox', { name: 'Notas del ejercicio', exact: true }).fill('Borrador sin guardar.');
  await editor.getByRole('button', { name: 'Ver técnica de Flexiones', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog(page, 'Flexiones').getByRole('button', { name: 'Ver secuencia', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(editor.getByRole('spinbutton', { name: 'Series', exact: true })).toHaveValue('5');
  await expect(editor.getByRole('textbox', { name: 'Notas del ejercicio', exact: true })).toHaveValue('Borrador sin guardar.');
  await editor.getByRole('button', { name: 'Guardar objetivos', exact: true }).click();
  await expect(draft.locator('.prescription-targets dd').first()).toHaveText('5');
  await expect(draft).toContainText('Borrador sin guardar.');
  expect(await readDatabase(page, 'personal')).toEqual(before);
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  })).toBe(true);
});
