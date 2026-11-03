import { BASE_EXERCISES } from '../../src/data/exercises.js';

export const FIXED_NOW = '2026-11-04T15:00:00.000Z';
export const benchId = BASE_EXERCISES[0].id;
export function knownHistory() {
  const workouts = [];
  const setRecords = [];
  function workout(id, endedAt, status, groups) {
    const entries = groups.map(([exerciseIndex, values], order) => {
      const exercise = structuredClone(BASE_EXERCISES[exerciseIndex]);
      if (!exerciseIndex) exercise.name = 'Press histórico';
      const prescription = { id: `${id}-prescription-${order}`, exerciseId: exercise.id, order, sets: values.length, repsMin: 6, repsMax: 8, restSeconds: 90, notes: '' };
      const sets = values.map(([weightKg, reps, completed = true], position) => {
        const set = { id: `${id}-set-${order}-${position}`, workoutId: id, prescriptionId: prescription.id, exerciseId: exercise.id, exerciseOrder: order, position, weightKg, reps, completed, completedAt: endedAt };
        setRecords.push(set);
        return set;
      });
      return { exercise, prescription, sets };
    });
    workouts.push({ id, formatVersion: 1, revision: 1, status, routineName: 'Rutina histórica', sessionName: id, entries, endedAt, startedAt: new Date(Date.parse(endedAt) - 30 * 60000).toISOString() });
  }
  workout('Completa conocida', '2026-11-02T15:00:00.000Z', 'complete', [[0, [[50, 8], [55, 6]]], [5, [[40, 10]]]]);
  workout('Parcial conocida', '2026-11-04T14:00:00.000Z', 'partial', [[0, [[60, 5], [999, 99, false]]]]);
  workout('Mes anterior', '2026-10-15T15:00:00.000Z', 'complete', [[0, [[80, 12]]]]);
  return { workouts, setRecords, settings: [{ id: 'weekly-goals', sessions: 3, volumeKg: 2000 }] };
}
