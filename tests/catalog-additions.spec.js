import { test, expect } from '@playwright/test';

const additions = [
  [73, 'Remo horizontal con pecho apoyado en máquina', 'Espalda'],
  [74, 'Extensión de tríceps sobre cabeza en polea', 'Brazos'],
  [75, 'Peso muerto rumano con mancuernas', 'Piernas'],
  [76, 'Extensión de cuádriceps en máquina', 'Piernas'],
  [77, 'Curl femoral sentado en máquina', 'Piernas'],
  [78, 'Press inclinado de pecho en máquina', 'Pecho'],
  [79, 'Remo unilateral en polea', 'Espalda'],
  [80, 'Bird dog', 'Core'],
];
const id = (number) => `c1700000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const groupCounts = { Pecho: 13, Espalda: 14, Piernas: 15, Hombros: 12, Brazos: 13, Core: 13 };

test('FT-015B: ocho faltantes en catálogo, sin duplicados y filtros por grupo', async ({ page }) => {
  await page.goto('./#/ejercicios');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear ejercicio', exact: true })).toBeEnabled();
  const cards = page.locator('.exercise-card');
  await expect(cards).toHaveCount(80);
  const ids = await cards.evaluateAll((items) => items.map((item) => item.dataset.exerciseId));
  expect(ids.slice(0, 72)).toEqual(Array.from({ length: 72 }, (_, index) => id(index + 1)));
  expect(ids.slice(72)).toEqual(additions.map(([number]) => id(number)));
  expect(new Set(ids).size).toBe(ids.length);
  const names = (await cards.locator('h2').allTextContents()).map((name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim());
  expect(new Set(names).size).toBe(names.length);
  for (const [number, name, group] of additions) {
    const card = page.locator(`[data-exercise-id="${id(number)}"]`);
    await expect(card.locator('h2')).toHaveText(name);
    await expect(card.locator('.exercise-attribute').first()).toContainText(group);
  }
  const muscle = page.getByRole('combobox', { name: 'Grupo muscular', exact: true });
  for (const [group, count] of Object.entries(groupCounts)) {
    await muscle.selectOption(group);
    await expect(cards).toHaveCount(count);
    for (const attribute of await cards.locator('.exercise-attribute:first-of-type').allTextContents()) {
      expect(attribute).toContain(group);
    }
    for (const [number, name, assignedGroup] of additions) {
      const card = page.locator(`[data-exercise-id="${id(number)}"]`);
      if (assignedGroup === group) await expect(card.locator('h2')).toHaveText(name);
      else await expect(card).toHaveCount(0);
    }
  }
  await page.locator('[data-muscle=""]').click();
  await expect(cards).toHaveCount(80);
  for (const [group, count] of Object.entries(groupCounts)) {
    await page.locator(`[data-muscle="${group}"]`).click();
    await expect(cards).toHaveCount(count);
  }
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await expect(cards).toHaveCount(80);
});
