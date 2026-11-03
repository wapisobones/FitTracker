import { dialogHeading } from '../../components/routine-dialog.js';
import { escapeHTML as esc } from '../../utils/html.js';

const actions = (label) => `<p class="routine-form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button button-secondary" data-close-routine-dialog>Cancelar</button><button type="submit" class="button button-primary">${label}</button></div>`;

export function routineForm(routine) {
  return `${dialogHeading(routine ? 'Editar rutina' : 'Crear rutina')}<form data-routine-form="routine"><label>Nombre de rutina<input name="name" type="text" required minlength="2" maxlength="80" value="${esc(routine?.name ?? '')}" /></label><label>Descripción<textarea name="description" rows="4" maxlength="1000">${esc(routine?.description ?? '')}</textarea></label>${routine ? '' : '<label>Primera sesión<input name="sessionName" type="text" required minlength="2" maxlength="80" value="Sesión 1" /></label>'}${actions('Guardar rutina')}</form>`;
}

export function sessionForm(session, number) {
  return `${dialogHeading(session ? 'Editar sesión' : 'Añadir sesión')}<form data-routine-form="session"><label>Nombre de sesión<input name="name" type="text" required minlength="2" maxlength="80" value="${esc(session?.name ?? `Sesión ${number}`)}" /></label><p class="availability-note">Una sesión ocupa una posición en la secuencia, sin asignación obligatoria a un día.</p>${actions('Guardar sesión')}</form>`;
}

export function prescriptionForm(item, exerciseName) {
  return `${dialogHeading('Configurar ejercicio')}<p class="routine-form-context">${esc(exerciseName)}</p><form data-routine-form="prescription"><div class="prescription-form-grid"><label>Series<input name="sets" type="number" min="1" max="20" step="1" required value="${item.sets}" /></label><label>Descanso (segundos)<input name="restSeconds" type="number" min="0" max="900" step="1" required value="${item.restSeconds}" /></label><label>Repeticiones mínimas<input name="repsMin" type="number" min="1" max="100" step="1" required value="${item.repsMin}" /></label><label>Repeticiones máximas<input name="repsMax" type="number" min="1" max="100" step="1" required value="${item.repsMax}" /></label></div><p class="availability-note">Para repeticiones fijas, usa el mismo valor mínimo y máximo.</p><label>Notas del ejercicio<textarea name="notes" rows="4" maxlength="1000">${esc(item.notes)}</textarea></label>${actions('Guardar objetivos')}</form>`;
}

export function confirmation(title, message) {
  return `${dialogHeading(title)}<p>${esc(message)}</p><p class="routine-form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button button-secondary" data-close-routine-dialog autofocus>Cancelar</button><button type="button" class="button button-danger" data-confirm-routine-action>Confirmar eliminación</button></div>`;
}

export function exercisePicker() {
  return `${dialogHeading('Añadir ejercicio a la sesión')}<label class="picker-search-label">Buscar ejercicio<input type="search" data-picker-search placeholder="Nombre del ejercicio…" maxlength="80" /></label><div class="routine-exercise-picker"></div>`;
}

export function pickerEntries(exercises) {
  return exercises.length ? exercises.map((exercise) => `<button type="button" class="picker-exercise" data-pick-exercise="${exercise.id}"><span><strong>${esc(exercise.name)}</strong><small>${esc(exercise.mainMuscle)} · ${esc(exercise.equipment)}${exercise.origin === 'custom' ? ' · Personalizado' : ''}</small></span><span aria-hidden="true">＋</span></button>`).join('') : '<p>No hay ejercicios que coincidan con ese nombre.</p>';
}
