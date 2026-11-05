import { exerciseVisual } from './exercise-visual.js';
import { exerciseMedia } from '../data/exercise-media.js';
import { escapeHTML as esc } from '../utils/html.js';

export function mediaCredit(resource, compact = false) {
  if (!resource) return '';
  if (resource.provenance === 'user-provided') return `<p class="media-credit">${esc(resource.author)}${compact ? '' : ` · ${esc(resource.changes ?? '')}`}</p>`;
  const author = resource.authorUrl ? `<a href="${esc(resource.authorUrl)}" target="_blank" rel="noopener noreferrer">${esc(resource.author)}</a>` : esc(resource.author);
  return `<p class="media-credit">${compact ? '' : `${esc(resource.title)}. `}${author} · <a href="${esc(resource.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fuente</a> · <a href="${esc(resource.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(resource.license)}</a>${compact ? '' : ` · ${esc(resource.changes ?? 'Sin modificaciones.')}`}</p>`;
}

export function exerciseStill(exercise, { thumbnail = exerciseMedia(exercise).thumbnail, decorative = false } = {}) {
  if (!thumbnail) return exerciseVisual(exercise);
  return `<div class="exercise-media-still" data-media-state="loading">${exerciseVisual(exercise)}<img data-exercise-thumbnail src="${esc(thumbnail.url)}" alt="${decorative ? '' : esc(thumbnail.alt)}" width="${thumbnail.width}" height="${thumbnail.height}" loading="lazy" decoding="async" /></div>`;
}

export function techniqueMedia(exercise) {
  const { thumbnail, video, animation } = exerciseMedia(exercise);
  const credits = mediaCredit(animation ?? thumbnail) + (video && video.sourceUrl !== thumbnail?.sourceUrl ? mediaCredit(video) : '');
  return `<div class="technique-illustration" data-technique-media><div data-media-stage>${exerciseStill(exercise)}</div><p data-media-label>${thumbnail ? thumbnail.provenance === 'user-provided' ? 'Imagen de referencia' : 'Fotografía de referencia' : 'Representación esquemática · No es un vídeo'}</p>
    ${video || animation ? `<button type="button" class="button button-secondary media-play" data-load-demonstration${animation ? ' data-animation-control' : ''}>${animation ? 'Ver secuencia' : 'Ver demostración'}</button>` : ''}
    ${animation ? '<p data-reduced-motion-note hidden>Movimiento reducido activado: se muestra la fotografía estática.</p>' : ''}
    <p class="media-status" role="status" aria-live="polite"></p>
    ${credits ? `<details class="media-sources"><summary>Fuente de las imágenes</summary>${credits}${animation ? `<p class="media-description">${esc(animation.description)}</p>` : ''}</details>` : ''}
    ${video ? `<p class="sr-only" id="exercise-video-description">${esc(video.description ?? 'Demostración externa. Las instrucciones escritas describen el movimiento.')}</p>` : ''}</div>`;
}

// One delegated image handler per catalog. Failing images reveal the inline SVG,
// including failures from the browser cache; no recursive fallback requests.
export function mountExerciseMedia(root, signal) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function updateMotion() {
    root.querySelectorAll('[data-animation-control]').forEach((button) => { button.disabled = motion.matches; });
    root.querySelectorAll('[data-reduced-motion-note]').forEach((note) => { note.hidden = !motion.matches; });
  }
  motion.addEventListener('change', updateMotion, { signal });
  function imageState(img) {
    if (!img.matches('[data-exercise-thumbnail]')) return;
    const still = img.closest('.exercise-media-still');
    if (!still) return;
    const loaded = img.naturalWidth > 0;
    still.dataset.mediaState = loaded ? 'ready' : 'error';
    if (!loaded) {
      img.remove();
      const region = still.closest('[data-technique-media], .exercise-preview');
      const label = region?.querySelector('[data-media-label], .preview-caption');
      if (label) label.textContent = 'Esquema orientativo';
      const status = region?.querySelector('.media-status');
      if (status) status.textContent = 'No se pudo cargar la imagen. Puedes consultar el esquema y las instrucciones.';
    }
  }
  root.addEventListener('load', (event) => { if (event.target instanceof HTMLImageElement) imageState(event.target); }, { capture: true, signal });
  root.addEventListener('error', (event) => { if (event.target instanceof HTMLImageElement) imageState(event.target); }, { capture: true, signal });
  return { refresh() { updateMotion(); root.querySelectorAll('[data-exercise-thumbnail]').forEach((img) => { if (img.complete) imageState(img); }); } };
}

export function loadDemonstration(container, exercise) {
  const { video, thumbnail, animation } = exerciseMedia(exercise);
  if (!video && !animation) return () => {};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (animation && motion.matches) return () => {};
  const stage = container.querySelector('[data-media-stage]');
  const button = container.querySelector('[data-load-demonstration]');
  const status = container.querySelector('.media-status');
  const label = container.querySelector('[data-media-label]');
  const still = stage.firstElementChild;
  let disposed = false;
  let timeout;
  const player = document.createElement(animation ? 'img' : video.type === 'youtube' ? 'iframe' : 'video');
  player.className = 'technique-player';
  player.setAttribute('aria-label', `Demostración de ${exercise.name}`);
  if (video) player.setAttribute('aria-describedby', 'exercise-video-description');
  const fallback = document.createElement('button');
  fallback.type = 'button'; fallback.className = 'button button-secondary media-play'; fallback.textContent = 'Volver a la imagen';
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timeout);
    motion.removeEventListener('change', stopForReducedMotion);
    player.onerror = null;
    player.onload = null;
    if (player instanceof HTMLVideoElement) {
      player.pause(); player.removeAttribute('src'); player.load();
    } else player.removeAttribute('src');
    player.remove(); fallback.remove();
  };
  const restore = (failed) => {
    if (disposed) return;
    dispose(); still.hidden = false;
    label.textContent = 'Referencia del ejercicio';
    status.textContent = failed ? `No se pudo cargar ${animation ? 'la secuencia' : 'el vídeo'}. Consulta la imagen o el esquema y las instrucciones.` : 'Puedes seguir consultando las instrucciones.';
    button.hidden = false;
    button.textContent = failed ? 'Reintentar demostración' : animation ? 'Ver secuencia' : 'Ver demostración';
    if (!button.disabled) button.focus();
    else { label.tabIndex = -1; label.focus(); }
  };
  const stopForReducedMotion = (event) => { if (animation && event.matches) restore(false); };
  if (animation) motion.addEventListener('change', stopForReducedMotion);
  const fail = () => restore(true);
  fallback.addEventListener('click', () => restore(false));
  player.onerror = fail;
  still.hidden = true; button.hidden = true;
  label.textContent = animation ? animation.provenance === 'user-provided' ? 'Secuencia de 2 imágenes · No es un vídeo' : 'Secuencia de 2 fotografías · No es un vídeo' : 'Demostración de técnica';
  status.textContent = 'Cargando demostración…';
  stage.append(player); button.after(fallback);
  timeout = setTimeout(fail, 20000);
  if (player instanceof HTMLImageElement) {
    player.alt = animation.alt;
    player.width = animation.width; player.height = animation.height;
    player.onload = () => { if (!disposed) { clearTimeout(timeout); status.textContent = 'Secuencia en reproducción. Pulsa «Volver a la imagen» para detenerla.'; } };
    player.src = animation.url;
  } else if (player instanceof HTMLVideoElement) {
    player.controls = true; player.playsInline = true; player.muted = true; player.preload = 'metadata';
    if (thumbnail) player.poster = thumbnail.url;
    player.addEventListener('loadeddata', () => { if (!disposed) { clearTimeout(timeout); status.textContent = 'Pulsa reproducir para iniciar el vídeo.'; } }, { once: true });
    player.src = video.url;
  } else {
    player.title = `Demostración de ${exercise.name}`;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    player.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    player.allow = 'fullscreen'; player.allowFullscreen = true;
    player.onload = () => { clearTimeout(timeout); status.textContent = 'Si el proveedor no muestra el vídeo, vuelve a la imagen y consulta las instrucciones.'; };
    player.src = video.url;
  }
  player.tabIndex = 0; player.focus();
  return dispose;
}
