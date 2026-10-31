# Validation: formulario-pela-coluna - PASS ✅ (rodada 3)

**Data**: 2026-10-31
**Spec**: `.specs/features/formulario-pela-coluna/spec.md`
**Faixa do diff**: `e39eeae..1bdbb17` (`ed7bf63` spec, `72611db` correção e testes, `bbe1f10` e `2dd3aff` relatórios, `ceef4ee` e `1bdbb17` correções)
**Verificador**: sub-agente independente (autor ≠ verificador), terceira e última rodada dentro do limite de 3

O gap da rodada 2 está fechado: o laço de FPC-03 (`e2e/formulario-pela-coluna.spec.ts:345`) agora abre o cartão novo e mede os dois dias em 447 e em 448 px, nos dois formulários. M11 e M12 morrem em `:372`. As 11 ACs e os edge cases têm evidência, o gate está verde e nenhum mutante de comportamento sobrevive. Resta um achado do autor (desalinho de 3 px com o cadastro aberto) que não é defeito da spec e já existe na `main`.

---

## Rodada 1

FAIL por dois gaps, fechados em `ceef4ee`: o par de dias do cartão novo do Avulso seguia `sm:` (prop `diasPelaLargura` em `cadastro-de-meio-inline.tsx`, passada em `form-lancamento-avulso.tsx:314`) e o mutante M3 (`form-compra.tsx:447` de volta para `sm:`) sobrevivia.

## Rodada 2

FAIL por um gap de limiar: M11 e M12 (`@md` trocado por `@lg` no par de dias do Avulso e do Parcelado) sobreviviam porque o par de dias só era medido em 1.920 e 1.000 px. Fechado em `1bdbb17`. A importação foi medida no navegador idêntica à base em quatro janelas.

---

## Conclusão das tarefas

Escopo Médio: sem `tasks.md`. Código em `72611db` e `ceef4ee`; teste novo em `1bdbb17`.

| Item | Status | Notas |
| --- | --- | --- |
| `form-lancamento-avulso.tsx` | ✅ | `@container` em `:257`; pares em `:312` e `:406`; `diasPelaLargura` em `:314` |
| `form-compra.tsx` | ✅ | `@container` em `:284`; pares em `:344`, `:378`, `:551`; dias do cartão novo em `:447` |
| `cadastro-de-meio-inline.tsx` | ✅ | prop `diasPelaLargura` (padrão falso); `:172` escolhe `@md:flex-row` ou `sm:flex-row` |
| `e2e/formulario-pela-coluna.spec.ts` | ✅ | 15 testes; o de FPC-03 cobre os pares e o par de dias |

O único `sm:flex-row` que resta nos dois formulários e nos filhos que eles montam é o da importação (`cadastro-de-meio-inline.tsx:172`), de propósito.

---

## Acceptance Criteria ancoradas na spec

Todos os testes estão em `e2e/formulario-pela-coluna.spec.ts`. Ajudantes: `posicaoDosPares` (`:121`), `esperado` (`:138`), `rotulosEmUmaLinha` (`:157`), `atalhosEmUmaLinha` (`:166`), `nomeInteiroNoSeletor` (`:175`), `abrirCartaoNovo` (`:268`).

### FPC-01 - um campo por linha na coluna estreita

| Critério | Resultado esperado na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 Avulso < 448 px | cada campo dos 2 pares em linha própria | `:216` `expect(await posicaoDosPares(form, PARES[qual])).toEqual(esperado(PARES[qual], false))`; guarda `:215` `expect(width).toBeLessThan(448)` | ✅ |
| AC2 Parcelado < 448 px | idem, 3 pares | `:216` (Parcelado); `:252` com o cadastro de categoria aberto | ✅ |
| AC3 rótulo e "+ novo"/"+ nova" numa linha | 1 linha | `:217` e `:161` `.toBe(1)`; `:218` e `:170` `.toBe(1)`; Receita `:233` e `:237` | ✅ |
| AC4 nome de 23 caracteres inteiro | sem corte | `:195` `expect(medida.texto).toBe(NOME_LONGO)`; `:197` `expect(medida.largura + 24).toBeLessThanOrEqual(medida.disponivel)` | ✅ |
| AC5 coluna da Visão geral, 1.280 a 1.920 px | ACs 1 a 4 nos dois formulários | `:204-221`, laço `[1920, 1280] x [Avulso, Parcelado]` | ✅ |

### FPC-02 - lado a lado onde o formulário é largo

| Critério | Resultado esperado | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 Avulso ≥ 448 px | segundo campo ao lado do primeiro | `:311-320` `toEqual(esperado(PARES[qual], true))`, guarda `toBeGreaterThanOrEqual(448)` | ✅ (guarda de regressão) |
| AC2 Parcelado ≥ 448 px | idem | mesmo teste, Parcelado | ✅ (guarda de regressão) |
| AC3 diálogo de Lançamentos em 1.280 px | pares lado a lado nos dois | `:311-320`; M4b (rodada 2) o mata | ✅ |
| AC4 Visão geral de 768 a 1.279 px | pares lado a lado nos dois | `:322-331` em 1.000 px | ✅ (guarda de regressão) |

### FPC-03 - o limiar é o do formulário

| Critério | Resultado esperado | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC1 decide pela largura do formulário | referência é o formulário | `:345-373`, janelas de 479 e 480 px, ambas abaixo de `sm:` (640) | ✅ |
| AC2 447 px empilha | um campo por linha | `:349-351` `toBeLessThan(448)`, `toBeGreaterThanOrEqual(447)`, `toEqual(esperado(..., false))`; dias do cartão `:366` `toEqual(esperado([DIAS_DO_CARTAO], false))` | ✅ |
| AC3 448 px lado a lado | lado a lado | `:354-356` `poll(width).toBeGreaterThanOrEqual(448)`, `toBeLessThan(449)`, `toEqual(esperado(..., true))`; dias do cartão `:372` `toEqual(esperado([DIAS_DO_CARTAO], true))` | ✅ |

**Status**: ✅ 11 de 11 ACs com assertion que bate com a spec; sem lacuna de spec-precisão. O limiar está colado dos dois lados (447 e 448 px) para os pares e para o par de dias do cartão novo, em L-029.

---

## Edge cases da spec

- [x] Nome longo: `:197`.
- [x] Modo Receita: `:224-242`.
- [x] Cadastro inline aberto: `:244-254` (Parcelado, categoria), `:235-241` (Avulso, meio). O bloco abre com a largura do campo e o par segue o formulário (medido: ver Ponto 2).
- [x] Par de dias do cartão novo segue o mesmo ponto de virada: `:273-293` (1.920 e 1.000 px) e agora `:360-373` (447 e 448 px), nos dois formulários. Fechado.
- [x] 375 px: `:295-304`.
- [x] 640 a 767 px: coberto pelo mecanismo; sem teste próprio (O2).
- [ ] Erro de validação com par alinhado: sem medida (O3), não bloqueia.

---

## Sensor de discriminação

Executado em `git worktree` descartável em `1bdbb17` (`pnpm install --offline --frozen-lockfile`), com `-g "FPC-03"` no arquivo da feature. Cada mutante foi aplicado, rodado e revertido com `git checkout -- src`. O sensor da rodada 2 (M1 a M10) vale para o código, que não mudou desde `ceef4ee`; nesta rodada reexecutei os mutantes novos, os que falhavam e o M2. Logs em `verif-fpc-r3/` no scratchpad.

| Mutante | Arquivo:linha | Descrição | Morto? |
| --- | --- | --- | --- |
| M11 | `src/components/cadastro-de-meio-inline.tsx:172` | `@md` vira `@lg` no par de dias do Avulso | ✅ morto em `e2e/formulario-pela-coluna.spec.ts:372` (Avulso, 480 px) |
| M12 | `src/components/form-compra.tsx:447` | `@md` vira `@lg` no par de dias do Parcelado | ✅ morto em `:372` (Parcelado; o Avulso passou, como deve) |
| M13 | `src/components/cadastro-de-meio-inline.tsx:172` | `@md` vira `@sm` (384 px) no Avulso | ✅ morto em `:366` (479 px, deveria empilhar) |
| M14 | `src/components/form-compra.tsx:447` | `@md` vira `@sm` no Parcelado | ✅ morto em `:366` |
| M15 | `src/components/form-lancamento-avulso.tsx:314` | Avulso deixa de passar `diasPelaLargura` | ✅ morto em `:372` |
| M2 | `form-lancamento-avulso.tsx:312`, `:406` | `@md` vira `@lg` nos pares | ✅ morto em `:358` |
| M10 | `src/components/cadastro-de-meio-inline.tsx:81` | `diasPelaLargura` com padrão `true` (a importação passaria a ter `@md` sem contêiner) | ❌ **sobrevive**: `e2e/importacao.spec.ts` 2 passaram e 39 arquivos de teste de componente e de app (556 testes) passaram. Sem AC na spec: observação O1 |

Uma primeira tentativa de M14 falhou por tempo do servidor (`Timed out waiting 120000ms from config.webServer`), sem resultado; repetida uma vez, sozinha, e morreu em `:366`.

**Profundidade**: leve ampliada (7 mutações nesta rodada, 17 no total das rodadas 2 e 3) | **Resultado**: 6 de 6 mutantes de comportamento mortos; M10 sobrevive e é observação, não gap | ✅ PASS

Isolamento: os dois worktrees descartáveis (`1bdbb17` e `e39eeae`) foram removidos com `git worktree remove --force` e a ausência confirmada em `git worktree list`. `git status --porcelain` da árvore real: vazio no início e vazio no fim (`next-env.d.ts` restaurado com `git checkout --` depois do e2e).

---

## Ponto 2: desalinho com o cadastro de meio aberto

O autor relatou que, com o cadastro de meio aberto, o "+ novo" some, a linha do rótulo do meio fica mais baixa que a do rótulo da categoria, e os controles de "Meio de pagamento" e "Categoria" desalinham.

**Medida no navegador** (diferença de `y` do controle de Categoria menos o do Meio, em px; formulário em largura de 448 px e maiores):

| Situação (formulário) | Fechado | Cadastro de meio aberto |
| --- | --- | --- |
| Avulso, janela 480 px (448 px) | 0 | **3** |
| Avulso, janela 1.000 px, coluna (712 px) | 0 | **3** |
| Avulso, diálogo de Lançamentos 1.280 px (622 px) | 0 | **3** |
| Parcelado, janela 480 px (448 px) | 0 | **3** |
| Parcelado, janela 1.000 px, coluna (712 px) | 0 | **3** |
| Parcelado, diálogo 1.280 px (622 px) | 0 | **3** |
| Os dois, coluna de 335 px, 1.280 e 1.920 px | empilhados | empilhados (sem par para desalinhar) |

**Comparação com a `main` (`e39eeae`, código antigo)**: nos três formulários largos (712 e 622 px), os mesmos 3 px, nos dois formulários. Então o desalinho **já existia** e a feature não o introduziu nem o piorou. Na `main`, a coluna de 335 px era o pior caso, com o par lado a lado e `dy` de -18 px com tudo fechado (rótulo quebrado em duas linhas) e 3 px com o cadastro aberto; a feature tira isso (empilha, sem par). Em 448 px a `main` já empilhava (janela de 480 px abaixo de `sm:`); com a feature, 448 px fica lado a lado, e o desalinho de 3 px com o cadastro aberto aparece nessa largura também, como em qualquer largura lado a lado.

**É defeito contra a spec?** Não. A spec não tem AC de alinhamento vertical entre os controles de um par: o edge case do cadastro inline diz que "o par continua empilhado ou lado a lado conforme o formulário", e o de erro de validação diz "alinhado pelo topo" só para a mensagem de erro. Alinhamento aparece apenas na queixa original, no Problem Statement, e o estado normal (cadastro fechado) está alinhado a 0 px em todas as larguras largas. É **observação ao dono**, com números, e não gap.

**Correção, se o dono quiser** (fora do escopo desta spec): reservar a altura da linha do rótulo do meio quando o "+ novo" some, com uma altura mínima na linha (por exemplo `min-h-` igual à do botão) ou trocando o botão por `invisible` em vez de removê-lo. Vale para o Avulso e o Parcelado e seria uma mudança pequena com um teste que meça `dy <= 1` com o cadastro aberto. O autor acertou em medir os dias do cartão depois dos pares para a medida não pegar esse desalinho.

---

## Qualidade do código

| Princípio | Status |
| --- | --- |
| Mínimo de código | ✅ uma prop booleana e quatro trocas de classe |
| Mudanças cirúrgicas | ✅ só os três componentes e o teste |
| Sem escopo extra | ✅ sem mudança de banco, rota ou texto |
| Segue os padrões | ✅ `@container` e `@md:` como em `form-recorrencia.tsx` (`FIXCOL-07`) |
| Asserções batem com a spec | ✅ |
| Todo teste mapeia para AC ou edge case | ✅ os 15 testes citam FPC-01, 02 ou 03 |
| Diretrizes documentadas | ✅ `AGENTS.md`: sem dado real (nome genérico), sem `skip`, nenhuma assertion enfraquecida (o diff de `e2e` só acrescenta) |
| Tailwind enxerga os dois literais | ✅ `"@md:flex-row"` e `"sm:flex-row"` inteiros em `:172` |

---

## Gate

- **Comando**: `pnpm verify` e `pnpm test:e2e` (e2e completo), cada saída conferida em separado, `DATABASE_URL_TEST` para o banco de teste local (URL não registrada).
- `pnpm verify` (typecheck, lint, test:unit, test:integration, build): saída **0**; 109 arquivos e **1705 testes** unitários, 23 arquivos e **364 testes** de integração, 0 falhas.
- `pnpm test:e2e` (porta 3100): saída **0**, **149 passaram**, 0 falhas, 0 instáveis, 0 pulados.
- Pulados: 0.
- Contagem: igual à da rodada 2 (1705 e 364); nenhum teste foi removido ou enfraquecido. Testes novos da feature: 15 e2e (o teste de FPC-03 ganhou as medidas do cartão novo, sem teste novo).

---

## Planos de correção

Nenhum bloqueante. O desalinho de 3 px (Ponto 2) é observação ao dono, com a correção proposta acima, se ele quiser.

---

## Atualização da rastreabilidade

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| FPC-01 | Verified | ✅ confirmado (ACs 1 a 5 e o par de dias do cartão novo) |
| FPC-02 | Verified | ✅ confirmado, guarda de regressão |
| FPC-03 | Verified | ✅ confirmado, agora também para o par de dias (447 e 448 px) |

A tabela do `spec.md` já cita as medidas de 447 e 448 px do par de dias do cartão novo; nada a mudar.

---

## Observações que não bloqueiam

- O1 (ainda vale). Nenhum teste guarda o comportamento da importação, que é o ponto da prop (M10 sobrevive: 2 e2e de importação e 556 testes de componente e app passam). A importação foi medida idêntica à base na rodada 2. Um teste de componente que cheque a classe seria opcional e de nome de classe.
- O2 (ainda vale). FPC-02 AC4 e a janela de 640 a 767 px estão provados num ponto (1.000 px); o limiar de contêiner os faz equivalentes.
- O3 (ainda vale). "Erro de validação: par alinhado pelo topo" é edge case sem medida.
- O4 (ainda vale). `nomeInteiroNoSeletor` usa 24 px de folga para a seta, constante do autor; só mede o nome no formulário estreito.
- O5 (ainda vale). O arquivo é `serial`: uma falha interrompe o resto (por isso, em M11 e M12, só um formulário aparece como falho); para diagnosticar, rodar com `-g`.
- O6 (ainda vale). Os testes de FPC-02 e o de 375 px passam também no código antigo; são guardas legítimas, e M2 e M4b mostram que pegam o limiar errado e a perda do `@container`.
- O7 (nova, é o Ponto 2). Com o cadastro de meio aberto e o par lado a lado, o controle de Categoria fica 3 px abaixo do de Meio, em qualquer largura; já existia na `main`.

---

## Lições a registrar

Nada foi escrito em `.specs/lessons.json` nem em `.specs/LESSONS.md` (outra ramificação está adicionando lições; a rebase vem depois). O orquestrador registra com `lessons.py add` depois dela. **Registradas em 2026-10-31, depois que `todo-mes-colunas` entrou na `main`: A como L-059, B como L-060 e C como L-061, todas candidatas.** Sem lição nova nesta rodada: o único sinal novo (M10, sobrevivente sem AC) é observação e não gera regra geral; o Ponto 2 não é falha de verificação.

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

### Lição C (da rodada 2) - ainda vale

- **Texto**: Em teste de layout por contêiner, cada elemento que o AC ou o edge case diz seguir o mesmo ponto de virada precisa ser medido nos dois lados do limiar, e não só numa janela larga e numa estreita; duas janelas distantes deixam passar qualquer limiar intermediário.
- **Sinal**: `surviving_mutant`
- **Fonte**: `src/components/cadastro-de-meio-inline.tsx:172` e `src/components/form-compra.tsx:447` (M11 e M12 sobreviveram)
- **Escopo**: `e2e,layout`
- **Evidência**: com `@md` trocado por `@lg` no par de dias do cartão novo, `e2e/formulario-pela-coluna.spec.ts:273-293` (1.920 e 1.000 px) seguiu verde nos dois formulários; o mesmo `@lg` nos pares dos formulários foi morto por `:345` (447 e 448 px). Distinta de L-029: lá o limiar não tinha caso colado; aqui tinha, mas só para alguns dos elementos do mesmo AC, e o elemento aberto por ação ficou de fora.

---

## Resumo

**Geral**: ✅ Pronto (rodada 3)

**Checagem ancorada na spec**: 11 de 11 ACs com assertion que bate com o valor da spec, 0 lacunas de spec-precisão; o edge case do par de dias do cartão novo com limiar colado dos dois lados
**Sensor**: 6 de 6 mutantes de comportamento mortos (M11, M12, M13, M14, M15, M2); M10 sobrevive (`src/components/cadastro-de-meio-inline.tsx:81`), sem AC, observação O1
**Gate**: `pnpm verify` saída 0 (1705 unitários, 364 de integração, build) e `pnpm test:e2e` saída 0 (149 passaram)

**O que funciona**: pares por contêiner nos dois formulários, cartão novo do Avulso pelo formulário e importação intacta, limiar de 448 px provado em 447 e 448 px para os pares e para os dias do cartão, regressão original morta, gate inteiro verde.

**Observação ao dono**: desalinho de 3 px entre Meio e Categoria com o cadastro de meio aberto, que já existe na `main` (Ponto 2).

**Próximos passos**: nenhum para esta feature; registrar as lições A, B e C depois da rebase.
