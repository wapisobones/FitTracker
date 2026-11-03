import { DATABASES, DATA_STORES } from './schema.js';
import { transact } from './indexed-db.js';

export function assertMode(mode) {
  if (mode !== 'demo' && mode !== 'personal') throw new TypeError('El modo debe ser demo o personal.');
}

// Scope is fixed when creating a repository; there is deliberately no default.
export function createRepository(mode) {
  assertMode(mode);
  function request(store, access, operation) {
    if (!DATA_STORES.includes(store)) throw new TypeError('Almacén desconocido.');
    return transact(DATABASES[mode], [store], access, (transaction, result) => {
      operation(transaction.objectStore(store)).onsuccess = (event) => result(event.target.result);
    });
  }
  function write(store, record, method) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id.trim()) throw new TypeError('El registro necesita un id válido.');
    return request(store, 'readwrite', (objectStore) => objectStore[method](record));
  }
  return Object.freeze({
    get: (store, id) => request(store, 'readonly', (objectStore) => objectStore.get(id)),
    getAll: (store) => request(store, 'readonly', (objectStore) => objectStore.getAll()),
    count: (store) => request(store, 'readonly', (objectStore) => objectStore.count()),
    add: (store, record) => write(store, record, 'add'),
    put: (store, record) => write(store, record, 'put'),
  });
}
