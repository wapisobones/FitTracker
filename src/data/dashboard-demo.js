// Visual preview only: seed exclusively in the demo database, never as workouts.
export const dashboardDemo = {
  period: 'Octubre · ejemplo',
  week: '21 – 27 oct',
  exercise: 'Press de banca',
  metrics: [
    { symbol: 'dumbbell', label: 'Ejercicio más trabajado', value: 'Press de banca', detail: '14 sesiones este mes', decoration: 'trophy' },
    { symbol: 'weight', label: 'Máximo 1RM estimado', value: '115', unit: 'kg', detail: 'Sentadilla', decoration: 'trend' },
    { symbol: 'flame', label: 'Volumen semanal', value: '15.700', unit: 'kg', detail: 'Semana del 21 al 27 de octubre' },
    { symbol: 'calendar', label: 'Entrenamientos', value: '16', detail: 'Completados este mes', decoration: 'ring', completionPercent: 100 },
  ],
  load: [54, 57, 57.5, 60, 61, 62, 62, 65, 65, 67, 69, 68.5, 72.5, 75],
  muscles: [['Espalda', 24], ['Pecho', 20], ['Piernas', 18], ['Hombros', 15], ['Brazos', 13], ['Core', 10]],
  workouts: [
    { day: 'Lun', date: '21 oct', title: 'Empuje (Pecho / Tríceps)', detail: '6 ejercicios · 18 series · 4.320 kg' },
    { day: 'Mié', date: '23 oct', title: 'Pierna completa', detail: '5 ejercicios · 20 series · 6.870 kg' },
    { day: 'Jue', date: '24 oct', title: 'Tirón (Espalda / Bíceps)', detail: '6 ejercicios · 18 series · 4.510 kg' },
  ],
  goals: [
    { symbol: 'calendar', title: 'Sesiones de entrenamiento', value: '3 de 3', percent: 100 },
    { symbol: 'weight', title: 'Volumen levantado', value: '15.700 / 15.000 kg', percent: 100 },
    { symbol: 'chart', title: 'Carga en press de banca', value: '75 / 77,5 kg', percent: 97 },
  ],
};
