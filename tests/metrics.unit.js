import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHistory, calculate, epley, localDay, periodBounds } from '../src/features/progress/metrics.js';
import { demoHistory } from '../src/data/history-demo.js';
import { knownHistory, chartHistory, FIXED_NOW, benchId, highRepId, rowId } from './helpers/history.js';

process.env.TZ = 'America/Santiago';
const now = new Date(FIXED_NOW);
test('Volumen conocido, parcial, snapshots, carga real y Epley compartidos', () => {
  const source = knownHistory();
  const before = structuredClone(source);
  const history = normalizeHistory(source);
  const stats = calculate(history, { period: 'month', now });
  assert.equal(stats.totalSets, 4);
  assert.equal(stats.totalVolume, 1430);
  assert.equal(stats.weekVolume, 1430);
  assert.equal(stats.weekSessions, 2);
  assert.equal(stats.monthSessions, 2);
  assert.equal(stats.sessions.length, 2);
  assert.equal(stats.maxLoad.weightKg, 60);
  assert.equal(stats.max1RM.estimated1RM, 70);
  assert.equal(stats.mostWorked.name, 'Press histórico');
  assert.deepEqual(stats.muscles.map(({ name, count, percent }) => ({ name, count, percent })), [{ name: 'Pecho', count: 3, percent: 75 }, { name: 'Espalda', count: 1, percent: 25 }]);
  assert.equal(stats.volume.reduce((sum, point) => sum + point.value, 0), stats.totalVolume);
  assert.deepEqual(source, before);
});
test('Filtros y límites del 1RM: ningún máximo estimado para más de 10 reps o 0 kg', () => {
  const history = normalizeHistory(knownHistory());
  const all = calculate(history, { period: 'all', now, exerciseId: benchId });
  assert.equal(all.totalVolume, 1990);
  assert.equal(all.maxLoad.weightKg, 80);
  assert.equal(all.max1RM.estimated1RM, 70);
  assert.equal(all.sessions.length, 3);
  assert.equal(epley(100, 1), 100);
  assert.equal(epley(100, 10), 100 * (1 + 10 / 30));
  assert.equal(epley(100, 11), null);
  assert.equal(epley(0, 8), null);
});
test('No contar activos, pausados, descartados, huérfanos, inválidos ni duplicados', () => {
  const source = knownHistory();
  for (const status of ['active', 'paused', 'discarded']) {
    const clone = structuredClone(source.workouts[0]); clone.id = status; clone.status = status;
    source.workouts.push(clone);
    source.setRecords.push({ ...source.setRecords[0], id: status, workoutId: status, weightKg: 500 });
  }
  source.setRecords.push({ ...source.setRecords[0], id: 'duplicate' }, { ...source.setRecords[0], id: 'orphan', workoutId: 'missing' });
  const invalid = structuredClone(source.workouts[0]); invalid.id = 'invalid'; source.workouts.push(invalid);
  source.setRecords.push({ ...source.setRecords[0], workoutId: 'invalid', id: 'invalid-set', weightKg: '' });
  const stats = calculate(normalizeHistory(source), { period: 'month', now });
  assert.equal(stats.totalVolume, 1430);
  assert.equal(stats.totalSets, 4);
  assert.equal(stats.sessions.length, 2);
});
test('Fechas locales: lunes, límite de mes y último día del período', () => {
  assert.equal(localDay('2026-11-02T02:30:00Z'), '2026-11-01');
  assert.equal(localDay(periodBounds('week', now).start), '2026-11-02');
  assert.equal(localDay(periodBounds('month', now).start), '2026-11-01');
  assert.equal(localDay(periodBounds('30', now).start), '2026-10-06');
  assert.equal(localDay(periodBounds('month', now).end), '2026-11-05');
  const source = knownHistory();
  const copy = structuredClone(source.workouts[0]); copy.id = 'Sunday'; copy.endedAt = '2026-11-02T02:30:00Z'; source.workouts.push(copy);
  source.setRecords.push({ ...source.setRecords[0], id: 'sunday-set', workoutId: copy.id });
  const stats = calculate(normalizeHistory(source), { period: 'month', now });
  assert.equal(stats.monthSessions, 3);
  assert.equal(stats.weekSessions, 2);
  assert.equal(stats.weekVolume, 1430);
});
test('Demo coherente, estados vacíos y series sin carga externa', () => {
  const demo = normalizeHistory(demoHistory(now));
  assert.equal(demo.ignored, 0);
  assert.equal(calculate(demo, { period: 'all', now }).sessions.length, 18);
  const zero = knownHistory(); zero.setRecords.forEach((set) => { set.weightKg = 0; });
  const stats = calculate(normalizeHistory(zero), { now });
  assert.equal(stats.totalVolume, 0); assert.equal(stats.totalSets, 4); assert.equal(stats.max1RM, null);
  const empty = calculate(normalizeHistory({}), { now });
  assert.equal(empty.totalVolume, 0); assert.equal(empty.sessions.length, 0); assert.equal(empty.maxLoad, null);
});

test('Selección automática compatible por métrica y período sin cambiar indicadores ni datos', () => {
  const source = chartHistory();
  const before = structuredClone(source);
  const history = normalizeHistory(source);
  const weight = calculate(history, { now, period: 'month' });
  const estimated = calculate(history, { now, period: 'month', strengthMetric: 'estimated1RM' });
  assert.equal(weight.selectedExerciseId, highRepId);
  assert.equal(estimated.selectedExerciseId, rowId);
  assert.equal(estimated.strength.length, 1);
  assert.ok(estimated.strength[0].estimated1RM > 0);
  assert.equal(weight.mostWorked.id, benchId);
  const { selectedExerciseId: _weightId, strength: _weightPoints, ...weightMetrics } = weight;
  const { selectedExerciseId: _estimatedId, strength: _estimatedPoints, ...estimatedMetrics } = estimated;
  assert.deepEqual(weightMetrics, estimatedMetrics);
  assert.equal(calculate(history, { now, period: 'all' }).selectedExerciseId, benchId);
  assert.deepEqual(source, before);
  const demo = calculate(normalizeHistory(demoHistory(now)), { now });
  assert.ok(demo.strength.some((point) => point.weight > 0));
});

test('Selecciones explícitas de 0 kg y filtros sin observaciones conservan su elección', () => {
  const history = normalizeHistory(chartHistory());
  for (const strengthMetric of ['weight', 'estimated1RM']) {
    const selected = calculate(history, { now, chartExerciseId: benchId, strengthMetric });
    assert.equal(selected.selectedExerciseId, benchId);
    assert.ok(selected.strength.every((point) => point.weight === 0 && point.estimated1RM === null));
    const filtered = calculate(history, { now, exerciseId: benchId, chartExerciseId: highRepId, strengthMetric });
    assert.equal(filtered.selectedExerciseId, benchId);
    assert.equal(filtered.totalSets, 3);
    assert.equal(filtered.totalVolume, 0);
  }
  const outside = calculate(history, { now: new Date('2026-12-04T15:00:00Z'), chartExerciseId: rowId });
  assert.equal(outside.selectedExerciseId, rowId);
  assert.deepEqual(outside.strength, []);
});

test('Selección estable con solo peso corporal, carga sin 1RM aplicable e historial vacío', () => {
  const source = chartHistory();
  source.setRecords.forEach((set) => { set.weightKg = 0; });
  const zero = normalizeHistory(source);
  for (const strengthMetric of ['weight', 'estimated1RM']) {
    const stats = calculate(zero, { now, strengthMetric });
    assert.equal(stats.selectedExerciseId, benchId);
    assert.equal(stats.max1RM, null);
    assert.equal(stats.totalVolume, 0);
    assert.ok(stats.strength.every((point) => point.weight === 0));
    const empty = calculate(normalizeHistory({}), { now, strengthMetric });
    assert.equal(empty.selectedExerciseId, '');
    assert.deepEqual(empty.strength, []);
  }
  const noEstimate = normalizeHistory(chartHistory());
  noEstimate.rows = noEstimate.rows.filter((row) => row.exerciseId !== rowId);
  assert.equal(calculate(noEstimate, { now, strengthMetric: 'estimated1RM' }).selectedExerciseId, highRepId);
});
