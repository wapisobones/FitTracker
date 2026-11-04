import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { knownHistory, chartHistory, FIXED_NOW, benchId, highRepId, rowId } from './helpers/history.js';
import { readDatabase, writeRecords, selectMode, requestReset } from './helpers/storage.js';

test.use({ timezoneId: 'America/Santiago' });
const value = (page, key) => page.locator(`[data-metric="${key}"] .metric-value`);
async function personal(page) {
  await page.clock.install({ time: new Date(FIXED_NOW) });
  await page.goto('./');
  await page.getByRole('button', { name: 'Comenzar mi entrenamiento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aún no tienes entrenamientos guardados', exact: true })).toBeVisible();
}

test('Selección automática por métrica, filtros y elección explícita sin modificar historial', async ({ page }) => {
  await personal(page);
  for (const width of [320, 390, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('heading', { name: 'Aún no tienes entrenamientos guardados', exact: true })).toBeVisible();
    await expect(page.locator('.history-chart')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  const source = chartHistory();
  await writeRecords(page, 'personal', source);
  const before = await readDatabase(page, 'personal');
  await page.reload();
  const exercise = page.getByRole('combobox', { name: 'Ejercicio del gráfico', exact: true });
  const metric = page.getByRole('combobox', { name: 'Métrica de fuerza', exact: true });
  await expect(value(page, 'top')).toHaveText('Crunch histórico');
  await expect(exercise).toHaveValue(highRepId);
  await metric.selectOption('estimated1RM');
  await expect(exercise).toHaveValue(rowId);
  await expect(page.locator('.history-chart figcaption')).toContainText('Un único registro');
  await expect(page.locator('.history-point')).toHaveCount(1);
  for (const width of [320, 390, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.history-point')).toHaveCount(1);
    const plot = await page.locator('.history-plot').boundingBox();
    const point = await page.locator('.history-point').boundingBox();
    expect(point.x).toBeGreaterThan(plot.x);
    expect(point.x + point.width).toBeLessThan(plot.x + plot.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.locator('.chart-data summary').click();
  await expect(page.getByRole('table')).toContainText('53,3');
  await exercise.selectOption(benchId);
  await expect(page.locator('.stats-strength')).toContainText('No hay registros para este gráfico');
  await metric.selectOption('weight');
  await expect(exercise).toHaveValue(benchId);
  await expect(page.locator('.history-point')).toHaveCount(2);
  await page.locator('.chart-data summary').click();
  await expect(page.getByRole('table').locator('tbody td')).toHaveText(['0', '0']);
  for (const period of ['all', 'week', 'month']) {
    await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption(period);
    await expect(exercise).toHaveValue(benchId);
  }
  await page.reload();
  await expect(exercise).toHaveValue(benchId);
  await metric.selectOption('estimated1RM');
  await expect(exercise).toHaveValue(benchId);
  await expect(page.locator('.stats-strength')).toContainText('No hay registros para este gráfico');
  await page.goto('./#/progreso?ambito=personal&periodo=month');
  await expect(exercise).toHaveValue(highRepId);
  await metric.selectOption('estimated1RM');
  await expect(exercise).toHaveValue(rowId);
  await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption(benchId);
  await expect(value(page, 'sets')).toHaveText('3');
  await expect(value(page, 'volume')).toHaveText('0 kg');
  await expect(page.locator('.stats-strength')).toContainText('No hay registros para este gráfico');
  expect(await readDatabase(page, 'personal')).toEqual(before);
  // A history made entirely of bodyweight sets still has real series and tables.
  source.setRecords.forEach(set => { set.weightKg = 0; });
  await writeRecords(page, 'personal', source);
  const bodyweight = await readDatabase(page, 'personal');
  await page.goto('./#/inicio?ambito=personal&periodo=month');
  await expect(exercise).toHaveValue(benchId);
  await expect(value(page, 'top')).toHaveText('Crunch histórico');
  await expect(value(page, 'week-volume')).toHaveText('0 kg');
  await page.locator('.chart-data summary').click();
  await expect(page.getByRole('table').locator('tbody td')).toHaveText(['0', '0']);
  await metric.selectOption('estimated1RM');
  await expect(exercise).toHaveValue(benchId);
  await expect(page.locator('.stats-strength')).toContainText('requiere carga positiva');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await metric.selectOption('weight');
    await expect(page.locator('.history-point')).toHaveCount(2);
    await expect(page.locator('.stats-strength')).toContainText('peso corporal sin carga externa');
    await metric.selectOption('estimated1RM');
    await expect(page.locator('.stats-strength')).toContainText('requiere carga positiva');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  expect(await readDatabase(page, 'personal')).toEqual(bodyweight);
});

test('Gráficos compactos, ejes legibles y tablas a 320/390 px y escritorio', async ({ page }) => {
  await personal(page);
  await selectMode(page, 'demo');
  const before = await readDatabase(page, 'demo');
  await mkdir('.cache', { recursive: true });
  for (const width of [1536, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['inicio', 'progreso']) {
      await page.goto(`./#/${route}`);
      await expect(page.locator('.history-chart').first()).toBeVisible();
      for (const section of route === 'inicio' ? ['summary'] : ['summary', 'strength', 'volume']) {
        if (route === 'progreso') await page.locator(`[data-stats-section="${section}"]`).click();
        const charts = page.locator('.history-chart');
        for (const chart of await charts.all()) {
          const plot = await chart.locator('.history-plot').boundingBox();
          expect(plot.height).toBeGreaterThanOrEqual(180);
          expect(plot.height).toBeLessThanOrEqual(300);
          const labels = chart.locator('.history-x-axis span');
          const boxes = await labels.evaluateAll(elements => elements.map(element => {
            const box = element.getBoundingClientRect();
            return { left: box.left, right: box.right, size: parseFloat(getComputedStyle(element).fontSize) };
          }));
          for (let i = 0; i < boxes.length; i++) {
            expect(boxes[i].size).toBeGreaterThanOrEqual(11);
            expect(boxes[i].size).toBeLessThanOrEqual(14);
            expect(boxes[i].left).toBeGreaterThanOrEqual(0);
            expect(boxes[i].right).toBeLessThanOrEqual(width);
            if (i) expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        if (section === 'summary' && (width === 1536 || (width === 1024 && route === 'progreso'))) {
          const cards = route === 'inicio' ? page.locator('.charts-grid > section') : width === 1536 ? page.locator('.summary-view > .stats-strength, .summary-view > .stats-muscles, .summary-view > .stats-records') : page.locator('.summary-view > .stats-strength, .summary-view > .stats-records');
          const boxes = await cards.evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
          expect(Math.max(...boxes.map(b => b.top)) - Math.min(...boxes.map(b => b.top))).toBeLessThan(1);
          expect(Math.max(...boxes.map(b => b.bottom)) - Math.min(...boxes.map(b => b.bottom))).toBeLessThan(1);
        }
        if (route === 'progreso' && section === 'volume' && width === 1536) expect((await page.locator('.stats-volume').boundingBox()).height).toBeLessThan(550);
        const summary = page.locator('.chart-data summary').first();
        await summary.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('table').first()).toBeVisible();
        await expect(page.getByRole('table').first().locator('tbody tr')).not.toHaveCount(0);
        await page.keyboard.press('Enter');
        const target = route === 'inicio' ? page.locator('.charts-grid') : page.locator('.progress-layout');
        await page.evaluate(() => document.activeElement.blur());
        await target.evaluate(element => element.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: `.cache/ft009c-${route}-${section}-${width}.png` });
      }
    }
  }
  expect(await readDatabase(page, 'demo')).toEqual(before);
});

test('Dashboard y Progreso comparten cálculos, filtros, snapshots e historial accesible', async ({ page }) => {
  await personal(page);
  await writeRecords(page, 'personal', knownHistory());
  const before = await readDatabase(page, 'personal');
  await page.reload();
  await expect(value(page, 'top')).toHaveText('Press histórico');
  await expect(value(page, 'record')).toHaveText('60 kg');
  await expect(value(page, 'week-volume')).toHaveText('1.430 kg');
  await expect(value(page, 'week-sessions')).toHaveText('2');
  await expect(page.locator('.goals-card')).toContainText('2 / 3');
  await expect(page.locator('.goals-card')).toContainText('1.430 / 2.000 kg');
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('all');
  await expect(value(page, 'record')).toHaveText('80 kg');
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('month');
  await page.getByRole('combobox', { name: 'Ejercicio del gráfico', exact: true }).selectOption(benchId);
  await page.getByText('Ver datos del gráfico', { exact: true }).click();
  await expect(page.getByRole('table')).toContainText('60');
  await mkdir('.cache', { recursive: true });
  await page.screenshot({ path: '.cache/ft006-dashboard-desktop.png', fullPage: true });
  await page.locator('.sidebar [data-page="progreso"]').click();
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('month');
  await expect(value(page, 'volume')).toHaveText('1.430 kg');
  await expect(value(page, 'sessions')).toHaveText('2');
  await expect(value(page, 'sets')).toHaveText('4');
  await expect(page.locator('.stats-records')).toContainText('70 kg');
  await expect(page.locator('.stats-muscles')).toContainText('75 %');
  await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption(benchId);
  await expect(value(page, 'volume')).toHaveText('1.030 kg');
  await expect(value(page, 'sets')).toHaveText('3');
  await page.getByRole('button', { name: 'Historial', exact: true }).click();
  await page.locator('.stats-session summary').filter({ hasText: 'Parcial conocida' }).click();
  await expect(page.locator('.stats-session[open]')).toContainText('Serie 1: 60 kg × 5 reps');
  await expect(page.locator('.stats-session[open]')).not.toContainText('999');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Ejercicio', exact: true })).toHaveValue(benchId);
  await expect(page.getByRole('button', { name: 'Historial', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await readDatabase(page, 'personal')).toEqual(before);
  await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Resumen', exact: true }).click();
  await page.screenshot({ path: '.cache/ft006-progress-desktop.png', fullPage: true });
  for (const width of [320, 390, 768, 1024, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.cache/ft006-progress-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Fuerza por ejercicio', exact: true }).click();
  await page.getByRole('combobox', { name: 'Métrica de fuerza', exact: true }).selectOption('estimated1RM');
  await expect(page.locator('.history-chart')).toContainText('1RM estimado');
  await page.getByRole('button', { name: 'Volumen', exact: true }).click();
  await expect(page.locator('.stats-volume')).toBeVisible();
  await page.getByRole('button', { name: 'Grupos musculares', exact: true }).click();
  await expect(page.locator('.stats-donut')).toBeVisible();
});

test('Demo estructurada idempotente, cambios conservados, aislamiento y reset confirmado', async ({ page }) => {
  await personal(page);
  await writeRecords(page, 'personal', knownHistory());
  const personalBefore = await readDatabase(page, 'personal');
  await selectMode(page, 'demo');
  await expect(page.locator('.demo-notice')).toContainText('ficticio');
  const seeded = await readDatabase(page, 'demo');
  expect(seeded.workouts).toHaveLength(18);
  expect(seeded.setRecords.length).toBeGreaterThan(200);
  const modified = structuredClone(seeded);
  modified.workouts[0].sessionName = '<b>Mi sesión demo</b>';
  const record = modified.setRecords.find((set) => set.workoutId === modified.workouts[0].id);
  record.weightKg = 500;
  await writeRecords(page, 'demo', { workouts: modified.workouts, setRecords: modified.setRecords, settings: [...modified.settings, { id: 'dashboard-preview', data: { marker: 'Vista antigua modificada' } }] });
  const saved = await readDatabase(page, 'demo');
  await page.reload();
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('all');
  await expect(value(page, 'record')).toHaveText('500 kg');
  expect(await readDatabase(page, 'demo')).toEqual(saved);
  expect(await readDatabase(page, 'personal')).toEqual(personalBefore);
  const reset = await requestReset(page);
  await reset.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await readDatabase(page, 'demo')).toEqual(saved);
  const confirmed = await requestReset(page);
  await confirmed.getByRole('button', { name: 'Restablecer demostración', exact: true }).click();
  await expect(page.locator('.operation-status')).toContainText('restablecida');
  expect((await readDatabase(page, 'demo')).workouts).toHaveLength(18);
  expect(await readDatabase(page, 'personal')).toEqual(personalBefore);
  // Simulate an existing demo from before the structured-history seed. Its
  // records must be used as-is rather than merged with generated sessions.
  await page.evaluate((source) => new Promise((resolve, reject) => {
    const request = indexedDB.open('fittracker-demo');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['settings', 'workouts', 'setRecords'], 'readwrite');
      tx.objectStore('settings').delete('history-demo-v1');
      tx.objectStore('workouts').clear(); tx.objectStore('setRecords').clear();
      for (const record of source.workouts) tx.objectStore('workouts').add(record);
      for (const record of source.setRecords) tx.objectStore('setRecords').add(record);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
    request.onerror = () => reject(request.error);
  }), knownHistory());
  const legacy = await readDatabase(page, 'demo');
  await page.reload();
  await expect(page.locator('.demo-notice')).toBeVisible();
  const preserved = await readDatabase(page, 'demo');
  expect(preserved.workouts).toEqual(legacy.workouts);
  expect(preserved.setRecords).toEqual(legacy.setRecords);
  expect(preserved.settings.find((record) => record.id === 'history-demo-v1').status).toBe('preserved');
  expect(await readDatabase(page, 'personal')).toEqual(personalBefore);
});

test('Estados vacíos, error recuperable y nuevos registros visibles sin recarga completa', async ({ page }) => {
  await personal(page);
  await expect(value(page, 'week-volume')).toHaveText('0 kg');
  await expect(value(page, 'record')).toHaveText('—');
  await expect(page.locator('.goals-card')).toContainText('No hay objetivos');
  await page.locator('.sidebar [data-page="progreso"]').click();
  await expect(value(page, 'sets')).toHaveText('0');
  await page.evaluate(() => {
    const getAll = IDBObjectStore.prototype.getAll;
    window.failHistoryRead = true;
    IDBObjectStore.prototype.getAll = function () {
      if (window.failHistoryRead && this.name === 'setRecords') throw new DOMException('Prueba', 'SecurityError');
      return getAll.apply(this, arguments);
    };
  });
  await page.locator('.sidebar [data-page="inicio"]').click();
  await expect(page.getByRole('alert')).toContainText('No se pudo acceder');
  await page.evaluate(() => { window.failHistoryRead = false; });
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(value(page, 'week-sessions')).toHaveText('0');
  await writeRecords(page, 'personal', knownHistory());
  await page.locator('.sidebar [data-page="progreso"]').click();
  await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('month');
  await expect(value(page, 'sessions')).toHaveText('2');
  await page.locator('.sidebar [data-page="inicio"]').click();
  await expect(value(page, 'week-sessions')).toHaveText('2');
});
