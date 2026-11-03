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

// Original schematic illustration, decorative; the adjacent list carries the data.
export function muscleFigure() {
  const body = '<circle cx="60" cy="20" r="12"/><path d="M52 32h16l7 9 16 7 11 36 13 41-9 4-17-39-9-20-2 40 8 50-6 67H68l-4-60-4-31-4 31-4 60H40l-6-67 8-50-2-40-9 20-17 39-9-4 13-41 11-36 16-7Z"/>';
  return `<svg class="muscle-figure" viewBox="0 0 255 242" aria-hidden="true">
    <g fill="#687887" stroke="#111c26" stroke-width="1.1">${body}<g transform="translate(132)">${body}</g></g>
    <g fill="#9bf45c" fill-opacity=".85" stroke="#253d30" stroke-width="1.1">
      <path d="M31 49q10-9 17-4l-5 18-15 8Zm58 0q-10-9-17-4l5 18 15 8ZM47 46l12 2v23q-17 1-17-8Zm26 0-12 2v23q17 1 17-8Z"/>
      <path d="m41 159 10 2-1 28-11-4Zm28 2 10-2 2 26-11 4Z" fill-opacity=".5"/>
      <path d="m176 43 15 7v27l-15 20-6-29Zm32 0-15 7v27l15 20 6-29ZM163 48l10-5-6 26-9 3Zm58 0-10-5 6 26 9 3Z"/>
      <path d="m172 163 11 2-2 26-10 6Zm28 2 11-2 1 34-10-6Z" fill-opacity=".55"/>
    </g><g stroke="#26343e" fill="none"><path d="M60 74v42m-13-37 26 0m-26 11h26m-25 11h24M192 51v60m-15-35 15 7 15-7m-33 34 18 9 18-9"/></g>
    <g fill="#9ba9b4" font-size="11" text-anchor="middle"><text x="60" y="241">Frente</text><text x="192" y="241">Espalda</text></g>
  </svg>`;
}
