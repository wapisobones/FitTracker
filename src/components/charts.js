import { escapeHTML } from '../utils/html.js';

export function loadChart(data) {
  const minimum = Math.floor(Math.min(...data.load) / 5) * 5;
  const maximum = Math.ceil(Math.max(...data.load) / 5) * 5 + 5;
  const scale = 174 / (maximum - minimum);
  const points = data.load.map((value, i) => [56 + i * 546 / Math.max(1, data.load.length - 1), 206 - (value - minimum) * scale]);
  const line = points.map((point) => point.join(',')).join(' ');
  const latest = data.load.at(-1).toLocaleString('es-CL');
  return `<figure class="load-figure"><svg class="load-chart" viewBox="0 0 640 252" role="img" aria-labelledby="load-title load-desc">
    <title id="load-title">Carga de ${escapeHTML(data.exercise)}: ejemplo de octubre</title><desc id="load-desc">Datos ficticios. Última carga: ${latest} kilogramos. Los valores completos están en la tabla desplegable.</desc>
    <defs><linearGradient id="load-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#72e7a0" stop-opacity=".32"/><stop offset="1" stop-color="#72e7a0" stop-opacity=".015"/></linearGradient></defs>
    ${Array.from({ length: 7 }, (_, i) => minimum + i * (maximum - minimum) / 6).map((value) => { const y = 206 - (value - minimum) * scale; return `<path class="chart-grid" d="M56 ${y}H614"/><text class="chart-label" x="43" y="${y + 5}" text-anchor="end">${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</text>`; }).join('')}
    ${[56, 147, 238, 329, 420, 511, 602].map((x, i) => `<path class="chart-grid" d="M${x} 32V206"/><text class="chart-label" x="${x}" y="237" text-anchor="middle">${1 + i * 4} oct</text>`).join('')}
    <path d="M56 206 ${points.map(([x, y]) => `L${x} ${y}`).join(' ')} L602 206Z" fill="url(#load-fill)"/>
    <polyline points="${line}" fill="none" stroke="#9bf45c" stroke-width="3" stroke-linejoin="round"/>
    ${points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4" fill="#9bf45c"/>`).join('')}
    <rect x="568" y="17" width="66" height="29" rx="6" fill="#9bf45c"/><text x="601" y="37" text-anchor="middle" class="chart-callout">${latest} kg</text>
  </svg><figcaption class="sr-only">Evolución ficticia de la carga, expresada en kilogramos.</figcaption></figure>
  <details class="chart-data"><summary>Ver valores de ejemplo</summary><div class="table-scroll"><table><caption>${escapeHTML(data.exercise)} · octubre ficticio</caption><thead><tr><th scope="col">Registro</th><th scope="col">Carga (kg)</th></tr></thead><tbody>${data.load.map((value, i) => `<tr><th scope="row">${i + 1}</th><td>${value.toLocaleString('es-CL')}</td></tr>`).join('')}</tbody></table></div></details>`;
}
