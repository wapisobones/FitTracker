import { assertMode } from '../../db/repository.js';
import { DATABASES } from '../../db/schema.js';
import { transact } from '../../db/indexed-db.js';
import { toKg, weightInput } from '../../utils/units.js';

export function validatePreferences(input) {
  if (!input || !['kg', 'lb'].includes(input.weightUnit)) throw new Error('Selecciona kg o lb.');
  return { weightUnit: input.weightUnit };
}
export function validateAlias(alias) {
  if (typeof alias !== 'string' || alias.trim().length > 50 || /[\u0000-\u001f\u007f]/.test(alias)) throw new Error('El alias admite hasta 50 caracteres sin caracteres de control.');
  return alias.trim();
}
export function validateGoals(goals) {
  if (!goals || (goals.sessions !== null && (!Number.isInteger(goals.sessions) || goals.sessions < 1 || goals.sessions > 21)) ||
    (goals.volumeKg !== null && (!Number.isFinite(goals.volumeKg) || goals.volumeKg <= 0 || goals.volumeKg > 1000000000))) throw new Error('Usa de 1 a 21 sesiones y un volumen positivo de hasta 1.000.000.000 kg, o deja los objetivos vacíos.');
  return { sessions: goals.sessions, volumeKg: goals.volumeKg };
}
export function profileService(mode) {
  assertMode(mode);
  async function transaction(access, action) {
    let failure;
    try {
      return await transact(DATABASES[mode], ['profiles', 'settings'], access, (tx, result) => {
        const records = {};
        let pending = 3;
        for (const [store, id, key] of [['profiles', 'local-profile', 'profile'], ['settings', 'preferences', 'preferences'], ['settings', 'weekly-goals', 'goals']]) {
          tx.objectStore(store).get(id).onsuccess = (event) => {
            records[key] = event.target.result ?? null;
            if (--pending === 0) { try { result(action(tx, records)); } catch (error) { failure = error; tx.abort(); } }
          };
        }
      });
    } catch (error) { throw failure ?? error; }
  }
  return {
    load: () => transaction('readonly', (_, records) => {
      const alias = validateAlias(records.profile?.alias ?? '');
      const preferences = validatePreferences(records.preferences ?? { weightUnit: 'kg' });
      const goals = validateGoals(records.goals ?? { sessions: null, volumeKg: null });
      return { ...records, alias, ...preferences, ...goals };
    }),
    save(input, expected) {
      if (!input || !['string', 'number'].includes(typeof input.sessions) || !['string', 'number'].includes(typeof input.volume)) throw new Error('Introduce objetivos numéricos o deja los campos vacíos.');
      const alias = validateAlias(input.alias);
      const preferences = validatePreferences(input);
      const unchangedVolume = expected.volumeKg !== null && String(input.volume) === String(weightInput(expected.volumeKg, preferences.weightUnit));
      const goals = validateGoals({ sessions: input.sessions === '' ? null : Number(input.sessions), volumeKg: input.volume === '' ? null : unchangedVolume ? expected.volumeKg : toKg(Number(input.volume), preferences.weightUnit) });
      return transaction('readwrite', (tx, records) => {
        if (['profile', 'preferences', 'goals'].some((key) => JSON.stringify(records[key]) !== JSON.stringify(expected[key]))) throw new Error('El perfil cambió en otra pestaña. Recarga Perfil antes de guardar.');
        const updatedAt = new Date().toISOString();
        tx.objectStore('profiles').put({ id: 'local-profile', alias, updatedAt });
        tx.objectStore('settings').put({ id: 'preferences', ...preferences, updatedAt });
        tx.objectStore('settings').put({ id: 'weekly-goals', ...goals, updatedAt });
      });
    },
  };
}
