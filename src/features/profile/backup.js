import { DATA_STORES, DATABASES } from '../../db/schema.js';
import { transact, storageError } from '../../db/indexed-db.js';
import { BASE_EXERCISES } from '../../data/exercises.js';
import { validateExerciseInput } from '../exercises/exercise-service.js';
import { UUID, hydrateRoutine } from '../routines/model.js';
import { assertDraft, realValues } from '../workouts/model.js';
import { validateAlias, validateGoals, validatePreferences } from './profile-service.js';

export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const fail = (message) => { throw new Error(`Respaldo no válido: ${message}`); };
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = (value) => JSON.stringify(value, (_, item) => object(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
const identity = (id) => { if (typeof id !== 'string' || !UUID.test(id)) fail('identificador UUID incorrecto.'); };
const iso = (value) => { if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail('fecha ISO incorrecta.'); };
const text = (value, max, min = 0) => { if (typeof value !== 'string' || value.length < min || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail('texto fuera de formato.'); };
const integer = (value, min, max) => { if (!Number.isInteger(value) || value < min || value > max) fail('entero fuera de rango.'); };
const unique = (list) => { if (new Set(list).size !== list.length) fail('identificadores repetidos.'); };

// Bound parsed content before traversing domain relationships. Never merge JSON
// objects into configuration/prototypes or render their strings as HTML.
function safeTree(value) {
  let nodes = 0;
  function walk(item, depth) {
    if (++nodes > 600000 || depth > 18) fail('contenido demasiado complejo.');
    if (typeof item === 'string') { text(item, 10000); return; }
    if (item === null || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) return;
    if (!object(item) && !Array.isArray(item)) fail('contenido no compatible con JSON.');
    if (Array.isArray(item) && item.length > 100000) fail('demasiados elementos.');
    for (const [key, child] of Object.entries(item)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('clave no permitida.');
      walk(child, depth + 1);
    }
  }
  walk(value, 0);
}
function prescription(item, order) {
  if (!object(item)) fail('prescripción incorrecta.');
  identity(item.id); identity(item.exerciseId);
  if (item.order !== order) fail('orden de ejercicios incoherente.');
  integer(item.sets, 1, 20); integer(item.repsMin, 1, 100); integer(item.repsMax, item.repsMin, 100); integer(item.restSeconds, 0, 900); text(item.notes, 1000);
}
function exercise(item, custom = false) {
  if (!object(item)) fail('ejercicio incorrecto.');
  identity(item.id); text(item.name, 80, 2); text(item.equipment, 80, 2); text(item.notes, 2000); validateExerciseInput(item);
  if (!['base', 'custom'].includes(item.origin) || (custom && item.origin !== 'custom')) fail('origen de ejercicio incorrecto.');
  if (!Array.isArray(item.secondaryMuscles) || item.secondaryMuscles.length > 20 || item.secondaryMuscles.some((muscle) => typeof muscle !== 'string' || muscle.length > 80)) fail('músculos secundarios incorrectos.');
  if (item.origin === 'custom') {
    iso(item.createdAt); iso(item.updatedAt);
    if (item.video !== null || item.visual !== null || item.technique !== null) fail('medios personalizados no admitidos.');
  } else {
    if (!BASE_EXERCISES.some((base) => base.id === item.id) || item.video !== null || !BASE_EXERCISES.some((base) => base.visual === item.visual)) fail('recurso de biblioteca desconocido.');
    if (!object(item.technique) || !Array.isArray(item.technique.steps) || !Array.isArray(item.technique.tips) || [...item.technique.steps, ...item.technique.tips].some((step) => typeof step !== 'string' || step.length > 2000)) fail('técnica de ejercicio incorrecta.');
  }
}
function setValues(set) {
  if (typeof set.weightKg !== 'number' || typeof set.reps !== 'number') fail('valores de serie incorrectos.');
  realValues(set.weightKg, set.reps); iso(set.completedAt);
}
export function validateBackup(input) {
  safeTree(input);
  if (!object(input) || input.app !== 'FitTracker' || input.scope !== 'personal' || input.schemaVersion !== BACKUP_VERSION) fail('aplicación, ámbito o versión no admitidos.');
  iso(input.exportedAt);
  if (!object(input.stores) || Object.keys(input.stores).length !== DATA_STORES.length) fail('deben incluirse todos los almacenes.');
  const data = input.stores;
  const maps = {};
  for (const name of DATA_STORES) {
    if (!Array.isArray(data[name]) || data[name].length > 100000 || data[name].some((record) => !object(record) || typeof record.id !== 'string')) fail(`almacén ${name} incorrecto.`);
    unique(data[name].map((record) => record.id));
    maps[name] = new Map(data[name].map((record) => [record.id, record]));
    if (!['settings', 'profiles'].includes(name)) for (const record of data[name]) identity(record.id);
  }
  const catalog = new Set(BASE_EXERCISES.map((item) => item.id));
  for (const item of data.exercises) {
    exercise(item, true);
    if (catalog.has(item.id)) fail('un personalizado reemplaza la biblioteca.');
    catalog.add(item.id);
  }
  const planningIds = new Set();
  const planningId = (id) => { identity(id); if (planningIds.has(id)) fail('identidades repetidas en la planificación.'); planningIds.add(id); };
  for (const routine of data.routines) {
    planningId(routine.id);
    const hydrated = hydrateRoutine(routine, data.routineSessions);
    if (routine.cyclePolicy !== 'sequential-wrap' || routine.nextSessionId !== hydrated.nextSessionId) fail('ciclo de rutina incorrecto.');
    if (routine.sessionIds.length !== new Set(routine.sessionIds).size) fail('sesiones repetidas.');
    iso(routine.createdAt); iso(routine.updatedAt);
    if (routine.creationToken !== undefined) identity(routine.creationToken);
    if (routine.catalogOperationToken !== undefined) identity(routine.catalogOperationToken);
    for (const [order, session] of hydrated.sessions.entries()) {
      planningId(session.id); iso(session.createdAt); iso(session.updatedAt);
      if (session.order !== order || maps.routineSessions.get(session.id).order !== order) fail('orden de sesiones incorrecto.');
      for (const [position, item] of maps.routineSessions.get(session.id).prescriptions.entries()) {
        prescription(item, position); planningId(item.id);
        if (!catalog.has(item.exerciseId)) fail('ejercicio inexistente en una sesión.');
      }
    }
  }
  if (data.routineSessions.some((session) => !maps.routines.has(session.routineId))) fail('sesión sin rutina.');
  let active = null;
  const performed = new Map();
  const setIds = new Set();
  for (const workout of data.workouts) {
    if (workout.formatVersion !== 1 || !['active', 'paused', 'complete', 'partial'].includes(workout.status) || workout.origin !== undefined) fail('entrenamiento incompatible.');
    integer(workout.revision, 1, Number.MAX_SAFE_INTEGER);
    iso(workout.startedAt); iso(workout.updatedAt); text(workout.routineName, 80, 2); text(workout.sessionName, 80, 2);
    identity(workout.routineId); identity(workout.sessionId); integer(workout.routineRevision, 1, Number.MAX_SAFE_INTEGER);
    // Historical references can point to deleted plans/custom exercises. Their
    // snapshots, rather than today's catalog, define the recovered history.
    if (!object(workout.sessionSnapshot) || workout.sessionSnapshot.id !== workout.sessionId || workout.sessionSnapshot.routineId !== workout.routineId || !Array.isArray(workout.entries) || !workout.entries.length || workout.entries.length > 50 || !Array.isArray(workout.sessionSnapshot.prescriptions) || workout.sessionSnapshot.prescriptions.length !== workout.entries.length) fail('snapshot de sesión incoherente.');
    text(workout.sessionSnapshot.name, 80, 2);
    const final = ['complete', 'partial'].includes(workout.status);
    if (final) {
      iso(workout.endedAt);
      if (Date.parse(workout.endedAt) < Date.parse(workout.startedAt) || workout.timer !== null || workout.currentExercise !== null) fail('cierre de entrenamiento incorrecto.');
    } else {
      assertDraft(workout);
      if (active || workout.endedAt !== null) fail('más de un entrenamiento pendiente o cierre incorrecto.');
      active = workout;
    }
    const prescriptionIds = [];
    let completed = 0;
    for (const [order, entry] of workout.entries.entries()) {
      if (!object(entry)) fail('entrada de entrenamiento incorrecta.');
      exercise(entry.exercise); prescription(entry.prescription, order);
      prescriptionIds.push(entry.prescription.id);
      const snapshot = workout.sessionSnapshot.prescriptions[order];
      prescription(snapshot, order);
      if (canonical(snapshot) !== canonical(entry.prescription) || entry.exercise.id !== entry.prescription.exerciseId || !Array.isArray(entry.sets) || entry.sets.length > entry.prescription.sets) fail('objetivos o series incoherentes.');
      const positions = [];
      for (const set of entry.sets) {
        if (!object(set)) fail('serie incorrecta.');
        identity(set.id); if (setIds.has(set.id)) fail('series repetidas.'); setIds.add(set.id);
        integer(set.position, 0, entry.prescription.sets - 1); positions.push(set.position);
        if (typeof set.completed !== 'boolean') fail('estado de serie incorrecto.');
        if (set.reference !== null) {
          if (!object(set.reference) || typeof set.reference.weightKg !== 'number' || typeof set.reference.reps !== 'number') fail('referencia anterior incorrecta.');
          realValues(set.reference.weightKg, set.reference.reps); iso(set.reference.endedAt);
        }
        if (set.completed) { setValues(set); completed++; }
        else {
          if (final || set.completedAt !== null || !['string', 'number'].includes(typeof set.weightKg) || !['string', 'number'].includes(typeof set.reps) || String(set.weightKg).length > 24 || String(set.reps).length > 24) fail('borrador de serie incorrecto.');
        }
        if (final) {
          if (!set.completed || set.workoutId !== workout.id || set.exerciseId !== entry.exercise.id || set.prescriptionId !== entry.prescription.id || set.exerciseOrder !== order) fail('referencias de serie incorrectas.');
          performed.set(set.id, set);
        }
      }
      unique(positions);
      if ((!final || workout.status === 'complete') && positions.length !== entry.prescription.sets) fail('faltan series.');
      if (!final && positions.some((position, index) => position !== index)) fail('orden del borrador incorrecto.');
    }
    unique(prescriptionIds);
    if (final && !completed) fail('historial sin series completadas.');
  }
  if (performed.size !== data.setRecords.length) fail('historial y series no coinciden.');
  for (const set of data.setRecords) {
    const snapshot = performed.get(set.id);
    if (!snapshot || canonical(set) !== canonical(snapshot)) fail('una serie no coincide con su snapshot.');
  }
  if (data.profiles.length > 1 || data.profiles.some((profile) => profile.id !== 'local-profile')) fail('perfil local incorrecto.');
  for (const profile of data.profiles) { validateAlias(profile.alias); iso(profile.updatedAt); }
  for (const setting of data.settings) {
    if (setting.id === 'preferences') validatePreferences(setting);
    else if (setting.id === 'weekly-goals') validateGoals(setting);
    else if (setting.id === 'active-workout') { if (!active || setting.workoutId !== active.id) fail('puntero de entrenamiento incorrecto.'); }
    else fail('configuración desconocida.');
    if (setting.updatedAt !== undefined) iso(setting.updatedAt);
  }
  if (active && maps.settings.get('active-workout')?.workoutId !== active.id) fail('falta el puntero del entrenamiento pendiente.');
  return structuredClone(input);
}
export function parseBackup(content) {
  if (typeof content !== 'string' || new TextEncoder().encode(content).length > MAX_BACKUP_BYTES) fail('el archivo supera 20 MiB.');
  let parsed;
  try { parsed = JSON.parse(content); } catch { fail('el archivo no contiene JSON legible.'); }
  return validateBackup(parsed);
}
export const backupCounts = (data) => Object.fromEntries(DATA_STORES.map((name) => [name, data[name].length]));
export function readPersonalData() {
  return transact(DATABASES.personal, DATA_STORES, 'readonly', (tx, result) => {
    const data = {};
    let pending = DATA_STORES.length;
    for (const name of DATA_STORES) tx.objectStore(name).getAll().onsuccess = (event) => { data[name] = event.target.result; if (--pending === 0) result(data); };
  });
}
export async function exportPersonalBackup() {
  return validateBackup({ app: 'FitTracker', scope: 'personal', schemaVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), stores: await readPersonalData() });
}
function sameData(a, b) { return DATA_STORES.every((name) => JSON.stringify(a[name]) === JSON.stringify(b[name])); }
async function replacePersonal(data, expected) {
  let failure;
  try {
    return await transact(DATABASES.personal, DATA_STORES, 'readwrite', (tx) => {
      const current = {};
      let pending = DATA_STORES.length;
      for (const name of DATA_STORES) tx.objectStore(name).getAll().onsuccess = (event) => {
        current[name] = event.target.result;
        if (--pending) return;
        try {
          if (!sameData(current, expected)) throw new Error('Los datos personales cambiaron desde la vista previa. Cancela y vuelve a revisar la operación.');
          for (const store of DATA_STORES) {
            const objectStore = tx.objectStore(store);
            objectStore.clear();
            for (const record of data[store]) objectStore.add(record);
          }
        } catch (error) { failure = error; tx.abort(); }
      };
    });
  } catch (error) { throw failure instanceof DOMException ? storageError(failure) : failure ?? error; }
}
// No mode argument: neither operation can write to the demo or app database.
export function restorePersonalBackup(backup, expected) { return replacePersonal(validateBackup(backup).stores, expected); }
export function resetPersonalData(expected) { return replacePersonal(Object.fromEntries(DATA_STORES.map((name) => [name, []])), expected); }
