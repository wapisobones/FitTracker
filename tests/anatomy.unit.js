import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_EXERCISES, MUSCLE_GROUPS } from '../src/data/exercises.js';
import { MUSCLE_REGIONS, selectedRegions, toggleMuscleSelection, groupSelection } from '../src/data/muscle-taxonomy.js';
import { bodyMap } from '../src/features/generator/body-map.js';
import { defaultConfig, generateRoutine, validateConfig } from '../src/features/generator/engine.js';
import { parseBackup } from '../src/features/profile/backup.js';
import { backupFixture } from './helpers/backup.js';

test('Mapa: cada superficie tiene ID único y ambas mitades; profundos solo en lista', () => {
  const svg = bodyMap([], 'both');
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(new Set(MUSCLE_REGIONS.map((region) => region.id)).size, 22);
  for (const region of MUSCLE_REGIONS) {
    assert.ok(MUSCLE_GROUPS.includes(region.group));
    for (const side of ['front', 'back']) {
      assert.equal(svg.includes(`id="map-${side}-${region.id}"`), region.views.includes(side));
      if (region.views.includes(side)) for (const half of ['left', 'right']) assert.ok(svg.includes(`id="anatomy-${side}-${region.id}-${half}-1"`));
    }
  }
  assert.deepEqual(MUSCLE_REGIONS.filter((region) => !region.views.length).map((region) => region.id), ['rhomboids', 'spinal-erectors']);
});

test('Grupos completos, parciales y retirada de última región mantienen prioridades', () => {
  let config = { ...defaultConfig(), muscles: ['Brazos'], priorities: ['Brazos'] };
  const original = structuredClone(config);
  assert.equal(selectedRegions(config).length, 4);
  config = toggleMuscleSelection(config, 'biceps');
  assert.equal(groupSelection(config.regions, 'Brazos'), 'mixed');
  assert.deepEqual(config.priorities, ['Brazos']);
  config = toggleMuscleSelection(config, 'Brazos', true);
  assert.equal(groupSelection(config.regions, 'Brazos'), 'true');
  config = toggleMuscleSelection(config, 'Brazos', true);
  assert.deepEqual(config.muscles, []);
  assert.deepEqual(config.priorities, []);
  config = toggleMuscleSelection(config, 'rhomboids');
  assert.deepEqual(config.muscles, ['Espalda']);
  config = toggleMuscleSelection(config, 'rhomboids');
  assert.deepEqual(config.muscles, []);
  assert.deepEqual(original.regions, undefined);
});

test('Regiones conservan grupos FT-007 y ahora centran la selección sin modificar el catálogo', () => {
  const before = structuredClone(BASE_EXERCISES);
  const oldConfig = { ...defaultConfig(), muscles: ['Brazos', 'Espalda'], priorities: ['Brazos'] };
  const newConfig = { ...oldConfig, regions: ['biceps', 'rhomboids'] };
  const shape = (input) => generateRoutine(input, BASE_EXERCISES).routine.sessions.map((session) => session.prescriptions.map(({ id, ...item }) => item));
  assert.deepEqual(shape(oldConfig), shape({ ...oldConfig }));
  const selected = shape(newConfig).flat().map((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId));
  assert.ok(selected.every((exercise) => ['biceps', 'rhomboids'].includes(exercise.mainRegion)));
  assert.deepEqual(validateConfig(newConfig, BASE_EXERCISES).regions, ['rhomboids', 'biceps']);
  for (const regions of [null, [], ['unknown'], ['quadriceps']]) assert.throws(() => validateConfig({ ...oldConfig, regions }, BASE_EXERCISES), /regiones/);
  assert.deepEqual(BASE_EXERCISES, before);
  assert.equal(oldConfig.regions, undefined);
});

test('Respaldos v1 conservan IDs, snapshots antiguos y configuración con o sin regiones', () => {
  const backup = backupFixture();
  backup.stores.routines[0].origin = 'generator';
  backup.stores.routines[0].generator = { version: 1, config: { ...defaultConfig(), muscles: ['Brazos'] } };
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
  const history = structuredClone(backup.stores.workouts);
  backup.stores.routines[0].generator.config.regions = ['biceps'];
  const parsed = parseBackup(JSON.stringify(backup));
  assert.deepEqual(parsed, backup);
  assert.deepEqual(parsed.stores.workouts, history);
  assert.equal(parsed.schemaVersion, 1);
});
