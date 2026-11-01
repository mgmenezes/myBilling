# Campanha de lista de espera — Tasks

**Spec**: `.specs/features/campanha-lista-de-espera/spec.md`
**Status**: Em execução
**Total**: 6 tasks em 3 fases

> **Por que o texto vem antes da página, e a página antes das imagens.** O posicionamento é a fonte
> de toda frase da landing; escrever a landing primeiro e o posicionamento depois inverteria quem
> manda em quem. As capturas dependem do seed e do servidor de teste, que são a parte mais frágil
> da fatia: ficam por último para que a página já esteja inteira caso elas atrasem.
>
> **O que o teste alcança e o que não alcança.** Um teste estrutural (`node:test`) lê o HTML e o CSS
> e prova o que é texto: um script só, azul só em botão e link, URL do formulário numa constante,
> nenhum `R$` fora da allowlist, fonte e ano em cada número. Um teste de navegador (Playwright com
> axe-core) prova o que só o navegador resolve: rolagem horizontal e violações de acessibilidade em
> três larguras e dois temas. **Nenhum teste prova que o texto convence**: isso é leitura do dono.

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Para cada task, nesta ordem:

1. **Pré-implementação** — declarar premissas, arquivos a tocar e critério de sucesso.
2. **Escrever os testes primeiro**, derivados dos acceptance criteria do `spec.md`, quando a task tem teste.
3. **Implementar** até os testes passarem.
4. **Gate Check** — rodar o comando do nível declarado na task.
5. **Test Adequacy Review** com citação `file:line` e a expressão da assertion.
6. **Marcar a task como concluída** neste arquivo e atualizar a traceability no `spec.md`, **dentro** do mesmo commit.
7. **Um commit atômico** em Conventional Commits, validado por `check_commit.py`.

Proibições absolutas: commitar antes do gate passar · enfraquecer, pular ou deletar teste para passar · agrupar tasks em um commit · "já que estou aqui" · dado financeiro real em qualquer arquivo (AD-009).

**Blast radius:** a aprovação destas tasks autoriza implementação e commits **locais**. `git push`, criar projeto na Vercel e qualquer operação remota exigem autorização explícita e separada.

---

## Test Coverage Matrix

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `site/index.html`, `site/estilos.css` (estrutura) | estrutural, `node:test` | Todo AC que é texto: CAMP-02 ACs 1, 4, 5, 7; CAMP-03 ACs 1, 2, 5, 8; CAMP-04 ACs 1 a 4; CAMP-05 AC 2 | `site/*.test.mjs` | `node --test site/` |
| `site/index.html` (renderizado) | navegador, Playwright + axe | CAMP-03 AC 6 em 360, 768 e 1440, claro e escuro | `site/verificar-navegador.mjs` | `node site/verificar-navegador.mjs` |
| `site/imagens/` | gerado por script | CAMP-05 ACs 1 e 3: o script é a prova; o teste estrutural confere arquivo, `alt`, `width`, `height` | `site/capturar.mjs` | `node site/capturar.mjs` |
| `docs/marketing/*.md`, `site/README.md` | **none** | Texto lido pelo dono. Limites de caracteres do kit conferidos por `wc` na task | — | — |

> `site/*.mjs` entra no `biome check .`, então formatação e lint valem também para a landing. O
> Vitest não captura `*.test.mjs` (os projects só incluem `src/**`), por isso o `node:test`.

---

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| `docs` | task só de texto | `pnpm lint` |
| `site` | task que mexe em `site/` antes do teste de navegador existir | `pnpm lint && node --test site/` |
| `build` | última task de fase e toda task a partir de T5 | `pnpm verify && pnpm site:verificar` |

Pré-requisito do `build`: `pnpm db:up`. Pré-requisito de T4: nenhum `next dev` rodando na porta
que o script escolher.

---

## Execution Plan

Três fases: texto, página, divulgação.

### Phase 0 — O texto que manda

```
T1
```

### Phase 1 — A página

```
T1 -> T2 -> T3 -> T4 -> T5
```

### Phase 2 — Divulgação e fechamento

```
T5 -> T6
```

---

## Task Breakdown

### Phase 0 — O texto que manda

#### T1: Documento de posicionamento
**What**: `docs/marketing/posicionamento.md`: persona nos três estados, dores, promessa, provas (cada uma ligada à AD ou spec que a sustenta), "O que nunca prometer", números de mercado com fonte e ano, tom de voz em regras.
**Where**: `docs/marketing/posicionamento.md`
**Depends on**: nenhuma
**Reuses**: o estudo em `.claude/plans/` desta sessão; `.specs/STATE.md` para as ADs; `docs/roadmap.md` para a lista do que não existe
**Requirement**: CAMP-01
**Tools**: nenhuma
**Done when**:
- [x] Três estados da persona, cada um com dor e ponte em uma frase (AC 1)
- [x] Tabela promessa → garantia → AD/spec (AC 2)
- [x] Seção "O que nunca prometer" com os sete itens mínimos (AC 3)
- [x] `grep -n "R\$"` no arquivo devolve só fixtures da spec do MVP (AC 4)
- [x] Cada número de mercado com fonte e ano na mesma linha (AC 5)
- [x] Regras de tom verificáveis (AC 6)
**Tests**: none
**Gate**: docs

### Phase 1 — A página

#### T2: Esqueleto, identidade, botão e teste estrutural
**What**: `site/estilos.css` com os tokens de `docs/design.md` em `light-dark()`, tipografia, componentes (botão pílula, cartão com hairline, inversão); `site/index.html` com `<head>` completo, constante da URL do formulário, script do tema, hero, as seções vazias na ordem da spec e o rodapé; `site/estrutura.test.mjs` provando o que é texto.
**Where**: `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`
**Depends on**: T1
**Reuses**: tokens e comentários de `src/app/globals.css`; `SCRIPT_TEMA` de `src/components/alternador-de-tema.tsx`
**Requirement**: CAMP-02 (ACs 1, 6, 7), CAMP-03 (ACs 1 a 5, 7, 8), CAMP-04
**Tools**: nenhuma
**Done when**:
- [x] Teste: `lang`, `title`, `viewport`, `description` presentes (CAMP-02 AC 7)
- [x] Teste: as sete seções existem na ordem (CAMP-02 AC 1)
- [x] Teste: um `<script>` só, inline, sem `src`; nenhum `<link>` externo fora de fonts.googleapis.com e fonts.gstatic.com (CAMP-03 AC 5)
- [x] Teste: `--primary` só aparece em regras de `.botao-primario`, `a` e tokens; `--inverso` usado por um seletor só (CAMP-03 AC 2)
- [x] Teste: nenhum `@media (prefers-color-scheme` com declaração de cor; todo token com `light-dark(` (CAMP-03 AC 1)
- [x] Teste: toda `font-family` termina em pilha de reserva (CAMP-03 AC 4)
- [x] Teste: nenhum `box-shadow` fora de `--sombra-1`; headline em `font-weight: 400` (CAMP-03 AC 8)
- [x] Teste: constante `URL_DO_FORMULARIO` única; com placeholder, todo botão da lista tem `aria-disabled="true"`, sem `href`, com texto "em breve"; com `https://`, todo botão tem `href` igual, `target="_blank"` e `rel="noopener"` (CAMP-04 ACs 1 a 4). O teste roda o HTML nos dois estados, substituindo a constante em memória
- [x] Teste: nenhum `R$` fora da allowlist `["1.000,00", "333,34", "333,33"]` (CAMP-02 AC 4, parte)
- [x] A frase "usado hoje por um casal" e "abrindo para mais casas" presentes (CAMP-02 AC 6)
- [x] `data-tema="sistema"` nunca aparece no HTML nem no script (CAMP-03 AC 3)
**Tests**: estrutural (`node:test`)
**Gate**: site

#### T3: O conteúdo das seções
**What**: preencher as sete seções com o texto do posicionamento: os cinco blocos de dor, o comparativo em três colunas com as linhas em que a planilha ganha, "Para dois", "Traga a sua planilha ou comece do zero", os três números de mercado com fonte e ano, o rodapé.
**Where**: `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`
**Depends on**: T2
**Reuses**: `docs/marketing/posicionamento.md`
**Requirement**: CAMP-02 (ACs 2 a 5)
**Tools**: nenhuma
**Done when**:
- [x] Teste: cinco blocos em "Onde as contas da casa quebram", cada um com dois parágrafos (AC 2)
- [x] Teste: o comparativo tem ao menos duas linhas marcadas `data-vence="planilha"` ou `data-vence="caderno"` (AC 3)
- [x] Teste: nenhuma palavra da lista "O que nunca prometer" (sincroniza, banco, open finance, app na loja, orçamento por categoria, fatura, grátis, R$ por mês) aparece como promessa; a lista vive no teste (AC 4)
- [x] Teste: cada `<figure class="numero">` tem `<figcaption>` com `<cite>` e um ano de quatro dígitos; no máximo três (AC 5)
- [x] Grandeza numérica isolada em `.mono`; nenhuma frase corrida em `.mono` (CAMP-03 AC 7, conferência manual)
**Tests**: estrutural (`node:test`)
**Gate**: site

#### T4: Capturas do app com o seed
**What**: `site/capturar.mjs`: sobe `next dev` numa porta livre com `AUTH_PROVIDER_DE_TESTE=1` e `NODE_ENV=test` contra o banco local semeado, entra pelo provider de teste como `pessoa-a@example.com`, fotografa Visão geral do mês e Lançamentos em 1280 px, claro e escuro, grava em `site/imagens/`. Inserir as imagens na página com `<picture>` e a nota de dados de demonstração.
**Where**: `site/capturar.mjs`, `site/imagens/*.png`, `site/index.html`, `site/estrutura.test.mjs`
**Depends on**: T3
**Reuses**: o `entrar()` de `e2e/acessibilidade.spec.ts`; `pnpm db:seed`; `playwright.config.ts` para as variáveis de ambiente
**Requirement**: CAMP-05
**Tools**: Playwright já instalado, Chrome da máquina
**Done when**:
- [x] As imagens existem para cada tela nos dois temas e o script é determinístico no conteúdo (AC 1, AC 3)
- [x] Teste: todo `<img>` tem `alt` não vazio, `width` e `height`, e o arquivo de `src` existe (AC 2)
- [x] Teste: todo `<picture>` tem `<source media="(prefers-color-scheme: dark)">` (AC 3)
- [x] Teste: a frase "dados de demonstração" aparece perto das imagens (AC 4)
- [x] Conferência manual de cada imagem: nenhum texto fora do seed
**Tests**: estrutural (`node:test`) + geração por script
**Gate**: site

#### T5: Teste de navegador e comando único
**What**: `site/verificar-navegador.mjs` com Playwright e `@axe-core/playwright`: serve `site/` por `file://` ou servidor estático mínimo, abre em 360, 768 e 1440, claro e escuro, confere `scrollWidth === clientWidth` e zero violações WCAG 2.1 AA. Acrescentar `@axe-core/playwright` em `devDependencies` e `site:verificar` em `scripts`.
**Where**: `site/verificar-navegador.mjs`, `package.json`, `pnpm-lock.yaml`
**Depends on**: T4
**Reuses**: `channel: "chrome"` como em `playwright.config.ts`
**Requirement**: CAMP-03 (AC 6), CAMP-07 (ACs 1 e 2)
**Tools**: Playwright, axe-core
**Done when**:
- [ ] O script falha com código 1 se houver rolagem horizontal ou violação em qualquer uma das seis combinações, e imprime qual (CAMP-03 AC 6)
- [ ] `pnpm site:verificar` roda o estrutural e o navegador e sai 0 (CAMP-07 AC 2)
- [ ] `pnpm verify` sai 0 com `site/` presente (CAMP-07 AC 1)
**Tests**: navegador (Playwright + axe)
**Gate**: build

### Phase 2 — Divulgação e fechamento

#### T6: Kit de copy, README do site e ponteiros
**What**: `docs/marketing/kit-de-copy.md` com headlines, três textos curtos e o texto longo; `site/README.md` com como abrir, onde colar a URL do formulário, como regenerar as capturas e como se faz o deploy; linha nova em `.specs/HANDOFF.md` apontando para a fatia.
**Where**: `docs/marketing/kit-de-copy.md`, `site/README.md`, `.specs/HANDOFF.md`
**Depends on**: T5
**Reuses**: `docs/marketing/posicionamento.md`
**Requirement**: CAMP-06, CAMP-07 (AC 3)
**Tools**: nenhuma
**Done when**:
- [ ] Seis a oito headlines, cada uma com o estado da persona (CAMP-06 AC 1)
- [ ] Três textos curtos, `wc -m` ≤ 280 cada, terminando com a chamada (AC 2)
- [ ] Texto longo com `wc -w` ≥ 500, primeira pessoa, sem valor nem nome real (AC 3)
- [ ] Nenhuma palavra da lista "O que nunca prometer" (AC 4)
- [ ] `HANDOFF.md` aponta para `.specs/features/campanha-lista-de-espera/` e `site/README.md` (CAMP-07 AC 3)
**Tests**: none
**Gate**: build
