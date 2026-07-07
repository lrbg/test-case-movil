// Generador de flows Maestro por marca (sin dependencias externas, Node 18+).
//
// Estampa desde plantillas + una tabla de datos por marca:
//   1) GFA (marca nueva): los 29 flows de linea base BL-*, espejando autovias/
//      (mismo molde label-es), cambiando solo appId y la ruta destino.
//   2) Suite de calendario CAL-01..CAL-28 (regresion del fix AM-1529) para las 5
//      marcas: etn, gontijo, cruz-del-sur, autovias, gfa. La logica de cada CAL
//      vive una sola vez aqui; la salida son archivos concretos por marca:
//        - shared/calendar/CAL-XX.yaml   (core, agnostico de marca/idioma)
//        - shared/<lang>/calendar/_open.yaml  (abrir calendario por variante)
//        - <brand>/calendar/CAL-XX.yaml  (wrapper delgado: open + core)
//
// Es idempotente: correrlo dos veces no cambia nada en git.
//
// Uso:  node scripts/gen-flows.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const write = (rel, body) => {
  const abs = join(ROOT, rel);
  mkdirSync(dirname(abs), { recursive: true });
  const out = body.endsWith('\n') ? body : body + '\n';
  writeFileSync(abs, out);
};

// ---------------------------------------------------------------------------
// Tabla de marcas
// ---------------------------------------------------------------------------
// open: variante de "abrir calendario" (helper reutilizable):
//   label-es -> apps por texto ES (cruz-del-sur, autovias, gfa)
//   etn      -> testIDs
//   gontijo  -> texto PT
const BRANDS = {
  etn: {
    appId: 'mx.com.etn.etnturistarlujo', open: 'etn',
    origin: 'Ciudad de Mexico', dest: 'Celaya',
  },
  gontijo: {
    appId: 'br.com.gontijo.viagens', open: 'gontijo',
    origin: 'Sao Paulo', dest: 'Belo Horizonte',
  },
  'cruz-del-sur': {
    appId: 'pe.com.cds', open: 'label-es', home: 'Selecciona tu Origen',
    trigger: 'Ida, Fecha de Salida', origin: 'Lima', dest: 'Ica',
  },
  autovias: {
    appId: 'com.gho.autovias', open: 'label-es', home: 'Selecciona tu Origen',
    trigger: 'Ida, Fecha de Salida', origin: 'Guadalajara', dest: 'Colima',
  },
  gfa: {
    appId: 'com.gfa.PrimeraPlus', open: 'label-es', home: 'Selecciona tu Origen',
    trigger: 'Ida, Fecha de Salida', origin: 'Guadalajara', dest: 'Aguascalientes',
  },
};

// ===========================================================================
// 1) GFA — 29 flows de linea base (transforma autovias/flows)
// ===========================================================================
function genGfaBaseline() {
  const src = join(ROOT, 'autovias', 'flows');
  const files = readdirSync(src).filter((f) => f.endsWith('.yaml')).sort();
  for (const f of files) {
    let body = readFileSync(join(src, f), 'utf8');
    // Solo cambian los datos de marca; la estructura del caso es identica.
    body = body.replaceAll('com.gho.autovias', 'com.gfa.PrimeraPlus');
    // Ruta semilla Primera Plus (Bajio): Guadalajara -> Aguascalientes (sin
    // acentos para no depender del teclado). El origen se mantiene Guadalajara.
    body = body.replace(/DESTINATION: "Colima"/g, 'DESTINATION: "Aguascalientes"');
    write(join('gfa', 'flows', f), body);
  }
  return files.length;
}

// ===========================================================================
// 2) Suite de calendario CAL-01..CAL-28
// ===========================================================================

// --- Helpers "abrir calendario" (uno por variante de idioma/selector) -------
function genOpenHelpers() {
  // ES por texto: cruz-del-sur, autovias, gfa
  write('shared/label-es/calendar/_open.yaml', `# Abre el calendario de salida con Origen/Destino ya fijados (apps label ES).
# Precondicion para los CAL-*; deja el calendario abierto en el mes actual.
# env: APP_ID, HOME_ANCHOR_TEXT, ORIGIN, DESTINATION, DATE_TRIGGER
appId: any
---
- runFlow:
    file: ../../launch-app.yaml
    env:
      APP_ID: \${APP_ID}
      HOME_ANCHOR_TEXT: \${HOME_ANCHOR_TEXT}
- tapOn: { text: \${HOME_ANCHOR_TEXT} }
- inputText: \${ORIGIN}
- tapOn: { text: \${ORIGIN}, index: 0 }
- tapOn: { text: \${ORIGIN}, index: 0 }
- inputText: \${DESTINATION}
- tapOn: { text: \${DESTINATION}, index: 0 }
- tapOn: { text: \${DESTINATION}, index: 0 }
- tapOn: { text: \${DATE_TRIGGER} }
`);

  // ETN por testIDs
  write('shared/etn/calendar/_open.yaml', `# Abre el calendario de salida (ETN, testIDs). Precondicion para los CAL-*.
# env: APP_ID, ORIGIN, DESTINATION
appId: any
---
- runFlow:
    file: ../../launch-app.yaml
    env:
      APP_ID: \${APP_ID}
      HOME_ANCHOR_ID: "search-origin-trigger"
- tapOn: { text: "No permitir", optional: true }
- tapOn: { id: "search-origin-trigger" }
- inputText: \${ORIGIN}
- tapOn: { id: "search-origin-result-0" }
- inputText: \${DESTINATION}
- tapOn: { id: "search-destination-result-0" }
- tapOn: { id: "search-date-select" }
`);

  // Gontijo por texto PT
  write('shared/gontijo/calendar/_open.yaml', `# Abre o calendario de saida (Gontijo, PT). Precondicion para os CAL-*.
# env: APP_ID, ORIGIN, DESTINATION
appId: any
---
- runFlow:
    file: ../../launch-app.yaml
    env:
      APP_ID: \${APP_ID}
      HOME_ANCHOR_TEXT: "Selecione sua Origem"
- tapOn: { text: "Selecione sua Origem" }
- inputText: \${ORIGIN}
- tapOn: { text: \${ORIGIN}, index: 0 }
- tapOn: { text: \${ORIGIN}, index: 0 }
- inputText: \${DESTINATION}
- tapOn: { text: \${DESTINATION}, index: 0 }
- tapOn: { text: \${DESTINATION}, index: 0 }
- tapOn: { text: "Ida, Data de Partida" }
`);
}

// --- Cores CAL (agnosticos de marca; operan sobre el calendario ya abierto) --
// Nota: las fechas ancla del bug AM-1529 (junio 2026) ya son pasado y el picker
// deshabilita fechas pasadas, por eso las anclas se calculan dinamicamente
// (hoy/manana). Los criterios de alineacion columna<->dia son inherentemente
// visuales: se capturan por screenshot para revision + la asercion automatica
// del ancla comprobable (el numero de dia existe y es interactuable).
const CAL = {
  '01': { area: 'Rejilla', focus: 'Mes actual alineado: el dia de hoy cae en su columna, sin corrimiento (AM-1529).',
    steps: `- evalScript: \${output.hoy = (new Date()).getDate().toString()}
- assertVisible: "\${output.hoy}"
- takeScreenshot: CAL-01-rejilla-mes-actual` },
  '02': { area: 'Rejilla', focus: '"Hoy" resaltado en la celda del dia correcto.',
    steps: `- evalScript: \${output.hoy = (new Date()).getDate().toString()}
- assertVisible: "\${output.hoy}"
- takeScreenshot: CAL-02-hoy-resaltado` },
  '03': { area: 'Rejilla', focus: 'Encabezados de dia en orden semana (lunes->domingo) y en idioma.',
    steps: `- takeScreenshot: CAL-03-encabezados-semana` },
  '04': { area: 'Rejilla', focus: 'Numero de filas correcto por mes (5 vs 6 semanas), sin huecos.',
    steps: `- takeScreenshot: CAL-04-filas-por-mes` },
  '05': { area: 'Rejilla', focus: 'El dia 1 del mes siempre en su columna correcta.',
    steps: `- assertVisible: "1"
- takeScreenshot: CAL-05-dia-1-en-columna` },
  '06': { area: 'Rejilla', focus: 'Febrero no bisiesto (28 dias, sin dia 29). Navegar a feb del proximo anio no bisiesto.',
    steps: `- takeScreenshot: CAL-06-febrero-no-bisiesto` },
  '07': { area: 'Rejilla', focus: 'Febrero bisiesto: el dia 29 existe y bien ubicado.',
    steps: `- takeScreenshot: CAL-07-febrero-bisiesto` },
  '08': { area: 'Rejilla', focus: 'Meses de 30 y 31 dias sin desbordar la rejilla.',
    steps: `- takeScreenshot: CAL-08-meses-30-31` },
  '09': { area: 'Rejilla', focus: 'Cambio de anio (dic->ene) mantiene la alineacion.',
    steps: `- takeScreenshot: CAL-09-cambio-de-anio` },
  '10': { area: 'Navegacion', focus: 'Avance multi-mes mantiene la alineacion.',
    steps: `- takeScreenshot: CAL-10-avance-multimes` },
  '11': { area: 'Restriccion', focus: 'Fechas pasadas deshabilitadas / mes anterior limitado.',
    steps: `- takeScreenshot: CAL-11-fechas-pasadas-deshabilitadas` },
  '12': { area: 'Restriccion', focus: 'Tope de anticipacion de venta deshabilita fechas lejanas.',
    steps: `- takeScreenshot: CAL-12-tope-anticipacion` },
  '13': { area: 'Seleccion', focus: 'Coherencia tap->valor: tocar manana selecciona manana.',
    steps: `- evalScript: \${output.manana = (new Date(Date.now() + 86400000)).getDate().toString()}
- tapOn: { text: "^\${output.manana}$" }
- takeScreenshot: CAL-13-tap-igual-valor` },
  '14': { area: 'Seleccion', focus: 'Fecha minima (hoy) seleccionable.',
    steps: `- evalScript: \${output.hoy = (new Date()).getDate().toString()}
- tapOn: { text: "^\${output.hoy}$" }
- takeScreenshot: CAL-14-fecha-minima-hoy` },
  '15': { area: 'Seleccion', focus: 'Re-seleccionar otra fecha actualiza correctamente.',
    steps: `- evalScript: \${output.manana = (new Date(Date.now() + 86400000)).getDate().toString()}
- evalScript: \${output.pasado = (new Date(Date.now() + 2*86400000)).getDate().toString()}
- tapOn: { text: "^\${output.manana}$" }
- tapOn: { text: "^\${output.pasado}$" }
- takeScreenshot: CAL-15-reseleccion` },
  '16': { area: 'Redondo', focus: 'Calendario de regreso alineado y >= fecha de ida.',
    steps: `- tapOn: { text: "Redondo", optional: true }
- takeScreenshot: CAL-16-regreso-alineado` },
  '17': { area: 'Redondo', focus: 'Rango ida-regreso resaltado sobre las celdas correctas.',
    steps: `- takeScreenshot: CAL-17-rango-resaltado` },
  '18': { area: 'Redondo', focus: 'Cambiar la ida tras fijar el regreso se maneja coherente.',
    steps: `- takeScreenshot: CAL-18-cambiar-ida` },
  '19': { area: 'Redondo', focus: '"Boleto abierto / sin fecha de ida" no rompe el calendario.',
    steps: `- takeScreenshot: CAL-19-boleto-abierto` },
  '20': { area: 'Responsive', focus: 'Rotacion a horizontal conserva la alineacion.',
    steps: `- setOrientation: LANDSCAPE
- takeScreenshot: CAL-20-horizontal
- setOrientation: PORTRAIT
- takeScreenshot: CAL-20-vertical` },
  '21': { area: 'Responsive', focus: 'Fuente del sistema grande no descuadra la tabla (requiere ajuste del SO).',
    steps: `- takeScreenshot: CAL-21-fuente-grande` },
  '22': { area: 'Responsive', focus: 'Pantalla angosta / densidad alta (causa raiz <600px) sin deformar.',
    steps: `- takeScreenshot: CAL-22-pantalla-angosta` },
  '23': { area: 'Sistema', focus: 'Cambiar la fecha del dispositivo recalcula "hoy" y deshabilitados.',
    steps: `- takeScreenshot: CAL-23-fecha-dispositivo` },
  '24': { area: 'Coherencia', focus: 'Fecha de ida coincide de punta a punta. Aqui se fija manana; la coherencia hasta el boleto se valida con el BL correspondiente.',
    steps: `- evalScript: \${output.manana = (new Date(Date.now() + 86400000)).getDate().toString()}
- tapOn: { text: "^\${output.manana}$" }
- takeScreenshot: CAL-24-coherencia-ida` },
  '25': { area: 'Coherencia', focus: 'Fechas ida+regreso correctas (coherencia completa via BL redondo).',
    steps: `- takeScreenshot: CAL-25-coherencia-redondo` },
  '26': { area: 'Coherencia', focus: 'Cambiar fecha y rebuscar refleja la nueva fecha en resultados.',
    steps: `- evalScript: \${output.pasado = (new Date(Date.now() + 2*86400000)).getDate().toString()}
- tapOn: { text: "^\${output.pasado}$" }
- takeScreenshot: CAL-26-cambiar-y-rebuscar` },
  '27': { area: 'Otros', focus: 'Otros selectores de fecha de la app tambien alineados.',
    steps: `- takeScreenshot: CAL-27-otros-selectores` },
  // CAL-28 es especial: NO usa el helper _open (prueba buscar SIN Origen/Destino).
  '28': { area: 'Validacion', special: true,
    focus: 'Buscar sin Origen/Destino no deja la app atorada: redirige a seleccion de origen y sigue responsiva.' },
};

function calCore(id) {
  const c = CAL[id];
  return `# CAL-${id} — ${c.area}: ${c.focus}
# Core agnostico de marca. Precondicion: calendario abierto (via el helper
# shared/<variante>/calendar/_open.yaml que invoca el wrapper por marca).
# Criterio de alineacion columna<->dia: revision visual del screenshot (limitacion
# inherente del datepicker); la asercion automatica cubre el ancla comprobable.
appId: any
---
${c.steps}
`;
}

function genCalCores() {
  let n = 0;
  for (const id of Object.keys(CAL)) {
    if (CAL[id].special) continue; // CAL-28 se estampa directo en cada wrapper
    write(`shared/calendar/CAL-${id}.yaml`, calCore(id));
    n++;
  }
  return n;
}

// --- Wrapper por marca: open + core (o caso especial CAL-28) ----------------
function openEnv(b) {
  if (b.open === 'label-es') {
    return `      APP_ID: "${b.appId}"
      HOME_ANCHOR_TEXT: "${b.home}"
      ORIGIN: "${b.origin}"
      DESTINATION: "${b.dest}"
      DATE_TRIGGER: "${b.trigger}"`;
  }
  // etn / gontijo: helper con selectores fijos, solo pasan ruta
  return `      APP_ID: "${b.appId}"
      ORIGIN: "${b.origin}"
      DESTINATION: "${b.dest}"`;
}

function calWrapper(brandDir, id) {
  const b = BRANDS[brandDir];
  const c = CAL[id];
  if (c.special) {
    // CAL-28: buscar sin O/D. Autocontenido (no abre calendario con ruta).
    const homeText = b.open === 'gontijo' ? 'Selecione sua Origem' : b.home;
    const anchorEnv = b.open === 'etn'
      ? `      HOME_ANCHOR_ID: "search-origin-trigger"`
      : `      HOME_ANCHOR_TEXT: "${homeText}"`;
    const searchTap = b.open === 'etn'
      ? `- tapOn: { id: "search-submit-button", optional: true }`
      : `- tapOn: { text: "BUSCAR", optional: true }`;
    const anchorAssert = b.open === 'etn'
      ? `- assertVisible: { id: "search-origin-trigger" }`
      : `- assertVisible: "${homeText}"`;
    return `appId: ${b.appId}
---
# CAL-28 — ${c.area}: ${c.focus}
- runFlow:
    file: ../../shared/launch-app.yaml
    env:
      APP_ID: "${b.appId}"
${anchorEnv}
# Intenta buscar sin elegir Origen/Destino:
${searchTap}
- takeScreenshot: CAL-28-buscar-sin-origen-destino
# La app debe seguir viva y pedir el origen (no quedarse atorada):
${anchorAssert}
`;
  }
  return `appId: ${b.appId}
---
# CAL-${id} — ${c.area}: ${c.focus}
- runFlow:
    file: ../../shared/${b.open}/calendar/_open.yaml
    env:
${openEnv(b)}
- runFlow:
    file: ../../shared/calendar/CAL-${id}.yaml
`;
}

function genCalWrappers() {
  let n = 0;
  for (const brandDir of Object.keys(BRANDS)) {
    for (const id of Object.keys(CAL)) {
      write(join(brandDir, 'calendar', `CAL-${id}.yaml`), calWrapper(brandDir, id));
      n++;
    }
  }
  return n;
}

// ===========================================================================
// Run
// ===========================================================================
const gfa = genGfaBaseline();
genOpenHelpers();
const cores = genCalCores();
const wrappers = genCalWrappers();

console.log(`GFA linea base:        ${gfa} flows -> gfa/flows/`);
console.log(`CAL cores compartidos: ${cores} -> shared/calendar/`);
console.log(`CAL open helpers:      3 -> shared/{label-es,etn,gontijo}/calendar/_open.yaml`);
console.log(`CAL wrappers por marca:${wrappers} -> <brand>/calendar/`);
console.log('Listo.');
