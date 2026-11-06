import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, normalizeHistory } from '../src/features/progress/metrics.js';
import { evolutionHistory, EVOLUTION_NOW, bench, deadbug, plank } from './helpers/evolution-history.js';

process.env.TZ = 'America/Santiago';
const now = new Date(EVOLUTION_NOW);
const stats = (history, exerciseId, extra = {}) => calculate(history, { now, period: 'month', exerciseId, ...extra });

test('Carga y Epley se conservan; máximos diarios reales de repeticiones y segundos', () => {
  const source = evolutionHistory();
  const before = structuredClone(source);
  const history = normalizeHistory(source);
  assert.equal(history.ignored, 0);
  assert.equal(history.rows.length, 15);
  const weight = stats(history, bench);
  assert.equal(weight.selectedRecordingMode, 'weight_reps');
  assert.deepEqual(weight.strength.map(point => point.weight), [55, 60]);
  assert.deepEqual(weight.strength.map(point => point.estimated1RM), [66, 58 * (1 + 8 / 30)]);
  const body = stats(history, deadbug, { strengthMetric: 'estimated1RM' });
  assert.equal(body.selectedRecordingMode, 'bodyweight_reps');
  assert.deepEqual(body.strength, [{ date: '2026-11-02', reps: 12 }, { date: '2026-11-04', reps: 15 }]);
  const timed = stats(history, plank, { strengthMetric: 'estimated1RM' });
  assert.equal(timed.selectedRecordingMode, 'duration');
  assert.deepEqual(timed.strength, [{ date: '2026-11-02', durationSeconds: 45 }, { date: '2026-11-04', durationSeconds: 60 }]);
  for (const result of [body, timed]) {
    assert.equal(result.max1RM, null);
    assert.equal(result.maxLoad, null);
    assert.equal(result.totalVolume, 0);
    assert.equal(result.totalSets, 4);
  }
  assert.deepEqual(source, before);
});

test('Modalidades históricas separadas, sin reinterpretar tracking, IDs ni objetivos antiguos', () => {
  const history = normalizeHistory(evolutionHistory());
  for (const exerciseId of [deadbug, plank]) {
    const current = stats(history, exerciseId, { period: 'all' });
    assert.deepEqual(current.chartRecordingModes, ['weight_reps', exerciseId === deadbug ? 'bodyweight_reps' : 'duration']);
    const legacy = stats(history, exerciseId, { period: 'all', chartRecordingMode: 'weight_reps' });
    assert.equal(legacy.strength.length, 1);
    assert.equal(legacy.strength[0].date, '2026-10-15');
    assert.equal(legacy.strength[0].weight, exerciseId === deadbug ? 20 : 10);
    assert.equal(legacy.strength[0].estimated1RM, exerciseId === deadbug ? 20 * (1 + 7 / 30) : 10 * (1 + 8 / 30));
    assert.equal(legacy.totalSets, current.totalSets);
    assert.equal(legacy.totalVolume, current.totalVolume);
    // A history containing only old snapshots retains its original modality.
    const oldOnly = { ...history, rows: history.rows.filter(row => row.day === '2026-10-15') };
    assert.equal(stats(oldOnly, exerciseId, { period: 'all' }).selectedRecordingMode, 'weight_reps');
  }
});

test('Filtros de ejercicio/período y volumen conservan sus resultados', () => {
  const history = normalizeHistory(evolutionHistory());
  assert.equal(calculate(history, { now, period: 'month' }).totalVolume, 1494);
  assert.equal(calculate(history, { now, period: 'all' }).totalVolume, 2674);
  assert.equal(stats(history, bench).totalVolume, 1494);
  assert.deepEqual(stats(history, plank, { chartExerciseId: bench }).strength.map(point => point.durationSeconds), [45, 60]);
  assert.equal(calculate(history, { now, period: 'all', chartExerciseId: deadbug }).selectedRecordingMode, 'bodyweight_reps');
  const empty = stats(history, plank, { now: new Date('2026-12-06T15:00:00.000Z') });
  assert.equal(empty.selectedRecordingMode, 'duration');
  assert.deepEqual(empty.strength, []);
  assert.deepEqual(stats(history, plank, { chartRecordingMode: 'weight_reps' }).strength, []);
});
