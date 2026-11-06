import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { ROUTINE_TEMPLATES } from '../src/data/routine-templates.js';
import { readDatabase } from './helpers/storage.js';

const technique = (page, name) => page.getByRole('dialog', { name, exact: true });
const animations = (requests) => requests.filter((url) => /\/assets\/exercises\/[^/]+\/[^/]+\.webp$/.test(url) && !url.endsWith('-poster.webp'));
async function start(page, route) {
  await page.goto(`./#/${route}`);
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.locator(route === 'generador' ? '#generator-form' : '.routine-detail h2')).toBeVisible();
}
async function noOverflow(page, dialog) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (dialog) expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
}

// Compare with the previous SVG markup in the same layout, at each viewport.
async function compactGeometry(page, generator) {
  const sizes = await page.locator(generator ? '.generator-available-list li' : '.prescription-row').evaluateAll((rows, generator) => rows.map((row) => {
    const thumb = row.querySelector(generator ? '.generator-thumb' : '.prescription-thumb');
    const measure = (node) => { const { width, height } = node.getBoundingClientRect(); return { width, height }; };
    const current = { row: measure(row), thumb: measure(thumb) };
    const reference = row.cloneNode(true);
    const button = reference.querySelector('.compact-technique');
    const svg = button.querySelector('svg.exercise-visual');
    button.querySelector('.exercise-media-still')?.replaceWith(svg);
    if (generator) {
      const image = button.firstElementChild;
      const copy = document.createElement('div');
      copy.innerHTML = button.lastElementChild.innerHTML;
      // The original li > span rule, replaced by .generator-thumb in FT-012A.
      image.style.cssText = 'flex: 0 0 57px; border-radius: 7px; background: #142730; overflow: hidden;';
      button.replaceWith(image, copy);
    } else {
      const name = document.createElement('div');
      name.className = 'prescription-name';
      name.innerHTML = button.innerHTML;
      button.replaceWith(name);
    }
    row.after(reference);
    const previous = { row: measure(reference), thumb: measure(reference.querySelector(generator ? '.generator-thumb' : '.prescription-thumb')) };
    reference.remove();
    return { current, previous };
  }), generator);
  for (const { current, previous } of sizes) {
    expect(current.row.width).toBeCloseTo(previous.row.width, 1);
    expect(current.row.height).toBeCloseTo(previous.row.height, 1);
    expect(current.thumb.width).toBeCloseTo(previous.thumb.width, 1);
    expect(current.thumb.height).toBeCloseTo(previous.thumb.height, 1);
    expect(current.thumb.width).toBe(generator ? 57 : (page.viewportSize().width <= 600 ? 36 : 62));
  }
}

async function checkTechnique(page, exercise, { play = true } = {}) {
  const dialog = technique(page, exercise.name);
  await expect(dialog.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await expect(dialog.locator('.technique-steps li')).toHaveText(exercise.technique.steps);
  await expect(dialog.locator('.technique-tips li span')).toHaveText(exercise.technique.tips);
  await expect(dialog.locator('.exercise-anatomy dd').first()).toHaveText(exercise.mainMuscle);
  await expect(dialog.locator('.exercise-anatomy dd')).toHaveCount(3);
  await expect(dialog.locator('.media-sources')).not.toHaveAttribute('open');
  const source = dialog.getByText('Fuente de las imágenes', { exact: true });
  await source.focus();
  await page.keyboard.press('Enter');
  await expect(dialog.locator('.media-credit')).toBeVisible();
  await noOverflow(page, dialog);
  await page.keyboard.press('Space');
  if (play) {
    await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
    const player = dialog.locator('img.technique-player');
    await expect.poll(() => player.evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
    expect(await player.evaluate((img) => new URL(img.src).pathname)).toMatch(/^\/FitTracker\/assets\/exercises\//);
    await player.evaluate((img) => { window.ft012aPlayer = img; });
    await dialog.getByRole('button', { name: 'Volver a la imagen', exact: true }).click();
    expect(await page.evaluate(() => ({ connected: window.ft012aPlayer.isConnected, src: window.ft012aPlayer.getAttribute('src') }))).toEqual({ connected: false, src: null });
    await expect(dialog.locator('.exercise-media-still')).toBeVisible();
  }
  return dialog;
}

for (const width of [1536, 390, 320]) {
  test(`FT-012A ${width}px: generador conserva configuración y propuesta al consultar técnica`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    const errors = [];
    const requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => requests.push(request.url()));
    await start(page, 'generador');
    await page.locator('[data-generator-muscle="Pecho"]').click();
    const form = page.locator('#generator-form');
    await form.locator('[name="level"]').selectOption('Intermedio');
    await form.locator('[name="goal"]').selectOption('strength');
    await form.locator('[name="minutes"]').fill('55');
    await form.locator('[data-generator-priority="Pecho"]').check();
    await form.getByText('Equipamiento disponible', { exact: true }).click();
    const list = page.locator('.generator-available-list');
    for (const row of await list.locator('li').all()) {
      await row.scrollIntoViewIfNeeded();
      await expect(row.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
      await expect(row.locator('img')).toHaveAttribute('src', /-poster\.webp$/);
      await expect(row.locator('img')).toHaveCSS('object-fit', 'contain');
    }
    await compactGeometry(page, true);
    expect(animations(requests)).toHaveLength(0);
    await page.getByRole('button', { name: 'Generar propuesta', exact: true }).click();
    await expect(page.locator('.generator-editor .prescription-row').first()).toBeVisible();
    const draft = page.locator('.generator-editor');
    const before = { draft: await draft.innerHTML(), form: await form.evaluate((node) => [...new FormData(node)]), url: page.url(), database: await readDatabase(page, 'personal') };
    const exercise = BASE_EXERCISES.find((item) => item.name === 'Press de banca');
    const trigger = list.getByRole('button', { name: `Ver técnica de ${exercise.name}`, exact: true });
    await trigger.locator('.generator-thumb').click();
    expect(animations(requests)).toHaveLength(0);
    const dialog = await checkTechnique(page, exercise);
    await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
    await expect(dialog.locator('.technique-player')).toBeVisible();
    await dialog.locator('.technique-player').evaluate((img) => { window.ft012aPlayer = img; });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => ({ connected: window.ft012aPlayer.isConnected, src: window.ft012aPlayer.getAttribute('src') }))).toEqual({ connected: false, src: null });
    await trigger.locator('strong').click();
    await expect(technique(page, exercise.name)).toBeVisible();
    await technique(page, exercise.name).getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    await page.keyboard.press('Escape');
    await trigger.press('Space');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    expect(await form.evaluate((node) => [...new FormData(node)])).toEqual(before.form);
    expect(await draft.innerHTML()).toBe(before.draft);
    expect(page.url()).toBe(before.url);
    await expect(page.locator('[data-generator-muscle="Pecho"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(form.locator('.generator-equipment')).toHaveAttribute('open');
    expect(await readDatabase(page, 'personal')).toEqual(before.database);
    await noOverflow(page);
    await mkdir('.cache/ft012a', { recursive: true });
    await list.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.cache/ft012a/generator-${width}.png` });
    await trigger.click();
    await page.screenshot({ path: `.cache/ft012a/generator-technique-${width}.png` });
    expect(errors).toEqual([]);
  });

  test(`FT-012A ${width}px: todas las sesiones de plantillas conservan objetivos y permiten guardar`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    const errors = [];
    const requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => requests.push(request.url()));
    await start(page, 'predisenadas');
    const before = await readDatabase(page, 'personal');
    for (const template of ROUTINE_TEMPLATES) {
      await page.locator(`[data-select-routine="${template.id}"]`).click();
      for (const session of template.sessions) {
        await page.locator(`[data-select-session="${session.id}"]`).click();
        const rows = page.locator('.prescription-row');
        const expected = session.prescriptions.map((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId).name);
        await expect(rows.locator('strong')).toHaveText(expected);
        for (const row of await rows.all()) {
          await row.scrollIntoViewIfNeeded();
          await expect(row.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
          await expect(row.locator('img')).toHaveAttribute('src', /-poster\.webp$/);
        }
        await compactGeometry(page, false);
        const markup = await page.locator('.routine-detail').innerHTML();
        const url = page.url();
        const priorRequests = animations(requests).length;
        const first = rows.first().locator('[data-technique]');
        await first.locator('.prescription-thumb').click();
        expect(animations(requests)).toHaveLength(priorRequests);
        const exercise = BASE_EXERCISES.find((item) => item.id === session.prescriptions[0].exerciseId);
        const dialog = await checkTechnique(page, exercise);
        await dialog.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
        await expect(first).toBeFocused();
        const last = rows.last().locator('[data-technique]');
        await last.locator('strong').click();
        await page.keyboard.press('Escape');
        await expect(last).toBeFocused();
        await last.press('Enter');
        await page.keyboard.press('Escape');
        await expect(page.locator(`[data-select-session="${session.id}"]`)).toHaveAttribute('aria-pressed', 'true');
        expect(page.url()).toBe(url);
        expect(await page.locator('.routine-detail').innerHTML()).toBe(markup);
        await expect(rows.locator('.prescription-targets dd')).toHaveText(session.prescriptions.flatMap((item) => [String(item.sets), item.repsMin === item.repsMax ? String(item.repsMin) : `${item.repsMin}–${item.repsMax}`, `${item.restSeconds} s`]));
        await noOverflow(page);
      }
    }
    expect(await readDatabase(page, 'personal')).toEqual(before);
    const lastTemplate = ROUTINE_TEMPLATES.at(-1);
    await mkdir('.cache/ft012a', { recursive: true });
    await page.locator('.prescription-row').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.cache/ft012a/templates-${width}.png` });
    await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
    const stored = await readDatabase(page, 'personal');
    expect(stored.routines).toHaveLength(1);
    expect(stored.routines[0].name).toBe(lastTemplate.name);
    expect(stored.routineSessions.sort((a, b) => a.order - b.order).map((session) => session.prescriptions.map(({ exerciseId, sets, repsMin, repsMax, restSeconds }) => ({ exerciseId, sets, repsMin, repsMax, restSeconds })))).toEqual(lastTemplate.sessions.map((session) => session.prescriptions.map(({ exerciseId, sets, repsMin, repsMax, restSeconds }) => ({ exerciseId, sets, repsMin, repsMax, restSeconds }))));
    await page.getByRole('link', { name: 'Ver copia en Mis rutinas', exact: true }).click();
    await expect(page.locator('.routine-detail h2')).toHaveText(lastTemplate.name);
    expect(errors).toEqual([]);
  });
}

test('FT-012A: SVG sin recurso y ante fallos, reintento y movimiento reducido', async ({ page }) => {
  const poster = '**/assets/exercises/pecho/press-de-banca-poster.webp';
  const sequence = '**/assets/exercises/pecho/press-de-banca.webp';
  await page.route(poster, (route) => route.abort());
  await page.route(sequence, (route) => route.abort());
  await start(page, 'generador');
  await page.locator('[data-generator-muscle="Pecho"]').click();
  await page.locator('#generator-form [name="level"]').selectOption('Intermedio');
  const trigger = page.locator('.generator-available-list').getByRole('button', { name: 'Ver técnica de Press de banca', exact: true });
  await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(trigger.locator('svg.exercise-visual')).toBeVisible();
  await trigger.click();
  const dialog = technique(page, 'Press de banca');
  await expect(dialog.locator('svg.exercise-visual')).toBeVisible();
  await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
  await expect(dialog.locator('.media-status')).toContainText('No se pudo cargar la secuencia');
  await expect(dialog.locator('.technique-steps')).toBeVisible();
  await page.unroute(sequence);
  await dialog.getByRole('button', { name: 'Reintentar demostración', exact: true }).click();
  await expect.poll(() => dialog.locator('.technique-player').evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await trigger.click();
  await expect(dialog.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeDisabled();
  await expect(dialog.locator('[data-reduced-motion-note]')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('./#/predisenadas');
  await page.locator(`[data-select-routine="${ROUTINE_TEMPLATES[1].id}"]`).click();
  // Torso A contains Press de banca with the same failed poster.
  const templateTrigger = page.locator('.prescription-list').getByRole('button', { name: 'Ver técnica de Press de banca', exact: true });
  await expect(templateTrigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(templateTrigger.locator('svg.exercise-visual')).toBeVisible();
  await templateTrigger.click();
  await expect(technique(page, 'Press de banca').locator('.technique-steps')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Crear ejercicio', exact: true }).click();
  const editor = technique(page, 'Crear ejercicio personalizado');
  await editor.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Pecho propio sin foto');
  await editor.getByRole('combobox', { name: 'Músculo principal', exact: true }).selectOption('Pecho');
  await editor.getByRole('combobox', { name: 'Equipamiento', exact: true }).fill('Peso corporal');
  await editor.getByRole('combobox', { name: 'Dificultad (opcional)', exact: true }).selectOption('Principiante');
  await editor.getByRole('button', { name: 'Guardar ejercicio', exact: true }).click();
  await expect(editor).not.toBeVisible();
  await page.goto('./#/generador');
  const custom = page.getByRole('button', { name: 'Ver técnica de Pecho propio sin foto', exact: true });
  await expect(custom.locator('svg.exercise-visual')).toBeVisible();
  await expect(custom.locator('img')).toHaveCount(0);
  await custom.press('Enter');
  await expect(technique(page, 'Pecho propio sin foto').getByRole('heading', { name: 'Notas del ejercicio', exact: true })).toBeVisible();
  await expect(technique(page, 'Pecho propio sin foto').locator('[data-load-demonstration], .media-sources')).toHaveCount(0);
});
