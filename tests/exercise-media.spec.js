import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { readDatabase } from './helpers/storage.js';
import { CORE_VISUAL_ASSETS } from '../src/data/core-visual-assets.js';
import { BASE_EXERCISES } from '../src/data/exercises.js';

async function openCore(page) {
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
  await page.locator('[data-muscle="Core"]').click();
  await expect(page.locator('.exercise-card')).toHaveCount(12);
}
const triggerFor = (page, name) => page.getByRole('button', { name: `Ver técnica de ${name}`, exact: true });
const dialogFor = (page, name) => page.getByRole('dialog', { name, exact: true });
const animatedRequests = (requests) => requests.filter((url) => /\/assets\/exercises\/core\/[^/]+\.webp$/.test(url) && !url.endsWith('-poster.webp'));

test('Doce Core: miniaturas, secuencias locales a demanda, detención, cierre y datos intactos', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await openCore(page);
  const before = await readDatabase(page, 'personal');
  await expect(page.locator('.exercise-card img')).toHaveCount(12);
  for (const asset of CORE_VISUAL_ASSETS) {
    const trigger = triggerFor(page, asset.name);
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
    await expect(trigger.locator('img')).toHaveAttribute('src', `./assets/exercises/core/${asset.slug}-poster.webp`);
    await expect(trigger.locator('img')).toHaveAttribute('loading', 'lazy');
    await expect(trigger.locator('svg.exercise-visual')).not.toBeVisible();
  }
  expect(animatedRequests(requests)).toHaveLength(0);
  await expect(page.locator('.exercise-grid video, .exercise-grid iframe, .exercise-grid .technique-player')).toHaveCount(0);
  await mkdir('.cache/ft010d-local', { recursive: true });
  await page.screenshot({ path: '.cache/ft010d-local/catalog-1536.png', fullPage: true });

  for (const asset of CORE_VISUAL_ASSETS) {
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
    await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(sources).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog.locator('.media-credit')).toBeVisible();
    if (asset.provenance === 'user-provided') {
      await expect(dialog.locator('.media-credit')).toContainText('Imágenes proporcionadas para FitTracker');
      await expect(dialog.getByRole('link', { name: 'Unlicense', exact: true })).toHaveCount(0);
    } else {
      await expect(dialog.getByRole('link', { name: 'Unlicense', exact: true })).toBeVisible();
      await expect(dialog.getByRole('link', { name: 'Fuente', exact: true })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db');
      await expect(dialog.getByRole('link', { name: 'Unlicense', exact: true })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE');
    }
    await page.keyboard.press('Space');
    await expect(dialog.locator('.media-sources')).not.toHaveAttribute('open');
    await expect(dialog.locator('.technique-steps li')).toHaveText(exercise.technique.steps);
    await expect(dialog.locator('.technique-tips li span')).toHaveText(exercise.technique.tips);
    await expect(dialog.locator('.exercise-anatomy dd').first()).toHaveText('Core');
    await expect(dialog.locator('video, iframe, .technique-player')).toHaveCount(0);
    const previous = animatedRequests(requests).length;
    await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
    const sequence = dialog.locator('img.technique-player');
    await expect.poll(() => sequence.evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
    expect(await sequence.evaluate((img) => new URL(img.src).pathname)).toBe(`/FitTracker/assets/exercises/core/${asset.slug}.webp`);
    expect(animatedRequests(requests).length).toBe(previous + 1);
    await expect(dialog.locator('[data-media-label]')).toHaveText(asset.provenance === 'user-provided' ? 'Secuencia de 2 imágenes · No es un vídeo' : 'Secuencia de 2 fotografías · No es un vídeo');
    if (asset.match === 'aproximada') await expect(dialog.locator('.media-description')).toContainText('correspondencia aproximada');
    if (asset.slug === 'crunch-abdominal') await page.screenshot({ path: '.cache/ft010d-local/crunch-1536.png' });
    await sequence.evaluate((img) => { window.testSequence = img; });
    await dialog.getByRole('button', { name: 'Volver a la imagen', exact: true }).click();
    await expect(sequence).toHaveCount(0);
    expect(await page.evaluate(() => ({ connected: window.testSequence.isConnected, src: window.testSequence.getAttribute('src') }))).toEqual({ connected: false, src: null });
    await expect(dialog.locator('.exercise-media-still')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
    await expect(sequence).toBeVisible();
    await sequence.evaluate((img) => { window.testSequence = img; });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => ({ connected: window.testSequence.isConnected, src: window.testSequence.getAttribute('src') }))).toEqual({ connected: false, src: null });
  }
  expect(requests.some((url) => /recursos-originales|\.jpg(?:\?|$)|\/media\/core\/|\.(webm|mp4)(?:\?|$)/i.test(url))).toBe(false);
  expect(await readDatabase(page, 'personal')).toEqual(before);
});

test('Sin archivos, Plancha alta con toques de hombro recupera SVG', async ({ page }) => {
  await page.route('**/assets/exercises/core/plancha-toque-hombro*.webp', (route) => route.abort());
  await openCore(page);
  const name = 'Plancha alta con toques de hombro';
  const trigger = triggerFor(page, name);
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(trigger.locator('img')).toHaveCount(0);
  await expect(trigger.locator('svg.exercise-visual')).toBeVisible();
  await trigger.click();
  const dialog = dialogFor(page, name);
  await expect(dialog.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'error');
  await expect(dialog.locator('.technique-illustration svg')).toBeVisible();
  await expect(dialog.locator('.technique-steps li')).toHaveCount(3);
  await expect(dialog.locator('.technique-tips li')).toHaveCount(2);
  await expect(dialog.locator('img, video, iframe')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
  await expect(dialog.locator('.media-status')).toContainText('No se pudo cargar la secuencia');
  await expect(dialog.locator('.technique-illustration svg')).toBeVisible();
  await page.keyboard.press('Escape');
});

for (const posterFails of [false, true]) {
  test(`Recursos ausentes: recupera ${posterFails ? 'SVG' : 'miniatura'} e instrucciones y permite reintentar`, async ({ page }) => {
    const animationPath = '**/assets/exercises/core/crunch-abdominal.webp';
    const posterPath = '**/assets/exercises/core/crunch-abdominal-poster.webp';
    await page.route(animationPath, (route) => route.abort());
    if (posterFails) await page.route(posterPath, (route) => route.abort());
    await openCore(page);
    const trigger = triggerFor(page, 'Crunch abdominal');
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', posterFails ? 'error' : 'ready');
    await trigger.click();
    const dialog = dialogFor(page, 'Crunch abdominal');
    if (posterFails) await expect(dialog.locator('.media-status')).toContainText('No se pudo cargar la imagen');
    await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
    await expect(dialog.locator('.media-status')).toContainText('No se pudo cargar la secuencia');
    await expect(dialog.locator('.technique-player')).toHaveCount(0);
    await expect(dialog.locator('.exercise-media-still')).toBeVisible();
    await expect(dialog.locator('.technique-illustration svg')).toBeVisible({ visible: posterFails });
    await expect(dialog.locator('.technique-steps')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Reintentar demostración', exact: true })).toBeFocused();
    await page.unroute(animationPath);
    await dialog.getByRole('button', { name: 'Reintentar demostración', exact: true }).click();
    await expect.poll(() => dialog.locator('img.technique-player').evaluate((img) => img.complete && img.naturalWidth)).toBe(640);
  });
}

test('Movimiento reducido: fotografía estática, sin solicitudes de animación y detención al cambiar la preferencia', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await openCore(page);
  await triggerFor(page, 'Crunch abdominal').click();
  const dialog = dialogFor(page, 'Crunch abdominal');
  const play = dialog.getByRole('button', { name: 'Ver secuencia', exact: true });
  await expect(play).toBeDisabled();
  await expect(dialog.locator('[data-reduced-motion-note]')).toBeVisible();
  await expect(dialog.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
  expect(animatedRequests(requests)).toHaveLength(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(play).toBeEnabled();
  await expect(dialog.locator('[data-reduced-motion-note]')).not.toBeVisible();
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await play.click();
  await expect(dialog.locator('img.technique-player')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await expect(dialog.locator('.exercise-media-still')).toBeVisible();
  await expect(play).toBeDisabled();
  await expect(dialog.locator('[data-reduced-motion-note]')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(play).toBeEnabled();
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
});

for (const width of [390, 320]) {
  test(`Doce Core sin desbordamiento y con encuadre completo a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openCore(page);
    await mkdir('.cache/ft010d-local', { recursive: true });
    for (const asset of CORE_VISUAL_ASSETS) {
      const trigger = triggerFor(page, asset.name);
      await trigger.scrollIntoViewIfNeeded();
      await expect(trigger.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
      await trigger.click();
      const dialog = dialogFor(page, asset.name);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      if (['crunch-abdominal', 'plancha-toque-hombro'].includes(asset.slug)) {
        await dialog.locator('.media-sources > summary').click();
        await expect(dialog.locator('.media-credit')).toBeVisible();
        expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
        await dialog.locator('.media-sources > summary').click();
      }
      await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
      const sequence = dialog.locator('img.technique-player');
      await expect.poll(() => sequence.evaluate((img) => img.complete && img.naturalHeight)).toBe(427);
      expect(await sequence.evaluate((img) => Math.abs(img.clientWidth / img.clientHeight - 640 / 427) < 0.02)).toBe(true);
      if (['crunch-abdominal', 'dead-bug', 'lenador-en-polea-alta', 'plancha-toque-hombro'].includes(asset.slug)) {
        await page.screenshot({ path: `.cache/ft010d-local/${asset.slug}-${width}.png` });
      }
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await dialog.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
      await expect(dialog).not.toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.cache/ft010d-local/catalog-${width}.png`, fullPage: true });
  });
}
