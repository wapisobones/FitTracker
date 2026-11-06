import { recordingMode, MAX_DURATION_SECONDS } from '../../data/recording-modes.js';

export const ACTIVE_STATUSES = ['active', 'paused'];
export const FINAL_STATUSES = ['complete', 'partial'];

export class SetValidationError extends Error {
  constructor(field, message) { super(message); this.name = 'SetValidationError'; this.field = field; }
}

export function realValues(weightKg, reps) {
  if (![weightKg, reps].every((value) => typeof value === 'string' || typeof value === 'number')) throw new SetValidationError(['string', 'number'].includes(typeof weightKg) ? 'reps' : 'weightKg', 'Introduce peso y repeticiones válidos.');
  if (String(weightKg ?? '').trim() === '' || !Number.isFinite(Number(weightKg)) || Number(weightKg) < 0 || Number(weightKg) > 2000) throw new SetValidationError('weightKg', 'Introduce un peso entre 0 y 2000 kg. Para peso corporal puedes registrar 0 kg.');
  if (String(reps ?? '').trim() === '' || !Number.isInteger(Number(reps)) || Number(reps) < 1 || Number(reps) > 1000) throw new SetValidationError('reps', 'Introduce repeticiones enteras entre 1 y 1000.');
  return { weightKg: Number(weightKg), reps: Number(reps) };
}

export function recordedValues(set, mode = 'weight_reps') {
  if (mode === 'duration') {
    const value = set.durationSeconds;
    if (!['string', 'number'].includes(typeof value) || String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > MAX_DURATION_SECONDS) throw new SetValidationError('durationSeconds', `Introduce segundos enteros entre 1 y ${MAX_DURATION_SECONDS}.`);
    if (set.weightKg !== 0 || set.reps !== 0) throw new SetValidationError('durationSeconds', 'Una serie por tiempo no admite peso ni repeticiones.');
    // Neutral legacy fields preserve the set shape; only durationSeconds is a
    // performed value. Statistics must use the snapshot's explicit modality.
    return { weightKg: 0, reps: 0, durationSeconds: Number(value) };
  }
  if (!['weight_reps', 'bodyweight_reps'].includes(mode)) throw new Error('Modalidad de serie no válida.');
  if (set.durationSeconds !== undefined) throw new SetValidationError('reps', 'Una serie por repeticiones no admite duración.');
  if (mode === 'bodyweight_reps' && set.weightKg !== 0) throw new SetValidationError('reps', 'Una serie de peso corporal no admite carga externa.');
  return realValues(set.weightKg, set.reps);
}

export function validRecordedSet(set, mode) {
  try {
    const values = recordedValues(set, mode);
    return Object.entries(values).every(([key, value]) => set[key] === value);
  } catch { return false; }
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
    const mode = recordingMode(entry.exercise);
    for (const set of entry.sets) if (set.completed) recordedValues(set, mode);
  }
  if (!Number.isInteger(workout.currentExercise) || !workout.entries[workout.currentExercise]) throw new Error('No se pudo recuperar la posición del entrenamiento.');
  if (workout.timer && (!['running', 'paused'].includes(workout.timer.status) || !Number.isFinite(workout.timer.endsAt) || !Number.isFinite(workout.timer.durationMs) || !Number.isFinite(workout.timer.remainingMs) || workout.timer.durationMs < 0 || workout.timer.remainingMs < 0)) throw new Error('No se pudo recuperar el temporizador. Los registros se conservan.');
  return workout;
}
