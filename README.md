# FitTracker

Aplicación web para planificar rutinas, registrar entrenamientos de fuerza y visualizar el progreso físico desde el computador o el celular.

## Estado

**Proyecto en preparación / MVP por implementar.** Los documentos funcionales y visuales están definidos; no se debe presentar como aplicación ya operativa.

## Alcance del MVP

- Biblioteca de ejercicios y ejercicios personalizados.
- Creación y edición de rutinas, plantillas prediseñadas y generador local de sesiones o planes completos.
- Entrenamientos activos con registro de series, pesos, repeticiones, descanso y recuperación de sesiones pausadas.
- Dashboard y estadísticas de progreso basados en series completadas.
- Calculadoras de 1RM y calorías orientativas.
- Perfil local, exportación e importación JSON.
- Modo de demostración con datos ficticios, separado del modo personal.

## Tecnología prevista

- HTML, CSS y JavaScript moderno (ES modules).
- IndexedDB para almacenamiento en navegador.
- `pnpm` para herramientas de desarrollo cuando corresponda.
- Publicación estática mediante GitHub Pages.

No requiere cuentas de usuario ni backend. Los datos personales permanecen en el navegador y **no se sincronizan** entre dispositivos. Se recomienda exportar respaldos periódicos.

## Documentación

- [`FITTRACKER-SPEC.md`](./FITTRACKER-SPEC.md): funcionalidades, reglas y criterios de aceptación.
- [`AGENTS.md`](./AGENTS.md): instrucciones de desarrollo para Codex.
- [`docs/mockups/`](./docs/mockups/): imágenes aprobadas de referencia visual (escritorio y móvil cuando existan).

## Instalación y uso

Se documentarán los comandos reales una vez creada la estructura ejecutable. No asumir aún un servidor ni un proceso de build específico.

## Criterios de diseño

Interfaz dark charcoal/navy con verde lima, tarjetas modernas y controles móviles accesibles, siguiendo las imágenes de `docs/mockups/`.

## Nota de privacidad

No añadir a Git archivos JSON exportados con datos reales ni registros personales de entrenamiento. Los datos de demostración son ficticios y están aislados de los datos personales.
