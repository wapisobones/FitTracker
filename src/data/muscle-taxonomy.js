import { MUSCLE_GROUPS } from './exercises.js';

// Stable bilateral selection IDs, independent of exercise IDs. Visible regions
// represent only exposed surfaces; deep muscles remain available in the list.
export const MUSCLE_REGIONS = Object.freeze([
  { id: 'pectorals', name: 'Pectorales', group: 'Pecho', views: ['front'] },
  { id: 'latissimus', name: 'Dorsales', group: 'Espalda', views: ['back'] },
  { id: 'trapezius', name: 'Trapecios', group: 'Espalda', views: ['back'] },
  { id: 'rhomboids', name: 'Romboides', group: 'Espalda', views: [], note: 'Profundos al trapecio; selección solo por lista.' },
  { id: 'spinal-erectors', name: 'Erectores espinales', group: 'Espalda', views: [], note: 'Cubiertos por músculos y fascia; selección solo por lista.' },
  { id: 'gluteals', name: 'Glúteos', group: 'Piernas', views: ['back'] },
  { id: 'quadriceps', name: 'Cuádriceps', group: 'Piernas', views: ['front'] },
  { id: 'hamstrings', name: 'Isquiotibiales', group: 'Piernas', views: ['back'] },
  { id: 'adductors', name: 'Aductores', group: 'Piernas', views: ['front'], note: 'El mapa muestra la porción superficial medial del muslo.' },
  { id: 'hip-abductors', name: 'Abductores', group: 'Piernas', views: ['back'], note: 'El mapa muestra la porción expuesta del glúteo medio.' },
  { id: 'gastrocnemius', name: 'Gastrocnemio (gemelos)', group: 'Piernas', views: ['back'] },
  { id: 'soleus', name: 'Sóleo', group: 'Piernas', views: ['back'], note: 'Solo la porción distal y lateral expuesta bajo los gemelos.' },
  { id: 'tibialis-anterior', name: 'Tibial anterior', group: 'Piernas', views: ['front'] },
  { id: 'anterior-deltoid', name: 'Deltoides anterior', group: 'Hombros', views: ['front'] },
  { id: 'lateral-deltoid', name: 'Deltoides lateral', group: 'Hombros', views: ['front', 'back'] },
  { id: 'posterior-deltoid', name: 'Deltoides posterior', group: 'Hombros', views: ['back'] },
  { id: 'biceps', name: 'Bíceps', group: 'Brazos', views: ['front'] },
  { id: 'triceps', name: 'Tríceps', group: 'Brazos', views: ['back'] },
  { id: 'brachialis', name: 'Braquial', group: 'Brazos', views: ['front'], note: 'Solo la franja distal expuesta junto al bíceps.' },
  { id: 'forearms', name: 'Antebrazos', group: 'Brazos', views: ['front', 'back'] },
  { id: 'rectus-abdominis', name: 'Recto abdominal', group: 'Core', views: ['front'] },
  { id: 'obliques', name: 'Oblicuos', group: 'Core', views: ['front'], note: 'El mapa muestra el oblicuo externo.' },
].map((region) => Object.freeze({ ...region, views: Object.freeze(region.views) })));

export const regionsForGroup = (group) => MUSCLE_REGIONS.filter((region) => region.group === group);
export const legacyGroupsForRegions = (ids) => MUSCLE_GROUPS.filter((group) => regionsForGroup(group).some((region) => ids.includes(region.id)));

// Expand old broad selections in memory; never rewrite plans or snapshots.
export function selectedRegions(config) {
  return MUSCLE_REGIONS.filter((region) => Array.isArray(config.regions) ? config.regions.includes(region.id) : config.muscles.includes(region.group)).map((region) => region.id);
}

export function groupSelection(ids, group) {
  const regions = regionsForGroup(group);
  const count = regions.filter((region) => ids.includes(region.id)).length;
  return count === regions.length ? 'true' : count ? 'mixed' : 'false';
}

export function toggleMuscleSelection(config, id, isGroup = false) {
  const current = selectedRegions(config);
  const targets = isGroup ? regionsForGroup(id).map((region) => region.id) : MUSCLE_REGIONS.filter((region) => region.id === id).map((region) => region.id);
  const remove = targets.every((target) => current.includes(target));
  const next = remove ? current.filter((item) => !targets.includes(item)) : [...current, ...targets];
  const regions = MUSCLE_REGIONS.filter((region) => next.includes(region.id)).map((region) => region.id);
  const muscles = legacyGroupsForRegions(regions);
  return { ...config, regions, muscles, priorities: config.priorities.filter((group) => muscles.includes(group)) };
}
