import { createRoutineDialog, dialogHeading } from '../../components/routine-dialog.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { routineService } from './routine-service.js';
import { routineLink } from './views.js';

export function openRoutineAssignment(root, mode, exercise, returnFocus) {
  const dialog = createRoutineDialog(root);
  const service = routineService(mode);
  const token = crypto.randomUUID();
  let alive = true;
  let busy = false;
  let routines = [];
  const errorMarkup = '<p class="routine-form-error" role="alert"></p>';

  function refreshSessions() {
    const form = dialog.querySelector('form');
    const routine = routines.find((item) => item.id === form.elements.routineId.value);
    form.elements.sessionId.innerHTML = `${routine?.sessions.map((session) => `<option value="${session.id}">${esc(session.name)}</option>`).join('') ?? ''}<option value="">Crear nueva sesión</option>`;
    form.querySelector('[data-new-routine]').hidden = !!routine;
    form.elements.routineName.required = !routine;
    refreshSessionName();
  }

  function refreshSessionName() {
    const form = dialog.querySelector('form');
    const adding = !form.elements.sessionId.value;
    form.querySelector('[data-new-session]').hidden = !adding;
    form.elements.sessionName.required = adding;
  }

  async function load() {
    dialog.innerHTML = `${dialogHeading('Añadir a rutina')}<p role="status">Cargando tus rutinas…</p>`;
    try {
      routines = await service.list();
      if (!alive) return;
      dialog.innerHTML = `${dialogHeading('Añadir a rutina')}<p><strong>${esc(exercise.name)}</strong></p><p class="availability-note">Se añadirá solo en ${mode === 'demo' ? 'demostración' : 'modo personal'}.</p><form data-assignment-form><label>Rutina<select name="routineId">${routines.map((routine) => `<option value="${routine.id}">${esc(routine.name)}</option>`).join('')}<option value="">Crear nueva rutina</option></select></label><label data-new-routine>Nombre de la nueva rutina<input type="text" name="routineName" value="Mi rutina" minlength="2" maxlength="80" /></label><label>Sesión<select name="sessionId"></select></label><label data-new-session>Nombre de la nueva sesión<input type="text" name="sessionName" value="Sesión 1" minlength="2" maxlength="80" /></label><p class="availability-note">Objetivos iniciales: 3 series, 8–12 repeticiones y 90 s de descanso. Podrás editarlos en Mis rutinas.</p>${errorMarkup}<div class="dialog-actions"><button type="button" class="button button-secondary" data-close-routine-dialog>Cancelar</button><button type="submit" class="button button-primary">Añadir ejercicio</button></div></form>`;
      refreshSessions();
    } catch (error) {
      if (alive) dialog.innerHTML = `${dialogHeading('Añadir a rutina')}<p role="alert">${esc(error.message)}</p><button type="button" class="button button-secondary" data-retry-assignment>Reintentar carga</button>`;
    }
  }

  dialog.addEventListener('change', (event) => {
    if (event.target.name === 'routineId') refreshSessions();
    else if (event.target.name === 'sessionId') refreshSessionName();
  });
  dialog.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || busy) return;
    if (button.hasAttribute('data-close-routine-dialog')) dialog.close();
    else if (button.hasAttribute('data-retry-assignment')) void load();
  });
  dialog.addEventListener('submit', async (event) => {
    if (!event.target.hasAttribute('data-assignment-form')) return;
    event.preventDefault();
    if (busy) return;
    const target = Object.fromEntries(new FormData(event.target));
    target.revision = routines.find((routine) => routine.id === target.routineId)?.revision;
    const controls = [...dialog.querySelectorAll('button, input, select')];
    busy = true;
    dialog.dataset.busy = 'true';
    controls.forEach((control) => { control.disabled = true; });
    try {
      const routine = await service.addFromCatalog(exercise.id, target, token);
      if (!alive) return;
      const session = routine.sessions.find((item) => item.id === target.sessionId) ?? routine.sessions.at(-1);
      dialog.innerHTML = `${dialogHeading('Ejercicio añadido')}<p role="status">${esc(exercise.name)} se guardó en ${esc(routine.name)} / ${esc(session.name)}.</p><div class="dialog-actions"><button type="button" class="button button-secondary" data-close-routine-dialog>Volver al catálogo</button><a class="button button-primary" href="${routineLink(routine.id, session.id, mode)}">Ver rutina y objetivos</a></div>`;
    } catch (error) {
      if (alive) { dialog.querySelector('.routine-form-error').textContent = error.message; controls.forEach((control) => { control.disabled = false; }); }
    } finally { if (alive) { busy = false; dialog.dataset.busy = 'false'; } }
  });
  dialog.addEventListener('close', () => {
    alive = false;
    dialog.remove();
    returnFocus?.();
  });
  void load();
  dialog.showModal();
  return { destroy() { alive = false; if (dialog.open) dialog.close(); dialog.remove(); } };
}
