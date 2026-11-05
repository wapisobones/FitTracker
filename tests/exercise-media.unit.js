import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { BASE_EXERCISES } from '../src/data/exercises.js';
import { CORE_VISUAL_ASSETS } from '../src/data/core-visual-assets.js';
import { EXERCISE_MEDIA, exerciseMedia, mediaUrl, verifiedResource } from '../src/data/exercise-media.js';

const noMedia = { thumbnail: null, video: null, animation: null };

test('Core: doce pares locales con SVG disponible como respaldo', () => {
  const core = BASE_EXERCISES.filter((exercise) => exercise.mainMuscle === 'Core');
  assert.equal(core.length, 12);
  assert.deepEqual(Object.keys(EXERCISE_MEDIA).sort(), core.map((exercise) => exercise.id).sort());
  assert.deepEqual(CORE_VISUAL_ASSETS.map((asset) => Number(asset.id.slice(-12))), [21, 22, 23, 24, 65, 66, 67, 68, 69, 70, 71, 72]);
  assert.equal(core.filter((exercise) => exerciseMedia(exercise).thumbnail).length, 12);
  assert.equal(core.filter((exercise) => exerciseMedia(exercise).animation).length, 12);
  assert.equal(core.filter((exercise) => exerciseMedia(exercise).video).length, 0);
  for (const exercise of BASE_EXERCISES) {
    assert.equal(exercise.video, null);
    if (exercise.mainMuscle !== 'Core') assert.deepEqual(exerciseMedia(exercise), noMedia);
  }
});

test('Correspondencias locales por ID, fuente y nombres reales; sin medios activados por datos importados', async () => {
  const reference = JSON.parse(await readFile(new URL('../recursos-originales/ejercicios.json', import.meta.url), 'utf8'));
  const files = await readdir(new URL('../recursos-originales/core/', import.meta.url));
  for (const asset of CORE_VISUAL_ASSETS) {
    const exercise = BASE_EXERCISES.find((item) => item.id === asset.id);
    assert.equal(exercise.name, asset.name);
    const entry = reference.find((item) => item.grupo === 'Core' && item.nombre === asset.name);
    if (asset.provenance === 'user-provided') {
      assert.equal(entry.coincidencia, 'sin_resultado');
      assert.deepEqual(entry.imagenes, []);
      assert.equal(asset.extension, 'png');
    } else {
      assert.equal(entry.nombre_en_base, asset.sourceName);
      assert.equal(entry.coincidencia, asset.match);
      assert.deepEqual(entry.imagenes, [0, 1].map((index) => `imagenes/${asset.originalStem}_${index}.jpg`));
    }
    for (const index of [0, 1]) assert.ok(files.includes(`${asset.originalStem}_${index}.${asset.extension}`));
    const media = exerciseMedia(exercise);
    assert.equal(media.animation.src, `assets/exercises/core/${asset.slug}.webp`);
    assert.equal(media.thumbnail.src, `assets/exercises/core/${asset.slug}-poster.webp`);
    if (asset.provenance === 'user-provided') {
      assert.equal(media.animation.license, null);
      assert.equal(media.animation.sourceUrl, null);
      assert.equal(verifiedResource({ ...media.animation, src: 'https://evil.test/a.webp' }, 'animation'), null);
      assert.equal(verifiedResource({ ...media.animation, status: 'pending' }, 'animation'), null);
    } else assert.equal(media.animation.license, 'Unlicense');
    assert.equal(exerciseMedia({ ...exercise, name: 'Nombre cambiado' }).animation.src, media.animation.src);
    assert.deepEqual(exerciseMedia({ ...exercise, origin: 'custom', animation: media.animation }), noMedia);
    assert.deepEqual(exerciseMedia({ ...exercise, id: 'unknown', animation: media.animation }), noMedia);
  }
});

function chunks(buffer, start = 12) {
  const results = [];
  for (let offset = start; offset < buffer.length;) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    assert.ok(offset + 8 + size <= buffer.length);
    results.push({ type, data: buffer.subarray(offset + 8, offset + 8 + size) });
    offset += 8 + size + size % 2;
    assert.ok(offset <= buffer.length);
  }
  return results;
}

test('24 WebP: dos fotogramas de 900 ms, bucle 0 → 1 → 0 y miniatura de la posición elegida', async () => {
  const output = new URL('../public/assets/exercises/core/', import.meta.url);
  assert.deepEqual((await readdir(output)).sort(), CORE_VISUAL_ASSETS.flatMap(({ slug }) => [`${slug}.webp`, `${slug}-poster.webp`]).sort());
  for (const { slug, posterFrame } of CORE_VISUAL_ASSETS) {
    const animated = await readFile(new URL(`${slug}.webp`, output));
    const poster = await readFile(new URL(`${slug}-poster.webp`, output));
    assert.equal(animated.toString('ascii', 0, 4), 'RIFF');
    assert.equal(animated.toString('ascii', 8, 12), 'WEBP');
    assert.equal(animated.readUInt32LE(4) + 8, animated.length);
    const parts = chunks(animated);
    assert.deepEqual(parts.map(({ type }) => type), ['VP8X', 'ANIM', 'ANMF', 'ANMF']);
    assert.equal(parts[0].data[0], 2);
    assert.equal(parts[0].data.readUIntLE(4, 3) + 1, 640);
    assert.equal(parts[0].data.readUIntLE(7, 3) + 1, 427);
    assert.equal(parts[1].data.readUInt16LE(4), 0); // Infinite loop: return to frame 0 without duplication.
    for (const { data } of parts.slice(2)) {
      assert.equal(data.readUIntLE(6, 3) + 1, 640);
      assert.equal(data.readUIntLE(9, 3) + 1, 427);
      assert.equal(data.readUIntLE(12, 3), 900);
      assert.equal(data[15], 2); // Whole-canvas replacement.
    }
    const firstPixels = chunks(parts[2].data, 16).find(({ type }) => type === 'VP8 ').data;
    const secondPixels = chunks(parts[3].data, 16).find(({ type }) => type === 'VP8 ').data;
    assert.deepEqual(posterFrame === 1 ? secondPixels : firstPixels, chunks(poster).find(({ type }) => type === 'VP8 ').data);
    assert.notDeepEqual(firstPixels, secondPixels);
  }
});

test('Rechaza rutas inseguras, recursos pendientes y atribución incompleta', () => {
  for (const path of ['//evil.test/a.jpg', '../media/core/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,x', 'media/core/../a.jpg', 'assets/exercises/core/../a.webp', '/assets/exercises/core/a.webp', 'assets/exercises/Core/a.webp', 'https://upload.wikimedia.org.evil.test/wikipedia/commons/a.jpg']) assert.equal(mediaUrl(path), null);
  assert.equal(mediaUrl('assets/exercises/core/crunch-abdominal.webp'), './assets/exercises/core/crunch-abdominal.webp');
  const thumbnail = Object.values(EXERCISE_MEDIA).find((entry) => entry.thumbnail).thumbnail;
  for (const patch of [{ status: 'pending' }, { author: '' }, { sourceUrl: 'javascript:alert(1)' }, { licenseUrl: '' }, { width: 0 }]) assert.equal(verifiedResource({ ...thumbnail, ...patch }, 'thumbnail'), null);
  const animation = Object.values(EXERCISE_MEDIA).find((entry) => entry.animation).animation;
  assert.equal(verifiedResource({ ...animation, description: '' }, 'animation'), null);
  assert.equal(verifiedResource({ ...animation, src: 'media/core/a.jpg' }, 'animation'), null);
});

test('Se conserva validación de vídeo: embebidos solo con permiso explícito e ID del proveedor', () => {
  // Synthetic fixture; no real video/embedding remains assigned to Core.
  const rights = Object.values(EXERCISE_MEDIA).find((entry) => entry.thumbnail).thumbnail;
  const fixture = { ...rights, type: 'youtube', videoId: 'aaaaaaaaaaa', embeddingAllowed: true };
  assert.equal(verifiedResource(fixture, 'video').url, 'https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?autoplay=0&rel=0');
  assert.equal(verifiedResource({ ...fixture, embeddingAllowed: false }, 'video'), null);
  assert.equal(verifiedResource({ ...fixture, videoId: 'https://evil.test/' }, 'video'), null);
  assert.equal(verifiedResource({ ...fixture, type: 'iframe', src: 'https://evil.test/' }, 'video'), null);
});
