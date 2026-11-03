import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_EXERCISES, MUSCLE_GROUPS } from '../src/data/exercises.js';
import { defaultConfig, generateRoutine, compatibleExercises, estimateSeconds, targets } from '../src/features/generator/engine.js';
import { validateRoutine } from '../src/features/routines/model.js';

const config = (fields = {}) => ({ ...defaultConfig(), muscles: ['Pecho', 'Espalda'], ...fields });
const shape = (routine) => routine.sessions.map((session) => ({ name: session.name, prescriptions: session.prescriptions.map(({ exerciseId, sets, repsMin, repsMax, restSeconds }) => ({ exerciseId, sets, repsMin, repsMax, restSeconds })) }));

test('Sesión determinista, cobertura, referencias existentes y duración acotada', () => {
  const before = structuredClone(BASE_EXERCISES);
  const input = config({ muscles: MUSCLE_GROUPS });
  const first = generateRoutine(input, BASE_EXERCISES);
  const second = generateRoutine(input, [...BASE_EXERCISES].reverse());
  assert.deepEqual(shape(first.routine), shape(second.routine));
  assert.equal(first.routine.origin, 'generator');
  assert.equal(first.routine.sessions.length, 1);
  assert.doesNotThrow(() => validateRoutine(first.routine));
  const session = first.routine.sessions[0];
  assert.ok(estimateSeconds(session) <= 30 * 60);
  assert.equal(new Set(session.prescriptions.map((item) => item.exerciseId)).size, session.prescriptions.length);
  assert.deepEqual([...new Set(session.prescriptions.map((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId).mainMuscle))].sort(), [...MUSCLE_GROUPS].sort());
  assert.deepEqual(BASE_EXERCISES, before);
});
test('Programa de cuatro sesiones alterna torso y pierna/core, sin días impuestos', () => {
  const input = config({ modality: 'program', frequency: 4, level: 'Intermedio', minutes: 60, muscles: MUSCLE_GROUPS });
  const { routine } = generateRoutine(input, BASE_EXERCISES);
  assert.equal(routine.sessions.length, 4);
  const groups = routine.sessions.map((session) => new Set(session.prescriptions.map((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId).mainMuscle)));
  for (let i = 0; i < groups.length; i++) {
    assert.equal([...groups[i]].some((group) => groups[(i + 1) % groups.length].has(group)), false);
    assert.ok(estimateSeconds(routine.sessions[i]) <= 60 * 60);
    assert.equal(routine.sessions[i].day, undefined);
  }
  assert.equal(routine.nextSessionId, routine.sessions[0].id);
});
test('Equipo compuesto y nivel: un banco también es necesario, sin dificultad inferida', () => {
  const input = config({ level: 'Intermedio', muscles: ['Pecho'], equipment: ['Mancuernas'] });
  assert.equal(compatibleExercises(BASE_EXERCISES, input).length, 0);
  input.equipment.push('Banco');
  assert.equal(compatibleExercises(BASE_EXERCISES, input).length, 2);
  input.level = 'Principiante';
  assert.equal(compatibleExercises(BASE_EXERCISES, input).length, 0);
  assert.throws(() => generateRoutine(input, BASE_EXERCISES), /No hay ejercicios compatibles/);
});
test('Validaciones e incompatibilidades no producen propuestas incompletas', () => {
  assert.throws(() => generateRoutine(config({ muscles: [] }), BASE_EXERCISES), /Selecciona al menos/);
  assert.throws(() => generateRoutine(config({ priorities: ['Piernas'] }), BASE_EXERCISES), /prioritarios/);
  assert.throws(() => generateRoutine(config({ frequency: 7 }), BASE_EXERCISES), /frecuencia/);
  assert.throws(() => generateRoutine(config({ minutes: 10 }), BASE_EXERCISES), /duración/);
  assert.throws(() => generateRoutine(config({ muscles: ['Pecho'], level: 'Avanzado', goal: 'strength', minutes: 15 }), BASE_EXERCISES), /al menos 20 min/);
});
test('Prioridades y objetivos afectan orden, reparto y prescripciones', () => {
  const input = config({ level: 'Intermedio', minutes: 30, priorities: ['Espalda'] });
  const { routine } = generateRoutine(input, BASE_EXERCISES);
  const entries = routine.sessions[0].prescriptions;
  assert.equal(BASE_EXERCISES.find((exercise) => exercise.id === entries[0].exerciseId).mainMuscle, 'Espalda');
  assert.equal(entries.filter((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId).mainMuscle === 'Espalda').length, 2);
  assert.deepEqual(targets(config({ goal: 'strength' })), { sets: 3, repsMin: 5, repsMax: 6, restSeconds: 150 });
  assert.deepEqual(targets(config({ goal: 'conditioning' })), { sets: 2, repsMin: 12, repsMax: 15, restSeconds: 45 });
});
test('Personalizados con metadatos suficientes; límites explícitos sin duplicados de relleno', () => {
  const custom = { id: 'e7000000-0000-4000-8000-000000000001', name: 'Press propio', origin: 'custom', equipment: 'Banda propia', mainMuscle: 'Pecho', difficulty: 'Principiante' };
  const catalog = [...BASE_EXERCISES, custom];
  const input = config({ muscles: ['Pecho'], equipment: ['Banda propia'], modality: 'program', frequency: 4 });
  const result = generateRoutine(input, catalog);
  assert.equal(result.routine.sessions[0].prescriptions[0].exerciseId, custom.id);
  assert.ok(result.warnings.some((warning) => warning.includes('consecutivas')));
  assert.ok(result.warnings.some((warning) => warning.includes('más cortas')));
  custom.difficulty = 'Sin especificar';
  assert.throws(() => generateRoutine(input, catalog), /No hay ejercicios compatibles/);
});
