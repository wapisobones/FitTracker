import { MUSCLE_GROUPS } from '../../data/exercises.js';
import { UUID, newRoutine, newSession, prescription, validateRoutine } from '../routines/model.js';

export const LEVELS = ['Principiante', 'Intermedio', 'Avanzado'];
export const GOALS = { hypertrophy: 'Hipertrofia', strength: 'Fuerza', conditioning: 'Acondicionamiento' };
export const EQUIPMENT = ['Peso corporal', 'Colchoneta', 'Mancuernas', 'Banco', 'Barra', 'Polea', 'Máquina', 'Barra de dominadas'];
const requirements = { 'Barra y banco': ['Barra', 'Banco'], 'Mancuernas y banco': ['Mancuernas', 'Banco'] };
const timedExercise = 'c1700000-0000-4000-8000-000000000021';
export const defaultConfig = () => ({ modality: 'session', level: 'Principiante', goal: 'hypertrophy', frequency: 3, minutes: 30, muscles: [], priorities: [], equipment: [...EQUIPMENT] });

export function equipmentOptions(exercises) {
  return [...new Set([...EQUIPMENT, ...exercises.flatMap((exercise) => requirements[exercise.equipment] ?? [exercise.equipment])])].sort((a, b) => a.localeCompare(b, 'es'));
}
export function validateConfig(input, exercises) {
  if (!input || !['session', 'program'].includes(input.modality) || !LEVELS.includes(input.level) || !Object.hasOwn(GOALS, input.goal)) throw new Error('Selecciona una modalidad, nivel y objetivo válidos.');
  if (!Array.isArray(input.muscles) || !input.muscles.length || input.muscles.some((group) => !MUSCLE_GROUPS.includes(group))) throw new Error('Selecciona al menos un grupo muscular en el mapa o la lista.');
  if (!Array.isArray(input.priorities) || input.priorities.some((group) => !input.muscles.includes(group))) throw new Error('Los grupos prioritarios deben estar seleccionados.');
  if (!Array.isArray(input.equipment) || !input.equipment.length || input.equipment.some((item) => !equipmentOptions(exercises).includes(item))) throw new Error('Selecciona el equipamiento que tienes disponible.');
  if (!Number.isInteger(Number(input.minutes)) || Number(input.minutes) < 15 || Number(input.minutes) > 120) throw new Error('La duración debe ser un entero entre 15 y 120 minutos.');
  if (!Number.isInteger(Number(input.frequency)) || Number(input.frequency) < 1 || Number(input.frequency) > 6) throw new Error('La frecuencia debe estar entre 1 y 6 sesiones.');
  return { ...input, frequency: Number(input.frequency), minutes: Number(input.minutes), muscles: MUSCLE_GROUPS.filter((group) => input.muscles.includes(group)), priorities: MUSCLE_GROUPS.filter((group) => input.priorities.includes(group)), equipment: [...new Set(input.equipment)].sort() };
}

export function compatibleExercises(exercises, config) {
  return exercises.filter((exercise) => UUID.test(exercise.id) && typeof exercise.name === 'string' && exercise.name.trim() && config.muscles.includes(exercise.mainMuscle) &&
    LEVELS.includes(exercise.difficulty) && LEVELS.indexOf(exercise.difficulty) <= LEVELS.indexOf(config.level) && exercise.id !== timedExercise &&
    (requirements[exercise.equipment] ?? [exercise.equipment]).every((item) => config.equipment.includes(item)))
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function targets(config) {
  const level = LEVELS.indexOf(config.level);
  if (config.goal === 'strength') return { sets: [3, 4, 5][level], repsMin: [5, 4, 3][level], repsMax: [6, 6, 5][level], restSeconds: [150, 180, 180][level] };
  if (config.goal === 'conditioning') return { sets: [2, 3, 3][level], repsMin: 12, repsMax: [15, 15, 20][level], restSeconds: 45 };
  return { sets: [2, 3, 4][level], repsMin: 8, repsMax: 12, restSeconds: [75, 90, 90][level] };
}
export function estimateSeconds(session) {
  // Five minutes of preparation, one minute per exercise transition, four
  // seconds per target repetition, and rest only between sets of an exercise.
  return 300 + session.prescriptions.reduce((sum, item) => sum + 60 + Number(item.sets) * Number(item.repsMax) * 4 + Math.max(0, Number(item.sets) - 1) * Number(item.restSeconds), 0);
}
export const estimateMinutes = (session) => Math.ceil(estimateSeconds(session) / 60);

function partitions(config) {
  if (config.modality === 'session' || config.frequency === 1) return [config.muscles];
  const groups = config.frequency === 2 || config.frequency === 4 ?
    [['Pecho', 'Espalda', 'Hombros', 'Brazos'], ['Piernas', 'Core']] :
    [['Pecho', 'Hombros'], ['Espalda', 'Brazos'], ['Piernas', 'Core']];
  let result = groups.map((bucket) => config.muscles.filter((group) => bucket.includes(group))).filter((bucket) => bucket.length);
  // With upper/lower unavailable, split the selected upper groups rather than
  // putting every selected muscle in every consecutive session.
  if (result.length === 1 && config.muscles.length > 1) result = [config.muscles.filter((_, index) => index % 2 === 0), config.muscles.filter((_, index) => index % 2 === 1)];
  return result;
}

export function generateRoutine(input, catalog) {
  const config = validateConfig(input, catalog);
  const eligible = compatibleExercises(catalog, config);
  const missing = config.muscles.filter((group) => !eligible.some((exercise) => exercise.mainMuscle === group));
  if (missing.length) throw new Error(`No hay ejercicios compatibles para: ${missing.join(', ')}. Añade equipamiento, revisa el nivel o retira esos grupos. Los personalizados necesitan un nivel asignado; los ejercicios por tiempo no se proponen como repeticiones.`);
  const routine = newRoutine(config.modality === 'session' ? 'Mi sesión generada' : 'Mi programa generado', `${GOALS[config.goal]} · ${config.level}. Propuesta local editable.`, '');
  routine.origin = 'generator';
  routine.generator = { version: 1, config: structuredClone(config) };
  const buckets = partitions(config);
  const count = config.modality === 'session' ? 1 : config.frequency;
  const use = new Map();
  const warnings = new Set();
  let previous = new Set();
  const target = targets(config);
  for (let index = 0; index < count; index++) {
    const muscles = buckets[index % buckets.length];
    const ordered = [...muscles].sort((a, b) => Number(config.priorities.includes(b)) - Number(config.priorities.includes(a)) || MUSCLE_GROUPS.indexOf(a) - MUSCLE_GROUPS.indexOf(b));
    const session = newSession(routine.id, `Sesión ${index + 1} · ${muscles.join(' / ')}`.slice(0, 80));
    const selected = new Set();
    const groupCounts = new Map();
    function pick(group) {
      return eligible.filter((exercise) => exercise.mainMuscle === group && !selected.has(exercise.id)).sort((a, b) =>
        Number(previous.has(a.id)) - Number(previous.has(b.id)) || (use.get(a.id) ?? 0) - (use.get(b.id) ?? 0) || a.id.localeCompare(b.id))[0];
    }
    function add(exercise) {
      selected.add(exercise.id);
      groupCounts.set(exercise.mainMuscle, (groupCounts.get(exercise.mainMuscle) ?? 0) + 1);
      use.set(exercise.id, (use.get(exercise.id) ?? 0) + 1);
      session.prescriptions.push({ ...prescription(exercise.id), ...target, order: session.prescriptions.length });
    }
    for (const group of ordered) add(pick(group));
    if (estimateSeconds(session) > config.minutes * 60) throw new Error(`Los grupos de «${session.name}» requieren al menos ${estimateMinutes(session)} min con estos objetivos. Aumenta la duración, reduce grupos o elige otro objetivo. No se ha reemplazado tu propuesta anterior.`);
    while (session.prescriptions.length < 8) {
      const candidates = ordered.map((group) => ({ group, exercise: pick(group) })).filter((item) => item.exercise)
        .sort((a, b) => (groupCounts.get(a.group) ?? 0) / (config.priorities.includes(a.group) ? 2 : 1) - (groupCounts.get(b.group) ?? 0) / (config.priorities.includes(b.group) ? 2 : 1) || ordered.indexOf(a.group) - ordered.indexOf(b.group));
      const next = candidates.find(({ exercise }) => estimateSeconds({ prescriptions: [...session.prescriptions, { ...target, exerciseId: exercise.id }] }) <= config.minutes * 60);
      if (!next) break;
      add(next.exercise);
    }
    if (estimateSeconds(session) < config.minutes * 60 * .7) warnings.add('Algunas sesiones serán más cortas que la duración solicitada por la disponibilidad de ejercicios o el límite de 8 por sesión. No se repiten ejercicios dentro de una sesión para rellenar tiempo.');
    routine.sessions.push(session);
    previous = selected;
  }
  if (count > 1 && (buckets.length === 1 || count % buckets.length === 1)) warnings.add('Con esta selección hay grupos que se repiten en sesiones consecutivas o al volver al inicio del ciclo. La frecuencia es una referencia; puedes organizar descansos entre sesiones sin días obligatorios.');
  routine.nextSessionId = routine.sessions[0].id;
  return { routine: validateRoutine(routine), eligible, warnings: [...warnings], config };
}
