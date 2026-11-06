// Pure calculations shared by Dashboard and Progress. No writes or catalog
// lookups: historical names and muscles always come from the workout snapshot.
import { recordingMode } from '../../data/recording-modes.js';
import { validRecordedSet } from '../workouts/model.js';
import { validateTargets } from '../../data/prescription-targets.js';
export const PERIODS = { week: 'Esta semana', month: 'Este mes', '30': 'Últimos 30 días', '90': 'Últimos 90 días', all: 'Todo el historial' };
export const number = (value, digits = 1) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(value);
export const dateLabel = (value, options = {}) => new Date(value).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', ...options });
export function localDay(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayDate(key) { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); }
export function weekStart(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return date;
}
export function periodBounds(period, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  let start = null;
  if (period === 'week') start = weekStart(now);
  else if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (period !== 'all') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (period === '7' ? 6 : period === '30' ? 29 : 89));
  return { start, end };
}
export function epley(weightKg, reps) {
  if (!(weightKg > 0) || !Number.isInteger(reps) || reps < 1 || reps > 10) return null;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export function normalizeHistory({ workouts = [], setRecords = [], settings = [] }) {
  const finished = new Map(workouts.filter((item) => ['complete', 'partial'].includes(item.status)).map((item) => [item.id, item]));
  const rows = [];
  const seen = new Set();
  let ignored = 0;
  for (const set of setRecords) {
    const workout = finished.get(set.workoutId);
    if (!workout || set.completed !== true) continue;
    const entry = Array.isArray(workout.entries) ? workout.entries.find((item) => item?.prescription?.id === set.prescriptionId && item?.exercise?.id === set.exerciseId) : null;
    const date = new Date(workout.endedAt);
    const key = `${set.workoutId}/${set.prescriptionId}/${set.position}`;
    let mode;
    try { mode = recordingMode(entry?.exercise); validateTargets(entry?.prescription, true); } catch { ignored++; continue; }
    if (!entry || typeof entry.exercise.name !== 'string' || !entry.exercise.name.trim() || typeof workout.endedAt !== 'string' || !Number.isFinite(date.getTime()) || typeof set.completedAt !== 'string' || !Number.isFinite(Date.parse(set.completedAt)) ||
      !Number.isInteger(entry.prescription.sets) || entry.prescription.sets < 1 || entry.prescription.sets > 20 ||
      !validRecordedSet(set, mode) ||
      !Number.isInteger(set.position) || set.position < 0 || set.position >= entry.prescription.sets || seen.has(key)) { ignored++; continue; }
    seen.add(key);
    rows.push({ ...set, date, day: localDay(date), name: entry.exercise.name, muscle: typeof entry.exercise.mainMuscle === 'string' && entry.exercise.mainMuscle.trim() ? entry.exercise.mainMuscle : 'Sin clasificar',
      exercise: entry.exercise, prescription: entry.prescription, workout, recordingMode: mode,
      volume: mode === 'weight_reps' ? set.weightKg * set.reps : 0, estimated1RM: mode === 'weight_reps' ? epley(set.weightKg, set.reps) : null });
  }
  rows.sort((a, b) => a.date - b.date || a.workoutId.localeCompare(b.workoutId) || a.exerciseOrder - b.exerciseOrder || a.position - b.position);
  const exercises = new Map();
  for (const row of rows) exercises.set(row.exerciseId, { id: row.exerciseId, name: row.name });
  return { rows, ignored, exercises: [...exercises.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')), goals: settings.find((item) => item.id === 'weekly-goals') ?? null };
}

export function calculate(history, { period = 'month', exerciseId = '', chartExerciseId = '', chartRecordingMode = '', strengthMetric = 'weight', now = new Date() } = {}) {
  const bounds = periodBounds(period, now);
  const inPeriod = (row) => (!bounds.start || row.date >= bounds.start) && row.date < bounds.end;
  const rows = history.rows.filter((row) => inPeriod(row) && (!exerciseId || row.exerciseId === exerciseId));
  const totalVolume = rows.reduce((sum, row) => sum + row.volume, 0);
  const exercises = new Map();
  const muscles = new Map();
  const sessions = new Map();
  for (const row of rows) {
    const exercise = exercises.get(row.exerciseId) ?? { id: row.exerciseId, name: row.name, exercise: row.exercise, sets: 0, maxLoad: null, max1RM: null };
    exercise.name = row.name;
    exercise.sets++;
    if (row.recordingMode === 'weight_reps' && (!exercise.maxLoad || row.weightKg >= exercise.maxLoad.weightKg)) exercise.maxLoad = row;
    if (row.estimated1RM !== null && (!exercise.max1RM || row.estimated1RM >= exercise.max1RM.estimated1RM)) exercise.max1RM = row;
    exercises.set(row.exerciseId, exercise);
    muscles.set(row.muscle, (muscles.get(row.muscle) ?? 0) + 1);
    const session = sessions.get(row.workoutId) ?? { workout: row.workout, date: row.date, rows: [], volume: 0, exerciseIds: new Set() };
    session.rows.push(row); session.volume += row.volume; session.exerciseIds.add(row.exerciseId);
    sessions.set(row.workoutId, session);
  }
  const records = [...exercises.values()].sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name, 'es'));
  const positiveLoad = records.find((record) => record.maxLoad?.weightKg > 0);
  const automaticExercise = strengthMetric === 'estimated1RM' ? records.find((record) => record.max1RM !== null) ?? positiveLoad : positiveLoad;
  const selectedExerciseId = exerciseId || chartExerciseId || automaticExercise?.id || records[0]?.id || '';
  // Use saved snapshots across the selected exercise's history to keep its
  // available units stable when changing period. Default to its latest snapshot;
  // mixed histories remain explicitly selectable and are never combined.
  const exerciseHistory = history.rows.filter((row) => row.exerciseId === selectedExerciseId);
  const chartRecordingModes = [...new Set(exerciseHistory.map((row) => row.recordingMode))];
  const selectedRecordingMode = chartRecordingModes.includes(chartRecordingMode) ? chartRecordingMode : exerciseHistory.at(-1)?.recordingMode ?? 'weight_reps';
  const chartRows = rows.filter((row) => row.exerciseId === selectedExerciseId && row.recordingMode === selectedRecordingMode);
  const days = new Map();
  for (const row of chartRows) {
    if (selectedRecordingMode !== 'weight_reps') {
      const field = selectedRecordingMode === 'duration' ? 'durationSeconds' : 'reps';
      const day = days.get(row.day) ?? { date: row.day, [field]: 0 };
      day[field] = Math.max(day[field], row[field]);
      days.set(row.day, day);
      continue;
    }
    const day = days.get(row.day) ?? { date: row.day, weight: 0, estimated1RM: null };
    day.weight = Math.max(day.weight, row.weightKg);
    if (row.estimated1RM !== null) day.estimated1RM = Math.max(day.estimated1RM ?? 0, row.estimated1RM);
    days.set(row.day, day);
  }
  const volumeBuckets = new Map();
  for (const row of rows) {
    const bucket = period === 'all' ? row.day.slice(0, 7) + '-01' : period === '90' ? localDay(weekStart(row.date)) : row.day;
    volumeBuckets.set(bucket, (volumeBuckets.get(bucket) ?? 0) + row.volume);
  }
  const thisWeek = periodBounds('week', now);
  const thisMonth = periodBounds('month', now);
  const weekRows = history.rows.filter((row) => row.date >= thisWeek.start && row.date < thisWeek.end);
  const monthRows = history.rows.filter((row) => row.date >= thisMonth.start && row.date < thisMonth.end);
  return { rows, totalSets: rows.length, totalVolume, records, mostWorked: records[0] ?? null,
    maxLoad: records.filter((record) => record.maxLoad).sort((a, b) => b.maxLoad.weightKg - a.maxLoad.weightKg)[0]?.maxLoad ?? null,
    max1RM: [...records].filter((item) => item.max1RM).sort((a, b) => b.max1RM.estimated1RM - a.max1RM.estimated1RM)[0]?.max1RM ?? null,
    sessions: [...sessions.values()].sort((a, b) => b.date - a.date || a.workout.id.localeCompare(b.workout.id)),
    muscles: [...muscles].map(([name, count]) => ({ name, count, percent: count / rows.length * 100 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es')),
    selectedExerciseId, selectedRecordingMode, chartRecordingModes, strength: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    volume: [...volumeBuckets].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value })),
    weekSessions: new Set(weekRows.map((row) => row.workoutId)).size, monthSessions: new Set(monthRows.map((row) => row.workoutId)).size,
    weekVolume: weekRows.reduce((sum, row) => sum + row.volume, 0), weekStart: thisWeek.start,
  };
}
