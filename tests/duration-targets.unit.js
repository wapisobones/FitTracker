import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { ROUTINE_TEMPLATES } from '../src/data/routine-templates.js';
import { defaultTargets, validateTargets, targetText } from '../src/data/prescription-targets.js';
import { newRoutine, prescription, independentCopy, validateRoutine } from '../src/features/routines/model.js';
import { defaultConfig, generateRoutine, estimateSeconds } from '../src/features/generator/engine.js';
import { parseBackup } from '../src/features/profile/backup.js';
import { backupFixture } from './helpers/backup.js';

const plank = BASE_EXERCISES[20];

test('Duración explícita y repeticiones anteriores: defaults, límites y unidades sin inferencia', () => {
  assert.deepEqual(defaultTargets(plank), { targetType: 'duration', durationMinSeconds: 30, durationMaxSeconds: 45 });
  for (const exercise of [BASE_EXERCISES[0], BASE_EXERCISES[3], undefined]) assert.deepEqual(defaultTargets(exercise), { repsMin: 8, repsMax: 12 });
  const timed = prescription(plank.id, plank);
  assert.equal(targetText(timed), '30–45 s');
  assert.equal(targetText({ ...timed, durationMinSeconds: 45 }), '45 s');
  assert.equal(targetText(prescription(plank.id)), '8–12 reps');
  for (const value of ['', ' ', null, true, [], -1, 0, 1.5, Infinity, 86401]) assert.throws(() => validateTargets({ ...timed, durationMinSeconds: value }));
  assert.throws(() => validateTargets({ ...timed, durationMinSeconds: 46 }));
  assert.throws(() => validateTargets({ ...timed, repsMin: 8 }));
  assert.throws(() => validateTargets({ repsMin: 8, repsMax: 12, durationMinSeconds: 30 }));
  assert.throws(() => validateTargets({ ...timed, targetType: 'unknown' }));
  assert.deepEqual(validateTargets({ ...timed, durationMinSeconds: '30' }), { durationMinSeconds: 30, durationMaxSeconds: 45 });
  assert.throws(() => validateTargets({ ...timed, durationMinSeconds: '30' }, true));
});

test('Validar y copiar no modifica unidades, IDs ni objetivos de la fuente', () => {
  const routine = newRoutine('Rutina sintética');
  routine.sessions[0].prescriptions = [prescription(plank.id), { ...prescription(plank.id, plank), order: 1 }];
  const before = structuredClone(routine);
  assert.deepEqual(validateRoutine(routine), before);
  const copy = independentCopy(routine);
  assert.notEqual(copy.id, routine.id);
  for (const [i, item] of copy.sessions[0].prescriptions.entries()) {
    assert.notEqual(item.id, before.sessions[0].prescriptions[i].id);
    assert.equal(targetText(item), i ? '30–45 s' : '8–12 reps');
  }
  assert.deepEqual(routine, before);
});

test('Respaldos anteriores/nuevos conservan borrador e historial y validan objetivos estrictamente', () => {
  const original = backupFixture();
  assert.deepEqual(parseBackup(JSON.stringify(original)), original);
  const updated = JSON.parse(JSON.stringify(original));
  const item = updated.stores.routineSessions[0].prescriptions[0];
  delete item.repsMin; delete item.repsMax;
  Object.assign(item, defaultTargets(plank));
  assert.deepEqual(parseBackup(JSON.stringify(updated)), updated);
  assert.deepEqual(updated.stores.workouts, original.stores.workouts);
  assert.deepEqual(updated.stores.setRecords, original.stores.setRecords);
  for (const change of [item => { item.durationMaxSeconds = 29; }, item => { item.durationMinSeconds = '30'; }, item => { delete item.targetType; }, item => { item.repsMax = 12; }]) {
    const invalid = structuredClone(updated);
    change(invalid.stores.routineSessions[0].prescriptions[0]);
    assert.throws(() => parseBackup(JSON.stringify(invalid)));
  }
});

test('Generador propone segundos por modalidad y estima el tiempo con la duración objetivo', () => {
  const input = { ...defaultConfig(), muscles: ['Core'], equipment: ['Colchoneta'], minutes: 15 };
  for (const exercise of [plank, { ...plank, id: crypto.randomUUID(), origin: 'custom', tracking: 'reps' }]) {
    const { routine } = generateRoutine(input, [exercise]);
    const session = routine.sessions[0];
    assert.equal(targetText(session.prescriptions[0]), '30–45 s');
    assert.equal(estimateSeconds(session), 300 + 60 + 2 * 45 + 60);
    assert.ok(Number.isFinite(estimateSeconds(session)));
  }
  // Existing built-in templates currently contain no timed exercises.
  for (const routine of ROUTINE_TEMPLATES) {
    assert.doesNotThrow(() => validateRoutine(routine));
    for (const session of routine.sessions) for (const item of session.prescriptions) {
      const exercise = BASE_EXERCISES.find(exercise => exercise.id === item.exerciseId);
      assert.equal(item.targetType === 'duration', exercise.recordingMode === 'duration');
    }
  }
});
