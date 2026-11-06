import { weightText } from './units.js';

export function setText(set, mode = 'weight_reps', unit = 'kg') {
  if (mode === 'duration') return `${set.durationSeconds} s`;
  if (mode === 'bodyweight_reps') return `${set.reps} reps`;
  return `${weightText(set.weightKg, unit)} × ${set.reps} reps`;
}
