import { BASE_EXERCISES } from '../../data/exercises.js';
import { escapeHTML } from '../../utils/html.js';
import { exerciseService } from './exercise-service.js';
import { catalogFrame, equipmentOptions, regionOptions, exerciseCard, noMatches, techniqueView, editorView, deleteView } from './views.js';
import { MUSCLE_REGIONS } from '../../data/muscle-taxonomy.js';
import { openRoutineAssignment } from '../routines/add-from-catalog.js';
import { mountExerciseMedia, loadDemonstration } from '../../components/exercise-media.js';

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function mountExerciseCatalog(root, mode, previousFilters) {
  root.innerHTML = catalogFrame(mode);
  const service = exerciseService(mode);
  const events = new AbortController();
  const { signal } = events;
  const media = mountExerciseMedia(root, signal);
  const form = root.querySelector('.catalog-filters');
  const grid = root.querySelector('.exercise-grid');
  const count = root.querySelector('.catalog-count');
  const feedback = root.querySelector('.catalog-feedback');
  const errorPanel = root.querySelector('.catalog-error');
  const dialog = root.querySelector('.exercise-dialog');
  let exercises = [...BASE_EXERCISES];
  let filters = { search: '', muscle: '', region: '', equipment: '', difficulty: '', ...previousFilters };
  let alive = true;
  let ready = false;
  let busy = false;
  let selected = null;
  let focusTarget = () => form.elements.search;
  let loadNumber = 0;
  let assignment;
  let stopDemonstration = () => {};

  function stopMedia() {
    stopDemonstration();
    stopDemonstration = () => {};
  }

  function closeDialog() {
    stopMedia();
    dialog.close();
  }

  function renderResults() {
    const matches = exercises.filter((exercise) => normalize(exercise.name).includes(normalize(filters.search.trim()))
      && (!filters.muscle || exercise.mainMuscle === filters.muscle)
      && (!filters.region || exercise.mainRegion === filters.region)
      && (!filters.equipment || exercise.equipment === filters.equipment)
      && (!filters.difficulty || exercise.difficulty === filters.difficulty));
    grid.innerHTML = matches.length ? matches.map(exerciseCard).join('') : noMatches();
    media.refresh();
    count.textContent = `${matches.length} de ${exercises.length} ejercicios${ready ? '' : ' · Biblioteca base'} `;
    root.querySelectorAll('[data-muscle]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.muscle === filters.muscle)));
  }

  function updateEquipment() {
    const values = new Set(exercises.map((exercise) => exercise.equipment));
    if (ready && !values.has(filters.equipment)) filters.equipment = '';
    form.elements.equipment.innerHTML = equipmentOptions(exercises, filters.equipment);
  }

  function clearFilters() {
    filters = { search: '', muscle: '', region: '', equipment: '', difficulty: '' };
    form.reset();
    updateEquipment();
    updateRegions();
    renderResults();
  }
  function updateRegions() {
    if (!MUSCLE_REGIONS.some((region) => region.id === filters.region && (!filters.muscle || region.group === filters.muscle))) filters.region = '';
    form.elements.region.innerHTML = regionOptions(filters.muscle, filters.region);
  }

  async function load() {
    const operation = ++loadNumber;
    ready = false;
    root.querySelector('[data-create-exercise]').disabled = true;
    errorPanel.innerHTML = '';
    feedback.textContent = 'Cargando ejercicios personalizados…';
    try {
      const loaded = await service.list();
      if (!alive || operation !== loadNumber) return;
      exercises = loaded;
      ready = true;
      feedback.textContent = '';
      root.querySelector('[data-create-exercise]').disabled = false;
    } catch (error) {
      if (!alive || operation !== loadNumber) return;
      exercises = [...BASE_EXERCISES];
      feedback.textContent = '';
      errorPanel.innerHTML = `<div class="card storage-error" role="alert"><h2>No se pudieron cargar los personalizados</h2><p>${escapeHTML(error.message)}</p><p>La biblioteca base sigue disponible. No se ha modificado ningún ejercicio guardado.</p><button class="button button-secondary" type="button" data-retry-exercises>Reintentar carga</button></div>`;
    }
    updateEquipment();
    renderResults();
  }

  function open(kind, exercise, trigger) {
    stopMedia();
    selected = exercise;
    const triggerAttribute = kind === 'technique' ? 'data-technique' : kind === 'delete' ? 'data-delete-exercise' : 'data-edit-exercise';
    focusTarget = () => exercise ? root.querySelector(`[${triggerAttribute}="${exercise.id}"]`) ?? form.elements.search : trigger;
    dialog.dataset.kind = kind;
    dialog.innerHTML = kind === 'technique' ? techniqueView(exercise) : kind === 'delete' ? deleteView(exercise) : editorView(exercise, mode);
    dialog.showModal();
    media.refresh();
    if (kind === 'editor') dialog.querySelector('input').focus();
  }

  function setBusy(value) {
    busy = value;
    dialog.setAttribute('aria-busy', String(value));
    dialog.querySelectorAll('button, input, select, textarea').forEach((control) => { control.disabled = value; });
  }

  async function save(editor) {
    if (busy || !ready) return;
    const input = Object.fromEntries(new FormData(editor));
    const editing = selected;
    const error = dialog.querySelector('.exercise-form-error');
    error.textContent = '';
    setBusy(true);
    try {
      const saved = editing ? await service.edit(editing, input) : await service.create(input);
      if (!alive) return;
      exercises = [...exercises.filter((exercise) => exercise.id !== saved.id), saved];
      clearFilters();
      feedback.textContent = `Ejercicio ${editing ? 'actualizado' : 'creado'} en ${mode === 'demo' ? 'demostración' : 'modo personal'}. Se limpiaron los filtros para mostrarlo.`;
      focusTarget = () => root.querySelector(`[data-edit-exercise="${saved.id}"]`);
      setBusy(false);
      closeDialog();
    } catch (failure) {
      if (alive) { error.textContent = failure.message; setBusy(false); }
    }
  }

  async function remove() {
    if (busy || !selected || dialog.dataset.kind !== 'delete') return;
    const exercise = selected;
    const error = dialog.querySelector('.exercise-form-error');
    error.textContent = '';
    setBusy(true);
    try {
      await service.remove(exercise);
      if (!alive) return;
      exercises = exercises.filter((item) => item.id !== exercise.id);
      updateEquipment();
      renderResults();
      feedback.textContent = 'Ejercicio personalizado eliminado del modo actual.';
      focusTarget = () => root.querySelector('[data-create-exercise]');
      setBusy(false);
      closeDialog();
    } catch (failure) {
      if (alive) { error.textContent = failure.message; setBusy(false); }
    }
  }

  root.addEventListener('input', (event) => {
    if (event.target === form.elements.search) {
      filters.search = event.target.value;
      feedback.textContent = '';
      renderResults();
    }
  }, { signal });
  root.addEventListener('change', (event) => {
    if (form.contains(event.target) && event.target.tagName === 'SELECT') {
      filters[event.target.name] = event.target.value;
      if (event.target.name === 'muscle') updateRegions();
      feedback.textContent = '';
      renderResults();
    }
  }, { signal });
  root.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.matches('.exercise-editor')) void save(event.target);
  }, { signal });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-add-exercise-to-routine') && selected) {
      closeDialog();
      assignment?.destroy();
      assignment = openRoutineAssignment(root, mode, selected, () => { if (alive) focusTarget()?.focus(); });
    }
    else if (button.hasAttribute('data-create-exercise') && ready) open('editor', null, button);
    else if (button.hasAttribute('data-load-demonstration') && selected && dialog.dataset.kind === 'technique') {
      stopMedia();
      stopDemonstration = loadDemonstration(dialog.querySelector('[data-technique-media]'), selected);
    }
    else if (button.hasAttribute('data-close-exercise-dialog') && !busy) closeDialog();
    else if (button.hasAttribute('data-clear-filters')) clearFilters();
    else if (button.hasAttribute('data-retry-exercises')) void load();
    else if (button.hasAttribute('data-muscle')) {
      filters.muscle = button.dataset.muscle;
      form.elements.muscle.value = filters.muscle;
      updateRegions();
      renderResults();
    } else if (button.classList.contains('filter-toggle')) {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      root.querySelector('.exercise-filter-fields').dataset.expanded = String(expanded);
    } else if (button.hasAttribute('data-confirm-exercise-delete')) void remove();
    else {
      const techniqueId = button.dataset.technique;
      const editId = button.dataset.editExercise;
      const deleteId = button.dataset.deleteExercise;
      const exercise = exercises.find((item) => item.id === (techniqueId ?? editId ?? deleteId));
      if (exercise && (techniqueId || exercise.origin === 'custom')) open(techniqueId ? 'technique' : editId ? 'editor' : 'delete', exercise, button);
    }
  }, { signal });
  dialog.addEventListener('cancel', (event) => { if (busy) event.preventDefault(); else stopMedia(); }, { signal });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    // Let the native dialog contain focus when a player is present, so the
    // browser's media controls retain their own keyboard navigation.
    if (dialog.querySelector('video, iframe')) return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]')].filter((control) => control.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      dialog.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, { signal });
  dialog.addEventListener('close', () => { stopMedia(); if (alive && !dialog.open) focusTarget()?.focus(); }, { signal });
  for (const name of ['search', 'muscle', 'difficulty']) form.elements[name].value = filters[name];
  updateEquipment();
  updateRegions();
  renderResults();
  void load();

  return {
    getFilters: () => ({ ...filters }),
    destroy() {
      alive = false;
      stopMedia();
      events.abort();
      assignment?.destroy();
      if (dialog.open) dialog.close();
    },
  };
}
