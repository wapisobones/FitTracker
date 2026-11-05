// Offline preparation of reviewed Core/Pecho/Espalda pairs. Default stays Core.
// Reuses the installed Playwright browser to resize and encode WebP frames.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { CORE_VISUAL_ASSETS } from '../src/data/core-visual-assets.js';
import { CHEST_VISUAL_ASSETS } from '../src/data/chest-visual-assets.js';
import { BACK_VISUAL_ASSETS } from '../src/data/back-visual-assets.js';
import { BASE_EXERCISES } from '../src/data/exercises.js';

const root = new URL('../', import.meta.url);
const width = 640;
const height = 427;
const duration = 900;
const args = process.argv.slice(2);
if (args.some((arg) => !/^--(?:group|only)=[a-z0-9-]+$/.test(arg))
  || new Set(args.map((arg) => arg.split('=')[0])).size !== args.length) throw new Error('Usage: pnpm prepare:exercise-assets [--group=core|pecho|espalda] [--only=<slug>]');
const group = args.find((arg) => arg.startsWith('--group='))?.slice('--group='.length) ?? 'core';
const groups = { core: ['Core', CORE_VISUAL_ASSETS], pecho: ['Pecho', CHEST_VISUAL_ASSETS], espalda: ['Espalda', BACK_VISUAL_ASSETS] };
if (!Object.hasOwn(groups, group)) throw new Error(`Unapproved group: ${group}`);
const [groupName, assets] = groups[group];
const output = new URL(`public/assets/exercises/${group}/`, root);
const onlySlug = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const selectedAsset = assets.find((asset) => asset.slug === onlySlug);
if (onlySlug && !selectedAsset) throw new Error(`Unknown ${groupName} slug: ${onlySlug}`);
// Preserve the existing Core attribution file; other groups have their own.
const attributionFile = new URL(group === 'core' ? '../ATTRIBUTION.md' : 'ATTRIBUTION.md', output);
const previousCredits = onlySlug ? await readFile(attributionFile, 'utf8') : null;
const sectionHeading = selectedAsset ? `## ${selectedAsset.name} — ${selectedAsset.id}` : null;
const sectionStart = previousCredits?.indexOf(sectionHeading);

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 'ascii');
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, Buffer.alloc(data.length % 2)]);
}

// Minimal WebP container mux: two opaque, full-canvas lossy VP8 frames.
// The browser encodes pixels; this only adds RIFF animation timing/headers.
function animation(frames) {
  const extended = Buffer.alloc(10);
  extended[0] = 0x02; // Animation feature.
  extended.writeUIntLE(width - 1, 4, 3);
  extended.writeUIntLE(height - 1, 7, 3);
  const parts = [chunk('VP8X', extended), chunk('ANIM', Buffer.alloc(6))]; // Infinite loop, transparent background.
  for (const frame of frames) {
    if (frame.toString('ascii', 0, 4) !== 'RIFF' || frame.toString('ascii', 8, 12) !== 'WEBP'
      || frame.readUInt32LE(4) + 8 !== frame.length) {
      throw new Error('Expected an opaque VP8 WebP frame from the browser encoder.');
    }
    // Canvas may include VP8X/ICCP sRGB metadata. Only pixels belong in ANMF.
    let pixels;
    for (let offset = 12; offset < frame.length;) {
      const type = frame.toString('ascii', offset, offset + 4);
      const size = frame.readUInt32LE(offset + 4);
      const end = offset + 8 + size + size % 2;
      if (end > frame.length || !['VP8X', 'ICCP', 'VP8 '].includes(type)) throw new Error(`Unexpected WebP chunk: ${type}`);
      if (type === 'VP8 ') pixels = frame.subarray(offset, end);
      offset = end;
    }
    if (!pixels) throw new Error('Missing VP8 pixels.');
    const header = Buffer.alloc(16);
    header.writeUIntLE(width - 1, 6, 3);
    header.writeUIntLE(height - 1, 9, 3);
    header.writeUIntLE(duration, 12, 3);
    header[15] = 0x02; // Replace the whole canvas; no alpha blending.
    parts.push(chunk('ANMF', Buffer.concat([header, pixels])));
  }
  const payload = Buffer.concat([Buffer.from('WEBP'), ...parts]);
  return chunk('RIFF', payload);
}

// Validate the explicit mapping against the supplied reference and actual files.
const reference = JSON.parse(await readFile(new URL('recursos-originales/ejercicios.json', root), 'utf8'));
const originalFiles = (await readdir(new URL(`recursos-originales/${group}/`, root))).filter((name) => /\.(jpg|png)$/.test(name)).sort();
const expectedFiles = assets.flatMap((asset) => [0, 1].map((index) => `${asset.originalStem}_${index}.${asset.extension}`)).sort();
if (assets.length !== 12 || JSON.stringify(originalFiles) !== JSON.stringify(expectedFiles)) throw new Error(`Review required: expected exactly the twelve approved ${groupName} pairs.`);
const inputs = [];
for (const asset of assets) {
  const exercise = BASE_EXERCISES.find((item) => item.id === asset.id);
  const entry = reference.find((item) => item.grupo === groupName && item.nombre === asset.name);
  const names = [0, 1].map((index) => `${asset.originalStem}_${index}.${asset.extension}`);
  const referenceMatches = asset.provenance === 'user-provided'
    ? entry?.coincidencia === 'sin_resultado' && entry.imagenes.length === 0
    : entry?.nombre_en_base === asset.sourceName && entry.coincidencia === asset.match
      && JSON.stringify(entry.imagenes) === JSON.stringify(names.map((name) => `imagenes/${name}`));
  if (exercise?.name !== asset.name || exercise.mainMuscle !== groupName || !referenceMatches) {
    throw new Error(`Catalog/reference mismatch: ${asset.name}`);
  }
  if (!onlySlug || asset.slug === onlySlug) inputs.push({ asset, originals: await Promise.all(names.map((name) => readFile(new URL(`recursos-originales/${group}/${name}`, root)))) });
}
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'msedge', headless: true });
try {
  const page = await browser.newPage();
  // WebCodecs needs a secure context; fulfill this synthetic origin offline.
  await page.route('https://fittracker-assets.invalid/', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  await page.goto('https://fittracker-assets.invalid/');
  const outputs = [];
  for (const { asset, originals } of inputs) {
    const encoded = await page.evaluate(async ({ inputs, width, height, mime }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      const results = [];
      let originalWidth, originalHeight;
      for (const input of inputs) {
        const image = new Image();
        image.src = `data:${mime};base64,${input}`;
        await image.decode();
        if (!originalWidth) { originalWidth = image.naturalWidth; originalHeight = image.naturalHeight; }
        if (image.naturalWidth !== originalWidth || image.naturalHeight !== originalHeight) throw new Error('Pair dimensions differ; review required.');
        context.fillStyle = '#0b121b';
        context.fillRect(0, 0, width, height);
        // Keep the approved pilot rounding. Fit wide/portrait originals inside
        // the same canvas without cropping or stretching their proportions.
        if (originalWidth === 850 && originalHeight === 567) context.drawImage(image, 0, 0, width, height);
        else {
          const scale = Math.min(width / originalWidth, height / originalHeight);
          const drawWidth = originalWidth * scale, drawHeight = originalHeight * scale;
          context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
        }
        const data = canvas.toDataURL('image/webp', 0.78);
        if (!data.startsWith('data:image/webp;base64,')) throw new Error('WebP encoding is unavailable.');
        results.push(data.split(',')[1]);
      }
      return { frames: results, originalWidth, originalHeight };
    }, { inputs: originals.map((buffer) => buffer.toString('base64')), width, height, mime: asset.extension === 'png' ? 'image/png' : 'image/jpeg' });
    const frames = encoded.frames.map((data) => Buffer.from(data, 'base64'));
    const animated = animation(frames); // 0 -> 1 -> 0 via loop; never duplicate frame 0.
    const decoded = await page.evaluate(async (data) => {
      const decoder = new ImageDecoder({ data: Uint8Array.from(atob(data), (char) => char.charCodeAt(0)), type: 'image/webp' });
      try {
        await decoder.tracks.ready;
        for (let index = 0; index < 2; index++) {
          const { image } = await decoder.decode({ frameIndex: index });
          if (image.displayWidth !== 640 || image.displayHeight !== 427 || image.duration !== 900000) throw new Error('Invalid frame size/timing.');
          image.close();
        }
        return decoder.tracks.selectedTrack.frameCount;
      } finally { decoder.close(); }
    }, animated.toString('base64'));
    if (decoded !== 2) throw new Error(`Expected exactly two animation frames: ${asset.name}`);
    outputs.push({ asset, frames, animated, originalBytes: originals.reduce((size, buffer) => size + buffer.length, 0), dimensions: `${encoded.originalWidth} × ${encoded.originalHeight}` });
  }
  // Only write after all mappings, originals and decoded animations pass review checks.
  await mkdir(output, { recursive: true });
  const credits = group === 'core' ? [
    '# FitTracker — recursos visuales locales de Core', '',
    'Fuente de los once pares JPG: **free-exercise-db**, https://github.com/yuhonas/free-exercise-db.',
    'Licencia de esos JPG declarada en el archivo suministrado `recursos-originales/LICENCIA.txt`: **dominio público (Unlicense)**.',
    'Licencia de la fuente: https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.',
    'Correspondencias: `recursos-originales/ejercicios.json` (nombre real, en plural).', '',
    'Preparación: `pnpm prepare:exercise-assets`, sin red ni dependencias nuevas.',
    'Doce pares Core: once de free-exercise-db y uno PNG proporcionado para FitTracker. La licencia Unlicense anterior solo se atribuye a free-exercise-db; no se presupone para los PNG.',
    'Originales intactos y excluidos del build.',
    'Salida: 640 × 427, calidad WebP 0.78, encuadre completo; bandas carbón cuando la proporción original difiere.',
    'Miniatura: fotografía 0, excepto Plancha (fotografía 1, postura sostenida). Animación: dos fotogramas de 900 ms en bucle 0 → 1 → 0; sin audio ni interpolación.',
    'Plancha incluye preparación y postura sostenida. Los doce ejercicios conservan SVG como fallback de carga.',
    'Las referencias externas anteriores de Plancha y Elevación de rodillas se retiraron del build al sustituirlas por estos recursos.', '',
  ] : group === 'pecho' ? [
    '# FitTracker — recursos visuales locales de Pecho', '',
    'Fuente de los doce pares JPG: **free-exercise-db**, https://github.com/yuhonas/free-exercise-db.',
    'Licencia declarada en `recursos-originales/LICENCIA.txt`: **dominio público (Unlicense)**.',
    'Licencia de la fuente: https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.',
    'Correspondencias: `recursos-originales/ejercicios.json` (nombre real, en plural).', '',
    'Preparación: `pnpm prepare:exercise-assets --group=pecho`, sin red ni dependencias nuevas.',
    'Originales intactos y excluidos del build. Core y sus atribuciones se conservan sin cambios.',
    'Salida: 640 × 427, calidad WebP 0.78, encuadre completo sin recorte.',
    'Miniatura: fotografía 0. Animación: dos fotogramas de 900 ms en bucle 0 → 1 → 0; sin audio ni interpolación.',
    'Diez correspondencias exactas y dos aproximadas (press unilateral en polea y fondos asistidos), indicadas en sus secciones.',
    'Los doce ejercicios conservan SVG como respaldo de carga.', '',
  ] : [
    '# FitTracker — recursos visuales locales de Espalda', '',
    'Fuente de los doce pares JPG: **free-exercise-db**, https://github.com/yuhonas/free-exercise-db.',
    'Licencia declarada en `recursos-originales/LICENCIA.txt`: **dominio público (Unlicense)**.',
    'Licencia de la fuente: https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.',
    'Correspondencias: `recursos-originales/ejercicios.json` (nombre real, en plural).', '',
    'Preparación: `pnpm prepare:exercise-assets --group=espalda`, sin red ni dependencias nuevas.',
    'Originales intactos y excluidos del build. Core, Pecho y sus atribuciones se conservan sin cambios.',
    'Salida: 640 × 427, calidad WebP 0.78, encuadre completo sin recorte.',
    'Miniatura: fotografía 0. Animación: dos fotogramas de 900 ms en bucle 0 → 1 → 0; sin audio ni interpolación.',
    'Diez correspondencias exactas y dos aproximadas (elevación en Y y elevación corta de tronco), indicadas en sus secciones.',
    'Los doce ejercicios conservan SVG como respaldo de carga.', '',
  ];
  for (const { asset, frames, animated, originalBytes, dimensions } of outputs) {
    credits.push(`## ${asset.name} — ${asset.id}`, '',
      `Originales: \`${asset.originalStem}_0.${asset.extension}\` y \`${asset.originalStem}_1.${asset.extension}\` (${dimensions}; ${originalBytes} bytes entre ambos).`,
      `Referencia: **${asset.sourceName}**, coincidencia **${asset.match}**.`, asset.note, '');
    if (asset.provenance === 'user-provided') credits.push('Procedencia: imágenes proporcionadas por el usuario para incorporarlas a FitTracker. No se atribuyen a free-exercise-db ni se les asigna Unlicense. El JSON original conserva su antiguo estado sin resultado; el mapeo explícito actual está en `src/data/core-visual-assets.js`.', '');
    for (const [name, data] of [[`${asset.slug}.webp`, animated], [`${asset.slug}-poster.webp`, frames[asset.posterFrame]]]) {
      await writeFile(new URL(name, output), data);
      credits.push(`- \`${group}/${name}\`: ${data.length} bytes; SHA-256 \`${createHash('sha256').update(data).digest('hex')}\`.`);
    }
    credits.push('');
    console.log(`${asset.id} | ${asset.slug} | poster ${frames[asset.posterFrame].length} B | animation ${animated.length} B | originals ${originalBytes} B | ${dimensions}`);
  }
  let nextCredits = credits.join('\n');
  const currentHeader = nextCredits.slice(0, nextCredits.indexOf('## '));
  if (onlySlug) {
    const section = nextCredits.slice(nextCredits.indexOf(sectionHeading)).trimEnd() + '\n\n';
    if (sectionStart < 0) nextCredits = previousCredits.trimEnd() + '\n\n' + section;
    else {
      const nextSection = previousCredits.indexOf('\n## ', sectionStart + sectionHeading.length);
      nextCredits = previousCredits.slice(0, sectionStart) + section + (nextSection < 0 ? '' : previousCredits.slice(nextSection + 1));
    }
    nextCredits = currentHeader + nextCredits.slice(nextCredits.indexOf('## '));
  }
  await writeFile(attributionFile, nextCredits);
  console.log(`${outputs.length} pairs prepared; ${outputs.reduce((sum, item) => sum + item.animated.length + item.frames[item.asset.posterFrame].length, 0)} bytes total; ${outputs.length * 2} WebP files.`);
} finally { await browser.close(); }
