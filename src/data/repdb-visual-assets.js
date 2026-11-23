// Reviewed free-tier stills only. No paid preview animations or dataset copy.
export const REPDB_SOURCE = Object.freeze({
  revision: 'f12da458a90f353a86c953f204304d5a8bd98275',
  checkedAt: '2026-11-23',
  author: 'RepDB (Sergei Argutin)',
  license: 'RepDB Free Tier License v1.0',
  homepage: 'https://repdb.co',
  repository: 'https://github.com/RepDB/exercise-dataset',
});
export const REPDB_LICENSE_URL = `${REPDB_SOURCE.repository}/blob/${REPDB_SOURCE.revision}/LICENSE-DATA.md`;

const pairs = [
  [73, 'Espalda', 'chest-supported-machine-row', 'Chest-Supported Machine Row',
    'Ilustración de remo horizontal en máquina, con pecho apoyado y brazos al frente.',
    'Remo horizontal en máquina: brazos al frente y agarres próximos al torso con pecho apoyado.'],
  [74, 'Brazos', 'cable-overhead-tricep-extension', 'Cable Overhead Tricep Extension',
    'Ilustración de extensión de tríceps sobre cabeza con cuerda en polea, codos flexionados.',
    'Extensión de tríceps con cuerda en polea: codos flexionados y brazos extendidos sobre cabeza.'],
  [75, 'Piernas', 'dumbbell-romanian-deadlift', 'Dumbbell Romanian Deadlift',
    'Ilustración de peso muerto rumano de pie con una mancuerna en cada mano.',
    'Peso muerto rumano con mancuernas: posición erguida y bisagra de cadera con cargas cerca de las piernas.'],
  [76, 'Piernas', 'leg-extension', 'Leg Extension',
    'Ilustración de extensión de cuádriceps sentado en máquina, con rodillas flexionadas.',
    'Extensión de cuádriceps en máquina: rodillas flexionadas y piernas extendidas contra el rodillo.'],
  [77, 'Piernas', 'seated-leg-curl', 'Seated Leg Curl',
    'Ilustración de curl femoral sentado con piernas extendidas y muslos sujetos en máquina.',
    'Curl femoral sentado: piernas extendidas y flexión de rodillas llevando los talones bajo el asiento.'],
  [79, 'Espalda', 'one-arm-seated-cable-row', 'One-Arm Seated Cable Row',
    'Ilustración de remo sentado en polea baja con un agarre individual al frente.',
    'Remo unilateral sentado en polea: agarre al frente y tirón de un brazo hacia las costillas bajas.'],
  [80, 'Core', 'bird-dog', 'Bird-Dog',
    'Ilustración de Bird dog en cuadrupedia, con manos y rodillas apoyadas.',
    'Bird dog: cuadrupedia y extensión de un brazo y la pierna contraria con tronco estable.'],
];

export const REPDB_VISUAL_ASSETS = Object.freeze(pairs.map(([number, group, slug, sourceName, alt, sequenceAlt]) => Object.freeze({
  id: `c1700000-0000-4000-8000-${String(number).padStart(12, '0')}`,
  group, slug, sourceName, alt, sequenceAlt,
  originalStem: slug, originalFrames: Object.freeze([`${slug}-start.webp`, `${slug}-peak.webp`]),
  extension: 'webp', posterFrame: 0, match: 'exacta', provenance: 'repdb',
  note: 'Las ilustraciones orientan sobre las posturas; los ajustes de cada aparato pueden variar. Sigue las instrucciones escritas.',
})));
