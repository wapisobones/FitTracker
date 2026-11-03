export const MUSCLE_GROUPS = Object.freeze(['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core']);
export const DIFFICULTIES = Object.freeze(['Principiante', 'Intermedio', 'Avanzado', 'Sin especificar']);

function exercise(number, name, mainMuscle, secondaryMuscles, equipment, difficulty, visual, steps, tips) {
  return Object.freeze({
    id: `c1700000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    origin: 'base', name, mainMuscle, equipment, difficulty, visual,
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
    'Flexiona las caderas para acercar las rodillas al tronco con control.',
    'Baja las piernas despacio hasta la posición inicial.',
  ], ['Evita impulsarte con el cuerpo.', 'Interrumpe la serie si pierdes el agarre o el control del balanceo.']),
]);
