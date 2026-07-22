// Lê data/odds.json (histórico de execuções do buscar-odds.mjs) e gera
// docs/index.html estático — é a página que o GitHub Pages serve.
// Não usa framework nem CDN: só HTML/CSS inline, pra funcionar direto do
// GitHub Pages sem build step.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const HIST_PATH = path.join(ROOT, "data", "odds.json");
const DOCS_DIR = path.join(ROOT, "docs");

function fmtPct(n) {
  return `${(n * 100).toFixed(0)}%`;
}

function linhaMomento(m) {
  const avisoClasse = m.chanceBaixa ? "warn" : "good";
  const aviso = m.chanceBaixa
    ? `⚠️ chance implícita baixa (${fmtPct(m.chanceImplicita)}) — retorno alto não significa aposta segura`
    : `chance implícita ${fmtPct(m.chanceImplicita)}`;
  return `
    <tr class="${avisoClasse}">
      <td>${m.jogo}</td>
      <td>${m.selecao}</td>
      <td>${m.casa}</td>
      <td class="odd">${m.odd.toFixed(2)}</td>
      <td>${aviso}</td>
    </tr>`;
}

async function main() {
  await mkdir(DOCS_DIR, { recursive: true });

  let historico = [];
  try {
    historico = JSON.parse(await readFile(HIST_PATH, "utf8"));
  } catch {
    historico = [];
  }

  const ultima = historico[historico.length - 1];
  const atualizadoEm = ultima ? new Date(ultima.timestamp).toLocaleString("pt-BR") : "ainda não rodou";
  const linhas = ultima ? ultima.topMomentos.map(linhaMomento).join("\n") : "";

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Monitor de Odds — Melhor Retorno</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; background:#0b1410; color:#eef4ee; margin:0; padding:24px; }
  .wrap { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color:#8ba398; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #24382e; }
  th { color:#8ba398; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
  td.odd { font-variant-numeric: tabular-nums; color:#d7a84a; font-weight: 600; }
  tr.warn td { color: #dba748; }
  footer { margin-top: 20px; font-size: 12px; color: #8ba398; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Monitor de Odds — Melhor Retorno (simulação)</h1>
    <div class="meta">Atualizado em ${atualizadoEm} · fonte: The Odds API · atualização automática de 4/4h via GitHub Actions</div>
    <table>
      <thead>
        <tr><th>Jogo</th><th>Seleção</th><th>Casa</th><th>Odd</th><th>Aviso</th></tr>
      </thead>
      <tbody>
        ${linhas || '<tr><td colspan="5">Sem dados ainda — primeira execução do workflow ainda não rodou.</td></tr>'}
      </tbody>
    </table>
    <footer>Simulação — não é dinheiro real. Retorno alto não é garantia de vitória; sempre olhar a chance implícita ao lado.</footer>
  </div>
</body>
</html>`;

  await writeFile(path.join(DOCS_DIR, "index.html"), html);
  console.log("docs/index.html gerado.");
}

main();
