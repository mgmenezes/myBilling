# Validation: formulario-pela-coluna - FAIL ❌ (rodada 1)

**Data**: 2026-10-31
**Spec**: `.specs/features/formulario-pela-coluna/spec.md`
**Faixa do diff**: `e39eeae..72611db` (`ed7bf63` spec, `72611db` correção e testes)
**Verificador**: sub-agente independente (autor ≠ verificador)

Veredito FAIL por um mutante sobrevivente e por um desvio do edge case "o par de dias do cartão novo segue o mesmo ponto de virada". As 11 ACs têm teste que as discrimina; as duas pendências são pequenas e estão no fim.

---

## Conclusão das tarefas

Escopo Médio: sem `tasks.md`. Um commit de correção (`72611db`) com os testes. Os dois componentes têm `@container` no `<form>` e `@md:` no lugar de `sm:` nos pares.

| Item | Status | Notas |
| --- | --- | --- |
| `form-lancamento-avulso.tsx` | ✅ | `@container` em `:257`; pares em `:312` e `:405` |
| `form-compra.tsx` | ✅ | `@container` em `:284`; pares em `:344`, `:378`, `:551`; dias do cartão novo em `:447` |
| `cadastro-de-meio-inline.tsx` (cartão novo do Avulso) | ⚠️ não tocado | `:165` ainda usa `sm:flex-row`; ver Gap 1 |

---

## Acceptance Criteria ancoradas na spec

Todos os testes estão em `e2e/formulario-pela-coluna.spec.ts`. Os ajudantes: `posicaoDosPares` (`:121`) compara `x`/`y` das caixas dos dois controles; `rotulosEmUmaLinha` (`:157`) e `atalhosEmUmaLinha` (`:166`) contam os topos distintos dos retângulos do `Range`; `nomeInteiroNoSeletor` (`:175`) mede o texto por `measureText` contra a largura útil do `<select>`.

### FPC-01 - um campo por linha na coluna estreita

| Critério | Resultado esperado na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 Avulso < 448 px | cada campo dos 2 pares em linha própria, o segundo abaixo | `:216` `expect(await posicaoDosPares(form, PARES[qual])).toEqual(esperado(PARES[qual], false))`; guarda de largura `:215` `expect(width).toBeLessThan(448)` | ✅ |
| AC2 Parcelado < 448 px | idem, 3 pares | `:216` (qual = Parcelado); `:252` com o cadastro de categoria aberto | ✅ |
| AC3 rótulo e "+ novo"/"+ nova" numa linha | 1 linha | `:217` `rotulosEmUmaLinha`, `:161` `expect(linhasDeTexto(alvo)).toBe(1)`; `:218` `atalhosEmUmaLinha`, `:170` `.toBe(1)`; Receita `:233` e `:237` `.toBe(1)` | ✅ |
| AC4 nome de 23 caracteres inteiro | sem corte | `:195` `expect(medida.texto).toBe(NOME_LONGO)`; `:197` `expect(medida.largura + 24).toBeLessThanOrEqual(medida.disponivel)` | ✅ |
| AC5 coluna da Visão geral, 1.280 a 1.920 px | ACs 1 a 4 nos dois formulários | `:204-221`, laço `[1920, 1280] x [Avulso, Parcelado]` | ✅ |

Juízo sobre os ajudantes:

- `linhasDeTexto` conta topos distintos de `getClientRects()` sobre o conteúdo do rótulo. Um rótulo quebrado em duas linhas gera dois topos, então prova o "uma linha" da spec. A busca do rótulo é `^texto$` com `toHaveCount(1)`, que impede casar o rótulo errado.
- `nomeInteiroNoSeletor` mede o texto com a fonte computada do `<select>` e o compara com `clientWidth` menos o padding, descontando 24 px para a seta. É uma aproximação do corte nativo, não uma medida do pixel desenhado. Serve de sensor do AC4: a folga de 24 px é uma constante do autor, que a spec não define. Marcado como observação, não como gap: o nome só deixaria de caber se o seletor encolhesse muito, e o par empilhado dá ~311 px.
- Teste de largura do formulário (`:215`) amarra o cenário: se a coluna mudar de largura, o teste acusa o fixture e não passa por engano.

### FPC-02 - lado a lado onde o formulário é largo

| Critério | Resultado esperado | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 Avulso ≥ 448 px | segundo campo ao lado do primeiro, mesma faixa | `:279` `toEqual(esperado(PARES[qual], true))`, guarda `:278` `toBeGreaterThanOrEqual(448)` | ✅ (guarda de regressão, ver abaixo) |
| AC2 Parcelado ≥ 448 px | idem | `:279` (qual = Parcelado) | ✅ (guarda de regressão) |
| AC3 diálogo de Lançamentos em 1.280 px | pares lado a lado nos dois | `:272-281`; `:280` rótulos numa linha | ✅ (guarda de regressão) |
| AC4 Visão geral 768 a 1.279 px | pares lado a lado nos dois | `:283-291` em 1.000 px, `:290` `toEqual(esperado(PARES[qual], true))` | ✅ (guarda de regressão) |

Os quatro testes de FPC-02 passam também com o código antigo (`sm:`), porque a janela de 1.000 px e a de 1.280 px do diálogo já passavam do `sm:`. Isso é esperado: FPC-02 pede "como hoje". Eles não ficam sem função: o sensor M4 (remover `@container` do Avulso) é morto justamente por `:272` e M2/M5 (limiar errado) são mortos pelo FPC-03. Sem esses testes, um limiar acima da largura do diálogo (por exemplo `@4xl`) não seria pego pelo FPC-01. AC4 está provado só em 1.000 px (um ponto dentro da faixa de 768 a 1.279 px); os dois extremos (768 e 1.279) não têm teste de largura própria. Ver observação O2.

### FPC-03 - o limiar é o do formulário

| Critério | Resultado esperado | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 decide pela largura do formulário | referência é o formulário, não a janela | `:309-319` com janelas de 479/480 px, ambas abaixo de `sm:` (640 px): só um limiar de contêiner vira o par na segunda | ✅ (provado pelo sensor M1b/M1c) |
| AC2 447 px empilha | estreito, um campo por linha | `:312-314` `toBeLessThan(448)`, `toBeGreaterThanOrEqual(447)`, `toEqual(esperado(..., false))` | ✅ |
| AC3 448 px lado a lado | lado a lado | `:317-319` `poll(width).toBeGreaterThanOrEqual(448)`, `toBeLessThan(449)`, `toEqual(esperado(..., true))` | ✅ |

Resposta ao ponto do autor: as janelas de 479 e 480 px provam que o limiar é a largura do formulário e não a da janela. Nas duas, `sm:` (640 px) não dispara, então com o código antigo o par fica empilhado também em 480 px e o `:319` falha. Confirmado pelo sensor: ao trocar `@md:` por `sm:`, o teste FPC-03 do Avulso falhou e o do Parcelado também (rodados separados porque o arquivo é `serial`). Os dois lados do limiar estão colados (447 e 448, com as larguras medidas e limitadas por `toBeLessThan(449)`), como pedem L-029, L-048 e L-052.

**Status**: ✅ todas as ACs cobertas com discriminação. Sem lacuna de spec-precisão: todas as medidas têm valor na spec (448, 447, 1 linha, 23 caracteres).

---

## Edge cases da spec

- [x] Nome longo: `:197` (formulário estreito). Formulário largo: o seletor usa a largura que tem; sem teste de corte, e a spec não exige.
- [x] Modo Receita: `:224-242`, rótulo "Onde o dinheiro cai" numa linha, mesmo com o cadastro de meio aberto.
- [x] Cadastro inline aberto: `:244-254` (Parcelado, categoria) e `:235-241` (Avulso, meio). O par continua empilhado.
- [ ] **O par de dias do cartão novo segue o mesmo ponto de virada**: NÃO tratado no Avulso (Gap 1) e sem teste no Parcelado (Gap 2).
- [x] 375 px: `:256-265`. Guarda de regressão: passa também com `sm:`.
- [x] 640 a 767 px com menu em barra: a Visão geral tem formulário largo; o teste de 1.000 px cobre o mesmo mecanismo. Os 640 a 767 px não têm teste próprio (O2).
- [ ] Erro de validação num campo e par alinhado pelo topo: sem teste. A spec não exige uma medida; observação O3.

---

## Sensor de discriminação

Executado num `git worktree` descartável em `72611db` (`pnpm install --offline --frozen-lockfile`), com o Playwright de `e2e/formulario-pela-coluna.spec.ts`. O arquivo é `serial`: a primeira falha interrompe o resto, então cada mutante que mata é identificado pelo primeiro teste que falha.

| Mutante | Arquivo:linha | Descrição | Morto? |
| --- | --- | --- | --- |
| M1 | `src/components/form-lancamento-avulso.tsx:312`, `:405` e `src/components/form-compra.tsx:344`, `:378`, `:447`, `:551` | volta todos os `@md:flex-row` para `sm:flex-row` (a regressão original) | ✅ morto por `e2e/formulario-pela-coluna.spec.ts:209` (1.920 px Avulso); isolado, `-g FPC-03` morre em `:306` (Avulso) e `-g "Parcelado em 447"` morre em `:306` |
| M2 | os mesmos pares do Avulso e do Parcelado, exceto `:447` | `@md` vira `@lg` (512 px) | ✅ morto por `:306` (448 px lado a lado) |
| M3 | `src/components/form-compra.tsx:447` | só o par de dias do cartão novo do Parcelado volta para `sm:flex-row` | ❌ **sobreviveu** (13 testes passam) |
| M4 | `src/components/form-lancamento-avulso.tsx:257` | remove `@container` do `<form>` do Avulso | ✅ morto por `:272` (diálogo, Avulso) |
| M5 | os mesmos pares de M2 | `@md` vira `@sm` (384 px) | ✅ morto por `:306` (447 px empilhado) |

**Profundidade**: leve (5 mutações) | **Resultado**: 4 de 5 mortos, M3 sobrevive: ❌ FAIL

Isolamento: o worktree descartável foi removido com `git worktree remove --force` e a ausência confirmada em `git worktree list`. O `git status --porcelain` da árvore real é igual ao registrado antes (vazio), depois de restaurar `next-env.d.ts` com `git checkout --`.

---

## Verificação independente do gap de cobertura

Sonda no scratch (descartada com ele), com o Avulso e o Parcelado abertos na coluna da Visão geral em 1.920 px, "+ novo" e Tipo "Cartão de crédito":

- Avulso: "Dia de fechamento" e "Dia de vencimento" ficam **lado a lado**, 151,5 px cada, num formulário de 335 px (`cadastro-de-meio-inline.tsx:165` usa `sm:flex-row`).
- Parcelado: os mesmos dois campos ficam **empilhados**, 311 px cada (`form-compra.tsx:447` usa `@md:`).

O rótulo ainda cabe em uma linha com 151 px, então o defeito visível do dono não reaparece. Mas o mesmo cadastro de cartão se comporta de dois jeitos na mesma coluna, e o edge case da spec ("o par de dias do cartão novo segue o mesmo ponto de virada") não se cumpre no Avulso. O componente `CadastroDeMeioInline` é compartilhado com a importação (`src/components/importacao/passo-pendencias.tsx:162` e `:208`), que não tem `@container` por perto: trocar o `sm:` lá por `@md:` sem um contêiner deixaria o par sempre empilhado na importação. A correção pede um cuidado, não uma troca cega.

---

## Qualidade do código

| Princípio | Status |
| --- | --- |
| Mínimo de código | ✅ 8 linhas trocadas, nenhuma abstração nova |
| Mudanças cirúrgicas | ✅ só os dois componentes e o teste novo |
| Sem escopo extra | ✅ nenhuma mudança de banco, rota ou texto |
| Segue os padrões | ✅ mesmo padrão de `form-recorrencia.tsx` (`FIXCOL-07`) que a spec cita; porém `form-recorrencia.tsx:404`, `:460`, `:500`, `:559` seguem com `sm:` (fora de escopo, "já resolvido em outra ramificação") |
| Asserções batem com a spec | ✅ ACs 1 a 5 e FPC-03 medem os valores da spec |
| Todo teste mapeia para AC ou edge case | ✅ os 13 testes citam FPC-01, 02 ou 03 |
| Diretrizes documentadas | ✅ `AGENTS.md`: sem dado real (nome genérico "Pessoa A com nome longo", e-mail `example.com`), sem `skip`, sem enfraquecer assertion |
| Cobertura dos lugares que montam os formulários | ⚠️ `cadastro-de-lancamento.tsx` (Visão geral e diálogo) coberto; o cartão novo do Avulso é montado por um componente que o diff não tocou (Gap 1) |

Locais que montam os formulários (`rg FormCompra|FormLancamentoAvulso`): `src/app/(app)/[competencia]/cadastro-de-lancamento.tsx` (único montador de produção, usado na Visão geral e no diálogo de Lançamentos); `filtros-de-lancamentos.tsx` e `importacao/*` casaram só pelo componente `CadastroDeMeioInline`, não pelos formulários. Comportamento fora do layout não mudou: os 32 testes e2e vizinhos (`lancamento-avulso`, `compra-parcelada`, `acessibilidade`) passam.

---

## Gate

- **Comando**: `pnpm verify` decomposto, com `DATABASE_URL_TEST` apontando para o banco de teste local (URL não registrada).
- `pnpm typecheck`: saída 0.
- `pnpm lint`: saída 0 (318 arquivos).
- `pnpm test:unit`: saída 0, 109 arquivos, **1705 testes passaram**, 0 falhas, 100% de branches em `src/domain` (355/355).
- `pnpm test:integration`: saída 0, 23 arquivos, **364 testes passaram**, 0 falhas.
- `pnpm build`: saída 0.
- e2e `e2e/formulario-pela-coluna.spec.ts`: saída 0, **13 passaram** (porta 3100).
- e2e vizinhos (`lancamento-avulso`, `compra-parcelada`, `acessibilidade`): saída 0, **32 passaram**.
- Pulados: 0. Contagem de testes unitários e de integração não caiu: o diff não removeu nem alterou testes existentes (`git diff --stat`: só um arquivo novo de teste).
- Testes novos: +13 e2e.

---

## Planos de correção

### Fix 1 (Major): o par de dias do cartão novo no Avulso não segue o ponto de virada

- **Causa**: `src/components/cadastro-de-meio-inline.tsx:165` usa `sm:flex-row`, da janela, e a coluna estreita a 1.920 px mostra os dois campos lado a lado a 151 px cada.
- **Tarefa**: fazer o par virar por contêiner dentro do Avulso sem quebrar a importação. Opção mínima: `CadastroDeMeioInline` recebe a classe do par por prop (padrão `sm:flex-row`, o Avulso passa `@md:flex-row`), ou o par usa uma variante de contêiner nomeada que a importação também declare. Teste: no Avulso, em 1.920 px na coluna, "Dia de fechamento" e "Dia de vencimento" empilhados; em 1.000 px, lado a lado.
- **Prioridade**: Major (o edge case da spec e a consistência entre as abas Avulso e Parcelado).

### Fix 2 (Minor): o par de dias do cartão novo do Parcelado não tem teste (M3 sobreviveu)

- **Causa**: nenhum teste abre o cadastro de cartão novo e mede os dois dias.
- **Tarefa**: em `e2e/formulario-pela-coluna.spec.ts`, abrir "+ novo" no Parcelado, escolher Tipo "Cartão de crédito" e afirmar os dois dias empilhados em 1.920 px (e lado a lado em 1.000 px). Mata M3, e vale também para o Avulso depois do Fix 1.
- **Prioridade**: Minor.

---

## Observações que não bloqueiam

- O1. Os testes de FPC-02 e o de 375 px passam no código antigo; são guardas de regressão legítimas (a spec diz "como hoje"), e M4 mostra que o de `:272` pega a perda do `@container`.
- O2. FPC-02 AC4 e a janela de 640 a 767 px estão provados em 1.000 px, não nos extremos (768 e 1.279 px; 640 e 767 px). O limiar de contêiner torna os extremos equivalentes ao ponto medido, e o FPC-03 prova os dois lados do limiar real; custo de acrescentar os extremos é baixo se o dono quiser a regra "de X a Y px" colada nos dois fins (L-048).
- O3. "Erro de validação: par continua alinhado pelo topo" é edge case sem medida.
- O4. `nomeInteiroNoSeletor` usa 24 px de folga para a seta, constante do autor.
- O5. O arquivo `serial` esconde falhas posteriores quando uma falha antes; para diagnóstico, rodar com `-g`.

---

## Atualização da rastreabilidade

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| FPC-01 | Verified | ✅ confirmado (ACs 1 a 5); a linha de rastreabilidade não cita o cartão novo, edge case aberto no Fix 1 |
| FPC-02 | Verified | ✅ confirmado, como guarda de regressão |
| FPC-03 | Verified | ✅ confirmado, discrimina `sm:` (M1) e limiares vizinhos (M2, M5) |

---

## Lições a registrar

Nada foi escrito em `.specs/lessons.json` nem em `.specs/LESSONS.md` (outra ramificação está adicionando L-053 a L-057; a rebase vem depois). O orquestrador registra com `lessons.py add` depois dela.

### Lição A

- **Texto**: Ao trocar o ponto de virada de um padrão de layout, procurar todo componente filho compartilhado que repete o mesmo padrão; trocar só os formulários pai deixa o filho com a referência antiga.
- **Sinal**: `surviving_mutant`
- **Fonte**: `src/components/form-compra.tsx:447` (M3 sobreviveu); desvio em `src/components/cadastro-de-meio-inline.tsx:165`
- **Escopo**: `layout,componentes`
- **Evidência**: M3 (par de dias do cartão novo do Parcelado voltou para `sm:`) deixou os 13 testes passando; a sonda mediu o par de dias do Avulso lado a lado a 151 px na coluna de 335 px, e o do Parcelado empilhado a 311 px.

### Lição B

- **Texto**: Edge case de uma spec que nomeia um elemento aberto por ação ('+ novo', cartão novo) precisa de teste que abra a ação e meça o elemento, em cada formulário que a tem; medir só o estado inicial deixa o elemento aberto regredir.
- **Sinal**: `ac_gap`
- **Fonte**: `spec.md` edge case "Cadastro inline aberto por '+ novo' ou '+ nova'" (par de dias do cartão novo)
- **Escopo**: `e2e,layout`
- **Evidência**: `e2e/formulario-pela-coluna.spec.ts:224-254` abre o cadastro de meio e o de categoria e mede rótulos e pares, mas nenhum abre o Tipo "Cartão de crédito"; M3 sobreviveu.

---

## Resumo

**Geral**: ❌ Não pronto (rodada 1; duas pendências pequenas)

**Checagem ancorada na spec**: 11 de 11 ACs com assertion que bate com o valor da spec, 0 lacunas de spec-precisão
**Sensor**: 4 de 5 mutantes mortos, 1 sobrevivente (M3, `src/components/form-compra.tsx:447`)
**Gate**: 1705 unitários e 364 de integração passaram; e2e da feature 13 passaram; e2e vizinhos 32 passaram

**O que funciona**: o limiar é do formulário, não da janela, com os dois lados colados (447 e 448 px) e a regressão original (`sm:`) morta por três testes; um campo por linha na coluna a 1.920 e 1.280 px; rótulos, atalhos e nome de 23 caracteres medidos; pares lado a lado no diálogo e na Visão geral abaixo de 1.280 px; o gate inteiro verde.

**Problemas**: Fix 1 (o cartão novo do Avulso ainda vira pela janela) e Fix 2 (sem teste para o par de dias do cartão novo).

**Próximos passos**: implementar Fix 1 e Fix 2 num commit, reverificar.
