import { icon } from './icons.js';
import { routes } from '../app/routes.js';

const link = (route) => `<a class="nav-link" href="#/${route.id}" data-page="${route.id}">${icon(route.icon)}<span>${route.title}</span></a>`;

function navigation(label) {
  return `<nav aria-label="${label}">
    ${link(routes[0])}
    <details class="nav-group" open><summary>${icon('dumbbell')}<span>Entrenamientos</span>${icon('chevron')}</summary><div class="nav-children">${routes.filter((r) => r.group === 'Entrenamientos').map(link).join('')}</div></details>
    ${link(routes.find((r) => r.id === 'rutina-activa'))}
    ${link(routes.find((r) => r.id === 'progreso'))}
    <details class="nav-group" open><summary>${icon('tools')}<span>Herramientas</span>${icon('chevron')}</summary><div class="nav-children">${routes.filter((r) => r.group === 'Herramientas').map(link).join('')}</div></details>
    ${link(routes.find((r) => r.id === 'perfil'))}
  </nav>`;
}

const brand = `<a href="#/inicio" class="brand" aria-label="FitTracker, Inicio">${icon('dumbbell')}<span><strong><span>Fit</span>Tracker</strong><small>Entrena · Registra · Progresa</small></span></a>`;

export function shell() {
  return `<aside class="sidebar">${brand}${navigation('Principal')}
    <div class="sidebar-art" aria-hidden="true"><svg viewBox="0 0 280 160" fill="none"><path d="m0 142 63-58 32 23 68-81 117 116" fill="#122a2b"/><path d="m0 142 63-58-17 39 49-16-12 21 80-102-17 57 27-16 107 75-117-55-53 59-47-33Z" fill="#1e4034"/><path d="m95 107 68-81 30 36-29-24-21 38 8-28Z" fill="#3e6443"/></svg><p>Cada serie cuenta.</p></div>
    <div class="sidebar-stage">FitTracker <span>Datos locales</span></div>
  </aside>
  <div class="workspace"><header class="topbar">
    <button class="icon-button mobile-menu-button" type="button" aria-label="Abrir navegación" aria-controls="mobile-menu" aria-haspopup="dialog">${icon('menu')}</button>
    <div class="mobile-brand">${brand}</div>
    <div class="mode-switcher"><span class="current-mode">Preparando tu espacio</span><button class="text-link" type="button" data-open-modes aria-haspopup="dialog" aria-controls="mode-dialog" disabled>Cambiar modo ${icon('chevron')}</button></div>
    <div class="topbar-actions"><div class="search-preview" title="Búsqueda global no disponible. Puedes buscar ejercicios dentro del catálogo.">${icon('search')}<input type="search" aria-label="Búsqueda global no disponible; busca en Ejercicios" placeholder="Buscar ejercicios, rutinas…" disabled /></div>
    <a href="#/perfil" class="profile-link" aria-label="Mi perfil"><span class="avatar">${icon('user')}</span><span>Mi perfil</span>${icon('chevron')}</a></div>
  </header>
  <div class="operation-notice" hidden><p class="operation-status" role="status" aria-live="polite"></p><button type="button" class="icon-button" data-dismiss-operation aria-label="Cerrar aviso">${icon('close')}</button></div>
  <div class="pending-workout-banner" aria-live="polite"></div>
  <main id="contenido" tabindex="-1"></main>
  <footer class="page-footer">Datos locales en este navegador · Sin cuentas ni nube.</footer></div>
  <nav class="bottom-nav" aria-label="Navegación móvil">${[
    ['inicio', 'home', 'Inicio', 'Inicio'], ['mis-rutinas', 'dumbbell', 'Entrenamientos', 'Rutinas'], ['rutina-activa', 'calendar', 'Rutina activa', 'Entrenar'], ['progreso', 'chart', 'Progreso', 'Progreso'], ['herramientas', 'tools', 'Herramientas', 'Cálculos'],
  ].map(([id, symbol, title, label]) => `<a href="#/${id}" data-mobile-page="${id}" aria-label="${label === title ? title : `${label} (${title})`}">${icon(symbol)}<span>${label}</span></a>`).join('')}</nav>
  <dialog id="mobile-menu" class="mobile-menu" aria-label="Navegación completa"><div class="menu-heading">${brand}<button type="button" class="icon-button close-menu" aria-label="Cerrar navegación" autofocus>${icon('close')}</button></div>${navigation('Todas las secciones')}</dialog>
  <dialog id="mode-dialog" class="mode-dialog" aria-labelledby="mode-dialog-title"></dialog>
  <dialog id="reset-demo-dialog" class="mode-dialog" aria-labelledby="reset-dialog-title"></dialog>`;
}
