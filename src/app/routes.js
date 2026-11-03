export const routes = [
  { id: 'inicio', title: 'Inicio', icon: 'home' },
  { id: 'ejercicios', title: 'Ejercicios', icon: 'dumbbell', group: 'Entrenamientos', description: 'Explora la biblioteca de ejercicios y aprende la técnica correcta.' },
  { id: 'mis-rutinas', title: 'Mis rutinas', icon: 'layers', group: 'Entrenamientos', description: 'Organiza tus rutinas y sus sesiones.' },
  { id: 'generador', title: 'Generador', icon: 'spark', group: 'Entrenamientos', description: 'Prepara una sesión o un programa según tus músculos, equipo y objetivo.' },
  { id: 'predisenadas', title: 'Rutinas prediseñadas', icon: 'layers', group: 'Entrenamientos', description: 'Un punto de partida para tu entrenamiento.' },
  { id: 'rutina-activa', title: 'Rutina activa', icon: 'calendar', description: 'Tu espacio para entrenar, una serie a la vez.' },
  { id: 'progreso', title: 'Progreso', icon: 'chart', description: 'Tu evolución, respaldada por cada serie completada.' },
  { id: 'herramientas', title: 'Herramientas', icon: 'tools', description: 'Calculadoras y referencias para acompañar tu entrenamiento.' },
  { id: 'calculadora-1rm', title: 'Calculadora de 1RM', icon: 'calculator', group: 'Herramientas', description: 'Estima tu repetición máxima a partir de una serie.', empty: 'Una referencia para tus cargas', detail: 'La calculadora usará la fórmula de Epley y mostrará el resultado como una estimación. El cálculo aún no está disponible.', action: 'Calcular 1RM' },
  { id: 'calculadora-calorias', title: 'Calculadora de calorías', icon: 'flame', group: 'Herramientas', description: 'Una estimación orientativa de tus necesidades energéticas.', empty: 'Conoce tus necesidades de energía', detail: 'Podrás consultar estimaciones de calorías y macronutrientes con sus supuestos. El cálculo aún no está disponible.', action: 'Calcular calorías' },
  { id: 'perfil', title: 'Perfil', icon: 'user', description: 'Tu información y preferencias de entrenamiento, en tu dispositivo.', empty: 'Tu espacio personal estará aquí', detail: 'Podrás definir un alias, configurar preferencias y gestionar respaldos. En esta vista no se solicitan ni se guardan datos personales.', action: 'Editar perfil' },
];

export const findRoute = (id) => routes.find((route) => route.id === id);
