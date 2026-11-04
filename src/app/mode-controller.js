import { getSavedMode, loadMode, saveMode, resetDemo } from '../db/fittracker-store.js';

export function createModeController(onChange) {
  let state = { status: 'loading', mode: null, data: null, error: null, message: '' };
  let running = false;
  let retry = () => initialize();

  async function run(operation) {
    if (running) return;
    running = true;
    retry = () => run(operation);
    // Remove the previous scope's content before starting any asynchronous work.
    state = { ...state, status: 'loading', data: null, error: null, message: '' };
    onChange();
    try {
      const result = await operation();
      state = { ...state, ...result, status: result.mode ? 'ready' : 'welcome' };
    } catch (error) {
      state = { ...state, status: 'error', data: null, error: error.message || 'No se pudo completar la operación de almacenamiento.' };
    } finally {
      running = false;
      onChange();
    }
  }

  function initialize() {
    return run(async () => {
      const mode = await getSavedMode();
      // This preference is already committed. Keep its scope available for
      // recovery even if reading that scope's content fails on startup.
      state = { ...state, mode };
      return { mode, data: mode ? await loadMode(mode) : null };
    });
  }

  return {
    get state() { return state; },
    clearMessage() { state = { ...state, message: '' }; },
    initialize,
    retry: () => retry(),
    select: (mode) => run(async () => {
      const data = await loadMode(mode);
      // The mode is published to the UI only after its data and preference commit.
      await saveMode(mode);
      return { mode, data };
    }),
    resetDemo: () => run(async () => {
      await resetDemo();
      const mode = state.mode;
      return { mode, data: mode ? await loadMode(mode) : null, message: 'Demostración restablecida. Los datos personales se conservaron.' };
    }),
  };
}
