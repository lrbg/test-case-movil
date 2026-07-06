# test-case-movil

Casos E2E de compra de boletos para las apps móviles de autobús (ETN, Gontijo,
Cruz del Sur, Autovías), automatizados con [Maestro](https://maestro.mobile.dev/).

## Estructura

```
<brand>/flows/BL-*.yaml       Casos por marca (29 c/u).
shared/<brand>/*.yaml         Subflows reutilizables (search, seats, pay, ...).
shared/launch-app.yaml        Launch fresco de la app antes de cada caso.
index.html                    Dashboard (generado) — portada de GitHub Pages.
reports/index.json            Manifest de reportes (fuente del dashboard).
reports/<id>/index.html       Reporte de detalle con resumen + evidencias.
scripts/build-index.mjs       Regenera index.html desde el manifest.
.github/workflows/            CI: corre un caso en emulador y sube evidencias.
```

## Reporte en GitHub Pages

Publicado en **https://lrbg.github.io/test-case-movil/** (Pages sirve desde la
rama `master`, carpeta raíz). La portada `index.html` es un dashboard con:

- Resumen global: reportes, aprobados, fallidos, bugs y evidencias totales.
- Una tarjeta por corrida con estado (Aprobado / Fallido / Con hallazgos / Sin
  datos), plataforma (Android / Web), tipo (E2E / Exploratoria), fecha y número
  de evidencias.
- Enlace al **reporte de detalle**, con resumen paso a paso y galería de
  screenshots.

### Agregar un reporte al dashboard

1. Deja el reporte de detalle en `reports/<id>/index.html` junto con sus
   capturas `.png` (las evidencias se cuentan solas desde esa carpeta).
2. Añade una entrada a `reports/index.json`:

   ```json
   {
     "id": "060726-101500",
     "path": "reports/060726-101500/",
     "brand": "ETN",
     "platform": "Android",
     "type": "e2e",
     "case": "BL-02",
     "title": "ida · 1 pax · tarjeta · con seguro",
     "date": "2026-07-06T10:15:00",
     "status": "pass",
     "bugs": 0,
     "summary": "Compra completa, capturas paso a paso."
   }
   ```

   `status`: `pass` | `fail` | `bugs` | `unknown`. `type`: `e2e` | `exploracion`.

3. Regenera y previsualiza:

   ```bash
   node scripts/build-index.mjs
   python3 -m http.server 4599   # abrir http://localhost:4599/
   ```

4. Commit + push a `master`: GitHub Pages republica automáticamente.

Requiere Node 18+ y no tiene dependencias externas.

## CI (emulador)

El workflow `E2E ETN - BL-01` (Actions → Run workflow) instala el APK sandbox
del release, corre BL-01 de ETN en un emulador y sube el `--debug-output` de
Maestro (screenshots + logs) como artifact. Ese material se puede convertir en
un reporte de detalle y sumarlo al dashboard con los pasos de arriba.
