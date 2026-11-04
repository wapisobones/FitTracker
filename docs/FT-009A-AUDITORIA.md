# FT-009A — Auditoría visual integral de FitTracker

Fecha: 4 de noviembre de 2026. Referencia del repositorio al comenzar: `8622152`, árbol de trabajo limpio. Alcance: evaluación y recomendaciones; ninguna corrección implementada.

## 1. Resumen ejecutivo

La aplicación conserva la identidad aprobada: fondo carbón/azul, lima para acciones y selección, tarjetas redondeadas, navegación lateral en escritorio y navegación inferior en móvil. Las pantallas principales están implementadas y se pudieron observar renderizadas en escritorio y móvil. La fidelidad de composición es mayor en catálogo, calculadoras y estructura general de Progreso; es parcial en la densidad de Mis rutinas, la disposición móvil de las calculadoras y el acceso a controles del entrenamiento.

Se registran **18 hallazgos: 0 P0 reproducidos, 4 P1 y 14 P2**. La ausencia de P0 se limita a los escenarios observados; esta auditoría no certifica todos los flujos funcionales ni sustituye las pruebas anteriores.

Los cuatro problemas importantes son:

1. **A01 — P1:** «Iniciar sesión» queda al final del detalle de rutina, después de todos los ejercicios.
2. **A03 — P1:** desde el registro móvil de series no están disponibles directamente Pausar y Finalizar; hay que volver al resumen y desplazarse.
3. **A08 — P1:** el resultado de 1RM queda fuera del área visible después de calcular en móvil, sin llevar al usuario hacia él.
4. **A10 — P1:** el error de un respaldo inválido se muestra al principio de Perfil, lejos del selector de archivo que se está utilizando.

Primero conviene corregir estos accesos y respuestas visibles. Después, ajustar selección y dimensiones de gráficos, mensajes compartidos y densidad de las pantallas. No hace falta sustituir la identidad visual ni añadir funciones para reproducir elementos ilustrativos del mockup.

Clasificación utilizada: **P0**, impide utilizar una funcionalidad; **P1**, problema importante de uso, accesibilidad o diseño; **P2**, diferencia visual o mejora menor. Los tamaños, espaciados y diferencias estéticas no se clasifican como P0.

## 2. Método, arquitectura y límites

### Preparación

Se leyeron `AGENTS.md`, `FITTRACKER-SPEC.md` y los documentos FT-001 a FT-008. Se inspeccionaron los 17 archivos de mockups y el código de navegación, vistas, formularios, estilos, gráficos, controladores y persistencia relevante para interpretar los estados.

La evaluación aplicó las skills `frontend-design` y `web-design-guidelines`. Se consultó la [versión vigente de Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Sus criterios de foco, formularios, semántica y adaptación se usaron junto con los requisitos del proyecto; no se trasladaron recomendaciones específicas de otros frameworks ni se cambió la convención de textos en español.

### Entorno observado

- Microsoft Edge **156.0.4314.58**, automatizado con el Playwright ya instalado, en un contexto nuevo y temporal.
- Compilación `dist/` existente, servida localmente bajo `/FitTracker/`. Su fecha de modificación era posterior a la del archivo más reciente de `src/`. No se recompiló ni se modificó `dist/`.
- Comparación principal: **1536 × 1024** y **390 × 844** píxeles CSS. Revisión adicional a **320 × 844**, **768 × 1024** y **1024 × 844**, y capturas de varias pantallas a 768 × 844.
- Se observaron capturas reales del navegador, además de medidas DOM y acciones de teclado. No fue una revisión limitada al CSS. Las capturas se mantuvieron en memoria: el único archivo creado en el repositorio es este documento.
- Se utilizaron la demo inicial y estados sintéticos del contexto temporal: copia de una plantilla, registro de una serie, preferencias de unidades y un respaldo de prueba. El restablecimiento demo se comprobó únicamente en ese contexto aislado. No se abrió el perfil habitual del navegador ni se accedió a bases personales existentes.
- No se instalaron dependencias, no se ejecutaron suites de pruebas ni se hizo push. Los recorridos automatizados sirvieron para observar estados y distribución, no para realizar una nueva campaña de regresión.

### Arquitectura que condiciona la evaluación

HTML/CSS y módulos JavaScript, con vistas montadas por rutas hash desde `src/app/main.js`. La navegación y los diálogos compartidos se generan en componentes locales. IndexedDB mantiene las bases independientes `fittracker-app`, `fittracker-demo` y `fittracker-personal`, con esquema versión 1.

Rutinas, sesiones, entrenamientos, series, ejercicios personalizados, perfil y configuración tienen almacenes separados. Dashboard y Progreso comparten normalización y métricas de historial; los gráficos se dibujan con SVG. La unidad visual se convierte desde kg. Las calculadoras usan datos temporales; el respaldo personal se gestiona desde Perfil. La propuesta del Generador reutiliza el editor de rutinas.

Estas decisiones explican diferencias legítimas respecto de las ilustraciones: sesiones sin calendario obligatorio, contenido local, ausencia de estadísticas corporales inventadas y ausencia de vídeos sin licencia. No se proponen cambios al modelo ni a los snapshots como consecuencia de esta auditoría visual.

### Límites explícitos

- Viewports de Edge: **no se verificaron dispositivos físicos, Safari/iOS, teclado virtual, orientación real ni lector de pantalla**. No se certifica conformidad WCAG integral.
- Se observaron validación de entradas, catálogo sin coincidencias, vacío personal, pausa, confirmación de finalización, importación inválida y confirmaciones destructivas. **No se inspeccionaron visualmente fallos de cuota, apertura bloqueada, migración o conflictos simultáneos entre pestañas.** La documentación anterior no se cuenta como inspección visual de esos estados.
- Se revisaron exportación, archivo inválido, vista previa válida y cancelación. **No se ejecutó el reemplazo personal ni el restablecimiento personal**; se inspeccionaron sus diálogos. No se repitieron sus verificaciones transaccionales de FT-008.
- Se observó una serie completada y el diálogo de finalización. **No se inspeccionó el resumen posterior a guardar una sesión completa o parcial en esta auditoría.**
- No hay reproducción de vídeo autorizado, pantalla biométrica de Perfil ni ciertas variantes de descanso a pantalla completa del mockup. Se inspeccionaron los estados alternativos realmente implementados; no se afirma haber verificado esas pantallas inexistentes.
- No se auditó la publicación remota ni el pipeline de GitHub Pages. La navegación local sí se observó bajo la subruta del repositorio.

## 3. Inventario de referencias y pantallas comparadas

### Los 17 mockups

| Archivo en `docs/mockups/` | Referencia visual observada | Implementación comparada |
| --- | --- | --- |
| `01-dashboard.png` | Dashboard de escritorio | Inicio, indicadores, carga, grupos, historial y objetivos |
| `02-dashboard-generador-comparativa.png` | Comparación Dashboard / Generador de escritorio | Separación entre estadísticas y generación |
| `03-ejercicios-desktop-modal.png` | Catálogo y detalle de escritorio | Cuadrícula, filtros y modal técnico |
| `04-ejercicios-mobile-modal.png` | Catálogo y hoja de detalle móvil | Dos columnas, filtros y diálogo inferior |
| `05-mis-rutinas-desktop.png` | Lista, detalle y prescripciones | Mis rutinas y acceso a edición/inicio |
| `06-mis-rutinas-mobile.png` | Lista, detalle y editor móvil | Navegación del detalle y formularios modales |
| `07-generador-muscular.png` | Comparativa con mapa, compatibles y configuración | Generador; no contiene una variante móvil específica |
| `08-rutinas-predisenadas.png` | Plantillas de escritorio y variantes móviles | Niveles, selección, sesiones y guardar copia |
| `09-rutina-activa-desktop.png` | Ejercicios y registro de escritorio | Resumen, series, descanso y acciones |
| `10-rutina-activa-mobile.png` | Vista móvil larga del entrenamiento | Distribución de resumen, series y controles |
| `11-rutina-activa-mobile-flujo.png` | Resumen, registro y descanso móvil | Cambio de vista y acceso a siguiente ejercicio |
| `12-rutina-activa-mobile-flujo-extra.png` | Variantes de estados, descanso y final de ejercicio | Estados y acciones disponibles; variantes no implementadas diferenciadas |
| `13-progreso.png` | Progreso de escritorio y vistas móviles | Resumen, fuerza, volumen, grupos e historial |
| `14-calculadora-1rm.png` | Tres paneles y variantes móviles | Entrada, estimación, tabla y guía |
| `15-calculadora-calorias.png` | Tres paneles y flujo móvil por etapas | Formulario, escenarios, resumen y macros |
| `16-perfil.png` | Perfil de escritorio y edición móvil | Cabecera y preferencias; datos corporales fuera del alcance implementado |
| `17-perfil-progreso-variante.png` | La imagen muestra Progreso y detalle de ejercicio en móvil | Referencia complementaria de Progreso, aunque el nombre incluya «perfil» |

### Cobertura de las pantallas solicitadas

| Pantalla | Escritorio / móvil observados | Tamaños intermedios | Resultado de comparación |
| --- | --- | --- | --- |
| Dashboard | Sí / sí, demo y vacío personal en móvil | Tablet observada | Estructura reconocible; gráfico inicial y densidad mejorables |
| Catálogo | Sí / sí | Tablet observada | Cuadrícula y filtros fieles; cabecera móvil extensa |
| Modal de ejercicio | Sí / sí | Sin inspección específica del modal en tablet | Hoja móvil, técnica y cierre consistentes; alternativa a vídeo correcta |
| Mis rutinas | Sí / sí, vacío y copia de plantilla | Tablet observada | Lista/detalle reconocibles; inicio y longitud del detalle mejorables |
| Editor de rutinas | Metadatos y objetivos: sí / sí | Sin inspección específica de los formularios en tablet | Diálogos utilizables; entradas numéricas en lugar de los steppers ilustrados |
| Generador | Sí / sí, mapa y propuesta corta | Tablet observada | Tres áreas y selección lima; etiquetas y resumen mejorables |
| Prediseñadas | Sí / sí, lista y detalle | Tablet observada | Niveles y copia claros; comparte la longitud del detalle de rutinas |
| Rutina activa | Sí / sí, registro, pausa, error y confirmación | Registro a 768 px observado | Controles de series adecuados; acciones globales alejadas en móvil |
| Progreso y gráficos | Sí / sí, curva, grupos e historial desplegado | Recorrido intermedio y gráficos observados | Jerarquía base conservada; escala vertical excesiva en vista de volumen |
| Calculadora 1RM | Sí / sí, resultado kg/lb y validación | Tablet observada | Buena composición de escritorio; respuesta visual móvil insuficiente |
| Calculadora de calorías | Sí / sí, formulario, resultado y macros | Tablet observada | Paneles reconocibles; móvil más largo que el flujo de referencia |
| Perfil y preferencias | Sí / sí | Tablet observada | Cabecera y formulario consistentes; protección de cambios mejorable |
| Respaldos | Exportación y vista previa: sí / sí; error móvil | Diálogo además observado a 320 px | Alcance personal claro; error fuera de pantalla y tabla estrecha |
| Navegación / compartidos | Sidebar y encabezado; menú e inferior móvil | Adaptación intermedia observada | Base coherente; textos antiguos y aviso de reset persistente |

No falta inspección visual de ninguna de las pantallas principales de la lista. Las excepciones corresponden a estados y variantes específicos, enumerados arriba; el recorrido de una ruta a un ancho intermedio no equivale a verificar todas sus variantes en tablet.

## 4. Hallazgos por pantalla

Las coordenadas siguientes son aproximadas y corresponden a los estados indicados. Cuando se utiliza una posición de documento se señala expresamente; las demás son relativas al viewport. Los localizadores `archivo:línea` permiten ubicar la implementación sin afirmar que el hallazgo provenga solo de su lectura.

### 4.1 Dashboard

**A06 — P2 — Selección inicial de una curva sin carga positiva.**

Evidencia: con la demo recién inicializada, Inicio en «Este mes» eligió **Crunch abdominal**, con seis series del período y pesos de 0 kg. La curva quedó horizontal en cero mientras existían registros de Press de banca y Sentadilla con barra con carga positiva. Al seleccionar Press de banca apareció su curva. En Progreso, los 90 días iniciales seleccionaron Press de banca; el problema depende de los datos y el período, no ocurre siempre. La selección automática toma el primer ejercicio por cantidad de series y desempate de nombre.

Ubicación: `src/features/progress/metrics.js:75` y `src/features/progress/metrics.js:76`.

Recomendación: para la selección **automática** del gráfico de carga/1RM, preferir un ejercicio con observaciones aplicables a esa métrica. Mantener disponibles los ejercicios de peso corporal y respetar una selección explícita del usuario. No cambiar la métrica «Ejercicio más trabajado» ni inventar peso corporal.

Además aplica A07, relativo al espacio del gráfico. La composición de cuatro indicadores, distribución muscular, historial y metas se conserva. La intensidad de la figura es orientativa; no se debe convertir en una medición anatómica.

### 4.2 Catálogo de ejercicios

**A15 — P2 — Demasiado contenido previo a las primeras tarjetas en móvil.**

Evidencia: a 390 × 844, la primera fila comienza aproximadamente en **y = 600 px**, después del encabezado, Crear ejercicio, explicación del ámbito, búsqueda, Filtros, chips y contador. Solo parte de esa fila aparece antes de la navegación inferior. El mockup 04 da más protagonismo inmediato a la biblioteca. En tablet se mantienen dos columnas y los selectores siguen utilizables.

Ubicación: `src/features/exercises/views.js:9`, `src/features/exercises/views.js:10` y `src/styles/exercises.css:1`.

Recomendación: compactar la cabecera y colocar la explicación del ámbito donde no añada otro bloque alto. Conservar búsqueda, filtros, acceso a crear y claridad demo/personal. No añadir favoritos u ordenación solo para imitar controles sin alcance definido.

Se observaron dos columnas móviles, nombres que envuelven, selección visible y un vacío recuperable al buscar un nombre sin coincidencias. No se reprodujo un bloqueo del catálogo.

### 4.3 Modal de detalle de ejercicio

Sin hallazgo exclusivo P0/P1. Se compararon las dos columnas de escritorio y la hoja inferior móvil con 03/04. A 390 px, el diálogo medía aproximadamente **388 × 783 px**, con contenido interno de 944 px: requiere desplazamiento, pero mantiene cierre y técnica accesibles. El contenido está separado de la ficha de atributos y explica la ausencia de vídeo.

La ilustración esquemática difiere de las fotografías del mockup por la decisión documentada sobre recursos propios. No se recomienda incorporar fotografías o reproductores sin licencia para aumentar la similitud. El ajuste tipográfico transversal A17 también afecta a las leyendas pequeñas.

### 4.4 Mis rutinas

**A01 — P1 — Acción de iniciar relegada al final del detalle.**

Evidencia: con la copia **Full body básico**, sesión A de cinco ejercicios, «Iniciar sesión» estaba en la posición de documento **y ≈ 1348 px** en escritorio de 1536 × 1024. La cabecera visible ofrece Editar, Duplicar y Eliminar, pero no Iniciar. En móvil se apilan lista y detalle, y la acción queda después de la sesión completa. Los mockups 05/06 presentan Iniciar junto a la cabecera o en la tarjeta.

Ubicación: `src/features/routines/views.js:31` y `src/features/routines/views.js:37`.

Recomendación: situar Iniciar junto a la rutina/sesión seleccionada, con mayor jerarquía que las acciones administrativas. Conservar el selector y la recuperación de una sesión pendiente. Aceptación propuesta: iniciar desde la cabecera sin recorrer todas las prescripciones, en escritorio y móvil.

**A02 — P2 — Detalle móvil excesivamente largo y con acciones de edición dispersas.**

Evidencia: a 390 px se muestran consecutivamente lista, cabecera, acciones de rutina, secuencia, acciones de sesión y cinco filas. Cada fila separa nombre, objetivos y cuatro iconos en varias líneas. En 06 el listado de ejercicios es más compacto y el detalle se presenta como una vista diferenciada.

Ubicación: `src/styles/routines.css:42`, `src/styles/routines.css:73` y `src/styles/routines.css:84`.

Recomendación: reducir repetición vertical y agrupar acciones secundarias. Evaluar lista/detalle diferenciados en móvil con retorno claro, sin perder selección ni depender de gestos para reordenar. Las áreas táctiles deben conservar su tamaño al compactar.

### 4.5 Editor de rutinas

Los formularios de nombre/descripción y de objetivos se observaron abiertos en escritorio y móvil. Los campos tienen etiquetas; las hojas muestran Guardar y Cancelar y se cierran con Escape. El uso de entradas numéricas en lugar de los botones +/− del mockup 06 no impide editar y no justifica agregar otro sistema de formularios.

Aplican A02 y A17 a densidad y texto secundario. A18 propone una pauta común para la validación; su reproducción concreta se realizó en 1RM, no se afirma haber reproducido errores en cada formulario del editor.

### 4.6 Generador muscular

**A16 — P2 — Frecuencia inactiva y singular/plural poco claros en una sesión individual.**

Evidencia: seleccionando Pecho y modalidad Sesión individual, el selector deshabilitado de frecuencia seguía mostrando **«3 sesiones»**. La propuesta correctamente contenía una sesión, pero se rotulaba **«1 sesiones»**, **«1 ejercicios planificados»** y **«1 sesiones en secuencia»**. El flujo avanzó visualmente al paso 3; el indicador de pasos sí se actualiza.

Ubicación: `src/features/generator/views.js:13`, `src/features/generator/views.js:28` y `src/features/routines/views.js:30`.

Recomendación: expresar la frecuencia efectiva de una sesión individual y ajustar singular/plural. Mantener la preferencia de frecuencia para cuando se vuelva a programa; no modificar el algoritmo ni multiplicar sesiones para hacer coincidir una etiqueta.

**Propuesta corta comprobada, sin fallo funcional observado:** Pecho, Principiante, Hipertrofia y 120 minutos disponibles ofrecieron un único candidato compatible, Flexiones. La propuesta mostró **~9 min**, el presupuesto original de 120 min y una advertencia ámbar sobre disponibilidad/límite de ejercicios. Estaban disponibles la edición y Guardar en Mis rutinas. No se ocultó la diferencia ni se añadieron duplicados. El caso cumple el comportamiento documentado en FT-007; una mejora opcional es hacer más directa la sugerencia de ampliar grupos o nivel compatible.

Mapa/lista se sincronizaron y Espacio activó una zona con foco de teclado. La versión móvil puede usar Frente; conservar Ambas al venir desde escritorio responde al estado temporal de la vista, no a un fallo del breakpoint.

### 4.7 Rutinas prediseñadas

Sin hallazgo exclusivo P0/P1. Se observaron lista, niveles, detalle de sesiones y «Guardar en Mis rutinas», antes y después de crear una copia temporal. La copia ofrece un enlace inequívoco a Mis rutinas.

La cantidad de plantillas, los iconos propios y las sesiones en secuencia difieren de 08 por decisiones ya documentadas. No se requiere incorporar días obligatorios, favoritos o una frecuencia ficticia. Aplica A02: en móvil la lista completa precede al detalle, generando más desplazamiento que las pantallas separadas de referencia.

### 4.8 Rutina activa

**A03 — P1 — Pausar y Finalizar alejados del registro móvil.**

Evidencia: bajo 700 px, la vista de registro oculta el resumen que contiene Pausar sesión y Finalizar entrenamiento. En el primer ejercicio solo se ofrece «Ver rutina» para regresar; después hay que recorrer el resumen/lista hasta sus acciones. En el ejemplo de tres series, el panel de registro medía **~1078 px** y Siguiente ejercicio se situaba cerca de **y = 1031 px** respecto al viewport de entrada al registro. Los mockups 10/12 dan acceso más directo a controles de sesión; 11 permite cambiar de vista conservando el contexto.

Ubicación: `src/styles/workouts.css:33`, `src/styles/workouts.css:101`, `src/styles/workouts.css:102` y `src/features/workouts/views.js:48`.

Recomendación: disponer de acciones globales de sesión desde el registro móvil y mantener claro cómo volver al resumen. Si se usa una barra persistente, reservar espacio para la navegación inferior y el área segura. Aceptación propuesta: pausar o abrir la revisión final desde cualquier ejercicio sin volver a recorrer la lista.

**A04 — P2 — Estado incompleto de serie y progreso parcial poco diferenciados.**

Evidencia: las series pendientes ya muestran una marca ✓ dentro de un círculo; las completadas usan la misma marca con relleno lima. El contador global sí las diferencia, pero la silueta inicial puede parecer una casilla marcada. En la lista móvil se oculta el texto de estado por ejercicio, incluido el progreso parcial que se muestra en escritorio.

Ubicación: `src/features/workouts/views.js:53`, `src/styles/workouts.css:59` y `src/styles/workouts.css:111`.

Recomendación: reforzar la diferencia entre «por completar» y «completada» y conservar un indicador compacto de avance por ejercicio. No marcar series automáticamente ni utilizar solo el color para indicar el estado.

**A05 — P2 — Validación presentada como fallo de guardado y expresada en kg estando en lb.**

Evidencia: con «Peso (lb)», completar una serie sin peso produjo **«Introduce un peso entre 0 y 2000 kg…»**, junto a «Reintentar guardado», «Recargar entrenamiento» y «No se ha confirmado el guardado». El problema era una entrada vacía; no se había simulado una avería de almacenamiento. Se observó la misma clase de aviso en kg y se pudo continuar corrigiendo la entrada.

Ubicación: `src/features/workouts/model.js:5` y `src/features/workouts/controller.js:34`.

Recomendación: distinguir validación de almacenamiento/conflicto. Mostrar límites en la unidad visual y dirigir a corregir la serie; reservar recarga/reintento para los fallos correspondientes. La persistencia canónica en kg se conserva.

**Estados que sí respondieron correctamente:** completar una serie cambió el contador a 1/13; peso y repeticiones conservan controles de 48 px; pausa deshabilitó entradas y completar; reanudar permitió continuar; el descanso pausado mostró su propia acción de reanudación; Guardar completo permaneció deshabilitado con 1/13 series y una explicación; Guardar parcial estaba disponible. Se canceló la finalización. La disposición a 768 px es ajustada, pero no se reprodujo un bloqueo de sus controles.

### 4.9 Progreso y gráficos

**A07 — P2 — Escala vertical excesiva de gráficos amplios y espacio de tarjetas.**

Evidencia: en Volumen como vista independiente, a 1536 px, la tarjeta medía **1224 × ~796 px** y su SVG **1182 × ~640 px**, con seis barras semanales. Las etiquetas también crecieron notablemente. El mockup 13 presenta un gráfico compacto dentro del resumen. En Dashboard la pareja de tarjetas de carga/grupos ocupa un bloque alto y desplaza historial y objetivos por debajo de la primera pantalla. La relación fija del SVG y la expansión por ancho explican parte del efecto.

Ubicación: `src/components/history-charts.js:22`, `src/styles/dashboard.css:25`, `src/styles/dashboard.css:17` y `src/styles/progress.css:23`.

Recomendación: definir dimensiones de gráfico adecuadas al contexto y evitar que toda su tipografía escale con el ancho. Revisar también alineación/altura de tarjetas contiguas. Mantener fechas reales, tablas accesibles y espacio suficiente para leer ejes; no rellenar el historial para ocupar huecos.

La selección automática A06 es compartida con Inicio. Al elegir expresamente Crunch abdominal y 1RM estimado, apareció el estado explicado de falta de carga positiva; ese vacío es correcto. Se observaron curva con carga positiva, distribución, filtros y detalle desplegado de una sesión. La ausencia de mejoras porcentuales o rachas sin una fuente implementada es una diferencia legítima respecto del mockup.

### 4.10 Calculadora de 1RM

**A08 — P1 — Resultado fuera del área visible después de calcular en móvil.**

Evidencia: a **390 × 844**, con 100 lb y 6 repeticiones, el cálculo produjo **120 lb**. La sección de resultado comenzaba en **y ≈ 761 px**, el valor en **y ≈ 830 px** y la navegación inferior en **y = 775 px**. El scroll seguía en 0. El resultado existía y se podía ver desplazándose, pero el envío no lo llevaba a la vista. El mockup 14 muestra una transición explícita de formulario a resultado y referencias.

Ubicación: `src/features/tools/controller.js:45` y `src/styles/tools-profile.css:81`.

Recomendación: tras calcular, llevar el resultado al área visible en móvil con foco accesible o una transición clara. Conservar entradas y ofrecer acceso evidente a las cargas de referencia. Aceptación propuesta: tras el envío, la cifra puede leerse sin adivinar que hay que seguir desplazándose y no queda detrás de la barra inferior.

La composición de tres columnas de escritorio y dos de tablet es reconocible. Se observaron estimación y tabla; 80 kg × 6 dio 96 kg. No corresponde ajustar la cifra al ejemplo ilustrativo de 95 kg del mockup. Aplica A18 a la corrección de entradas inválidas.

### 4.11 Calculadora de calorías

**A09 — P2 — Formulario móvil más extenso que el flujo de referencia.**

Evidencia: a 390 px, todos los campos, actividad y objetivos están en un formulario continuo. El botón Calcular se situó cerca de la posición de documento **y = 1095 px**, el resultado en **y = 1237 px** y el documento completo midió ~2628 px en un cálculo observado. El mockup 15 divide datos, actividad/objetivo y resultado en vistas más breves. En escritorio sí se mantienen datos, resultado y macros en tres paneles.

Ubicación: `src/features/tools/controller.js:15` y `src/styles/tools-profile.css:81`.

Recomendación: compactar agrupaciones o plantear pasos móviles si la revisión de diseño lo aprueba, manteniendo etiquetas, privacidad y supuestos. No es imprescindible añadir un asistente nuevo: una jerarquía más compacta y navegación clara hacia el resultado puede bastar.

No se reproduce aquí un resultado siempre oculto: en otra interacción natural a 390 px, el valor calculado quedó en **y ≈ 651 px**, antes de la barra inferior. Por tanto, A08 está confirmado para 1RM; en calorías el hallazgo es la longitud del flujo. Se observaron resultado y macros legibles al desplazarse, estados seleccionados distinguibles y advertencias orientativas. La diferencia de cifras frente al mockup se explica por las fórmulas documentadas.

### 4.12 Perfil y preferencias

**A12 — P2 — Cambios sin guardar se pierden al navegar sin aviso.**

Evidencia: en el perfil personal temporal vacío, escribir un alias, ir a 1RM y volver a Perfil recuperó el alias vacío sin confirmación. El formulario tiene Guardar explícito, pero no un estado de cambios pendientes ni una advertencia al salir. El guard de navegación solo espera operaciones en curso.

Ubicación: `src/features/profile/controller.js:118`.

Recomendación: detectar modificaciones del formulario y ofrecer una salida clara —guardar, descartar o continuar editando— cuando corresponda. No confundir esto con guardado automático de datos corporales ni modificar la política de privacidad de las calculadoras.

Cabecera, alias, preferencias y botones reutilizan el lenguaje visual común. Se observaron estados inicial y guardado, unidades por ámbito y el formulario a tamaño tablet. La ausencia de peso corporal, grasa, rachas y una curva corporal del mockup 16 está documentada y no se considera defecto visual pendiente de rellenar.

### 4.13 Importación y exportación de respaldos

**A10 — P1 — Error de archivo inválido fuera de la zona de interacción.**

Evidencia: seleccionando un JSON con `{` desde el control de importación en móvil, el selector quedó en **y ≈ 394 px**, mientras «No se importó ningún dato… el archivo no contiene JSON legible» se colocó en **y ≈ −993 px**, al principio del perfil. El foco continuó en el input. La pantalla visible del selector no mostraba el error. El mensaje tiene `role="status"`, pero no resuelve la falta de respuesta visual local.

Ubicación: `src/features/profile/controller.js:27`, `src/features/profile/controller.js:30` y `src/features/profile/controller.js:84`.

Recomendación: mostrar el error junto al archivo y asociarlo al control; asegurar su visibilidad/foco según el tipo de error. Mantener el mensaje de que no se importaron datos. Aceptación propuesta: el rechazo resulta perceptible sin volver manualmente al comienzo del perfil.

**A11 — P2 — Encabezados de tabla partidos a 320 px.**

Evidencia: la vista previa válida mantuvo ancho interno y de scroll en **318 px**, sin desbordamiento horizontal, pero «Respaldo» se dividió como **«Respal / do»** por la columna estrecha. El diálogo tenía ~783 px visibles y ~907 px de contenido; su desplazamiento interno permite alcanzar las acciones. A 390 px las columnas son bastante más legibles.

Ubicación: `src/styles/tools-profile.css:77` y `src/styles/tools-profile.css:78`.

Recomendación: ajustar proporciones, relleno o encabezados breves sin partir palabras. Mantener inventario actual/copia, alcance personal y cancelación claros; no eliminar la vista previa para compactar.

Se observó la descarga de un respaldo personal sintético con un perfil y dos configuraciones, su selección y previsualización, y su cancelación. Exportar/importar se identifica explícitamente como personal incluso desde demo. El diálogo de restablecimiento personal es independiente del demo. No hay mockup exclusivo de respaldos: se comparó la integración con Perfil y los diálogos compartidos.

### 4.14 Navegación, componentes compartidos y mensajes

**A13 — P2 — Textos de etapas anteriores contradicen funciones disponibles.**

Evidencia renderizada: Cambiar modo afirma **«Los respaldos estarán disponibles en una próxima etapa»**, aunque Perfil ya permite exportarlos. Corroboración en código: la bienvenida todavía vincula los datos personales a futuras funciones de registro; la explicación de la búsqueda global deshabilitada dice que llegará con la biblioteca, que ya existe.

Ubicación: `src/features/modes.js:9`, `src/features/modes.js:25` y `src/components/shell.js:28`.

Recomendación: actualizar los textos al estado actual. La búsqueda global puede seguir deshabilitada si no tiene implementación; su explicación debe distinguirla de la búsqueda funcional del catálogo. No habilitar controles decorativos.

**A14 — P2 — Aviso de demostración restablecida persiste al cambiar de pantalla.**

Evidencia: tras confirmar el reset demo temporal, se observó «Demostración restablecida. Los datos personales se conservaron». Navegar a 1RM y esperar mantuvo el mismo bloque encima de la pantalla; no ofrece cierre. Cambiar de modo sí lo retiró. No se afirma que sobreviva a una recarga ni que sea un error de aislamiento de datos.

Ubicación: `src/app/mode-controller.js:49`, `src/app/main.js:117` y `src/styles/modes.css:33`.

Recomendación: definir ciclo de vida para las notificaciones de éxito: cierre accesible o retirada al cambiar de contexto, con tiempo suficiente para leer/anunciar el mensaje. Conservar la confirmación y la distinción del aviso permanente de estar en demo.

**A17 — P2 — Escala demasiado pequeña en varias leyendas y datos secundarios.**

Evidencia: pies de gráficos y leyendas están en 10 px; datos secundarios del historial móvil llegan a 10 px y los rótulos de navegación inferior a 9 px. En las capturas se distinguen bien los títulos, mientras notas, fechas y referencias requieren más esfuerzo. El contraste de los tokens no es el problema principal observado.

Ubicación: `src/styles/dashboard.css:43`, `src/styles/progress.css:110` y `src/styles/layout.css:87`.

Recomendación: acordar una escala mínima legible para información útil, ajustar interlineado y reducir texto redundante antes de reducir más la fuente. Verificar después en un teléfono real. No es una declaración de incumplimiento automático por utilizar una medida concreta.

**A18 — P2 — Validación sin foco ni asociación al campo incorrecto.**

Evidencia reproducida en 1RM: al introducir 11 repeticiones, apareció el aviso de rango, pero el foco permaneció en Calcular 1RM y el input no tenía `aria-invalid` ni asociación al mensaje. Existe `role="alert"`, por lo que no se considera un formulario sin anuncio ni sin etiquetas.

Ubicación: `src/features/tools/controller.js:49` y `src/features/tools/controller.js:56`.

Recomendación: identificar y enfocar el primer campo inválido cuando se envía el formulario, y asociar su explicación. Extender la pauta a los formularios que lo necesiten tras comprobar cada uno; no aplicar autofocus indiscriminado al abrir pantallas móviles.

**Elementos compartidos que cumplen:** sidebar y destino activo reconocibles, menú móvil completo, enlaces de navegación reales, controles con nombres, Escape en los diálogos observados, foco visible y retorno al botón de menú. Cinco pulsaciones Tab dentro del menú permanecieron en el diálogo y Escape devolvió el foco a Abrir navegación. La segunda fila móvil para el modo aumenta la altura respecto del mockup, pero mantiene visible un ámbito que la especificación necesita distinguir; no se propone eliminar esa información.

## 5. Resultado de los pendientes conocidos

| Pendiente | Resultado verificado | Tratamiento |
| --- | --- | --- |
| Aviso de demostración restablecida persistente | Confirmado al navegar por hash; cambiar de modo lo limpia | A14, P2; ciclo de vida del mensaje |
| Selección predeterminada sin carga positiva | Confirmado en Inicio/Este mes; Progreso/90 días eligió carga positiva | A06, P2; mejorar solo el criterio automático |
| Gráficos con espacios excesivos | Confirmado el gran alto/escala de Volumen y bloque alto de Dashboard | A07, P2; dimensiones según contexto |
| Botones/estados del entrenamiento activo | Serie, pausa y cierre condicionado respondieron; acciones globales lejos del registro móvil | A03, P1; A04/A05, P2 |
| Propuestas cortas del Generador | ~9 min frente a 120 disponibles, con aviso, edición y guardado accesibles | Comportamiento previsto; A16 solo corrige etiquetas |
| Consistencia kg/lb | Cargas, récords, volúmenes, metas y etiquetas observadas convierten; validación del entrenamiento sigue diciendo kg | A05, P2; no se encontró un error numérico de conversión en lo observado |
| Calculadoras móviles | 1RM deja el resultado fuera de vista; calorías es largo pero mostró resultado visible en una interacción natural | A08, P1; A09, P2 |
| Respaldos móviles | Vista previa usable a 390/320; error inválido lejos del control y cabecera de tabla partida a 320 | A10, P1; A11, P2 |

Ejemplos de unidades observados: 72,5 kg de carga máxima se mostraron como 159,8 lb; el volumen de una sesión de 5413,5 kg como 11.934,7 lb; 100 lb × 6 en 1RM produjo 120 lb. Las fórmulas explicativas pueden mencionar kg porque describen el cálculo canónico. Los gramos de macros tampoco deben convertirse a lb por la preferencia de carga de entrenamiento.

## 6. Revisión transversal de los ocho criterios

| Criterio | Resultado de la auditoría |
| --- | --- |
| Fidelidad | Identidad conservada y paneles reconocibles. La mayor diferencia útil de corregir está en acceso a acciones, longitud móvil y dimensiones de gráficos. Las omisiones de datos ficticios/medios no autorizados son deliberadas. |
| Jerarquía/distribución | Los encabezados y cifras dominan correctamente. Iniciar, Pausar/Finalizar y la respuesta a calcular/importar necesitan mejor ubicación. |
| Tipografía/color/contraste/espaciado | Paleta y familias compartidas. Contrastes representativos calculados desde tokens: principal sobre tarjeta ~15,39:1; secundario ~9,80:1; texto oscuro sobre lima ~12,52:1. No es una medición de todos los píxeles de gradientes, estados o gráficos. A17 aborda tamaño, A02/A07 densidad y espacio. |
| Tarjetas/botones/formularios | Controles principales y registro de series amplios. Las tarjetas móviles acumulan mucha altura en rutinas y calculadoras. No se necesita reducir controles para ganar densidad. |
| Responsive | Se observaron escritorio, móvil y composiciones intermedias. Medición adicional a 320 px en Inicio, Mis rutinas, Generador, Progreso, Calorías y Perfil dio `scrollWidth = 320`. El diálogo de respaldo mantuvo ancho interno de 318 px. Esto no certifica todas las combinaciones de contenido, zoom y estados. |
| Navegación/accesibilidad | Menú, rutas hash, nombres y foco tienen una base útil. La orientación hacia resultados/errores y la asociación de validaciones requieren ajustes. No se evaluaron lectores de pantalla ni teclado virtual. |
| Vacíos/errores/confirmaciones | Vacío personal y búsqueda sin resultados ofrecen salida. Las confirmaciones expresan el alcance destructivo. El error de archivo queda lejos y el de serie se presenta como error de guardado. |
| Consistencia | Colores, formas y componentes son compartidos. Quedan textos obsoletos, singular/plural, validación en unidades canónicas y notificaciones sin cierre de ciclo. |

## 7. Agrupación propuesta del trabajo

Cada lote debe revisarse antes de comenzar el siguiente. Son propuestas de alcance, no implementaciones ni autorización para FT-009B.

### FT-009B — Acceso a acciones y respuesta visible

1. **Flujo de entrenamiento:** A01 y A03. Reubicar el inicio en la cabecera de rutina y mantener acciones de sesión accesibles desde el registro móvil. Reutilizar servicios y confirmaciones existentes.
2. **Respuesta a operaciones:** A08 y A10. Llevar el resultado de 1RM a la vista y mostrar el error de importación junto al archivo. Integrar A18 si comparte el ajuste de foco y asociación de errores.

Validación proporcional propuesta: una rutina real de cinco ejercicios en el contexto de prueba; entrar en registro, pausar y abrir revisión final; cálculo válido/inválido de 1RM; importación inválida y cancelación de una vista previa válida. Comprobar 320/390 px, un ancho de escritorio y teclado; conservar aislamiento y entradas. No exige repetir todas las suites ni cambiar el esquema.

### FT-009C — Dashboard y Progreso

A06 y A07: selección automática aplicable, altura de gráficos, escala de ejes y alineación de tarjetas. Verificar conjuntos con carga positiva, solo peso corporal, un punto y vacío. Conservar tablas, filtros, métricas y snapshots. La selección explícita de 0 kg sigue siendo válida.

### FT-009D — Mensajería, formularios y consistencia

A05, A12, A13, A14 y A18 si no se resolvió antes: mensajes de dominio/unidad frente a almacenamiento, cambios sin guardar, textos de etapas, ciclo de notificaciones y validación accesible. Incorporar A16 para frecuencia efectiva y singular/plural. Revisar cada formulario sin una refactorización transversal innecesaria.

### FT-009E o lote visual posterior — Densidad y acabado

A02, A04, A09, A11, A15 y A17: filas móviles más compactas, estados de serie más inequívocos, organización del formulario de calorías, tabla de respaldo estrecha, cabecera de catálogo y escala tipográfica. Usar las variantes aprobadas y contrastar cada cambio con su pantalla vecina para evitar otro sistema visual.

Antes de considerar terminado el pulido: comprobación manual en dispositivos reales, teclado virtual, orientación, lector de pantalla y zoom. La revisión de despliegue GitHub Pages es un trabajo separado; esta auditoría no autoriza publicar.

## 8. Elementos que ya cumplen y deben conservarse

- Identidad carbón/azul y lima, redondeados, separación de áreas y navegación compartida. No se necesita un rediseño de marca.
- Biblioteca de 24 ejercicios con ilustraciones locales, técnica textual y ausencia de reproductores rotos. La diferencia con fotos del mockup tiene una razón válida.
- Filtros y vacío del catálogo recuperable; controles con etiquetas y selección identificable.
- Diálogos nativos, cierre accesible, Escape y foco visible en los estados observados. Los botones de ordenación evitan depender de arrastrar.
- Sesiones como secuencia flexible; no trasladar los «días» ilustrativos del mockup al modelo como calendario obligatorio.
- Series planificadas separadas de registros reales; completar explícito, navegación manual y pausa que deshabilita las entradas. Conservar los 48 px de los controles de serie.
- Gráficos conectados al historial, identificados como carga real/1RM estimado y acompañados de datos textuales. Los vacíos de 1RM sin carga positiva son correctos.
- Propuestas cortas explicadas, editables y sin ejercicios duplicados para rellenar minutos. La generación local y su separación respecto del Dashboard están alineadas con la especificación.
- Resultados de calculadoras rotulados como estimaciones, guía disponible y datos corporales temporales. No añadir historia o comparaciones que no se registraron.
- Perfil local sin identidad real impuesta y unidades por ámbito. El respaldo explica que afecta al espacio personal, presenta inventario y requiere una confirmación distinta del reset demo.
- Recursos y navegación observados funcionando desde `/FitTracker/`, sin exigir rutas del servidor.

No se implementó ninguna recomendación de este documento. La siguiente etapa permanece pendiente de revisión.
