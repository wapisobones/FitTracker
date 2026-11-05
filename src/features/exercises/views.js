import { icon } from '../../components/icons.js';
import { exerciseMedia } from '../../data/exercise-media.js';
import { exerciseStill, techniqueMedia, mediaCredit } from '../../components/exercise-media.js';
import { MUSCLE_GROUPS, DIFFICULTIES, BASE_EXERCISES } from '../../data/exercises.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { MUSCLE_REGIONS, regionName } from '../../data/muscle-taxonomy.js';

const options = (items, selected = '') => items.map((value) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(value)}</option>`).join('');

export function catalogFrame(mode) {
  return `<section class="page-heading catalog-heading"><div><h1>${icon('dumbbell')}Ejercicios</h1><p>Encuentra ejercicios y consulta su técnica.</p></div><button class="button button-primary" type="button" data-create-exercise disabled>${icon('plus')}Crear ejercicio</button></section>
  <p class="catalog-scope-note">Base compartida · Personalizados solo en ${mode === 'demo' ? 'demostración' : 'modo personal'}.</p>
  <form class="catalog-filters" role="search" aria-label="Buscar y filtrar ejercicios"><label class="exercise-search">${icon('search')}<span class="sr-only">Buscar por nombre</span><input type="search" name="search" maxlength="80" placeholder="Buscar ejercicio…" autocomplete="off" /></label>
    <button class="button button-secondary filter-toggle" type="button" aria-expanded="false" aria-controls="exercise-filter-fields">${icon('filter')}Filtros</button>
    <div id="exercise-filter-fields" class="exercise-filter-fields" data-expanded="false"><label>Grupo muscular<select name="muscle"><option value="">Todos</option>${options(MUSCLE_GROUPS)}</select></label><label>Región principal<select name="region">${regionOptions()}</select></label><label>Equipamiento<select name="equipment"><option value="">Todos</option></select></label><label>Dificultad<select name="difficulty"><option value="">Todas</option>${options(DIFFICULTIES)}</select></label></div>
  </form><div class="muscle-chips" aria-label="Filtrar por grupo muscular">${['', ...MUSCLE_GROUPS].map((group) => `<button type="button" data-muscle="${group}" aria-pressed="${group === ''}">${group || 'Todos'}</button>`).join('')}</div>
  <div class="catalog-results-heading"><p class="catalog-count" role="status" aria-live="polite">Cargando biblioteca…</p><button class="text-link clear-filters" type="button" data-clear-filters>Limpiar filtros</button></div>
  <div class="catalog-feedback" role="status" aria-live="polite"></div><div class="catalog-error"></div><div class="exercise-grid" aria-label="Biblioteca de ejercicios"></div>
  <dialog class="exercise-dialog" aria-labelledby="exercise-dialog-title" tabindex="-1"></dialog>`;
}

export function equipmentOptions(exercises, selected) {
  return `<option value="">Todos</option>${options([...new Set(exercises.map((exercise) => exercise.equipment))].sort((a, b) => a.localeCompare(b, 'es')), selected)}`;
}
export function regionOptions(group = '', selected = '') {
  return `<option value="">Todas</option>${MUSCLE_REGIONS.filter((region) => !group || region.group === group).map((region) => `<option value="${region.id}"${region.id === selected ? ' selected' : ''}>${esc(region.name)}</option>`).join('')}`;
}

export function exerciseCard(exercise) {
  const custom = exercise.origin === 'custom';
  const { thumbnail } = exerciseMedia(exercise);
  const muscles = [exercise.mainMuscle, ...(exercise.mainRegion ? [regionName(exercise.mainRegion)] : [])].join(' · ');
  return `<article class="card exercise-card" data-exercise-id="${exercise.id}"><button class="exercise-preview" type="button" data-technique="${exercise.id}" aria-label="Ver técnica de ${esc(exercise.name)}">${exerciseStill(exercise, { thumbnail, decorative: true })}<span class="preview-caption">${thumbnail ? thumbnail.provenance === 'user-provided' ? 'Imagen de referencia' : 'Fotografía de referencia' : custom ? 'Grupo muscular' : 'Esquema orientativo'}</span><span class="technique-badge">Ver técnica ${icon('arrow')}</span></button>
    <div class="exercise-card-body"><h2>${esc(exercise.name)}</h2><p class="exercise-attribute">${icon('target')}<span>${esc(muscles)}</span></p><p class="exercise-attribute">${icon('dumbbell')}<span>${esc(exercise.equipment)}</span></p><p class="exercise-attribute difficulty-${exercise.difficulty === 'Principiante' ? 'beginner' : exercise.difficulty === 'Sin especificar' ? 'unknown' : 'intermediate'}">${icon('chart')}<span>${esc(exercise.difficulty)}</span></p>
    ${mediaCredit(thumbnail, true)}${custom ? `<div class="custom-exercise-actions"><span>Personalizado</span><button class="icon-button" type="button" data-edit-exercise="${exercise.id}" aria-label="Editar ${esc(exercise.name)}">${icon('edit')}</button><button class="icon-button" type="button" data-delete-exercise="${exercise.id}" aria-label="Eliminar ${esc(exercise.name)}">${icon('trash')}</button></div>` : ''}</div></article>`;
}

export function noMatches() {
  return `<section class="card catalog-empty"><span class="empty-icon">${icon('search')}</span><h2>No hay ejercicios que coincidan</h2><p>Prueba con otro nombre o cambia la combinación de filtros.</p><button type="button" class="button button-secondary" data-clear-filters>Limpiar filtros</button></section>`;
}

function dialogHeading(title) {
  return `<div class="dialog-heading"><h2 id="exercise-dialog-title">${esc(title)}</h2><button class="icon-button" type="button" data-close-exercise-dialog aria-label="Cerrar ventana">${icon('close')}</button></div>`;
}

export function techniqueView(exercise) {
  const { video, animation } = exerciseMedia(exercise);
  return `${dialogHeading(exercise.name)}<div class="technique-layout">${techniqueMedia(exercise)}<div class="technique-copy">${video ? '' : `<p class="video-unavailable">${icon('info')}${animation ? animation.provenance === 'user-provided' ? 'La demostración es una secuencia de dos imágenes, no un vídeo continuo.' : 'La demostración es una secuencia de dos fotografías, no un vídeo continuo.' : 'No hay un vídeo autorizado disponible para este ejercicio.'}</p>`}
    <section class="exercise-anatomy"><h3>Músculos del ejercicio</h3><dl><div><dt>Grupo general</dt><dd>${esc(exercise.mainMuscle)}</dd></div><div><dt>Región principal</dt><dd>${esc(regionName(exercise.mainRegion))}</dd></div><div><dt>Regiones secundarias</dt><dd>${exercise.secondaryRegions?.length ? exercise.secondaryRegions.map((id) => esc(regionName(id))).join(', ') : 'Sin regiones secundarias especificadas'}</dd></div></dl>${exercise.anatomyNote ? `<p>${esc(exercise.anatomyNote)}</p>` : ''}<p>Los secundarios son informativos. Las estadísticas cuentan cada serie solo en su grupo principal.</p></section>
    ${exercise.origin === 'base' ? `<section><h3>${icon('layers')}Cómo realizar el movimiento</h3><ol class="technique-steps">${exercise.technique.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol></section><section class="technique-tips"><h3>${icon('check')}Recomendaciones técnicas</h3><ul>${exercise.technique.tips.map((tip) => `<li>${icon('check')}<span>${esc(tip)}</span></li>`).join('')}</ul></section>` : `<section><h3>Notas del ejercicio</h3><p class="exercise-notes">${exercise.notes ? esc(exercise.notes) : 'Este ejercicio aún no tiene notas técnicas. Puedes añadirlas al editarlo.'}</p></section>`}
    </div></div><div class="future-routine-action"><button class="button button-primary" type="button" data-add-exercise-to-routine>${icon('plus')}Añadir a rutina</button><p>Elige una rutina y sesión para guardar sus objetivos.</p></div>`;
}

export function editorView(exercise, mode) {
  return `${dialogHeading(exercise ? 'Editar ejercicio personalizado' : 'Crear ejercicio personalizado')}<p class="editor-scope">Se guardará solo en ${mode === 'demo' ? 'demostración' : 'modo personal'}.</p><form class="exercise-editor"><label>Nombre<input name="name" type="text" required minlength="2" maxlength="80" value="${esc(exercise?.name ?? '')}" autocomplete="off" /></label><label>Músculo principal<select name="mainMuscle" required><option value="">Seleccionar grupo</option>${options(MUSCLE_GROUPS, exercise?.mainMuscle)}</select></label><label>Equipamiento<input name="equipment" type="text" required minlength="2" maxlength="80" list="exercise-equipment-suggestions" value="${esc(exercise?.equipment ?? '')}" autocomplete="off" /></label><datalist id="exercise-equipment-suggestions">${options([...new Set(BASE_EXERCISES.map((item) => item.equipment))])}</datalist><label>Dificultad (opcional)<select name="difficulty">${options(DIFFICULTIES, exercise?.difficulty ?? 'Sin especificar')}</select></label><label>Notas <span>(opcional)</span><textarea name="notes" rows="5" maxlength="2000" placeholder="Describe la ejecución y las indicaciones que quieras recordar.">${esc(exercise?.notes ?? '')}</textarea></label><p class="availability-note">Asigna una dificultad para que el generador pueda filtrar este ejercicio por nivel. Con «Sin especificar» podrás añadirlo manualmente a tus rutinas.</p><p class="exercise-form-error" role="alert"></p><div class="dialog-actions"><button class="button button-secondary" type="button" data-close-exercise-dialog>Cancelar</button><button class="button button-primary" type="submit">Guardar ejercicio</button></div></form>`;
}

export function deleteView(exercise) {
  return `${dialogHeading('¿Eliminar ejercicio personalizado?')}<p>Se eliminará <strong>${esc(exercise.name)}</strong> del modo actual. Esta acción no afecta al otro modo ni a la biblioteca base.</p><p class="exercise-form-error" role="alert"></p><div class="dialog-actions"><button class="button button-secondary" type="button" data-close-exercise-dialog autofocus>Cancelar</button><button class="button button-danger" type="button" data-confirm-exercise-delete>Eliminar ejercicio</button></div>`;
}
