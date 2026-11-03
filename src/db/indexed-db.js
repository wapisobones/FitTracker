import { DATABASE_VERSION, DATABASES, upgradeSchema } from './schema.js';

export class StorageError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'StorageError';
  }
}

export function storageError(error) {
  if (error instanceof StorageError) return error;
  if (error?.name === 'QuotaExceededError') return new StorageError('No hay espacio suficiente para guardar los datos. Libera espacio en este navegador y vuelve a intentarlo.', error);
  if (error?.name === 'VersionError') return new StorageError('Estos datos pertenecen a una versión más reciente de FitTracker. Actualiza la aplicación antes de continuar.', error);
  return new StorageError('No se pudo acceder al almacenamiento local. Comprueba los permisos de este sitio y vuelve a intentarlo. Tus datos no se han restablecido.', error);
}

function openDatabase(name) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let request;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(storageError(error));
    };
    const timeout = setTimeout(() => fail(new StorageError('El almacenamiento no responde. Cierra otras pestañas de FitTracker y vuelve a intentarlo.')), 5000);
    try {
      if (!globalThis.indexedDB) throw new StorageError('Este navegador no permite usar IndexedDB. Habilita el almacenamiento local o abre FitTracker en otro navegador.');
      request = indexedDB.open(name, DATABASE_VERSION);
      request.onupgradeneeded = (event) => {
        if (settled) { request.transaction.abort(); return; }
        upgradeSchema(request.result, event.oldVersion, name === DATABASES.app, request.transaction);
      };
      request.onblocked = () => fail(new StorageError('Otra pestaña está bloqueando la actualización de datos. Cierra las otras pestañas de FitTracker y pulsa Reintentar.'));
      request.onerror = () => fail(request.error);
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        if (settled) { database.close(); return; }
        settled = true;
        clearTimeout(timeout);
        resolve(database);
      };
    } catch (error) { fail(error); }
  });
}

// The callback must enqueue IDB requests synchronously. Completion, not request
// success, is the commit boundary. No awaits/external work inside a transaction.
export async function transact(name, stores, mode, enqueue) {
  if (!Object.values(DATABASES).includes(name)) throw new StorageError('Ámbito de almacenamiento desconocido.');
  const database = await openDatabase(name);
  try {
    return await new Promise((resolve, reject) => {
      let transaction;
      let result;
      let originalError;
      const timeout = setTimeout(() => {
        originalError = new StorageError('La operación de almacenamiento tardó demasiado. Vuelve a intentarlo.');
        transaction?.abort();
      }, 8000);
      try {
        transaction = database.transaction(stores, mode);
        transaction.oncomplete = () => { clearTimeout(timeout); resolve(result); };
        transaction.onabort = () => { clearTimeout(timeout); reject(storageError(originalError ?? transaction.error)); };
        transaction.onerror = () => { /* The abort handler reports request failures. */ };
        enqueue(transaction, (value) => { result = value; });
      } catch (error) {
        clearTimeout(timeout);
        originalError = error;
        if (transaction) transaction.abort();
        else reject(storageError(error));
      }
    });
  } finally { database.close(); }
}
