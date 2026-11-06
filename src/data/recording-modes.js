export const RECORDING_MODES = Object.freeze({
  weight_reps: 'Peso y repeticiones',
  bodyweight_reps: 'Peso corporal (repeticiones)',
  duration: 'Duración (segundos)',
});

// Missing metadata always means the original weight/reps contract. Never infer
// historical units from equipment, muscle, tracking, or the current catalog.
export function recordingMode(exercise) {
  const mode = exercise?.recordingMode === undefined ? 'weight_reps' : exercise.recordingMode;
  if (!Object.hasOwn(RECORDING_MODES, mode)) throw new Error('Selecciona una modalidad de registro válida.');
  return mode;
}

export const MAX_DURATION_SECONDS = 86400;
