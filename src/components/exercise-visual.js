// Original, local SVG diagrams. Decorative: technique is explained in text.
const poses = {
  bench: { head: [80, 100], body: 'M96 109h71l29 15 10 22M167 109l-5 31', arms: 'M111 108l13-32 31-15', equipment: 'M67 124h114m-100 0v23m86-23v23M139 48h36m-28-9v18m20-18v18', motion: 'M124 77l-2-35' },
  incline: { head: [105, 66], body: 'M115 82l42 38 35 2 16 24M157 120l-10 26', arms: 'M119 87l30-15 3-31', equipment: 'M94 81l57 52h42m-57-13-23 28m66-15v15M143 31h22m-17-7v14m12-14v14', motion: 'm164 64 7-29' },
  benchfly: { head: [150, 103], body: 'M150 117v15m0 0-29 7m29-7 29 7', arms: 'M150 119l-46-23-19-22m65 45 46-23 19-22', equipment: 'M136 112v36m28-36v36M72 64h24m-17-7v14m125-7h24m-17-7v14', motion: 'm107 68 27-19m32 0 27 19' },
  bentraise: { head: [150, 71], body: 'M150 89v24m0 0-27 29m27-29 27 29', arms: 'M150 94l-48-10-21-13m69 23 48-10 21-13', equipment: 'M72 60v23m-7-17h14m132-6v23m-7-17h14', motion: 'm98 110-22-18m126 18 22-18' },
  facepull: { head: [139, 46], body: 'M136 65v48l-22 32m22-32 24 32', arms: 'M137 73l33 10-16-34m-17 24 26-5-9-19', equipment: 'M233 23v125m-79-99h79m-75-4-7 10m6-10 7 10', motion: 'M183 100h31' },
  overheadextension: { head: [150, 64], body: 'M150 83v30l-24 32m24-32 24 32', arms: 'M150 91l-24-53 23 8m1 45 24-53-23 8', equipment: 'M141 33h20m-14-7v14m10-14v14', motion: 'm204 67-10-31' },
  pushup: { head: [214, 82], body: 'M196 91l-64 22-51 16-28 12', arms: 'M190 94l-9 27 22 20', equipment: 'M42 146h190', motion: 'm139 90 4-26' },
  pulldown: { head: [149, 69], body: 'M150 88v31l33 2 14 25m-47-27-28 25', arms: 'M150 94l-37-16-13-30m50 46 37-16 13-30', equipment: 'M81 35h137M92 35v112m116-112v112M124 125h56m-28-90v-9', motion: 'M233 53v39' },
  row: { head: [171, 65], body: 'M168 84l-4 33-44 6-28 21m72-27 31 26', arms: 'M165 91l-34 10-25-2', equipment: 'M44 52v91m0-44h61m41 28h39m-18 0v19', motion: 'M93 80h38' },
  hinge: { head: [177, 63], body: 'M160 77l-39 22-10 25 6 23m4-48 33 23 15 25', arms: 'M153 82l14 41', equipment: 'M145 130h45m-36-11v22m27-22v22', motion: 'm200 99 13 25' },
  pullup: { head: [150, 62], body: 'M150 80v34l-14 31m14-31 16 31', arms: 'M150 88l-39-21-11-38m50 59 39-21 11-38', equipment: 'M71 23h160m-147 0v19m133-19v19', motion: 'M232 103V68' },
  squat: { head: [149, 45], body: 'M149 64l-15 35 35 17-36 29m1-46-31 19 14 27', arms: 'M145 70l-22 5-8-19m30 14 22 5 12-19', equipment: 'M96 56h106m-96-10v21m86-21v21', motion: 'M222 85v40' },
  legpress: { head: [91, 92], body: 'M107 104l39 21 33-31 21 6m-54 25 39-15 18-31', arms: 'M116 109l-2 22', equipment: 'M77 104l57 34h31m34-70 26 48M82 146h159', motion: 'm205 59 13-21' },
  lunge: { head: [146, 36], body: 'M146 55v43l-38 13-10 34m48-47 32 30 28 5', arms: 'M146 65l-27 35m27-35 22 37', equipment: 'M111 105h15m-10-5v11m49-5h15m-10-5v11', motion: 'm78 74-8 28' },
  overhead: { head: [150, 66], body: 'M150 85v30l-23 30m23-30 23 30', arms: 'M150 93l-34-31 5-29m29 60 34-31-5-29', equipment: 'M109 25h25m-19-7v14m13-14v14m38-7h25m-19-7v14m13-14v14', motion: 'M212 69V35' },
  raise: { head: [150, 39], body: 'M150 59v54l-22 32m22-32 22 32', arms: 'M150 70l-39 5-29 7m68-12 39 5 29 7', equipment: 'M77 72v23m-7-17h14m134-6v23m-7-17h14', motion: 'm96 112-19-13m127 13 19-13' },
  curl: { head: [150, 38], body: 'M150 58v55l-22 32m22-32 22 32', arms: 'M150 70l-32 27 12-30m20 3 32 27-12-30', equipment: 'M120 58h24m-17-7v14m37-7h24m-17-7v14', motion: 'm92 86 4-22m108 22-4-22' },
  triceps: { head: [147, 45], body: 'M147 64v50l-23 31m23-31 23 31', arms: 'M147 73l26 22 7 26', equipment: 'M218 20v126m-68-122h68m-20 0-16 93m-12 9h24', motion: 'M198 83v26' },
  plank: { head: [207, 87], body: 'M189 96l-64 16-62 26', arms: 'M181 99l1 37h34', equipment: 'M49 145h185', motion: 'M126 87h44' },
  deadbug: { head: [88, 119], body: 'M105 125h60l20-37 34 13', arms: 'M116 121l6-46m43 50 42 18', equipment: 'M64 145h170', motion: 'm229 107 15 15m-121-35-7-18' },
  crunch: { head: [104, 76], body: 'M114 94l36 35 33-32 27 40', arms: 'M119 96l22-12-21-12', equipment: 'M75 146h153', motion: 'm77 105 2-29' },
  kneeraise: { head: [150, 66], body: 'M150 86v30l33-10-3 30', arms: 'M150 94l-35-31-10-33m45 64 35-31 10-33', equipment: 'M77 24h147', motion: 'M212 132v-29' },
};

function groupFigure(group) {
  const areas = {
    Pecho: 'M133 64h34v18h-34Z', Espalda: 'm133 64 17 8 17-8-5 34h-24Z',
    Piernas: 'm135 111 13 1-8 31h-11Zm17 1 13-1 6 32h-11Z',
    Hombros: 'm127 62 8-4 3 17-13 3Zm46 0-8-4-3 17 13 3Z',
    Brazos: 'm125 76 10 3-11 29-9-3Zm50 0-10 3 11 29 9-3Z', Core: 'M138 84h24v23h-24Z',
  };
  return `<circle cx="150" cy="40" r="13" fill="#9bafbd"/><path d="m135 57-12 8-18 46m60-54 12 8 18 46M135 61l1 48-13 38m42-86-1 48 13 38m-41-38h28" stroke="#7e94a5" stroke-width="13"/><path d="${areas[group] ?? areas.Core}" fill="#9bf45c" stroke="none"/>`;
}

export function exerciseVisual(exercise) {
  const pose = poses[exercise.visual];
  return `<svg class="exercise-visual" viewBox="0 0 300 170" fill="none" aria-hidden="true"><path d="M24 147h252M30 27h240M50 18v135m200-135v135" stroke="#263b47" stroke-width="1"/>
    ${pose ? `<g stroke-linecap="round" stroke-linejoin="round"><path d="${pose.equipment}" stroke="#5c7586" stroke-width="3"/><path d="${pose.body}" stroke="#91a6b6" stroke-width="10"/><circle cx="${pose.head[0]}" cy="${pose.head[1]}" r="12" fill="#b4c3cd"/><path d="${pose.arms}" stroke="#9bf45c" stroke-width="8"/><path d="${pose.motion}" stroke="#9bf45c" stroke-opacity=".45" stroke-width="2.5" stroke-dasharray="4 5"/></g>` : `<g stroke-linecap="round" stroke-linejoin="round">${groupFigure(exercise.mainMuscle)}</g>`}
  </svg>`;
}
