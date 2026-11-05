import { CORE_VISUAL_ASSETS } from './core-visual-assets.js';

// Editorial manifest only. Never read media URLs from IndexedDB or backups.
// Only Core is approved. Missing/failed assets still fall back to the SVG.
function localPair(asset) {
  const rights = {
    status: 'verified', checkedAt: '2026-11-04', author: 'free-exercise-db',
    title: `${asset.sourceName} — ${asset.name}`,
    sourceUrl: 'https://github.com/yuhonas/free-exercise-db',
    license: 'Unlicense', licenseUrl: 'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE',
    type: 'image', width: 640, height: 427,
  };
  if (asset.provenance === 'user-provided') {
    Object.assign(rights, {
      provenance: 'user-provided', author: 'Imágenes proporcionadas para FitTracker',
      title: asset.name, sourceUrl: null, license: null, licenseUrl: null,
    });
  }
  const path = `assets/exercises/core/${asset.slug}`;
  return {
    status: 'verified',
    thumbnail: {
      ...rights, src: `${path}-poster.webp`, alt: asset.alt,
      changes: asset.provenance === 'user-provided' ? 'Imagen local reducida y convertida a WebP; sin recorte.' : 'Fotografía local reducida y convertida a WebP; sin recorte.',
    },
    animation: {
      ...rights, src: `${path}.webp`, alt: asset.sequenceAlt,
      description: asset.note || (asset.slug === 'crunch-abdominal'
        ? 'Alterna las posiciones inicial y final. Consulta los pasos para controlar el movimiento y evitar tirar del cuello.'
        : 'Alterna dos fotografías de referencia. Sigue las instrucciones para realizar el movimiento de forma controlada.'),
      changes: asset.provenance === 'user-provided' ? 'Dos imágenes reducidas y combinadas en una secuencia animada; sin recorte ni audio.' : 'Dos fotografías reducidas y combinadas en una secuencia animada; sin recorte ni audio.',
    },
    video: null,
  };
}

export const EXERCISE_MEDIA = Object.freeze({
  ...Object.fromEntries(CORE_VISUAL_ASSETS.map((asset) => [asset.id, localPair(asset)])),
});

const secureLink = (value) => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
};

// Remote files are restricted to the reviewed distributor. A verified manifest
// entry is still mandatory; a hostname alone never implies permission.
export function mediaUrl(path) {
  if (typeof path !== 'string') return null;
  if (/^(?:media|assets\/exercises)\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|jpg|png|webm|mp4)$/.test(path)) {
    return `${import.meta.env?.BASE_URL ?? './'}${path}`;
  }
  try {
    const url = new URL(path);
    if (secureLink(path) && url.hostname === 'upload.wikimedia.org' && url.pathname.startsWith('/wikipedia/commons/')) return url.href;
  } catch { /* Unreviewed/invalid URL: use the existing SVG. */ }
  return null;
}

export function verifiedResource(resource, kind) {
  if (!resource || resource.status !== 'verified' || !resource.checkedAt || !resource.author || !resource.title) return null;
  const provided = resource.provenance === 'user-provided';
  if (provided && (!['thumbnail', 'animation'].includes(kind) || !/^assets\/exercises\/core\/[a-z0-9-]+\.webp$/.test(resource.src))) return null;
  if (!provided && (!resource.license || !secureLink(resource.sourceUrl) || !secureLink(resource.licenseUrl)
    || (resource.authorUrl && !secureLink(resource.authorUrl)))) return null;
  if (['thumbnail', 'animation'].includes(kind) && (resource.type !== 'image' || !resource.alt || !(resource.width > 0 && resource.height > 0))) return null;
  if (kind === 'animation' && (!resource.description || !resource.src?.endsWith('.webp'))) return null;
  if (kind === 'video' && resource.type === 'youtube') {
    // Editorially approved embedding only. Never accept arbitrary iframe URLs.
    if (resource.embeddingAllowed !== true || !/^[\w-]{11}$/.test(resource.videoId)) return null;
    return { ...resource, url: `https://www.youtube-nocookie.com/embed/${resource.videoId}?autoplay=0&rel=0` };
  }
  if (kind === 'video' && (resource.type !== 'video' || !['video/webm', 'video/mp4'].includes(resource.mime) || !resource.description)) return null;
  const url = mediaUrl(resource.src);
  return url ? { ...resource, url } : null;
}

export function exerciseMedia(exercise) {
  const entry = exercise.origin === 'base' ? EXERCISE_MEDIA[exercise.id] : null;
  return {
    thumbnail: verifiedResource(entry?.thumbnail, 'thumbnail'),
    video: verifiedResource(entry?.video, 'video'),
    animation: verifiedResource(entry?.animation, 'animation'),
  };
}
