import test from 'node:test';
import assert from 'node:assert/strict';
import { heatmapDays, muscleHeat } from '../src/features/progress/muscle-heatmap.js';
import { periodBounds, calculate, normalizeHistory } from '../src/features/progress/metrics.js';
import { anatomyMap } from '../src/components/anatomy-map.js';
import { distribution } from '../src/components/history-charts.js';
import { MUSCLE_REGIONS } from '../src/data/muscle-taxonomy.js';
import { heatmapHistory } from './helpers/muscle-heatmap.js';
import { FIXED_NOW } from './helpers/history.js';

process.env.TZ = 'America/Santiago';
const now = new Date(FIXED_NOW);
test('Umbrales exactos por series, incluidos límites y promedio fraccionario', () => {
  for (const [count, level] of [[0, 'none'], [1, 'low'], [5, 'low'], [6, 'medium'], [11, 'medium'], [12, 'high']]) assert.equal(muscleHeat(count).level, level);
  assert.equal(muscleHeat(1, 90).level, 'low');
  assert.equal(muscleHeat(12, 14).level, 'medium');
  assert.equal(muscleHeat(23, 14).level, 'medium');
  assert.equal(muscleHeat(24, 14).level, 'high');
});
test('Días calendario, mínimo semanal, Todo y cambio de horario', () => {
  for (const [period, days] of [['7', 7], ['week', 7], ['month', 7], ['30', 30], ['90', 90]]) assert.equal(heatmapDays(periodBounds(period, now)), days);
  assert.equal(heatmapDays(periodBounds('all', now), new Date('2026-05-01T15:00:00Z')), 188);
  assert.equal(heatmapDays(periodBounds('all', now)), 7);
  assert.equal(heatmapDays(periodBounds('month', new Date('2026-09-30T15:00:00Z'))), 30);
});
test('Últimos siete días, exclusiones existentes y estadísticas sin mutaciones', () => {
  const source = heatmapHistory();
  const original = structuredClone(source);
  const history = normalizeHistory(source);
  const stats = calculate(history, { period: '7', now });
  assert.equal(stats.totalSets, 36);
  assert.deepEqual(Object.fromEntries(stats.muscles.map((group) => [group.name, group.count])), { Core: 12, Piernas: 12, Espalda: 6, Pecho: 5, Brazos: 1 });
  const snapshot = structuredClone(stats);
  distribution(stats.muscles, stats.totalSets, { schematic: true, heatmapDays: 7 });
  assert.deepEqual(stats, snapshot);
  assert.deepEqual(source, original);
  // Calendar week is still Monday-based; the rolling window is independent.
  assert.equal(calculate(history, { period: 'week', now }).totalSets, 1);
  const all = calculate(history, { period: 'all', now });
  assert.equal(all.totalSets, 84);
  const days = heatmapDays(periodBounds('all', now), history.rows[0].date);
  assert.ok(all.muscles.every((group) => muscleHeat(group.count, days).level === 'low'));
});
test('Las 22 regiones y trazados originales se conservan; el modo interactivo ignora calor', () => {
  assert.equal(MUSCLE_REGIONS.length, 22);
  assert.deepEqual(MUSCLE_REGIONS.filter((region) => !region.views.length).map((region) => region.id), ['rhomboids', 'spinal-erectors']);
  const original = anatomyMap([]);
  const heat = anatomyMap([], { groupLevels: { Pecho: 'high' } });
  const paths = (svg) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(paths(heat), paths(original));
  assert.equal(anatomyMap(['pectorals'], { interactive: true, groupLevels: { Pecho: 'high' } }), anatomyMap(['pectorals'], { interactive: true }));
});
