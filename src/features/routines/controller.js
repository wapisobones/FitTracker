import { BASE_EXERCISES } from '../../data/exercises.js';
import { ROUTINE_TEMPLATES } from '../../data/routine-templates.js';
import { exerciseService } from '../exercises/exercise-service.js';
import { createRoutineDialog } from '../../components/routine-dialog.js';
import { mountExerciseTechnique } from '../../components/exercise-technique-dialog.js';
import { escapeHTML } from '../../utils/html.js';
import { routineService } from './routine-service.js';
import { newRoutine, newSession, prescription, validateRoutine } from './model.js';
import { routinesFrame, listCard, detailView, noRoutines, routineLink } from './views.js';
import { routineForm, sessionForm, prescriptionForm, confirmation, exercisePicker, pickerEntries } from './forms.js';

export function mountRoutines(root, mode, { templates = false, params = new URLSearchParams(), proposal = null } = {}) {
  root.innerHTML = proposal ? '<p class="routine-feedback" role="status" aria-live="polite"></p><div class="routine-error"></div><div class="routine-list" hidden></div><section class="routine-detail" aria-label="Propuesta editable"></section>' : routinesFrame(templates);
  const dialog = createRoutineDialog(root);
  const technique = mountExerciseTechnique(root);
  const service = proposal ? { async save(input) {
    const valid = validateRoutine(input);
    const ids = new Set(proposal.exercises.map((exercise) => exercise.id));
    if (valid.sessions.some((session) => session.prescriptions.some((item) => !ids.has(item.exerciseId)))) throw new Error('Hay un ejercicio que ya no es compatible o no está disponible. Retíralo de la propuesta antes de continuar.');
    proposal.onChange(structuredClone(valid));
    return valid;
  } } : routineService(mode);
  const events = new AbortController();
  const { signal } = events;
  let routines = proposal ? [proposal.routine] : templates ? ROUTINE_TEMPLATES : [];
  let exercises = proposal ? proposal.exercises : BASE_EXERCISES;
  let routineId = params.get('ambito') === mode ? params.get('rutina') : null;
  let sessionId = params.get('ambito') === mode ? params.get('sesion') : null;
  let level = 'Todos';
  let ready = Boolean(proposal) || templates;
  let alive = true;
  let busy = false;
  let context;
  let pending;
  let trigger;
  const copies = new Map();
  const tokens = new Map();
  const selected = () => routines.find((routine) => routine.id === routineId);
  const selectedSession = () => selected()?.sessions.find((session) => session.id === sessionId);
  const message = (text) => { root.querySelector('.routine-feedback').textContent = text; };

  function paintPicker(query = '') {
    const added = new Set(selectedSession()?.prescriptions.map((item) => item.exerciseId));
    const available = proposal ? exercises : exercises.filter((exercise) => !added.has(exercise.id));
    const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    dialog.querySelector('.routine-exercise-picker').innerHTML = pickerEntries(
      available.filter((exercise) => normalize(exercise.name).includes(normalize(query))),
      proposal ? undefined : available.length ? 'No hay ejercicios disponibles con ese nombre. Los que ya están en esta sesión no se muestran.' : 'Todos los ejercicios del catálogo ya están en esta sesión.',
    );
    technique.refresh();
  }

  function paint() {
    if (!ready && routines.length === 0) {
      root.querySelector('.routine-list').innerHTML = '';
      root.querySelector('.routine-detail').innerHTML = '<p class="availability-note">Esperando la carga de las rutinas.</p>';
      const create = root.querySelector('[data-routine-action="create"]');
      if (create) create.disabled = true;
      return;
    }
    const visible = routines.filter((routine) => level === 'Todos' || routine.level === level);
    if (!visible.some((routine) => routine.id === routineId)) routineId = visible[0]?.id;
    const routine = selected();
    if (!routine?.sessions.some((session) => session.id === sessionId)) sessionId = routine?.nextSessionId ?? routine?.sessions[0]?.id;
    root.querySelector('.routine-list').innerHTML = visible.map((item) => listCard(item, item.id === routineId)).join('');
    root.querySelector('.routine-detail').innerHTML = routine ? detailView(routine, sessionId, new Map(exercises.map((exercise) => [exercise.id, exercise])), { templates, copied: copies.get(routine.id), mode, draft: Boolean(proposal), sessionMinutes: proposal?.estimateSession }) : ready ? noRoutines() : '<p class="availability-note">Esperando la carga de las rutinas.</p>';
    root.querySelectorAll('[data-template-level]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.templateLevel === level)));
    technique?.refresh();
    const create = root.querySelector('[data-routine-action="create"]');
    if (create) create.disabled = !ready;
    if (routine && ready && !proposal) history.replaceState(null, '', routineLink(routine.id, sessionId, mode).replace('#/mis-rutinas', templates ? '#/predisenadas' : '#/mis-rutinas'));
  }

  function errorView(error) {
    root.querySelector('.routine-error').innerHTML = `<section class="card storage-error" role="alert"><h2>No se pudo completar la operación</h2><p>${escapeHTML(error.message)}</p><button type="button" class="button button-secondary" data-routine-action="reload">Recargar lista</button></section>`;
    if (dialog.open) dialog.querySelector('.routine-form-error')?.replaceChildren(document.createTextNode(error.message));
  }

  async function load() {
    ready = false;
    message('Cargando rutinas…');
    root.querySelector('.routine-error').innerHTML = '';
    paint();
    try {
      const loaded = await Promise.all([service.list(), exerciseService(mode).list()]);
      if (!alive) return;
      [routines, exercises] = loaded;
      ready = true;
      message('');
    } catch (error) { if (alive) { errorView(error); message(''); } }
    if (alive) paint();
  }

  async function perform(operation, success) {
    if (busy) return;
    busy = true;
    dialog.dataset.busy = 'true';
    const controls = [...root.querySelectorAll('button, input, select, textarea')].map((control) => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    const unlock = () => { busy = false; dialog.dataset.busy = 'false'; controls.forEach(([control, disabled]) => { control.disabled = disabled; }); };
    root.querySelector('.routine-error').innerHTML = '';
    try {
      const result = await operation();
      if (!alive) return;
      unlock();
      success(result);
      paint();
      if (dialog.open) dialog.close();
    } catch (error) { if (alive) { unlock(); errorView(error); } }
  }

  function accept(saved) {
    routines = routines.some((routine) => routine.id === saved.id) ? routines.map((routine) => routine.id === saved.id ? saved : routine) : [...routines, saved];
    routineId = saved.id;
    message(proposal ? 'Propuesta actualizada. Aún no se ha guardado en Mis rutinas.' : 'Cambios guardados en el modo actual.');
  }

  function show(html, button, newContext = {}) {
    trigger = button ?? trigger;
    context = newContext;
    dialog.innerHTML = html;
    technique.refresh();
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[autofocus], input, select, textarea')?.focus();
  }

  function confirm(title, text, operation, success, button) {
    pending = () => perform(operation, success);
    show(confirmation(title, text), button);
  }

  function move(items, index, delta) {
    if (index + delta >= 0 && index + delta < items.length) [items[index], items[index + delta]] = [items[index + delta], items[index]];
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || busy) return;
    if (button.hasAttribute('data-toggle-options')) {
      const group = button.closest('.mobile-options');
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      group.dataset.expanded = String(expanded);
      return;
    }
    if (button.hasAttribute('data-close-routine-dialog')) { dialog.close(); return; }
    if (button.hasAttribute('data-confirm-routine-action')) { void pending?.(); return; }
    if (button.dataset.routineAction === 'reload') { if (proposal) { root.querySelector('.routine-error').innerHTML = ''; paint(); } else void load(); return; }
    if (!ready) return;
    if (button.dataset.technique && technique) {
      const exercise = exercises.find((item) => item.id === button.dataset.technique);
      if (exercise) technique.open(exercise, button);
      event.stopPropagation();
      return;
    }
    if (button.dataset.selectRoutine) {
      routineId = button.dataset.selectRoutine; sessionId = null; paint();
      const heading = root.querySelector('.routine-detail h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      if (matchMedia('(max-width: 1200px)').matches) root.querySelector('.routine-detail').scrollIntoView({ block: 'start' });
      return;
    }
    if (button.dataset.selectSession) { sessionId = button.dataset.selectSession; paint(); return; }
    if (button.dataset.templateLevel) { level = button.dataset.templateLevel; paint(); return; }
    const routine = selected();
    const session = selectedSession();
    const action = button.dataset.routineAction;
    if (action === 'create') show(routineForm(), button);
    else if (action === 'edit') show(routineForm(routine), button, { editing: routine });
    else if (action === 'delete') confirm('¿Eliminar rutina?', `Se eliminarán «${routine.name}» y sus sesiones planificadas. El historial de entrenamientos se conservará.`, () => service.remove(routine), () => {
      routines = routines.filter((item) => item.id !== routine.id);
      for (const [sourceId, copy] of copies) if (sourceId === routine.id || copy.id === routine.id) { copies.delete(sourceId); tokens.delete(sourceId); }
      message('Rutina eliminada.');
    }, button);
    else if (action === 'duplicate' || action === 'copy-template') {
      if (copies.has(routine.id)) return;
      if (!tokens.has(routine.id)) tokens.set(routine.id, crypto.randomUUID());
      void perform(() => templates ? service.copyTemplate(routine.id, tokens.get(routine.id)) : service.duplicate(routine, tokens.get(routine.id)), (copy) => {
        copies.set(routine.id, copy);
        if (!templates && !routines.some((item) => item.id === copy.id)) routines = [...routines, copy];
        message('Copia independiente guardada. Puedes abrirla en Mis rutinas.');
      });
    } else if (button.dataset.sessionAction) {
      const kind = button.dataset.sessionAction;
      if (kind === 'add' || kind === 'edit') show(sessionForm(kind === 'edit' ? session : null, routine.sessions.length + 1), button, { editingSession: kind === 'edit' ? session : null });
      else if (kind === 'add-exercise') { show(exercisePicker(!proposal), button); paintPicker(); }
      else {
        const draft = structuredClone(routine);
        const index = draft.sessions.findIndex((item) => item.id === session.id);
        if (kind === 'delete') confirm('¿Eliminar sesión?', `Se eliminará «${session.name}» y sus objetivos planificados de esta rutina.`, () => service.save({ ...draft, sessions: draft.sessions.filter((item) => item.id !== session.id) }), accept, button);
        else {
          if (kind === 'duplicate') {
            const copy = { ...structuredClone(session), id: crypto.randomUUID(), name: `${session.name} (copia)`.slice(0, 80), createdAt: undefined, updatedAt: undefined, prescriptions: session.prescriptions.map((item) => ({ ...item, id: crypto.randomUUID() })) };
            draft.sessions.splice(index + 1, 0, copy);
            void perform(() => service.save(draft), (saved) => { sessionId = copy.id; accept(saved); });
          } else { move(draft.sessions, index, kind === 'up' ? -1 : 1); void perform(() => service.save(draft), accept); }
        }
      }
    } else if (button.dataset.pickExercise) {
      const exercise = exercises.find((item) => item.id === button.dataset.pickExercise);
      if (!exercise) return;
      if (!proposal && session.prescriptions.some((item) => item.exerciseId === exercise.id)) {
        dialog.querySelector('.routine-form-error').textContent = 'Este ejercicio ya pertenece a esta sesión. Elige otro ejercicio.';
        paintPicker(dialog.querySelector('[data-picker-search]').value);
        return;
      }
      const item = prescription(exercise.id);
      show(prescriptionForm(item, exercise), null, { item, adding: true });
    } else if (button.dataset.itemAction) {
      const item = session.prescriptions.find((entry) => entry.id === button.dataset.itemId);
      if (button.dataset.itemAction === 'edit') show(prescriptionForm(item, exercises.find((exercise) => exercise.id === item.exerciseId)), button, { item });
      else {
        const draft = structuredClone(routine);
        const items = draft.sessions.find((entry) => entry.id === session.id).prescriptions;
        const index = items.findIndex((entry) => entry.id === item.id);
        if (button.dataset.itemAction === 'remove') { items.splice(index, 1); confirm('¿Quitar ejercicio de la sesión?', 'Se quitará la prescripción de esta sesión. El ejercicio seguirá en el catálogo y el historial no cambiará.', () => service.save(draft), accept, button); }
        else { move(items, index, button.dataset.itemAction === 'up' ? -1 : 1); void perform(() => service.save(draft), accept); }
      }
    }
  }, { signal });

  root.addEventListener('submit', (event) => {
    const kind = event.target.dataset.routineForm;
    if (!kind) return;
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.target));
    let draft;
    let addition;
    let desiredSession = sessionId;
    if (kind === 'routine') draft = context.editing ? { ...structuredClone(context.editing), name: fields.name, description: fields.description } : newRoutine(fields.name, fields.description, fields.sessionName);
    else {
      draft = structuredClone(selected());
      if (kind === 'session') {
        if (context.editingSession) draft.sessions.find((session) => session.id === context.editingSession.id).name = fields.name;
        else { const added = newSession(draft.id, fields.name); draft.sessions.push(added); desiredSession = added.id; }
      } else {
        const session = draft.sessions.find((entry) => entry.id === sessionId);
        const updated = { ...context.item, ...fields };
        if (context.adding) {
          if (proposal) session.prescriptions.push(updated);
          else addition = updated;
        }
        else session.prescriptions = session.prescriptions.map((entry) => entry.id === updated.id ? updated : entry);
      }
    }
    void perform(() => addition ? service.addExercise(selected(), sessionId, addition) : service.save(draft), (saved) => { sessionId = desiredSession; accept(saved); });
  }, { signal });
  root.addEventListener('input', (event) => {
    if (event.target.hasAttribute('data-picker-search')) {
      paintPicker(event.target.value);
    }
  }, { signal });
  dialog.addEventListener('close', () => {
    if (!alive || dialog.open) return;
    dialog.replaceChildren();
    if (trigger?.isConnected) trigger.focus();
    else { const heading = root.querySelector('.routine-detail h2'); if (heading) { heading.tabIndex = -1; heading.focus(); } }
  }, { signal });
  paint();
  if (proposal) message('Propuesta sin guardar. Puedes editarla antes de añadirla a Mis rutinas.');
  else if (templates) message('3 plantillas disponibles · Guarda una copia para personalizarla.');
  else void load();
  return { destroy() { alive = false; events.abort(); technique?.destroy(); if (dialog.open) dialog.close(); } };
}
