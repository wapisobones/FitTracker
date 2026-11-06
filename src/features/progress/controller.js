import { historyService } from './history-service.js';
import { calculate, PERIODS, periodBounds } from './metrics.js';
import { heatmapDays } from './muscle-heatmap.js';
import { progressView, SECTIONS } from './views.js';
import { dashboard } from '../dashboard.js';
import { escapeHTML as esc } from '../../utils/html.js';

export function mountStatistics(root, mode, { progress = false, params = new URLSearchParams() } = {}) {
  const events = new AbortController();
  let alive = true;
  let version = 0;
  let history;
  const scoped = params.get('ambito') === mode;
  const state = { period: scoped && Object.hasOwn(PERIODS, params.get('periodo')) ? params.get('periodo') : progress ? '90' : 'month', exerciseId: scoped ? params.get('ejercicio') || '' : '', chartExerciseId: scoped ? params.get('grafico') || '' : '', section: scoped && Object.hasOwn(SECTIONS, params.get('vista')) ? params.get('vista') : 'summary', strengthMetric: scoped && params.get('metrica') === 'estimated1RM' ? 'estimated1RM' : 'weight' };
  const service = historyService(mode);
  function paint() {
    if (!alive || !history) return;
    if (!history.exercises.some((exercise) => exercise.id === state.exerciseId)) state.exerciseId = '';
    if (!history.exercises.some((exercise) => exercise.id === state.chartExerciseId)) state.chartExerciseId = '';
    const now = new Date();
    const stats = calculate(history, { ...state, now });
    stats.unit = history.weightUnit;
    const muscleStats = progress ? stats : calculate(history, { period: '7', now });
    muscleStats.heatmapDays = heatmapDays(periodBounds(progress ? state.period : '7', now), history.rows[0]?.date);
    root.innerHTML = progress ? progressView(history, stats, state, mode) : dashboard(history, stats, state, mode, muscleStats);
    const query = new URLSearchParams({ ambito: mode, periodo: state.period });
    if (state.exerciseId) query.set('ejercicio', state.exerciseId);
    if (state.chartExerciseId) query.set('grafico', state.chartExerciseId);
    if (progress) query.set('vista', state.section);
    if (state.strengthMetric !== 'weight') query.set('metrica', state.strengthMetric);
    window.history.replaceState(null, '', `#/${progress ? 'progreso' : 'inicio'}?${query}`);
  }
  async function load() {
    const request = ++version;
    root.innerHTML = `<section class="page-heading"><h1>${progress ? 'Progreso' : 'Inicio'}</h1></section><section class="card stats-empty" role="status"><h2>Cargando tu historial…</h2><p>Calculando las métricas de tus sesiones guardadas.</p></section>`;
    try {
      const data = await service.load();
      if (!alive || request !== version) return;
      history = data;
      paint();
    } catch (error) {
      if (!alive || request !== version) return;
      root.innerHTML = `<section class="page-heading"><h1>${progress ? 'Progreso' : 'Inicio'}</h1></section><section class="card storage-error" role="alert"><h2>No se pudo cargar el historial</h2><p>${esc(error.message)}</p><button type="button" class="button button-secondary" data-retry-stats>Reintentar</button></section>`;
    }
  }
  root.addEventListener('change', (event) => {
    const field = event.target.dataset.statsFilter;
    if (!field || !history) return;
    state[field] = event.target.value;
    paint(); root.querySelector(`[data-stats-filter="${field}"]`)?.focus({ preventScroll: true });
  }, { signal: events.signal });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-retry-stats')) { void load(); return; }
    if (!history) return;
    if (button.dataset.statsSection) { state.section = button.dataset.statsSection; paint(); root.querySelector(`[data-stats-section="${state.section}"]`)?.focus({ preventScroll: true }); }
    else if (button.hasAttribute('data-reset-stats')) { state.exerciseId = ''; state.chartExerciseId = ''; state.period = 'all'; paint(); }
  }, { signal: events.signal });
  window.addEventListener('workout-change', load, { signal: events.signal });
  window.addEventListener('focus', load, { signal: events.signal });
  void load();
  return { destroy() { alive = false; version++; events.abort(); } };
}
