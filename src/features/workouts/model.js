export const ACTIVE_STATUSES = ['active', 'paused'];
export const FINAL_STATUSES = ['complete', 'partial'];

export function realValues(weightKg, reps) {
  if (![weightKg, reps].every((value) => typeof value === 'string' || typeof value === 'number')) throw new Error('Introduce peso y repeticiones válidos.');
  if (String(weightKg ?? '').trim() === '' || !Number.isFinite(Number(weightKg)) || Number(weightKg) < 0 || Number(weightKg) > 2000) throw new Error('Introduce un peso entre 0 y 2000 kg. Para peso corporal puedes registrar 0 kg.');
  if (String(reps ?? '').trim() === '' || !Number.isInteger(Number(reps)) || Number(reps) < 1 || Number(reps) > 1000) throw new Error('Introduce repeticiones enteras entre 1 y 1000.');
  return { weightKg: Number(weightKg), reps: Number(reps) };
}

export function restRemaining(timer, now = Date.now()) {
  if (!timer) return 0;
  return Math.max(0, timer.status === 'running' ? timer.endsAt - now : timer.remainingMs);
}

export function progress(workout) {
  const sets = workout.entries.flatMap((entry) => entry.sets);
  const completed = sets.filter((set) => set.completed).length;
  return { total: sets.length, completed, percent: sets.length ? Math.round(completed / sets.length * 100) : 0 };
}

export function assertDraft(workout) {
  if (!workout || workout.formatVersion !== 1 || !ACTIVE_STATUSES.includes(workout.status) || !Array.isArray(workout.entries) || !workout.entries.length || !Number.isInteger(workout.revision)) throw new Error('El entrenamiento pendiente tiene un formato no válido. Sus datos se conservan; no se ha reemplazado.');
  for (const entry of workout.entries) {
    if (!entry?.exercise?.id || !Array.isArray(entry.sets) || entry.sets.length !== entry.prescription?.sets) throw new Error('No se pudieron recuperar las series del entrenamiento. Sus datos se conservan.');
    for (const set of entry.sets) if (set.completed) realValues(set.weightKg, set.reps);
  }
  if (!Number.isInteger(workout.currentExercise) || !workout.entries[workout.currentExercise]) throw new Error('No se pudo recuperar la posición del entrenamiento.');
  if (workout.timer && (!['running', 'paused'].includes(workout.timer.status) || !Number.isFinite(workout.timer.endsAt) || !Number.isFinite(workout.timer.durationMs) || !Number.isFinite(workout.timer.remainingMs) || workout.timer.durationMs < 0 || workout.timer.remainingMs < 0)) throw new Error('No se pudo recuperar el temporizador. Los registros se conservan.');
  return workout;
}
