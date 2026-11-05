import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { CHEST_VISUAL_ASSETS } from '../src/data/chest-visual-assets.js';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { readDatabase } from './helpers/storage.js';

async function openChest(page) {
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
  await page.locator('[data-muscle="Pecho"]').click();
  await expect(page.locator('.exercise-card')).toHaveCount(12);
}
const triggerFor = (page, name = 'Press de banca') => page.getByRole('button', { name: `Ver técnica de ${name}`, exact: true });
const dialogFor = (page, name = 'Press de banca') => page.getByRole('dialog', { name, exact: true });
const animationRequests = (requests) => requests.filter((url) => /\/assets\/exercises\/pecho\/[^/]+\.webp$/.test(url) && !url.endsWith('-poster.webp'));

for (const width of [1536, 390, 320]) {
  test(`Pecho a ${width}px: doce pares, créditos plegados, secuencias a demanda y detención`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    const requests = [];
    page.on('request', (request) => requests.push(request.url()));
    await openChest(page);
    const before = await readDatabase(page, 'personal');
    for (const asset of CHEST_VISUAL_ASSETS) {
      const trigger = triggerFor(page, asset.name);
      await trigger.scrollIntoViewIfNeeded();
      await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
      await expect(trigger.locator('img')).toHaveAttribute('src', `./assets/exercises/pecho/${asset.slug}-poster.webp`);
      await expect(trigger.locator('img')).toHaveAttribute('loading', 'lazy');
      await expect(trigger.locator('svg.exercise-visual')).not.toBeVisible();
    }
    expect(animationRequests(requests)).toHaveLength(0);
    await expect(page.locator('.exercise-grid video, .exercise-grid iframe, .exercise-grid .technique-player')).toHaveCount(0);
    await mkdir('.cache/ft010e', { recursive: true });
    await page.screenshot({ path: `.cache/ft010e/catalog-${width}.png`, fullPage: true });
    for (const asset of CHEST_VISUAL_ASSETS) {
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
      await expect(dialog.getByRole('link', { name: 'Fuente', exact: true })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db');
      await expect(dialog.getByRole('link', { name: 'Unlicense', exact: true })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE');
      if (asset.match === 'aproximada') await expect(dialog.locator('.media-description')).toHaveText(asset.note);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.keyboard.press('Space');
      await expect(dialog.locator('.media-sources')).not.toHaveAttribute('open');
      await expect(dialog.locator('.technique-steps li')).toHaveText(exercise.technique.steps);
      await expect(dialog.locator('.technique-tips li span')).toHaveText(exercise.technique.tips);
      await expect(dialog.locator('.exercise-anatomy dd').first()).toHaveText('Pecho');
      await expect(dialog.locator('video, iframe, .technique-player')).toHaveCount(0);
      const previous = animationRequests(requests).length;
      await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
      const sequence = dialog.locator('img.technique-player');
      await expect.poll(() => sequence.evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
      expect(await sequence.evaluate((img) => new URL(img.src).pathname)).toBe(`/FitTracker/assets/exercises/pecho/${asset.slug}.webp`);
      expect(animationRequests(requests)).toHaveLength(previous + 1);
      expect(await sequence.evaluate((img) => Math.abs(img.clientWidth / img.clientHeight - 640 / 427) < 0.02)).toBe(true);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      if (['press-de-banca', 'press-unilateral-de-pecho-en-polea', 'fondos-asistidos-con-torso-inclinado'].includes(asset.slug)) {
        await page.screenshot({ path: `.cache/ft010e/${asset.slug}-${width}.png` });
      }
      await sequence.evaluate((img) => { window.testChestSequence = img; });
      await dialog.getByRole('button', { name: 'Volver a la imagen', exact: true }).click();
      await expect(sequence).toHaveCount(0);
      expect(await page.evaluate(() => ({ connected: window.testChestSequence.isConnected, src: window.testChestSequence.getAttribute('src') }))).toEqual({ connected: false, src: null });
      await expect(dialog.locator('.exercise-media-still')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeFocused();
      await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
      await expect(sequence).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(dialog.locator('.technique-player')).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(requests.some((url) => /recursos-originales|\.jpg(?:\?|$)/i.test(url))).toBe(false);
    expect(await readDatabase(page, 'personal')).toEqual(before);
  });
}

test('Pecho: fallos de imagen/secuencia recuperan SVG e instrucciones y permiten reintentar', async ({ page }) => {
  const imagePath = '**/assets/exercises/pecho/press-de-banca-poster.webp';
  const sequencePath = '**/assets/exercises/pecho/press-de-banca.webp';
  await page.route(imagePath, (route) => route.abort());
  await page.route(sequencePath, (route) => route.abort());
  await openChest(page);
  const trigger = triggerFor(page);
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(trigger.locator('svg.exercise-visual')).toBeVisible();
  await trigger.click();
  const dialog = dialogFor(page);
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

test('Pecho: movimiento reducido impide la animación y la detiene al activarse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await openChest(page);
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

test('Piernas, Hombros y Brazos mantienen SVG y no ofrecen créditos inexistentes', async ({ page }) => {
  await openChest(page);
  for (const group of ['Piernas', 'Hombros', 'Brazos']) {
    await page.locator(`[data-muscle="${group}"]`).click();
    await expect(page.locator('.exercise-card')).toHaveCount(12);
    await expect(page.locator('.exercise-card img')).toHaveCount(0);
    await expect(page.locator('.exercise-card svg.exercise-visual')).toHaveCount(12);
  }
  await page.locator('[data-muscle="Piernas"]').click();
  await triggerFor(page, 'Sentadilla con barra').click();
  await expect(dialogFor(page, 'Sentadilla con barra').locator('.media-sources')).toHaveCount(0);
});
