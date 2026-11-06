import { icon } from '../../components/icons.js';
import { exerciseStill } from '../../components/exercise-media.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { countText } from '../../utils/text.js';
import { isDurationTarget, targetText, hasInheritedReps } from '../../data/prescription-targets.js';

// Only the mobile presentation collapses these controls; desktop keeps its toolbar.
function mobileOptions(id, label, content, className = '') {
  return `<div class="mobile-options ${className}" data-expanded="false"><button type="button" class="button button-secondary options-toggle" data-toggle-options aria-expanded="false" aria-controls="${id}">${label}${icon('chevron')}</button><div id="${id}" class="options-content">${content}</div></div>`;
}

export function routineLink(routineId, sessionId, mode) {
  return `#/mis-rutinas?${new URLSearchParams({ rutina: routineId, ...(sessionId ? { sesion: sessionId } : {}), ambito: mode })}`;
}

export function routinesFrame(templates) {
  return `<section class="page-heading"><div><h1>${icon('layers')}${templates ? 'Rutinas prediseñadas' : 'Mis rutinas'}</h1><p>${templates ? 'Elige una plantilla, consulta sus sesiones y guarda una copia editable.' : 'Organiza tus sesiones en una secuencia que se adapte a ti.'}</p></div></section>
    <div class="routine-top-actions">${templates ? '<a class="button button-secondary" href="#/mis-rutinas">Ver Mis rutinas</a>' : `<button class="button button-primary" type="button" data-routine-action="create" disabled>${icon('plus')}Crear rutina</button><a class="button button-secondary" href="#/predisenadas">${icon('layers')}Rutinas prediseñadas</a>`}</div>
    ${templates ? `<div class="muscle-chips template-levels" aria-label="Nivel de plantilla">${['Todos', 'Principiante', 'Intermedio', 'Avanzado'].map((level) => `<button type="button" data-template-level="${level}" aria-pressed="${level === 'Todos'}">${level}</button>`).join('')}</div>` : ''}
    <p class="routine-feedback" role="status" aria-live="polite">Cargando rutinas…</p><div class="routine-error"></div><div class="routines-layout"><div class="routine-list" aria-label="Lista de rutinas"></div><section class="routine-detail" aria-label="Detalle de rutina"></section></div>`;
}

export function listCard(routine, active) {
  const total = routine.sessions.reduce((sum, session) => sum + session.prescriptions.length, 0);
  return `<button class="card routine-list-card${active ? ' selected' : ''}" type="button" data-select-routine="${routine.id}" aria-pressed="${active}"><span class="routine-cover">${icon('dumbbell')}</span><span><strong>${esc(routine.name)}</strong><small>${routine.level ? `${esc(routine.level)} · ` : ''}${countText(routine.sessions.length, 'sesión', 'sesiones')}</small><small>${countText(total, 'ejercicio planificado', 'ejercicios planificados')}</small></span>${icon('chevron')}</button>`;
}

export function routineExercisePreview(exercise, details = exercise.mainMuscle) {
  return `<button type="button" class="prescription-name compact-technique" data-technique="${exercise.id}" aria-label="Ver técnica de ${esc(exercise.name)}" aria-haspopup="dialog" title="Ver técnica de ${esc(exercise.name)}"><span class="prescription-thumb">${exerciseStill(exercise, { decorative: true })}</span><span><strong>${esc(exercise.name)}</strong>${details ? `<small>${esc(details)}</small>` : ''}</span></button>`;
}

function row(item, index, length, exerciseMap, readonly) {
  const exercise = exerciseMap.get(item.exerciseId);
  const name = exercise?.name ?? 'Ejercicio no disponible';
  return `<li class="prescription-row" data-prescription-id="${item.id}">${exercise ? routineExercisePreview(exercise) : `<div class="prescription-name">${icon('info')}<span><strong>${esc(name)}</strong><small>Retira esta referencia para guardar la rutina.</small></span></div>`}<dl class="prescription-targets"><div><dt>Series</dt><dd>${item.sets}</dd></div><div><dt>${isDurationTarget(item) ? 'Duración' : 'Reps'}</dt><dd>${targetText(item, false)}</dd></div><div><dt>Descanso</dt><dd>${item.restSeconds} s</dd></div></dl>${readonly ? '' : mobileOptions(`item-options-${item.id}`, `<span class="sr-only">Opciones de ${esc(name)}</span>${icon('edit')}`, `<div class="prescription-actions"><button class="icon-button" type="button" data-item-action="up" data-item-id="${item.id}" aria-label="Subir ${esc(name)}"${index === 0 ? ' disabled' : ''}>${icon('up')}</button><button class="icon-button" type="button" data-item-action="down" data-item-id="${item.id}" aria-label="Bajar ${esc(name)}"${index === length - 1 ? ' disabled' : ''}>${icon('down')}</button><button class="icon-button" type="button" data-item-action="edit" data-item-id="${item.id}" aria-label="Editar objetivos de ${esc(name)}">${icon('edit')}</button><button class="icon-button" type="button" data-item-action="remove" data-item-id="${item.id}" aria-label="Quitar ${esc(name)}">${icon('trash')}</button></div>`, 'prescription-options')}${hasInheritedReps(item, exercise) ? '<p class="prescription-notes">Objetivos heredados de repeticiones; sin objetivo de tiempo. Puedes cambiarlos a segundos al editar.</p>' : ''}${item.notes ? `<p class="prescription-notes">${esc(item.notes)}</p>` : ''}</li>`;
}

export function detailView(routine, selectedSessionId, exerciseMap, { templates, copied, mode, draft = false, sessionMinutes }) {
  const session = routine.sessions.find((item) => item.id === selectedSessionId) ?? routine.sessions[0];
  const position = session ? routine.sessions.findIndex((item) => item.id === session.id) : -1;
  const start = templates || draft ? '' : `<div class="routine-start">${session?.prescriptions.length ? `<a class="button button-primary" href="#/rutina-activa?rutina=${routine.id}&sesion=${session.id}&ambito=${mode}">Iniciar sesión</a><p>Revisa la sesión elegida antes de iniciar. Si tienes un entrenamiento pendiente, podrás continuarlo.</p>` : '<button class="button button-primary" disabled type="button">Iniciar sesión</button><p>Añade ejercicios a esta sesión para poder entrenar.</p>'}</div>`;
  return `<article class="card routine-detail-card"><header class="routine-detail-heading"><span class="routine-cover large">${icon('dumbbell')}</span><div><h2>${esc(routine.name)}</h2><p>${esc(routine.description || 'Sin descripción.')}</p><div class="routine-meta"><span>${countText(routine.sessions.length, 'sesión', 'sesiones')} en secuencia</span>${routine.level ? `<span>${esc(routine.level)}</span>` : ''}${routine.origin === 'generator' ? '<span>Origen: Generador</span>' : ''}</div></div></header>
    ${templates ? `<div class="routine-actions">${ copied ? `<a class="button button-primary" href="${routineLink(copied.id, copied.sessions[0]?.id, mode)}">Ver copia en Mis rutinas</a>` : `<button class="button button-primary" type="button" data-routine-action="copy-template">${icon('plus')}Guardar en Mis rutinas</button>`}</div>` : mobileOptions(`routine-options-${routine.id}`, 'Opciones de rutina', `<div class="routine-actions"><button class="button button-secondary" type="button" data-routine-action="edit">${icon('edit')}Editar rutina</button>${draft ? '' : `<button class="button button-secondary" type="button" data-routine-action="duplicate"${copied ? ' disabled' : ''}>${icon('copy')}${copied ? 'Copia creada' : 'Duplicar rutina'}</button><button class="button button-secondary" type="button" data-routine-action="delete">${icon('trash')}Eliminar rutina</button>${copied ? `<a class="text-link" href="${routineLink(copied.id, copied.sessions[0]?.id, mode)}">Ver copia</a>` : ''}`}</div>`) }
    <div class="routine-sequence-heading"><h3>${icon('layers')}Secuencia de sesiones</h3>${templates ? '' : '<button class="button button-secondary" type="button" data-session-action="add">Añadir sesión</button>'}</div>
    <p class="sequence-note">Sin días obligatorios. La secuencia vuelve al inicio después de la última sesión.</p><div class="session-tabs" aria-label="Sesiones de la rutina">${routine.sessions.map((item, index) => `<button type="button" data-select-session="${item.id}" aria-pressed="${item.id === session?.id}"><small>Sesión ${index + 1}</small><strong>${esc(item.name)}</strong></button>`).join('')}</div>
    ${session ? `<section class="session-content"><div class="session-heading"><h3>${esc(session.name)}</h3><span>${countText(session.prescriptions.length, 'ejercicio', 'ejercicios')}${sessionMinutes ? ` · ~${sessionMinutes(session)} min` : ''}</span></div>${start}${templates ? '' : mobileOptions(`session-options-${session.id}`, 'Opciones de sesión', `<div class="session-actions"><button type="button" class="button button-secondary" data-session-action="edit">Editar sesión</button><button type="button" class="button button-secondary" data-session-action="duplicate">Duplicar sesión</button><button type="button" class="icon-button" data-session-action="up" aria-label="Subir sesión"${position === 0 ? ' disabled' : ''}>${icon('up')}</button><button type="button" class="icon-button" data-session-action="down" aria-label="Bajar sesión"${position === routine.sessions.length - 1 ? ' disabled' : ''}>${icon('down')}</button><button type="button" class="icon-button" data-session-action="delete" aria-label="Eliminar sesión">${icon('trash')}</button></div>`) }
      ${session.prescriptions.length ? `<ul class="prescription-list">${session.prescriptions.map((item, index) => row(item, index, session.prescriptions.length, exerciseMap, templates)).join('')}</ul>` : '<div class="routine-inline-empty"><h3>Esta sesión aún no tiene ejercicios</h3><p>Añade un ejercicio de la biblioteca y configura sus objetivos.</p></div>'}
      ${templates ? '' : '<button class="button button-secondary add-session-exercise" type="button" data-session-action="add-exercise">Añadir ejercicio</button>'}</section>` : '<div class="routine-inline-empty"><h3>Tu rutina aún no tiene sesiones</h3><p>Añade una sesión para empezar a organizar sus ejercicios.</p></div>'}
    ${templates ? '<p class="sequence-note">Al guardar se crea una copia independiente de esta plantilla.</p>' : draft ? '<p class="sequence-note">Los cambios permanecen en esta propuesta. Usa «Guardar en Mis rutinas» para crear la rutina e iniciar después su entrenamiento.</p>' : `<p class="sequence-note">Próxima sugerida: <strong>${esc(routine.sessions.find((item) => item.id === routine.nextSessionId)?.name ?? 'Sin sesión')}</strong>. Solo completar toda una sesión avanza el ciclo.</p>`}
  </article>`;
}

export function noRoutines() {
  return '<section class="card empty-state"><h2>Aún no tienes rutinas</h2><p>Crea una rutina con tus propias sesiones o guarda una plantilla como punto de partida.</p><a class="button button-secondary" href="#/predisenadas">Explorar rutinas prediseñadas</a></section>';
}
