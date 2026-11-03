export const DATABASE_VERSION = 1;
export const DATABASES = Object.freeze({
  app: 'fittracker-app',
  demo: 'fittracker-demo',
  personal: 'fittracker-personal',
});

// Both data scopes share this schema. Configuration has its own settings store.
export const DATA_STORES = Object.freeze([
  'exercises', 'routines', 'routineSessions', 'workouts', 'setRecords', 'profiles', 'settings',
]);

export function upgradeSchema(database, oldVersion, configurationOnly, transaction) {
  if (oldVersion < 1) {
    const names = configurationOnly ? ['settings'] : DATA_STORES;
    for (const name of names) database.createObjectStore(name, { keyPath: 'id' });
    if (!configurationOnly) {
      transaction.objectStore('routineSessions').createIndex('routineId', 'routineId');
      transaction.objectStore('workouts').createIndex('startedAt', 'startedAt');
      transaction.objectStore('setRecords').createIndex('workoutId', 'workoutId');
      transaction.objectStore('setRecords').createIndex('exerciseId', 'exerciseId');
    }
  }
}
