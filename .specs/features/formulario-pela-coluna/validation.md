# Validation: formulario-pela-coluna - FAIL ❌ (rodada 2)

**Data**: 2026-10-31
**Spec**: `.specs/features/formulario-pela-coluna/spec.md`
**Faixa do diff**: `e39eeae..ceef4ee` (`ed7bf63` spec, `72611db` correção e testes, `bbe1f10` relatório da rodada 1, `ceef4ee` correções da rodada 1)
**Verificador**: sub-agente independente (autor ≠ verificador), segunda rodada

Os dois gaps da rodada 1 estão fechados no comportamento: o cartão novo do Avulso agora vira pelo formulário, a importação não mudou (medida no navegador) e os testes novos matam M3. O veredito segue FAIL por um único mutante novo, de limiar: o par de dias do cartão novo só está provado com janelas distantes (1.920 e 1.000 px), e trocar `@md` por `@lg` nele, no Avulso ou no Parcelado, deixa a suíte verde. É o mesmo tipo de pendência da rodada 1, pequena, com correção de um teste.

---

## Rodada 1

FAIL por dois gaps, ambos corrigidos em `ceef4ee`:

- **Gap 1 (Major)**: no Avulso, o par de dias do cartão novo, montado por `CadastroDeMeioInline`, seguia `sm:`. Corrigido com a prop `diasPelaLargura`: o Avulso a passa (`src/components/form-lancamento-avulso.tsx:314`), a importação não. Fechado, ver "Gap 1 da rodada 1".
- **Gap 2 (Minor)**: M3 (`form-compra.tsx:447` de volta para `sm:`) sobrevivia. Fechado: M3 agora é morto (M6 abaixo).

As 11 ACs já tinham teste que as discrimina na rodada 1, e M1, M2, M4 e M5 foram mortos.

---

## Conclusão das tarefas

Escopo Médio: sem `tasks.md`. Três commits de código e teste (`72611db`, `ceef4ee`) mais a spec e os relatórios.

| Item | Status | Notas |
| --- | --- | --- |
| `form-lancamento-avulso.tsx` | ✅ | `@container` em `:257`; pares em `:312` e `:406`; `diasPelaLargura` em `:314` |
| `form-compra.tsx` | ✅ | `@container` em `:284`; pares em `:344`, `:378`, `:551`; dias do cartão novo em `:447` |
| `cadastro-de-meio-inline.tsx` | ✅ | prop `diasPelaLargura` (padrão falso) em `:51` e `:81`; `:172` escolhe `@md:flex-row` ou `sm:flex-row` |
| `e2e/formulario-pela-coluna.spec.ts` | ⚠️ | 15 testes; faltam os 447/448 px do par de dias do cartão novo (Gap 1 desta rodada) |

Varredura de outros padrões `sm:`/`md:`/`lg:` nos dois formulários e nos filhos que eles montam (`CadastroInline`, `CadastroDeMeioInline`): sobra um único `sm:flex-row`, em `cadastro-de-meio-inline.tsx:172`, que é o ramo da importação, de propósito. Nada mais ficou por trocar. `form-recorrencia.tsx` segue com `sm:`, fora de escopo.

---

## Acceptance Criteria ancoradas na spec

Todos os testes estão em `e2e/formulario-pela-coluna.spec.ts`. Os ajudantes não mudaram desde a rodada 1: `posicaoDosPares` (`:121`), `esperado` (`:138`), `rotulosEmUmaLinha` (`:157`), `atalhosEmUmaLinha` (`:166`), `nomeInteiroNoSeletor` (`:175`).

### FPC-01 - um campo por linha na coluna estreita

| Critério | Resultado esperado na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 Avulso < 448 px | cada campo dos 2 pares em linha própria | `:216` `expect(await posicaoDosPares(form, PARES[qual])).toEqual(esperado(PARES[qual], false))`; guarda `:215` `expect(width).toBeLessThan(448)` | ✅ |
| AC2 Parcelado < 448 px | idem, 3 pares | `:216` (Parcelado); `:252` com o cadastro de categoria aberto | ✅ |
| AC3 rótulo e "+ novo"/"+ nova" numa linha | 1 linha | `:217` `rotulosEmUmaLinha` e `:161` `.toBe(1)`; `:218` `atalhosEmUmaLinha` e `:170` `.toBe(1)`; Receita `:233` e `:237` | ✅ |
| AC4 nome de 23 caracteres inteiro | sem corte | `:195` `expect(medida.texto).toBe(NOME_LONGO)`; `:197` `expect(medida.largura + 24).toBeLessThanOrEqual(medida.disponivel)` | ✅ |
| AC5 coluna da Visão geral, 1.280 a 1.920 px | ACs 1 a 4 nos dois formulários | `:204-221`, laço `[1920, 1280] x [Avulso, Parcelado]` | ✅ |

### FPC-02 - lado a lado onde o formulário é largo

| Critério | Resultado esperado | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 Avulso ≥ 448 px | segundo campo ao lado do primeiro | `:311-320`, `toEqual(esperado(PARES[qual], true))`, guarda `toBeGreaterThanOrEqual(448)` | ✅ (guarda de regressão) |
| AC2 Parcelado ≥ 448 px | idem | mesmo teste, qual = Parcelado | ✅ (guarda de regressão) |
| AC3 diálogo de Lançamentos em 1.280 px | pares lado a lado nos dois | `:311-320`; morto pelo mutante M4b | ✅ |
| AC4 Visão geral de 768 a 1.279 px | pares lado a lado nos dois | `:322-331` em 1.000 px | ✅ (guarda de regressão) |

### FPC-03 - o limiar é o do formulário

| Critério | Resultado esperado | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 decide pela largura do formulário | referência é o formulário | `:345-358` com janelas de 479 e 480 px, ambas abaixo de `sm:` | ✅ |
| AC2 447 px empilha | um campo por linha | `:349-351` `toBeLessThan(448)`, `toBeGreaterThanOrEqual(447)`, `toEqual(esperado(..., false))` | ✅ |
| AC3 448 px lado a lado | lado a lado | `:354-356` `poll(width).toBeGreaterThanOrEqual(448)`, `toBeLessThan(449)`, `toEqual(esperado(..., true))` | ✅ |

**Status**: ✅ 11 de 11 ACs com assertion que bate com a spec; sem lacuna de spec-precisão.

---

## Edge cases da spec

- [x] Nome longo: `:197`.
- [x] Modo Receita: `:224-242`.
- [x] Cadastro inline aberto: `:244-254` (Parcelado, categoria) e `:235-241` (Avulso, meio).
- [~] **O par de dias do cartão novo segue o mesmo ponto de virada**: o comportamento está certo nos dois formulários e provado em duas janelas (`:273-293`, 1.920 px empilhado e 1.000 px lado a lado, nos dois formulários). O "mesmo ponto de virada" não está provado: ver Gap 1 desta rodada.
- [x] 375 px: `:295-304`.
- [x] 640 a 767 px: coberto pelo mecanismo; sem teste próprio (O2).
- [ ] Erro de validação com par alinhado: sem medida (O3).

### Os dois gaps da rodada 1, verificados

**Gap 1 da rodada 1 (Avulso, par de dias).** Fechado.

- O teste `:273-293` abre "+ novo" (`:265`), escolhe Tipo "Cartão de crédito" (`:268`) e mede os dois dias: `:279-282` `expect(await posicaoDosPares(estreito, [DIAS_DO_CARTAO])).toEqual(esperado([DIAS_DO_CARTAO], false))` em 1.920 px, com guarda `:278` `toBeLessThan(448)`; `:288-291` o mesmo com `true` em 1.000 px, guarda `:287` `toBeGreaterThanOrEqual(448)`.
- Mutantes M7 e M7b (tirar a prop do Avulso; fazer o componente ignorá-la) morrem em `:280`. M8 (`@4xl`) morre em `:289`.

**Importação sem mudança de comportamento.** Verificado no navegador, não só no código. Sonda descartável (cópia do fluxo de `e2e/importacao.spec.ts` até "+ cadastrar" de novembro) mediu os dois dias do cartão no passo 2 da importação, em quatro janelas, com o `cadastro-de-meio-inline.tsx` de `ceef4ee` e com o de `e39eeae` (base), no mesmo scratch:

| Janela | `ceef4ee` | `e39eeae` |
| --- | --- | --- |
| 1.920 px | lado a lado, 295 px | lado a lado, 295 px |
| 1.000 px | lado a lado, 295 px | lado a lado, 295 px |
| 700 px | lado a lado, 295 px | lado a lado, 295 px |
| 500 px | empilhado, 434 px | empilhado, 434 px |

Idênticas. No código, a importação não passa a prop, o padrão é `false` e o ramo usa o mesmo literal `sm:flex-row` de antes (`:172`). Ressalva: nenhum teste do repositório guarda isso (M10, abaixo, sobrevive). É observação O1, não gap: a spec não tem AC sobre a importação, só a decisão de preservá-la.

**M3 da rodada 1.** Morto: M6 abaixo.

---

## Sensor de discriminação

Executado num `git worktree` descartável em `ceef4ee` (`pnpm install --offline --frozen-lockfile`), com o Playwright de `e2e/formulario-pela-coluna.spec.ts` ou o arquivo indicado. Cada mutante foi aplicado, rodado e revertido com `git checkout -- src`. Logs em `verif-fpc-r2/` no scratchpad.

| Mutante | Arquivo:linha | Descrição | Morto? |
| --- | --- | --- | --- |
| M6 | `src/components/form-compra.tsx:447` | par de dias do cartão novo do Parcelado volta para `sm:flex-row` (M3 da rodada 1) | ✅ morto por `e2e/formulario-pela-coluna.spec.ts:280` (1.920 px, Parcelado) |
| M7 | `src/components/form-lancamento-avulso.tsx:314` | Avulso deixa de passar `diasPelaLargura` | ✅ morto por `:280` (Avulso) |
| M7b | `src/components/cadastro-de-meio-inline.tsx:172` | ramo `@md` vira `sm` (o componente ignora a prop) | ✅ morto por `:280` (Avulso) |
| M8 | `src/components/cadastro-de-meio-inline.tsx:172` | `@md` vira `@4xl` (896 px) no Avulso | ✅ morto por `:289` (1.000 px, Avulso) |
| M9 | `src/components/form-compra.tsx:447` | `@md` vira `@4xl` no Parcelado | ✅ morto por `:289` (Parcelado) |
| M2 | `form-lancamento-avulso.tsx:312`, `:406`; `form-compra.tsx:344`, `:378`, `:551` | `@md` vira `@lg` (512 px) nos pares | ✅ morto por `:345` (447/448 px, Avulso) |
| M4b | `src/components/form-compra.tsx:284` | remove `@container` do `<form>` do Parcelado | ✅ morto por `:311` (diálogo, Parcelado) |
| M10 | `src/components/cadastro-de-meio-inline.tsx:81` | `diasPelaLargura` com padrão `true` (a importação passaria a empilhar sempre, sem contêiner) | ❌ **sobreviveu**: `e2e/importacao.spec.ts` 2 passaram; 81 testes de componente de `cadastro-de-meio-inline` e `importacao` passaram |
| M11 | `src/components/cadastro-de-meio-inline.tsx:172` | `@md` vira `@lg` (512 px) só no par de dias do Avulso | ❌ **sobreviveu** (`-g "dias do cartão novo do Avulso"`: 1 passou) |
| M12 | `src/components/form-compra.tsx:447` | `@md` vira `@lg` só no par de dias do Parcelado | ❌ **sobreviveu** (1 passou) |

Tentativa de reaplicar M1 (todos os pares para `sm:`) falhou por erro meu no filtro de nome (`No tests found`), sem resultado. M1 foi morto na rodada 1 e os cinco pontos de código não mudaram; fica como não reexecutado. M2, M4b e M6 a M9 cobrem a mesma superfície nesta rodada.

**Profundidade**: leve ampliada (10 mutações) | **Resultado**: 7 de 10 mortos | ❌ FAIL

Por que M11 e M12 sobrevivem: a 1.000 px o formulário mede bem mais que 512 px, e a 1.920 px menos que 448; só uma janela entre as duas separa `@md` de `@lg`, e nenhum teste do par de dias passa por ela. O FPC-03 (`:345`) mede os pares do formulário em 447 e 448 px, mas não abre o cartão novo.

Isolamento: o worktree descartável foi removido com `git worktree remove --force`, e a ausência foi confirmada em `git worktree list`. O `git status --porcelain` da árvore real é igual ao do início (vazio), depois de restaurar `next-env.d.ts` com `git checkout --` duas vezes.

---

## Qualidade do código

| Princípio | Status |
| --- | --- |
| Mínimo de código | ✅ uma prop booleana e quatro trocas de classe |
| Mudanças cirúrgicas | ✅ só os três componentes e o teste |
| Sem escopo extra | ✅ sem mudança de banco, rota ou texto |
| Segue os padrões | ✅ `@container` e `@md:` como em `form-recorrencia.tsx` (`FIXCOL-07`); a prop segue o estilo das outras de `CadastroDeMeioInline` |
| Asserções batem com a spec | ✅ |
| Todo teste mapeia para AC ou edge case | ✅ os 15 testes citam FPC-01, 02 ou 03 |
| Diretrizes documentadas | ✅ `AGENTS.md`: sem dado real, sem `skip`, nenhuma assertion enfraquecida (o diff de `e2e` só acrescenta) |
| Tailwind enxerga os dois literais | ✅ `"@md:flex-row"` e `"sm:flex-row"` estão inteiros no fonte (`:172`); a medida no navegador confirma que as duas classes existem no CSS |

---

## Gate

- **Comando**: `pnpm verify` decomposto, com `DATABASE_URL_TEST` apontando para o banco de teste local (URL não registrada).
- `pnpm typecheck`: saída 0.
- `pnpm lint`: saída 0.
- `pnpm test:unit`: saída 0, 109 arquivos, **1705 testes passaram**, 0 falhas; domínio com 100% de branches (355/355).
- `pnpm test:integration`: saída 0, 23 arquivos, **364 testes passaram**.
- `pnpm build`: saída 0.
- e2e `e2e/formulario-pela-coluna.spec.ts` (porta 3100): saída 0, **15 passaram**.
- e2e vizinhos (`lancamento-avulso`, `compra-parcelada`, `acessibilidade`, `importacao`): saída 0, **34 passaram**.
- Pulados: 0.
- Contagem: unitários e integração iguais à da rodada 1 (1705 e 364); o diff não remove nem altera teste existente. Testes novos desta feature: +15 e2e (13 na rodada 1, mais 2 em `ceef4ee`).

---

## Planos de correção

### Fix 1 (Minor): o par de dias do cartão novo não tem o limiar provado dos dois lados (M11 e M12)

- **Causa**: os testes de `:273-293` usam 1.920 e 1.000 px. Qualquer limiar de contêiner entre 448 e a largura do formulário em 1.000 px passa, e o edge case da spec pede "o mesmo ponto de virada". É a regra de L-029: limiar precisa dos casos colados nele.
- **Tarefa**: no laço de FPC-03 (`:345-358`), depois dos pares, abrir o cartão novo (`abrirCartaoNovo`) com a janela de 479 px e afirmar `DIAS_DO_CARTAO` empilhados, e com a de 480 px afirmar lado a lado, nos dois formulários. Não precisa de teste novo, só de duas linhas a mais por formulário. Mata M11 e M12.
- **Prioridade**: Minor.

---

## Atualização da rastreabilidade

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| FPC-01 | Verified | ✅ confirmado (ACs 1 a 5) e o cartão novo dos dois formulários agora citado; o "mesmo ponto de virada" do par de dias pede o Fix 1 |
| FPC-02 | Verified | ✅ confirmado, guarda de regressão |
| FPC-03 | Verified | ✅ confirmado para os pares dos formulários (M2 morto) |

---

## Observações que não bloqueiam

- O1. Nenhum teste guarda o comportamento da importação, que é o ponto da prop (M10 sobrevive). O `passo-pendencias` não tem AC sobre layout, e a medida no navegador desta rodada mostra que está igual à base. Se o dono quiser a garantia, um teste de componente que renderize `CadastroDeMeioInline` sem a prop e confira a classe `sm:flex-row` no par de dias (e com a prop, `@md:flex-row`) mataria M10; seria teste de nome de classe, o que este projeto evita para layout, então é opcional.
- O2. FPC-02 AC4 e a janela de 640 a 767 px estão provados num ponto (1.000 px); o limiar de contêiner os faz equivalentes. Custo baixo de acrescentar os extremos.
- O3. "Erro de validação: par alinhado pelo topo" é edge case sem medida.
- O4. `nomeInteiroNoSeletor` usa 24 px de folga para a seta, constante do autor; só mede o nome estreito.
- O5. O arquivo é `serial`: uma falha interrompe o resto; para diagnosticar, rodar com `-g`.
- O6. Os testes de FPC-02 e o de 375 px passam também no código antigo; são guardas legítimas (a spec diz "como hoje"), e M4b e M2 mostram que pegam a perda do `@container` e o limiar errado.

---

## Lições a registrar

Nada foi escrito em `.specs/lessons.json` nem em `.specs/LESSONS.md` (outra ramificação está adicionando lições; a rebase vem depois). O orquestrador registra com `lessons.py add` depois dela.

### Lição A (da rodada 1) - ainda vale

- **Texto**: Ao trocar o ponto de virada de um padrão de layout, procurar todo componente filho compartilhado que repete o mesmo padrão; trocar só os formulários pai deixa o filho com a referência antiga.
- **Sinal**: `surviving_mutant`
- **Fonte**: `src/components/form-compra.tsx:447` (M3 sobreviveu na rodada 1); desvio em `src/components/cadastro-de-meio-inline.tsx:165`
- **Escopo**: `layout,componentes`
- **Evidência**: M3 deixou 13 testes passando e a sonda mediu o par de dias do Avulso lado a lado a 151 px na coluna de 335 px. Segue válida: veio de um mutante real, e o desvio no componente compartilhado foi real e custou o Gap 1. A solução da rodada 2 (prop opt-in, padrão antigo) é a forma de aplicá-la sem quebrar o outro consumidor, e foi confirmada no navegador.

### Lição B (da rodada 1) - ainda vale

- **Texto**: Edge case de uma spec que nomeia um elemento aberto por ação ('+ novo', cartão novo) precisa de teste que abra a ação e meça o elemento, em cada formulário que a tem; medir só o estado inicial deixa o elemento aberto regredir.
- **Sinal**: `ac_gap`
- **Fonte**: `spec.md`, edge case "Cadastro inline aberto por '+ novo' ou '+ nova'" (par de dias do cartão novo)
- **Escopo**: `e2e,layout`
- **Evidência**: M3 sobreviveu enquanto nenhum teste abria Tipo "Cartão de crédito". Fechada em `ceef4ee` (`:273-293`, M6 morto), o que mostra que a lição era acionável. Segue válida.

### Lição C (nova)

- **Texto**: Em teste de layout por contêiner, cada elemento que o AC ou o edge case diz seguir o mesmo ponto de virada precisa ser medido nos dois lados do limiar, e não só numa janela larga e numa estreita; duas janelas distantes deixam passar qualquer limiar intermediário.
- **Sinal**: `surviving_mutant`
- **Fonte**: `src/components/cadastro-de-meio-inline.tsx:172` e `src/components/form-compra.tsx:447` (M11 e M12 sobreviveram)
- **Escopo**: `e2e,layout`
- **Evidência**: com `@md` trocado por `@lg` no par de dias do cartão novo, `e2e/formulario-pela-coluna.spec.ts:273-293` (1.920 e 1.000 px) seguiu verde nos dois formulários; o mesmo `@lg` nos pares dos formulários foi morto por `:345` (447 e 448 px). Distinta de L-029: lá o limiar não tinha caso colado; aqui tinha, mas só para alguns dos elementos do mesmo AC, e o elemento aberto por ação ficou de fora.

---

## Resumo

**Geral**: ❌ Não pronto (rodada 2; uma pendência pequena)

**Checagem ancorada na spec**: 11 de 11 ACs com assertion que bate com o valor da spec, 0 lacunas de spec-precisão; o edge case do par de dias do cartão novo, comportamento certo e limiar sem prova colada
**Sensor**: 7 de 10 mutantes mortos; sobreviventes: M11 (`src/components/cadastro-de-meio-inline.tsx:172`), M12 (`src/components/form-compra.tsx:447`) e M10 (`src/components/cadastro-de-meio-inline.tsx:81`, observação O1)
**Gate**: 1705 unitários, 364 de integração, 15 e2e da feature e 34 e2e vizinhos passaram

**O que funciona**: o cartão novo do Avulso vira pelo formulário (prop `diasPelaLargura`), a importação é idêntica à base em quatro janelas, M3 morto, o limiar dos pares é provado em 447 e 448 px, a regressão original morta, o gate inteiro verde.

**Problemas**: Fix 1, limiar do par de dias do cartão novo sem os dois lados colados (M11 e M12).

**Próximos passos**: acrescentar o cartão novo ao teste de 479 e 480 px (FPC-03), nos dois formulários, e reverificar (rodada 3).
