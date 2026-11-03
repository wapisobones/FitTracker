import { DATABASES, DATA_STORES } from './schema.js';
import { StorageError, storageError, transact } from './indexed-db.js';
import { assertMode, createRepository } from './repository.js';
import { demoHistory } from '../data/history-demo.js';

function addDemoHistory(transaction, data, addGoals = true) {
  for (const workout of data.workouts) transaction.objectStore('workouts').add(workout);
  for (const set of data.setRecords) transaction.objectStore('setRecords').add(set);
  if (addGoals) transaction.objectStore('settings').add({ id: 'weekly-goals', sessions: 4, volumeKg: 15000 });
  transaction.objectStore('settings').add({ id: 'history-demo-v1', seededAt: new Date().toISOString(), status: 'seeded' });
}

export async function getSavedMode() {
  const setting = await transact(DATABASES.app, ['settings'], 'readonly', (transaction, result) => {
    transaction.objectStore('settings').get('active-mode').onsuccess = (event) => result(event.target.result);
  });
  if (!setting) return null;
  if (setting.mode !== 'demo' && setting.mode !== 'personal') throw new StorageError('No se pudo recuperar la preferencia de modo. Elige un modo para guardarla de nuevo; tus datos se conservarán.');
  return setting.mode;
}

export function saveMode(mode) {
  assertMode(mode);
  return transact(DATABASES.app, ['settings'], 'readwrite', (transaction) => {
    transaction.objectStore('settings').put({ id: 'active-mode', mode, updatedAt: new Date().toISOString() });
  });
}

async function seedDemo() {
  const fixture = demoHistory();
  let failure;
  try {
    await transact(DATABASES.demo, ['settings', 'workouts', 'setRecords'], 'readwrite', (transaction) => {
      const records = {};
      let pending = 3;
      for (const name of ['settings', 'workouts', 'setRecords']) transaction.objectStore(name).getAll().onsuccess = (event) => {
        records[name] = event.target.result;
        if (--pending) return;
        try {
          if (records.settings.some((item) => item.id === 'history-demo-v1')) return;
          // Existing history (including an active draft) is user-owned. Never
          // merge synthetic sets into it or overwrite the old visual preview.
          if (records.workouts.length || records.setRecords.length) transaction.objectStore('settings').add({ id: 'history-demo-v1', status: 'preserved', seededAt: new Date().toISOString() });
          else addDemoHistory(transaction, fixture, !records.settings.some((item) => item.id === 'weekly-goals'));
        } catch (error) { failure = error; transaction.abort(); }
      };
    });
  } catch (error) { throw failure ? storageError(failure) : error; }
}

export async function loadMode(mode) {
  assertMode(mode);
  const repository = createRepository(mode);
  if (mode === 'personal') return { hasWorkouts: (await repository.getAll('workouts')).some((workout) => ['complete', 'partial'].includes(workout.status)) };
  await seedDemo();
  return {};
}

// This operation has no scope argument: it can only touch the demo database.
export function resetDemo() {
  const fixture = demoHistory();
  return transact(DATABASES.demo, DATA_STORES, 'readwrite', (transaction) => {
    for (const name of DATA_STORES) transaction.objectStore(name).clear();
    addDemoHistory(transaction, fixture);
  });
}
