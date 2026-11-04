import { MUSCLE_REGIONS } from '../data/muscle-taxonomy.js';
import { escapeHTML as esc } from '../utils/html.js';

// Original FitTracker Bézier drawing. No tracing, downloaded paths or external
// artwork. Coordinates describe the viewer's left half; its partner is mirrored.
const silhouette = 'M139 99 Q137 117 128 121 L105 127 Q86 128 75 144 Q66 161 63 181 L49 231 Q43 247 42 263 Q32 289 25 321 L18 347 Q9 355 7 370 L5 384 Q6 389 10 384 L15 371 L12 392 Q13 397 17 392 L23 373 L20 392 Q22 397 25 391 L30 373 Q33 381 36 376 L36 356 Q45 330 57 309 Q68 287 70 269 L88 223 Q94 208 100 196 Q104 225 112 251 Q118 273 113 297 Q103 325 103 358 Q100 393 101 426 Q100 471 109 505 Q113 519 111 536 Q104 568 113 607 Q122 640 124 681 L123 706 Q116 717 111 725 Q108 735 121 737 L141 735 Q150 734 150 727 L146 706 L146 681 Q150 641 149 614 Q155 578 147 549 Q144 530 150 509 Q157 466 156 424 L158 381 L162 381 L164 424 Q163 466 170 509 Q176 530 173 549 Q165 578 171 614 Q170 641 174 681 L174 706 L170 727 Q170 734 179 735 L199 737 Q212 735 209 725 Q204 717 197 706 L196 681 Q198 640 207 607 Q216 568 209 536 Q207 519 211 505 Q220 471 219 426 Q220 393 217 358 Q217 325 207 297 Q202 273 208 251 Q216 225 220 196 Q226 208 232 223 L250 269 Q252 287 263 309 Q275 330 284 356 L284 376 Q287 381 290 373 L295 391 Q298 397 300 392 L297 373 L303 392 Q307 397 308 392 L305 371 L310 384 Q314 389 315 384 L313 370 Q311 355 302 347 L295 321 Q288 289 278 263 Q277 247 271 231 L257 181 Q254 161 245 144 Q234 128 215 127 L192 121 Q183 117 181 99 Z';
const head = 'M134 46 Q134 20 160 19 Q186 20 186 46 L184 73 Q181 90 169 100 Q160 106 151 100 Q139 90 136 73 Z';

// Multiple contours in a region delineate exposed heads, not extra selections.
const front = {
  pectorals: ['M155 142 C140 137 122 132 110 140 C102 147 99 162 100 173 C111 185 131 190 154 182 Q157 164 155 142 Z'],
  'anterior-deltoid': ['M103 135 Q86 135 78 151 Q77 165 78 182 Q91 174 100 157 Z'],
  'lateral-deltoid': ['M76 153 Q67 169 66 188 L70 207 Q78 199 81 185 Q75 174 76 153 Z'],
  biceps: ['M96 179 C86 176 80 185 76 202 Q67 222 65 237 C63 247 69 256 73 254 C84 244 87 231 90 218 Q96 197 96 179 Z'],
  brachialis: ['M68 212 L58 239 Q54 252 57 262 L65 258 Q62 243 68 228 Z'],
  forearms: ['M55 268 Q44 281 37 306 L24 345 L32 351 Q44 322 54 304 Q65 284 65 269 Z', 'M68 274 Q65 298 53 318 L37 346 L42 325 Q52 299 57 281 Z'],
  'rectus-abdominis': ['M155 194 Q143 189 138 195 Q133 203 136 214 Q144 218 155 215 Z', 'M155 223 Q143 219 136 224 Q133 233 136 243 Q145 248 155 244 Z', 'M155 252 Q144 248 138 253 Q136 262 140 271 Q148 275 155 271 Z', 'M155 279 Q146 275 141 280 Q141 299 155 317 Q157 299 155 279 Z'],
  obliques: ['M110 203 Q117 211 128 211 L130 260 Q130 289 146 318 Q124 307 118 291 Q122 267 117 246 Z'],
  quadriceps: ['M121 347 C115 350 114 371 114 399 Q114 443 120 472 Q123 488 128 494 C137 477 137 460 137 438 Q141 397 136 374 Z', 'M111 366 C102 384 103 420 107 448 Q108 481 118 500 L124 503 C114 473 111 451 112 429 Q108 395 111 366 Z', 'M145 423 C153 448 152 476 144 493 Q141 511 131 510 Q126 508 128 501 C141 479 141 456 145 423 Z'],
  adductors: ['M143 348 L155 369 Q153 399 148 423 L141 445 Q140 402 132 378 Z'],
  'tibialis-anterior': ['M123 551 Q113 565 120 600 Q131 640 132 683 L140 695 Q142 654 136 618 Q128 585 133 553 Z'],
};
const back = {
  trapezius: ['M155 108 Q149 115 143 119 Q127 130 105 133 Q112 144 121 151 Q139 165 145 180 Q151 195 155 210 Q159 166 155 108 Z'],
  latissimus: ['M109 190 Q125 196 140 183 Q144 202 149 218 Q148 243 143 259 Q137 275 128 287 Q125 254 114 234 Q110 218 109 190 Z'],
  'posterior-deltoid': ['M104 136 Q86 134 78 151 L82 179 Q98 178 112 160 Z'],
  'lateral-deltoid': ['M76 153 Q67 169 66 188 L70 207 Q79 196 81 183 Q76 173 76 153 Z'],
  triceps: ['M98 182 Q84 180 77 203 L61 246 Q60 258 68 263 Q77 255 80 243 L84 222 Q95 210 98 182 Z', 'M97 202 Q93 228 86 246 L78 257 L83 232 Z'],
  forearms: ['M54 270 Q42 286 36 308 L24 345 L32 352 Q44 322 55 304 Q63 287 64 273 Z', 'M67 279 Q62 305 45 333 L37 347 L41 326 L58 287 Z'],
  'hip-abductors': ['M117 301 Q130 299 143 310 L132 327 Q116 331 107 347 Q107 321 117 301 Z'],
  gluteals: ['M146 316 Q130 328 117 334 Q107 346 108 367 Q112 389 137 388 Q150 383 155 369 L155 334 Z'],
  hamstrings: ['M112 397 C109 421 108 443 113 465 Q116 494 121 506 L128 518 Q124 477 128 450 Q131 423 129 397 Z', 'M135 399 Q142 397 150 391 C154 420 153 447 147 476 Q144 501 138 519 L132 519 Q135 478 132 451 Q130 421 135 399 Z'],
  gastrocnemius: ['M121 549 Q111 556 114 580 Q117 604 129 620 L134 611 Q138 586 131 557 Z', 'M136 549 Q147 553 147 577 Q149 602 140 618 L136 612 Q140 586 134 560 Z'],
  soleus: ['M112 588 Q114 619 126 653 L131 676 L132 643 Q121 623 112 588 Z', 'M148 600 Q146 632 141 662 L137 678 L136 647 Q143 629 148 600 Z'],
};
const frontLines = 'M144 108 L151 127 M176 108 L169 127 M113 135 Q136 128 153 137 M207 135 Q184 128 167 137 M160 143 V316 M116 304 L151 336 M204 304 L169 336 M151 340 L160 359 L169 340 M121 522 Q129 515 140 524 L139 538 Q130 544 121 536 Z M180 524 Q191 515 199 522 L199 536 Q190 544 181 538 Z M120 704 L144 704 M176 704 L200 704';
const backLines = 'M160 108 V301 M112 166 Q121 161 133 178 L113 187 Z M208 166 Q199 161 187 178 L207 187 Z M145 231 L150 294 M175 231 L170 294 M136 292 L160 307 L184 292 M160 316 V378 M115 528 Q130 536 143 529 M177 529 Q190 536 205 528 M134 624 L134 693 M186 624 L186 693 M123 704 L146 704 M174 704 L197 704';

// Decorative fascicle marks never intercept input.
const fibers = {
  front: 'M109 149 L146 154 M108 158 L145 162 M110 168 L145 172 M87 147 L84 162 M83 207 L73 237 M49 290 L33 333 M119 220 L125 228 M121 237 L126 245 M123 255 L128 263 M125 276 L133 289 M125 378 Q120 420 127 465 M115 417 L117 452 M143 468 L137 495 M145 375 L147 401 M124 574 L133 622',
  back: 'M145 126 L127 135 M148 142 L133 146 M150 159 L144 169 M117 205 L137 221 M120 221 L136 238 M124 241 L133 256 M91 146 L99 158 M85 202 L70 244 M47 294 L32 336 M117 320 L127 312 M119 351 Q133 341 143 335 M117 364 Q131 357 145 346 M122 410 L120 459 M140 413 L141 465 M124 567 L124 595 M141 565 L143 588 M121 615 L128 640',
};

export function anatomyMap(selected, { view = 'both', interactive = false, idPrefix = 'anatomy', label = 'Mapa anatómico frontal y posterior' } = {}) {
  function regionShape(region, zones, side, label) {
    // Anatomical left/right reverses when the person faces the viewer.
    const halves = side === 'front' ? ['right', 'left'] : ['left', 'right'];
    const paths = halves.map((half, index) => `<g${index ? ' transform="translate(320 0) scale(-1 1)"' : ''}>${zones[region.id].map((path, part) => `<path id="${idPrefix}-${side}-${region.id}-${half}-${part + 1}" d="${path}"/>`).join('')}</g>`).join('');
    const state = interactive ? `id="map-${side}-${region.id}" role="button" tabindex="0" aria-label="${region.name}, vista ${label}, ambos lados" aria-pressed="${selected.includes(region.id)}" data-map-muscle="${region.id}"` : `data-active="${selected.includes(region.id)}"`;
    return `<g data-anatomy-region="${region.id}" data-muscle-group="${region.group}" ${state}>${interactive ? `<title>${region.name} · ambos lados</title>` : ''}${paths}</g>`;
  }
  function figure(zones, side, label) {
    const visible = MUSCLE_REGIONS.filter((region) => region.views.includes(side));
    return `<figure class="anatomy-figure" data-body-side="${side}"><figcaption>${side === 'front' ? 'Frente' : 'Espalda'}</figcaption><svg class="anatomy-body${interactive ? ' generator-body' : ''}" viewBox="0 0 320 760" ${interactive ? `role="group" aria-label="Mapa muscular ${label}" aria-describedby="anatomy-help"` : 'aria-hidden="true" focusable="false"'}><g class="body-outline" aria-hidden="true"><path d="${head}"/><path d="${silhouette}"/></g>${visible.map((region) => regionShape(region, zones, side, label)).join('')}<g class="body-lines" aria-hidden="true"><path d="${side === 'front' ? frontLines : backLines}"/></g><g class="body-fibers" aria-hidden="true"><path d="${fibers[side]}"/><path d="${fibers[side]}" transform="translate(320 0) scale(-1 1)"/></g></svg></figure>`;
  }
  return `<div class="anatomy-map${interactive ? ' generator-map' : ' anatomy-map--informative'}" data-body-view="${view}"${interactive ? '' : ` role="img" aria-label="${esc(label)}"`}>${figure(front, 'front', 'frontal')}${figure(back, 'back', 'posterior')}</div>`;
}
