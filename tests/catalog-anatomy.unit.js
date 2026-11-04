import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_EXERCISES, MUSCLE_GROUPS } from '../src/data/exercises.js';
import { MUSCLE_REGIONS, validateExerciseAnatomy } from '../src/data/muscle-taxonomy.js';
import { exerciseVisual } from '../src/components/exercise-visual.js';
import { defaultConfig, generateRoutine, compatibleExercises, estimateSeconds } from '../src/features/generator/engine.js';
import { validateExerciseInput } from '../src/features/exercises/exercise-service.js';
import { validateRoutine } from '../src/features/routines/model.js';
import { parseBackup } from '../src/features/profile/backup.js';
import { normalizeHistory, calculate } from '../src/features/progress/metrics.js';
import { backupFixture } from './helpers/backup.js';
import { knownHistory, FIXED_NOW } from './helpers/history.js';

const input = (regions, group = 'Piernas', extra = {}) => ({ ...defaultConfig(), muscles: [group], regions, level: 'Intermedio', ...extra });
const chosen = (result) => result.routine.sessions.flatMap((session) => session.prescriptions.map((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId)));

test('72 IDs estables, 48 altas, 12 por grupo, todas las regiones y contenido/SVG propios válidos', () => {
  assert.equal(BASE_EXERCISES.length, 72);
  assert.equal(new Set(BASE_EXERCISES.map((exercise) => exercise.id)).size, 72);
  assert.equal(new Set(BASE_EXERCISES.map((exercise) => exercise.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())).size, 72);
  const originalNames = ['Press de banca', 'Press inclinado con mancuernas', 'Aperturas con mancuernas', 'Flexiones', 'Jalón al pecho', 'Remo en polea', 'Remo con barra', 'Dominadas', 'Sentadilla con barra', 'Prensa de piernas', 'Peso muerto rumano', 'Zancadas', 'Press militar con mancuernas', 'Elevaciones laterales', 'Pájaros con mancuernas', 'Face pull', 'Curl de bíceps', 'Curl martillo', 'Extensión de tríceps en polea', 'Extensión de tríceps sobre la cabeza', 'Plancha', 'Dead bug', 'Crunch abdominal', 'Elevación de rodillas colgado'];
  for (let index = 0; index < 24; index++) {
    assert.equal(BASE_EXERCISES[index].id, `c1700000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
    assert.equal(BASE_EXERCISES[index].name, originalNames[index]);
    assert.equal(BASE_EXERCISES[index].mainMuscle, MUSCLE_GROUPS[Math.floor(index / 4)]);
  }
  for (const group of MUSCLE_GROUPS) {
    assert.equal(BASE_EXERCISES.filter((exercise) => exercise.mainMuscle === group).length, 12);
    assert.equal(BASE_EXERCISES.slice(24).filter((exercise) => exercise.mainMuscle === group).length, 8);
  }
  for (const exercise of BASE_EXERCISES) {
    assert.doesNotThrow(() => validateExerciseInput(exercise));
    assert.doesNotThrow(() => validateExerciseAnatomy(exercise));
    assert.ok(exercise.mainRegion);
    assert.ok(exercise.technique.steps.length >= 3 && exercise.technique.tips.length >= 2);
    assert.ok([...exercise.technique.steps, ...exercise.technique.tips].every((text) => typeof text === 'string' && text.length > 20));
    assert.ok(exerciseVisual(exercise).includes('stroke-dasharray')); // A defined temporary pose, not a missing-key fallback.
    assert.equal(exercise.video, null);
  }
  for (const region of MUSCLE_REGIONS) assert.ok(BASE_EXERCISES.some((exercise) => exercise.mainRegion === region.id), `Falta región principal: ${region.id}`);
});

test('Selección específica de glúteos, isquiotibiales y deltoides posterior respeta regiones principales', () => {
  for (const [region, group] of [['gluteals', 'Piernas'], ['hamstrings', 'Piernas'], ['posterior-deltoid', 'Hombros']]) {
    const config = input([region], group);
    const result = generateRoutine(config, BASE_EXERCISES);
    assert.ok(chosen(result).length >= 2);
    assert.ok(chosen(result).every((exercise) => exercise.mainRegion === region));
    assert.equal(result.routine.generator.version, 2);
    assert.doesNotThrow(() => validateRoutine(result.routine));
    assert.ok(result.routine.sessions.every((session) => estimateSeconds(session) <= config.minutes * 60));
  }
});

test('Pocas opciones amplían solo con participación secundaria declarada, nunca por grupo a ciegas', () => {
  const config = input(['gluteals'], 'Piernas', { level: 'Principiante' });
  const result = generateRoutine(config, BASE_EXERCISES);
  const exercises = chosen(result);
  assert.equal(exercises[0].mainRegion, 'gluteals');
  assert.ok(exercises.every((exercise) => exercise.mainRegion === 'gluteals' || exercise.secondaryRegions.includes('gluteals')));
  assert.ok(exercises.some((exercise) => exercise.mainRegion !== 'gluteals'));
  assert.ok(result.warnings.some((warning) => warning.includes('Glúteos') && warning.includes('secundaria')));
  assert.throws(() => generateRoutine(input(['hamstrings', 'tibialis-anterior'], 'Piernas', { equipment: ['Barra'] }), BASE_EXERCISES), /Tibial anterior/);
  assert.throws(() => generateRoutine(input(['soleus'], 'Piernas', { equipment: ['Barra'] }), BASE_EXERCISES), /No hay ejercicios compatibles/);
});

test('Programa regional cubre objetivos, rota ejercicios y conserva duraciones, IDs y ausencia de duplicados', () => {
  const config = input(['gluteals', 'hamstrings', 'posterior-deltoid'], 'Piernas', { muscles: ['Piernas', 'Hombros'], modality: 'program', frequency: 4, minutes: 20 });
  const result = generateRoutine(config, BASE_EXERCISES);
  const reversed = generateRoutine(config, [...BASE_EXERCISES].reverse());
  assert.deepEqual(result.routine.sessions.map((session) => session.prescriptions.map((item) => item.exerciseId)), reversed.routine.sessions.map((session) => session.prescriptions.map((item) => item.exerciseId)));
  assert.equal(result.routine.sessions.length, 4);
  const legs = result.routine.sessions.filter((session) => session.prescriptions.some((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId).mainMuscle === 'Piernas'));
  assert.equal(legs.length, 2);
  for (const session of legs) assert.deepEqual(session.prescriptions.map((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId).mainRegion).sort(), ['gluteals', 'hamstrings']);
  assert.notDeepEqual(legs[0].prescriptions.map((item) => item.exerciseId), legs[1].prescriptions.map((item) => item.exerciseId));
  for (const session of result.routine.sessions) {
    assert.equal(new Set(session.prescriptions.map((item) => item.exerciseId)).size, session.prescriptions.length);
    assert.ok(estimateSeconds(session) <= config.minutes * 60);
  }
});

test('Personalizados sin región conservan uso general; opcionales anatómicos inválidos se rechazan', () => {
  const custom = { id: 'e7000000-0000-4000-8000-000000000001', origin: 'custom', name: 'Remo propio', mainMuscle: 'Espalda', equipment: 'Equipo propio', notes: '', difficulty: 'Principiante' };
  assert.equal(validateExerciseInput(custom).mainRegion, undefined);
  const broad = { ...defaultConfig(), muscles: ['Espalda'], equipment: ['Equipo propio'] };
  assert.equal(compatibleExercises([custom], broad)[0].id, custom.id);
  assert.equal(compatibleExercises([custom], { ...broad, regions: ['latissimus'] }).length, 0);
  assert.throws(() => validateExerciseInput({ ...custom, mainRegion: 'gluteals' }), /región principal/);
  assert.throws(() => validateExerciseInput({ ...custom, mainRegion: 'latissimus', secondaryRegions: ['latissimus'] }), /secundarias/);
  assert.throws(() => validateExerciseInput({ ...custom, secondaryRegions: ['unknown'] }), /secundarias/);
  assert.ok(!compatibleExercises(BASE_EXERCISES, { ...defaultConfig(), muscles: ['Core'] }).some((exercise) => exercise.tracking === 'duration'));
});

test('Respaldo v1 con snapshots antiguos/nuevos y rutinas conserva campos, IDs e historia por grupo', () => {
  const old = backupFixture();
  for (const workout of old.stores.workouts) for (const { exercise } of workout.entries) for (const key of ['mainRegion', 'secondaryRegions', 'tracking', 'anatomyNote']) delete exercise[key];
  for (const exercise of old.stores.exercises) for (const key of ['mainRegion', 'secondaryRegions', 'tracking', 'anatomyNote']) delete exercise[key];
  assert.deepEqual(parseBackup(JSON.stringify(old)), old);
  const source = knownHistory();
  const before = calculate(normalizeHistory(source), { period: 'all', now: new Date(FIXED_NOW) });
  const cloned = structuredClone(source);
  for (const workout of cloned.workouts) for (const { exercise } of workout.entries) {
    delete exercise.mainRegion; delete exercise.secondaryRegions;
    exercise.secondaryMuscles = ['Glúteos', 'Bíceps'];
  }
  const after = calculate(normalizeHistory(cloned), { period: 'all', now: new Date(FIXED_NOW) });
  assert.equal(after.totalSets, before.totalSets);
  assert.equal(after.totalVolume, before.totalVolume);
  assert.deepEqual(after.muscles, before.muscles);
  const enriched = backupFixture();
  const historical = enriched.stores.workouts[0];
  const hipThrust = BASE_EXERCISES.find((exercise) => exercise.name === 'Hip thrust con barra');
  historical.entries[0].exercise = structuredClone(hipThrust);
  historical.entries[0].prescription.exerciseId = hipThrust.id;
  historical.sessionSnapshot.prescriptions[0].exerciseId = hipThrust.id;
  for (const set of enriched.stores.setRecords) set.exerciseId = hipThrust.id;
  assert.deepEqual(parseBackup(JSON.stringify(enriched)), enriched);
});
