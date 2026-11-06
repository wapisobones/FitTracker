// Presentation of existing primary-group counts; never reads or recounts sets.
export const HEAT_LEVELS = {
  none: { label: 'Sin series', color: '#8c959f' },
  low: { label: 'Bajo', color: '#9bf45c' },
  medium: { label: 'Medio', color: '#ffc244' },
  high: { label: 'Alto', color: '#f87171' },
};

// Calendar days, including today, without DST-dependent 23/25-hour divisions.
const calendarDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
export function heatmapDays({ start, end }, firstDate) {
  const beginning = start ?? firstDate ?? end;
  return Math.max(7, calendarDay(end) - calendarDay(beginning));
}

export function muscleHeat(count, days = 7) {
  const weekly = count * 7 / days;
  const level = count <= 0 ? 'none' : weekly < 6 ? 'low' : weekly < 12 ? 'medium' : 'high';
  return { ...HEAT_LEVELS[level], level, weekly };
}
