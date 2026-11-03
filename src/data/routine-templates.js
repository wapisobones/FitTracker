import { BASE_EXERCISES } from './exercises.js';

const id = (number) => `d1700000-0000-4000-8000-${String(number).padStart(12, '0')}`;

function template(number, name, level, description, specifications) {
  const routineId = id(number * 1000);
  const sessions = specifications.map(([sessionName, entries], index) => ({
    id: id(number * 1000 + index + 1), routineId, name: sessionName, order: index,
    prescriptions: entries.map(([exerciseNumber, sets, repsMin, repsMax, restSeconds], position) => ({
      id: id(number * 1000 + (index + 1) * 100 + position), exerciseId: BASE_EXERCISES[exerciseNumber - 1].id, order: position, sets, repsMin, repsMax, restSeconds, notes: '',
    })),
  }));
  return { id: routineId, name, level, description, origin: 'template', revision: 0, sessions, nextSessionId: sessions[0].id, cyclePolicy: 'sequential-wrap' };
}

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

// Local editable starting points. Sessions are a sequence, not calendar days.
export const ROUTINE_TEMPLATES = freeze([
  template(1, 'Full body básico', 'Principiante', 'Dos sesiones de cuerpo completo para alternar a tu ritmo. Revisa y adapta sus objetivos antes de entrenar.', [
    ['Cuerpo completo A', [[4, 3, 8, 12, 90], [5, 3, 10, 12, 90], [10, 3, 10, 12, 120], [14, 2, 12, 15, 60], [23, 2, 10, 15, 60]]],
    ['Cuerpo completo B', [[4, 3, 8, 12, 90], [6, 3, 10, 12, 90], [10, 3, 10, 12, 120], [17, 2, 10, 12, 60], [22, 2, 8, 10, 60]]],
  ]),
  template(2, 'Torso / Pierna', 'Intermedio', 'Cuatro sesiones alternando torso y piernas. La secuencia vuelve al inicio después de su última sesión.', [
    ['Torso A', [[1, 4, 6, 8, 150], [6, 3, 8, 12, 90], [13, 3, 8, 10, 120], [19, 3, 10, 12, 60]]],
    ['Pierna A', [[9, 4, 6, 8, 180], [11, 3, 8, 10, 150], [12, 3, 8, 12, 90], [23, 3, 10, 15, 60]]],
    ['Torso B', [[2, 3, 8, 10, 120], [5, 3, 8, 12, 90], [14, 3, 12, 15, 60], [18, 3, 10, 12, 60]]],
    ['Pierna B', [[10, 4, 8, 12, 150], [11, 3, 8, 10, 150], [12, 3, 10, 12, 90], [22, 3, 8, 12, 60]]],
  ]),
  template(3, 'Push · Pull · Legs', 'Avanzado', 'Tres sesiones por patrón de movimiento. Elige la frecuencia y los descansos que encajen con tu planificación.', [
    ['Push', [[1, 4, 5, 8, 180], [2, 3, 8, 10, 120], [13, 3, 6, 10, 150], [14, 3, 12, 15, 60], [19, 3, 10, 12, 60]]],
    ['Pull', [[8, 4, 5, 8, 180], [7, 4, 6, 10, 150], [16, 3, 12, 15, 60], [17, 3, 8, 12, 90], [18, 2, 10, 12, 60]]],
    ['Legs', [[9, 4, 5, 8, 180], [11, 4, 6, 10, 150], [10, 3, 10, 12, 120], [12, 3, 8, 12, 90], [24, 3, 8, 12, 90]]],
  ]),
]);
