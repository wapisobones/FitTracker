import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const name = 'Press inclinado de pecho en máquina';
const root = './assets/exercises/pecho/press-inclinado-maquina';
async function start(page) {
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
  await page.getByRole('searchbox', { name: 'Buscar por nombre', exact: true }).fill(name);
  await expect(page.locator('.exercise-card')).toHaveCount(1);
}
async function open(page) {
  await page.getByRole('button', { name: `Ver técnica de ${name}`, exact: true }).click();
  return page.getByRole('dialog', { name, exact: true });
}

test('Press inclinado: miniatura y dos posiciones en escritorio y móvil; crédito global', async ({ page }) => {
  await start(page);
  const credit = page.locator('.visual-credits li').filter({ has: page.getByText(name, { exact: true }) });
  await expect(credit).toHaveCount(1);
  await expect(credit).toContainText('Imágenes proporcionadas para FitTracker');
  await expect(credit.locator('a')).toHaveCount(0);
  for (const width of [1536, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.exercise-card .exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
    await expect(page.locator('.exercise-card img')).toHaveAttribute('src', `${root}-poster.webp`);
    const dialog = await open(page);
    await expect(dialog.locator('.exercise-media-still')).toHaveAttribute('data-media-state', 'ready');
    await expect(dialog.locator('.media-credit, .media-sources')).toHaveCount(0);
    await expect(dialog.locator('.technique-steps li')).toHaveCount(3);
    if (width === 390) {
      await mkdir('.cache/ft015c', { recursive: true });
      await page.screenshot({ path: '.cache/ft015c/incline-machine-390.png' });
    }
    await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
    const player = dialog.locator('img.technique-player');
    await expect(player).toHaveAttribute('src', `${root}.webp`);
    await expect.poll(() => player.evaluate((image) => image.complete && image.naturalWidth)).toBe(640);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole('button', { name: 'Volver a la imagen', exact: true }).click();
    await expect(player).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
});

test('Press inclinado: errores recuperan SVG y movimiento reducido detiene la secuencia', async ({ page }) => {
  await page.route('**/pecho/press-inclinado-maquina-poster.webp', (route) => route.abort());
  const sequence = '**/pecho/press-inclinado-maquina.webp';
  await page.route(sequence, (route) => route.abort());
  await start(page);
  const dialog = await open(page);
  await expect(dialog.locator('[data-exercise-thumbnail]')).toHaveCount(0);
  await expect(dialog.locator('svg.exercise-visual')).toBeVisible();
  await dialog.getByRole('button', { name: 'Ver secuencia', exact: true }).click();
  await expect(dialog.locator('.media-status')).toContainText('No se pudo cargar');
  await expect(dialog.locator('svg.exercise-visual')).toBeVisible();
  await page.unroute(sequence);
  await dialog.getByRole('button', { name: 'Reintentar demostración', exact: true }).click();
  await expect.poll(() => dialog.locator('.technique-player').evaluate((image) => image.complete && image.naturalWidth)).toBe(640);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog.locator('.technique-player')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Ver secuencia', exact: true })).toBeDisabled();
});
