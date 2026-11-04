import { BASE_EXERCISES } from '../../src/data/exercises.js';
import { DATA_STORES } from '../../src/db/schema.js';
import { newRoutine, prescription } from '../../src/features/routines/model.js';

// Synthetic records, never real personal data or a checked-in backup file.
export function backupFixture() {
  const now = '2026-11-03T15:00:00.000Z';
  const custom = { ...structuredClone(BASE_EXERCISES[0]), id: crypto.randomUUID(), origin: 'custom', name: 'Ejercicio de prueba', secondaryMuscles: [], video: null, visual: null, technique: null, createdAt: now, updatedAt: now };
  const plan = newRoutine('Rutina de prueba', 'Datos sintéticos');
  const session = { ...plan.sessions[0], prescriptions: [{ ...prescription(custom.id), sets: 2 }], createdAt: now, updatedAt: now };
  const { sessions: ignored, ...routine } = plan;
  Object.assign(routine, { revision: 1, sessionIds: [session.id], createdAt: now, updatedAt: now });
  const workoutId = crypto.randomUUID();
  const sets = [0, 1].map((position) => ({ id: crypto.randomUUID(), position, weightKg: 50, reps: 8, completed: true, completedAt: now, reference: null, workoutId, exerciseId: custom.id, prescriptionId: session.prescriptions[0].id, exerciseOrder: 0 }));
  const finished = { id: workoutId, formatVersion: 1, revision: 2, status: 'complete', routineId: routine.id, sessionId: session.id, routineRevision: 1, routineName: routine.name, sessionName: session.name,
    sessionSnapshot: structuredClone(session), entries: [{ exercise: custom, prescription: session.prescriptions[0], sets }], startedAt: now, updatedAt: now, endedAt: now, currentExercise: null, timer: null };
  const active = { ...structuredClone(finished), id: crypto.randomUUID(), status: 'paused', revision: 1, endedAt: null, currentExercise: 0, timer: { status: 'paused', endsAt: Date.parse(now), durationMs: 90000, remainingMs: 10000 } };
  active.entries[0].sets = [0, 1].map((position) => ({ id: crypto.randomUUID(), position, weightKg: '', reps: '', completed: false, completedAt: null, reference: { weightKg: 50, reps: 8, endedAt: now } }));
  const stores = Object.fromEntries(DATA_STORES.map((name) => [name, []]));
  Object.assign(stores, { exercises: [custom], routines: [routine], routineSessions: [session], workouts: [finished, active], setRecords: sets, profiles: [{ id: 'local-profile', alias: 'Deportista de prueba', updatedAt: now }],
    settings: [{ id: 'preferences', weightUnit: 'lb', updatedAt: now }, { id: 'weekly-goals', sessions: 3, volumeKg: 2000, updatedAt: now }, { id: 'active-workout', workoutId: active.id }] });
  return { app: 'FitTracker', scope: 'personal', schemaVersion: 1, exportedAt: now, stores };
}
