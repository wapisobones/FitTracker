# AGENTS.md — FitTracker

## Propósito
Desarrollar FitTracker como aplicación web estática de entrenamientos. Leer **`FITTRACKER-SPEC.md`** antes de implementar funcionalidades y revisar las referencias visuales en **`docs/mockups/`** antes de tocar interfaces.

## Reglas obligatorias

1. **Respetar decisiones existentes.** No incorporar backend, cuentas, API de pago, sincronización en nube ni frameworks sin una razón explícita y acuerdo del usuario.
2. **Tecnología preferida:** HTML, CSS y JavaScript modular (ES modules); `pnpm` exclusivamente para paquetes/herramientas si se requieren. No usar `npm` ni `yarn`.
3. **Persistencia:** IndexedDB para sesiones, perfiles, rutinas e historial; separación estricta de datos demo y personales.
4. **Visual:** fondo oscuro carbón/azul y verde lima, tarjetas redondeadas; usar mockups reales del repositorio, incluyendo variantes móviles cuando existan. No improvisar otra identidad visual.
5. **Móvil primero en entrenamiento activo:** pesos, repeticiones, completar series, timer y siguiente ejercicio deben ser cómodos al tacto.
6. **No fingir funcionalidades:** gráficos conectados a datos persistidos y acciones completas; cuando algo aún no exista, mostrar estado deshabilitado y explicarlo.
7. **Sin contenido con licencias dudosas:** no copiar vídeos, imágenes, ilustraciones o diseños de sitios terceros sin autorización.
8. **No contaminar datos:** la demostración no debe modificar los datos personales; ninguna semilla debe sobreescribir datos existentes del usuario.
9. **No inventar historia:** métrica personal deriva de series completadas. Mantener snapshots de sesiones históricas.
10. **Seguridad y privacidad:** validar entradas e importación JSON, confirmar acciones destructivas, no subir respaldos personales al repositorio.
11. **GitHub Pages:** evitar asumir despliegue en `/`; soportar subruta `/FitTracker/` o configuración equivalente.
12. **Cambios acotados:** implementar una tarea a la vez, sin refactorizaciones no relacionadas.
13. **Verificación proporcional:** ejecutar pruebas esenciales del cambio, evitar pruebas redundantes y solicitar autorización solo para operaciones destructivas o sobre datos reales.
14. **Documentar decisiones nuevas** que afecten modelo, persistencia o comportamiento cuando surjan durante implementación.

## Organización propuesta (adaptable)

```text
FitTracker/
├── README.md
├── AGENTS.md
├── FITTRACKER-SPEC.md
├── docs/
│   └── mockups/
├── index.html
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── data/
│   ├── db/
│   ├── styles/
│   └── utils/
├── public/
└── tests/
```

## Flujo de trabajo para Codex

- Inspeccionar proyecto existente, especificación y mockups relevantes.
- Explicar brevemente qué se modificará y qué queda fuera.
- Implementar el módulo completo con estados de error/vacío y responsive.
- Ejecutar solo validaciones relevantes (por ejemplo, lint o test focalizado y build cuando aplique).
- Informar archivos cambiados, funcionalidad lograda, validaciones y aspectos pendientes.
- No tocar datos reales ni archivos externos al proyecto sin autorización explícita.

## Prioridad
**Flujo real completo** (crear/usar rutina → completar series → guardar → ver progreso) > ornamentación > extras no solicitados.
