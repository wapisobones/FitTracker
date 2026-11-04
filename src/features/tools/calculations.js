import { toKg, fromKg } from '../../utils/units.js';

function numeric(value, label, min, max, integer = false) {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max || (integer && !Number.isInteger(Number(value)))) throw new Error(`${label}: introduce ${integer ? 'un entero' : 'un número'} entre ${min} y ${max}.`);
  return Number(value);
}
export function estimate1RM(weight, repetitions, unit = 'kg') {
  if (!['kg', 'lb'].includes(unit)) throw new Error('Unidad no válida.');
  const load = numeric(weight, `Peso (${unit})`, 0.01, fromKg(2000, unit));
  const reps = numeric(repetitions, 'Repeticiones', 1, 10, true);
  const kg = toKg(load, unit);
  return { weightKg: kg, reps, estimatedKg: kg * (1 + reps / 30) };
}
export const ACTIVITIES = Object.freeze({
  sedentary: { label: 'Sedentaria · factor 1,2', factor: 1.2, detail: 'Poco movimiento diario y sin ejercicio habitual.' },
  light: { label: 'Ligera · factor 1,375', factor: 1.375, detail: 'Actividad ligera o ejercicio 1–3 días por semana.' },
  moderate: { label: 'Moderada · factor 1,55', factor: 1.55, detail: 'Actividad moderada o ejercicio 3–5 días por semana.' },
  high: { label: 'Alta · factor 1,725', factor: 1.725, detail: 'Actividad elevada o ejercicio 6–7 días por semana.' },
  veryHigh: { label: 'Muy alta · factor 1,9', factor: 1.9, detail: 'Trabajo físico y entrenamiento intenso frecuente.' },
});
export const ENERGY_GOALS = Object.freeze({ deficit: { label: 'Déficit (−15 %)', factor: .85 }, maintenance: { label: 'Mantenimiento', factor: 1 }, surplus: { label: 'Superávit (+10 %)', factor: 1.1 } });
export function estimateCalories(input, unit = 'kg') {
  if (!['kg', 'lb'].includes(unit) || !['male', 'female'].includes(input.sex) || !Object.hasOwn(ACTIVITIES, input.activity) || !Object.hasOwn(ENERGY_GOALS, input.goal)) throw new Error('Selecciona sexo de la fórmula, actividad y objetivo válidos.');
  const age = numeric(input.age, 'Edad (años)', 18, 100, true);
  const weightKg = toKg(numeric(input.weight, `Peso (${unit})`, fromKg(30, unit), fromKg(350, unit)), unit);
  const height = numeric(input.height, 'Estatura (cm)', 120, 230);
  const basal = 10 * weightKg + 6.25 * height - 5 * age + (input.sex === 'male' ? 5 : -161);
  if (basal <= 0) throw new Error('Los datos no permiten una estimación válida. Revisa las entradas.');
  const activity = ACTIVITIES[input.activity].factor;
  const tdee = basal * activity;
  const target = tdee * ENERGY_GOALS[input.goal].factor;
  return { basal, activity, tdee, target, goal: input.goal, protein: target * .3 / 4, carbs: target * .4 / 4, fat: target * .3 / 9 };
}
