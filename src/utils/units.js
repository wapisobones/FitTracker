export const LB_PER_KG = 1 / 0.45359237;
export const fromKg = (value, unit = 'kg') => value * (unit === 'lb' ? LB_PER_KG : 1);
export const toKg = (value, unit = 'kg') => value / (unit === 'lb' ? LB_PER_KG : 1);
export const weightNumber = (value, unit = 'kg', digits = 1) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(fromKg(value, unit));
export const weightText = (value, unit = 'kg', digits = 1) => `${weightNumber(value, unit, digits)} ${unit}`;
// Round only the editable presentation; stored values and metrics stay in kg.
export const weightInput = (value, unit = 'kg') => value === '' ? '' : unit === 'kg' ? value : Number(fromKg(Number(value), unit).toFixed(4));
