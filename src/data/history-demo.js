import { BASE_EXERCISES } from './exercises.js';

// Stable IDs reserved for this explicit demo seed. Dates are fixed on first
// creation, never rolled forward on later visits. No routine is created/edited.
const id = (value) => `d6000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
export function demoHistory(now = new Date()) {
  const workouts = [];
  const setRecords = [];
  const chosen = [1, 6, 9, 13, 17, 23].map((n) => BASE_EXERCISES[n - 1]);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10);
  if (today.getTime() + 45 * 60000 > now.getTime()) today.setDate(today.getDate() - 1);
  for (let index = 0; index < 18; index++) {
    const started = new Date(today);
    started.setDate(started.getDate() - (17 - index) * 2);
    const startedAt = started.toISOString();
    const endedAt = new Date(started.getTime() + 45 * 60000).toISOString();
    if (Date.parse(endedAt) > now.getTime()) continue;
    const workoutId = id(100 + index);
    const partial = index === 14;
    const entries = chosen.map((exercise, order) => {
      const prescription = { id: id(1000 + index * 10 + order), exerciseId: exercise.id, order, sets: 3, repsMin: 8, repsMax: 10, restSeconds: 90, notes: 'Sesión ficticia de demostración.' };
      const count = partial ? order < 3 ? 2 : 0 : 3;
      const sets = Array.from({ length: count }, (_, position) => {
        const weightKg = order === 5 ? 0 : [45, 30, 60, 10, 8][order] + Math.floor(index / 3) * (order < 3 ? 2.5 : 1);
        const set = { id: id(10000 + index * 100 + order * 10 + position), workoutId, exerciseId: exercise.id, prescriptionId: prescription.id, exerciseOrder: order, position, weightKg,
          reps: 8 + position % 3, completed: true, completedAt: new Date(started.getTime() + (order * 6 + position + 1) * 60000).toISOString(), reference: null };
        setRecords.push(set);
        return set;
      });
      return { exercise: structuredClone(exercise), prescription, sets };
    });
    workouts.push({ id: workoutId, formatVersion: 1, revision: 1, status: partial ? 'partial' : 'complete', routineId: null, sessionId: null, routineName: 'Full body · Demostración', sessionName: `Cuerpo completo ${index % 2 ? 'B' : 'A'}`,
      sessionSnapshot: { id: id(20000 + index), name: `Cuerpo completo ${index % 2 ? 'B' : 'A'}`, prescriptions: entries.map((entry) => entry.prescription) },
      startedAt, endedAt, updatedAt: endedAt, currentExercise: null, timer: null, entries, origin: 'demo-seed-v1' });
  }
  return { workouts, setRecords };
}
