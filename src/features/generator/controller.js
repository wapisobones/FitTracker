import { exerciseService } from '../exercises/exercise-service.js';
import { routineService } from '../routines/routine-service.js';
import { mountRoutines } from '../routines/controller.js';
import { routineLink } from '../routines/views.js';
import { createRoutineDialog } from '../../components/routine-dialog.js';
import { mountExerciseTechnique } from '../../components/exercise-technique-dialog.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { defaultConfig, generateRoutine, compatibleExercises, equipmentOptions, estimateMinutes } from './engine.js';
import { generatorFrame, availableView, prioritiesView, proposalSummary, noProposal } from './views.js';
import { bodyMap } from './body-map.js';
import { MUSCLE_REGIONS, regionsForGroup, selectedRegions, groupSelection, toggleMuscleSelection } from '../../data/muscle-taxonomy.js';
import { countText } from '../../utils/text.js';

export function mountGenerator(root, mode, previousState) {
  const state = previousState ?? { config: defaultConfig(), view: matchMedia('(max-width: 700px)').matches ? 'front' : 'both', proposal: null, warnings: [], token: null, saved: null };
  const events = new AbortController();
  const { signal } = events;
  const service = routineService(mode);
  let catalog = [];
  let alive = true;
  let ready = false;
  let busy = false;
  let editor;
  let dialog;
  let technique;
  let replacement;
  let confirmTrigger;
  const feedback = (message) => { if (alive) root.querySelector('.generator-feedback')?.replaceChildren(document.createTextNode(message)); };
  function showError(error) {
    if (!alive) return;
    root.querySelector('.generator-error').innerHTML = `<div class="card generator-error-card"><h2>No se pudo completar la propuesta</h2><p>${esc(error.message)}</p><button type="button" class="button button-secondary" data-generator-reload>Volver a leer catálogo</button></div>`;
  }
  function selection({ rebuildPriorities = false } = {}) {
    if (!ready || !alive) return;
    const regions = selectedRegions(state.config);
    root.querySelectorAll('[data-generator-muscle], [data-generator-region], [data-map-muscle]').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.generatorMuscle ? groupSelection(regions, button.dataset.generatorMuscle) : String(regions.includes(button.dataset.generatorRegion ?? button.dataset.mapMuscle)));
    });
    root.querySelectorAll('[data-region-count]').forEach((count) => {
      const group = regionsForGroup(count.dataset.regionCount);
      count.textContent = `${group.filter((region) => regions.includes(region.id)).length}/${group.length}`;
    });
    if (rebuildPriorities) root.querySelector('.generator-priorities > div').innerHTML = prioritiesView(state.config);
    root.querySelector('.generator-available').innerHTML = availableView(catalog, state.config);
    technique.refresh();
    const frequency = root.querySelector('[name="frequency"]');
    frequency.disabled = state.config.modality === 'session';
    frequency.value = state.config.modality === 'session' ? '1' : String(state.config.frequency);
    root.querySelectorAll('.generator-steps li').forEach((step, index) => step.classList.toggle('current', index === (state.proposal || state.saved ? 2 : state.config.muscles.length ? 1 : 0)));
    feedback(`${countText(regions.length, 'región seleccionada', 'regiones seleccionadas')} en ${countText(state.config.muscles.length, 'grupo', 'grupos')}.${state.proposal && !state.saved ? ' Los cambios de preferencias se aplicarán al generar otra propuesta; la actual conserva su configuración original.' : ''}`);
  }
  function summary() {
    if (alive && state.proposal) root.querySelector('.generator-result-summary').innerHTML = proposalSummary(state.proposal, state.warnings);
  }
  function proposalView() {
    if (!alive || !ready) return;
    editor?.destroy(); editor = null;
    const content = root.querySelector('.generator-result-content');
    const save = root.querySelector('.generator-save');
    if (state.saved) {
      root.querySelector('.generator-result-summary').innerHTML = '';
      content.innerHTML = `<section class="card generator-saved" role="status"><h3>Rutina guardada en ${mode === 'demo' ? 'demostración' : 'tu espacio personal'}</h3><p>${esc(state.saved.name)} · ${countText(state.saved.sessions.length, 'sesión', 'sesiones')}. Ya puedes editarla o entrenar desde Mis rutinas.</p><a class="button button-primary" href="${routineLink(state.saved.id, state.saved.sessions[0]?.id, mode)}">Ver en Mis rutinas</a></section>`;
      save.innerHTML = '';
      return;
    }
    if (!state.proposal) { content.innerHTML = noProposal(); save.innerHTML = ''; return; }
    summary();
    content.classList.add('generator-editor');
    editor = mountRoutines(content, mode, { proposal: { routine: state.proposal, exercises: compatibleExercises(catalog, state.proposal.generator.config), estimateSession: estimateMinutes, onChange(draft) { state.proposal = draft; summary(); } } });
    save.innerHTML = '<button type="button" class="button button-primary" data-generator-save>Guardar en Mis rutinas</button><p>Se creará una rutina nueva. Las rutinas existentes no se modificarán.</p>';
  }
  async function load() {
    if (busy) return;
    ready = false;
    editor?.destroy(); editor = null;
    technique?.destroy();
    if (dialog?.open) dialog.close();
    root.innerHTML = '<section class="page-heading"><h1>Generador</h1></section><p role="status">Cargando los ejercicios de este espacio…</p><div class="generator-error" role="alert"></div>';
    try {
      const [loaded, routines] = await Promise.all([exerciseService(mode).list(), state.saved ? service.list() : Promise.resolve(null)]);
      if (!alive) return;
      catalog = loaded;
      if (state.saved) {
        state.saved = routines.find((routine) => routine.id === state.saved.id) ?? null;
        if (!state.saved) { state.proposal = null; state.token = null; state.warnings = []; }
      }
      state.config.equipment = state.config.equipment.filter((item) => equipmentOptions(catalog).includes(item));
      root.innerHTML = generatorFrame(state.config, catalog, state.view);
      technique = mountExerciseTechnique(root);
      dialog = createRoutineDialog(root);
      dialog.setAttribute('aria-labelledby', 'generator-dialog-title');
      dialog.addEventListener('close', () => { if (confirmTrigger?.isConnected) confirmTrigger.focus(); }, { signal });
      ready = true;
      selection({ rebuildPriorities: true });
      proposalView();
    } catch (error) { showError(error); }
  }
  function accept(candidate) {
    state.proposal = candidate.routine;
    state.warnings = candidate.warnings;
    state.token = crypto.randomUUID();
    state.saved = null;
    replacement = null;
    proposalView();
    selection();
    const heading = root.querySelector('.generator-result-heading h2');
    heading.focus({ preventScroll: true });
    root.querySelector('.generator-result').scrollIntoView({ block: 'start' });
    feedback('Propuesta generada. Revisa nombres, ejercicios y objetivos antes de guardarla.');
  }
  async function saveProposal() {
    if (busy || !state.proposal || state.saved) return;
    busy = true;
    const controls = [...root.querySelectorAll('input, select, button, textarea')].map((control) => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    root.querySelector('.generator-error').innerHTML = '';
    feedback('Guardando rutina…');
    try {
      const saved = await service.saveGenerated(structuredClone(state.proposal), state.token);
      state.saved = saved;
      if (alive) { proposalView(); feedback('Rutina guardada. Puedes abrirla desde Mis rutinas.'); }
    } catch (error) { showError(error); feedback('La propuesta se conserva para que puedas corregirla o reintentar el guardado.'); }
    finally { busy = false; controls.forEach(([control, disabled]) => { control.disabled = disabled; }); if (!alive) window.removeEventListener('beforeunload', beforeUnload); }
  }
  root.addEventListener('click', (event) => {
    const listLink = event.target.closest('.anatomy-list-link');
    if (listLink) { event.preventDefault(); root.querySelector('#muscle-region-list').focus(); root.querySelector('#muscle-region-list').scrollIntoView({ block: 'start' }); return; }
    const button = event.target.closest('button, [data-map-muscle]');
    if (!button || busy || button.disabled) return;
    if (button.hasAttribute('data-generator-reload')) { void load(); return; }
    if (!ready) return;
    if (button.dataset.technique) {
      const exercise = catalog.find((item) => item.id === button.dataset.technique);
      if (exercise) technique.open(exercise, button);
      return;
    }
    const group = button.dataset.generatorMuscle ?? button.dataset.generatorRegion ?? button.dataset.mapMuscle;
    if (group) {
      state.config = toggleMuscleSelection(state.config, group, Boolean(button.dataset.generatorMuscle));
      selection({ rebuildPriorities: true });
    } else if (button.dataset.bodyView) {
      state.view = button.dataset.bodyView;
      root.querySelectorAll('button[data-body-view]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.bodyView === state.view)));
      root.querySelector('.generator-map-slot').innerHTML = bodyMap(selectedRegions(state.config), state.view);
      root.querySelector('.anatomy-readout').textContent = 'Explora las regiones musculares';
    } else if (button.dataset.equipmentPreset) {
      state.config.equipment = button.dataset.equipmentPreset === 'all' ? equipmentOptions(catalog) : ['Peso corporal'];
      root.querySelectorAll('[name="equipment"]').forEach((input) => { input.checked = state.config.equipment.includes(input.value); });
      selection();
    } else if (button.hasAttribute('data-generator-save')) void saveProposal();
    else if (button.hasAttribute('data-generator-cancel')) dialog.close();
    else if (button.hasAttribute('data-generator-replace')) { dialog.close(); accept(replacement); }
  }, { signal });
  function describeRegion(event) {
    const target = event.target.closest('[data-map-muscle]');
    if (!target) return;
    const region = MUSCLE_REGIONS.find((item) => item.id === target.dataset.mapMuscle);
    root.querySelector('.anatomy-readout').textContent = `${region.name} · ${region.group}`;
  }
  root.addEventListener('pointerover', describeRegion, { signal });
  root.addEventListener('focusin', describeRegion, { signal });
  root.addEventListener('keydown', (event) => {
    const group = event.target.closest('[data-map-muscle]');
    if (group && ['Enter', ' '].includes(event.key)) { event.preventDefault(); if (!event.repeat) group.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  }, { signal });
  root.addEventListener('input', (event) => {
    if (event.target.matches('#generator-form [name="minutes"]')) state.config.minutes = event.target.value;
  }, { signal });
  root.addEventListener('change', (event) => {
    const field = event.target;
    if (!ready || busy || !field.closest('#generator-form')) return;
    if (field.dataset.generatorPriority) state.config.priorities = field.checked ? [...state.config.priorities, field.dataset.generatorPriority] : state.config.priorities.filter((group) => group !== field.dataset.generatorPriority);
    else if (field.name === 'equipment') state.config.equipment = [...root.querySelectorAll('[name="equipment"]:checked')].map((input) => input.value);
    else if (['modality', 'goal', 'level', 'frequency', 'minutes'].includes(field.name)) state.config[field.name] = field.value;
    selection();
  }, { signal });
  root.addEventListener('submit', (event) => {
    if (event.target.id !== 'generator-form') return;
    event.preventDefault();
    if (busy || !ready) return;
    root.querySelector('.generator-error').innerHTML = '';
    try {
      const candidate = generateRoutine(state.config, catalog);
      if (state.proposal && !state.saved) {
        replacement = candidate;
        confirmTrigger = root.querySelector('.generator-generate');
        dialog.innerHTML = '<div class="dialog-heading"><h2 id="generator-dialog-title">¿Reemplazar la propuesta?</h2></div><p>La propuesta actual y sus cambios todavía no se han guardado. La nueva propuesta los reemplazará; tus rutinas guardadas se conservarán.</p><div class="dialog-actions"><button type="button" class="button button-secondary" data-generator-cancel autofocus>Cancelar</button><button type="button" class="button button-primary" data-generator-replace>Reemplazar propuesta</button></div>';
        dialog.showModal(); dialog.querySelector('[autofocus]').focus();
      } else accept(candidate);
    } catch (error) { showError(error); }
  }, { signal });
  const beforeUnload = (event) => { if ((state.proposal && !state.saved) || busy) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  void load();
  return {
    getState: () => state,
    async prepareLeave() { while (busy) await new Promise((resolve) => setTimeout(resolve, 15)); return true; },
    destroy() { alive = false; events.abort(); technique?.destroy(); editor?.destroy(); if (dialog?.open) dialog.close(); if (!busy) window.removeEventListener('beforeunload', beforeUnload); },
  };
}
