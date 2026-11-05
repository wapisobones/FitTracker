// Reviewed local Hombros pairs, explicitly linked to existing catalog IDs.
const pairs = [
  [13, 'hombros_01_press_militar_con_mancuernas', 'press-militar-con-mancuernas', 'Press militar con mancuernas', 'Dumbbell Shoulder Press',
    'Press de hombros sentado, con las mancuernas junto a los hombros y la espalda apoyada.',
    'Press militar con mancuernas: cargas junto a los hombros y elevadas sobre la cabeza.'],
  [14, 'hombros_02_elevaciones_laterales', 'elevaciones-laterales', 'Elevaciones laterales', 'Side Lateral Raise',
    'Elevaciones laterales de pie con las mancuernas a los lados del cuerpo.',
    'Elevaciones laterales: brazos bajos y abiertos hacia los lados con mancuernas.'],
  [15, 'hombros_03_pajaros_con_mancuernas', 'pajaros-con-mancuernas', 'Pájaros con mancuernas', 'Reverse Flyes',
    'Referencia de pájaros con el pecho apoyado en banco inclinado y las mancuernas bajo el cuerpo.',
    'Referencia de pájaros con mancuernas: brazos bajos y abiertos con apoyo del pecho en un banco.'],
  [16, 'hombros_04_face_pull', 'face-pull', 'Face pull', 'Face Pull',
    'Face pull de pie ante una polea, con la cuerda al frente y los brazos extendidos.',
    'Face pull: brazos extendidos y cuerda acercada a la cara con los codos abiertos.'],
  [49, 'hombros_05_press_de_hombros_en_maquina', 'press-de-hombros-en-maquina', 'Press de hombros en máquina', 'Machine Shoulder (Military) Press',
    'Press de hombros sentado en máquina, con los agarres junto a los hombros.',
    'Press de hombros en máquina: agarres bajos y elevados por encima de la cabeza.'],
  [50, 'hombros_06_press_militar_con_barra', 'press-militar-con-barra', 'Press militar con barra', 'Barbell Shoulder Press',
    'Referencia de press con barra sentado en banco con respaldo, con la barra elevada.',
    'Referencia de press con barra sentado: barra sobre la cabeza y descendida delante de los hombros.'],
  [51, 'hombros_07_elevacion_frontal_con_mancuernas', 'elevacion-frontal-con-mancuernas', 'Elevación frontal con mancuernas', 'Front Dumbbell Raise',
    'Elevación frontal de pie con las mancuernas delante de los muslos.',
    'Elevación frontal alternada: mancuernas bajas y una mancuerna elevada al frente.'],
  [52, 'hombros_08_elevacion_lateral_unilateral_en_polea', 'elevacion-lateral-unilateral-en-polea', 'Elevación lateral unilateral en polea', 'Standing Low-Pulley Deltoid Raise',
    'Elevación lateral unilateral con un brazo elevado hacia el lado y un cable de polea baja.',
    'Elevación lateral unilateral en polea: brazo elevado hacia el lado y descendido delante del cuerpo.'],
  [53, 'hombros_09_elevacion_lateral_en_maquina', 'elevacion-lateral-en-maquina', 'Elevación lateral en máquina', 'Imágenes proporcionadas para FitTracker',
    'Fase 1: elevación lateral sentado en máquina con los brazos bajos bajo las almohadillas.',
    'Elevación lateral en máquina: brazos bajos y elevados hacia los lados contra las almohadillas.'],
  [54, 'hombros_10_apertura_inversa_en_maquina', 'apertura-inversa-en-maquina', 'Apertura inversa en máquina', 'Reverse Machine Flyes',
    'Apertura inversa sentado mirando al apoyo de pecho de la máquina, con los brazos al frente.',
    'Apertura inversa en máquina: brazos al frente y abiertos hacia atrás con el pecho apoyado.'],
  [55, 'hombros_11_apertura_inversa_en_poleas', 'apertura-inversa-en-poleas', 'Apertura inversa en poleas', 'Cable Rear Delt Fly',
    'Apertura inversa entre poleas con los cables cruzados y las manos al frente.',
    'Apertura inversa en poleas: manos cruzadas al frente y brazos abiertos hacia los lados.'],
  [56, 'hombros_12_remo_de_deltoides_posterior_con_pecho_apoyado', 'remo-de-deltoides-posterior-con-pecho-apoyado', 'Remo de deltoides posterior con pecho apoyado', 'Bent Over Dumbbell Rear Delt Raise With Head On Bench',
    'Referencia de apertura de deltoides posterior con la cabeza apoyada en un banco y las mancuernas bajas.',
    'Referencia de apertura de deltoides posterior: brazos bajos y abiertos con apoyo de la cabeza en un banco.'],
];

const notes = {
  15: 'Variante de referencia con el pecho apoyado en un banco inclinado. El catálogo describe los pájaros de pie con el tronco inclinado; sigue sus pasos para esa variante.',
  50: 'Las fotografías muestran el press con barra sentado y con respaldo. El catálogo describe la variante de pie; conserva el tronco estable y sigue sus pasos.',
  51: 'Las fotografías muestran una elevación frontal alternada con un brazo. Sigue el recorrido cómodo indicado en los pasos del catálogo, sin necesitar superar la altura del hombro.',
  56: 'Correspondencia aproximada: las fotografías muestran una apertura de deltoides posterior con la cabeza apoyada en un banco, sin apoyo del pecho. No demuestran el remo con pecho apoyado del catálogo; sigue sus pasos para el apoyo y la trayectoria de codos abiertos.',
};

export const SHOULDER_VISUAL_ASSETS = Object.freeze(pairs.map(([suffix, originalStem, slug, name, sourceName, alt, sequenceAlt]) => Object.freeze({
  id: `c1700000-0000-4000-8000-${String(suffix).padStart(12, '0')}`,
  originalStem, slug, name, sourceName, alt, sequenceAlt,
  extension: 'jpg', provenance: suffix === 53 ? 'user-provided' : 'free-exercise-db', posterFrame: 0,
  match: suffix === 53 ? 'local' : suffix === 56 ? 'aproximada' : 'exacta',
  note: notes[suffix] ?? '', checkedAt: '2026-11-05',
})));

// All twelve exercises have reviewed pairs; failed images still reveal the SVG.
export const SHOULDER_VISUAL_FALLBACKS = Object.freeze([]);
