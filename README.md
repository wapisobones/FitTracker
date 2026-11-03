# FitTracker

Aplicación web para planificar rutinas, registrar entrenamientos de fuerza y visualizar el progreso físico desde el computador o el celular.

## Estado actual: FT-007

Base responsive con bienvenida, IndexedDB y ámbitos **demostración/personal separados**. Incluye catálogo de 24 ejercicios, personalizados, rutinas y plantillas, generador muscular local, ejecución y recuperación de entrenamientos, Dashboard y Progreso calculados desde las series realizadas. Los datos personales no incluyen estadísticas ficticias.

Usa «Cambiar modo» para elegir un espacio o restablecer la demostración con confirmación. Los ejercicios base y las plantillas están disponibles en ambos modos; los personalizados, rutinas y entrenamientos pertenecen al ámbito activo. Las sesiones siguen una secuencia flexible, sin días obligatorios. Completar toda una sesión avanza el ciclo; guardar parcial o descartar conserva su posición. Las calculadoras, edición de perfil y respaldos JSON siguen pendientes.

Los recursos visuales son SVG originales y las técnicas son textuales. «Añadir a rutina» permite elegir un destino existente o crear una rutina y sesión. Las plantillas son Full body básico (principiante), Torso / Pierna (intermedio) y Push · Pull · Legs (avanzado), guardadas como copias independientes.

Para entrenar, abre una rutina con ejercicios y pulsa «Iniciar sesión». Revisa la sesión sugerida o elige otra y comienza. Registra peso y repeticiones reales y confirma cada serie; las referencias anteriores son editables y nunca se marcan solas. El descanso no impide seguir registrando ni cambia de ejercicio automáticamente. Puedes pausar y volver desde «Continuar sesión», incluso tras recargar. Al finalizar, guarda completo o parcial; descartar requiere confirmación. El historial conserva los objetivos originales y solo las series realizadas.

Dashboard y Progreso muestran sesiones, volumen, ejercicio más trabajado, máximas cargas, 1RM estimado, evolución y distribución de series por músculo principal. Progreso permite filtrar por período/ejercicio y desplegar cada sesión. Los parciales aportan solo lo realizado; borradores y descartes no aportan cifras. El 1RM estimado usa Epley con carga positiva y 2–10 repeticiones; con una repetición se utiliza la carga registrada. Los gráficos tienen tablas accesibles y no requieren librerías externas.

La demostración incorpora 18 sesiones ficticias estructuradas cuando no existe historial previo y conserva los datos modificados. Sus fechas permanecen fijas después de inicializarla; se puede restablecer con confirmación. El ámbito personal comienza vacío.

En Generador, selecciona músculos en el mapa frontal/posterior o en la lista y configura modalidad, nivel, objetivo, equipo, duración y prioridades. Puedes crear una sesión o un programa de 1–6 sesiones. El resultado se edita con el editor de rutinas antes de «Guardar en Mis rutinas». La generación respeta los filtros y explica cuando no hay una combinación viable. Los personalizados participan si tienen dificultad asignada; los anteriores permanecen como «Sin especificar». Las propuestas sin guardar se conservan temporalmente al navegar, separadas por ámbito; para recuperarlas tras recargar hay que guardarlas como rutinas. FT-008 espera la revisión de esta entrega.

## Alcance del MVP

- Biblioteca de ejercicios y ejercicios personalizados.
- Creación y edición de rutinas, plantillas prediseñadas y generador local de sesiones o planes completos.
- Entrenamientos activos con registro de series, pesos, repeticiones, descanso y recuperación de sesiones pausadas.
- Dashboard y estadísticas de progreso basados en series completadas.
- Calculadoras de 1RM y calorías orientativas.
- Perfil local, exportación e importación JSON.
- Modo de demostración con datos ficticios, separado del modo personal.

## Tecnología

- HTML, CSS y JavaScript moderno (ES modules).
- Vite para servir y compilar, y Playwright para verificaciones de navegador; sin framework ni dependencias de ejecución.
- `pnpm` para gestionar herramientas y lockfile.
- IndexedDB con esquema versionado y bases separadas para demo, personal y configuración.
- Publicación estática mediante GitHub Pages.

No requiere cuentas de usuario, backend ni servicios externos.

## Documentación

- [`FITTRACKER-SPEC.md`](./FITTRACKER-SPEC.md): funcionalidades, reglas y criterios de aceptación.
- [`AGENTS.md`](./AGENTS.md): instrucciones de desarrollo para Codex.
- [`docs/mockups/`](./docs/mockups/): imágenes aprobadas de referencia visual (escritorio y móvil cuando existan).
- [`docs/FT-001.md`](./docs/FT-001.md): decisiones, alcance y siguientes pasos de esta entrega.
- [`docs/FT-002.md`](./docs/FT-002.md): esquema de almacenamiento, aislamiento, errores y pendientes actuales.
- [`docs/FT-003.md`](./docs/FT-003.md): catálogo, personalizados, recursos visuales y próximos pasos.
- [`docs/FT-004.md`](./docs/FT-004.md): modelo de rutinas, copias, integración y preparación del ciclo.
- [`docs/FT-005.md`](./docs/FT-005.md): entrenamiento activo, snapshots, recuperación, registros y avance del ciclo.
- [`docs/FT-006.md`](./docs/FT-006.md): métricas compartidas, fórmulas, fechas locales, gráficos, historial y semilla demo.
- [`docs/FT-007.md`](./docs/FT-007.md): mapa muscular, algoritmo local, duración, propuestas y guardado de rutinas generadas.

## Instalación y uso

Requisitos: Node.js 22.12 o posterior y pnpm. En Windows, usar `pnpm.cmd` si PowerShell bloquea el script `pnpm.ps1`.

```sh
pnpm install
pnpm dev
```

Abrir la dirección que imprime Vite (normalmente `http://127.0.0.1:5173`). Los módulos ES necesitan un servidor HTTP; no abrir `index.html` con `file://`.

```sh
pnpm build
pnpm preview
```

La compilación estática queda en `dist/`.

## Comprobaciones esenciales

```sh
pnpm build
pnpm test:metrics
pnpm test:generator
pnpm test:smoke
```

Las pruebas de cálculo y generación usan el runner nativo de Node.js. Las de navegador usan Microsoft Edge instalado y arrancan la compilación bajo `http://127.0.0.1:4173/FitTracker/`. Comprueban métricas, generación, edición, aislamiento, entrenamiento y persistencia. Usan contextos aislados: no modifican datos reales. Guardan capturas locales en `.cache/`, excluida de Git. Para FT-007: `pnpm test:generator` y `pnpm test:smoke generator.spec.js`; para FT-006: `pnpm test:metrics` y `pnpm test:smoke progress.spec.js`.

Si el puerto está ocupado, configurar `FITTRACKER_TEST_PORT`. Por ejemplo, en PowerShell: `$env:FITTRACKER_TEST_PORT='4181'` antes de ejecutar `pnpm.cmd test:smoke`.

Para usar otro navegador instalado, configurar `PLAYWRIGHT_BROWSER_CHANNEL` (por ejemplo, `chrome`). Para Chromium de Playwright, ejecutar `pnpm exec playwright install chromium` y usar el valor `chromium`.

## GitHub Pages

El workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) compila con Node.js 24 y la versión de pnpm indicada en `package.json` (11.1.2). Instala con `pnpm install --frozen-lockfile`, ejecuta `pnpm build` y publica **exclusivamente el contenido de `dist/`** mediante las acciones oficiales de GitHub Pages. Se ejecuta con push a `main` o manualmente desde Actions seleccionando `main`.

En [Settings → Pages](https://github.com/wapisobones/FitTracker/settings/pages), seleccionar **Build and deployment → Source → GitHub Actions**, en lugar de publicar directamente una rama. El repositorio debe permitir las acciones `actions/*` y `pnpm/action-setup`; el environment `github-pages`, si tiene reglas de despliegue, debe permitir `main`. No se necesita un token personal: el workflow declara los permisos de Pages y OIDC en el job de despliegue.

La URL es https://wapisobones.github.io/FitTracker/. Vite conserva `base: './'`: el HTML compilado referencia `./assets/*.js`, `./assets/*.css` y `./favicon.svg`, resueltos bajo `/FitTracker/`. Las secciones siguen usando hash (`#/mis-rutinas`), sin redirecciones del servidor. El `index.html` fuente que referencia `./src/app/main.js` es la entrada de Vite y **no debe publicarse directamente**; el workflow publica el HTML compilado. No es necesario subir `dist/` al repositorio.

Para comprobar esa subruta manualmente después del build:

```sh
pnpm preview --base=/FitTracker/ --port 4173
```

## Estructura

```text
index.html             Documento de entrada
src/app/               Inicio de la aplicación y rutas
src/components/        Navegación, iconos y gráficos SVG
src/data/              Biblioteca base y ejemplo de demostración
src/db/                Esquema, transacciones y repositorios por ámbito
src/features/          Dashboard, Progreso, generador, modos, catálogo, rutinas y entrenamientos
src/styles/            Tokens y estilos responsive de cada sección
public/                Recursos locales
tests/                 Comprobaciones de navegador
docs/mockups/          Referencias visuales aprobadas
```

## Criterios de diseño

Interfaz dark charcoal/navy con verde lima, tarjetas modernas y controles móviles accesibles, siguiendo las imágenes de `docs/mockups/`.

## Nota de privacidad

Los datos se guardan exclusivamente en IndexedDB del navegador, separados físicamente por ámbito. La demostración se inicializa solo al elegir ese modo y nunca siembra ni reemplaza datos personales. Restablecer la demo conserva el espacio personal.

No hay sincronización entre dispositivos. Borrar los datos del sitio en el navegador puede eliminar esta información; los respaldos aún no están implementados. No añadir respaldos personales al repositorio.
