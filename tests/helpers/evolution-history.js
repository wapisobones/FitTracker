import { BASE_EXERCISES } from '../../src/data/exercises.js';

export const EVOLUTION_NOW = '2026-11-06T15:00:00.000Z';
export const bench = BASE_EXERCISES[0].id;
export const deadbug = BASE_EXERCISES[21].id;
export const plank = BASE_EXERCISES[20].id;

// Synthetic history with several sets/sessions per day, old snapshots of the
// same IDs, and explicit time targets from FT-013C. No seed or personal backup.
export function evolutionHistory() {
  const workouts = [], setRecords = [];
  function add(date, status, values, legacy = false) {
    const id = crypto.randomUUID();
    const entries = [0, 21, 20].map((index, order) => {
      const exercise = structuredClone(BASE_EXERCISES[index]);
      if (legacy) delete exercise.recordingMode;
      const prescription = { id: crypto.randomUUID(), exerciseId: exercise.id, order, sets: values[order].length, restSeconds: 60, notes: '',
        ...(exercise.recordingMode === 'duration' ? { targetType: 'duration', durationMinSeconds: 30, durationMaxSeconds: 45 } : { repsMin: 8, repsMax: 12 }) };
      const sets = values[order].map(([a, b, completed = true], position) => {
        const timed = exercise.recordingMode === 'duration';
        const set = { id: crypto.randomUUID(), workoutId: id, prescriptionId: prescription.id, exerciseId: exercise.id, exerciseOrder: order, position,
          weightKg: timed || exercise.recordingMode === 'bodyweight_reps' ? 0 : a, reps: timed ? 0 : b ?? a,
          ...(timed ? { durationSeconds: a } : {}), completed, completedAt: completed ? date : null, reference: null };
        setRecords.push(set);
        return set;
      });
      return { exercise, prescription, sets };
    });
    workouts.push({ id, formatVersion: 1, revision: 1, status, routineName: 'Evolución sintética', sessionName: 'Sesión sintética', entries,
      endedAt: status === 'active' ? null : date, startedAt: date, updatedAt: date, currentExercise: status === 'active' ? 0 : null, timer: null });
  }
  add('2026-10-15T15:00:00.000Z', 'complete', [[[80, 12]], [[20, 7]], [[10, 8]]], true);
  add('2026-11-02T15:00:00.000Z', 'complete', [[[50, 8], [55, 6]], [[8], [12]], [[30], [45]]]);
  add('2026-11-04T15:00:00.000Z', 'partial', [[[60, 5], [999, 8, false]], [[15], [99, undefined, false]], [[60], [999, undefined, false]]]);
  add('2026-11-04T18:00:00.000Z', 'complete', [[[58, 8]], [[14]], [[50]]]);
  add('2026-11-05T15:00:00.000Z', 'active', [[[999, 8]], [[999]], [[999]]]);
  return { workouts, setRecords, settings: [] };
}
