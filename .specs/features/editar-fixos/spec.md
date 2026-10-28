# Editar gasto fixo e entrada fixa: Specification

> Pedido do dono em 2026-10-28, depois da importação da planilha: "vamos fazer o simples e editar
> igual como é no cadastro de um novo fixo". Resumo aprovado em chat no mesmo dia.

## Problem Statement

Um gasto fixo ou uma entrada fixa, depois de cadastrado, só aceita dois gestos: "Mudar valor" (a
partir de um mês) e "Encerrar". Descrição, categoria, meio de pagamento, pessoa e dia de vencimento
errados não têm conserto — nem para o que foi cadastrado à mão, nem para os fixos que a importação
da planilha criou, com categoria e meio tirados da aba.

A correção pedida é a mais simples possível: o mesmo formulário do cadastro, aberto com o que está
gravado, para mudar e salvar.

## Goals

- [ ] Corrigir descrição, categoria, meio, pessoa ou dia de um fixo em um gesto, e ver a correção em
      todos os meses do fixo, inclusive os que já passaram
- [ ] Nenhuma edição muda um pagamento já marcado nem reescreve o valor de meses passados
- [ ] O formulário de edição é o de cadastro, com os mesmos campos, validações e textos

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editar avulso, entrada avulsa e compra parcelada | O dono escolheu começar pelo fixo. A análise desses tipos está em rascunho em `.specs/features/editar-lancamentos/context.md` |
| Trocar a natureza (conta a pagar ↔ dinheiro que entra) | Inverteria o sinal dos meses que já passaram, inclusive os pagos. O caminho é encerrar e cadastrar de novo |
| Mudar o mês de início | Antecipar criaria meses que não existiam; atrasar apagaria meses, às vezes pagos |
| Renomear ou arquivar a categoria em si | Aqui se troca qual categoria o fixo usa; o cadastro de categorias é outra fatia |
| Histórico de alterações e desfazer | Fora do pedido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Alcance de descrição, categoria, meio, pessoa e dia | O fixo e **todas** as suas ocorrências, passadas inclusive | Decisão do dono no resumo aprovado | y |
| Valor | Igual ao "Mudar valor": vale a partir de um mês, sem reescrever o passado | Decisão do dono | y |
| "Vale a partir de" | Aparece só quando o valor muda, preenchido com o mês que a pessoa está vendo | Decisão do dono | y |
| "Termina em" | Pôr um mês = encerrar com aquele mês como o último; apagar = reabrir | Decisão do dono | y |
| Natureza e início | Visíveis e travados, com o motivo ao lado | Decisão do dono | y |
| Pagamento já marcado | Continua marcado, com a mesma data | Decisão do dono | y |
| Ocorrência com valor real confirmado | Mantém o valor confirmado; só os campos da série mudam | O valor confirmado é dado da conta que chegou, não da série | n |
| Data das ocorrências quando o dia muda | Recalculada para todas, pela mesma regra da materialização (dia limitado ao fim do mês) | Coerência com "o dia vale para o fixo inteiro" | n |
| Onde fica o "Editar" | Em cada cartão de "Todo mês", ao lado de "Mudar valor" e "Encerrar", que continuam | Resumo aprovado | y |
| Concorrência entre as duas pessoas | A última gravação vale | Como em todo o app | n |
| Ordem de entrada no ar | Depois das três importações em produção | Decisão do dono: editar um fixo importado entre uma aba e a seguinte faria a importação criar outro | y |

**Open questions:** none.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação e limites de entrada | EDF-05: os mesmos limites do cadastro; fim antes do início é recusado |
| Falha e falha parcial | EDF-06 AC 1-2: tudo ou nada |
| Idempotência, retentativa, duplicata | Salvar duas vezes os mesmos dados não cria versão nem ocorrência nova (EDF-03 AC 3, EDF-02 AC 4) |
| Fronteiras de autorização e limite de taxa | EDF-06 AC 3. Limite de taxa: N/A, app privado com allowlist (AD-007) |
| Concorrência e ordenação | A última gravação vale (Assumptions) |
| Ciclo de vida do dado | EDF-04: encerrar e reabrir; nenhuma ocorrência paga é apagada |
| Observabilidade | EDF-06 AC 4: correlação no servidor, sem stack no navegador |
| Falha de dependência externa | N/A: nenhum serviço externo |
| Integridade de transição de estado | EDF-04 e EDF-05: encerrado ↔ aberto pelos casos de uso; natureza e início imutáveis |

---

## User Stories

### P1: Abrir o fixo no formulário do cadastro ⭐ MVP — EDF-01

**User Story**: Como quem administra os fixos da casa, quero abrir um fixo no mesmo formulário em
que o cadastrei, com tudo preenchido, para corrigir o que estiver errado.

**Why P1**: É o pedido.

**Acceptance Criteria**

1. WHEN a área "Todo mês" é exibida THEN o sistema SHALL mostrar "Editar" em cada cartão de fixo,
   ao lado de "Mudar valor" e "Encerrar"
2. WHEN "Editar" é acionado THEN o sistema SHALL abrir o formulário de cadastro de fixo num
   `<dialog>`, com o título "Editar gasto fixo" para conta a pagar e "Editar entrada" para dinheiro
   que entra
3. WHEN o formulário de edição abre THEN o sistema SHALL preencher descrição, natureza, valor
   vigente no mês exibido, dia de vencimento, início, fim, meio, categoria e pessoa com o que está
   gravado
4. WHEN o formulário está em edição THEN o sistema SHALL rotular o botão "Salvar alterações"
5. WHEN o fixo é uma entrada THEN o sistema SHALL usar o vocabulário de receita do cadastro ("Onde o
   dinheiro cai", só meios sem fatura — AD-015)

**Independent Test**: abrir "Editar" num fixo de outubro e ver os nove campos com os valores
gravados.

---

### P1: Corrigir o fixo inteiro ⭐ MVP — EDF-02

**User Story**: Como quem administra os fixos, quero que a descrição, a categoria, o meio, a pessoa e
o dia corrigidos valham em todos os meses do fixo, para que os meses passados também fiquem certos.

**Why P1**: É o conserto que hoje não existe.

**Acceptance Criteria**

1. WHEN a edição muda descrição, categoria, meio, pessoa ou dia de vencimento THEN o sistema SHALL
   gravar o novo valor no fixo e em todas as suas ocorrências, das competências passadas inclusive
2. WHEN o dia de vencimento muda THEN o sistema SHALL recalcular a data de cada ocorrência com o dia
   novo, limitado ao último dia do mês da ocorrência
3. WHEN uma ocorrência já está paga ou tem valor real confirmado THEN o sistema SHALL manter a data
   de pagamento e o valor dela
4. WHEN a edição é salva sem mudança nesses campos THEN o sistema SHALL não alterar nenhuma ocorrência
5. WHEN o meio muda THEN as ocorrências SHALL passar a aparecer no bloco da lista que o meio novo
   define (AD-012)

**Independent Test**: trocar a categoria e a descrição de um fixo em novembro e ver as duas mudanças
também na lista de outubro.

---

### P1: Mudar o valor a partir de um mês ⭐ MVP — EDF-03

**User Story**: Como quem administra os fixos, quero mudar o valor no mesmo formulário, valendo a
partir de um mês, para não reescrever o que já foi pago.

**Why P1**: O valor é o campo mais editado, e já tem uma regra que o dono aprovou.

**Acceptance Criteria**

1. WHEN o valor no formulário difere do valor vigente no mês exibido THEN o sistema SHALL mostrar o
   campo "Vale a partir de", preenchido com o mês exibido
2. WHEN a edição é salva com valor diferente THEN o sistema SHALL registrar uma vigência nova a
   partir do mês escolhido, com o mesmo efeito de "Mudar valor" (`registrar-versao`)
3. WHEN a edição é salva com o valor igual ao vigente THEN o sistema SHALL não registrar vigência
4. WHEN a vigência é registrada THEN as ocorrências de meses anteriores ao escolhido SHALL manter o
   valor que tinham
5. IF "Vale a partir de" for anterior ao início do fixo THEN o sistema SHALL recusar com
   `PERIODO_INVALIDO`, sem gravar nada

**Independent Test**: em novembro, mudar o valor de R$ 100,00 para R$ 110,00 a partir de novembro, e
ver outubro com R$ 100,00 e novembro e dezembro com R$ 110,00.

---

### P1: Encerrar e reabrir pelo "Termina em" ⭐ MVP — EDF-04

**User Story**: Como quem administra os fixos, quero pôr ou tirar o mês em que o fixo termina, pelo
mesmo campo do cadastro.

**Why P1**: É campo do formulário, e "igual ao cadastro" foi o pedido.

**Acceptance Criteria**

1. WHEN "Termina em" recebe um mês M e antes estava vazio, ou era posterior a M, THEN o sistema SHALL
   encerrar o fixo com M como último mês em que vale, pelo caso de uso `encerrar` (a partir de M + 1)
2. WHEN "Termina em" é esvaziado num fixo encerrado THEN o sistema SHALL reabri-lo, sem fim, e as
   ocorrências dos meses seguintes SHALL voltar a aparecer na próxima abertura de mês
3. WHEN "Termina em" recebe um mês posterior ao fim atual THEN o sistema SHALL gravar o mês novo como
   fim, e os meses entre os dois SHALL passar a ter ocorrência
4. IF "Termina em" for anterior ao início THEN o sistema SHALL recusar com `PERIODO_INVALIDO`, como no
   cadastro

**Independent Test**: encerrar em novembro pelo formulário, ver dezembro sem a ocorrência; esvaziar o
campo e ver dezembro com ela de novo.

---

### P1: Natureza e início travados ⭐ MVP — EDF-05

**User Story**: Como quem administra os fixos, quero ver a natureza e o início no formulário, mas sem
poder mudá-los, para não reescrever o passado por engano.

**Why P1**: É a fronteira do que a edição pode fazer.

**Acceptance Criteria**

1. WHEN o formulário está em edição THEN o sistema SHALL mostrar "O que é" e "Começa em" desabilitados,
   com o texto "Para mudar, encerre este e cadastre de novo"
2. WHEN a edição chega ao servidor THEN o sistema SHALL aceitar só os campos editáveis; natureza e
   início não fazem parte do payload de edição
3. IF qualquer campo editável violar a validação do cadastro (descrição vazia ou longa, valor não
   positivo, dia fora de 1 a 31, meio ou categoria inexistente) THEN o sistema SHALL recusar com o
   mesmo erro do cadastro, sem gravar nada

**Independent Test**: no formulário de edição, os dois campos aparecem desabilitados; um payload com
natureza é recusado na validação.

---

### P1: Gravar tudo ou nada ⭐ MVP — EDF-06

**User Story**: Como quem administra os fixos, quero que uma edição grave por inteiro ou não grave
nada.

**Why P1**: Uma edição pela metade deixaria fixo e ocorrências discordando.

**Acceptance Criteria**

1. WHEN a edição é salva THEN o sistema SHALL gravar numa única transação a série, as ocorrências, a
   vigência nova e o encerramento ou a reabertura
2. IF qualquer escrita falhar THEN o sistema SHALL desfazer todas
3. IF a requisição chegar sem sessão válida THEN o sistema SHALL recusá-la com o código de sessão,
   antes de qualquer acesso ao banco
4. IF ocorrer falha não prevista THEN o sistema SHALL devolver `ERRO_INESPERADO` com identificador de
   correlação, sem stack trace no navegador
5. IF o fixo não existir THEN o sistema SHALL recusar com `RECORRENCIA_NAO_ENCONTRADA`
6. WHEN a edição termina THEN o sistema SHALL revalidar "Todo mês", Lançamentos e Visão geral, e o
   formulário SHALL mostrar a confirmação dentro do diálogo, sem fechá-lo (AD-014)

**Independent Test**: uma falha injetada na gravação das ocorrências deixa o fixo exatamente como
estava.

---

## Edge Cases

- WHEN o dia de vencimento é 31 e a ocorrência é de fevereiro THEN o sistema SHALL datá-la no último
  dia de fevereiro
- WHEN o fixo veio da importação da planilha THEN o sistema SHALL editá-lo como qualquer outro
- WHEN o fixo está encerrado THEN o "Editar" SHALL continuar disponível, inclusive para reabrir

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| EDF-01 | P1: Abrir o fixo no formulário do cadastro | Tasks | In Tasks |
| EDF-02 | P1: Corrigir o fixo inteiro | Execute | Implementing: série no plano, ACs 1 e 4, e data recalculada com o dia limitado ao fim do mês, AC 2 (T1); série gravada no fixo e em todas as ocorrências, com a data recalculada e pagamento e valor confirmado intactos, ACs 1 a 3, no banco e nos fakes (T2); série gravada pelo caso de uso no fixo e em todas as ocorrências, e salvar sem mudança sem escrita nenhuma, ACs 1 a 4 (T4) |
| EDF-03 | P1: Mudar o valor a partir de um mês | Execute | Implementing: vigência no plano, ACs 2 e 3, e recusa da vigência antes do início, AC 5 (T1); vigência pelo `registrarVersao`, sem tocar no mês anterior nem no pago, ACs 2 a 4, e recusa no campo da vigência, AC 5 (T4) |
| EDF-04 | P1: Encerrar e reabrir pelo "Termina em" | Execute | Implementing: as seis linhas do fim no plano, ACs 1 a 3, e recusa do fim antes do início, AC 4 (T1); reabrir e estender o fim no banco e nos fakes, ACs 2 e 3 (T2); encerrar, reabrir e estender pelo caso de uso, com a paga depois do fim novo preservada e os meses de volta na abertura seguinte, ACs 1 a 4 (T4) |
| EDF-05 | P1: Natureza e início travados | Execute | Implementing: meio inexistente ou arquivado e categoria inexistente recusados com o código do cadastro, sem gravar, AC 3 (T4) |
| EDF-06 | P1: Gravar tudo ou nada | Execute | Implementing: transação genérica com os quatro repositórios sobre o mesmo `tx`, rollback de todos numa exceção, ACs 1 e 2, e a da importação composta sobre ela (T3); recusa de caso de uso depois da primeira escrita lançada para o rollback, AC 2, e fixo inexistente, AC 5 (T4) |

**ID format:** `EDF-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 6 total, 6 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] O dono corrige um fixo importado (categoria e meio) em um gesto e vê a correção em outubro,
      novembro e dezembro
- [ ] Nenhum pagamento marcado e nenhum valor de mês passado muda por causa de uma edição
