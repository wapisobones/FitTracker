import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { REPDB_VISUAL_ASSETS, REPDB_SOURCE } from '../src/data/repdb-visual-assets.js';
import { EXERCISE_MEDIA, exerciseMedia } from '../src/data/exercise-media.js';
import { exerciseCard, techniqueView } from '../src/features/exercises/views.js';
import { visualCredits } from '../src/components/visual-credits.js';

test('FT-015C: siete pares RepDB por ID y press inclinado con recursos aportados', async () => {
  assert.equal(BASE_EXERCISES.length, 80);
  assert.equal(Object.keys(EXERCISE_MEDIA).length, 80);
  assert.deepEqual(REPDB_VISUAL_ASSETS.map(({ id }) => Number(id.slice(-12))), [73, 74, 75, 76, 77, 79, 80]);
  const source = JSON.parse(await readFile(new URL('../recursos-originales/repdb/SOURCE.json', import.meta.url)));
  assert.equal(source.revision, REPDB_SOURCE.revision);
  for (const asset of REPDB_VISUAL_ASSETS) {
    const exercise = BASE_EXERCISES.find(({ id }) => id === asset.id);
    const media = exerciseMedia(exercise);
    assert.equal(exercise.mainMuscle, asset.group);
    assert.equal(media.thumbnail.provenance, 'repdb');
    assert.equal(media.thumbnail.license, 'RepDB Free Tier License v1.0');
    assert.ok(media.animation.url.endsWith(`/repdb/${asset.slug}.webp`));
    assert.equal(media.video, null);
    for (const frame of source.assets.find(({ id }) => id === asset.id).frames) {
      const bytes = await readFile(new URL(`../recursos-originales/repdb/${frame.file}`, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), frame.sha256);
    }
  }
  const incline = exerciseMedia(BASE_EXERCISES[77]);
  assert.equal(incline.thumbnail.provenance, 'user-provided');
  assert.equal(incline.thumbnail.src, 'assets/exercises/pecho/press-inclinado-maquina-poster.webp');
  assert.equal(incline.animation.src, 'assets/exercises/pecho/press-inclinado-maquina.webp');
  assert.equal(incline.thumbnail.license, null);
  assert.equal(incline.thumbnail.sourceUrl, null);
});

test('FT-015C: créditos globales por procedencia, sin créditos en fichas o modal', () => {
  const credits = visualCredits();
  assert.ok(credits.includes('Exercise data by RepDB (repdb.co)'));
  assert.ok(credits.includes('https://repdb.co'));
  assert.ok(credits.includes('RepDB Free Tier License v1.0'));
  assert.ok(credits.includes('free-exercise-db'));
  assert.ok(credits.includes('Imágenes proporcionadas para FitTracker'));
  assert.ok(!credits.includes('undefined'));
  assert.equal((credits.match(/<li>/g) ?? []).length, 80);
  for (const exercise of BASE_EXERCISES) {
    assert.ok(!/media-credit|media-sources|Exercise data by|href="https:\/\/github/.test(exerciseCard(exercise)));
    assert.ok(!/media-credit|media-sources|Exercise data by|href="https:\/\/github/.test(techniqueView(exercise)));
  }
});
