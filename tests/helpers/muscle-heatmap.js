import { BASE_EXERCISES } from '../../src/data/exercises.js';

export function heatmapHistory() {
  const workouts = [], setRecords = [];
  function session(id, endedAt, status, counts, completed = true) {
    const entries = Object.entries(counts).map(([muscle, count], order) => {
      const exercise = structuredClone(BASE_EXERCISES.find((item) => item.mainMuscle === muscle));
      const prescription = { id: `${id}-${order}`, exerciseId: exercise.id, order, sets: count, repsMin: 6, repsMax: 8, restSeconds: 90, notes: '' };
      const sets = Array.from({ length: count }, (_, position) => ({ id: `${id}-${order}-${position}`, workoutId: id, prescriptionId: prescription.id, exerciseId: exercise.id, exerciseOrder: order, position, weightKg: order % 2 ? 0 : 100, reps: order % 2 ? 20 : 1, completed, completedAt: endedAt }));
      setRecords.push(...sets);
      return { exercise, prescription, sets };
    });
    workouts.push({ id, formatVersion: 1, revision: 1, status, routineName: 'Prueba de calor', sessionName: id, entries, endedAt, startedAt: new Date(Date.parse(endedAt) - 1800000).toISOString() });
  }
  session('Límite incluido', '2026-10-29T03:00:00.000Z', 'complete', { Pecho: 5, Espalda: 6, Piernas: 12, Brazos: 1, Core: 11 });
  session('Parcial guardada', '2026-11-04T14:00:00.000Z', 'partial', { Core: 1 });
  session('Límite excluido', '2026-10-29T02:59:59.999Z', 'complete', { Pecho: 12, Hombros: 6 });
  session('Fuera de 30 días', '2026-09-15T15:00:00.000Z', 'complete', { Espalda: 10 });
  session('Inicio del historial', '2026-05-01T15:00:00.000Z', 'complete', { Pecho: 20 });
  for (const status of ['active', 'paused', 'discarded']) session(status, '2026-11-04T14:00:00.000Z', status, { Hombros: 20 });
  session('Pendientes', '2026-11-04T14:00:00.000Z', 'complete', { Hombros: 20 }, false);
  return { workouts, setRecords };
}
