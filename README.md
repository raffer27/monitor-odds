# monitor-odds

Automação 24/7 (GitHub Actions + GitHub Pages) que busca odds a cada 4h e
publica uma página com o melhor momento de retorno — avisando quando a
chance implícita é baixa, pra não confundir "retorno alto" com "aposta boa".

**Por que API e não scraping:** testamos as 3 fontes usadas no slate manual
(Sportytrader, Oddschecker, Betfair) — todas bloqueiam bot com Cloudflare/403.
Contornar isso é evasão de proteção anti-bot, fora do escopo do que
construímos aqui. [The Odds API](https://the-odds-api.com) tem tier grátis
(500 requisições/mês) e é feito pra ser consumido por automação — 6
chamadas/dia (4/4h) cabem à vontade.

## Setup (você faz, ninguém automatiza isso por você)

Criar conta em serviço externo exige e-mail seu, verificação e aceite de
termos como pessoa real — nenhum agente pode fazer isso no seu lugar.

1. **Criar conta grátis:** https://the-odds-api.com/ → "Get API Key" → confirma
   e-mail. Leva ~2 minutos.
2. **Checar quais esportes/competições a sua key cobre:**
   ```
   curl "https://api.the-odds-api.com/v4/sports/?apiKey=SUA_KEY"
   ```
   Nem toda competição é coberta (ex.: Copa Sul-Americana pode não estar —
   ligas grandes tipo `soccer_epl`, `soccer_brazil_campeonato` costumam estar).
   Anote o `sport_key` que você quer acompanhar.
3. **Criar o repositório no GitHub** (conta `raffer27`, público — Pages
   grátis exige público em conta free): nome sugerido `monitor-odds` ou
   dentro de um repo já existente, sua escolha.
4. **Configurar o repositório:**
   - Settings → Secrets and variables → Actions → New repository secret:
     `ODDS_API_KEY` = sua key.
   - Settings → Secrets and variables → Actions → Variables → New variable:
     `SPORT_KEY` = o valor do passo 2 (ex. `soccer_epl`).
   - Settings → Pages → Source: **GitHub Actions** (não "branch" — o workflow
     já faz upload do artifact de `docs/`).
5. **Push deste diretório** (`monitor-odds/`) pra raiz do repositório novo.
6. O workflow roda sozinho a cada 4h (`.github/workflows/atualizar-odds.yml`)
   e também dá pra disparar manual: aba Actions → "Atualizar odds (4/4h)" →
   Run workflow.

## Rodar local (teste antes de subir)

```bash
export ODDS_API_KEY=sua_key
export SPORT_KEY=soccer_epl
npm run rodar
# abre docs/index.html no navegador pra conferir
```

## Estrutura

```
monitor-odds/
├── scripts/
│   ├── buscar-odds.mjs   — chama a API, calcula melhor retorno + chance implícita
│   └── gerar-pagina.mjs  — lê data/odds.json, gera docs/index.html
├── data/odds.json        — histórico (gerado, últimas 180 execuções ~30 dias)
├── docs/index.html       — página publicada no GitHub Pages (gerada, não editar à mão)
└── .github/workflows/atualizar-odds.yml
```

## Limitações honestas

- Cobertura de competição depende do plano da The Odds API — Sul-Americana e
  ligas menores podem não estar incluídas no tier grátis.
- "Melhor retorno" é maior odd entre as casas cobertas pela API na região
  configurada — não é necessariamente a melhor aposta, só a de maior retorno
  numérico. O aviso de "chance baixa" existe justamente pra não deixar isso
  enganar.
- Ainda é simulação — nenhuma aposta real é feita a partir daqui.
