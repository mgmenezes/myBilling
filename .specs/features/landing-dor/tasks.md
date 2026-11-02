# Landing pela dor — Tasks

**Spec**: `.specs/features/landing-dor/spec.md`
**Status**: Aprovadas, em execução
**Total**: 7 tasks em 4 fases

> **Por que os testes mudam antes da página.** O teste estrutural recorta cada seção do `id` de uma
> até o `id` da seguinte na lista. Mover ou inserir uma seção com esse recorte faz o texto de uma
> vazar para a outra, e o teste passa ou falha pelo motivo errado. T2 troca o recorte e lista toda
> seção, verde no HTML de hoje; só então a página se move.
>
> **O que o teste alcança e o que não alcança.** O teste estrutural prova o que é texto: ordem das
> seções, cinco figuras numa seção só, nenhuma porcentagem fora dela, `<details>` fechados, nenhuma
> frase que fecha o nicho. O verificador de navegador prova rolagem horizontal e axe em 360, 768 e
> 1.440 px, claro e escuro. Nenhum teste prova que o texto convence: isso é leitura do dono.

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

Proibições absolutas: commitar antes do gate passar · enfraquecer, pular ou deletar teste para passar · agrupar tasks em um commit · "já que estou aqui" · dado financeiro real em qualquer arquivo (AD-009) · a palavra "sincroniz" em qualquer frase da página, mesmo negada.

**Blast radius:** a aprovação destas tasks autoriza implementação e commits **locais** no branch `feat/landing-dor`. `git push`, deploy na Vercel, merge e qualquer operação remota exigem autorização explícita e separada.

---

## Test Coverage Matrix

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `site/index.html`, `site/estilos.css` (estrutura) | estrutural, `node:test` | DOR-01 ACs 1 a 4; DOR-02 ACs 1 a 5 e 7; DOR-03 ACs 1 a 5; DOR-04 ACs 1 a 5; DOR-05 ACs 1 a 5 | `site/*.test.mjs` | `node --test site/` |
| `site/index.html` (renderizado) | navegador, Playwright + axe | DOR-02 AC 6 (largura e tamanho de fonte do destaque em 768 px); CAMP-03 AC 6 em 360, 768 e 1.440, claro e escuro | `site/verificar-navegador.mjs` | `node site/verificar-navegador.mjs` |
| `docs/marketing/*.md`, `.specs/**` | **none** | Texto lido pelo dono; DOR-06 ACs 1 a 5 conferidos por `grep` na task | — | — |

---

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| `docs` | task só de texto | `pnpm lint` |
| `site` | task que mexe em `site/` | `pnpm lint && node --test site/` |
| `navegador` | task que muda layout ou acrescenta seção | `pnpm lint && node --test site/ && node site/verificar-navegador.mjs` |
| `build` | última task | `pnpm verify && pnpm site:verificar` |

Pré-requisito do `build`: `pnpm db:up`. Pré-requisito do `navegador`: Chrome instalado na máquina.

---

## Execution Plan

Quatro fases: o texto que manda, os testes antes da página, a página, o fechamento.

### Phase 0 — O texto que manda

```
T1
```

### Phase 1 — Os testes antes da página

```
T1 -> T2
```

### Phase 2 — A página

```
T2 -> T3 -> T4 -> T5 -> T6
```

### Phase 3 — Fechamento

```
T6 -> T7
```

---

## Task Breakdown

### Phase 0 — O texto que manda

#### T1: Posicionamento, copy e kit pelo público mais largo
**What**: `docs/marketing/posicionamento.md`: "Para quem" passa a quem paga as contas da casa, sozinho ou a dois, mantendo os três estados; "Números de mercado" vira "até cinco por peça, num bloco só" e lista os cinco da página e a reserva com fonte, coleta, publicação e URL; regra 8 do tom sem o casal. `docs/marketing/copy-landing-simulador.md` entra no repositório com a Seção 8 trocada pelos cinco números. `docs/marketing/kit-de-copy.md` perde a headline "Feito por um casal...".
**Where**: `docs/marketing/posicionamento.md`, `docs/marketing/copy-landing-simulador.md`, `docs/marketing/kit-de-copy.md`
**Depends on**: nenhuma
**Reuses**: a tabela de dados conferidos em `~/.claude/plans/sprightly-inventing-sunrise.md`
**Requirement**: DOR-06 (ACs 1 a 4)
**Tools**: nenhuma
**Done when**:
- [ ] "Para quem" sem fechar o nicho; três estados mantidos (AC 1)
- [ ] Regra "até cinco" e a tabela com os cinco mais a reserva (AC 2)
- [ ] Regra 8 do tom sem o casal (AC 3)
- [ ] Copy no repositório com a Seção 8 nova; kit com sete headlines (AC 4)
- [ ] `grep -c "R\$" docs/marketing/*.md` só com fixtures da spec do MVP
**Tests**: none
**Gate**: docs

### Phase 1 — Os testes antes da página

#### T2: Recortar cada seção pelo próprio fechamento e listar toda seção
**What**: `site/estrutura.test.mjs`: helper `secao(id)` que recorta do `<section`/`<footer` com o `id` até o fechamento; os cinco recortes por `indexOf` passam a usá-lo; teste novo de que toda `<section>` tem `id` na lista `SECOES`; o `\bjá\b` vira `(?<!\p{L})já(?!\p{L})` com a flag `u`. Verde no HTML atual.
**Where**: `site/estrutura.test.mjs`
**Depends on**: T1
**Reuses**: `SECOES` e `textoVisivel` do próprio arquivo
**Requirement**: DOR-01
**Tools**: nenhuma
**Done when**:
- [ ] Teste: `secao("inicio")` termina no `</section>` do hero, e `secao("x")` falha (AC 1)
- [ ] Teste: `<section id="x">` injetada no HTML reprova (AC 2)
- [ ] Teste: "já existe" em `a-seguir` reprova (AC 3)
- [ ] `node --test site/` verde sem mudar `index.html` (AC 4)
**Tests**: `site/estrutura.test.mjs` (DOR-01 ACs 1 a 4)
**Gate**: site

### Phase 2 — A página

#### T3: Reunir cinco números de mercado numa seção só
**What**: `site/index.html`: `#numeros` com título "Não é só na sua casa" e as cinco figuras (58%, 61%, 47%, 82%, 45%) com `<cite>`; a seção vai para logo depois de `onde-quebra`; `SECOES` e o teste de ordem acompanham. `site/estilos.css`: grade de dois em 768 e seis em 1.024 com `span 2` e as duas últimas `span 3`, `minmax(0, 1fr)`. Testes: 1 a 5 figuras, todas em `#numeros`, `<cite>` com ano, nenhuma porcentagem nem "milhões" fora da seção, os valores e as fontes na ordem.
**Where**: `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`
**Depends on**: T2
**Reuses**: `figure.numero`, `.numeros` e `secao()` de T2
**Requirement**: DOR-03
**Tools**: nenhuma
**Done when**:
- [ ] Teste: 1 a 5 figuras, todas dentro de `secao("numeros")` (AC 1)
- [ ] Teste: cada `<cite>` com fonte e ano (AC 2)
- [ ] Teste: nenhum `%` nem "milhões" fora da seção (AC 3)
- [ ] Teste: os cinco valores e as cinco fontes, na ordem (AC 4)
- [ ] Teste: `numeros` entre `onde-quebra` e `comparativo` (AC 5)
- [ ] Teste "CAMP-02 AC 5" renomeado para "revisto por DOR-03"
**Tests**: `site/estrutura.test.mjs` (DOR-03 ACs 1 a 5)
**Gate**: navegador

#### T4: Abrir a landing pela dor
**What**: `site/index.html`: a nota do hero; em `onde-quebra`, o parágrafo `lead`, o subtítulo "Seis situações que quem paga as contas reconhece", o primeiro cartão com `dor-destaque`, a sexta cena começando com "Quando são duas pessoas"; o parágrafo de fecho do comparativo; `secao-suave` sai de `numeros` e vai para `comparativo`. `site/estilos.css`: `.dor-destaque` ocupando a fileira em 768 px com a cena em `clamp(1.125rem, 1rem + 0.6vw, 1.5rem)`, as duas últimas cenas em `span 3`. `site/verificar-navegador.mjs`: em 768 px, o destaque tem a largura da grade e a fonte da cena maior que a do segundo cartão.
**Where**: `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`, `site/verificar-navegador.mjs`
**Depends on**: T3
**Reuses**: `.dores`, `.dor`, `.secao-cabeca`; o verificador já mede larguras por elemento
**Requirement**: DOR-02; DOR-05 (AC 5)
**Tools**: nenhuma
**Done when**:
- [ ] Teste: ordem das nove seções e nenhuma outra (AC 1)
- [ ] Teste: `<h1>` exato (AC 2)
- [ ] Teste: a nota do hero (AC 3)
- [ ] Teste: o `lead` com as duas frases (AC 4)
- [ ] Teste: seis cenas, só a primeira com `dor-destaque` (AC 5)
- [ ] Verificador: largura e fonte do destaque em 768 px (AC 6)
- [ ] Teste: tabela mantida e o parágrafo de fecho (AC 7)
- [ ] Teste: subtítulo novo e a sexta cena (DOR-05 AC 5)
**Tests**: `site/estrutura.test.mjs` (DOR-02 ACs 1 a 5 e 7; DOR-05 AC 5), `site/verificar-navegador.mjs` (DOR-02 AC 6)
**Gate**: navegador

#### T5: Responder as objeções em perguntas frequentes
**What**: `site/index.html`: `section#perguntas` entre `sua-planilha` e `a-seguir`, nove `<details>` fechados com a copy da Seção 10 (sem a pergunta do simulador), `SECOES` acompanha. `site/estilos.css`: `.perguntas` com borda em `--line`, `summary` em flex com "+" monoespaçado que gira 45° aberto, resposta em `--ink-muted`, `overflow-wrap: anywhere`.
**Where**: `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`
**Depends on**: T4
**Reuses**: `.secao-cabeca`, `.moldura`, `:focus-visible` global
**Requirement**: DOR-04
**Tools**: nenhuma
**Done when**:
- [ ] Teste: `perguntas` entre `sua-planilha` e `a-seguir`, `<h2>` exato (AC 1)
- [ ] Teste: ao menos seis `<details>` sem `open`, `<summary>` primeiro e terminando em "?", um `<p>` depois (AC 2)
- [ ] Teste: os seis temas no texto da seção (AC 3)
- [ ] Teste: nenhuma palavra proibida; a resposta da fatura começa com "Não." (AC 4)
- [ ] Teste: um `<script>` só (AC 5)
**Tests**: `site/estrutura.test.mjs` (DOR-04 ACs 1 a 5)
**Gate**: navegador

#### T6: Dizer o que o produto é hoje, para quem paga as contas da casa
**What**: `site/index.html`: hero sem "Para dois"; `#para-dois` vira "Sozinho ou a dois" com as três definições novas; rodapé com `ul.incluido` e a linha de status "em uso hoje, com contas de verdade, e está abrindo para mais casas". `site/estilos.css`: `.incluido`. Testes: status, nenhuma ocorrência de "casal"/"casais" com fronteira de palavra, "Para dois" ausente do hero, `<h2>` e `<dt>` da seção, `inverso` uma vez, a lista do rodapé.
**Where**: `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`
**Depends on**: T5
**Reuses**: `dl.trio`, `.rodape`, `.rodape-nota`
**Requirement**: DOR-05 (ACs 1 a 4)
**Tools**: nenhuma
**Done when**:
- [ ] Teste: "em uso hoje", "abrindo para mais casas", sem "por um casal", "de um casal", "nasceu de" (AC 1)
- [ ] Teste: sem "casal"/"casais"; hero sem "Para dois" (AC 2)
- [ ] Teste: `<h2>` "Sozinho ou a dois", três `<dt>`, `inverso` uma vez (AC 3)
- [ ] Teste: `ul.incluido` com três itens e sem `R$` (AC 4)
- [ ] Teste "CAMP-02 AC 6" renomeado para "revisto por DOR-05"
**Tests**: `site/estrutura.test.mjs` (DOR-05 ACs 1 a 4)
**Gate**: site

### Phase 3 — Fechamento

#### T7: Revisar as specs da campanha, registrar o AD-025 e apontar o handoff
**What**: `campanha-lista-de-espera/spec.md` (CAMP-02 ACs 1, 5 e 6) e `campanha-o-que-vem/spec.md` (VEM-02 AC 7) anotados como revistos por esta fatia; `.specs/STATE.md` com AD-025 (landing pela dor: cinco números numa seção, público sem fechar o nicho, história de origem fora da página, teste exaustivo de seções) e o Handoff; `.specs/HANDOFF.md` apontando para cá; `site/README.md` com o parágrafo "Verificar" atualizado (FAQ, cinco números). Gate completo.
**Where**: `.specs/features/campanha-lista-de-espera/spec.md`, `.specs/features/campanha-o-que-vem/spec.md`, `.specs/STATE.md`, `.specs/HANDOFF.md`, `site/README.md`
**Depends on**: T6
**Reuses**: o formato dos ADs anteriores em `STATE.md`
**Requirement**: DOR-06 (ACs 5 e 6)
**Tools**: nenhuma
**Done when**:
- [ ] Specs antigas anotadas; AD-025 e Handoff em `STATE.md`; `HANDOFF.md` aponta para cá (AC 5)
- [ ] `pnpm db:up && pnpm verify && pnpm site:verificar` saem 0 (AC 6)
**Tests**: none
**Gate**: build

---

## Deviations

Nenhuma até agora. Toda saída do spec é registrada aqui como `SPEC_DEVIATION` antes do commit.
