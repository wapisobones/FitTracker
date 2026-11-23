import { expect } from '@playwright/test';
import { BASE_EXERCISES } from '../../src/data/exercises.js';
import { exerciseMedia } from '../../src/data/exercise-media.js';

export async function expectGlobalCredit(page, asset) {
  const name = asset.name ?? BASE_EXERCISES.find(({ id }) => id === asset.id)?.name;
  const credit = page.locator('.visual-credits li').filter({ has: page.getByText(name, { exact: true }) });
  await expect(credit).toHaveCount(1);
  if ((asset.provenance ?? exerciseMedia(BASE_EXERCISES.find(({ id }) => id === asset.id)).thumbnail?.provenance) === 'user-provided') {
    await expect(credit).toContainText('Imágenes proporcionadas para FitTracker');
    await expect(credit.locator('a')).toHaveCount(0);
  } else {
    await expect(credit.locator('a').filter({ hasText: 'Fuente' })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db');
    await expect(credit.locator('a').filter({ hasText: 'Unlicense' })).toHaveAttribute('href', 'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE');
  }
}
