import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { recordingMode, MAX_DURATION_SECONDS } from '../src/data/recording-modes.js';
import { validateExerciseInput } from '../src/features/exercises/exercise-service.js';
import { recordedValues } from '../src/features/workouts/model.js';
import { normalizeHistory, calculate } from '../src/features/progress/metrics.js';
import { parseBackup, validateBackup } from '../src/features/profile/backup.js';
import { backupFixture } from './helpers/backup.js';
import { setText } from '../src/utils/set-format.js';

test('Catálogo: modalidades por variante con los 72 IDs originales', () => {
  assert.equal(BASE_EXERCISES.length, 72);
  const body = [4, 8, 22, 23, 24, 30, 31, 32, 38, 39, 40, 42, 48, 66, 68, 72];
  for (const [index, exercise] of BASE_EXERCISES.entries()) {
    const n = index + 1;
    assert.equal(exercise.id, `c1700000-0000-4000-8000-${String(n).padStart(12, '0')}`);
    assert.equal(recordingMode(exercise), n === 21 ? 'duration' : body.includes(n) ? 'bodyweight_reps' : 'weight_reps');
  }
});

test('Personalizados anteriores conservan peso/reps; no se infiere modalidad por equipo ni tracking', () => {
  const exercise = { name: 'Prueba', mainMuscle: 'Core', equipment: 'Barra de dominadas', tracking: 'duration' };
  assert.equal(validateExerciseInput(exercise).recordingMode, 'weight_reps');
  for (const mode of ['weight_reps', 'bodyweight_reps', 'duration']) assert.equal(validateExerciseInput({ ...exercise, recordingMode: mode }).recordingMode, mode);
  for (const mode of ['', null, 'seconds', 'constructor', '__proto__']) assert.throws(() => validateExerciseInput({ ...exercise, recordingMode: mode }));
});

test('Validación de datos reales según modalidad y formato de referencias', () => {
  assert.deepEqual(recordedValues({ weightKg: '40', reps: '10' }), { weightKg: 40, reps: 10 });
  assert.deepEqual(recordedValues({ weightKg: 0, reps: '10' }, 'bodyweight_reps'), { weightKg: 0, reps: 10 });
  assert.deepEqual(recordedValues({ weightKg: 0, reps: 0, durationSeconds: '45' }, 'duration'), { weightKg: 0, reps: 0, durationSeconds: 45 });
  for (const durationSeconds of ['', ' ', null, true, [], -1, 0, 1.5, NaN, Infinity, MAX_DURATION_SECONDS + 1]) assert.throws(() => recordedValues({ weightKg: 0, reps: 0, durationSeconds }, 'duration'));
  for (const reps of [-1, 0, 1.5, '']) assert.throws(() => recordedValues({ weightKg: 0, reps }, 'bodyweight_reps'));
  assert.throws(() => recordedValues({ weightKg: -1, reps: 10 }));
  assert.throws(() => recordedValues({ weightKg: 10, reps: 8 }, 'bodyweight_reps'));
  assert.throws(() => recordedValues({ weightKg: 0, reps: 45, durationSeconds: 45 }, 'duration'));
  assert.equal(setText({ weightKg: 40, reps: 10 }), '40 kg × 10 reps');
  assert.equal(setText({ weightKg: 0, reps: 10 }, 'bodyweight_reps'), '10 reps');
  assert.equal(setText({ durationSeconds: 45 }, 'duration', 'lb'), '45 s');
});

function timedBackup() {
  const backup = backupFixture();
  backup.stores.exercises[0].recordingMode = 'duration';
  for (const workout of backup.stores.workouts) {
    workout.entries[0].exercise.recordingMode = 'duration';
    for (const set of workout.entries[0].sets) {
      Object.assign(set, { weightKg: 0, reps: 0, durationSeconds: set.completed ? 45 : '' });
      if (set.reference) Object.assign(set.reference, { weightKg: 0, reps: 0, durationSeconds: 45 });
    }
  }
  return backup;
}

test('Backups originales sin modalidad se conservan idénticos, sin convertir tracking ni histórico', () => {
  const backup = backupFixture();
  for (const exercise of [backup.stores.exercises[0], ...backup.stores.workouts.flatMap((w) => w.entries.map((e) => e.exercise))]) {
    delete exercise.recordingMode;
    exercise.tracking = 'duration';
  }
  const before = structuredClone(backup);
  assert.deepEqual(parseBackup(JSON.stringify(backup)), before);
  const stats = calculate(normalizeHistory(backup.stores), { period: 'all', now: new Date(backup.exportedAt) });
  assert.equal(stats.totalVolume, 800);
  assert.equal(stats.totalSets, 2);
  assert.deepEqual(backup, before);
});

test('Backup de duración: round trip, borrador en pausa, referencias y snapshots completos', () => {
  const backup = timedBackup();
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
  for (const change of [
    b => { b.stores.workouts[0].entries[0].sets[0].durationSeconds = 0; },
    b => { b.stores.workouts[1].entries[0].sets[0].reference.reps = 45; },
    b => { b.stores.workouts[1].entries[0].sets[0].durationSeconds = null; },
    b => { b.stores.workouts[0].entries[0].exercise.recordingMode = 'seconds'; },
    b => { b.stores.setRecords[0].durationSeconds = 46; },
  ]) { const invalid = JSON.parse(JSON.stringify(backup)); change(invalid); assert.throws(() => validateBackup(invalid), change.toString()); }
});

test('Duración cuenta series, sesiones y músculos; sin volumen, carga, 1RM ni puntos de fuerza', () => {
  const backup = timedBackup();
  const before = structuredClone(backup);
  const history = normalizeHistory(backup.stores);
  assert.equal(history.ignored, 0);
  const stats = calculate(history, { period: 'all', now: new Date(backup.exportedAt) });
  assert.equal(stats.totalSets, 2); assert.equal(stats.sessions.length, 1);
  assert.equal(stats.totalVolume, 0); assert.equal(stats.max1RM, null); assert.equal(stats.maxLoad, null);
  assert.equal(stats.mostWorked.sets, 2); assert.equal(stats.muscles[0].count, 2);
  assert.deepEqual(stats.strength, []);
  assert.deepEqual(backup, before);
  backup.stores.setRecords[0].reps = 45;
  assert.equal(normalizeHistory(backup.stores).ignored, 1);
});

test('Peso corporal: cero carga externa y validación estricta de respaldos', () => {
  const backup = backupFixture();
  for (const exercise of [backup.stores.exercises[0], ...backup.stores.workouts.flatMap((w) => w.entries.map((e) => e.exercise))]) exercise.recordingMode = 'bodyweight_reps';
  for (const workout of backup.stores.workouts) for (const set of workout.entries[0].sets) {
    set.weightKg = 0;
    if (set.reference) set.reference.weightKg = 0;
  }
  assert.deepEqual(validateBackup(backup), backup);
  assert.equal(calculate(normalizeHistory(backup.stores), { period: 'all', now: new Date(backup.exportedAt) }).totalVolume, 0);
  backup.stores.workouts[1].entries[0].sets[0].weightKg = 1;
  assert.throws(() => validateBackup(backup));
});
