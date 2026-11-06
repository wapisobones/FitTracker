import { assertMode } from '../../db/repository.js';
import { DATABASES } from '../../db/schema.js';
import { transact, storageError } from '../../db/indexed-db.js';
import { BASE_EXERCISES } from '../../data/exercises.js';
import { ROUTINE_TEMPLATES } from '../../data/routine-templates.js';
import { UUID, validateRoutine, hydrateRoutine, independentCopy, prescription, newRoutine, newSession } from './model.js';
import { validateConfig, compatibleExercises } from '../generator/engine.js';

function assertExerciseAvailable(session, exerciseId) {
  if (session.prescriptions.some((item) => item.exerciseId === exerciseId)) throw new Error('Este ejercicio ya pertenece a esta sesión. Puedes editar sus objetivos o elegir otro ejercicio.');
}

export function routineService(mode) {
  assertMode(mode);
  async function transaction(access, action) {
    let domainError;
    try {
      return await transact(DATABASES[mode], ['routines', 'routineSessions', 'exercises'], access, (tx, result) => {
        const records = {};
        let remaining = 3;
        for (const name of ['routines', 'routineSessions', 'exercises']) tx.objectStore(name).getAll().onsuccess = (event) => {
          records[name] = event.target.result;
          if (--remaining === 0) {
            try { result(action(tx, records)); }
            catch (error) { domainError = error; tx.abort(); }
          }
        };
      });
    } catch (error) { throw domainError instanceof DOMException ? storageError(domainError) : domainError ?? error; }
  }

  function current(records, expected) {
    const stored = records.routines.find((routine) => routine.id === expected.id);
    if (!stored || stored.revision !== expected.revision) throw new Error('Esta rutina cambió o fue eliminada en otra pestaña. Recarga la lista antes de continuar.');
    return hydrateRoutine(stored, records.routineSessions);
  }

  function persist(tx, records, input) {
    const draft = validateRoutine(input);
    const existing = records.routines.find((routine) => routine.id === draft.id);
    if (existing ? existing.revision !== draft.revision : draft.revision !== 0) throw new Error('La rutina cambió en otra pestaña. Cierra el formulario y recarga la lista.');
    const exerciseIds = new Set([...BASE_EXERCISES, ...records.exercises].map((exercise) => exercise.id));
    if (draft.sessions.some((session) => session.prescriptions.some((item) => !exerciseIds.has(item.exerciseId)))) throw new Error('Uno de los ejercicios ya no está disponible en este modo. Retíralo de la sesión antes de guardar.');
    const now = new Date().toISOString();
    const sessions = draft.sessions.map((session) => ({ ...session, createdAt: session.createdAt ?? now, updatedAt: now }));
    const { sessions: ignored, ...fields } = draft;
    const record = { ...existing, ...fields, sessionIds: sessions.map((session) => session.id), revision: (existing?.revision ?? 0) + 1, createdAt: existing?.createdAt ?? now, updatedAt: now };
    const keep = new Set(record.sessionIds);
    for (const old of records.routineSessions) if (old.routineId === record.id && !keep.has(old.id)) tx.objectStore('routineSessions').delete(old.id);
    for (const session of sessions) {
      const other = records.routineSessions.find((stored) => stored.id === session.id && stored.routineId !== record.id);
      if (other) throw new Error('El identificador de una sesión ya está en uso. No se ha guardado la rutina.');
      tx.objectStore('routineSessions').put(session);
    }
    if (existing) tx.objectStore('routines').put(record);
    else tx.objectStore('routines').add(record);
    return { ...record, sessions };
  }

  function withToken(tx, records, token, factory) {
    if (!UUID.test(token)) throw new Error('Identificador de copia no válido.');
    const previous = records.routines.find((routine) => routine.creationToken === token);
    return previous ? hydrateRoutine(previous, records.routineSessions) : persist(tx, records, { ...factory(), creationToken: token });
  }

  return Object.freeze({
    list: () => transaction('readonly', (_, records) => records.routines.map((routine) => hydrateRoutine(routine, records.routineSessions)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))),
    save: (draft) => transaction('readwrite', (tx, records) => persist(tx, records, draft)),
    // Guard additions, not general validation: inherited duplicates remain
    // readable/editable, and copying an existing session keeps its contents.
    addExercise: (routine, sessionId, item) => transaction('readwrite', (tx, records) => {
      const storedSession = records.routineSessions.find((session) => session.routineId === routine.id && session.id === sessionId);
      if (!storedSession) throw new Error('La sesión seleccionada ya no existe. Recarga la lista antes de continuar.');
      // Check the stored session before the revision to explain stale duplicate
      // attempts clearly. Both checks and the write share one transaction.
      assertExerciseAvailable(storedSession, item.exerciseId);
      const draft = current(records, routine);
      draft.sessions.find((session) => session.id === sessionId).prescriptions.push(structuredClone(item));
      return persist(tx, records, draft);
    }),
    saveGenerated: (draft, token) => transaction('readwrite', (tx, records) => withToken(tx, records, token, () => {
      if (draft.origin !== 'generator' || draft.revision !== 0 || !draft.sessions?.length || draft.sessions.some((session) => !session.prescriptions?.length)) throw new Error('La propuesta necesita al menos un ejercicio por sesión antes de guardarse como una rutina nueva.');
      const catalog = [...BASE_EXERCISES, ...records.exercises];
      const config = validateConfig(draft.generator?.config, catalog);
      const eligible = new Set(compatibleExercises(catalog, config).map((exercise) => exercise.id));
      if (draft.sessions.some((session) => session.prescriptions.some((item) => !eligible.has(item.exerciseId)))) throw new Error('Un ejercicio de la propuesta cambió o ya no cumple el equipo, nivel o grupos originales. Vuelve a leer el catálogo y retíralo o reemplázalo antes de guardar.');
      return draft;
    })),
    remove: (routine) => transaction('readwrite', (tx, records) => {
      current(records, routine);
      for (const session of records.routineSessions) if (session.routineId === routine.id) tx.objectStore('routineSessions').delete(session.id);
      tx.objectStore('routines').delete(routine.id);
    }),
    duplicate: (routine, token) => transaction('readwrite', (tx, records) => withToken(tx, records, token, () => independentCopy(current(records, routine)))),
    copyTemplate: (id, token) => transaction('readwrite', (tx, records) => withToken(tx, records, token, () => {
      const template = ROUTINE_TEMPLATES.find((item) => item.id === id);
      if (!template) throw new Error('La plantilla no existe.');
      return { ...independentCopy(template, 'template', template.name), sourceTemplateId: template.id };
    })),
    addFromCatalog: (exerciseId, target, token) => transaction('readwrite', (tx, records) => {
      const previous = records.routines.find((routine) => routine.catalogOperationToken === token);
      if (previous) return hydrateRoutine(previous, records.routineSessions);
      if (!UUID.test(token)) throw new Error('Identificador de operación no válido.');
      let draft;
      if (target.routineId) {
        const record = records.routines.find((routine) => routine.id === target.routineId);
        const storedSession = records.routineSessions.find((session) => session.routineId === target.routineId && session.id === target.sessionId);
        if (storedSession) assertExerciseAvailable(storedSession, exerciseId);
        if (!record || record.revision !== target.revision) throw new Error('La rutina seleccionada cambió. Cierra el selector y vuelve a intentarlo.');
        draft = hydrateRoutine(record, records.routineSessions);
      } else draft = newRoutine(target.routineName, '', '');
      let session = draft.sessions.find((item) => item.id === target.sessionId);
      if (!target.sessionId) { session = newSession(draft.id, target.sessionName); draft.sessions.push(session); }
      if (!session) throw new Error('La sesión seleccionada ya no existe.');
      assertExerciseAvailable(session, exerciseId);
      session.prescriptions.push(prescription(exerciseId));
      return persist(tx, records, { ...draft, catalogOperationToken: token });
    }),
  });
}
