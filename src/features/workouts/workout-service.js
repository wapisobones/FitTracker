import { assertMode } from '../../db/repository.js';
import { DATABASES } from '../../db/schema.js';
import { transact, storageError } from '../../db/indexed-db.js';
import { BASE_EXERCISES } from '../../data/exercises.js';
import { hydrateRoutine } from '../routines/model.js';
import { ACTIVE_STATUSES, FINAL_STATUSES, assertDraft, recordedValues, validRecordedSet, restRemaining, progress } from './model.js';
import { recordingMode } from '../../data/recording-modes.js';

const stores = ['workouts', 'setRecords', 'settings', 'routines', 'routineSessions', 'exercises'];
const pointerId = 'active-workout';

// Every critical change reads and writes within one scoped transaction. The
// settings pointer plus the draft scan serialize starts across browser tabs.
export function workoutService(mode) {
  assertMode(mode);
  async function transaction(access, action) {
    let domainError;
    try {
      return await transact(DATABASES[mode], stores, access, (tx, result) => {
        const records = {};
        let pending = stores.length;
        for (const name of stores) tx.objectStore(name).getAll().onsuccess = (event) => {
          records[name] = event.target.result;
          if (--pending === 0) {
            try { result(action(tx, records)); }
            catch (error) { domainError = error; tx.abort(); }
          }
        };
      });
    } catch (error) { throw domainError instanceof DOMException ? storageError(domainError) : domainError ?? error; }
  }

  function active(records) {
    const drafts = records.workouts.filter((item) => ACTIVE_STATUSES.includes(item.status));
    const pointer = records.settings.find((item) => item.id === pointerId);
    if (drafts.length > 1 || (pointer && !drafts.some((item) => item.id === pointer.workoutId))) throw new Error('Hay un conflicto al recuperar el entrenamiento pendiente. Los datos se conservan.');
    return drafts.length ? assertDraft(drafts[0]) : null;
  }

  function current(records, expected) {
    const draft = active(records);
    if (!draft || draft.id !== expected.id || draft.revision !== expected.revision) throw new Error('Este entrenamiento cambió en otra pestaña o ya finalizó. Recarga el entrenamiento antes de continuar.');
    return structuredClone(draft);
  }

  function persist(tx, draft) {
    const updated = { ...draft, revision: draft.revision + 1, updatedAt: new Date().toISOString() };
    assertDraft(updated);
    tx.objectStore('workouts').put(updated);
    return updated;
  }

  function lastReferences(records, exerciseId, mode) {
    const history = records.workouts.filter((item) => FINAL_STATUSES.includes(item.status) && Number.isFinite(Date.parse(item.endedAt)))
      .sort((a, b) => b.endedAt.localeCompare(a.endedAt) || b.id.localeCompare(a.id));
    for (const workout of history) {
      const valid = records.setRecords.filter((set) => {
        if (set.workoutId !== workout.id || set.exerciseId !== exerciseId || set.completed !== true || !Number.isInteger(set.position) || set.position < 0 || !Number.isFinite(Date.parse(set.completedAt))) return false;
        const snapshot = workout.entries?.find((entry) => entry.exercise?.id === exerciseId && entry.prescription?.id === set.prescriptionId);
        if (!snapshot) return false;
        try {
          const previousMode = recordingMode(snapshot.exercise);
          return validRecordedSet(set, previousMode) && (previousMode === mode || (mode === 'bodyweight_reps' && previousMode === 'weight_reps' && set.weightKg === 0));
        } catch { return false; }
      }).sort((a, b) => (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0));
      if (valid.length) return { endedAt: workout.endedAt, sets: valid };
    }
    return null;
  }

  return Object.freeze({
    getActive: () => transaction('readonly', (_, records) => active(records)),
    getResult: (id) => transaction('readonly', (_, records) => {
      const workout = records.workouts.find((item) => item.id === id && FINAL_STATUSES.includes(item.status) && item.formatVersion === 1);
      return workout ? { workout, sets: records.setRecords.filter((set) => set.workoutId === id), routine: records.routines.find((routine) => routine.id === workout.routineId) } : null;
    }),
    start: (routineId, sessionId) => transaction('readwrite', (tx, records) => {
      const pending = active(records);
      if (pending) return { workout: pending, recovered: true };
      const routine = hydrateRoutine(records.routines.find((item) => item.id === routineId), records.routineSessions);
      const session = routine.sessions.find((item) => item.id === (sessionId || routine.nextSessionId));
      if (!session?.prescriptions.length) throw new Error('Elige una sesión con ejercicios para iniciar el entrenamiento.');
      const exercises = [...BASE_EXERCISES, ...records.exercises];
      const entries = session.prescriptions.map((prescription) => {
        const exercise = exercises.find((item) => item.id === prescription.exerciseId);
        if (!exercise) throw new Error('Un ejercicio de la sesión ya no está disponible. Revisa la rutina antes de iniciar.');
        const mode = recordingMode(exercise);
        const reference = lastReferences(records, exercise.id, mode);
        return { prescription: structuredClone(prescription), exercise: { ...structuredClone(exercise), recordingMode: mode }, sets: Array.from({ length: prescription.sets }, (_, position) => {
          const previous = reference?.sets.find((set) => set.position === position);
          return { id: crypto.randomUUID(), position, weightKg: mode === 'weight_reps' ? previous?.weightKg ?? '' : 0, reps: mode === 'duration' ? 0 : previous?.reps ?? '',
            ...(mode === 'duration' ? { durationSeconds: previous?.durationSeconds ?? '' } : {}), completed: false, completedAt: null,
            reference: previous ? { ...recordedValues(previous, mode), endedAt: reference.endedAt } : null };
        }) };
      });
      const now = new Date().toISOString();
      const workout = { id: crypto.randomUUID(), formatVersion: 1, revision: 1, status: 'active', routineId, sessionId: session.id, routineName: routine.name, sessionName: session.name,
        routineRevision: routine.revision, sessionSnapshot: structuredClone(session), startedAt: now, updatedAt: now, endedAt: null, currentExercise: 0, timer: null, entries };
      tx.objectStore('workouts').add(workout);
      tx.objectStore('settings').put({ id: pointerId, workoutId: workout.id });
      return { workout, recovered: false };
    }),
    update: (expected, command) => transaction('readwrite', (tx, records) => {
      const draft = current(records, expected);
      const entry = draft.entries[command.exercise ?? draft.currentExercise];
      const set = entry?.sets[command.position];
      if (command.type === 'values' || command.type === 'complete-set' || command.type === 'undo-set') {
        if (draft.status !== 'active') throw new Error('Reanuda el entrenamiento para registrar series.');
        if (!set) throw new Error('La serie seleccionada no existe.');
        if (command.type === 'undo-set') { set.completed = false; set.completedAt = null; }
        else {
          if (set.completed) throw new Error('Desmarca la serie antes de corregir sus valores.');
          // Incomplete inputs remain strings in the draft. Validation happens
          // before completing, so an empty field never silently becomes zero.
          if (command.type === 'values') {
            const mode = recordingMode(entry.exercise);
            const fields = mode === 'duration' ? ['durationSeconds'] : mode === 'bodyweight_reps' ? ['reps'] : ['weightKg', 'reps'];
            if (!fields.includes(command.field) || typeof command.value !== 'string' || command.value.length > 24) throw new Error('Valor de serie no válido.');
            set[command.field] = command.value;
          } else {
            Object.assign(set, recordedValues(set, recordingMode(entry.exercise)), { completed: true, completedAt: new Date().toISOString() });
            const durationMs = entry.prescription.restSeconds * 1000;
            draft.timer = { status: 'running', durationMs, remainingMs: durationMs, endsAt: Date.now() + durationMs };
          }
        }
      } else if (command.type === 'navigate') {
        if (!Number.isInteger(command.index) || !draft.entries[command.index]) throw new Error('El ejercicio seleccionado no existe.');
        draft.currentExercise = command.index;
      } else if (command.type === 'pause') {
        draft.status = 'paused';
        draft.pausedAt = new Date().toISOString();
        if (draft.timer?.status === 'running') draft.timer = { ...draft.timer, remainingMs: restRemaining(draft.timer), status: 'paused' };
      } else if (command.type === 'resume') {
        draft.status = 'active';
        // Rest resumes explicitly, independently of the session.
      } else if (command.type === 'rest') {
        if (draft.status !== 'active') throw new Error('Reanuda el entrenamiento para usar el descanso.');
        if (command.action === 'start') {
          const durationMs = entry.prescription.restSeconds * 1000;
          draft.timer = { status: 'running', durationMs, remainingMs: durationMs, endsAt: Date.now() + durationMs };
        } else if (command.action === 'skip') draft.timer = null;
        else if (command.action === 'pause' && draft.timer) draft.timer = { ...draft.timer, remainingMs: restRemaining(draft.timer), status: 'paused' };
        else if (command.action === 'resume' && draft.timer) draft.timer = { ...draft.timer, endsAt: Date.now() + restRemaining(draft.timer), status: 'running' };
        else throw new Error('Acción de descanso no válida.');
      } else throw new Error('Acción de entrenamiento no válida.');
      return persist(tx, draft);
    }),
    finish: (expected, status) => transaction('readwrite', (tx, records) => {
      const draft = current(records, expected);
      if (!FINAL_STATUSES.includes(status)) throw new Error('Estado de finalización no válido.');
      const count = progress(draft);
      if (!count.completed) throw new Error('Completa al menos una serie para guardar un entrenamiento.');
      if (status === 'complete' && count.completed !== count.total) throw new Error('Completa todas las series o guarda el entrenamiento parcial.');
      const endedAt = new Date().toISOString();
      // Final workouts contain only performed sets. The prescription and session
      // snapshots still describe all planned work, including unperformed work.
      const entries = draft.entries.map((entry, exerciseOrder) => ({ ...entry, sets: entry.sets.filter((set) => set.completed).map((set) => {
        const record = { ...set, ...recordedValues(set, recordingMode(entry.exercise)), workoutId: draft.id, exerciseId: entry.exercise.id, prescriptionId: entry.prescription.id, exerciseOrder };
        tx.objectStore('setRecords').add(record);
        return record;
      }) }));
      const workout = { ...draft, entries, status, endedAt, updatedAt: endedAt, revision: draft.revision + 1, currentExercise: null, timer: null };
      tx.objectStore('workouts').put(workout);
      tx.objectStore('settings').delete(pointerId);
      if (status === 'complete') {
        const routine = records.routines.find((item) => item.id === draft.routineId);
        const position = routine?.sessionIds.indexOf(draft.sessionId) ?? -1;
        // If planning was removed during training, retain the existing cycle.
        if (position >= 0) tx.objectStore('routines').put({ ...routine, nextSessionId: routine.sessionIds[(position + 1) % routine.sessionIds.length], revision: routine.revision + 1, updatedAt: endedAt });
      }
      return workout;
    }),
    discard: (expected) => transaction('readwrite', (tx, records) => {
      const draft = current(records, expected);
      tx.objectStore('workouts').delete(draft.id);
      tx.objectStore('settings').delete(pointerId);
    }),
  });
}
