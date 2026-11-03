import { icon } from '../components/icons.js';
import { routes } from '../app/routes.js';

export function placeholder(route, mode) {
  const heading = `<section class="page-heading"><div><h1>${icon(route.icon)}${route.title}</h1><p>${route.description}</p></div><span class="stage-pill">Próximamente</span></section>`;
  if (route.id === 'herramientas') {
    return `${heading}<div class="tool-grid">${routes.filter((r) => r.group === 'Herramientas').map((tool) => `<a class="card tool-card" href="#/${tool.id}">${icon(tool.icon)}<h2>${tool.title}</h2><p>${tool.description}</p><span class="text-link">Ver sección ${icon('arrow')}</span></a>`).join('')}</div><p class="availability-note">Puedes explorar las secciones. Los cálculos estarán disponibles en una próxima etapa.</p>`;
  }
  return `${heading}<section class="card empty-state"><span class="empty-icon">${icon(route.icon)}</span><span class="stage-pill">En preparación</span><h2>${route.empty}</h2><p>${route.detail}</p><button class="button button-primary" type="button" disabled aria-describedby="feature-status">${icon(route.icon)}${route.action}</button><p id="feature-status" class="availability-note">Esta función aún no está implementada.</p><a class="text-link" href="#/inicio">${mode === 'demo' ? 'Explorar el Dashboard de ejemplo' : 'Volver a Inicio'} ${icon('arrow')}</a></section>`;
}

export function notFound() {
  return `<section class="card empty-state"><span class="empty-icon">${icon('search')}</span><h1>Esta sección no existe</h1><p>El enlace no corresponde a una sección de FitTracker. Usa el menú para continuar.</p><a class="button button-primary" href="#/inicio">Volver a Inicio</a></section>`;
}
