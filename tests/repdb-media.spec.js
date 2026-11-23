import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { REPDB_VISUAL_ASSETS } from '../src/data/repdb-visual-assets.js';
import { BASE_EXERCISES } from '../src/data/exercises.js';

const byNumber = (number) => BASE_EXERCISES[number - 1];
const openTechnique = async (page, exercise) => {
  await page.getByRole('button', { name: `Ver técnica de ${exercise.name}`, exact: true }).click();
  return page.getByRole('dialog', { name: exercise.name, exact: true });
};
async function start(page) {
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
}

for (const width of [1536, 390, 320]) {
  test(`FT-015C: imágenes, secuencias y créditos globales a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const animations = [];
    page.on('request', (request) => { if (/\/repdb\/[^/]+\.webp$/.test(request.url()) && !request.url().endsWith('-poster.webp')) animations.push(request.url()); });
    await start(page);
    await expect(page.locator('.exercise-card')).toHaveCount(80);
    await expect(page.locator('.exercise-card .media-credit, .exercise-card .media-sources')).toHaveCount(0);
    const credits = page.getByRole('region', { name: 'Créditos de recursos visuales', exact: true });
    const repdbLink = credits.getByRole('link', { name: 'Exercise data by RepDB (repdb.co)', exact: true });
    await repdbLink.scrollIntoViewIfNeeded();
    await expect(repdbLink).toBeVisible();
    await expect(repdbLink).toHaveAttribute('href', 'https://repdb.co');
    const summary = credits.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(credits.locator('details')).toHaveAttribute('open');
    await expect(credits.getByRole('heading', { name: 'free-exercise-db', exact: true })).toBeVisible();
    await expect(credits.getByRole('heading', { name: 'RepDB', exact: true })).toBeVisible();
    await expect(credits.locator('li')).toHaveCount(80);
    const license = credits.getByRole('link', { name: 'Licencia RepDB incluida con la aplicación', exact: true });
    const licenseResponse = await page.request.get(await license.getAttribute('href'));
    expect(licenseResponse.ok()).toBe(true);
    expect(await licenseResponse.text()).toContain('Attribution required');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await summary.focus();
    await page.keyboard.press('Enter');
    expect(animations).toHaveLength(0);
    await mkdir('.cache/ft015c', { recursive: true });
    await page.screenshot({ path: `.cache/ft015c/credits-${width}.png` });
    for (const asset of REPDB_VISUAL_ASSETS) {
      const exercise = BASE_EXERCISES.find(({ id }) => id === asset.id);
      const card = page.locator(`[data-exercise-id="${asset.id}"]`);
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
      await expect(card.locator('.preview-caption')).toHaveText('Ilustración de referencia');
      const dialog = await openTechnique(page, exercise);
      await expect(dialog.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
      await expect(dialog.locator('.media-credit, .media-sources')).toHaveCount(0);
      await expect(dialog.locator('img[data-exercise-thumbnail]')).toHaveAttribute('src', `./assets/exercises/repdb/${asset.slug}-poster.webp`);
      const before = animations.length;
      await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
      const player = dialog.locator('img.technique-player');
      await expect.poll(() => player.evaluate((image) => image.complete && image.naturalWidth)).toBe(640);
      await expect(player).toHaveAttribute('src', `./assets/exercises/repdb/${asset.slug}.webp`);
      expect(animations.length).toBe(before + 1);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      if (asset.slug === 'bird-dog') await page.screenshot({ path: `.cache/ft015c/bird-dog-${width}.png` });
      await dialog.getByRole('button', { name: 'Volver a la imagen', exact: true }).click();
      await expect(player).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
      await expect(dialog.locator('.technique-player')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.technique-player')).toHaveCount(0);
    }
    const incline = await openTechnique(page, byNumber(78));
    await expect(incline.locator('[data-exercise-thumbnail]')).toHaveAttribute('src', './assets/exercises/pecho/press-inclinado-maquina-poster.webp');
    await expect(incline.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    // An original photograph still uses the same file and has no inline credits.
    const original = await openTechnique(page, byNumber(1));
    await expect(original.locator('[data-exercise-thumbnail]')).toHaveAttribute('src', './assets/exercises/pecho/press-de-banca-poster.webp');
    await expect(original.locator('.media-credit, .media-sources')).toHaveCount(0);
  });
}

test('FT-015C: fallo de imagen/secuencia recupera SVG y permite reintentar', async ({ page }) => {
  const poster = '**/repdb/bird-dog-poster.webp';
  const sequence = '**/repdb/bird-dog.webp';
  await page.route(poster, (route) => route.abort());
  await page.route(sequence, (route) => route.abort());
  await start(page);
  const dialog = await openTechnique(page, byNumber(80));
  await expect(dialog.locator('[data-exercise-thumbnail]')).toHaveCount(0);
  await expect(dialog.locator('svg.exercise-visual')).toBeVisible();
  await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await expect(dialog.locator('.media-status')).toContainText('No se pudo cargar');
  await page.unroute(sequence);
  await dialog.getByRole('button', { name: 'Reintentar demostración', exact: true }).click();
  await expect.poll(() => dialog.locator('.technique-player').evaluate((image) => image.complete && image.naturalWidth)).toBe(640);
});

test('FT-015C: movimiento reducido conserva la imagen y detiene la secuencia', async ({ page }) => {
  await start(page);
  const dialog = await openTechnique(page, byNumber(80));
  await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
  await expect(dialog.locator('.technique-player')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeDisabled();
  await expect(dialog.locator('[data-reduced-motion-note]')).toBeVisible();
  await expect(dialog.locator('.exercise-media-still')).toBeVisible();
});
