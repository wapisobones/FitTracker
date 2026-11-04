import '../styles/base.css';
import '../styles/layout.css';
import '../styles/dashboard.css';
import '../styles/modes.css';
import '../styles/exercises.css';
import '../styles/routines.css';
import '../styles/workouts.css';
import '../styles/progress.css';
import '../styles/generator.css';
import '../styles/tools-profile.css';
import { shell } from '../components/shell.js';
import { findRoute } from './routes.js';
import { mountStatistics } from '../features/progress/controller.js';
import { placeholder, notFound } from '../features/placeholder.js';
import { createModeController } from './mode-controller.js';
import { welcome, loadingView, storageErrorView, modeLabel, modeDialog, resetDialog } from '../features/modes.js';
import { mountExerciseCatalog } from '../features/exercises/catalog.js';
import { mountRoutines } from '../features/routines/controller.js';
import { mountWorkout } from '../features/workouts/controller.js';
import { workoutService } from '../features/workouts/workout-service.js';
import { escapeHTML } from '../utils/html.js';
import { mountGenerator } from '../features/generator/controller.js';
import { mountCalculator, toolsHome } from '../features/tools/controller.js';
import { mountProfile } from '../features/profile/controller.js';

document.querySelector('#app').innerHTML = shell();
const main = document.querySelector('main');
const menu = document.querySelector('#mobile-menu');
const modeSelector = document.querySelector('#mode-dialog');
const resetConfirmation = document.querySelector('#reset-demo-dialog');
const modes = createModeController(() => render());
let exerciseCatalog;
let exerciseCatalogMode;
const exerciseFilters = new Map();
let routinesView;
let workoutView;
let bannerVersion = 0;
let renderedHash = location.hash;
let navigationVersion = 0;
let statisticsView;
let generatorView;
let generatorMode;
let toolsView;
let profileView;
const generatorStates = new Map();

async function refreshPendingWorkout() {
  const version = ++bannerVersion;
  const banner = document.querySelector('.pending-workout-banner');
  const mode = modes.state.mode;
  banner.innerHTML = '';
  if (!mode || modes.state.status !== 'ready' || location.hash.startsWith('#/rutina-activa')) return;
  try {
    const active = await workoutService(mode).getActive();
    if (version !== bannerVersion) return;
    if (active) banner.innerHTML = `<p>Sesión pendiente: <strong>${escapeHTML(active.sessionName)}</strong>. Puedes continuar donde quedaste.</p><a class="button button-primary" href="#/rutina-activa">Continuar sesión</a>`;
  } catch {
    if (version === bannerVersion) banner.innerHTML = '<p>No se pudo comprobar la sesión pendiente.</p><a class="text-link" href="#/rutina-activa">Revisar entrenamiento</a>';
  }
}
window.addEventListener('workout-change', refreshPendingWorkout);

document.querySelector('.mobile-menu-button').addEventListener('click', () => menu.showModal());
document.querySelector('.close-menu').addEventListener('click', () => menu.close());
menu.addEventListener('click', (event) => {
  if (event.target === menu || event.target.closest('a')) menu.close();
});
document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
});
// A mobile drawer must not remain modal after rotating to desktop.
matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
  if (event.matches && menu.open) menu.close();
});

function focusContent() {
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function clearOperationNotice() {
  modes.clearMessage();
  document.querySelector('.operation-status').textContent = '';
  document.querySelector('.operation-notice').hidden = true;
}

function render({ focus = false } = {}) {
  if (exerciseCatalog) exerciseFilters.set(exerciseCatalogMode, exerciseCatalog.getFilters());
  exerciseCatalog?.destroy();
  exerciseCatalog = null;
  routinesView?.destroy();
  routinesView = null;
  workoutView?.destroy();
  workoutView = null;
  statisticsView?.destroy();
  statisticsView = null;
  toolsView?.destroy();
  toolsView = null;
  profileView?.destroy();
  profileView = null;
  if (generatorView) generatorStates.set(generatorMode, generatorView.getState());
  generatorView?.destroy();
  generatorView = null;
  const state = modes.state;
  const [id = 'inicio', query = ''] = (location.hash.replace(/^#\/?/, '') || 'inicio').split('?');
  const route = findRoute(id);
  if (state.status === 'loading') main.innerHTML = loadingView();
  else if (state.status === 'error') main.innerHTML = `${state.mode ? '<h1 class="sr-only">Error de almacenamiento</h1>' : ''}${storageErrorView(state.error)}${state.mode ? '' : welcome()}`;
  else if (!state.mode) main.innerHTML = welcome();
  else if (id === 'ejercicios') { exerciseCatalogMode = state.mode; exerciseCatalog = mountExerciseCatalog(main, state.mode, exerciseFilters.get(state.mode)); }
  else if (id === 'mis-rutinas' || id === 'predisenadas') routinesView = mountRoutines(main, state.mode, { templates: id === 'predisenadas', params: new URLSearchParams(query) });
  else if (id === 'rutina-activa') workoutView = mountWorkout(main, state.mode, new URLSearchParams(query));
  else if (id === 'generador') { generatorMode = state.mode; generatorView = mountGenerator(main, state.mode, generatorStates.get(state.mode)); }
  else if (id === 'inicio' || id === 'progreso') statisticsView = mountStatistics(main, state.mode, { progress: id === 'progreso', params: new URLSearchParams(query) });
  else if (id === 'herramientas') main.innerHTML = toolsHome();
  else if (id === 'calculadora-1rm' || id === 'calculadora-calorias') toolsView = mountCalculator(main, state.mode, id === 'calculadora-calorias');
  else if (id === 'perfil') profileView = mountProfile(main, state.mode, { onPersonalChange: () => generatorStates.delete('personal') });
  else main.innerHTML = !route ? notFound() : placeholder(route, state.mode);
  document.title = `${state.status === 'loading' ? 'Cargando' : state.status === 'error' ? 'Almacenamiento' : !state.mode ? 'Bienvenido' : route?.title ?? 'Sección no encontrada'} · FitTracker`;
  document.querySelector('.current-mode').textContent = `${modeLabel(state.mode)}${state.status === 'loading' ? ' · Cargando' : ''}`;
  document.querySelector('[data-open-modes]').disabled = state.status === 'loading';
  document.querySelector('.operation-status').textContent = state.message;
  document.querySelector('.operation-notice').hidden = !state.message;
  document.querySelector('.page-footer').textContent = state.mode === 'demo' ? 'Demostración · Datos ficticios guardados en este navegador.' : state.mode === 'personal' ? 'Modo personal · Tus datos se guardan solo en este navegador.' : 'Datos locales en este navegador · Sin cuentas ni nube.';
  document.querySelectorAll('[data-page]').forEach((link) => {
    const active = link.dataset.page === id;
    link.classList.toggle('is-active', active);
    if (active) {
      link.setAttribute('aria-current', 'page');
      const group = link.closest('details');
      if (group) group.open = true;
    } else link.removeAttribute('aria-current');
  });
  const mobileId = route?.group === 'Entrenamientos' ? 'mis-rutinas' : route?.group === 'Herramientas' ? 'herramientas' : id;
  document.querySelectorAll('[data-mobile-page]').forEach((link) => {
    const active = link.dataset.mobilePage === mobileId;
    if (active) link.setAttribute('aria-current', link.dataset.mobilePage === id ? 'page' : 'location');
    else link.removeAttribute('aria-current');
  });
  if (focus) focusContent();
  renderedHash = location.hash;
  void refreshPendingWorkout();
}

window.addEventListener('hashchange', async () => {
  const version = ++navigationVersion;
  const canLeave = await (workoutView?.prepareLeave() ?? generatorView?.prepareLeave() ?? profileView?.prepareLeave() ?? true);
  if (version !== navigationVersion) return;
  if (!canLeave) { history.replaceState(null, '', renderedHash); return; }
  clearOperationNotice();
  render({ focus: true });
});

document.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.hasAttribute('data-dismiss-operation')) {
    clearOperationNotice();
    document.querySelector('[data-open-modes]').focus({ preventScroll: true });
  } else if (target.hasAttribute('data-open-modes')) {
    modeSelector.innerHTML = modeDialog(modes.state);
    modeSelector.showModal();
  } else if (target.hasAttribute('data-close-dialog')) target.closest('dialog').close();
  else if (target.hasAttribute('data-select-mode')) {
    const version = ++navigationVersion;
    if (modeSelector.open) modeSelector.close();
    if (workoutView && !await workoutView.prepareLeave()) return;
    if (generatorView && !await generatorView.prepareLeave()) return;
    if (profileView && !await profileView.prepareLeave()) return;
    if (version !== navigationVersion) return;
    modes.select(target.dataset.selectMode).then(focusContent);
  } else if (target.hasAttribute('data-request-reset')) {
    modeSelector.close();
    resetConfirmation.innerHTML = resetDialog();
    resetConfirmation.showModal();
  } else if (target.hasAttribute('data-confirm-reset')) {
    const version = ++navigationVersion;
    resetConfirmation.close();
    if (workoutView && !await workoutView.prepareLeave()) return;
    if (generatorView && !await generatorView.prepareLeave()) return;
    if (profileView && !await profileView.prepareLeave()) return;
    if (version !== navigationVersion) return;
    modes.resetDemo().then(() => {
      if (modes.state.status === 'ready') {
        generatorStates.delete('demo');
        if (generatorView && generatorMode === 'demo') { generatorView.destroy(); generatorView = null; render(); }
      }
      focusContent();
    });
  } else if (target.hasAttribute('data-retry-storage')) modes.retry().then(focusContent);
});

modes.initialize();
