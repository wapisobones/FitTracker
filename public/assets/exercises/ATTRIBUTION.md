# FitTracker — recursos visuales locales de Core

Fuente de los once pares JPG: **free-exercise-db**, https://github.com/yuhonas/free-exercise-db.
Licencia de esos JPG declarada en el archivo suministrado `recursos-originales/LICENCIA.txt`: **dominio público (Unlicense)**.
Licencia de la fuente: https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.
Correspondencias: `recursos-originales/ejercicios.json` (nombre real, en plural).

Preparación: `pnpm prepare:exercise-assets`, sin red ni dependencias nuevas.
Doce pares Core: once de free-exercise-db y uno PNG proporcionado para FitTracker. La licencia Unlicense anterior solo se atribuye a free-exercise-db; no se presupone para los PNG.
Originales intactos y excluidos del build.
Salida: 640 × 427, calidad WebP 0.78, encuadre completo; bandas carbón cuando la proporción original difiere.
Miniatura: fotografía 0, excepto Plancha (fotografía 1, postura sostenida). Animación: dos fotogramas de 900 ms en bucle 0 → 1 → 0; sin audio ni interpolación.
Plancha incluye preparación y postura sostenida. Los doce ejercicios conservan SVG como fallback de carga.
Las referencias externas anteriores de Plancha y Elevación de rodillas se retiraron del build al sustituirlas por estos recursos.

## Plancha — c1700000-0000-4000-8000-000000000021

Originales: `core_01_plancha_0.jpg` y `core_01_plancha_1.jpg` (850 × 567; 86431 bytes entre ambos).
Referencia: **Plank**, coincidencia **exacta**.


- `core/plancha.webp`: 27868 bytes; SHA-256 `24d4d6cf821055d01d3a816d5006627056055848b764a8f569d18b9dc5f7c3e3`.
- `core/plancha-poster.webp`: 14516 bytes; SHA-256 `bf60f39dc340ca342fa5ce8aa601c9b5213e2c65b3bea3d28d3864861461cf62`.

## Dead bug — c1700000-0000-4000-8000-000000000022

Originales: `core_02_dead_bug_0.jpg` y `core_02_dead_bug_1.jpg` (1280 × 720; 92140 bytes entre ambos).
Referencia: **Dead Bug**, coincidencia **exacta**.


- `core/dead-bug.webp`: 13422 bytes; SHA-256 `8785a23dcfaa155949ecf436609a961ee032f0d3b399323002417b5c9d73292f`.
- `core/dead-bug-poster.webp`: 6886 bytes; SHA-256 `780be036f2f685903e9aff78b47bda47a3b81c39b1650d579c08219bf9ca3354`.

## Crunch abdominal — c1700000-0000-4000-8000-000000000023

Originales: `core_03_crunch_abdominal_0.jpg` y `core_03_crunch_abdominal_1.jpg` (850 × 567; 138514 bytes entre ambos).
Referencia: **Crunches**, coincidencia **exacta**.


- `core/crunch-abdominal.webp`: 53070 bytes; SHA-256 `a2b1e764fb61f7a23fc51d9aed98e412dc9c4de13859eccd8681ee11872de648`.
- `core/crunch-abdominal-poster.webp`: 27322 bytes; SHA-256 `c76723000f30d308b65eec933995591db8121d86c2aec72649bc6b39c051b859`.

## Elevación de rodillas colgado — c1700000-0000-4000-8000-000000000024

Originales: `core_04_elevacion_de_rodillas_colgado_0.jpg` y `core_04_elevacion_de_rodillas_colgado_1.jpg` (850 × 567; 107748 bytes entre ambos).
Referencia: **Hanging Leg Raise**, coincidencia **aproximada**.
Referencia local «Hanging Leg Raise», con correspondencia aproximada. Sigue las instrucciones del catálogo para la variante con rodillas flexionadas.

- `core/elevacion-de-rodillas-colgado.webp`: 37312 bytes; SHA-256 `792f63145d17fcdfd2de30fc432859933f6bf402768208c93dd91858e0062e96`.
- `core/elevacion-de-rodillas-colgado-poster.webp`: 18092 bytes; SHA-256 `d49f083cb6c7de443163dddf6885ea8557258516bffd531989a3e5d7e7930799`.

## Crunch en polea de rodillas — c1700000-0000-4000-8000-000000000065

Originales: `core_05_crunch_en_polea_de_rodillas_0.jpg` y `core_05_crunch_en_polea_de_rodillas_1.jpg` (850 × 567; 132716 bytes entre ambos).
Referencia: **Cable Crunch**, coincidencia **exacta**.


- `core/crunch-en-polea-de-rodillas.webp`: 45750 bytes; SHA-256 `9ea70dc5840f453b243771d9d329b38b70aa59dc202a77c9be4f0b6c07414311`.
- `core/crunch-en-polea-de-rodillas-poster.webp`: 23904 bytes; SHA-256 `6829e38ed80254ef9a38f95572cedb1848a8c386f849afcfddfe575e5a4b62de`.

## Crunch inverso — c1700000-0000-4000-8000-000000000066

Originales: `core_06_crunch_inverso_0.jpg` y `core_06_crunch_inverso_1.jpg` (850 × 567; 118403 bytes entre ambos).
Referencia: **Reverse Crunch**, coincidencia **exacta**.


- `core/crunch-inverso.webp`: 42036 bytes; SHA-256 `4986985e79f78681a03adad4b0db2bd9459afac3ea94422e919aecfbb2ff5d9d`.
- `core/crunch-inverso-poster.webp`: 23532 bytes; SHA-256 `531bd46a4aef7242f5b981fc357a79a3dac527307b1a010c4832dd6b57986aed`.

## Crunch abdominal en máquina — c1700000-0000-4000-8000-000000000067

Originales: `core_07_crunch_abdominal_en_maquina_0.jpg` y `core_07_crunch_abdominal_en_maquina_1.jpg` (850 × 567; 167609 bytes entre ambos).
Referencia: **Ab Crunch Machine**, coincidencia **exacta**.


- `core/crunch-abdominal-en-maquina.webp`: 60738 bytes; SHA-256 `c931c07519dfba1a2b430452557d7a85334d3c452accfbd58f1259c7b6b57ca4`.
- `core/crunch-abdominal-en-maquina-poster.webp`: 31250 bytes; SHA-256 `cfc1efa4748837841f84d5ebb457213b3dd83af6a1d8a9f512319e861c06dec1`.

## Press Pallof en polea — c1700000-0000-4000-8000-000000000069

Originales: `core_09_press_pallof_en_polea_0.jpg` y `core_09_press_pallof_en_polea_1.jpg` (850 × 567; 121823 bytes entre ambos).
Referencia: **Pallof Press**, coincidencia **exacta**.


- `core/press-pallof-en-polea.webp`: 40300 bytes; SHA-256 `d95aa3fe108987989ff8c5c4a15556427ac2a7d0386ecb6a9f36be1ae70d5459`.
- `core/press-pallof-en-polea-poster.webp`: 20640 bytes; SHA-256 `67c8f5ad0dc642579670ca67c8ddcb7374581111daa377859b6676ccb179029d`.

## Leñador en polea alta — c1700000-0000-4000-8000-000000000070

Originales: `core_10_lenador_en_polea_alta_0.jpg` y `core_10_lenador_en_polea_alta_1.jpg` (850 × 1275; 220420 bytes entre ambos).
Referencia: **Standing Cable Wood Chop**, coincidencia **exacta**.


- `core/lenador-en-polea-alta.webp`: 24894 bytes; SHA-256 `29ca9796a6f6cd5a78e2f440d725fa98977fa4f6b79761ecbfbaccb7cd474806`.
- `core/lenador-en-polea-alta-poster.webp`: 12824 bytes; SHA-256 `e0d178b4b8b2419e0d84c6bcb5386fedd402391a332120ca3e9f0eae2279d6ea`.

## Flexión lateral con mancuerna — c1700000-0000-4000-8000-000000000071

Originales: `core_11_flexion_lateral_con_mancuerna_0.jpg` y `core_11_flexion_lateral_con_mancuerna_1.jpg` (850 × 567; 108112 bytes entre ambos).
Referencia: **Dumbbell Side Bend**, coincidencia **exacta**.


- `core/flexion-lateral-con-mancuerna.webp`: 35690 bytes; SHA-256 `d663a4b23cbcd726226eaf02d4d59ad85ec9a5381eeee651439fcacdcf9209a6`.
- `core/flexion-lateral-con-mancuerna-poster.webp`: 18192 bytes; SHA-256 `ab30a4fc4f0940745ee0157c25bc6cb613c14210f1248f7188680a9dd66fa268`.

## Crunch cruzado — c1700000-0000-4000-8000-000000000072

Originales: `core_12_crunch_cruzado_0.jpg` y `core_12_crunch_cruzado_1.jpg` (850 × 567; 123703 bytes entre ambos).
Referencia: **Cross-Body Crunch**, coincidencia **exacta**.


- `core/crunch-cruzado.webp`: 45394 bytes; SHA-256 `f82cadb8ca7ed5fef4653eeaaa4d28d8d4a77da9d046b79b20c268cbefcc01ae`.
- `core/crunch-cruzado-poster.webp`: 22566 bytes; SHA-256 `ed05fcbc5406bf8d810944bbff0c914a1cfd8a0a914a7250937eacb2d4ee1705`.

## Plancha alta con toques de hombro — c1700000-0000-4000-8000-000000000068

Originales: `core_08_plancha_toque_hombro_0.png` y `core_08_plancha_toque_hombro_1.png` (520 × 676; 806737 bytes entre ambos).
Referencia: **Recurso local**, coincidencia **local**.


Procedencia: imágenes proporcionadas por el usuario para incorporarlas a FitTracker. No se atribuyen a free-exercise-db ni se les asigna Unlicense. El JSON original conserva su antiguo estado sin resultado; el mapeo explícito actual está en `src/data/core-visual-assets.js`.

- `core/plancha-toque-hombro.webp`: 21182 bytes; SHA-256 `7b23638a8b4c5516aa57a6e9f33ef4121e29903d0206da038c0e9d45fd0be546`.
- `core/plancha-toque-hombro-poster.webp`: 10456 bytes; SHA-256 `f4f89b2db6a080a71ece630ed392077be7f9f902922e84d293886609a280fa38`.

