import { icon } from '../components/icons.js';
import { escapeHTML } from '../utils/html.js';

export const modeLabel = (mode) => mode === 'demo' ? 'Demostración' : mode === 'personal' ? 'Modo personal' : 'Elige cómo empezar';

export function welcome() {
  return `<section class="welcome-view" aria-labelledby="welcome-title"><div class="welcome-intro"><span class="empty-icon">${icon('dumbbell')}</span><h1 id="welcome-title">Tu entrenamiento empieza aquí</h1><p>Un espacio para entrenar, registrar y progresar.<br>Elige cómo quieres conocer FitTracker.</p></div>
    <div class="mode-options"><article class="card mode-option">${icon('chart')}<h2>Conoce FitTracker</h2><p>Explora el Dashboard con cifras y gráficos ficticios. Todo lo que hagas en demostración se mantendrá separado de tus datos.</p><button class="button button-primary" type="button" data-select-mode="demo">Explorar demostración ${icon('arrow')}</button></article>
    <article class="card mode-option">${icon('user')}<h2>Tu propio punto de partida</h2><p>Comienza con un espacio personal vacío. Crea o copia una rutina, registra tus series y guarda entrenamientos para ver tu progreso.</p><button class="button button-secondary" type="button" data-select-mode="personal">Comenzar mi entrenamiento ${icon('arrow')}</button></article></div>
    <p class="local-data-note">Sin cuentas ni nube. Los datos se guardan en este navegador.<br>Puedes cambiar de modo en cualquier momento.</p></section>`;
}

export function loadingView() {
  return `<section class="card empty-state" role="status"><span class="empty-icon">${icon('clock')}</span><h1>Preparando tu espacio</h1><p>Estamos accediendo a los datos guardados en este navegador.</p></section>`;
}

export function storageErrorView(message) {
  return `<section class="card storage-error" role="alert"><div>${icon('info')}<h2>No se pudieron cargar los datos</h2></div><p>${escapeHTML(message)}</p><button class="button button-secondary" type="button" data-retry-storage>Reintentar</button><p class="availability-note">No se muestran cifras de otro modo. Puedes elegir otro espacio desde Cambiar modo.</p></section>`;
}

export function modeDialog(state) {
  return `<div class="dialog-heading"><h2 id="mode-dialog-title">Cambiar modo</h2><button class="icon-button" type="button" data-close-dialog aria-label="Cerrar selector de modo">${icon('close')}</button></div><p>Estás en: <strong>${modeLabel(state.mode)}</strong>. Cada espacio conserva sus datos por separado.</p>
    <div class="mode-dialog-options"><button class="button button-primary" type="button" data-select-mode="demo">${icon('chart')}Explorar demostración</button><button class="button button-secondary" type="button" data-select-mode="personal">${icon('user')}Comenzar mi entrenamiento</button></div>
    ${state.mode ? '<div class="reset-demo-option"><h3>Datos de demostración</h3><p>Puedes recuperar el ejemplo inicial. Tus datos personales se conservarán.</p><button class="button button-secondary" type="button" data-request-reset>Restablecer demostración</button></div>' : ''}
    <p class="local-data-note">Si borras los datos de este sitio en el navegador, se perderá la información local. Puedes exportar e importar un respaldo personal JSON desde Perfil.</p>`;
}

export function resetDialog() {
  return `<h2 id="reset-dialog-title">¿Restablecer la demostración?</h2><p>Se eliminarán los datos del espacio de demostración y se recuperará el ejemplo inicial.</p><p><strong>Los datos personales y tu modo actual se conservarán.</strong></p><div class="dialog-actions"><button class="button button-secondary" type="button" data-close-dialog autofocus>Cancelar</button><button class="button button-primary" type="button" data-confirm-reset>Restablecer demostración</button></div>`;
}
