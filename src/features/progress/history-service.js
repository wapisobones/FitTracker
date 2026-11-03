import { assertMode } from '../../db/repository.js';
import { DATABASES } from '../../db/schema.js';
import { transact } from '../../db/indexed-db.js';
import { normalizeHistory } from './metrics.js';

export function historyService(mode) {
  assertMode(mode);
  return {
    async load() {
      const data = await transact(DATABASES[mode], ['workouts', 'setRecords', 'settings'], 'readonly', (tx, result) => {
        const records = {};
        let pending = 3;
        for (const name of ['workouts', 'setRecords', 'settings']) tx.objectStore(name).getAll().onsuccess = (event) => {
          records[name] = event.target.result;
          if (--pending === 0) result(records);
        };
      });
      return normalizeHistory(data);
    },
  };
}
