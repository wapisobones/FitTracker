# FitTracker — Especificación funcional (MVP)

**Estado:** base de implementación aprobada.  
**Objetivo:** aplicación web de seguimiento de entrenamientos de fuerza, usable en escritorio y móvil, sin cuentas ni servidor.

## 1. Principios

- Sitio estático, ejecutable localmente y publicable en GitHub Pages.
- HTML, CSS y JavaScript modular, sin framework obligatorio; `pnpm` si se requieren herramientas de desarrollo.
- Datos personales persistidos en **IndexedDB** del navegador, sin sincronización entre dispositivos.
- Interfaz responsive, prioridad a registro de series en el móvil.
- Accesibilidad básica: navegación con teclado, etiquetas, contraste y estados de foco.
- Funciones auténticas con datos de demostración; evitar botones decorativos.
- No implementar login, API, nube ni servicios de IA de pago en MVP.

## 2. Diseño y fuentes visuales

Consultar los mockups aprobados en `docs/mockups/` **antes de implementar cada pantalla**. Mantener su lenguaje visual: fondo gris carbón/azul muy oscuro, acento verde lima, tarjetas redondeadas, navegación lateral en escritorio y navegación cómoda en móvil. Los mockups son referencias de diseño, no la definición exclusiva del comportamiento.

Pantallas con referencias: Dashboard, catálogo y modal de Ejercicios, Mis rutinas, Generador muscular, Rutinas prediseñadas, Rutina activa, Progreso, Calculadora 1RM, Calculadora de calorías y Perfil. Cuando existan variantes móviles, usarlas expresamente. Los nombres exactos de las imágenes pueden variar: revisar `docs/mockups/` antes de enlazarlas o describirlas.

## 3. Modos y primera visita

### Demostración
- Mostrar rutinas, sesiones, historial y gráficos ficticios completos para probar todas las secciones.
- Los datos ficticios son **aislados** de los personales (almacenes/bases diferenciados o partición estricta por ámbito).
- Permitir restablecer la demostración sin afectar al usuario.
- Cualquier edición realizada en demostración afecta solo a demostración.

### Uso personal
- Primera visita: elegir «Explorar demostración» o «Comenzar mi entrenamiento»; poder cambiar de modo después.
- Datos personales sin estadísticas ficticias: cuando no exista historial, mostrar estados vacíos útiles.
- La **biblioteca de ejercicios base y las plantillas** están disponibles en ambos modos; pueden reutilizarse en «Mis rutinas» como copias independientes.
- No identificar ni autenticar usuarios. El ámbito personal corresponde al perfil del navegador/dispositivo.

## 4. Pantallas y funcionalidades

### 4.1 Dashboard / Inicio
- Indicadores calculados: cantidad de sesiones semanales, volumen semanal (suma de peso × repeticiones de series terminadas), ejercicio más trabajado, récords según datos suficientes.
- Gráfico de tendencia e historial reciente.
- Objetivos semanales configurables cuando corresponda.
- Evitar métricas inventadas en el modo personal.

### 4.2 Entrenamientos > Ejercicios
- Catálogo precargado con búsqueda y filtros por grupo muscular, equipamiento y dificultad.
- Cada **tarjeta** muestra imagen, nombre, músculos, equipamiento y dificultad.
- Al tocar la **imagen**, abrir modal con demostración en vídeo (solo si hay recurso permitido) y explicación de técnica; no repetir dentro del modal toda la ficha de atributos de la tarjeta.
- Vídeos y fotografías deben ser propios, libres o con licencia válida; no reutilizar ni incrustar contenido de MuscleWiki sin permiso. Si falta un vídeo, mostrar texto/ilustración o aviso discreto, nunca un reproductor roto.
- Crear ejercicios personalizados (nombre, músculo principal, equipamiento y notas). Permitir incorporarlos a rutinas e historial.

### 4.3 Entrenamientos > Mis rutinas
- Crear, copiar, editar, eliminar y ordenar rutinas y sesiones.
- Una rutina contiene una **secuencia ordenada de sesiones**, no días calendario obligatorios.
- Sesión contiene ejercicios ordenados y sus series/repeticiones objetivo/descanso.
- Opcionalmente sugerir días de semana, sin imponerlos.
- Ejemplo: Pull → Push → Legs → Refuerzo superior; al completar última sesión, la siguiente sugerida vuelve a Pull.
- Permitir elegir manualmente cualquier sesión sin perder historial.

### 4.4 Entrenamientos > Generador
- Mapa muscular frontal/trasero interactivo, si es viable mantenerlo accesible en móvil; incluir alternativa por lista de músculos.
- Entrada: grupos musculares, nivel (principiante/intermedio/avanzado), objetivo (hipertrofia/fuerza/acondicionamiento), equipo disponible, frecuencia y duración aproximada.
- Modalidad A: **una sesión**; modalidad B: **programa de varias sesiones**.
- Generación local, por reglas deterministas a partir de la biblioteca; no prometer resultados médicos ni usar IA externa.
- Devolver propuesta editable (ejercicios, orden, series, repeticiones, descansos) antes de guardar en «Mis rutinas».
- Si las restricciones impiden proponer ejercicios suficientes, explicar el límite y ofrecer opciones.

### 4.5 Entrenamientos > Rutinas prediseñadas
- Plantillas de diferentes niveles y objetivos.
- Ver detalle antes de usar.
- «Guardar en Mis rutinas» genera una copia totalmente editable; la plantilla original no cambia.

### 4.6 Rutina activa
- Iniciar una sesión de una rutina o una sesión individual.
- Mostrar series/repeticiones **planificadas** separadas del registro **real** (peso y repeticiones).
- Recuperar última ejecución relevante por ejercicio/serie como **referencia editable**, sin marcar ninguna serie como completada de antemano.
- Registrar serie, marcar completada y mostrar descanso con temporizador.
- Navegar con «Siguiente ejercicio» y «Anterior» **manualmente**; no pasar automáticamente.
- Pausar y reanudar incluso tras cerrar/reabrir el navegador, persistiendo borrador en IndexedDB.
- Finalizar completa, guardar parcialmente (contabilizando solo las series completas) o descartar con confirmación.
- Sugerir incrementos razonables de carga cuando se complete el rango objetivo; **nunca modificar el peso automáticamente**.
- Si la app se cierra abruptamente, ofrecer recuperar la sesión activa.

### 4.7 Progreso
- Gráficos y filtros por período/ejercicio de volumen, peso usado, tendencia de fuerza y estimación de 1RM.
- Récords por mayor carga real y/o 1RM estimado, claramente diferenciados.
- Historial de entrenamientos con fecha, ejercicios, series terminadas y estado de finalización.
- Distribución de grupos musculares basada en series completadas, sin duplicar arbitrariamente grupos secundarios.

### 4.8 Herramientas
- **Calculadora 1RM:** estimación de Epley `peso × (1 + repeticiones / 30)` para esfuerzo apropiado; mostrar carácter estimado y rangos porcentuales sugeridos. Evitar interpretar como diagnóstico o prescripción.
- **Calculadora calorías:** estimación orientativa de necesidades energéticas y macronutrientes a partir de datos ingresados, mostrando supuestos y advertencia de que no constituye consejo clínico.
- Ambas herramientas funcionan sin conexión ni API.

### 4.9 Perfil
- Perfil local editable: alias y preferencias útiles para entrenar, unidades y objetivos cuando aplique.
- Exportación e importación de respaldo JSON, restablecimiento de datos con confirmación y modo de demostración.
- Información clara de que borrar datos del navegador puede borrar el historial si no hay respaldo.

## 5. Reglas de cálculo

- **Volumen levantado:** suma `pesoKg × repeticiones` por **serie completada**. Peso o repeticiones inválidos/no registrados no aportan volumen.
- **Sesiones de la semana:** sesiones con datos completados (incluye parciales guardadas si tienen al menos una serie completada); semana local consistente.
- **Historial:** conserva snapshot de ejercicio, objetivos y valores reales, para evitar reescrituras cuando se edite la plantilla.
- **Progresión:** sugerencias opcionales, nunca mutaciones automáticas de objetivos ni de pesos registrados.
- **Ciclo:** posición sugerida por rutina; completar/guardar parcial no debe ocasionar saltos ambiguos. Documentar el criterio elegido al implementarlo.
- **Unidades:** persistir peso en kg para los cálculos; visualizar según preferencia si se incorpora conversión.

## 6. Modelo conceptual de datos

- `Exercise`: id, nombre, músculo principal, músculos secundarios opcionales, equipo, dificultad, notas, medios y origen (base/personalizado).
- `Routine`: id, nombre, descripción, origen (manual/plantilla/generador), secuencia de sesiones y configuración.
- `RoutineSession`: id, rutinaId, nombre, orden, lista ordenada de prescripciones.
- `ExercisePrescription`: ejercicioId, orden, cantidad de series, objetivo de repeticiones (fijo o rango), descanso y notas.
- `Workout`: id, referencia de rutina/sesión opcional, inicio, fin, estado (en curso/completo/parcial), snapshot y registros.
- `SetRecord`: ejercicio, posición de serie, pesoKg, repeticiones, estado completada y marca temporal.
- `Profile`: alias, preferencias, objetivos.
- `Settings`: modo actual, ciclo sugerido, preferencias.

Usar IDs estables (UUID); timestamps ISO; versionar esquema de IndexedDB y formato de respaldo. Mantener actualizaciones transaccionales cuando corresponda.

## 7. Almacenamiento, respaldo y protección

- IndexedDB como única persistencia para datos estructurados. No depender de `localStorage` para sesiones críticas.
- Separación explícita demo/personal.
- Exportar JSON con `schemaVersion`, `exportedAt` y datos personales (nunca datos demo a menos que se solicite explícitamente).
- Validar formato, versión y contenido antes de importar. Presentar confirmación de reemplazo o un flujo de importación claramente definido; nunca sobrescribir sin aviso.
- No incluir datos personales reales en repositorio ni en semillas.
- `reset personal` y `reset demo` separados, ambos con confirmación.

## 8. Navegación y UX

- Secciones visibles: Inicio, Entrenamientos (Ejercicios / Mis rutinas / Generador / Prediseñadas), Rutina activa, Progreso, Herramientas (1RM / Calorías), Perfil.
- Estados de carga/error/vacío y confirmación de acciones destructivas.
- Pantallas pequeñas: controles táctiles grandes, formularios simples, botones accesibles para completar series.
- Reducir dependencias externas; preferir recursos empaquetados o URLs autorizadas con degradación elegante.

## 9. Fuera de alcance del MVP

- Login, cuentas y sincronización en la nube.
- Backend, SQL Server, API remota.
- Planificación inteligente por IA de pago.
- Compartir rutinas entre usuarios mediante servidor.
- Integraciones con wearables o sensores.
- Funciones médicas o recomendaciones clínicas.

## 10. Criterios de aceptación generales

1. Funciona en navegador moderno, especialmente en móvil.
2. Demo funcional completa con datos ficticios, aislados del uso personal.
3. Al registrar y completar series, historial, Dashboard y Progreso reflejan los datos guardados.
4. Una sesión en curso se puede retomar después de recargar/cerrar y abrir la página.
5. Crear/editar rutinas manuales, desde plantilla o desde generador; sesiones sueltas o ciclos.
6. Copiar una plantilla no edita su original.
7. Exportar respaldo e importarlo sin corromper registros.
8. Publicación estática compatible con GitHub Pages, incluidas rutas y recursos desde subruta del repositorio.
9. Mockups revisados para cada pantalla desktop/móvil pertinente.

## 11. Secuencia sugerida de desarrollo

1. Estructura, diseño global, navegación responsive, componentes comunes y configuración de publicación.
2. Persistencia IndexedDB, semillas, separación demo/personal y primera visita.
3. Biblioteca de ejercicios, filtros, fichas y ejercicios personalizados.
4. Gestión de rutinas y plantillas prediseñadas.
5. Rutina activa y persistencia de series/descansos/pausa/recuperación.
6. Dashboard y Progreso derivados del historial real.
7. Generador muscular (sesión individual y plan completo).
8. Herramientas, Perfil, JSON respaldo/importación y pulido visual.
9. Verificación móvil y despliegue GitHub Pages.

**Nota:** Esta especificación es la referencia funcional. Antes de ampliar alcance, implementar y validar el flujo principal de extremo a extremo.
