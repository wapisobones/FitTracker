import { BASE_EXERCISES } from '../data/exercises.js';
import { EXERCISE_MEDIA } from '../data/exercise-media.js';
import { mediaCredit } from './exercise-media.js';
import { escapeHTML as esc } from '../utils/html.js';

function creditItems(provenance) {
  return Object.entries(EXERCISE_MEDIA).filter(([, entry]) => (entry.thumbnail.provenance ?? 'free-exercise-db') === provenance)
    .map(([id, entry]) => `<li><strong>${esc(BASE_EXERCISES.find((exercise) => exercise.id === id)?.name ?? entry.thumbnail.title)}</strong>${mediaCredit(entry.thumbnail)}<p>${esc(entry.animation.changes)}</p><p>${esc(entry.animation.description)}</p></li>`).join('');
}

export function visualCredits() {
  return `<section class="visual-credits" aria-label="Créditos de recursos visuales">
    <p><a href="https://repdb.co" target="_blank" rel="noopener noreferrer">Exercise data by RepDB (repdb.co)</a></p>
    <details class="visual-credits-details"><summary>Créditos de recursos visuales</summary>
      <section><h2>RepDB</h2><p>Ilustraciones del nivel gratuito bajo RepDB Free Tier License v1.0; uso dentro de FitTracker con atribución. Secuencias creadas a partir de dos imágenes estáticas; no son animaciones premium ni vídeos.</p><ul>${creditItems('repdb')}</ul><a href="${esc(import.meta.env?.BASE_URL ?? './')}assets/exercises/repdb/LICENSE-DATA.md">Licencia RepDB incluida con la aplicación</a></section>
      <section><h2>free-exercise-db</h2><p>Fotografías de free-exercise-db, con licencia declarada de dominio público (Unlicense). Reducción y conversión a WebP, sin recorte; secuencias de dos fotografías. Las correspondencias aproximadas se detallan por ejercicio.</p><ul>${creditItems('free-exercise-db')}</ul></section>
      <section><h2>Imágenes proporcionadas para FitTracker</h2><p>Recursos aportados para esta aplicación; no se les asigna la licencia de RepDB ni Unlicense.</p><ul>${creditItems('user-provided')}</ul></section>
    </details>
  </section>`;
}
