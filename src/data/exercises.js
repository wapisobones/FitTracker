export const MUSCLE_GROUPS = Object.freeze(['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core']);
export const DIFFICULTIES = Object.freeze(['Principiante', 'Intermedio', 'Avanzado', 'Sin especificar']);

// Additive metadata for the original 24 IDs. Historical snapshots are never
// looked up here or rewritten; mainMuscle remains the statistical category.
const originalAnatomy = [
  ['pectorals', ['triceps', 'anterior-deltoid']],
  ['pectorals', ['triceps', 'anterior-deltoid']],
  ['pectorals', ['anterior-deltoid']],
  ['pectorals', ['triceps', 'anterior-deltoid', 'rectus-abdominis']],
  ['latissimus', ['biceps', 'brachialis', 'forearms']],
  ['rhomboids', ['latissimus', 'trapezius', 'posterior-deltoid', 'biceps']],
  ['latissimus', ['rhomboids', 'trapezius', 'biceps', 'spinal-erectors']],
  ['latissimus', ['biceps', 'brachialis', 'forearms']],
  ['quadriceps', ['gluteals', 'adductors', 'spinal-erectors']],
  ['quadriceps', ['gluteals', 'adductors']],
  ['hamstrings', ['gluteals', 'spinal-erectors']],
  ['quadriceps', ['gluteals', 'hip-abductors']],
  ['anterior-deltoid', ['lateral-deltoid', 'triceps', 'rectus-abdominis']],
  ['lateral-deltoid', ['trapezius']],
  ['posterior-deltoid', ['rhomboids', 'trapezius']],
  ['posterior-deltoid', ['rhomboids', 'trapezius']],
  ['biceps', ['brachialis', 'forearms']],
  ['brachialis', ['biceps', 'forearms']],
  ['triceps', []],
  ['triceps', ['rectus-abdominis']],
  ['rectus-abdominis', ['obliques', 'anterior-deltoid', 'gluteals']],
  ['rectus-abdominis', ['obliques']],
  ['rectus-abdominis', []],
  ['rectus-abdominis', ['obliques', 'forearms']],
];
function exercise(number, name, mainMuscle, secondaryMuscles, equipment, difficulty, visual, steps, tips, mainRegion = originalAnatomy[number - 1]?.[0], secondaryRegions = originalAnatomy[number - 1]?.[1] ?? []) {
  return Object.freeze({
    id: `c1700000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    origin: 'base', name, mainMuscle, mainRegion, equipment, difficulty, visual,
    secondaryRegions: Object.freeze(secondaryRegions), tracking: number === 21 ? 'duration' : 'repetitions',
    // Explicit exercise variants, independent of equipment and muscle group.
    recordingMode: number === 21 ? 'duration' : [4, 8, 22, 23, 24, 30, 31, 32, 38, 39, 40, 42, 48, 66, 68, 72].includes(number) ? 'bodyweight_reps' : 'weight_reps',
    anatomyNote: [21, 22].includes(number) ? 'El abdomen trabaja como estabilizador; la clasificación no significa aislamiento muscular.' : number === 24 ? 'La región abdominal corresponde a la retroversión pélvica indicada. Los flexores de cadera también participan y no tienen región propia en este mapa.' : '',
    secondaryMuscles: Object.freeze(secondaryMuscles),
    technique: Object.freeze({ steps: Object.freeze(steps), tips: Object.freeze(tips) }),
    notes: '', video: null,
  });
}

// Original educational copy and fixed UUIDs. No writes/seeds in either scope.
export const BASE_EXERCISES = Object.freeze([
  exercise(1, 'Press de banca', 'Pecho', ['Tríceps', 'Hombro anterior'], 'Barra y banco', 'Intermedio', 'bench', [
    'Acuéstate en el banco con los pies apoyados y la espalda alta estable.',
    'Sujeta la barra con un agarre algo más ancho que los hombros y bájala de forma controlada hacia el pecho.',
    'Empuja la barra hacia arriba manteniendo los apoyos, sin rebotar sobre el pecho.',
  ], ['Mantén las muñecas alineadas con los antebrazos.', 'Usa los soportes de seguridad o la ayuda de una persona cuando lo necesites.']),
  exercise(2, 'Press inclinado con mancuernas', 'Pecho', ['Tríceps', 'Hombro anterior'], 'Mancuernas y banco', 'Intermedio', 'incline', [
    'Apoya la espalda en un banco ligeramente inclinado y coloca las mancuernas a los lados del pecho.',
    'Empuja ambas cargas hacia arriba con un recorrido cómodo, sin golpearlas entre sí.',
    'Desciende con control hasta la posición inicial manteniendo los pies apoyados.',
  ], ['Evita elevar los hombros hacia las orejas.', 'Elige una inclinación que te permita conservar los apoyos.']),
  exercise(3, 'Aperturas con mancuernas', 'Pecho', ['Hombro anterior'], 'Mancuernas y banco', 'Intermedio', 'benchfly', [
    'Acuéstate en un banco con las mancuernas sobre el pecho y los codos ligeramente flexionados.',
    'Abre los brazos en arco hasta un rango que puedas controlar.',
    'Junta de nuevo los brazos conservando la misma flexión de codos.',
  ], ['No fuerces el estiramiento al bajar.', 'Usa una carga que permita controlar todo el arco.']),
  exercise(4, 'Flexiones', 'Pecho', ['Tríceps', 'Core'], 'Peso corporal', 'Principiante', 'pushup', [
    'Coloca las manos bajo o ligeramente por fuera de los hombros y alinea el tronco con las piernas.',
    'Flexiona los codos para acercar el pecho al suelo manteniendo el cuerpo estable.',
    'Empuja el suelo para regresar al inicio sin dejar caer la cadera.',
  ], ['Puedes apoyar las manos en una superficie elevada para adaptar la dificultad.', 'Mantén un ritmo controlado durante la bajada.']),
  exercise(5, 'Jalón al pecho', 'Espalda', ['Bíceps'], 'Polea', 'Principiante', 'pulldown', [
    'Siéntate con los muslos sujetos y toma la barra con un agarre cómodo.',
    'Lleva los codos hacia abajo mientras acercas la barra a la parte alta del pecho.',
    'Deja subir la barra con control sin perder la posición del tronco.',
  ], ['Lleva la barra por delante de la cabeza.', 'Evita impulsarte con la espalda para mover la carga.']),
  exercise(6, 'Remo en polea', 'Espalda', ['Bíceps', 'Hombro posterior'], 'Polea', 'Principiante', 'row', [
    'Siéntate con los pies apoyados, las rodillas algo flexionadas y el tronco estable.',
    'Tira del agarre hacia el abdomen llevando los codos hacia atrás.',
    'Extiende los brazos de forma controlada sin redondear bruscamente la espalda.',
  ], ['Evita balancearte para iniciar cada repetición.', 'Mantén los hombros alejados de las orejas.']),
  exercise(7, 'Remo con barra', 'Espalda', ['Bíceps', 'Core'], 'Barra', 'Intermedio', 'hinge', [
    'Sujeta la barra y lleva la cadera atrás hasta inclinar el tronco con las rodillas algo flexionadas.',
    'Acerca la barra al abdomen llevando los codos hacia atrás.',
    'Baja la barra con control manteniendo la inclinación del tronco.',
  ], ['Mantén la carga cerca del cuerpo.', 'Evita enderezarte con impulso en cada repetición.']),
  exercise(8, 'Dominadas', 'Espalda', ['Bíceps', 'Core'], 'Barra de dominadas', 'Avanzado', 'pullup', [
    'Sujeta una barra estable y comienza con los brazos extendidos de forma cómoda.',
    'Lleva los codos hacia abajo y eleva el cuerpo sin balancear las piernas.',
    'Desciende con control hasta recuperar el inicio.',
  ], ['Adapta la asistencia si no puedes controlar el recorrido.', 'Evita estirar el cuello para alcanzar la barra.']),
  exercise(9, 'Sentadilla con barra', 'Piernas', ['Glúteos', 'Core'], 'Barra', 'Intermedio', 'squat', [
    'Apoya la barra de forma estable sobre la espalda alta y coloca los pies en una posición cómoda.',
    'Flexiona caderas y rodillas manteniendo los pies apoyados y el tronco controlado.',
    'Empuja el suelo para volver a levantarte sin perder la alineación de las rodillas.',
  ], ['Usa los seguros del soporte.', 'Ajusta la profundidad al recorrido que puedas controlar.']),
  exercise(10, 'Prensa de piernas', 'Piernas', ['Glúteos'], 'Máquina', 'Principiante', 'legpress', [
    'Ajusta el asiento para apoyar la espalda y coloca los pies sobre la plataforma.',
    'Libera los seguros y flexiona las rodillas sin despegar la pelvis del respaldo.',
    'Empuja la plataforma para extender las piernas de forma controlada.',
  ], ['Mantén las rodillas orientadas en la dirección de los pies.', 'Vuelve a colocar los seguros antes de salir de la máquina.']),
  exercise(11, 'Peso muerto rumano', 'Piernas', ['Glúteos', 'Espalda'], 'Barra', 'Intermedio', 'hinge', [
    'Sujeta la barra frente a los muslos con las rodillas ligeramente flexionadas.',
    'Lleva la cadera hacia atrás y baja la carga cerca de las piernas manteniendo el tronco estable.',
    'Extiende la cadera para volver a levantarte sin inclinarte hacia atrás al terminar.',
  ], ['El movimiento parte de la cadera, no de redondear la espalda.', 'Detén la bajada donde puedas mantener el control.']),
  exercise(12, 'Zancadas', 'Piernas', ['Glúteos', 'Core'], 'Mancuernas', 'Intermedio', 'lunge', [
    'Colócate de pie con una mancuerna a cada lado y da un paso amplio.',
    'Flexiona ambas rodillas para bajar el cuerpo conservando el equilibrio.',
    'Empuja con la pierna adelantada para regresar al inicio y alterna los lados.',
  ], ['Evita que el pie delantero pierda el apoyo.', 'Puedes empezar sin carga para practicar el equilibrio.']),
  exercise(13, 'Press militar con mancuernas', 'Hombros', ['Tríceps', 'Core'], 'Mancuernas', 'Intermedio', 'overhead', [
    'Coloca las mancuernas a la altura de los hombros con el tronco estable.',
    'Empuja hacia arriba sin arquear de forma excesiva la zona lumbar.',
    'Baja con control hasta la posición inicial.',
  ], ['Mantén las muñecas alineadas con los antebrazos.', 'Usa un recorrido cómodo sin forzar el hombro.']),
  exercise(14, 'Elevaciones laterales', 'Hombros', [], 'Mancuernas', 'Principiante', 'raise', [
    'Sujeta las mancuernas a los lados con los codos ligeramente flexionados.',
    'Eleva los brazos hacia los lados hasta aproximadamente la altura de los hombros.',
    'Desciende despacio sin balancear el tronco.',
  ], ['Mantén el cuello relajado.', 'Usa una carga que no obligue a tomar impulso.']),
  exercise(15, 'Pájaros con mancuernas', 'Hombros', ['Espalda'], 'Mancuernas', 'Intermedio', 'bentraise', [
    'Inclina el tronco desde la cadera con las rodillas algo flexionadas.',
    'Abre los brazos a los lados conservando una ligera flexión de codos.',
    'Vuelve a juntar las cargas lentamente bajo el cuerpo.',
  ], ['Mantén estable la posición del tronco.', 'Evita encoger los hombros al elevar los brazos.']),
  exercise(16, 'Face pull', 'Hombros', ['Espalda'], 'Polea', 'Principiante', 'facepull', [
    'Ajusta una cuerda en la polea alta y toma sus extremos con el tronco estable.',
    'Acerca la cuerda hacia la cara separando las manos y llevando los codos hacia los lados.',
    'Extiende los brazos con control para regresar al inicio.',
  ], ['Evita inclinarte hacia atrás para tirar.', 'Mantén un recorrido cómodo para los hombros.']),
  exercise(17, 'Curl de bíceps', 'Brazos', ['Antebrazos'], 'Mancuernas', 'Principiante', 'curl', [
    'Sujeta las mancuernas con las palmas hacia delante y los brazos a los lados.',
    'Flexiona los codos para elevar las cargas sin mover el tronco.',
    'Baja despacio hasta recuperar la extensión cómoda de los brazos.',
  ], ['Mantén los codos cerca del cuerpo.', 'Evita balancear la cadera para mover las mancuernas.']),
  exercise(18, 'Curl martillo', 'Brazos', ['Antebrazos'], 'Mancuernas', 'Principiante', 'curl', [
    'Sujeta las mancuernas con las palmas orientadas hacia el cuerpo.',
    'Flexiona los codos manteniendo ese agarre durante todo el recorrido.',
    'Baja las cargas despacio sin desplazar los hombros hacia delante.',
  ], ['Mantén las muñecas estables.', 'Evita usar impulso para completar la subida.']),
  exercise(19, 'Extensión de tríceps en polea', 'Brazos', [], 'Polea', 'Principiante', 'triceps', [
    'Toma el agarre de una polea alta y coloca los codos a los lados del tronco.',
    'Extiende los codos para llevar el agarre hacia abajo sin mover los hombros.',
    'Flexiona de nuevo los codos con control.',
  ], ['Mantén las muñecas alineadas.', 'Evita apoyar el peso del cuerpo sobre el agarre.']),
  exercise(20, 'Extensión de tríceps sobre la cabeza', 'Brazos', ['Core'], 'Mancuernas', 'Intermedio', 'overheadextension', [
    'Sujeta una mancuerna sobre la cabeza con ambos brazos y estabiliza el tronco.',
    'Flexiona los codos para bajar la carga detrás de la cabeza en un rango cómodo.',
    'Extiende los codos para volver al inicio sin arquear la espalda.',
  ], ['No fuerces la posición de los hombros.', 'Evita abrir los codos bruscamente durante la bajada.']),
  exercise(21, 'Plancha', 'Core', ['Hombros', 'Glúteos'], 'Colchoneta', 'Principiante', 'plank', [
    'Apoya los antebrazos en el suelo con los codos bajo los hombros.',
    'Extiende las piernas y mantén alineados el tronco y la pelvis.',
    'Respira de forma continua y termina la posición antes de perder el control.',
  ], ['Evita dejar caer la cadera.', 'Puedes apoyar las rodillas para adaptar la posición.']),
  exercise(22, 'Dead bug', 'Core', [], 'Colchoneta', 'Principiante', 'deadbug', [
    'Acuéstate boca arriba con los brazos hacia el techo y caderas y rodillas flexionadas.',
    'Aleja lentamente un brazo y la pierna contraria sin perder el control del tronco.',
    'Regresa al inicio y alterna los lados.',
  ], ['Reduce el recorrido si la espalda se arquea al extender la pierna.', 'Prioriza un movimiento lento y coordinado.']),
  exercise(23, 'Crunch abdominal', 'Core', [], 'Colchoneta', 'Principiante', 'crunch', [
    'Acuéstate boca arriba con las rodillas flexionadas y los pies apoyados.',
    'Eleva ligeramente la parte alta del tronco acercando las costillas a la pelvis.',
    'Apoya de nuevo la espalda alta de forma controlada.',
  ], ['Evita tirar de la cabeza con las manos.', 'Usa un recorrido corto sin tomar impulso.']),
  exercise(24, 'Elevación de rodillas colgado', 'Core', ['Antebrazos'], 'Barra de dominadas', 'Avanzado', 'kneeraise', [
    'Cuélgate de una barra estable con un agarre firme y el cuerpo sin balanceo.',
    'Acerca las rodillas al tronco y termina enrollando suavemente la pelvis hacia las costillas, sin balancearte.',
    'Baja las piernas despacio hasta la posición inicial.',
  ], ['Evita impulsarte con el cuerpo.', 'Interrumpe la serie si pierdes el agarre o el control del balanceo.']),
  exercise(25, 'Press de pecho en máquina', 'Pecho', [], 'Máquina', 'Principiante', 'chestpress', [
    'Regula el asiento para que los agarres queden aproximadamente a media altura del pecho y apoya la espalda.',
    'Empuja los agarres al frente con las muñecas alineadas y sin despegar el tronco.',
    'Permite que los codos vuelvan lentamente hasta un recorrido cómodo.',
  ], ['Comprueba el ajuste del asiento antes de cargar.', 'No dejes que el peso golpee al regresar.'], 'pectorals', ['triceps', 'anterior-deltoid']),
  exercise(26, 'Aperturas de pecho en máquina', 'Pecho', [], 'Máquina', 'Principiante', 'chestfly', [
    'Ajusta la máquina para apoyar la espalda y sujetar los agarres sin llevar los brazos demasiado atrás.',
    'Acerca ambos brazos delante del pecho conservando una pequeña flexión de codos.',
    'Abre de nuevo de forma lenta y detente antes de perder el apoyo del tronco.',
  ], ['Adapta el inicio del recorrido a la movilidad del hombro.', 'Usa una carga que permita frenar la apertura.'], 'pectorals', ['anterior-deltoid']),
  exercise(27, 'Cruces de pecho en poleas', 'Pecho', [], 'Polea', 'Intermedio', 'chestfly', [
    'Colócate entre dos poleas a la altura del pecho, con un pie adelantado y los codos algo flexionados.',
    'Lleva las manos hacia delante en un arco hasta juntarlas sin cruzar los hombros con impulso.',
    'Recupera la apertura manteniendo estable el tronco y la flexión de los codos.',
  ], ['Evita convertir el movimiento en un empuje con el cuerpo.', 'No busques un estiramiento que produzca molestias.'], 'pectorals', ['anterior-deltoid']),
  exercise(28, 'Press unilateral de pecho en polea', 'Pecho', [], 'Polea', 'Intermedio', 'chestpress', [
    'Sitúa un agarre detrás de ti a la altura del pecho y adopta una posición de pies escalonada.',
    'Empuja con un brazo al frente mientras mantienes la pelvis y el pecho orientados en la misma dirección.',
    'Devuelve el agarre despacio junto al costado y cambia de brazo después del trabajo previsto.',
  ], ['Reduce la carga si el cable hace girar el tronco.', 'Mantén la muñeca alineada con el antebrazo.'], 'pectorals', ['triceps', 'anterior-deltoid', 'obliques']),
  exercise(29, 'Press con mancuernas en el suelo', 'Pecho', [], 'Mancuernas', 'Principiante', 'floorpress', [
    'Acuéstate con las rodillas flexionadas y coloca las mancuernas junto al pecho con ayuda si hace falta.',
    'Empuja las cargas sobre el pecho sin perder el apoyo de la espalda.',
    'Desciende hasta apoyar suavemente la parte posterior de los brazos en el suelo y vuelve a empujar.',
  ], ['El suelo limita el recorrido; no rebotes sobre los codos.', 'Prepara una forma controlada de dejar las mancuernas al terminar.'], 'pectorals', ['triceps', 'anterior-deltoid']),
  exercise(30, 'Flexiones inclinadas en banco', 'Pecho', [], 'Banco', 'Principiante', 'pushup', [
    'Apoya las manos en un banco firme que no pueda deslizarse y alinea el cuerpo desde la cabeza a los pies.',
    'Flexiona los codos para acercar el pecho al borde manteniendo el abdomen estable.',
    'Empuja el banco hasta recuperar el inicio sin dejar caer la cadera.',
  ], ['Una superficie más alta reduce la exigencia.', 'Comprueba que el banco soporte el apoyo antes de empezar.'], 'pectorals', ['triceps', 'anterior-deltoid', 'rectus-abdominis']),
  exercise(31, 'Flexiones declinadas en banco', 'Pecho', [], 'Banco', 'Intermedio', 'pushup', [
    'Coloca los pies sobre un banco bajo y estable y las manos en el suelo, algo más separadas que los hombros.',
    'Baja el pecho conservando la alineación del tronco y una flexión cómoda de los codos.',
    'Empuja el suelo para subir sin elevar primero la cadera.',
  ], ['Empieza con poca altura para controlar el apoyo.', 'Vuelve a la variante en el suelo si pierdes la posición del hombro.'], 'pectorals', ['anterior-deltoid', 'triceps', 'rectus-abdominis']),
  exercise(32, 'Fondos asistidos con torso inclinado', 'Pecho', [], 'Máquina', 'Intermedio', 'dip', [
    'Ajusta la asistencia y sube a la máquina siguiendo sus apoyos, con las manos firmes en las barras.',
    'Inclina ligeramente el torso y flexiona los codos hasta una profundidad que puedas controlar.',
    'Empuja las barras para elevar el cuerpo sin balancear las piernas ni bloquear bruscamente los codos.',
  ], ['Más asistencia reduce la carga efectiva.', 'Evita llevar los hombros a una extensión forzada en el fondo.'], 'pectorals', ['triceps', 'anterior-deltoid']),
  exercise(33, 'Remo con mancuerna a una mano', 'Espalda', [], 'Mancuernas y banco', 'Principiante', 'row', [
    'Apoya una mano y una rodilla en un banco firme y deja la mancuerna bajo el hombro contrario.',
    'Lleva el codo hacia la cadera sin girar el tronco para subir la carga.',
    'Extiende el brazo con control y repite con el otro lado al terminar.',
  ], ['Distribuye el apoyo para que el banco no se incline.', 'Evita tirar del cuello hacia arriba al remar.'], 'latissimus', ['rhomboids', 'biceps', 'forearms']),
  exercise(34, 'Jalón de brazos rectos en polea', 'Espalda', [], 'Polea', 'Principiante', 'straightpull', [
    'Toma una barra de polea alta y da un paso atrás, con las rodillas desbloqueadas y los codos apenas flexionados.',
    'Acerca la barra a los muslos moviendo los brazos desde los hombros y manteniendo el tronco estable.',
    'Deja subir los brazos lentamente hasta un rango cómodo sin arquear la espalda.',
  ], ['Conserva aproximadamente el mismo ángulo de codo.', 'No uses la inclinación del cuerpo para vencer la resistencia.'], 'latissimus', ['triceps', 'rectus-abdominis']),
  exercise(35, 'Remo alto en máquina con codos abiertos', 'Espalda', [], 'Máquina', 'Principiante', 'row', [
    'Ajusta el apoyo de pecho y toma los agarres con los brazos al frente.',
    'Lleva los codos hacia atrás y acerca las escápulas sin elevar los hombros hacia las orejas.',
    'Extiende los brazos con control manteniendo el pecho apoyado.',
  ], ['La trayectoria debe quedar por debajo de una posición incómoda para el hombro.', 'No separes el pecho del soporte al terminar el tirón.'], 'rhomboids', ['trapezius', 'posterior-deltoid', 'biceps']),
  exercise(36, 'Remo con pecho apoyado en banco', 'Espalda', [], 'Mancuernas y banco', 'Intermedio', 'row', [
    'Acuéstate boca abajo sobre un banco inclinado, con las mancuernas colgando y los pies firmes.',
    'Rema acercando las escápulas y llevando los codos hacia atrás en una trayectoria cómoda.',
    'Baja las cargas sin perder el apoyo del pecho ni dejar caer los hombros de golpe.',
  ], ['Ajusta la inclinación para que las cargas no choquen con el suelo.', 'Mantén la cabeza alineada con el tronco.'], 'rhomboids', ['latissimus', 'trapezius', 'biceps']),
  exercise(37, 'Encogimientos de hombros con mancuernas', 'Espalda', [], 'Mancuernas', 'Principiante', 'shrug', [
    'Colócate de pie con las mancuernas a los lados y los brazos extendidos sin tensión en los codos.',
    'Eleva los hombros de forma vertical sin adelantar la cabeza.',
    'Desciende lentamente hasta la posición inicial.',
  ], ['Evita hacer círculos con los hombros.', 'Usa una carga que puedas sujetar sin doblar las muñecas.'], 'trapezius', ['forearms']),
  exercise(38, 'Elevación de brazos en Y sobre banco', 'Espalda', [], 'Banco', 'Principiante', 'yraise', [
    'Apoya el pecho sobre un banco inclinado y deja los brazos hacia el suelo con los pulgares orientados hacia arriba.',
    'Eleva los brazos formando una Y mientras controlas el movimiento de las escápulas.',
    'Baja los brazos despacio sin despegar el tronco del banco.',
  ], ['Empieza sin carga externa para dominar el recorrido.', 'No eleves los brazos a costa de arquear la espalda.'], 'trapezius', ['posterior-deltoid']),
  exercise(39, 'Extensión de tronco en banco lumbar', 'Espalda', [], 'Máquina', 'Intermedio', 'backextension', [
    'Ajusta el aparato para sujetar los pies y apoyar la pelvis sin comprimir el abdomen.',
    'Desciende el tronco en un recorrido corto que puedas controlar y vuelve a alinearlo con las piernas.',
    'Termina al recuperar la posición neutra, sin lanzar el pecho hacia atrás.',
  ], ['Practica primero sin peso adicional.', 'Detén el movimiento si necesitas un rebote o una hiperextensión para subir.'], 'spinal-erectors', ['gluteals', 'hamstrings']),
  exercise(40, 'Elevación corta de tronco boca abajo', 'Espalda', [], 'Colchoneta', 'Principiante', 'proneextension', [
    'Túmbate boca abajo con las piernas apoyadas y las manos junto al cuerpo.',
    'Eleva ligeramente la parte alta del pecho manteniendo la mirada hacia el suelo y la pelvis apoyada.',
    'Apoya el tronco de nuevo de forma lenta antes de repetir.',
  ], ['El recorrido es pequeño; no busques subir lo máximo posible.', 'Respira durante el movimiento y evita tensar el cuello.'], 'spinal-erectors', []),
  exercise(41, 'Hip thrust con barra', 'Piernas', [], 'Barra y banco', 'Intermedio', 'hipthrust', [
    'Apoya la parte alta de la espalda en un banco estable y coloca la barra acolchada sobre la cadera.',
    'Empuja el suelo con ambos pies para elevar la pelvis hasta alinear muslos y tronco.',
    'Baja la cadera con control manteniendo la barra estable y las rodillas orientadas hacia los pies.',
  ], ['Protege el apoyo de la barra con una almohadilla adecuada.', 'Finaliza con extensión de cadera, sin exagerar el arco lumbar.'], 'gluteals', ['hamstrings']),
  exercise(42, 'Puente de glúteos en el suelo', 'Piernas', [], 'Colchoneta', 'Principiante', 'bridge', [
    'Acuéstate con las rodillas flexionadas y los pies apoyados aproximadamente bajo ellas.',
    'Eleva la pelvis empujando el suelo hasta alinear el tronco y los muslos.',
    'Vuelve a apoyar la cadera lentamente sin dejar que las rodillas se abran o cierren de golpe.',
  ], ['Mantén el peso sobre la parte alta de la espalda, no sobre el cuello.', 'Ajusta la posición de los pies para que el movimiento resulte cómodo.'], 'gluteals', ['hamstrings']),
  exercise(43, 'Curl femoral tumbado en máquina', 'Piernas', [], 'Máquina', 'Principiante', 'legcurl', [
    'Ajusta la máquina para alinear las rodillas con su eje y sitúa el rodillo por encima de los talones.',
    'Flexiona las rodillas para acercar los talones hacia los glúteos sin levantar la pelvis.',
    'Extiende las piernas despacio sin dejar caer las placas.',
  ], ['El rodillo no debe presionar directamente el tendón de Aquiles.', 'Reduce la carga si necesitas arquear la espalda para moverla.'], 'hamstrings', ['gastrocnemius']),
  exercise(44, 'Aducción de cadera en máquina', 'Piernas', [], 'Máquina', 'Principiante', 'hipadduction', [
    'Siéntate con la espalda apoyada y regula la apertura inicial y los apoyos de los muslos.',
    'Acerca las piernas de forma controlada sin inclinar el cuerpo para ayudar.',
    'Permite que las piernas se separen despacio hasta el inicio ajustado.',
  ], ['No fuerces una apertura mayor que tu recorrido cómodo.', 'Evita soltar la resistencia al final de la repetición.'], 'adductors', []),
  exercise(45, 'Abducción de cadera en máquina', 'Piernas', [], 'Máquina', 'Principiante', 'hipabduction', [
    'Ajusta el asiento y coloca las rodillas o muslos contra los apoyos exteriores de la máquina.',
    'Separa las piernas manteniendo la pelvis estable sobre el asiento.',
    'Vuelve hacia el centro lentamente conservando la tensión del movimiento.',
  ], ['No rebotes con el tronco para abrir más las piernas.', 'Usa un recorrido que no desplace la pelvis del apoyo.'], 'hip-abductors', ['gluteals']),
  exercise(46, 'Elevación de talones de pie en máquina', 'Piernas', [], 'Máquina', 'Principiante', 'calfraise', [
    'Coloca la parte delantera de los pies en la plataforma y ajusta los apoyos de la máquina.',
    'Eleva los talones con las rodillas extendidas sin bloquearlas de forma rígida.',
    'Desciende con control hasta un estiramiento cómodo de las pantorrillas.',
  ], ['Mantén el apoyo sobre los dedos sin volcar los tobillos hacia fuera.', 'Evita rebotar en la parte baja.'], 'gastrocnemius', ['soleus']),
  exercise(47, 'Elevación de talones sentado en máquina', 'Piernas', [], 'Máquina', 'Principiante', 'seatedcalf', [
    'Siéntate con las rodillas flexionadas y ajusta el apoyo sobre los muslos, lejos de las rótulas.',
    'Empuja con la parte delantera de los pies para elevar los talones.',
    'Baja los talones despacio manteniendo las rodillas en su posición.',
  ], ['Comprueba que el mecanismo de seguridad pueda alcanzarse.', 'Mantén una amplitud controlada sin impulso de los muslos.'], 'soleus', ['gastrocnemius']),
  exercise(48, 'Elevación de puntas con apoyo en pared', 'Piernas', [], 'Peso corporal', 'Principiante', 'tibialis', [
    'Apoya la espalda en una pared y adelanta ligeramente los pies, manteniendo los talones en el suelo.',
    'Levanta las puntas de ambos pies hacia las espinillas sin mover las rodillas.',
    'Apoya las puntas despacio y repite con el mismo control.',
  ], ['Acerca los pies a la pared si necesitas reducir la exigencia.', 'Trabaja sobre un suelo que no resbale.'], 'tibialis-anterior', []),
  exercise(49, 'Press de hombros en máquina', 'Hombros', [], 'Máquina', 'Principiante', 'overhead', [
    'Regula el asiento para que los agarres queden junto a los hombros y apoya la espalda.',
    'Empuja hacia arriba sin levantar la pelvis del asiento.',
    'Baja los agarres con control hasta la posición inicial.',
  ], ['Ajusta el recorrido al hombro sin forzar la posición baja.', 'No arquees el tronco para completar repeticiones.'], 'anterior-deltoid', ['lateral-deltoid', 'triceps']),
  exercise(50, 'Press militar con barra', 'Hombros', [], 'Barra', 'Intermedio', 'overhead', [
    'Sujeta la barra frente a los hombros y coloca los pies estables bajo el cuerpo.',
    'Empuja la barra por encima de la cabeza con el abdomen firme y sin usar un impulso de piernas.',
    'Desciende hacia los hombros siguiendo una trayectoria que puedas controlar.',
  ], ['Usa soportes y una carga que puedas manejar desde el inicio.', 'Evita compensar llevando las costillas hacia delante.'], 'anterior-deltoid', ['lateral-deltoid', 'triceps', 'rectus-abdominis']),
  exercise(51, 'Elevación frontal con mancuernas', 'Hombros', [], 'Mancuernas', 'Principiante', 'frontraise', [
    'Colócate de pie con las mancuernas delante de los muslos y los codos ligeramente flexionados.',
    'Eleva los brazos al frente hasta una altura cómoda, sin inclinar el cuerpo hacia atrás.',
    'Desciende lentamente manteniendo la misma flexión de codos.',
  ], ['No necesitas superar la altura del hombro.', 'Reduce la carga si el tronco comienza a balancearse.'], 'anterior-deltoid', ['pectorals']),
  exercise(52, 'Elevación lateral unilateral en polea', 'Hombros', [], 'Polea', 'Principiante', 'raise', [
    'Sitúate de lado junto a una polea baja y toma el agarre con el brazo más alejado.',
    'Eleva ese brazo hacia el lado con el codo algo flexionado y el tronco estable.',
    'Regresa despacio sin que el cable arrastre el hombro; cambia de lado al terminar.',
  ], ['Deja espacio para que el cable no roce las piernas.', 'Evita encoger el hombro para ganar altura.'], 'lateral-deltoid', ['trapezius']),
  exercise(53, 'Elevación lateral en máquina', 'Hombros', [], 'Máquina', 'Principiante', 'raise', [
    'Ajusta el asiento y apoya los brazos bajo las almohadillas de la máquina.',
    'Separa los brazos hacia los lados manteniendo el pecho apoyado o el tronco erguido según el aparato.',
    'Baja lentamente hasta el inicio sin dejar caer el mecanismo.',
  ], ['Alinea el apoyo con la zona del brazo indicada por la máquina.', 'No presiones con el cuello ni eleves los hombros de forma brusca.'], 'lateral-deltoid', ['trapezius']),
  exercise(54, 'Apertura inversa en máquina', 'Hombros', [], 'Máquina', 'Principiante', 'chestfly', [
    'Siéntate mirando hacia el apoyo de pecho y ajusta los agarres a una altura cómoda.',
    'Abre los brazos hacia atrás conservando una flexión suave de los codos.',
    'Vuelve a llevar las manos al frente sin despegar el pecho del apoyo.',
  ], ['No fuerces los brazos más allá de un recorrido cómodo del hombro.', 'Mantén el cuello relajado y el movimiento sin tirones.'], 'posterior-deltoid', ['rhomboids', 'trapezius']),
  exercise(55, 'Apertura inversa en poleas', 'Hombros', [], 'Polea', 'Intermedio', 'chestfly', [
    'Colócate entre dos poleas a la altura del hombro y sujeta cada cable con la mano contraria.',
    'Abre ambos brazos hacia los lados sin cambiar de forma marcada el ángulo de los codos.',
    'Regresa despacio al cruce inicial manteniendo los pies y el tronco estables.',
  ], ['Mantén la carga lejos de la cara durante todo el recorrido.', 'No gires el cuerpo para completar la apertura.'], 'posterior-deltoid', ['rhomboids', 'trapezius']),
  exercise(56, 'Remo de deltoides posterior con pecho apoyado', 'Hombros', [], 'Mancuernas y banco', 'Intermedio', 'bentraise', [
    'Apoya el pecho en un banco inclinado y deja las mancuernas bajo los hombros.',
    'Eleva los codos abiertos hacia los lados, moviendo la parte alta del brazo en lugar de llevarlos hacia la cadera.',
    'Baja las cargas de forma lenta manteniendo el apoyo y una amplitud cómoda.',
  ], ['La trayectoria de codos abiertos diferencia esta variante del remo orientado al dorsal.', 'No tires con el cuello ni exageres la posición de los codos detrás del torso.'], 'posterior-deltoid', ['rhomboids', 'trapezius', 'biceps']),
  exercise(57, 'Curl de bíceps con barra', 'Brazos', [], 'Barra', 'Intermedio', 'curl', [
    'Sujeta la barra con las palmas hacia delante y los codos cerca del tronco.',
    'Flexiona ambos codos para acercar la barra sin impulsar la cadera.',
    'Baja con control hasta recuperar una extensión cómoda de los brazos.',
  ], ['Elige un agarre que no fuerce las muñecas.', 'Evita adelantar los hombros para terminar la repetición.'], 'biceps', ['brachialis', 'forearms']),
  exercise(58, 'Curl de bíceps en polea', 'Brazos', [], 'Polea', 'Principiante', 'curl', [
    'Toma el agarre de una polea baja y colócate erguido a una distancia que mantenga el cable libre.',
    'Flexiona los codos con los brazos junto a los costados.',
    'Extiende de nuevo de forma lenta sin perder la posición de las muñecas.',
  ], ['No dejes que el peso te incline al regresar.', 'Ajusta la carga para evitar tirones al despegar las placas.'], 'biceps', ['brachialis', 'forearms']),
  exercise(59, 'Curl predicador en máquina', 'Brazos', [], 'Máquina', 'Principiante', 'curl', [
    'Regula el asiento para apoyar la parte alta de los brazos en la almohadilla.',
    'Flexiona los codos para elevar los agarres manteniendo los brazos en contacto con el soporte.',
    'Baja lentamente sin forzar la extensión final del codo.',
  ], ['Alinea los codos con el eje de la máquina cuando sea regulable.', 'Evita levantar los hombros del apoyo.'], 'biceps', ['brachialis']),
  exercise(60, 'Curl inverso con mancuernas', 'Brazos', [], 'Mancuernas', 'Principiante', 'curl', [
    'Sujeta las mancuernas con las palmas orientadas hacia atrás y mantén las muñecas alineadas.',
    'Flexiona los codos conservando el agarre y los brazos próximos al tronco.',
    'Baja con control sin doblar las muñecas para sostener las cargas.',
  ], ['Usa menos carga si el agarre impide controlar el recorrido.', 'Evita balancear las mancuernas en la parte baja.'], 'brachialis', ['forearms', 'biceps']),
  exercise(61, 'Press francés con mancuernas en banco', 'Brazos', [], 'Mancuernas y banco', 'Intermedio', 'lyingtriceps', [
    'Acuéstate en un banco con las mancuernas sobre los hombros y las palmas enfrentadas.',
    'Flexiona los codos para bajar las cargas a los lados de la cabeza en un rango cómodo.',
    'Extiende los codos manteniendo estable la parte alta de los brazos.',
  ], ['Mantén las cargas fuera de la trayectoria de la cara.', 'Empieza con poco peso y evita abrir los codos bruscamente.'], 'triceps', []),
  exercise(62, 'Patada de tríceps con mancuerna', 'Brazos', [], 'Mancuernas', 'Principiante', 'kickback', [
    'Inclina el tronco desde la cadera y coloca un brazo junto al costado con el codo flexionado.',
    'Extiende el codo llevando la mancuerna hacia atrás sin mover el hombro.',
    'Flexiona de nuevo lentamente y cambia de lado al completar el trabajo previsto.',
  ], ['Mantén la espalda estable durante el recorrido.', 'No conviertas la extensión en un balanceo del brazo completo.'], 'triceps', []),
  exercise(63, 'Flexión de muñecas con mancuernas', 'Brazos', [], 'Mancuernas', 'Principiante', 'wrist', [
    'Siéntate y apoya los antebrazos sobre los muslos con las palmas hacia arriba y las manos fuera del apoyo.',
    'Flexiona las muñecas para elevar ligeramente las mancuernas sin levantar los antebrazos.',
    'Baja las manos despacio manteniendo el agarre.',
  ], ['Usa cargas pequeñas y un recorrido sin molestias.', 'No abras los dedos hasta perder el control de la mancuerna.'], 'forearms', []),
  exercise(64, 'Extensión de muñecas con mancuernas', 'Brazos', [], 'Mancuernas', 'Principiante', 'wrist', [
    'Apoya los antebrazos sobre los muslos con las palmas hacia abajo y las manos fuera del apoyo.',
    'Eleva el dorso de las manos moviendo solo las muñecas.',
    'Desciende con control sin arrastrar los antebrazos ni usar impulso.',
  ], ['Mantén una carga que permita controlar el agarre.', 'Detén el recorrido antes de forzar la muñeca en su extremo.'], 'forearms', []),
  exercise(65, 'Crunch en polea de rodillas', 'Core', [], 'Polea', 'Intermedio', 'cablecrunch', [
    'Arrodíllate frente a una polea alta y coloca la cuerda junto a los lados de la cabeza.',
    'Acerca las costillas a la pelvis flexionando el tronco sin tirar de la cuerda con los brazos.',
    'Recupera lentamente la posición inicial sin dejar que el cable arquee la espalda.',
  ], ['Mantén la cadera relativamente estable para no convertirlo en una reverencia.', 'Usa un apoyo cómodo para las rodillas.'], 'rectus-abdominis', ['obliques']),
  exercise(66, 'Crunch inverso', 'Core', [], 'Colchoneta', 'Principiante', 'reversecrunch', [
    'Acuéstate boca arriba con las rodillas flexionadas y los brazos apoyados a los lados.',
    'Enrolla la pelvis hacia las costillas elevando ligeramente el sacro del suelo.',
    'Apoya la pelvis de nuevo de forma lenta, sin lanzar las piernas hacia delante.',
  ], ['El gesto es corto y nace de la pelvis, no de un balanceo de rodillas.', 'Mantén el cuello apoyado y relajado.'], 'rectus-abdominis', ['obliques']),
  exercise(67, 'Crunch abdominal en máquina', 'Core', [], 'Máquina', 'Principiante', 'cablecrunch', [
    'Ajusta el asiento y los apoyos del aparato para sujetar el tronco de forma cómoda.',
    'Flexiona el tronco acercando el pecho a la pelvis siguiendo el recorrido de la máquina.',
    'Regresa lentamente sin empujar con las piernas ni soltar las placas.',
  ], ['El ajuste de cada máquina cambia el apoyo; revísalo antes de cargar.', 'No fuerces la flexión del cuello para mover más peso.'], 'rectus-abdominis', ['obliques']),
  exercise(68, 'Plancha alta con toques de hombro', 'Core', [], 'Peso corporal', 'Intermedio', 'planktap', [
    'Adopta una plancha sobre las manos con los pies algo separados para tener un apoyo estable.',
    'Lleva una mano al hombro contrario mientras evitas que la pelvis gire.',
    'Apoya la mano y alterna el lado; cuenta un toque como una repetición.',
  ], ['Separa más los pies si necesitas mejorar la estabilidad.', 'Termina la serie si la cadera cae o pierdes el control de la rotación.'], 'obliques', ['rectus-abdominis', 'anterior-deltoid']),
  exercise(69, 'Press Pallof en polea', 'Core', [], 'Polea', 'Principiante', 'pallof', [
    'Colócate de lado a una polea a la altura del pecho y sujeta el agarre con ambas manos junto al esternón.',
    'Extiende los brazos al frente sin permitir que el cable haga girar el tronco.',
    'Acerca las manos al pecho y completa las repeticiones antes de cambiar de orientación.',
  ], ['Mantén una resistencia que permita respirar y conservar la pelvis estable.', 'Cada extensión y regreso forma una repetición; no se registra como ejercicio por tiempo.'], 'obliques', ['rectus-abdominis']),
  exercise(70, 'Leñador en polea alta', 'Core', [], 'Polea', 'Intermedio', 'woodchop', [
    'Sitúate de lado a una polea alta y toma el agarre con ambas manos, con los pies estables.',
    'Lleva las manos en diagonal hacia la cadera contraria con una rotación controlada de tronco y caderas.',
    'Regresa siguiendo la misma diagonal lentamente y cambia de lado al terminar.',
  ], ['Permite que los pies acompañen la rotación sin dejar las rodillas retorcidas.', 'No uses tirones ni busques un giro extremo de la espalda.'], 'obliques', ['rectus-abdominis']),
  exercise(71, 'Flexión lateral con mancuerna', 'Core', [], 'Mancuernas', 'Principiante', 'sidebend', [
    'Colócate de pie con una mancuerna en una mano y la otra libre, sin elevar los hombros.',
    'Inclina el tronco ligeramente hacia el lado de la carga manteniendo la pelvis estable.',
    'Vuelve a la vertical de forma controlada y cambia de mano después de las repeticiones previstas.',
  ], ['Evita girar el pecho durante la inclinación.', 'El recorrido lateral debe ser cómodo y sin rebotes.'], 'obliques', ['spinal-erectors']),
  exercise(72, 'Crunch cruzado', 'Core', [], 'Colchoneta', 'Principiante', 'crunch', [
    'Acuéstate con las rodillas flexionadas y las manos apoyadas suavemente junto a la cabeza.',
    'Eleva un hombro orientándolo hacia la rodilla contraria mediante una flexión y rotación corta del tronco.',
    'Apoya la espalda alta de nuevo y alterna el lado sin tirar del cuello.',
  ], ['Mantén la pelvis apoyada y evita empujar la cabeza con las manos.', 'Prioriza el control sobre la distancia que recorre el codo.'], 'obliques', ['rectus-abdominis']),
]);
