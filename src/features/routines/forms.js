import { dialogHeading } from '../../components/routine-dialog.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { icon } from '../../components/icons.js';
import { routineExercisePreview } from './views.js';
import { isDurationTarget, hasInheritedReps } from '../../data/prescription-targets.js';
import { recordingMode, MAX_DURATION_SECONDS } from '../../data/recording-modes.js';

const actions = (label) => `<p class="routine-form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button button-secondary" data-close-routine-dialog>Cancelar</button><button type="submit" class="button button-primary">${label}</button></div>`;

export function routineForm(routine) {
  return `${dialogHeading(routine ? 'Editar rutina' : 'Crear rutina')}<form data-routine-form="routine"><label>Nombre de rutina<input name="name" type="text" required minlength="2" maxlength="80" value="${esc(routine?.name ?? '')}" /></label><label>Descripción<textarea name="description" rows="4" maxlength="1000">${esc(routine?.description ?? '')}</textarea></label>${routine ? '' : '<label>Primera sesión<input name="sessionName" type="text" required minlength="2" maxlength="80" value="Sesión 1" /></label>'}${actions('Guardar rutina')}</form>`;
}

export function sessionForm(session, number) {
  return `${dialogHeading(session ? 'Editar sesión' : 'Añadir sesión')}<form data-routine-form="session"><label>Nombre de sesión<input name="name" type="text" required minlength="2" maxlength="80" value="${esc(session?.name ?? `Sesión ${number}`)}" /></label><p class="availability-note">Una sesión ocupa una posición en la secuencia, sin asignación obligatoria a un día.</p>${actions('Guardar sesión')}</form>`;
}

export function prescriptionForm(item, exercise) {
  const duration = isDurationTarget(item);
  const inherited = hasInheritedReps(item, exercise);
  const mismatch = duration && exercise && recordingMode(exercise) !== 'duration';
  const range = duration ? [['durationMinSeconds', 'Duración mínima (segundos)'], ['durationMaxSeconds', 'Duración máxima (segundos)']] : [['repsMin', 'Repeticiones mínimas'], ['repsMax', 'Repeticiones máximas']];
  return `${dialogHeading('Configurar ejercicio')}<div class="routine-form-context">${exercise ? routineExercisePreview(exercise, '') : 'Ejercicio no disponible'}</div><form data-routine-form="prescription">${inherited ? '<p class="availability-note">Objetivos heredados de repeticiones. No son segundos. Puedes conservarlos o sustituirlos por un nuevo rango de 30–45 s, editable antes de guardar. Los números anteriores no se convierten.</p><button type="button" class="button button-secondary" data-convert-target="duration">Confirmar cambio a segundos</button>' : mismatch ? '<p class="availability-note">El ejercicio ahora registra repeticiones. El objetivo de tiempo se conserva hasta que decidas cambiarlo.</p><button type="button" class="button button-secondary" data-convert-target="reps">Confirmar cambio a repeticiones</button>' : ''}<div class="prescription-form-grid"><label>Series<input name="sets" type="number" min="1" max="20" step="1" required value="${esc(item.sets)}" /></label><label>Descanso (segundos)<input name="restSeconds" type="number" min="0" max="900" step="1" required value="${esc(item.restSeconds)}" /></label>${range.map(([key, label]) => `<label>${label}<input name="${key}" type="number" inputmode="numeric" min="1" max="${duration ? MAX_DURATION_SECONDS : 100}" step="1" required value="${esc(item[key])}" /></label>`).join('')}</div><p class="availability-note">${duration ? 'Objetivo por serie. Punto de partida orientativo y editable, sin carácter médico. Para una duración fija, usa el mismo mínimo y máximo.' : 'Para repeticiones fijas, usa el mismo valor mínimo y máximo.'}</p><label>Notas del ejercicio<textarea name="notes" rows="4" maxlength="1000">${esc(item.notes)}</textarea></label>${actions('Guardar objetivos')}</form>`;
}

export function confirmation(title, message) {
  return `${dialogHeading(title)}<p>${esc(message)}</p><p class="routine-form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button button-secondary" data-close-routine-dialog autofocus>Cancelar</button><button type="button" class="button button-danger" data-confirm-routine-action>Confirmar eliminación</button></div>`;
}

export function exercisePicker(onlyAvailable = false) {
  return `${dialogHeading('Añadir ejercicio a la sesión')}<label class="picker-search-label">Buscar ejercicio<input type="search" data-picker-search placeholder="Nombre del ejercicio…" maxlength="80" /></label>${onlyAvailable ? '<p class="availability-note">Solo se muestran ejercicios que aún no están en esta sesión.</p><p class="routine-form-error" role="alert"></p>' : ''}<div class="routine-exercise-picker"></div>`;
}

export function pickerEntries(exercises, emptyMessage = 'No hay ejercicios que coincidan con ese nombre.') {
  return exercises.length ? exercises.map((exercise) => `<div class="picker-exercise">${routineExercisePreview(exercise, `${exercise.mainMuscle} · ${exercise.equipment}${exercise.origin === 'custom' ? ' · Personalizado' : ''}`)}<button type="button" class="icon-button" data-pick-exercise="${exercise.id}" aria-label="Añadir ${esc(exercise.name)}">${icon('plus')}</button></div>`).join('') : `<p>${esc(emptyMessage)}</p>`;
}
