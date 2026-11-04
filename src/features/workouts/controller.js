import { profileService } from '../profile/profile-service.js';
import { toKg, weightText } from '../../utils/units.js';
import { StorageError } from '../../db/indexed-db.js';
import { workoutService } from './workout-service.js';
import { routineService } from '../routines/routine-service.js';
import { createRoutineDialog } from '../../components/routine-dialog.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { restRemaining, SetValidationError } from './model.js';
import { heading, chooser, pendingView, activeView, finishDialog, discardDialog, resultView, timeText } from './views.js';

export function mountWorkout(root, mode, params = new URLSearchParams()) {
  root.innerHTML = `${heading()}<div class="workout-feedback" role="status" aria-live="polite">Cargando entrenamiento…</div><div class="workout-error" role="alert"></div><div class="workout-content"></div>`;
  const dialog = createRoutineDialog(root);
  const service = workoutService(mode);
  const events = new AbortController();
  const { signal } = events;
  let alive = true;
  let workout = null;
  let unit = 'kg';
  let routines = [];
  let ready = false;
  let reviewingPending = true;
  let busy = false;
  let failed = false;
  let running = false;
  let mobileRegister = false;
  let returnFocus;
  let routineId = params.get('ambito') === mode ? params.get('rutina') : null;
  let sessionId = params.get('ambito') === mode ? params.get('sesion') : null;
  const commands = [];
  const content = root.querySelector('.workout-content');
  const feedback = (text) => { if (alive) root.querySelector('.workout-feedback').textContent = text; };
  const changed = () => window.dispatchEvent(new Event('workout-change'));

  function errorView(error) {
    if (!alive) return;
    const storage = error instanceof StorageError;
    root.querySelector('.workout-error').innerHTML = `<div class="card workout-error-card"><p>${esc(error.message)}</p>${storage || !ready ? `<button type="button" class="button button-secondary" data-workout-action="retry">${ready ? 'Reintentar guardado' : 'Reintentar carga'}</button>` : ''}<button type="button" class="button button-secondary" data-workout-action="reload">Recargar entrenamiento</button></div>`;
    dialog.querySelector('.routine-form-error')?.replaceChildren(document.createTextNode(error.message));
    feedback(storage ? 'No se ha confirmado el guardado. Conserva esta pestaña y reintenta.' : error.message);
  }

  function clearValidation() {
    root.querySelectorAll('.set-validation').forEach((message) => message.remove());
    root.querySelectorAll('[data-set-field][aria-invalid]').forEach((input) => { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); });
  }

  function setValidation(error, position) {
    if (!alive) return;
    clearValidation();
    const row = root.querySelector(`[data-set-position="${position}"]`);
    const input = row?.querySelector(`[data-set-field="${error.field}"]`);
    if (!input) return;
    const message = document.createElement('p');
    message.id = 'set-validation'; message.className = 'set-validation'; message.setAttribute('role', 'alert');
    message.textContent = error.field === 'weightKg' ? `Introduce un peso entre 0 y ${weightText(2000, unit, 4)}. Para peso corporal puedes registrar 0 ${unit}.` : error.message;
    row.append(message);
    input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', message.id);
    feedback('Revisa el campo indicado antes de completar la serie.');
    input.focus();
    row.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  function paint() {
    if (!alive || !ready) return;
    content.innerHTML = workout ? reviewingPending ? pendingView(workout) : activeView(workout, unit) : chooser(routines, routineId, sessionId);
    content.classList.toggle('show-workout-register', mobileRegister);
    tick();
  }

  async function load() {
    if (commands.length || running) return;
    ready = false;
    root.querySelector('.workout-error').innerHTML = '';
    feedback('Cargando entrenamiento…');
    try {
      const preferences = await profileService(mode).load();
      if (!alive) return;
      unit = preferences.weightUnit;
      if (params.get('registro') && params.get('ambito') === mode) {
        const result = await service.getResult(params.get('registro'));
        if (!alive) return;
        if (result) {
          const listed = await routineService(mode).list();
          if (!alive) return;
          const routine = listed.find((item) => item.id === result.workout.routineId);
          content.innerHTML = resultView(result, routine?.sessions.find((session) => session.id === routine.nextSessionId), mode, unit);
          feedback('Guardado en este navegador.');
          return;
        }
      }
      const active = await service.getActive();
      const listed = active ? [] : await routineService(mode).list();
      if (!alive) return;
      workout = active;
      routines = listed;
      failed = false;
      reviewingPending = true;
      ready = true;
      feedback('');
      paint();
    } catch (error) { errorView(error); }
  }

  // Accepted inputs are queued immediately, including the last keystroke before
  // navigation. The queue survives view teardown; commits never depend on blur.
  // On failure the command remains first, and dependent actions wait for retry.
  async function drain() {
    if (running || failed) return;
    running = true;
    while (commands.length) {
      const command = commands[0];
      try {
        const result = await service.update(workout, command);
        workout = result;
        commands.shift();
      } catch (error) { failed = true; errorView(error); break; }
    }
    running = false;
    if (!alive && !commands.length) window.removeEventListener('beforeunload', beforeUnload);
    if (!failed) feedback('Cambios guardados en este navegador.');
  }

  function enqueue(command) {
    commands.push(command);
    feedback('Guardando cambios…');
    void drain();
  }

  async function flush() {
    await drain();
    // A separate drain may already own the queue. Wait without blocking UI.
    while (running) await new Promise((resolve) => setTimeout(resolve, 15));
    return !failed && !commands.length;
  }

  async function perform(operation, success, onFailure = errorView) {
    if (busy) return;
    busy = true;
    dialog.dataset.busy = 'true';
    const controls = [...root.querySelectorAll('button, input, select')].map((control) => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    let failure;
    try {
      if (!await flush()) return;
      const result = await operation();
      changed();
      if (!alive) return;
      dialog.close();
      root.querySelector('.workout-error').innerHTML = '';
      success(result);
    } catch (error) { failure = error; }
    finally {
      busy = false;
      dialog.dataset.busy = 'false';
      controls.forEach(([control, disabled]) => { control.disabled = disabled; });
      if (!alive && !commands.length && !running) window.removeEventListener('beforeunload', beforeUnload);
    }
    if (failure) onFailure(failure);
  }

  function update(command) {
    return perform(() => service.update(workout, command), (saved) => {
      workout = saved;
      paint();
      feedback('Cambios guardados en este navegador.');
      if (command.type === 'navigate') focusRegister();
      else if (command.position !== undefined) root.querySelector(`[data-complete-set="${command.position}"]`)?.focus({ preventScroll: true });
      else if (command.type === 'rest') root.querySelector(`[data-workout-action="rest-${command.action === 'pause' ? 'resume' : command.action === 'resume' ? 'pause' : 'start'}"]`)?.focus({ preventScroll: true });
      else {
        const actions = matchMedia('(max-width: 700px)').matches && mobileRegister ? '.workout-register-actions' : '.workout-session-actions';
        root.querySelector(`${actions} [data-workout-action="${command.type === 'pause' ? 'resume' : 'pause'}"]`)?.focus({ preventScroll: true });
      }
    }, (error) => error instanceof SetValidationError && command.type === 'complete-set' ? setValidation(error, command.position) : errorView(error));
  }

  function show(html, trigger) {
    returnFocus = trigger;
    dialog.innerHTML = html;
    dialog.showModal();
    (dialog.querySelector('[autofocus]') ?? dialog.querySelector('button'))?.focus();
  }

  function focusRegister() {
    if (!alive) return;
    content.classList.add('show-workout-register');
    const panel = root.querySelector('#register-heading');
    panel?.focus({ preventScroll: true });
    if (matchMedia('(max-width: 700px)').matches) root.querySelector('.workout-register')?.scrollIntoView({ block: 'start' });
  }

  function tick() {
    if (!workout || !alive) return;
    const output = root.querySelector('.rest-time');
    const remaining = restRemaining(workout.timer);
    if (output) output.textContent = timeText(remaining);
    const bar = root.querySelector('[data-rest-progress]');
    if (bar) bar.style.width = `${workout.timer?.durationMs ? Math.min(100, remaining / workout.timer.durationMs * 100) : 0}%`;
    const caption = root.querySelector('.rest-caption');
    if (caption && workout.timer && remaining === 0) caption.textContent = 'Descanso terminado. Continúa cuando estés listo.';
  }

  root.addEventListener('input', (event) => {
    const input = event.target.closest('[data-set-field]');
    if (!input || busy || !workout) return;
    if (input.hasAttribute('aria-invalid')) clearValidation();
    enqueue({ type: 'values', exercise: workout.currentExercise, position: Number(input.closest('[data-set-position]').dataset.setPosition), field: input.dataset.setField, value: input.dataset.setField === 'weightKg' && unit === 'lb' && input.value !== '' ? String(toKg(Number(input.value), unit)) : input.value });
  }, { signal });

  root.addEventListener('change', (event) => {
    if (busy) return;
    if (event.target.matches('[data-workout-routine]')) { routineId = event.target.value; sessionId = null; paint(); }
    else if (event.target.matches('[data-workout-session]')) { sessionId = event.target.value; paint(); }
  }, { signal });

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button || busy || button.disabled) return;
    if (button.hasAttribute('data-close-routine-dialog')) { dialog.close(); return; }
    const action = button.dataset.workoutAction;
    if (action === 'retry') {
      failed = false;
      root.querySelector('.workout-error').innerHTML = '';
      if (commands.length) { await drain(); if (!failed) paint(); }
      else if (!ready) void load();
      return;
    }
    if (action === 'reload') {
      if (commands.length) {
        show('<div class="dialog-heading"><h2 id="routine-dialog-title">¿Recargar entrenamiento?</h2></div><p>Hay cambios que no se han podido guardar en esta pestaña. Puedes cancelar para copiarlos o reintentar. Recargar recuperará la última versión guardada y perderá solo esos cambios pendientes.</p><div class="dialog-actions"><button type="button" class="button button-secondary" data-close-routine-dialog autofocus>Cancelar</button><button type="button" class="button button-primary" data-workout-action="confirm-reload">Recargar versión guardada</button></div>', button);
        return;
      }
      void load(); return;
    }
    if (action === 'confirm-reload') {
      commands.length = 0;
      failed = false;
      dialog.close();
      void load();
      return;
    }
    if (!ready) return;
    if (action === 'start') {
      const selectedRoutine = root.querySelector('[data-workout-routine]').value;
      const selectedSession = root.querySelector('[data-workout-session]').value;
      void perform(() => service.start(selectedRoutine, selectedSession), (result) => {
        workout = result.workout;
        reviewingPending = result.recovered;
        mobileRegister = false;
        feedback(result.recovered ? 'Ya existe un entrenamiento pendiente. Puedes continuarlo.' : 'Entrenamiento iniciado y guardado.');
        paint();
      });
      return;
    }
    if (!workout) return;
    if (action === 'continue') {
      reviewingPending = false;
      mobileRegister = true;
      if (workout.status === 'paused') await update({ type: 'resume' });
      else paint();
      focusRegister();
    } else if (action === 'overview') { mobileRegister = false; paint(); root.querySelector('.workout-session')?.scrollIntoView({ block: 'start' }); }
    else if (action === 'finish' || action === 'discard') {
      if (!await flush() || !alive) return;
      show(action === 'finish' ? finishDialog(workout) : discardDialog(), button);
    } else if (action === 'save-complete' || action === 'save-partial') {
      void perform(() => service.finish(workout, action === 'save-complete' ? 'complete' : 'partial'), (saved) => {
        workout = null;
        location.hash = `/rutina-activa?registro=${saved.id}&ambito=${mode}`;
      });
    } else if (action === 'confirm-discard') {
      void perform(() => service.discard(workout), () => {
        workout = null;
        params.delete('registro');
        reviewingPending = true;
        void load();
        feedback('Entrenamiento descartado. El ciclo no ha avanzado.');
      });
    } else if (action === 'pause' || action === 'resume') void update({ type: action });
    else if (action?.startsWith('rest-')) void update({ type: 'rest', action: action.slice(5) });
    else if (button.hasAttribute('data-complete-set')) {
      const position = Number(button.dataset.completeSet);
      void update({ type: workout.entries[workout.currentExercise].sets[position].completed ? 'undo-set' : 'complete-set', exercise: workout.currentExercise, position });
    } else if (button.hasAttribute('data-workout-exercise') || action === 'previous' || action === 'next') {
      mobileRegister = true;
      void update({ type: 'navigate', index: button.hasAttribute('data-workout-exercise') ? Number(button.dataset.workoutExercise) : workout.currentExercise + (action === 'next' ? 1 : -1) });
    }
  }, { signal });

  dialog.addEventListener('close', () => { if (alive && returnFocus?.isConnected) returnFocus.focus(); }, { signal });
  const ticker = setInterval(tick, 250);
  const beforeUnload = (event) => { if (commands.length || running || busy) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  void load();
  return {
    async prepareLeave() {
      while (busy) await new Promise((resolve) => setTimeout(resolve, 15));
      if (await flush()) return true;
      feedback('Hay cambios sin guardar. Reintenta el guardado o recupera la versión guardada antes de salir.');
      return false;
    },
    destroy() { alive = false; events.abort(); clearInterval(ticker); if (!commands.length && !running && !busy) window.removeEventListener('beforeunload', beforeUnload); if (dialog.open) dialog.close(); },
  };
}
