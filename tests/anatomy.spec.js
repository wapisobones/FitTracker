import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { readDatabase, writeRecords, selectMode } from './helpers/storage.js';
import { backupFixture } from './helpers/backup.js';

const map = (page, id, side = 'front') => page.locator(`#map-${side}-${id}`);
const region = (page, id) => page.locator(`[data-generator-region="${id}"]`);
const group = (page, name) => page.locator(`[data-generator-muscle="${name}"]`);
async function start(page) {
  await page.goto('./#/generador');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generar propuesta', exact: true })).toBeEnabled();
}
async function openGroup(page, name) {
  const section = page.locator('.generator-region-group').filter({ has: page.getByRole('group', { name: `Regiones de ${name}`, exact: true, includeHidden: true }) });
  if (!await section.getAttribute('open').then((value) => value !== null)) await section.locator('summary').click();
}

test('Anatomía: teclado, selección bilateral, lista y grupos parciales sincronizados', async ({ page }) => {
  await start(page);
  await expect(page.locator('[data-body-side="front"]')).toBeVisible();
  await expect(page.locator('[data-body-side="back"]')).toBeVisible();
  const biceps = map(page, 'biceps');
  await biceps.focus();
  await expect(biceps).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(group(page, 'Brazos')).toHaveAttribute('aria-pressed', 'mixed');
  await expect(region(page, 'biceps')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.anatomy-readout')).toHaveText('Bíceps · Brazos');
  await expect(biceps).toBeFocused();
  await page.keyboard.press('Space');
  await expect(group(page, 'Brazos')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-map-muscle]:focus')).toHaveCount(1);
  await group(page, 'Hombros').click();
  await openGroup(page, 'Hombros');
  await region(page, 'lateral-deltoid').click();
  await expect(group(page, 'Hombros')).toHaveAttribute('aria-pressed', 'mixed');
  for (const side of ['front', 'back']) await expect(map(page, 'lateral-deltoid', side)).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#anatomy-front-lateral-deltoid-left-1').click();
  for (const side of ['front', 'back']) await expect(map(page, 'lateral-deltoid', side)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#anatomy-back-lateral-deltoid-right-1').click();
  await expect(region(page, 'lateral-deltoid')).toHaveAttribute('aria-pressed', 'false');
  await openGroup(page, 'Espalda');
  await region(page, 'rhomboids').click();
  await expect(group(page, 'Espalda')).toHaveAttribute('aria-pressed', 'mixed');
  await expect(page.locator('[data-map-muscle="rhomboids"], [data-map-muscle="spinal-erectors"]')).toHaveCount(0);
  await expect(region(page, 'rhomboids')).toHaveAccessibleDescription('Profundos al trapecio; selección solo por lista.');
  await expect(page.locator('.anatomy-compatibility')).toContainText('por grupo general');
  await mkdir('.cache', { recursive: true });
  await page.locator('.generator-map-card').screenshot({ path: '.cache/ft010a-desktop.png' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.cache/ft010a-desktop-viewport.png' });
});

test('Anatomía: datos v1 intactos, procedencia regional guardada y aislamiento', async ({ page }) => {
  await start(page);
  const old = backupFixture();
  old.stores.routines[0].origin = 'generator';
  old.stores.routines[0].generator = { version: 1, config: { modality: 'session', level: 'Principiante', goal: 'hypertrophy', muscles: ['Pecho'], priorities: [], equipment: ['Peso corporal'], frequency: 3, minutes: 30 } };
  await writeRecords(page, 'personal', old.stores);
  const before = await readDatabase(page, 'personal');
  await page.locator('#anatomy-front-pectorals-right-1').click();
  await page.getByRole('button', { name: 'Generar propuesta', exact: true }).click();
  await expect(page.locator('.generator-editor')).toContainText('Flexiones');
  await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Ver en Mis rutinas', exact: true })).toBeVisible();
  const saved = await readDatabase(page, 'personal');
  for (const store of ['exercises', 'workouts', 'setRecords', 'profiles', 'settings']) expect(saved[store]).toEqual(before[store]);
  expect(saved.routines.find((item) => item.id === before.routines[0].id)).toEqual(before.routines[0]);
  expect(saved.routineSessions.filter((item) => item.routineId === before.routines[0].id)).toEqual(before.routineSessions);
  const generated = saved.routines.find((item) => item.id !== before.routines[0].id);
  expect(generated.generator.config.muscles).toEqual(['Pecho']);
  expect(generated.generator.config.regions).toEqual(['pectorals']);
  await selectMode(page, 'demo');
  await expect(group(page, 'Pecho')).toHaveAttribute('aria-pressed', 'false');
  expect(await readDatabase(page, 'personal')).toEqual(saved);
  await selectMode(page, 'personal');
  await expect(group(page, 'Pecho')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  expect(await readDatabase(page, 'personal')).toEqual(saved);
});

test('Anatomía móvil: toque, vistas 320/390 px y alternativa táctil completa', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await start(page);
  await expect(page.locator('[data-body-side="back"]')).toBeHidden();
  await page.locator('#anatomy-front-pectorals-right-1').tap();
  await expect(group(page, 'Pecho')).toHaveAttribute('aria-pressed', 'true');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [view, side] of [['Espalda', 'back'], ['Frente', 'front'], ['Ambas', 'both']]) {
      await page.getByRole('group', { name: 'Vista del cuerpo', exact: true }).getByRole('button', { name: view, exact: true }).tap();
      await expect(page.locator('.generator-map')).toHaveAttribute('data-body-view', side);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (side === 'both') {
        for (const body of ['front', 'back']) {
          const size = await page.locator(`[data-body-side="${body}"] svg`).boundingBox();
          expect(size.width).toBeGreaterThan(230);
        }
      }
    }
    await page.getByRole('button', { name: 'Elegir desde la lista', exact: true }).tap();
    await expect(page.locator('#muscle-region-list')).toBeFocused();
    await openGroup(page, 'Piernas');
    const soleus = region(page, 'soleus');
    const size = await soleus.boundingBox();
    expect(size.height).toBeGreaterThanOrEqual(44);
    await soleus.tap();
    await expect(map(page, 'soleus', 'back')).toHaveAttribute('aria-pressed', width === 320 ? 'true' : 'false');
    await mkdir('.cache', { recursive: true });
    await page.locator('.generator-map-card').screenshot({ path: `.cache/ft010a-mobile-${width}.png` });
    await page.getByRole('group', { name: 'Vista del cuerpo', exact: true }).getByRole('button', { name: 'Frente', exact: true }).tap();
    await expect(page.locator('[data-body-side="back"]')).toBeHidden();
    await page.getByRole('button', { name: 'Elegir desde la lista', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(map(page, 'pectorals')).toBeFocused();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.cache/ft010a-mobile-${width}-viewport.png` });
  }
  await context.close();
});
