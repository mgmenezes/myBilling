# Simular: Specification

> Fatia 2 do plano aprovado em 2026-11-01 (`~/.claude/plans/estou-sentindo-que-ainda-ancient-cosmos.md`):
> o diferencial "o app sabe o que vem". A fatia 1 (`horizonte-doze-meses`, AD-023) deixou o app
> enxergando doze meses à frente; esta fatia é a tela que responde "dá pra comprar?". A landing é a
> fatia 3 (`landing-simulador`). Parte do branch `feat/horizonte-doze-meses`.

## Problem Statement

Com o app aberto, a pessoa ainda responde de cabeça "dá pra parcelar isso em 10x?". O app já tem
as parcelas futuras, as contas fixas e o saldo previsto de cada um dos doze meses seguintes; só não
tem uma tela em que esse conhecimento responde a pergunta. O simulador "Simular" mostra, mês a mês,
quanto vai sobrar antes e depois da compra, diz se cabe e, quando não cabe, em quantas vezes
caberia. Se a pessoa decide comprar, a simulação vira o cadastro da compra com um clique.

## Goals

- [ ] A rota `/[competencia]/simular`, título "Dá pra comprar?", responde a uma compra parcelada com
      uma linha por mês (parcela, saldo antes, saldo depois) e um veredito, sem envio ao servidor
- [ ] O veredito diz "Cabe" ou os meses no vermelho e o menor parcelamento que cabe
- [ ] "Lançar esta compra" grava a compra simulada pelo mesmo caminho do cadastro de hoje
- [ ] "Simular" é o quinto item da navegação, e a barra inferior cabe em 360 px sem quebra
- [ ] O cadastro de compra mostra o mesmo bloco de resposta abaixo da prévia das parcelas

## Out of Scope

| Feature | Reason |
| --- | --- |
| Em qual fatura cai cada parcela | Segunda etapa, com a fatia de Faturas (decisão do dono) |
| A seção do simulador na landing, a casa fictícia e o bundle do domínio | Fatia 3 (`landing-simulador`) |
| Enxergar além de C + 12 | AD-023: a janela é a da materialização; projetar planos somaria plano com razão (AD-003) |
| Saldo acumulado entre meses | Cada mês isolado (`saldo-futuro`, decisão do dono) |
| Simular compra em andamento (parcela inicial 8 de 10) | O simulador responde sobre uma compra nova; `parcelaInicial` é 1 |
| Simular lançamento avulso ou fixo novo | A pergunta do dono é sobre a compra parcelada |
| Salvar simulações | Nada da simulação é persistido; só "Lançar esta compra" grava, e grava uma compra |
| Mudar "Próximos meses" da Visão geral | HORIZ-02 fixa 3 linhas |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Nome, rota e título | Item "Simular", rota `/[competencia]/simular`, título da tela "Dá pra comprar?" | Decisão do dono em 2026-11-01 | y |
| O que a primeira versão responde | Só o saldo por mês; nenhuma menção a fatura | Decisão do dono | y |
| Horizonte | O mês aberto C e os 12 seguintes, C até C + 12 (13 competências), o que a materialização cobre (HORIZ-01, AC 1) | A primeira parcela cai por padrão no mês aberto, então C faz parte do que o simulador enxerga | n (decisão do autor) |
| Barra inferior com cinco itens | Os mesmos rótulos de hoje em 11 px no celular, sem respiro entre itens; alvos de 44 px mantidos | Decisão do dono em 2026-11-01 | y |
| Frases do veredito | "Cabe. Nenhum mês fica no vermelho." / "Em 10x não cabe: abril e maio ficam no vermelho. Em 14x cabe." / "Não cabe em nenhum parcelamento até 120x." / "Enxergo até outubro de 2027." | Decisão do dono em 2026-11-01 | y |
| Mês já no vermelho antes da compra | Não conta contra a compra; a linha diz "já estava no vermelho"; se é o único vermelho, o veredito é "Cabe. Maio já estava no vermelho antes desta compra." | Plano aprovado: não culpar a compra pelo que já faltava. A frase é variante da aprovada, para "nenhum mês fica no vermelho" não sair falsa | n (decisão do autor) |
| O que o domínio recebe | O saldo "antes" de cada mês do horizonte (`{ competencia, saldo }`), não a lista de lançamentos | A lista de lançamentos não precisa viajar ao cliente; o bloco dentro do `FormCompra` e a landing (fatia 3) alimentam a mesma função com 13 saldos | n (decisão do autor) |
| De onde vem o saldo "antes" | `saldoPrevistoDaCompetencia`, a mesma função do card "Saldo previsto" e de "Próximos meses" (SALDO-03, AC 7) | Uma definição de saldo; o "antes" do simulador é o número que a Visão geral mostra | n (decisão do autor) |
| "Em quantas vezes caberia" | O menor `n` de 1 a `MAX_PARCELAS` (120) em que a compra cabe, com o mesmo total e a mesma primeira parcela; `null` se nenhum cabe | Busca linear: `ratearParcelas` é barato e a monotonia não é garantida (plano aprovado) | n (decisão do autor) |
| Modo "valor da parcela" na busca | O total da compra simulada (parcela × n informado) é o que se reparte na busca | Trocar `n` mantendo o valor da parcela mudaria o preço da compra, e a pergunta é sobre esta compra | n (decisão do autor) |
| Compra que passa do horizonte | As linhas vão até C + 12; o veredito é definido sobre as parcelas visíveis e a resposta diz "Enxergo até <mês de ano>." | Plano aprovado; o app não inventa saldo de mês que não materializou | n (decisão do autor) |
| Onde o "Lançar esta compra" leva | Abre, na própria tela, o cadastro de compra (`FormCompra`) preenchido com modo, valor, parcelas e a competência da primeira parcela; descrição, categoria, meio, pessoa e data são pedidos ali | Mesmo caminho de gravação (`criarCompra`), mesma chave de idempotência gerada ao montar o formulário (PARC-05, AC 9) | n (decisão do autor) |
| Data padrão da compra lançada | `dataPadraoDoLancamento(hoje, competência da primeira parcela)`: hoje quando é o mês corrente, dia 1 quando não (CAD-04, AC 10) | O mês escolhido pode não ser o aberto; a regra existente já cobre | n (decisão do autor) |
| Bloco dentro do `FormCompra` | Recebe o horizonte por prop; sem horizonte, não renderiza. Não tem botão "Lançar": o formulário é o lançar | As páginas Visão geral e Lançamentos já leem `futuro` e o saldo do mês por `obterVisaoMensal` | n (decisão do autor) |
| Nova página materializa | `/simular` chama `materializarRecorrencias` como as demais páginas do mês | Sem isso o saldo de um mês que ninguém abriu sairia sem as contas fixas | n (decisão do autor) |
| Erros de domínio novos | `HORIZONTE_INVALIDO` e `PRIMEIRA_PARCELA_FORA_DO_HORIZONTE`, na union fechada, com mensagem em `src/lib/erros.ts` | Entrada impossível pela tela, mas o domínio não lança (AD-006) | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação de entrada e limites | SIM-02, ACs 7 a 9: as mesmas regras e mensagens do cadastro de compra (`gerarParcelas`, `src/lib/erros.ts`); a primeira parcela restrita a C..C + 12 |
| Falha e falha parcial | SIM-04, AC 4: a gravação é a do `FormCompra`, com o envelope `ResultadoAction` existente; a simulação em si não chama o servidor |
| Idempotência | SIM-04, AC 3: chave gerada ao montar o formulário, não ao clicar (PARC-05, AC 9), inalterada |
| Autenticação | SIM-02, AC 1: a página exige sessão como as demais do mês; `criarCompra` chama `requireSession()` |
| Concorrência e ordem | N/A: a simulação não escreve; a materialização continua idempotente pela restrição única |
| Ciclo de vida do dado | N/A: nada da simulação é persistido |
| Observabilidade | N/A: nenhuma chamada nova ao servidor |
| Dependência externa | N/A |
| Integridade de transição de estado | SIM-04, ACs 5 e 6: simulado → formulário aberto → gravado → horizonte relido |

---

## User Stories

### P1: O domínio responde se a compra cabe ⭐ MVP — SIM-01

**User Story**: Como quem pergunta "dá pra comprar?", quero que o app calcule, mês a mês, quanto
sobra antes e depois da compra e diga se cabe, para a resposta ser a mesma conta do saldo previsto.

**Why P1**: É a resposta; sem ela não há tela nem landing.

**Acceptance Criteria**

1. WHEN `simularCompra(horizonte, plano)` recebe um horizonte de competências consecutivas e um plano
   cuja parcela 1 cai dentro dele THEN o sistema SHALL devolver uma linha por parcela dentro do
   horizonte, em ordem, com `competencia`, `parcela`, `saldoAntes` (o saldo daquela competência no
   horizonte) e `saldoDepois = saldoAntes − parcela`
2. The system SHALL definir `cabe` como verdadeiro se e somente se nenhuma linha tem `saldoAntes ≥ 0`
   e `saldoDepois < 0`
3. The system SHALL marcar `jaFaltava` em toda linha com `saldoAntes < 0`, e essa linha não torna
   `cabe` falso
4. WHEN o plano tem parcelas além da última competência do horizonte THEN o sistema SHALL devolver
   só as linhas até ela, `enxergaAte` igual a essa competência e `parcelasForaDoHorizonte` igual ao
   número de parcelas omitidas
5. WHEN todas as parcelas cabem no horizonte THEN o sistema SHALL devolver `parcelasForaDoHorizonte`
   igual a 0 e `enxergaAte` igual à última competência do horizonte
6. IF o horizonte está vazio ou tem competências fora de ordem ou com buraco THEN o sistema SHALL
   devolver `err` com código `HORIZONTE_INVALIDO`
7. IF a parcela 1 do plano cai antes da primeira competência do horizonte ou depois da última THEN o
   sistema SHALL devolver `err` com código `PRIMEIRA_PARCELA_FORA_DO_HORIZONTE`
8. WHEN `menorParcelamentoQueCabe(horizonte, { valorTotal, competenciaPrimeiraParcela,
   politicaResiduo })` é chamado THEN o sistema SHALL devolver o menor `n` entre 1 e `MAX_PARCELAS`
   para o qual `simularCompra` do plano de `n` parcelas desse total devolve `cabe`, ou `null` se
   nenhum devolve
9. WHEN o rateio em `n` parcelas é inválido (parcela abaixo de um centavo) THEN o sistema SHALL tratar
   `n` como não cabendo e seguir a busca
10. The system SHALL manter, para toda linha, `saldoDepois === saldoAntes − parcela` em centavos
    inteiros, sem arredondamento (AD-001)

**Independent Test**: horizonte de março a março seguinte com R$ 700,00 em cada mês, menos maio com
−R$ 500,00; compra de R$ 3.000,00 em 3x a partir de março devolve março −R$ 300,00 e abril
−R$ 300,00 (não cabe) e maio −R$ 1.500,00 com `jaFaltava`; `menorParcelamentoQueCabe` devolve 5
(em 4x março fica em −R$ 50,00; em 5x, R$ 100,00 em março, abril, junho e julho).

---

### P1: A tela "Dá pra comprar?" ⭐ MVP — SIM-02

**User Story**: Como quem está na loja com o celular, quero digitar valor e parcelas e ver, sem
rolar, se cabe, para decidir antes de passar o cartão.

**Why P1**: É a cena de venda do diferencial.

**Acceptance Criteria**

1. WHEN `/[competencia]/simular` é aberta com sessão THEN o sistema SHALL materializar as
   recorrências de C até C + 12 e mostrar a tela com o título "Dá pra comprar?" e os campos valor,
   modo (valor total ou valor da parcela), número de parcelas e mês da primeira parcela
2. The system SHALL oferecer no campo "mês da primeira parcela" exatamente as 13 competências de C
   até C + 12, com C selecionada por padrão
3. WHEN valor e parcelas são válidos THEN o sistema SHALL mostrar, sem envio ao servidor e sem botão
   de calcular, uma linha por mês alcançado dentro do horizonte com o mês, a parcela, "Vai sobrar"
   ou "Vai faltar" antes e "Vai sobrar" ou "Vai faltar" depois, com as mesmas palavras e classes de
   cor de "Próximos meses"
4. WHEN o saldo "antes" de um mês da resposta é calculado THEN o sistema SHALL usar o valor que o
   card "Saldo previsto" daquele mês mostra ao ser aberto (SALDO-03, AC 7)
5. WHEN a compra cabe e nenhuma linha tem `jaFaltava` THEN o sistema SHALL mostrar o veredito
   "Cabe. Nenhum mês fica no vermelho."
6. WHEN a compra cabe e alguma linha tem `jaFaltava` THEN o sistema SHALL mostrar "Cabe. <meses> já
   estava(m) no vermelho antes desta compra." e marcar cada uma dessas linhas com "já estava no
   vermelho"
7. WHEN a compra não cabe em `n` parcelas e o menor parcelamento que cabe é `m` THEN o sistema SHALL
   mostrar "Em <n>x não cabe: <meses> fica(m) no vermelho. Em <m>x cabe.", onde `<meses>` são os
   meses com `saldoAntes ≥ 0` e `saldoDepois < 0`, em ordem, em minúsculas, separados por vírgula e
   "e", com "de <ano>" só nos meses de ano diferente do de C
8. WHEN a compra não cabe em nenhum parcelamento THEN o sistema SHALL mostrar "Em <n>x não cabe:
   <meses> fica(m) no vermelho. Não cabe em nenhum parcelamento até 120x."
9. WHEN `parcelasForaDoHorizonte > 0` THEN o sistema SHALL acrescentar à resposta a frase "Enxergo
   até <Mês de ano>." com a última competência do horizonte
10. IF o valor está vazio ou não é um valor em reais THEN o sistema SHALL mostrar, no lugar da
    resposta, "Informe o valor para ver a resposta." e nenhuma linha
11. IF o número de parcelas está fora de 1 a 120, ou o valor é pequeno demais para o número de
    parcelas THEN o sistema SHALL mostrar junto do campo a mesma mensagem que o cadastro de compra
    mostra (`src/lib/erros.ts`) e nenhuma linha
12. WHEN a tela é exibida em 400 × 800 px com uma resposta THEN o sistema SHALL manter os quatro
    campos e o veredito inteiramente dentro da área visível, sem rolar; as linhas por mês podem ficar
    abaixo
13. WHEN a tela é exibida em 768 px ou mais THEN o sistema SHALL usar a mesma moldura estreita das
    demais áreas (`AreaEstreita`)

**Independent Test**: com entrada fixa de R$ 1.000,00 e fixo de R$ 300,00 desde março, abrir
`/2026-03/simular`, digitar R$ 1.000,00 em 3x: três linhas (março, abril, maio) com "Vai sobrar
R$ 700,00" antes e "Vai sobrar R$ 366,66", "R$ 366,67" e "R$ 366,67" depois, e "Cabe. Nenhum mês
fica no vermelho."; trocar para R$ 3.000,00 em 3x com o fixo extra de maio mostra "Em 3x não cabe:
março e abril ficam no vermelho. Em 5x cabe."

---

### P1: "Simular" na navegação ⭐ MVP — SIM-03

**User Story**: Como quem usa o app no celular, quero chegar ao simulador pela barra inferior, para
a cena da loja ser um toque.

**Why P1**: Decisão do dono: quinto item, redesenhando a barra.

**Acceptance Criteria**

1. The system SHALL listar na navegação principal exatamente cinco áreas, nesta ordem: Visão geral,
   Lançamentos, Todo mês, Cadastros, Simular, e o item Simular SHALL levar a
   `/[competencia]/simular`
2. WHILE o caminho termina em `/simular` the system SHALL marcar o item Simular como ativo
   (`aria-current="page"`) e nenhum outro
3. WHEN a barra inferior é exibida em 360 px e em 400 px de largura THEN o sistema SHALL manter o
   rótulo de cada um dos cinco itens em uma linha, com a altura de cada link igual à dos demais
4. WHEN a barra inferior é exibida em 360 px e em 400 px THEN o sistema SHALL dar a cada link ao
   menos 44 px de altura e a página não SHALL ter rolagem horizontal
5. WHEN a navegação é exibida em 768 px ou mais THEN o sistema SHALL manter o tamanho de texto dos
   itens de hoje (15 px) e a coluna lateral

**Independent Test**: em 360 × 740 px, os cinco links da barra têm `scrollWidth ≤ clientWidth`,
uma única linha de rótulo e a mesma altura; Simular leva a `/2026-03/simular` com
`aria-current="page"`.

---

### P1: Lançar esta compra ⭐ MVP — SIM-04

**User Story**: Como quem decidiu comprar, quero transformar a simulação no cadastro com um clique,
para não redigitar valor e parcelas.

**Why P1**: Decisão do dono; fecha o ciclo "sabe o que vem" → "lançou".

**Acceptance Criteria**

1. WHILE há uma resposta válida na tela the system SHALL mostrar o botão "Lançar esta compra"
2. WHEN "Lançar esta compra" é acionado THEN o sistema SHALL abrir, abaixo da resposta, o cadastro
   de compra (`FormCompra`) com modo, valor e número de parcelas iguais aos simulados, a competência
   da parcela inicial igual ao mês da primeira parcela escolhido e a data padrão de
   `dataPadraoDoLancamento` para esse mês
3. The system SHALL gerar a chave de idempotência ao montar o formulário aberto, e não ao gravar
   (PARC-05, AC 9)
4. WHEN o formulário aberto é gravado THEN o sistema SHALL gravar pela Server Action `criarCompra`,
   com a mesma validação e as mesmas mensagens do cadastro de hoje
5. WHEN a compra é gravada THEN o sistema SHALL mostrar a confirmação do cadastro e reler o
   horizonte, de modo que o "antes" de cada mês passe a ser o "depois" da simulação gravada
6. WHEN a compra gravada tem parcela em um mês seguinte THEN o sistema SHALL mostrar, ao abrir esse
   mês, "Saldo previsto" igual ao `saldoDepois` que a simulação mostrou para ele
7. WHILE o botão ainda não foi acionado the system SHALL não renderizar o formulário nem os campos
   de descrição, categoria, meio e pessoa

**Independent Test**: simular R$ 1.000,00 em 3x em março, lançar com descrição "Compra A", abrir
abril: "Saldo previsto" R$ 366,67; abrir março: R$ 366,66.

---

### P2: A resposta dentro do cadastro de compra — SIM-05

**User Story**: Como quem está lançando uma compra em casa, quero ver o impacto nos próximos meses
sem sair do formulário, para não precisar abrir o simulador.

**Why P2**: A cena de casa; o app continua correto sem ela.

**Acceptance Criteria**

1. WHERE o `FormCompra` recebe o horizonte the system SHALL mostrar, abaixo da prévia das parcelas,
   o mesmo bloco de resposta da tela Simular (linhas por mês e veredito) para a compra digitada
2. WHERE o `FormCompra` não recebe o horizonte the system SHALL não mostrar o bloco
3. WHEN a prévia das parcelas muda THEN o sistema SHALL recalcular o bloco com o mesmo plano da
   prévia (`planoDaCompra`)
4. The system SHALL não mostrar o botão "Lançar esta compra" dentro do `FormCompra`
5. WHEN a Visão geral e a página de Lançamentos montam o cadastro THEN o sistema SHALL passar o
   horizonte de C a C + 12 lido por `obterVisaoMensal` (saldo do mês e `futuro`)

**Independent Test**: na Visão geral de março, na aba Parcelado, digitar R$ 1.000,00 em 3x mostra o
bloco com "Cabe. Nenhum mês fica no vermelho." e três linhas; o formulário de Avulso não mostra
bloco.

---

## Edge Cases

- WHEN a compra tem 1 parcela THEN o sistema SHALL mostrar uma linha e o veredito sobre ela
- WHEN a primeira parcela é C + 12 e a compra tem 2 parcelas THEN o sistema SHALL mostrar uma linha e
  "Enxergo até <C + 12>."
- WHEN o menor parcelamento que cabe é menor que o pedido THEN o sistema SHALL mostrar "Em <m>x
  cabe." com esse `m` (a busca começa em 1)
- WHEN `saldoDepois` é exatamente 0 THEN o sistema SHALL tratar a linha como cabendo e mostrar "Vai
  sobrar R$ 0,00" sem cor
- WHEN um mês tem `saldoAntes < 0` e a compra o deixa ainda mais negativo THEN o sistema SHALL marcar
  "já estava no vermelho" e não listá-lo entre os que "ficam no vermelho"
- WHEN a tela é aberta em competência sem lançamento nenhum THEN o sistema SHALL mostrar saldo
  "antes" R$ 0,00 em cada mês e a resposta normal
- Virada de ano no horizonte: os meses do ano seguinte saem com "de <ano>" no veredito (SIM-02, AC 7)
- `menorParcelamentoQueCabe` com total menor que 120 centavos: a busca para no último `n` válido

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SIM-01 | P1: O domínio responde se a compra cabe | Execute | Implementing: ACs 1 a 10 e os edge cases em `src/domain/mes/simular-compra.test.ts` (T1) |
| SIM-02 | P1: A tela "Dá pra comprar?" | Specify | Pending |
| SIM-03 | P1: "Simular" na navegação | Specify | Pending |
| SIM-04 | P1: Lançar esta compra | Specify | Pending |
| SIM-05 | P2: A resposta dentro do cadastro de compra | Specify | Pending |

**Coverage:** 5 total, 5 mapped to tasks (T1 a T9), 0 unmapped

---

## Success Criteria

- [ ] `/2026-03/simular` responde a R$ 1.000,00 em 3x com três linhas e "Cabe" sem chamada ao servidor
- [ ] Depois de "Lançar esta compra", o "Saldo previsto" de abril é o `saldoDepois` simulado
- [ ] A barra inferior com cinco itens não quebra rótulo em 360 px
- [ ] 100% de branches em `src/domain/mes/simular-compra.ts`
- [ ] `pnpm verify` e `pnpm test:e2e` saem 0
