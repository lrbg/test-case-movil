#!/usr/bin/env node
// Genera el dashboard raiz (index.html) que GitHub Pages publica desde la rama
// master. Lee el manifest reports/index.json, cuenta las evidencias reales de
// cada reporte y arma un resumen global + tarjetas por corrida.
//
// Uso:  node scripts/build-index.mjs
// Sin dependencias externas (Node >=18).

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "reports", "index.json");
const OUT = path.join(ROOT, "index.html");

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function humanDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return "—";
  const [, y, mo, d, h, mi] = m;
  return `${parseInt(d)} ${MONTHS[parseInt(mo) - 1]} ${y}, ${h}:${mi}`;
}

// Cuenta los .png dentro de la carpeta del reporte (evidencias reales).
function countEvidence(reportPath) {
  const abs = path.join(ROOT, reportPath);
  if (!fs.existsSync(abs)) return 0;
  const stat = fs.statSync(abs);
  if (!stat.isDirectory()) return 0;
  let n = 0;
  for (const e of fs.readdirSync(abs)) if (/\.png$/i.test(e)) n++;
  return n;
}

const STATUS = {
  pass: { label: "Aprobado", cls: "ok" },
  fail: { label: "Fallido", cls: "fail" },
  bugs: { label: "Con hallazgos", cls: "warn" },
  unknown: { label: "Sin datos", cls: "muted" },
};

function statusBadge(status) {
  const s = STATUS[status] || STATUS.unknown;
  return `<span class="badge badge-${s.cls}">${s.label}</span>`;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const reports = manifest.reports
    .map((r) => ({ ...r, evidence: countEvidence(r.path) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const total = reports.length;
  const pass = reports.filter((r) => r.status === "pass").length;
  const fail = reports.filter((r) => r.status === "fail").length;
  const bugs = reports.reduce((n, r) => n + (r.bugs || 0), 0);
  const evidence = reports.reduce((n, r) => n + r.evidence, 0);

  const cards = reports
    .map(
      (r) => `
      <li class="report" onclick="location.href='${esc(r.path)}'">
        <div class="report-main">
          <div class="report-title">
            <a href="${esc(r.path)}">${esc(r.brand)} · ${esc(r.case)}</a>
            ${statusBadge(r.status)}
          </div>
          <p class="report-sub">${esc(r.title)}</p>
          <p class="report-summary">${esc(r.summary)}</p>
        </div>
        <div class="report-meta">
          <span class="chip">${esc(r.platform)}</span>
          <span class="chip chip-type">${r.type === "exploracion" ? "Exploratoria" : "E2E"}</span>
          <span class="meta-line">${esc(humanDate(r.date))}</span>
          <span class="meta-line">${r.evidence} evidencia${r.evidence === 1 ? "" : "s"}${r.bugs ? ` · ${r.bugs} bug${r.bugs === 1 ? "" : "s"}` : ""}</span>
        </div>
      </li>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>test-case-movil — Reportes E2E</title>
<style>
  :root{
    color-scheme: light dark;
    --bg:#ffffff; --fg:#110c22; --muted:#4f4b5c; --border:#e5e2ee;
    --card:#f8f8f8; --card-hover:#f1eff8; --accent:#2f6f4f;
    --ok:#1f8a4c; --ok-bg:rgba(31,138,76,.12);
    --fail:#c0392b; --fail-bg:rgba(192,57,43,.12);
    --warn:#b7791f; --warn-bg:rgba(183,121,31,.14);
    --neutral:#6b6b7b; --neutral-bg:rgba(107,107,123,.14);
  }
  @media (prefers-color-scheme: dark){
    :root{
      --bg:#110c22; --fg:#f2f0f8; --muted:#b3aec2; --border:#2a2440;
      --card:#1a1530; --card-hover:#221b3d; --accent:#5fd68f;
      --ok:#5fd68f; --ok-bg:rgba(95,214,143,.14);
      --fail:#ff6f61; --fail-bg:rgba(255,111,97,.14);
      --warn:#e6b455; --warn-bg:rgba(230,180,85,.16);
      --neutral:#b3aec2; --neutral-bg:rgba(179,174,194,.14);
    }
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:var(--bg);color:var(--fg);padding:2.5rem 1.25rem 4rem;line-height:1.5}
  .wrap{max-width:860px;margin:0 auto}
  header h1{font-size:1.6rem;margin:0 0 .25rem}
  header p.sub{color:var(--muted);margin:0 0 2rem;font-size:.95rem;max-width:60ch}

  .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem;margin-bottom:2.25rem}
  .stat{border:1px solid var(--border);background:var(--card);border-radius:12px;padding:1rem .9rem;text-align:center}
  .stat .n{display:block;font-size:1.7rem;font-weight:700;line-height:1.1}
  .stat .l{display:block;color:var(--muted);font-size:.75rem;margin-top:.25rem;text-transform:uppercase;letter-spacing:.04em}
  .stat.ok .n{color:var(--ok)} .stat.fail .n{color:var(--fail)} .stat.warn .n{color:var(--warn)}

  ul.reports{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.7rem}
  li.report{border:1px solid var(--border);background:var(--card);border-radius:12px;padding:1rem 1.15rem;
    display:flex;justify-content:space-between;gap:1rem;cursor:pointer;transition:background .12s,border-color .12s}
  li.report:hover{background:var(--card-hover);border-color:var(--accent)}
  .report-main{min-width:0}
  .report-title{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .report-title a{color:var(--fg);text-decoration:none;font-weight:700;font-size:1.02rem}
  li.report:hover .report-title a{color:var(--accent)}
  .report-sub{margin:.2rem 0 .1rem;color:var(--fg);font-size:.9rem;opacity:.85}
  .report-summary{margin:.15rem 0 0;color:var(--muted);font-size:.85rem}
  .report-meta{display:flex;flex-direction:column;align-items:flex-end;gap:.35rem;white-space:nowrap;flex:0 0 auto}
  .meta-line{color:var(--muted);font-size:.8rem}

  .badge{display:inline-block;font-weight:700;font-size:.72rem;padding:.15rem .55rem;border-radius:999px}
  .badge-ok{background:var(--ok-bg);color:var(--ok)}
  .badge-fail{background:var(--fail-bg);color:var(--fail)}
  .badge-warn{background:var(--warn-bg);color:var(--warn)}
  .badge-muted{background:var(--neutral-bg);color:var(--neutral)}
  .chip{display:inline-block;font-size:.72rem;font-weight:600;padding:.15rem .5rem;border-radius:6px;
    background:var(--neutral-bg);color:var(--neutral)}
  .chip-type{background:transparent;border:1px solid var(--border);color:var(--muted)}

  footer{margin-top:3rem;color:var(--muted);font-size:.8rem}
  footer a{color:var(--muted)}

  @media(max-width:680px){
    .stats{grid-template-columns:repeat(3,1fr)}
    li.report{flex-direction:column}
    .report-meta{flex-direction:row;flex-wrap:wrap;align-items:center}
  }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Reportes E2E — test-case-movil</h1>
      <p class="sub">Automatización de compra de boletos para apps de autobús white-label (ETN, Gontijo, Cruz del Sur, Autovías). Cada corrida deja su resumen y evidencias.</p>
    </header>

    <section class="stats">
      <div class="stat"><span class="n">${total}</span><span class="l">Reportes</span></div>
      <div class="stat ok"><span class="n">${pass}</span><span class="l">Aprobados</span></div>
      <div class="stat fail"><span class="n">${fail}</span><span class="l">Fallidos</span></div>
      <div class="stat warn"><span class="n">${bugs}</span><span class="l">Bugs</span></div>
      <div class="stat"><span class="n">${evidence}</span><span class="l">Evidencias</span></div>
    </section>

    <ul class="reports">${cards}
    </ul>

    <footer>
      Repo: <a href="https://github.com/lrbg/test-case-movil">github.com/lrbg/test-case-movil</a>
    </footer>
  </div>
</body>
</html>
`;

  fs.writeFileSync(OUT, html);
  console.log(`index.html generado: ${total} reportes, ${pass} aprobados, ${fail} fallidos, ${bugs} bugs, ${evidence} evidencias.`);
}

main();
