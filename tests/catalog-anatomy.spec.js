import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { readDatabase, writeRecords } from './helpers/storage.js';
import { backupFixture } from './helpers/backup.js';

async function start(page, route = 'ejercicios') {
  await page.goto(`./#/${route}`);
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
}
const chooseRegion = async (page, group, id) => {
  const region = page.locator(`[data-generator-region="${id}"]`);
  const details = page.locator('.generator-region-group').filter({ has: region });
  if (!await details.evaluate((element) => element.open)) await details.locator('summary').click();
  await region.click();
  await expect(region).toHaveAttribute('aria-pressed', 'true');
};

test('FT-010C catálogo: 72 ejercicios, filtros anatómicos combinados y detalle a 320/390 px y escritorio', async ({ page }) => {
  await start(page);
  await expect(page.locator('.exercise-card')).toHaveCount(72);
  const before = await readDatabase(page, 'personal');
  await mkdir('.cache', { recursive: true });
  for (const width of [1536, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const toggle = page.getByRole('button', { name: 'Filtros', exact: true });
    if (width < 600 && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    const filters = page.getByRole('search', { name: 'Buscar y filtrar ejercicios' });
    await filters.getByRole('combobox', { name: 'Grupo muscular', exact: true }).selectOption('Piernas');
    await filters.getByRole('combobox', { name: 'Región principal', exact: true }).selectOption('hamstrings');
    await filters.getByRole('combobox', { name: 'Equipamiento', exact: true }).selectOption('Barra');
    await filters.getByRole('combobox', { name: 'Dificultad', exact: true }).selectOption('Intermedio');
    await filters.getByRole('searchbox').fill('peso muerto');
    await expect(page.locator('.exercise-card h2')).toHaveText(['Peso muerto rumano']);
    await page.getByRole('button', { name: 'Ver técnica de Peso muerto rumano', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Peso muerto rumano', exact: true });
    await expect(dialog.locator('.exercise-anatomy')).toContainText('Isquiotibiales');
    await expect(dialog.locator('.exercise-anatomy')).toContainText('Glúteos');
    await expect(dialog.locator('video, iframe, img')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `.cache/ft010c-technique-${width}.png` });
    await page.keyboard.press('Escape');
    await filters.getByRole('combobox', { name: 'Grupo muscular', exact: true }).selectOption('Hombros');
    await expect(filters.getByRole('combobox', { name: 'Región principal', exact: true })).toHaveValue('');
    await page.locator('.clear-filters').click();
    await expect(page.locator('.exercise-card')).toHaveCount(72);
    await filters.getByRole('combobox', { name: 'Grupo muscular', exact: true }).selectOption('Hombros');
    await filters.getByRole('combobox', { name: 'Región principal', exact: true }).selectOption('posterior-deltoid');
    await filters.getByRole('combobox', { name: 'Equipamiento', exact: true }).selectOption('Máquina');
    await filters.getByRole('combobox', { name: 'Dificultad', exact: true }).selectOption('Principiante');
    await expect(page.locator('.exercise-card h2')).toHaveText(['Apertura inversa en máquina']);
    await page.screenshot({ path: `.cache/ft010c-catalog-${width}.png` });
    await page.locator('.clear-filters').click();
  }
  expect(await readDatabase(page, 'personal')).toEqual(before);
});

test('FT-010C glúteos: generación, edición y guardado sin cambiar rutinas, personalizados, snapshots o estadísticas anteriores', async ({ page }) => {
  await start(page, 'generador');
  const old = backupFixture();
  for (const exercise of [...old.stores.exercises, ...old.stores.workouts.flatMap((workout) => workout.entries.map((entry) => entry.exercise))]) {
    for (const key of ['mainRegion', 'secondaryRegions', 'anatomyNote', 'tracking']) delete exercise[key];
  }
  await writeRecords(page, 'personal', old.stores);
  const before = await readDatabase(page, 'personal');
  await page.reload();
  await page.locator('#generator-form [name="level"]').selectOption('Intermedio');
  await chooseRegion(page, 'Piernas', 'gluteals');
  await expect(page.locator('.generator-available-list strong')).toHaveText(['Hip thrust con barra', 'Puente de glúteos en el suelo']);
  await page.getByRole('button', { name: 'Generar propuesta', exact: true }).click();
  await expect(page.locator('.prescription-name strong')).toHaveText(['Hip thrust con barra', 'Puente de glúteos en el suelo']);
  await page.getByRole('button', { name: 'Editar rutina', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Editar rutina', exact: true });
  await editor.getByRole('textbox', { name: 'Nombre de rutina', exact: true }).fill('Glúteos anatómicos');
  await editor.getByRole('button', { name: 'Guardar rutina', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Ver en Mis rutinas', exact: true })).toBeVisible();
  const saved = await readDatabase(page, 'personal');
  expect(saved.routines.find((routine) => routine.id === before.routines[0].id)).toEqual(before.routines[0]);
  expect(saved.routineSessions.filter((session) => session.routineId === before.routines[0].id)).toEqual(before.routineSessions);
  for (const store of ['exercises', 'workouts', 'setRecords', 'profiles', 'settings']) expect(saved[store]).toEqual(before[store]);
  const generated = saved.routines.find((routine) => routine.name === 'Glúteos anatómicos');
  expect(generated.generator.version).toBe(2);
  expect(generated.generator.config.regions).toEqual(['gluteals']);
  await page.goto('./#/ejercicios');
  await page.getByRole('searchbox', { name: 'Buscar por nombre', exact: true }).fill('Ejercicio de prueba');
  await page.getByRole('button', { name: 'Ver técnica de Ejercicio de prueba', exact: true }).click();
  await expect(page.locator('.exercise-anatomy')).toContainText('Sin región específica');
  await page.keyboard.press('Escape');
  await page.goto('./#/mis-rutinas');
  await page.getByRole('button', { name: /Rutina de prueba/ }).click();
  await expect(page.locator('.prescription-name')).toContainText('Ejercicio de prueba');
  await page.goto('./#/progreso?ambito=personal&periodo=all&vista=muscles');
  await expect(page.locator('[data-metric="sets"] .metric-value')).toHaveText('2');
  await expect(page.locator('.muscle-list li strong')).toHaveText(['100 %']);
  await expect(page.locator('.muscle-list')).toContainText('Pecho');
});

test('FT-010C programa: cobertura de glúteos, isquiotibiales y deltoides posterior, variedad y alternativas explicadas', async ({ page }) => {
  await start(page, 'generador');
  const form = page.locator('#generator-form');
  await form.locator('[name="level"]').selectOption('Intermedio');
  for (const [group, id] of [['Piernas', 'gluteals'], ['Piernas', 'hamstrings'], ['Hombros', 'posterior-deltoid']]) await chooseRegion(page, group, id);
  await form.locator('[name="modality"]').selectOption('program');
  await form.locator('[name="frequency"]').selectOption('4');
  await form.locator('[name="minutes"]').fill('20');
  await page.getByRole('button', { name: 'Generar propuesta', exact: true }).click();
  await expect(page.locator('.session-tabs strong')).toHaveCount(4);
  await page.getByRole('button', { name: 'Guardar en Mis rutinas', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Ver en Mis rutinas', exact: true })).toBeVisible();
  const saved = await readDatabase(page, 'personal');
  expect(saved.routineSessions).toHaveLength(4);
  expect(new Set(saved.routineSessions.flatMap((session) => session.prescriptions.map((item) => item.exerciseId))).size).toBeGreaterThan(4);
  // New preferences affect the next proposal; the saved program stays intact.
  await page.locator('[data-generator-region="hamstrings"]').click();
  await page.locator('[data-generator-region="posterior-deltoid"]').click();
  await form.locator('[name="level"]').selectOption('Principiante');
  await expect(page.locator('.generator-available .generator-warning')).toContainText('secundaria');
  await expect(page.locator('.generator-available-list')).toContainText('Alternativa por participación secundaria');
  await page.getByRole('button', { name: 'Generar propuesta', exact: true }).click();
  await expect(page.locator('.generator-result-summary')).toContainText('Glúteos');
  await expect(page.locator('.generator-result-summary')).toContainText('secundaria');
  expect(await readDatabase(page, 'personal')).toEqual(saved);
});
