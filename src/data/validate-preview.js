import { StorageError } from '../db/indexed-db.js';

const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= 200;
const list = (value, max) => Array.isArray(value) && value.length > 0 && value.length <= max && Array.from(value).every((item) => item !== undefined);
const percent = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const symbols = ['dumbbell', 'weight', 'flame', 'calendar', 'chart'];

export function validatePreview(record) {
  const data = record?.data;
  const valid = record?.previewVersion === 1 && data
    && text(data.period) && text(data.week) && text(data.exercise)
    && list(data.metrics, 4) && data.metrics.length === 4
    && data.metrics.every((metric) => metric && symbols.includes(metric.symbol) && text(metric.label) && text(metric.value) && text(metric.detail) && (metric.unit === undefined || text(metric.unit)) && (metric.decoration === undefined || ['trophy', 'trend', 'ring'].includes(metric.decoration)) && (metric.decoration !== 'ring' || percent(metric.completionPercent)))
    && list(data.load, 100) && data.load.every((value) => Number.isFinite(value) && value >= 0 && value <= 1000)
    && list(data.muscles, 12) && data.muscles.every((group) => Array.isArray(group) && text(group[0]) && percent(group[1]))
    && Array.isArray(data.workouts) && data.workouts.length <= 20
    && Array.from(data.workouts).every((workout) => workout && ['day', 'date', 'title', 'detail'].every((field) => text(workout[field])))
    && list(data.goals, 10) && data.goals.every((goal) => goal && symbols.includes(goal.symbol) && text(goal.title) && text(goal.value) && percent(goal.percent));
  if (!valid) throw new StorageError('No se puede leer el ejemplo guardado. Puedes reintentar o restablecer únicamente la demostración desde Cambiar modo.');
  return data;
}
