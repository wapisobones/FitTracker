import { BASE_EXERCISES, MUSCLE_GROUPS, DIFFICULTIES } from '../../data/exercises.js';
import { assertMode, createRepository } from '../../db/repository.js';
import { DATABASES } from '../../db/schema.js';
import { transact } from '../../db/indexed-db.js';
import { validateExerciseAnatomy } from '../../data/muscle-taxonomy.js';

const baseIds = new Set(BASE_EXERCISES.map((exercise) => exercise.id));
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function validateExerciseInput(input) {
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  const equipment = typeof input.equipment === 'string' ? input.equipment.trim().replace(/\s+/g, ' ') : '';
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (name.length < 2 || name.length > 80 || controls.test(name)) throw new Error('El nombre debe tener entre 2 y 80 caracteres válidos.');
  if (!MUSCLE_GROUPS.includes(input.mainMuscle)) throw new Error('Selecciona un grupo muscular válido.');
  if (equipment.length < 2 || equipment.length > 80 || controls.test(equipment)) throw new Error('El equipamiento debe tener entre 2 y 80 caracteres válidos.');
  if (notes.length > 2000 || controls.test(notes)) throw new Error('Las notas admiten hasta 2000 caracteres válidos.');
  const difficulty = input.difficulty ?? 'Sin especificar';
  if (!DIFFICULTIES.includes(difficulty)) throw new Error('Selecciona una dificultad válida.');
  return { name, mainMuscle: input.mainMuscle, equipment, notes, difficulty, ...validateExerciseAnatomy(input) };
}

function validateStored(record) {
  if (!record || !uuid.test(record.id) || baseIds.has(record.id) || record.origin !== 'custom' || typeof record.notes !== 'string' || !Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.updatedAt))) throw new Error('Hay un ejercicio personalizado con formato no válido. No se ha modificado ni eliminado.');
  return { ...record, ...validateExerciseInput(record), secondaryMuscles: [], technique: null, visual: null, video: null };
}

export function exerciseService(mode) {
  assertMode(mode);
  const repository = createRepository(mode);

  async function change(id, expectedUpdatedAt, update, protectReferences = false) {
    if (!uuid.test(id) || baseIds.has(id)) throw new Error('Solo puedes modificar ejercicios personalizados.');
    let domainError;
    try {
      return await transact(DATABASES[mode], protectReferences ? ['exercises', 'routineSessions'] : ['exercises'], 'readwrite', (transaction, result) => {
        const store = transaction.objectStore('exercises');
        store.get(id).onsuccess = (event) => {
          try {
            const current = validateStored(event.target.result);
            if (current.updatedAt !== expectedUpdatedAt) throw new Error('Este ejercicio cambió en otra pestaña. Cierra el formulario y recarga la biblioteca antes de editarlo.');
            if (protectReferences) transaction.objectStore('routineSessions').getAll().onsuccess = (sessionsEvent) => {
              try {
                const sessions = sessionsEvent.target.result;
                if (sessions.some((session) => !Array.isArray(session.prescriptions))) throw new Error('No se pudieron comprobar las referencias de las sesiones. No se ha eliminado el ejercicio.');
                if (sessions.some((session) => session.prescriptions.some((item) => item.exerciseId === id))) throw new Error('Este ejercicio está utilizado en una rutina. Quítalo de sus sesiones antes de eliminarlo del catálogo.');
                update(store, current, result);
              } catch (error) { domainError = error; transaction.abort(); }
            };
            else update(store, current, result);
          } catch (error) {
            domainError = error;
            transaction.abort();
          }
        };
      });
    } catch (error) { throw domainError ?? error; }
  }

  return Object.freeze({
    async list() {
      const custom = (await repository.getAll('exercises')).map(validateStored);
      return [...BASE_EXERCISES, ...custom];
    },
    async create(input) {
      const fields = validateExerciseInput(input);
      const now = new Date().toISOString();
      const exercise = { ...fields, id: crypto.randomUUID(), origin: 'custom', secondaryMuscles: [], technique: null, visual: null, video: null, createdAt: now, updatedAt: now };
      await repository.add('exercises', exercise);
      return exercise;
    },
    async edit(exercise, input) {
      const fields = validateExerciseInput(input);
      return change(exercise.id, exercise.updatedAt, (store, current, result) => {
        const updated = { ...current, ...fields, updatedAt: new Date().toISOString() };
        validateExerciseAnatomy(updated);
        store.put(updated);
        result(updated);
      });
    },
    remove: (exercise) => change(exercise.id, exercise.updatedAt, (store) => store.delete(exercise.id), true),
  });
}
