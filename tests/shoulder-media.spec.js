import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { SHOULDER_VISUAL_ASSETS, SHOULDER_VISUAL_FALLBACKS } from '../src/data/shoulder-visual-assets.js';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { readDatabase } from './helpers/storage.js';

async function openShoulders(page) {
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
  await page.locator('[data-muscle="Hombros"]').click();
  await expect(page.locator('.exercise-card')).toHaveCount(12);
}
const triggerFor = (page, name = 'Press militar con mancuernas') => page.getByRole('button', { name: `Ver técnica de ${name}`, exact: true });
const dialogFor = (page, name = 'Press militar con mancuernas') => page.getByRole('dialog', { name, exact: true });
const animationRequests = (requests) => requests.filter((url) => /\/assets\/exercises\/hombros\/[^/]+\.webp$/.test(url) && !url.endsWith('-poster.webp'));

for (const width of [1536, 390, 320]) {
  test(`Hombros a ${width}px: doce pares, créditos y secuencias a demanda`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    const requests = [];
    page.on('request', (request) => requests.push(request.url()));
    await openShoulders(page);
    const before = await readDatabase(page, 'personal');
    await expect(page.locator('.exercise-card img')).toHaveCount(12);
    for (const asset of SHOULDER_VISUAL_ASSETS) {
      const trigger = triggerFor(page, asset.name);
      await trigger.scrollIntoViewIfNeeded();
      await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
      await expect(trigger.locator('img')).toHaveAttribute('src', `./assets/exercises/hombros/${asset.slug}-poster.webp`);
      await expect(trigger.locator('img')).toHaveAttribute('loading', 'lazy');
      await expect(trigger.locator('svg.exercise-visual')).not.toBeVisible();
    }
    expect(animationRequests(requests)).toHaveLength(0);
    await mkdir('.cache/ft010h', { recursive: true });
    await page.screenshot({ path: `.cache/ft010h/catalog-${width}.png`, fullPage: true });
    for (const asset of SHOULDER_VISUAL_ASSETS) {
      const exercise = BASE_EXERCISES.find((item) => item.id === asset.id);
      const trigger = triggerFor(page, asset.name);
      await trigger.click();
      const dialog = dialogFor(page, asset.name);
      await expect(dialog.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
      await expect(dialog.locator('.media-sources')).not.toHaveAttribute('open');
      await expect(dialog.locator('.media-credit')).not.toBeVisible();
      await expect(dialog.locator('.media-description')).not.toBeVisible();
      const sources = dialog.locator('.media-sources > summary');
      await expect(sources).toHaveText('Fuente de las imágenes');
      await sources.focus();
      await page.keyboard.press('Enter');
      if (asset.provenance === 'user-provided') {
        await expect(dialog.locator('.media-credit')).toContainText('Imágenes proporcionadas para FitTracker');
        await expect(dialog.getByRole('link', { name: 'Unlicense', exact: true })).toHaveCount(0);
      } else {
        await expect(dialog.getByRole('link', { name: 'Fuente', exact: true })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db');
        await expect(dialog.getByRole('link', { name: 'Unlicense', exact: true })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE');
      }
      if (asset.note) await expect(dialog.locator('.media-description')).toHaveText(asset.note);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.keyboard.press('Space');
      await expect(dialog.locator('.media-sources')).not.toHaveAttribute('open');
      await expect(dialog.locator('.technique-steps li')).toHaveText(exercise.technique.steps);
      await expect(dialog.locator('.technique-tips li span')).toHaveText(exercise.technique.tips);
      await expect(dialog.locator('.exercise-anatomy dd').first()).toHaveText('Hombros');
      await expect(dialog.locator('video, iframe, .technique-player')).toHaveCount(0);
      const previous = animationRequests(requests).length;
      await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
      const sequence = dialog.locator('img.technique-player');
      await expect.poll(() => sequence.evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
      expect(await sequence.evaluate((img) => new URL(img.src).pathname)).toBe(`/FitTracker/assets/exercises/hombros/${asset.slug}.webp`);
      expect(animationRequests(requests)).toHaveLength(previous + 1);
      expect(await sequence.evaluate((img) => Math.abs(img.clientWidth / img.clientHeight - 640 / 427) < 0.02)).toBe(true);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      if (width === 1536 && asset.slug === 'elevacion-lateral-en-maquina') {
        const initialFrame = await sequence.screenshot();
        await expect.poll(async () => (await sequence.screenshot()).equals(initialFrame), { timeout: 4000 }).toBe(false);
        await expect.poll(async () => (await sequence.screenshot()).equals(initialFrame), { timeout: 4000 }).toBe(true);
      }
      if (['press-militar-con-mancuernas', 'face-pull', 'remo-de-deltoides-posterior-con-pecho-apoyado', 'elevacion-lateral-en-maquina'].includes(asset.slug)) {
        await page.screenshot({ path: `.cache/ft010h/${asset.slug}-${width}.png` });
      }
      await sequence.evaluate((img) => { window.testShoulderSequence = img; });
      await dialog.getByRole('button', { name: 'Volver a la imagen', exact: true }).click();
      await expect(sequence).toHaveCount(0);
      expect(await page.evaluate(() => ({ connected: window.testShoulderSequence.isConnected, src: window.testShoulderSequence.getAttribute('src') }))).toEqual({ connected: false, src: null });
      await expect(dialog.locator('.exercise-media-still')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeFocused();
      await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
      await expect(sequence).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(dialog.locator('.technique-player')).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
    for (const fallback of SHOULDER_VISUAL_FALLBACKS) {
      const trigger = triggerFor(page, fallback.name);
      await trigger.scrollIntoViewIfNeeded();
      await expect(trigger.locator('img')).toHaveCount(0);
      await expect(trigger.locator('svg.exercise-visual')).toBeVisible();
      await trigger.click();
      const dialog = dialogFor(page, fallback.name);
      await expect(dialog.locator('.technique-illustration svg')).toBeVisible();
      await expect(dialog.locator('img, video, iframe, .media-sources, [data-load-demonstration]')).toHaveCount(0);
      await expect(dialog.locator('.technique-steps li')).toHaveText(BASE_EXERCISES.find((e) => e.id === fallback.id).technique.steps);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({ path: `.cache/ft010h/fallback-${width}.png` });
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(requests.some((url) => /recursos-originales|\.(jpg|png)(?:\?|$)/i.test(url))).toBe(false);
    expect(await readDatabase(page, 'personal')).toEqual(before);
  });
}

test('Hombros: errores de fotografía y secuencia recuperan SVG, instrucciones y reintento', async ({ page }) => {
  const name = 'Elevación lateral en máquina';
  const imagePath = '**/assets/exercises/hombros/elevacion-lateral-en-maquina-poster.webp';
  const sequencePath = '**/assets/exercises/hombros/elevacion-lateral-en-maquina.webp';
  await page.route(imagePath, (route) => route.abort());
  await page.route(sequencePath, (route) => route.abort());
  await openShoulders(page);
  const trigger = triggerFor(page, name);
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(trigger.locator('svg.exercise-visual')).toBeVisible();
  await trigger.click();
  const dialog = dialogFor(page, name);
  await expect(dialog.locator('.media-status')).toContainText('No se pudo cargar la imagen');
  await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
  await expect(dialog.locator('.media-status')).toContainText('No se pudo cargar la secuencia');
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await expect(dialog.locator('.technique-illustration svg')).toBeVisible();
  await expect(dialog.locator('.technique-steps')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Reintentar demostración', exact: true })).toBeFocused();
  await page.unroute(sequencePath);
  await dialog.getByRole('button', { name: 'Reintentar demostración', exact: true }).click();
  await expect.poll(() => dialog.locator('img.technique-player').evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
});

test('Hombros: movimiento reducido conserva la imagen y detiene una secuencia activa', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await openShoulders(page);
  await triggerFor(page).click();
  const dialog = dialogFor(page);
  const play = dialog.getByRole('button', { name: 'Ver secuencia', exact: true });
  await expect(play).toBeDisabled();
  await expect(dialog.locator('[data-reduced-motion-note]')).toBeVisible();
  expect(animationRequests(requests)).toHaveLength(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(play).toBeEnabled();
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await play.click();
  await expect(dialog.locator('img.technique-player')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await expect(dialog.locator('.exercise-media-still')).toBeVisible();
  await expect(play).toBeDisabled();
});
