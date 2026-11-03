import { escapeHTML as esc } from '../../utils/html.js';

// Original simplified anatomy, drawn for FitTracker. Each bilateral zone shares
// one accessible group button; the adjacent HTML list is an equal alternative.
const outline = 'M93 50Q110 42 127 50L134 66 154 76 167 121 179 168 169 177 155 146 144 112 139 153 147 201 140 257 132 319 137 346 118 349 113 318 110 263 105 219 101 263 99 318 94 349 75 346 80 319 72 257 65 201 73 153 68 112 57 146 43 177 33 168 45 121 58 76 79 66Z';
const front = {
  Pecho: 'M82 72Q94 65 106 73L106 100Q88 106 77 93ZM110 73Q122 65 134 72L139 93Q128 106 110 100Z',
  Hombros: 'M62 78 78 70 75 94 61 108 54 103ZM138 70 154 78 162 103 155 108 141 94Z',
  Brazos: 'M53 108 64 113 55 142 44 167 37 164 45 132ZM152 113 163 108 171 132 179 164 172 167 161 142Z',
  Core: 'M84 108 104 107 104 151 95 167 83 148ZM112 107 132 108 133 148 121 167 112 151Z',
  Piernas: 'M76 166 102 175 97 218 84 244 75 210ZM114 175 140 166 141 210 132 244 119 218ZM77 253 94 247 91 312 81 316ZM122 247 139 253 135 316 125 312Z',
};
const back = {
  Espalda: 'M80 73 105 83 105 139 85 151 74 110ZM111 83 136 73 142 110 131 151 111 139Z',
  Hombros: 'M62 78 78 70 76 94 62 108 54 103ZM138 70 154 78 162 103 154 108 140 94Z',
  Brazos: 'M53 108 64 113 55 142 44 167 37 164 45 132ZM152 113 163 108 171 132 179 164 172 167 161 142Z',
  Piernas: 'M77 158Q89 151 105 161L103 187 78 189 70 178ZM111 161Q127 151 139 158L146 178 138 189 113 187ZM76 197 101 197 94 243 78 246ZM115 197 140 197 138 246 122 243ZM77 254 94 249 91 312 81 316ZM122 249 139 254 135 316 125 312Z',
};
const hitAreas = {
  Pecho: [[76, 66, 64, 38]], Espalda: [[74, 73, 68, 80]], Core: [[82, 105, 52, 63]],
  Hombros: [[53, 70, 27, 38], [136, 70, 27, 38]], Brazos: [[34, 108, 31, 69], [151, 108, 31, 69]], Piernas: [[70, 158, 77, 161]],
};
export function bodyMap(selected, view) {
  function figure(zones, side, label) {
    return `<svg class="generator-body" data-body-side="${side}" viewBox="0 0 216 380" role="group" aria-label="Mapa muscular ${label}"><g class="body-outline"><ellipse cx="108" cy="27" rx="18" ry="23"/><path d="${outline}"/></g><g class="body-lines"><path d="M108 53v113M78 155l30 13 30-13M75 249h19m28 0h18"/></g>${Object.entries(zones).map(([group, path]) => `<g role="button" tabindex="0" aria-label="${esc(group)}, vista ${label}" aria-pressed="${selected.includes(group)}" data-map-muscle="${esc(group)}"><title>${esc(group)}</title>${hitAreas[group].map(([x, y, width, height]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="transparent"/>`).join('')}<path d="${path}"/></g>`).join('')}<text x="108" y="375" text-anchor="middle">${side === 'front' ? 'Frente' : 'Espalda'}</text></svg>`;
  }
  return `<div class="generator-map" data-body-view="${view}">${figure(front, 'front', 'frontal')}${figure(back, 'back', 'posterior')}</div>`;
}
