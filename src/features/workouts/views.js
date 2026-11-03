import { icon } from '../../components/icons.js';
import { exerciseVisual } from '../../components/exercise-visual.js';
import { dialogHeading } from '../../components/routine-dialog.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { progress, restRemaining } from './model.js';

const target = (item) => item.repsMin === item.repsMax ? item.repsMin : `${item.repsMin}–${item.repsMax}`;
const action = (id, text, primary = false, disabled = false) => `<button type="button" class="button ${primary ? 'button-primary' : 'button-secondary'}" data-workout-action="${id}"${disabled ? ' disabled' : ''}>${text}</button>`;
export const heading = () => `<section class="page-heading"><div><h1>${icon('calendar')}Rutina activa</h1><p>Entrena a tu ritmo. Registra cada serie realizada.</p></div></section>`;

export function chooser(routines, routineId, sessionId) {
  const routine = routines.find((item) => item.id === routineId) ?? routines[0];
  if (!routine) return '<section class="card empty-state"><span class="empty-icon">' + icon('dumbbell') + '</span><h2>Prepara tu primer entrenamiento</h2><p>Crea una rutina o guarda una plantilla para empezar a registrar tus series.</p><a class="button button-primary" href="#/mis-rutinas">Ir a Mis rutinas</a><a class="text-link" href="#/predisenadas">Explorar plantillas</a></section>';
  const session = routine.sessions.find((item) => item.id === sessionId) ?? routine.sessions.find((item) => item.id === routine.nextSessionId) ?? routine.sessions[0];
  return `<section class="card workout-chooser"><h2>Elige tu sesión</h2><p>La siguiente sesión del ciclo es una sugerencia. Puedes elegir cualquier otra.</p><label>Rutina<select data-workout-routine>${routines.map((item) => `<option value="${item.id}"${item.id === routine.id ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label><label>Sesión<select data-workout-session>${routine.sessions.map((item) => `<option value="${item.id}"${item.id === session?.id ? ' selected' : ''}>${esc(item.name)}${item.id === routine.nextSessionId ? ' · Sugerida' : ''}</option>`).join('')}</select></label><p>${session ? `${session.prescriptions.length} ejercicios · ${session.prescriptions.reduce((sum, item) => sum + item.sets, 0)} series planificadas` : 'Esta rutina aún no tiene sesiones.'}</p>${action('start', 'Iniciar entrenamiento', true, !session?.prescriptions.length)}<a class="text-link" href="#/mis-rutinas">Revisar objetivos en Mis rutinas</a></section>`;
}

export function pendingView(workout) {
  const count = progress(workout);
  return `<section class="card empty-state workout-pending"><span class="empty-icon">${icon('calendar')}</span><h2>Tienes una sesión pendiente</h2><p><strong>${esc(workout.sessionName)}</strong><br>${esc(workout.routineName)}<br>${count.completed} de ${count.total} series completadas. Tus registros están guardados.</p>${action('continue', 'Continuar entrenamiento', true)}${action('discard', 'Descartar entrenamiento')}</section>`;
}

export function timerView(workout) {
  const timer = workout.timer;
  const running = timer?.status === 'running';
  return `<section class="workout-rest card" aria-label="Temporizador de descanso"><div class="workout-rest-heading"><h3>${icon('clock')}Descanso</h3><small>${workout.entries[workout.currentExercise].prescription.restSeconds} s previstos</small></div><div class="workout-rest-controls"><output class="rest-time" aria-label="Tiempo de descanso restante">${timeText(restRemaining(timer))}</output><div>${action('rest-start', timer ? 'Reiniciar' : 'Iniciar descanso', false, workout.status === 'paused')}${timer ? `${action(running ? 'rest-pause' : 'rest-resume', running ? 'Pausar descanso' : 'Reanudar descanso', false, workout.status === 'paused')}${action('rest-skip', 'Omitir descanso', false, workout.status === 'paused')}` : ''}</div></div><div class="progress-track"><span data-rest-progress></span></div><p class="rest-caption">${timer ? running ? 'Puedes seguir registrando mientras corre el descanso.' : 'Descanso en pausa.' : 'Completar una serie inicia el descanso. Tú eliges cuándo continuar.'}</p></section>`;
}

export function timeText(ms) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function activeView(workout) {
  const { entries, currentExercise: index } = workout;
  const entry = entries[index];
  const { exercise, prescription } = entry;
  const count = progress(workout);
  const paused = workout.status === 'paused';
  const allDone = entry.sets.every((set) => set.completed);
  const progression = allDone && entry.sets.every((set) => set.reps >= prescription.repsMax && set.weightKg > 0 && set.weightKg === entry.sets[0].weightKg);
  return `<div class="workout-layout"><section class="workout-overview"><header class="card workout-session"><span class="routine-cover">${icon('dumbbell')}</span><div><h2>${esc(workout.routineName)}</h2><p>${esc(workout.sessionName)}</p><small>${entries.length} ejercicios · ${count.total} series planificadas</small></div><span class="stage-pill">${paused ? 'En pausa' : 'En curso'}</span></header>
    <section class="card workout-progress"><div><h3>Progreso del entrenamiento</h3><strong>${count.percent}%</strong></div><progress value="${count.completed}" max="${count.total}" aria-label="Series completadas"></progress><p>${count.completed} de ${count.total} series · ${entries.filter((item) => item.sets.every((set) => set.completed)).length} de ${entries.length} ejercicios completos</p></section>
    <ol class="workout-exercises" aria-label="Ejercicios de la sesión">${entries.map((item, position) => {
      const done = item.sets.filter((set) => set.completed).length;
      return `<li><button type="button" class="card workout-exercise${position === index ? ' selected' : ''}" data-workout-exercise="${position}" aria-pressed="${position === index}"><span class="workout-number">${done === item.sets.length ? icon('check') : position + 1}</span><span class="workout-thumb">${exerciseVisual(item.exercise)}</span><span class="workout-exercise-name"><strong>${esc(item.exercise.name)}</strong><small>${esc(item.exercise.mainMuscle)}</small><small>${item.sets.length} series · ${target(item.prescription)} reps</small></span><span class="workout-exercise-state">${done === item.sets.length ? 'Completado' : position === index ? 'En foco' : done ? `${done}/${item.sets.length}` : 'Pendiente'}</span></button></li>`;
    }).join('')}</ol><div class="workout-session-actions">${action('finish', 'Finalizar entrenamiento')}${action(paused ? 'resume' : 'pause', paused ? 'Reanudar sesión' : 'Pausar sesión')}${action('discard', 'Descartar', false)}</div></section>
    <section class="card workout-register" aria-labelledby="register-heading"><div class="workout-register-heading">${action('overview', 'Ver rutina')}<span>Ejercicio ${index + 1} de ${entries.length}</span></div><h2 id="register-heading" tabindex="-1">${esc(exercise.name)}</h2><p class="workout-muscle">${esc(exercise.mainMuscle)}</p><div class="workout-visual">${exerciseVisual(exercise)}<span>Ilustración de referencia</span></div>
    <dl class="workout-targets"><div><dt>Series</dt><dd>${prescription.sets}</dd></div><div><dt>Reps objetivo</dt><dd>${target(prescription)}</dd></div><div><dt>Descanso</dt><dd>${prescription.restSeconds} s</dd></div></dl>${prescription.notes ? `<p class="workout-notes">${esc(prescription.notes)}</p>` : ''}
    <p class="workout-reference-note">${entry.sets.some((set) => set.reference) ? 'Los valores del último entrenamiento son referencias editables. Confirma solo las series que realices.' : 'Primer registro de este ejercicio. Introduce tu peso y repeticiones reales; 0 kg para peso corporal.'}</p>
    ${paused ? `<div class="workout-paused" role="status"><p>Sesión en pausa. Tus series están guardadas.</p>${action('resume', 'Reanudar entrenamiento', true)}</div>` : ''}
    <div class="workout-set-header" aria-hidden="true"><span>Serie</span><span>Peso (kg)</span><span>Reps reales</span><span>Estado</span></div><ol class="workout-sets">${entry.sets.map((set, position) => `<li class="workout-set${set.completed ? ' completed' : ''}" data-set-position="${position}"><span class="set-number">${position + 1}</span><input aria-label="Peso en kg, serie ${position + 1}" data-set-field="weightKg" type="number" inputmode="decimal" min="0" max="2000" step="any" value="${esc(set.weightKg)}" placeholder="—"${set.completed || paused ? ' disabled' : ''}><input aria-label="Repeticiones, serie ${position + 1}" data-set-field="reps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${esc(set.reps)}" placeholder="—"${set.completed || paused ? ' disabled' : ''}><button type="button" class="set-complete" data-complete-set="${position}" aria-label="${set.completed ? 'Desmarcar' : 'Completar'} serie ${position + 1}" aria-pressed="${set.completed}"${paused ? ' disabled' : ''}>${set.completed ? icon('check') : '<span aria-hidden="true">✓</span>'}</button>${set.reference ? `<small class="set-reference">Anterior: ${set.reference.weightKg} kg × ${set.reference.reps} reps · ${esc(new Date(set.reference.endedAt).toLocaleDateString('es-CL'))}</small>` : ''}</li>`).join('')}</ol>
    ${allDone ? `<div class="workout-exercise-done" role="status">${icon('check')}Ejercicio completado${progression ? `<p>Alcanzaste el máximo objetivo en todas las series. En otra sesión puedes valorar un incremento pequeño, por ejemplo 2,5 %, si mantienes la técnica. El peso sigue a tu elección.</p>` : ''}</div>` : ''}
    ${timerView(workout)}<div class="workout-navigation">${action('previous', 'Anterior', false, index === 0)}${action('next', 'Siguiente ejercicio', true, index === entries.length - 1)}</div>${index === entries.length - 1 ? action('finish', 'Revisar y finalizar', true) : ''}</section></div>`;
}

export function finishDialog(workout) {
  const count = progress(workout);
  return `${dialogHeading('Guardar entrenamiento')}<p>${count.completed} de ${count.total} series completadas. Solo las realizadas se incorporarán al historial.</p><p class="routine-form-error" role="alert"></p><div class="workout-finish-options">${action('save-complete', 'Guardar completo', true, count.completed !== count.total)}${count.completed !== count.total ? '<p>Para guardar completo, termina todas las series planificadas.</p>' : ''}${action('save-partial', 'Guardar parcial', false, !count.completed)}${!count.completed ? '<p>Completa al menos una serie para guardar.</p>' : ''}<button class="button button-secondary" type="button" data-close-routine-dialog>Seguir entrenando</button></div>`;
}

export function discardDialog() {
  return `${dialogHeading('¿Descartar entrenamiento?')}<p>Se eliminará esta sesión pendiente y sus series. El ciclo y los entrenamientos anteriores se conservarán.</p><p class="routine-form-error" role="alert"></p><div class="dialog-actions"><button class="button button-secondary" type="button" data-close-routine-dialog autofocus>Cancelar</button>${action('confirm-discard', 'Confirmar descarte')}</div>`;
}

export function resultView({ workout, sets, routine }, nextSession, mode) {
  return `<section class="card workout-result"><span class="empty-icon">${icon('check')}</span><h2>Entrenamiento ${workout.status === 'complete' ? 'completo' : 'parcial'} guardado</h2><p>${esc(workout.sessionName)} · ${esc(workout.routineName)}</p><p>${sets.length} series realizadas · ${esc(new Date(workout.endedAt).toLocaleString('es-CL'))}</p><ul>${workout.entries.filter((entry) => entry.sets.length).map((entry) => `<li><strong>${esc(entry.exercise.name)}</strong><span>${entry.sets.map((set) => `${set.weightKg} kg × ${set.reps}`).join(' · ')}</span></li>`).join('')}</ul><p>${workout.status === 'partial' ? 'El ciclo conserva su posición.' : 'Se conservaron tus series y los objetivos originales.'}${nextSession ? ` Próxima sugerida: ${esc(nextSession.name)}.` : ''}</p>${routine ? `<a class="button button-primary" href="#/rutina-activa?rutina=${routine.id}&ambito=${mode}">Elegir otra sesión</a>` : '<a class="button button-primary" href="#/mis-rutinas">Ir a Mis rutinas</a>'}<a class="text-link" href="#/progreso?ambito=${mode}&periodo=month">Ver progreso</a><p class="availability-note">Tus series guardadas ya forman parte de las estadísticas de este espacio.</p></section>`;
}
