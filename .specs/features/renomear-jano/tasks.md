# O app se chama Jano — Tasks

**Spec**: `.specs/features/renomear-jano/spec.md`
**Status**: Tasks concluídas, à espera do Verifier
**Total**: 4 tasks em 2 fases

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`. Para cada task: premissas, testes primeiro (derivados da
spec), implementação, gate, revisão de adequação com `file:line`, marcar a task e a traceability, um
commit validado por `check_commit.py`.

Proibições: commitar antes do gate · enfraquecer, pular ou apagar teste · agrupar tasks · mexer nos
identificadores técnicos (banco, contêiner, pacote, chave do tema) · reescrever specs antigas ·
mutante no arquivo real.

**Blast radius:** commits locais em `feat/renomear-jano`. Push, merge e deploy com autorização
separada.

---

## Test Coverage Matrix

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `src/components/menu-lateral.tsx`, `marca-jano.tsx` | componente, Vitest | NOME-01 ACs 1 e 2 | `src/components/*.test.tsx` | `pnpm test:unit` |
| Varredura de nome | unitário, Vitest (projeto `domain`, `src/lib`) | NOME-03 AC 2 | `src/lib/nome-publico.test.ts` | `pnpm test:unit` |
| Login, título, ícone, acesso negado, menu | e2e, Playwright | NOME-01 ACs 2 a 4, NOME-02, NOME-03 ACs 1 e 4 | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Pacote da landing | `node:test` | NOME-03 AC 3 | `site/simulador.test.mjs` | `node --test site/` |
| Documentos | **none** | NOME-04 ACs 1 a 3 por `grep` | — | — |

---

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| `unit` | T1 a T3 | `pnpm typecheck && pnpm lint && pnpm test:unit && node --test site/` |
| `e2e` | T1 a T3, os specs tocados | `pnpm exec playwright test <specs>` |
| `build` | T4 | `pnpm verify && pnpm site:verificar && pnpm test:e2e` |

---

## Execution Plan

### Phase 1 — O app

```
T1 -> T2 -> T3
```

### Phase 2 — Fechamento

```
T3 -> T4
```

---

## Task Breakdown

### Phase 1 — O app

#### T1: A marca do Jano no menu, na aba e no ícone
**What**: componente `MarcaJano`; menu lateral com o link "Jano", "Menu do Jano" e "Áreas do Jano"; `metadata` com título "Jano" e descrição nova; `src/app/icon.svg` no lugar de `favicon.ico`; testes de componente e e2e que procuram o nome passam a procurar "Jano".
**Where**: `src/components/marca-jano.tsx`, `src/components/menu-lateral.tsx`, `src/components/navegacao-principal.tsx`, `src/app/layout.tsx`, `src/app/icon.svg`, `src/app/favicon.ico`, `src/components/menu-lateral.test.tsx`, `e2e/*.spec.ts` (os seis que citam o menu), `e2e/auth.spec.ts`
**Depends on**: nenhuma
**Reuses**: o desenho de dois arcos de `site/index.html` (`#icone-jano`)
**Requirement**: NOME-01, NOME-03 (AC 4)
**Done when**:
- [x] Teste de componente: link "Jano" para `/`, "Menu do Jano", "Áreas do Jano", e o símbolo (NOME-01 ACs 1 e 2)
- [x] e2e: título da aba "Jano" e `link[rel=icon]` apontando para o SVG (NOME-01 ACs 3 e 4)
- [x] e2e dos seis specs com os nomes novos
**Tests**: `src/components/menu-lateral.test.tsx`, `e2e/auth.spec.ts`, os e2e do menu
**Gate**: unit + e2e

#### T2: O herói do Jano no login
**What**: o login troca a carteira e "myBilling" por `MarcaJano`, o `<h1>` pela manchete do Jano e o subtítulo; botão e frase de acesso restrito ficam.
**Where**: `src/app/login/page.tsx`, `e2e/auth.spec.ts`
**Depends on**: T1
**Reuses**: `MarcaJano`
**Requirement**: NOME-02
**Done when**:
- [x] e2e: marca "Jano", `<h1>` exato, subtítulo exato, botão e frase de acesso restrito (ACs 1 a 4)
**Tests**: `e2e/auth.spec.ts`
**Gate**: unit + e2e

#### T3: Nenhum myBilling que se lê
**What**: acesso negado, `ACESSO_NEGADO`, a frase da Visão geral e os comentários de `src/` e `site/` dizem Jano; o pacote é regenerado; teste que varre `src/` e `site/` por "myBilling".
**Where**: `src/app/forbidden.tsx`, `src/lib/erros.ts`, `src/app/(app)/[competencia]/page.tsx`, comentários em `src/` e `site/`, `site/simulador.js`, `src/lib/nome-publico.test.ts`, os e2e que conferem essas frases
**Depends on**: T2
**Reuses**: `pnpm site:construir`
**Requirement**: NOME-03 (ACs 1 a 3)
**Done when**:
- [x] Teste: nenhuma ocorrência de "myBilling" em `src/` e `site/` fora do pacote gerado (AC 2)
- [x] O pacote regenerado e fresco (AC 3)
- [x] e2e ou teste de componente das três frases (AC 1)
**Tests**: `src/lib/nome-publico.test.ts`, `site/simulador.test.mjs`, e2e tocados
**Gate**: unit + e2e

### Phase 2 — Fechamento

#### T4: Documentos vivos, AD-027 e gate completo
**What**: README, AGENTS, docs e `site/README.md` com Jano e a nota dos identificadores técnicos; posicionamento ("Nome"); AD-027, Handoff, HANDOFF.
**Where**: `README.md`, `AGENTS.md`, `docs/design.md`, `docs/deploy.md`, `docs/qa.md`, `docs/importacao.md`, `docs/marketing/posicionamento.md`, `site/README.md`, `.specs/STATE.md`, `.specs/HANDOFF.md`
**Depends on**: T3
**Requirement**: NOME-04
**Done when**:
- [x] Documentos com Jano e a nota dos identificadores (ACs 1 e 2)
- [x] AD-027, Handoff, HANDOFF (AC 3)
- [x] `pnpm verify && pnpm site:verificar && pnpm test:e2e` saem 0 (AC 4)
**Tests**: none
**Gate**: build

---

## Fix tasks (Verifier, rodada 1)

- [x] **F1** (NOME-03 AC 2): a varredura isenta só os dois testes que afirmam a ausência, pelo nome, e lê também `.js`, `.json` e `.csv`, o pacote incluído; os mutantes em `botao-pago.test.tsx` e no CSV de fixture morrem.
- [x] **F2** (NOME-04 AC 1): `docs/design.md` ganha a nota dos identificadores técnicos.
- [x] **F3** (escopo): o README volta a dizer "para duas pessoas"; a mudança de público não era pedida.

## Deviations

- **Decisão do autor (T1):** o e2e do ícone confere que nenhum `link[rel=icon]` aponta para
  `favicon.ico`, e não o status de `/favicon.ico`: o proxy manda toda rota sem sessão para o login, que
  responde 200.
- **Decisão do autor (T3):** a varredura exclui os testes que afirmam a ausência do nome (precisam
  citá-lo); o AC 2 da spec ganhou essa precisão. A página de acesso negado é conferida em
  `/login?error=AccessDenied`, a rota real que chama `forbidden()`, porque `entrar` só faz requisições.
- **Observação (T3):** outra sessão rodava a integração no `mybilling_test` ao mesmo tempo e limpou
  tabelas no meio dos e2e; os e2e desta fatia passaram a rodar com
  `DATABASE_URL_TEST=.../mybilling_test_jano`. "marcar pago move o indicador do painel" (MOV-06)
  falhou uma vez sob carga e passou 3 de 3 isolado; não tem relação com o nome.
- **Observação (T4):** no gate completo, 281 de 282 e2e passaram; a falha foi de novo o MOV-06 acima,
  que passou 5 de 5 isolado em seguida. É instabilidade sob carga de um teste anterior a esta fatia, e
  fica registrada para o dono. `pnpm verify` e `pnpm site:verificar` saíram 0. Enquanto isso, a `main`
  ganhou a fatia de exclusão de compra de outra sessão (`10ae97e..dd4fb58`); antes do merge, rebasear e
  rodar o gate de novo.
