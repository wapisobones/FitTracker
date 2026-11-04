import test from 'node:test';
import assert from 'node:assert/strict';
import { estimate1RM, estimateCalories, ACTIVITIES, ENERGY_GOALS } from '../src/features/tools/calculations.js';
import { toKg, fromKg } from '../src/utils/units.js';
import { validateBackup, parseBackup } from '../src/features/profile/backup.js';
import { validateGoals, validateAlias, validatePreferences } from '../src/features/profile/profile-service.js';
import { backupFixture } from './helpers/backup.js';

test('Epley aplica la fórmula explícita y convierte kg/lb sin redondear el almacenamiento', () => {
  assert.equal(estimate1RM(80, 6).estimatedKg, 96);
  assert.equal(estimate1RM(80, 1).estimatedKg, 80 * (1 + 1 / 30));
  assert.equal(estimate1RM(80, 10).estimatedKg, 80 * (1 + 10 / 30));
  assert.ok(Math.abs(estimate1RM(fromKg(80, 'lb'), 6, 'lb').estimatedKg - 96) < 1e-10);
  assert.equal(toKg(100, 'lb'), 45.359237);
  for (const [weight, reps] of [['', 6], [null, 6], [true, 6], [-1, 6], [0, 6], [Infinity, 6], [2001, 6], [80, ''], [80, 0], [80, 11], [80, 1.5], [80, NaN]]) assert.throws(() => estimate1RM(weight, reps));
});
test('Mifflin–St Jeor, actividad, objetivo y reparto de macros', () => {
  const input = { age: 32, weight: 95, height: 172, sex: 'male', activity: 'moderate', goal: 'deficit' };
  const result = estimateCalories(input);
  assert.equal(result.basal, 1870); assert.equal(result.tdee, 2898.5); assert.ok(Math.abs(result.target - 2463.725) < 1e-9);
  assert.ok(Math.abs(result.protein * 4 + result.carbs * 4 + result.fat * 9 - result.target) < 1e-9);
  assert.ok(Math.abs(estimateCalories({ ...input, weight: fromKg(95, 'lb') }, 'lb').target - result.target) < 1e-10);
  assert.equal(estimateCalories({ ...input, sex: 'female', age: 30, weight: 70, height: 165 }).basal, 1420.25);
  for (const activity of Object.keys(ACTIVITIES)) for (const goal of Object.keys(ENERGY_GOALS)) assert.equal(estimateCalories({ ...input, activity, goal }).target, 1870 * ACTIVITIES[activity].factor * ENERGY_GOALS[goal].factor);
  for (const [key, value] of [['age', 17], ['age', ''], ['age', 30.5], ['age', 101], ['weight', 0], ['weight', 351], ['weight', false], ['height', 100], ['height', Infinity], ['sex', ''], ['goal', 'constructor'], ['activity', '__proto__']]) assert.throws(() => estimateCalories({ ...input, [key]: value }));
});
test('Perfil valida unidades, alias y objetivos opcionales', () => {
  assert.equal(validateAlias('  Alias  '), 'Alias');
  assert.deepEqual(validateGoals({ sessions: null, volumeKg: null }), { sessions: null, volumeKg: null });
  assert.throws(() => validateAlias('x'.repeat(51))); assert.throws(() => validateAlias('a\u0000'));
  assert.throws(() => validateGoals({ sessions: 22, volumeKg: 10 })); assert.throws(() => validateGoals({ sessions: 2, volumeKg: 0 }));
  assert.throws(() => validatePreferences({ weightUnit: 'stone' }));
});
test('Respaldo válido conserva historia y borrador; admite planes y ejercicios históricos eliminados', () => {
  const backup = backupFixture();
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
  const historyOnly = structuredClone(backup); historyOnly.stores.routines = []; historyOnly.stores.routineSessions = []; historyOnly.stores.exercises = [];
  assert.deepEqual(validateBackup(historyOnly), historyOnly);
  const reordered = structuredClone(backup); reordered.stores.setRecords = reordered.stores.setRecords.map((set) => Object.fromEntries(Object.entries(set).reverse()));
  assert.deepEqual(validateBackup(reordered), reordered);
});
test('Respaldo rechaza versiones, identidades, referencias, contenido y snapshots incoherentes', () => {
  const changes = [
    b => { b.schemaVersion = 2; }, b => { b.scope = 'demo'; }, b => { b.exportedAt = 'ayer'; }, b => { delete b.stores.settings; },
    b => { b.stores.exercises.push(b.stores.exercises[0]); }, b => { b.stores.exercises[0].id = 'id'; }, b => { b.stores.exercises[0].notes = 12; },
    b => { b.stores.routineSessions[0].routineId = crypto.randomUUID(); }, b => { b.stores.routineSessions[0].prescriptions[0].exerciseId = crypto.randomUUID(); },
    b => { b.stores.routineSessions[0].prescriptions[0].sets = 0; }, b => { b.stores.routineSessions[0].prescriptions[0].repsMin = 0; },
    b => { b.stores.routines[0].nextSessionId = crypto.randomUUID(); }, b => { b.stores.routines[0].sessionIds.push(b.stores.routines[0].sessionIds[0]); },
    b => { b.stores.workouts[0].entries[0].exercise.name = ''; }, b => { b.stores.workouts[0].sessionSnapshot.prescriptions[0].sets = 3; },
    b => { b.stores.workouts[0].entries[0].sets[0].weightKg = -1; }, b => { b.stores.setRecords[0].weightKg = 12; },
    b => { b.stores.setRecords.pop(); }, b => { b.stores.workouts[1].currentExercise = 7; }, b => { b.stores.workouts[1].timer.remainingMs = -1; },
    b => { b.stores.settings.find(s => s.id === 'active-workout').workoutId = crypto.randomUUID(); }, b => { b.stores.settings = b.stores.settings.filter(s => s.id !== 'active-workout'); },
    b => { b.stores.profiles[0].alias = 'x'.repeat(51); }, b => { b.stores.settings[0].weightUnit = 'oz'; }, b => { b.stores.settings.push({ id: 'active-mode', mode: 'demo' }); },
    b => { b.stores.workouts[0].origin = 'demo-seed-v1'; }, b => { b.stores.workouts[0].entries[0].sets[0].completed = false; },
  ];
  for (const change of changes) { const backup = JSON.parse(JSON.stringify(backupFixture())); change(backup); assert.throws(() => validateBackup(backup), change.toString()); }
  assert.throws(() => parseBackup('{')); assert.throws(() => parseBackup('null'));
  assert.throws(() => parseBackup('{"__proto__":{},"schemaVersion":1}'));
});
