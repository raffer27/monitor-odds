// Busca odds via The Odds API (https://the-odds-api.com), gratuita até 500
// requisições/mês — 6 chamadas/dia (cron de 4/4h) cabem tranquilo mesmo
// rodando o mês inteiro. Nunca fizemos scraping direto: as 3 fontes usadas
// no slate original (Sportytrader, Oddschecker, Betfair) bloqueiam bot com
// Cloudflare/403 — contornar isso seria evasão de proteção anti-bot, fora
// do escopo do que este projeto constrói.
//
// Uso: ODDS_API_KEY=xxx SPORT_KEY=soccer_epl node scripts/buscar-odds.mjs
// SPORT_KEY precisa existir na lista real de esportes da conta — checar em
// https://api.the-odds-api.com/v4/sports/?apiKey=SUA_KEY antes de configurar
// o workflow, porque nem toda competição (ex. Sul-Americana) é coberta.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const API_KEY = process.env.ODDS_API_KEY;
const SPORT_KEY = process.env.SPORT_KEY || "soccer_epl";
const REGIONS = process.env.ODDS_REGIONS || "eu,uk";
const MARKETS = process.env.ODDS_MARKETS || "h2h,totals";
const LIMIAR_CHANCE_BAIXA = 0.35; // implied prob abaixo disso = "chance baixa"

if (!API_KEY) {
  console.error("ODDS_API_KEY não definida. Configure o GitHub Secret antes de rodar o workflow.");
  process.exit(1);
}

const DATA_DIR = path.join(new URL("..", import.meta.url).pathname, "data");
const HIST_PATH = path.join(DATA_DIR, "odds.json");

function impliedProb(odd) {
  return 1 / odd;
}

async function buscar() {
  const url = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=${MARKETS}&oddsFormat=decimal`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const texto = await resp.text();
    throw new Error(`The Odds API retornou ${resp.status}: ${texto.slice(0, 300)}`);
  }
  return resp.json();
}

function melhorMomento(jogos) {
  // Pra cada jogo/mercado, acha a maior odd oferecida (melhor retorno) e
  // marca se a chance implícita é baixa — avisa em vez de só empolgar com
  // o retorno alto.
  const candidatos = [];
  for (const jogo of jogos) {
    for (const casa of jogo.bookmakers ?? []) {
      for (const mercado of casa.markets ?? []) {
        for (const resultado of mercado.outcomes ?? []) {
          candidatos.push({
            jogo: `${jogo.home_team} x ${jogo.away_team}`,
            comeco: jogo.commence_time,
            casa: casa.title,
            mercado: mercado.key,
            selecao: resultado.name,
            odd: resultado.price,
            chanceImplicita: impliedProb(resultado.price),
          });
        }
      }
    }
  }
  candidatos.sort((a, b) => b.odd - a.odd);
  return candidatos.slice(0, 5).map((c) => ({
    ...c,
    chanceBaixa: c.chanceImplicita < LIMIAR_CHANCE_BAIXA,
  }));
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  let historico = [];
  try {
    historico = JSON.parse(await readFile(HIST_PATH, "utf8"));
  } catch {
    // primeira execução, sem histórico ainda
  }

  const jogos = await buscar();
  const topMomentos = melhorMomento(jogos);

  const entrada = {
    timestamp: new Date().toISOString(),
    sportKey: SPORT_KEY,
    jogos: jogos.length,
    topMomentos,
  };

  historico.push(entrada);
  // mantém só os últimos 30 dias de amostras (6/dia * 30 = 180 entradas)
  historico = historico.slice(-180);

  await writeFile(HIST_PATH, JSON.stringify(historico, null, 2));

  console.log(`OK — ${jogos.length} jogo(s), top momento: ${JSON.stringify(topMomentos[0] ?? null)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
