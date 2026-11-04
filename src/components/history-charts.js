import { escapeHTML as esc } from '../utils/html.js';
import { number, dateLabel, dayDate } from '../features/progress/metrics.js';
import { anatomyMap } from './anatomy-map.js';
import { selectedRegions } from '../data/muscle-taxonomy.js';

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
  const xPercent = (index) => (xAt(index) - left) / (right - left) * 100;
  const yPercent = (value) => (yAt(value) - top) / (bottom - top) * 100;
  // Keep date labels apart even when observations cluster near one end.
  const middle = points.reduce((best, _, index) => Math.abs(xPercent(index) - 50) < Math.abs(xPercent(best) - 50) ? index : best, 0);
  const labels = [...new Set([0, ...(xPercent(middle) >= 25 && xPercent(middle) <= 75 ? [middle] : []), points.length - 1])];
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = minimum + index * (maximum - minimum) / 4;
    const label = value >= 1000000 ? `${number(value / 1000000)} M` : value >= 10000 ? `${number(value / 1000, 0)} mil` : number(value, 0);
    return { y: yAt(value), position: yPercent(value), label };
  });
  const graph = bars ? points.map((point, index) => {
    const width = Math.max(1, Math.min(52, (right - left) / points.length * .65));
    return `<rect x="${xAt(index) - width / 2}" y="${yAt(point.value)}" width="${width}" height="${bottom - yAt(point.value)}" rx="3" fill="url(#${id}-fill)"><title>${esc(dateLabel(dayDate(point.date)))}: ${number(point.value)} ${esc(unit)}</title></rect>`;
  }).join('') : `<polygon points="${xAt(0)},${bottom} ${coordinates} ${xAt(points.length - 1)},${bottom}" fill="url(#${id}-fill)"/><polyline points="${coordinates}" fill="none" stroke="var(--lime)" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
  return `<figure class="history-chart"><span class="history-chart-unit" aria-hidden="true">${esc(unit)}</span><div class="history-y-axis" aria-hidden="true">${ticks.map((tick) => `<span style="top:${tick.position}%">${tick.label}</span>`).join('')}</div><div class="history-plot"><svg class="load-chart" viewBox="${left} ${top} ${right - left} ${bottom - top}" preserveAspectRatio="none" role="img" aria-labelledby="${id}-title ${id}-description"><title id="${id}-title">${esc(title)}</title><desc id="${id}-description">${points.length} registros. Último valor: ${number(values.at(-1))} ${esc(unit)}. Tabla de datos disponible a continuación.</desc><defs><linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9bf45c" stop-opacity="${bars ? '.95' : '.35'}"/><stop offset="1" stop-color="#9bf45c" stop-opacity="${bars ? '.2' : '0'}"/></linearGradient></defs>
    ${ticks.map((tick) => `<path class="chart-grid" d="M${left} ${tick.y}H${right}" vector-effect="non-scaling-stroke"/>`).join('')}${graph}</svg>${bars ? '' : points.map((point, index) => `<span class="history-point" aria-hidden="true" style="left:${xPercent(index)}%;top:${yPercent(point.value)}%" title="${esc(dateLabel(dayDate(point.date)))}: ${number(point.value)} ${esc(unit)}"></span>`).join('')}</div><div class="history-x-axis" aria-hidden="true">${labels.map((index) => `<span style="left:${xPercent(index)}%;--tick-shift:${xPercent(index) < 15 ? '0%' : xPercent(index) > 85 ? '-100%' : '-50%'}">${esc(dateLabel(dayDate(points[index].date)))}</span>`).join('')}</div><figcaption>${points.length === 1 ? 'Un único registro; aún no hay una tendencia. ' : ''}${esc(title)}.</figcaption></figure>
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
  return `<div class="stats-distribution${schematic ? ' stats-distribution--anatomy' : ''}">${schematic ? muscleActivityMap(groups) : `<svg class="stats-donut" viewBox="0 0 200 200" role="img" aria-label="Distribución de ${total} series por grupo muscular; detalle en la lista contigua"><g transform="rotate(-90 100 100)">${segments}</g><text x="100" y="98" text-anchor="middle" class="donut-count">${number(total, 0)}</text><text x="100" y="120" text-anchor="middle" class="donut-label">series</text></svg>`}<ul class="muscle-list">${groups.map((group) => `<li><div><span><i style="background:${colors[group.name] ?? '#b9c6d5'}"></i>${esc(group.name)}</span><strong>${number(group.percent)} %</strong></div><div class="progress-track"><span style="width:${group.percent}%;background:${colors[group.name] ?? '#b9c6d5'}"></span></div><small>${number(group.count, 0)} series</small></li>`).join('')}</ul></div><p class="card-caption">Solo el grupo principal de cada serie. Los músculos secundarios no se suman.${schematic ? ' Las zonas resaltadas representan grupos generales, no la activación de cada músculo.' : ''}</p>`;
}

function muscleActivityMap(groups) {
  const activeGroups = groups.filter((group) => group.count > 0).map((group) => group.name);
  return anatomyMap(selectedRegions({ muscles: activeGroups }), {
    idPrefix: 'stats-anatomy',
    label: `Mapa anatómico frontal y posterior. Grupos con series completadas: ${activeGroups.join(', ')}. Las zonas resaltadas representan grupos generales, no la activación de cada músculo. Series y porcentajes en la lista contigua.`,
  });
}
