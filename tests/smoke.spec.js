import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { routes } from '../src/app/routes.js';

test('Dashboard y navegación completa en la compilación bajo /FitTracker/', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('./');
  await page.getByRole('button', { name: 'Explorar demostración', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('¡Hola, deportista!');
  await expect(page.locator('.metric')).toHaveCount(4);
  await expect(page.locator('.demo-notice')).toContainText('ficticio');
  await mkdir('.cache', { recursive: true });
  await page.screenshot({ path: '.cache/ft002-demo-desktop.png', fullPage: true });

  for (const route of routes.filter((route) => !['inicio', 'herramientas'].includes(route.id))) {
    await page.locator(`.sidebar a[data-page="${route.id}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.title);
    await expect(page.locator(`.sidebar a[data-page="${route.id}"]`)).toHaveAttribute('aria-current', 'page');
    if (route.action) await expect(page.getByRole('button', { name: route.action })).toBeDisabled();
  }
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perfil');
  await expect(page.locator('.current-mode')).toHaveText('Demostración');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calculadora de calorías');
  await page.goto('./#/enlace-inexistente');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta sección no existe');
  await page.getByRole('link', { name: 'Volver a Inicio' }).click();
  await page.getByText('Ver datos del gráfico', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Diseño responsive y navegación móvil con teclado y táctil', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explorar demostración', exact: true }).click();
  await expect(page.locator('.metric')).toHaveCount(4);
  for (const width of [320, 390, 768, 1024, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content, `Desbordamiento horizontal a ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir('.cache', { recursive: true });
  await page.screenshot({ path: '.cache/ft002-demo-mobile.png', fullPage: true });
  await expect(page.getByRole('navigation', { name: 'Navegación móvil' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir navegación' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir navegación' })).toBeFocused();
  for (const route of routes.filter((route) => route.id !== 'herramientas')) {
    await page.getByRole('button', { name: 'Abrir navegación' }).click();
    await page.locator(`#mobile-menu a[data-page="${route.id}"]`).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(route.id === 'inicio' ? '¡Hola, deportista!' : route.title);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  await page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('link', { name: 'Entrenamientos' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mis rutinas');
  await page.getByRole('link', { name: 'Mi perfil', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perfil');
});
