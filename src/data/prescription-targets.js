import { recordingMode, MAX_DURATION_SECONDS } from './recording-modes.js';

// Missing targetType always means the original repetition contract. Never infer
// units from today's catalog: prescriptions and historical snapshots own them.
export const isDurationTarget = (item) => item.targetType === 'duration';
export const defaultDurationTarget = () => ({ targetType: 'duration', durationMinSeconds: 30, durationMaxSeconds: 45 });
export const defaultTargets = (exercise) => recordingMode(exercise) === 'duration' ? defaultDurationTarget() : { repsMin: 8, repsMax: 12 };

export function validateTargets(item, strict = false) {
  if (item.targetType !== undefined && !['reps', 'duration'].includes(item.targetType)) throw new Error('Tipo de objetivo no válido.');
  const duration = isDurationTarget(item);
  const keys = duration ? ['durationMinSeconds', 'durationMaxSeconds'] : ['repsMin', 'repsMax'];
  const unexpected = duration ? ['repsMin', 'repsMax'] : ['durationMinSeconds', 'durationMaxSeconds'];
  if (unexpected.some((key) => item[key] !== undefined)) throw new Error('El objetivo no puede mezclar repeticiones y segundos.');
  const values = keys.map((key) => {
    const value = item[key];
    const max = duration ? MAX_DURATION_SECONDS : 100;
    if ((strict ? typeof value !== 'number' : !['string', 'number'].includes(typeof value)) || String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > max) throw new Error(`${duration ? 'Duración en segundos' : 'Repeticiones'}: introduce un entero entre 1 y ${max}.`);
    return Number(value);
  });
  if (values[0] > values[1]) throw new Error(`${duration ? 'La duración mínima no puede superar la máxima.' : 'Las repeticiones mínimas no pueden superar las máximas.'} Para un valor fijo, usa el mismo número en ambos campos.`);
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
}

export function targetText(item, repsUnit = true) {
  const [min, max] = isDurationTarget(item) ? [item.durationMinSeconds, item.durationMaxSeconds] : [item.repsMin, item.repsMax];
  return `${min === max ? min : `${min}–${max}`}${isDurationTarget(item) ? ' s' : repsUnit ? ' reps' : ''}`;
}

export const hasInheritedReps = (item, exercise) => !isDurationTarget(item) && recordingMode(exercise) === 'duration';
