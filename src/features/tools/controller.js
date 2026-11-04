import { icon } from '../../components/icons.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { weightNumber, fromKg } from '../../utils/units.js';
import { profileService } from '../profile/profile-service.js';
import { estimate1RM, estimateCalories, ACTIVITIES, ENERGY_GOALS } from './calculations.js';

const number = (value, digits = 0) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(value);
const heading = (calories) => `<section class="page-heading"><div><h1>${icon(calories ? 'flame' : 'calculator')}${calories ? 'Calculadora de calorías' : 'Calculadora de 1RM'}</h1><p>${calories ? 'Explora una estimación de energía y macronutrientes.' : 'Estima tu repetición máxima y consulta cargas de referencia.'}</p></div></section>`;
const field = (name, label, min, max, step = 'any') => `<label>${label}<input name="${name}" type="number" inputmode="${step === '1' ? 'numeric' : 'decimal'}" min="${min}" max="${max}" step="${step}" required></label>`;

function guide(calories) {
  return `<details class="card calculation-guide" id="calculation-guide"><summary>${icon('info')}Guía y fórmulas</summary>${calories ? `<p>Mifflin–St Jeor: 10 × peso (kg) + 6,25 × estatura (cm) − 5 × edad + constante (+5 para hombre, −161 para mujer). Estima energía en reposo; aquí se muestra como metabolismo basal (TMB).</p><p>Gasto diario (TDEE) = TMB × factor de actividad. Factores aproximados: 1,2 / 1,375 / 1,55 / 1,725 / 1,9. La actividad cotidiana también cuenta: los días de entrenamiento son solo una referencia.</p><p>Escenarios elegidos: déficit −15 %, mantenimiento y superávit +10 %. Reparto ilustrativo: proteína 30 %, carbohidratos 40 %, grasas 30 %; 4, 4 y 9 kcal por gramo. Se calcula sin redondear y se muestran cifras redondeadas.</p><p>Para adultos de 18–100 años; no contempla embarazo, lactancia ni condiciones clínicas. Son aproximaciones, no consejo clínico ni una promesa de cambio de peso.</p><a class="text-link" href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer">Estudio original de Mifflin–St Jeor (1990)</a>` : `<p>Epley: peso × (1 + repeticiones / 30). Esta calculadora aplica la fórmula a 1–10 repeticiones, incluso a una repetición. Con más repeticiones la estimación es menos fiable.</p><p>Usa una serie de esfuerzo alto con técnica controlada. El resultado depende del ejercicio y de la persona; no es un máximo comprobado ni una indicación para intentar esa carga.</p><p>Los porcentajes son referencias matemáticas. No predicen cuántas repeticiones podrás realizar ni se redondean al material disponible. Progreso conserva su criterio anterior: una repetición realizada se muestra como carga real.</p>`}</details>`;
}
function calculator(calories, unit) {
  return `${heading(calories)}<div class="calculation-links"><a class="button button-primary" href="#/${calories ? 'calculadora-calorias' : 'calculadora-1rm'}">${icon('calculator')}Calculadora</a><button type="button" class="button button-secondary" data-guide>${icon('info')}Guía y fórmulas</button></div><div class="calculator-grid"><section class="card calculator-form"><h2>${icon(calories ? 'user' : 'dumbbell')}${calories ? 'Tus datos' : 'Datos del ejercicio'}</h2><form data-calculator novalidate>${calories ? `<label>Sexo usado por la fórmula<select name="sex" required><option value="">Seleccionar</option><option value="male">Hombre (+5)</option><option value="female">Mujer (−161)</option></select></label><div class="calculator-fields">${field('age', 'Edad (años)', 18, 100, '1')}${field('weight', `Peso (${unit})`, fromKg(30, unit), fromKg(350, unit))}${field('height', 'Estatura (cm)', 120, 230)}</div><label>Nivel de actividad<select name="activity">${Object.entries(ACTIVITIES).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join('')}</select></label><p class="availability-note" data-activity>${ACTIVITIES.sedentary.detail}</p><fieldset class="energy-goals"><legend>Objetivo</legend>${Object.entries(ENERGY_GOALS).map(([key, value]) => `<label><input type="radio" name="goal" value="${key}"${key === 'maintenance' ? ' checked' : ''}><span>${value.label}</span></label>`).join('')}</fieldset>` : `<p class="availability-note">El cálculo se aplica a la carga de la serie que introduzcas.</p><div class="calculator-fields">${field('weight', `Peso utilizado (${unit})`, .01, fromKg(2000, unit))}${field('reps', 'Repeticiones realizadas', 1, 10, '1')}</div>`}<p class="calculation-error" role="alert"></p><button type="submit" class="button button-primary">${icon('calculator')}Calcular ${calories ? 'calorías' : '1RM'}</button><p class="availability-note">${calories ? 'Estos datos solo se usan en esta pantalla. No se guardan ni se incluyen en respaldos.' : `Unidad del perfil: ${unit}. No se guarda este cálculo como un récord.`}</p></form></section><section class="card calculator-result" aria-live="polite" aria-atomic="true"><h2>${icon('target')}Tu ${calories ? 'estimación de energía' : '1RM estimado'}</h2><div data-calculation-result><p class="calculation-empty">Completa los datos y calcula para ver la estimación.</p></div></section><section class="card calculator-reference" aria-live="polite"><h2>${icon(calories ? 'chart' : 'dumbbell')}${calories ? 'Macronutrientes' : 'Cargas de referencia'}</h2><div data-calculation-reference><p class="calculation-empty">${calories ? 'Verás un reparto ilustrativo según el objetivo elegido.' : 'Los porcentajes se calcularán a partir de tu 1RM estimado.'}</p></div></section></div>${guide(calories)}`;
}
function result1RM(result, unit) {
  return `<output class="calculation-value" aria-label="1RM estimado">${weightNumber(result.estimatedKg, unit)} <small>${unit}</small></output><p class="calculation-highlight">Estimación de Epley</p><dl class="calculation-summary"><div><dt>Fórmula</dt><dd>Peso × (1 + reps / 30)</dd></div><div><dt>Cálculo (${unit})</dt><dd>${weightNumber(result.weightKg, unit)} × (1 + ${result.reps} / 30)</dd></div></dl><p class="availability-note">Referencia orientativa. No representa un máximo comprobado.</p>`;
}
function reference1RM(result, unit) {
  return `<p class="availability-note">Porcentajes orientativos de tu estimación; adapta la carga a tu técnica y material.</p><table class="reference-table"><caption>Cargas orientativas (${unit})</caption><thead><tr><th scope="col">Porcentaje</th><th scope="col">Carga (${unit})</th></tr></thead><tbody>${[100, 95, 90, 85, 80, 75, 70, 65, 60].map((percent) => `<tr${percent === 80 ? ' class="reference-highlight"' : ''}><th scope="row">${percent} %</th><td>${weightNumber(result.estimatedKg * percent / 100, unit)}</td></tr>`).join('')}</tbody></table>`;
}
function resultCalories(result) {
  return `<p class="calculation-caption">Gasto de mantenimiento estimado (TDEE)</p><output class="calculation-value" aria-label="Gasto diario estimado">${number(result.tdee)} <small>kcal/día</small></output><div class="energy-scenarios">${Object.entries(ENERGY_GOALS).map(([key, goal]) => `<div${key === result.goal ? ' class="selected"' : ''}><span>${goal.label}${key === result.goal ? ' · Elegido' : ''}</span><strong>${number(result.tdee * goal.factor)}</strong><small>kcal/día</small></div>`).join('')}</div><dl class="calculation-summary"><div><dt>Metabolismo basal (TMB)</dt><dd>${number(result.basal)} kcal/día</dd></div><div><dt>Factor de actividad</dt><dd>${number(result.activity, 3)}</dd></div><div class="calculation-highlight"><dt>Escenario elegido</dt><dd>${number(result.target)} kcal/día</dd></div></dl><p class="availability-note">Estimaciones orientativas, no una recomendación clínica. Consulta los supuestos en la guía.</p>`;
}
function referenceCalories(result) {
  return `<div class="macro-ring" role="img" aria-label="Proteínas 30 %, carbohidratos 40 %, grasas 30 %"><span><strong>${number(result.target)}</strong><small>kcal/día</small></span></div><ul class="macro-list">${[['Proteínas', 30, result.protein, 'protein'], ['Carbohidratos', 40, result.carbs, 'carbs'], ['Grasas', 30, result.fat, 'fat']].map(([label, percent, grams, color]) => `<li class="${color}"><span>${label} (${percent} %)</span><strong>≈ ${number(grams)} g</strong></li>`).join('')}</ul><p class="availability-note">Reparto ilustrativo del escenario elegido. No es un objetivo nutricional personalizado.</p>`;
}
export function toolsHome() {
  return `<section class="page-heading"><div><h1>${icon('tools')}Herramientas</h1><p>Calculadoras locales para acompañar tu entrenamiento.</p></div></section><div class="tool-grid">${[['calculadora-1rm', 'calculator', 'Calculadora de 1RM', 'Estima una repetición máxima y consulta cargas orientativas.'], ['calculadora-calorias', 'flame', 'Calculadora de calorías', 'Explora tu gasto energético y un reparto de macronutrientes.']].map(([id, symbol, title, detail]) => `<a class="card tool-card" href="#/${id}">${icon(symbol)}<h2>${title}</h2><p>${detail}</p><span class="text-link">Abrir calculadora ${icon('arrow')}</span></a>`).join('')}</div><p class="availability-note">Los cálculos funcionan sin conexión una vez cargada la aplicación. No se envían datos a servicios externos.</p>`;
}
export function mountCalculator(root, mode, calories) {
  const events = new AbortController();
  let alive = true;
  let unit;
  async function load() {
    root.innerHTML = `${heading(calories)}<p role="status">Cargando preferencias…</p>`;
    try {
      const settings = await profileService(mode).load();
      if (!alive) return;
      unit = settings.weightUnit;
      root.innerHTML = calculator(calories, unit);
    } catch (error) { if (alive) root.innerHTML = `${heading(calories)}<section class="card tool-error" role="alert"><p>${esc(error.message)}</p><button type="button" class="button button-secondary" data-retry-calculator>Reintentar</button></section>`; }
  }
  root.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-calculator]')) return;
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.target));
    const error = root.querySelector('.calculation-error');
    try {
      const result = calories ? estimateCalories(fields, unit) : estimate1RM(fields.weight, fields.reps, unit);
      error.textContent = '';
      root.querySelector('[data-calculation-result]').innerHTML = calories ? resultCalories(result) : result1RM(result, unit);
      root.querySelector('[data-calculation-reference]').innerHTML = calories ? referenceCalories(result) : reference1RM(result, unit);
    } catch (failure) {
      error.textContent = failure.message;
      root.querySelector('[data-calculation-result]').innerHTML = '<p class="calculation-empty">Revisa los datos para calcular una estimación válida.</p>';
      root.querySelector('[data-calculation-reference]').innerHTML = '';
    }
  }, { signal: events.signal });
  root.addEventListener('input', (event) => {
    if (!event.target.closest('[data-calculator]')) return;
    root.querySelector('[data-calculation-result]').innerHTML = '<p class="calculation-empty">Datos modificados. Pulsa Calcular para actualizar el resultado.</p>';
    root.querySelector('[data-calculation-reference]').innerHTML = '';
    if (event.target.name === 'activity') root.querySelector('[data-activity]').textContent = ACTIVITIES[event.target.value].detail;
  }, { signal: events.signal });
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-retry-calculator]')) void load();
    if (event.target.closest('[data-guide]')) { const guide = root.querySelector('#calculation-guide'); guide.open = true; guide.scrollIntoView({ block: 'start' }); guide.querySelector('summary').focus({ preventScroll: true }); }
  }, { signal: events.signal });
  void load();
  return { destroy() { alive = false; events.abort(); } };
}
