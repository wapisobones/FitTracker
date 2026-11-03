import { escapeHTML as esc } from '../utils/html.js';
import { number, dateLabel, dayDate } from '../features/progress/metrics.js';

export function seriesChart(points, { id, title, unit = 'kg', bars = false } = {}) {
  if (!points.length) return `<div class="stats-chart-empty"><p>No hay registros para este gráfico.</p><small>${id === 'strength' ? 'Selecciona otro ejercicio o amplía el período. El 1RM estimado requiere carga positiva y entre 1 y 10 repeticiones.' : 'Completa series y guarda una sesión para ver su evolución.'}</small></div>`;
  const left = 85, right = 460, top = 28, bottom = 208;
  const values = points.map((point) => point.value);
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const minimum = bars ? 0 : Math.max(0, Math.floor(rawMin / 5) * 5 - 5);
  const maximum = Math.max(minimum + 5, Math.ceil(rawMax / 5) * 5 + 5);
  const dates = points.map((point) => dayDate(point.date).getTime());
  const first = dates[0], last = dates.at(-1);
  const xAt = (index) => bars ? left + (index + .5) * (right - left) / points.length : first === last ? (left + right) / 2 : left + (dates[index] - first) / (last - first) * (right - left);
  const yAt = (value) => bottom - (value - minimum) / (maximum - minimum) * (bottom - top);
  const coordinates = points.map((point, index) => `${xAt(index)},${yAt(point.value)}`).join(' ');
  const labels = [...new Set([0, Math.floor((points.length - 1) / 3), Math.floor((points.length - 1) * 2 / 3), points.length - 1])];
  const graph = bars ? points.map((point, index) => {
    const width = Math.max(1, Math.min(52, (right - left) / points.length * .65));
    return `<rect x="${xAt(index) - width / 2}" y="${yAt(point.value)}" width="${width}" height="${bottom - yAt(point.value)}" rx="3" fill="url(#${id}-fill)"><title>${esc(dateLabel(dayDate(point.date)))}: ${number(point.value)} ${esc(unit)}</title></rect>`;
  }).join('') : `<polygon points="${xAt(0)},${bottom} ${coordinates} ${xAt(points.length - 1)},${bottom}" fill="url(#${id}-fill)"/><polyline points="${coordinates}" fill="none" stroke="var(--lime)" stroke-width="3"/>${points.map((point, index) => `<circle cx="${xAt(index)}" cy="${yAt(point.value)}" r="4" fill="var(--lime)"><title>${esc(dateLabel(dayDate(point.date)))}: ${number(point.value)} ${esc(unit)}</title></circle>`).join('')}`;
  return `<figure class="history-chart"><svg class="load-chart" viewBox="0 0 480 260" role="img" aria-labelledby="${id}-title ${id}-description"><title id="${id}-title">${esc(title)}</title><desc id="${id}-description">${points.length} registros. Último valor: ${number(values.at(-1))} ${esc(unit)}. Tabla de datos disponible a continuación.</desc><defs><linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9bf45c" stop-opacity="${bars ? '.95' : '.35'}"/><stop offset="1" stop-color="#9bf45c" stop-opacity="${bars ? '.2' : '0'}"/></linearGradient></defs>
    ${Array.from({ length: 5 }, (_, index) => { const value = minimum + index * (maximum - minimum) / 4; const y = yAt(value); const label = value >= 1000000 ? `${number(value / 1000000)} M` : value >= 10000 ? `${number(value / 1000, 0)} mil` : number(value, 0); return `<path class="chart-grid" d="M${left} ${y}H${right}"/><text class="chart-label" text-anchor="end" x="${left - 9}" y="${y + 5}">${label}</text>`; }).join('')}
    ${graph}${labels.map((index) => `<text class="chart-label" text-anchor="middle" x="${Math.min(438, Math.max(90, xAt(index)))}" y="238">${esc(dateLabel(dayDate(points[index].date)))}</text>`).join('')}
    <text class="chart-label" x="${left}" y="17">${esc(unit)}</text></svg><figcaption>${points.length === 1 ? 'Un único registro; aún no hay una tendencia. ' : ''}${esc(title)}.</figcaption></figure>
    <details class="chart-data"><summary>Ver datos del gráfico</summary><div class="table-scroll"><table><caption>${esc(title)}</caption><thead><tr><th scope="col">Fecha</th><th scope="col">${esc(unit)}</th></tr></thead><tbody>${points.map((point) => `<tr><th scope="row">${esc(dateLabel(dayDate(point.date), { year: 'numeric' }))}</th><td>${number(point.value)}</td></tr>`).join('')}</tbody></table></div></details>`;
}

const colors = { Pecho: '#9bf45c', Espalda: '#45d699', Piernas: '#54cde1', Hombros: '#a28bf8', Brazos: '#ea86c4', Core: '#ffc244' };
export function distribution(groups, total, { schematic = false } = {}) {
  if (!total) return '<div class="stats-chart-empty"><p>Sin series completadas en este período.</p><small>Cada serie se cuenta una vez, en su grupo muscular principal.</small></div>';
  let offset = 0;
  const segments = groups.map((group) => {
    const length = group.count / total * 100;
    const circle = `<circle cx="100" cy="100" r="74" fill="none" stroke="${colors[group.name] ?? '#b9c6d5'}" stroke-width="24" pathLength="100" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}"/>`;
    offset += length;
    return circle;
  }).join('');
  return `<div class="stats-distribution">${schematic ? bodyFigure(groups) : `<svg class="stats-donut" viewBox="0 0 200 200" role="img" aria-label="Distribución de ${total} series por grupo muscular; detalle en la lista contigua"><g transform="rotate(-90 100 100)">${segments}</g><text x="100" y="98" text-anchor="middle" class="donut-count">${number(total, 0)}</text><text x="100" y="120" text-anchor="middle" class="donut-label">series</text></svg>`}<ul class="muscle-list">${groups.map((group) => `<li><div><span><i style="background:${colors[group.name] ?? '#b9c6d5'}"></i>${esc(group.name)}</span><strong>${number(group.percent)} %</strong></div><div class="progress-track"><span style="width:${group.percent}%;background:${colors[group.name] ?? '#b9c6d5'}"></span></div><small>${number(group.count, 0)} series</small></li>`).join('')}</ul></div><p class="card-caption">Solo el grupo principal de cada serie. Los músculos secundarios no se suman.</p>`;
}

function bodyFigure(groups) {
  const intensity = (name) => groups.some((group) => group.name === name) ? .35 + .65 * groups.find((group) => group.name === name).percent / 100 : 0;
  const body = '<circle cx="60" cy="20" r="12"/><path d="M52 32h16l7 9 16 7 11 36 13 41-9 4-17-39-9-20-2 40 8 50-6 67H68l-4-60-4-31-4 31-4 60H40l-6-67 8-50-2-40-9 20-17 39-9-4 13-41 11-36 16-7Z"/>';
  const zones = [
    ['Pecho', 'M47 46l12 2v23q-17 1-17-8Zm26 0-12 2v23q17 1 17-8Z'],
    ['Espalda', 'm176 43 15 7v27l-15 20-6-29Zm32 0-15 7v27l15 20 6-29Z'],
    ['Piernas', 'm41 119 14 4-5 65-11-4Zm24 4 14-4 2 65-11 4Z'],
    ['Hombros', 'M31 49q10-9 17-4l-5 18-15 8Zm58 0q-10-9-17-4l5 18 15 8Z'],
    ['Brazos', 'm22 75 10 5-18 45-8-3Zm66 5 10-5 16 47-8 3Z'],
    ['Core', 'M47 77h26l-3 31H50Z'],
  ];
  return `<svg class="muscle-figure" viewBox="0 0 255 242" aria-hidden="true"><g fill="#687887" stroke="#111c26">${body}<g transform="translate(132)">${body}</g></g>${zones.map(([name, path]) => `<path d="${path}" fill="#9bf45c" opacity="${intensity(name)}"/>`).join('')}<g fill="#9ba9b4" font-size="11" text-anchor="middle"><text x="60" y="241">Frente</text><text x="192" y="241">Espalda</text></g></svg>`;
}
