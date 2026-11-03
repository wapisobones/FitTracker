export const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const invalidControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function text(value, label, max, required = false) {
  if (typeof value !== 'string' || invalidControls.test(value)) throw new Error(`${label}: introduce texto válido.`);
  const result = value.trim();
  if (result.length > max || (required && result.length < 2)) throw new Error(`${label}: ${required ? 'entre 2 y' : 'hasta'} ${max} caracteres.`);
  return result;
}

function integer(value, label, min, max) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) throw new Error(`${label}: introduce un entero entre ${min} y ${max}.`);
  return Number(value);
}

export function prescription(exerciseId) {
  return { id: crypto.randomUUID(), exerciseId, order: 0, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90, notes: '' };
}

export function newSession(routineId, name = 'Sesión 1') {
  return { id: crypto.randomUUID(), routineId, name, order: 0, prescriptions: [] };
}

export function newRoutine(name = '', description = '', sessionName = 'Sesión 1') {
  const id = crypto.randomUUID();
  const sessions = sessionName ? [newSession(id, sessionName)] : [];
  return { id, name, description, origin: 'manual', revision: 0, sessions, nextSessionId: sessions[0]?.id ?? null, cyclePolicy: 'sequential-wrap' };
}

export function validateRoutine(input) {
  if (!input || !UUID.test(input.id) || !['manual', 'template', 'copy', 'generator'].includes(input.origin) || !Array.isArray(input.sessions)) throw new Error('La rutina tiene un formato no válido. No se ha modificado.');
  if (input.sessions.length > 30) throw new Error('Cada rutina admite hasta 30 sesiones.');
  const identities = new Set();
  function identity(id) {
    if (!UUID.test(id) || identities.has(id)) throw new Error('La rutina contiene identificadores no válidos o repetidos.');
    identities.add(id);
  }
  identity(input.id);
  const sessions = Array.from(input.sessions).map((session, order) => {
    if (!session || session.routineId !== input.id || !Array.isArray(session.prescriptions)) throw new Error('Una sesión tiene un formato no válido.');
    if (session.prescriptions.length > 50) throw new Error('Cada sesión admite hasta 50 ejercicios planificados.');
    identity(session.id);
    return { ...session, order, name: text(session.name, 'Nombre de sesión', 80, true), prescriptions: Array.from(session.prescriptions).map((item, position) => {
      if (!item || !UUID.test(item.exerciseId)) throw new Error('La sesión contiene una referencia de ejercicio no válida.');
      identity(item.id);
      const repsMin = integer(item.repsMin, 'Repeticiones mínimas', 1, 100);
      const repsMax = integer(item.repsMax, 'Repeticiones máximas', 1, 100);
      if (repsMin > repsMax) throw new Error('Las repeticiones mínimas no pueden superar las máximas. Para un valor fijo, usa el mismo número en ambos campos.');
      return { ...item, order: position, sets: integer(item.sets, 'Series', 1, 20), repsMin, repsMax, restSeconds: integer(item.restSeconds, 'Descanso en segundos', 0, 900), notes: text(item.notes, 'Notas', 1000) };
    }) };
  });
  return { ...input, name: text(input.name, 'Nombre de rutina', 80, true), description: text(input.description, 'Descripción', 1000), sessions, nextSessionId: sessions.some((session) => session.id === input.nextSessionId) ? input.nextSessionId : sessions[0]?.id ?? null, cyclePolicy: 'sequential-wrap' };
}

export function hydrateRoutine(record, allSessions) {
  if (!record || !Array.isArray(record.sessionIds) || !Number.isInteger(record.revision) || record.revision < 1 || !Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.updatedAt))) throw new Error('Hay una rutina guardada con un formato no válido. No se ha reemplazado ni eliminado.');
  const owned = allSessions.filter((session) => session.routineId === record.id);
  const sessions = record.sessionIds.map((id) => owned.find((session) => session.id === id));
  if (owned.length !== sessions.length || sessions.some((session) => !session)) throw new Error('La secuencia de una rutina no coincide con sus sesiones guardadas.');
  return validateRoutine({ ...record, sessions });
}

export function independentCopy(source, origin = 'copy', name = `${source.name} (copia)`) {
  const result = structuredClone(source);
  result.id = crypto.randomUUID();
  result.name = name.slice(0, 80);
  result.origin = origin;
  result.revision = 0;
  delete result.createdAt;
  delete result.updatedAt;
  delete result.creationToken;
  delete result.catalogOperationToken;
  delete result.sessionIds;
  result.sessions = result.sessions.map((session, order) => ({ ...session, id: crypto.randomUUID(), routineId: result.id, order, createdAt: undefined, updatedAt: undefined, prescriptions: session.prescriptions.map((item, position) => ({ ...item, id: crypto.randomUUID(), order: position })) }));
  result.nextSessionId = result.sessions[0]?.id ?? null;
  return result;
}
