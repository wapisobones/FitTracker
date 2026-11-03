import { DATABASES, DATA_STORES } from '../../src/db/schema.js';

// Only fresh Playwright browser contexts: no developer/user databases are touched.
export function readDatabase(page, scope) {
  return page.evaluate(({ name, stores }) => new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(stores, 'readonly');
      const result = {};
      for (const store of stores) transaction.objectStore(store).getAll().onsuccess = (event) => { result[store] = event.target.result; };
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }), { name: DATABASES[scope], stores: scope === 'app' ? ['settings'] : DATA_STORES });
}

export function writeRecords(page, scope, records) {
  return page.evaluate(({ name, records }) => new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(Object.keys(records), 'readwrite');
      for (const [store, values] of Object.entries(records)) for (const value of values) transaction.objectStore(store).put(value);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }), { name: DATABASES[scope], records });
}

export function sentinelRecords(scope) {
  return Object.fromEntries(DATA_STORES.map((store) => [store, [{
    id: 'a81ccf66-f468-4cb6-a079-8727b7ba69dc',
    marker: `${scope}-${store}`,
    createdAt: '2026-01-01T00:00:00.000Z',
  }]]));
}

export async function selectMode(page, mode) {
  await page.getByRole('button', { name: 'Cambiar modo', exact: true }).click();
  await page.getByRole('dialog', { name: 'Cambiar modo', exact: true }).getByRole('button', { name: mode === 'demo' ? 'Explorar demostración' : 'Comenzar mi entrenamiento', exact: true }).click();
}

export async function requestReset(page) {
  await page.getByRole('button', { name: 'Cambiar modo', exact: true }).click();
  await page.getByRole('dialog', { name: 'Cambiar modo', exact: true }).getByRole('button', { name: 'Restablecer demostración', exact: true }).click();
  return page.getByRole('dialog', { name: '¿Restablecer la demostración?', exact: true });
}
