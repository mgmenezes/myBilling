# Excluir compra parcelada desta parcela em diante: Specification

> Pedido do dono em 2026-11-02, ao notar que só alguns lançamentos têm "⋯" com "Excluir": "caso
> ela seja parcelada o usuário deve ser avisado que isso irá impactar os meses seguintes e caso
> seja avulsa apenas se tem certeza que deseja excluir". Decisões tomadas em chat no mesmo dia:
> a exclusão vale desta parcela em diante, editar fica para outra fatia, o avulso mantém os dois
> toques de hoje. As quatro decisões do autor apresentadas no resumo foram confirmadas ("confirmo").

## Problem Statement

Uma compra parcelada gravada não tem como sair do app. O "⋯" com "Excluir" só existe no avulso,
e a regra que barrou a parcela (`painel-e-lancamentos`, "Parcela de compra não é excluível nesta
fatia") apontava para uma fatia de edição com escopo que nunca foi feita. Compra cancelada, estornada
ou cadastrada errada continua pesando no saldo de todos os meses seguintes, e a tela não diz por que
o "⋯" some na parcela.

## Goals

- [ ] Toda parcela não cancelada tem o "⋯" com "Excluir", como o avulso
- [ ] Antes de excluir, a pessoa lê quantas parcelas saem, de que meses e quanto somam
- [ ] Depois de excluir, nenhum mês seguinte conta as parcelas que saíram, e a compra continua
      fechando a soma: total = amortizado anterior + soma das parcelas que ficaram

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editar avulso ou compra parcelada | Decisão do dono: só excluir nesta rodada. O rascunho em `editar-lancamentos/context.md` continua valendo para a fatia de edição |
| Excluir só uma parcela, ou a compra inteira a partir de uma parcela do meio | Decisão do dono: o alcance é desta parcela em diante |
| Excluir gasto fixo ou ocorrência de fixo | O fixo já tem "Encerrar" em Todo mês; a linha do fixo continua sem "⋯" |
| Mudar a confirmação do avulso | Decisão do dono: os dois toques de hoje ("Excluir" → "Confirmar?") bastam |
| Desfazer a exclusão | Fora do pedido; nada no app desfaz hoje |
| Proteger a importação de uma aba que ainda traz a parcela excluída | A planilha deixou de ser a fonte; reimportar uma aba antiga é caso raro e fica como assumption |
| "⋯" nos "Últimos lançamentos" da Visão geral | Esse bloco não tem menu hoje, nem para o avulso |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Alcance | A parcela escolhida e as de número maior da mesma compra; as de número menor ficam | Decisão do dono ("desta parcela em diante") | y |
| Editar junto | Fica fora | Decisão do dono | y |
| Confirmação do avulso | Continua em dois toques, sem mudança | Decisão do dono | y |
| Parcela paga dentro do alcance | Fica, com o mesmo `pago_em`; sai só a não paga. O aviso diz quantas pagas ficam | Mesma regra do "Encerrar" do fixo: não apagar o que já saiu da conta. Decisão do autor, confirmada pelo dono | y |
| Total da compra depois | Amortizado anterior + soma das parcelas que ficaram | Conservação (AD-003, AD-005). Decisão do autor, confirmada pelo dono | y |
| Onde fica o aviso | Dentro do menu "⋯" aberto, sem diálogo, como o "Confirmar?" do avulso | Decisão do autor, confirmada pelo dono | y |
| Processo | Fatia própria em `.specs/features/excluir-compra/` | Decisão do autor, confirmada pelo dono | y |
| Texto do aviso, botão e toast | Os textos dos ACs de EXC-02 e EXC-04 | O dono aprovou a ideia do aviso; a redação é do autor | y (decisão do autor, confirmada pelo dono) |
| Botão "Cancelar" no aviso da parcela | Existe, além do `Escape` e do clique fora | O aviso da parcela é mais longo que o "Confirmar?" do avulso, e um botão explícito para desistir cabe ao lado do de excluir | y (decisão do autor, confirmada pelo dono) |
| Numeração das parcelas que ficam | Continua `n/t` da compra original ("2/4"); o "faltam" conta só as parcelas não canceladas depois dela, e a última que ficou mostra "última" | "2/4" é o número da fatura; "faltam 2" prometeria parcelas que não existem mais | y (decisão do autor, confirmada pelo dono) |
| Como a parcela sai | Exclusão lógica, como a do avulso: a linha fica com `cancelado_em` e nenhuma soma a conta | É o mecanismo que todas as somas já ignoram (`cancelarLancamento`). O design confirma ou troca, mantendo os ACs | y (decisão do autor, confirmada pelo dono) |
| Quem pode excluir | Qualquer pessoa com sessão, qualquer compra, como no resto do app | O app é de duas pessoas e não separa dono de lançamento | y (decisão do autor, confirmada pelo dono) |
| Reimportar uma aba que ainda traz a parcela excluída | A importação não reconhece a compra e a cria de novo como compra nova | É o comportamento de hoje para linha sem compra em curso; proteger exigiria marcar a compra como excluída na importação, fora do pedido | y (decisão do autor, confirmada pelo dono) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: "⋯" com "Excluir" na parcela ⭐ MVP — EXC-01

**User Story**: Como quem cadastrou uma compra que não vale mais, quero achar "Excluir" na linha
da parcela, no mesmo lugar do avulso, para não procurar um caminho que não existe.

**Why P1**: Hoje não há nenhum gesto para a compra parcelada.

**Acceptance Criteria**

1. WHEN a lista de Lançamentos mostra uma parcela não cancelada THEN o sistema SHALL exibir na
   linha o mesmo botão "⋯" do avulso, com o nome acessível "Mais ações para <descrição>"
2. WHEN a pessoa abre o "⋯" de uma parcela THEN o menu SHALL mostrar o botão "Excluir"
3. WHEN a lista mostra uma ocorrência de gasto fixo ou de entrada fixa THEN o sistema SHALL
   exibi-la sem "⋯", como hoje
4. WHEN a pessoa exclui um avulso THEN o sistema SHALL manter os dois toques de hoje, "Excluir" e
   depois "Confirmar?", sem o aviso de EXC-02
5. WHILE a largura é menor que 768 px o cartão da parcela SHALL ter o mesmo "⋯" com "Excluir",
   com o "⋯" e o "Excluir" de ao menos 44 × 44 px no toque (TOQUE-01)

**Independent Test**: em janeiro, com uma compra em 4x e um gasto fixo, a parcela 3/4 tem "⋯" com
"Excluir", o fixo não tem "⋯", e o avulso ainda pede "Confirmar?".

---

### P1: O aviso antes de excluir ⭐ MVP — EXC-02

**User Story**: Como quem vai excluir uma parcela, quero saber o que vai sair dos meses seguintes
antes de confirmar, para não apagar mais do que eu queria.

**Why P1**: É o pedido do dono: avisar que a exclusão afeta os meses seguintes.

Nos textos abaixo, `<k>` é o número de parcelas não pagas, não canceladas, de número maior ou
igual ao da parcela escolhida; `<primeiro>` e `<último>` são o mês da primeira e da última delas
no formato de `formatarCompetencia` ("Janeiro de 2027"); `<total>` é a soma delas em `formatarBRL`;
`<p>` é o número de parcelas pagas no mesmo alcance.

**Acceptance Criteria**

1. WHEN a pessoa toca "Excluir" no menu de uma parcela THEN o sistema SHALL mostrar o aviso dentro
   do menu aberto, sem excluir nada
2. WHEN `<k>` é maior que 1 THEN o aviso SHALL dizer "Saem <k> parcelas, de <primeiro> a <último>,
   somando <total>."
3. WHEN `<k>` é 1 THEN o aviso SHALL dizer "Sai 1 parcela, em <primeiro>, de <total>."
4. WHEN existe parcela não cancelada de número menor que o da escolhida THEN o aviso SHALL começar
   com "Excluir <descrição> desta parcela em diante?" e terminar com "As anteriores ficam."
5. WHEN não existe parcela não cancelada de número menor que o da escolhida THEN o aviso SHALL
   começar com "Excluir a compra <descrição> inteira?" e não SHALL dizer "As anteriores ficam."
6. WHEN `<p>` é 1 THEN o aviso SHALL acrescentar "1 parcela já paga fica."; WHEN `<p>` é maior que
   1 THEN SHALL acrescentar "<p> parcelas já pagas ficam."
7. WHEN o aviso aparece THEN o menu SHALL mostrar o botão "Excluir desta em diante" e o botão
   "Cancelar", e o foco SHALL ir para "Cancelar"
8. WHEN a pessoa toca "Excluir desta em diante" THEN o sistema SHALL executar a exclusão de EXC-03
9. WHEN a pessoa toca "Cancelar", aperta `Escape` ou clica fora do menu THEN o sistema SHALL fechar
   o menu sem excluir nada, com o foco de volta no "⋯", e ao reabrir o menu SHALL mostrar "Excluir"
   de novo, sem o aviso
10. WHILE a exclusão está sendo gravada o botão "Excluir desta em diante" SHALL ficar desabilitado

**Independent Test**: numa compra em 4x de R$ 10,00 de dezembro de 2026 a março de 2027, tocar
"Excluir" na 2/4 mostra "Excluir <descrição> desta parcela em diante? Saem 3 parcelas, de Janeiro
de 2027 a Março de 2027, somando R$ 30,00. As anteriores ficam."; "Cancelar" fecha sem excluir.

---

### P1: O alcance da exclusão ⭐ MVP — EXC-03

**User Story**: Como quem confirmou a exclusão, quero que saiam exatamente as parcelas que o aviso
disse, para os meses seguintes ficarem certos sem mexer no que já passou ou já foi pago.

**Why P1**: É a regra de negócio da fatia.

**Acceptance Criteria**

1. WHEN a exclusão é confirmada a partir da parcela `n` THEN o sistema SHALL tirar de toda soma
   cada parcela da mesma compra de número maior ou igual a `n` que não está paga nem cancelada
2. WHEN a exclusão é confirmada THEN o sistema SHALL manter sem mudança as parcelas de número menor
   que `n`, com valor, número, data, categoria e pagamento iguais
3. WHEN uma parcela de número maior ou igual a `n` está paga THEN o sistema SHALL mantê-la, com o
   mesmo valor e o mesmo `pago_em`
4. WHEN a exclusão termina THEN o total gravado da compra SHALL ser igual ao amortizado anterior
   mais a soma das parcelas não canceladas que ficaram
5. The system SHALL não alterar parcela nem total de nenhuma outra compra, nem nenhum avulso ou
   ocorrência de fixo
6. IF uma das escritas da exclusão falha THEN o sistema SHALL desfazer todas as escritas daquela
   exclusão, deixando a compra e as parcelas como estavam
7. WHEN a mesma exclusão chega de novo para uma parcela já cancelada (clique duplo, duas abas)
   THEN o sistema SHALL responder sem erro e sem mudar nada

**Independent Test**: compra em 4x de R$ 10,00, a 3/4 paga; excluir a partir da 2/4 deixa 1/4 e
3/4 somando, tira 2/4 e 4/4, e grava o total da compra em R$ 20,00 mais o amortizado anterior.

---

### P1: Depois de excluir ⭐ MVP — EXC-04

**User Story**: Como quem excluiu, quero ver o resultado na hora em todos os meses, para confiar
que o saldo previsto já não conta a compra.

**Why P1**: Sem isso a exclusão parece não ter funcionado.

**Acceptance Criteria**

1. WHEN a exclusão termina THEN a linha da parcela escolhida SHALL sair da lista do mês aberto sem
   recarregar a página
2. WHEN a exclusão termina THEN a lista de cada mês que tinha uma parcela excluída SHALL deixar de
   mostrá-la
3. WHEN a exclusão termina THEN os totais do mês, o "Saldo previsto", "Gastos por categoria",
   "Próximos meses" e a resposta de "Dá pra comprar?" de cada mês afetado SHALL deixar de contar
   as parcelas excluídas
4. WHEN a exclusão termina THEN o sistema SHALL mostrar o toast "<k> parcelas excluídas." quando
   `<k>` é maior que 1 e "1 parcela excluída." quando `<k>` é 1, com o comportamento de toast de
   TRC-04 AC 4
5. WHEN uma parcela que ficou não tem parcela não cancelada de número maior THEN a linha dela SHALL
   mostrar "<n>/<t> · última"; caso contrário SHALL mostrar "<n>/<t> · faltam <r>", com `<r>` igual
   ao número de parcelas não canceladas de número maior

**Independent Test**: compra em 4x de dezembro a março; excluir a partir da 3/4 em fevereiro tira
fevereiro e março da compra, "Próximos meses" sobe o saldo de cada um desses meses em R$ 10,00, e a 2/4 em
janeiro mostra "2/4 · última".

---

### P1: Recusar sem gravar ⭐ MVP — EXC-05

**User Story**: Como quem usa o app, quero que uma exclusão que não pode acontecer não grave nada e
diga por quê.

**Why P1**: Regras do projeto para toda Server Action (AGENTS.md).

**Acceptance Criteria**

1. The system SHALL chamar `requireSession()` antes de qualquer leitura da exclusão
2. IF o payload não é `{ lancamentoId }` com um uuid, sem campo a mais THEN o sistema SHALL recusar
   com `VALIDACAO` sem ler o banco
3. IF o lançamento não existe THEN o sistema SHALL recusar com `LANCAMENTO_NAO_ENCONTRADO` e a
   mensagem "Esse lançamento não existe mais."
4. IF o lançamento não é parcela de compra THEN o sistema SHALL recusar com um código próprio, sem
   gravar nada, e com uma mensagem em `src/lib/erros.ts`
5. IF não há nenhuma parcela não paga e não cancelada no alcance THEN o aviso SHALL dizer "Todas as
   parcelas desta em diante já foram pagas. Nada a excluir.", sem o botão "Excluir desta em
   diante", e o servidor SHALL recusar a mesma exclusão com um código próprio, sem gravar nada
6. IF a exclusão falha por erro não previsto THEN o sistema SHALL responder `ERRO_INESPERADO` com
   referência de correlação, como as outras actions
7. WHEN a action recusa THEN o menu SHALL mostrar a mensagem em `role="alert"`, sem toast, e a
   linha SHALL continuar na lista

**Independent Test**: com a 3/4 e a 4/4 pagas, tocar "Excluir" na 3/4 mostra "Todas as parcelas
desta em diante já foram pagas. Nada a excluir." e nenhum botão de excluir.

---

## Edge Cases

- WHEN a parcela escolhida é a primeira não cancelada da compra THEN a exclusão SHALL tirar a compra
  inteira das somas, menos as parcelas pagas (EXC-02 AC 5; EXC-03 AC 1)
- WHEN a parcela escolhida é a última da compra THEN `<k>` SHALL ser 1 e o aviso SHALL usar o texto
  de EXC-02 AC 3
- WHEN a parcela escolhida está paga e há parcelas não pagas depois dela THEN a escolhida SHALL
  ficar e as não pagas depois dela SHALL sair (EXC-03 AC 3)
- WHEN a parcela escolhida está num mês passado THEN o alcance SHALL ser o mesmo: dela em diante,
  menos as pagas
- WHEN a compra foi reprecificada e as parcelas têm valores diferentes THEN `<total>` SHALL ser a
  soma dos valores gravados das parcelas que saem
- WHEN a lista está filtrada (busca, categoria, situação) THEN a linha excluída SHALL sair da lista
  filtrada também

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| EXC-01 | P1: "⋯" com "Excluir" na parcela | Tasks | In Tasks |
| EXC-02 | P1: O aviso antes de excluir | Tasks | In Tasks |
| EXC-03 | P1: O alcance da exclusão | Tasks | In Tasks |
| EXC-04 | P1: Depois de excluir | Tasks | In Tasks |
| EXC-05 | P1: Recusar sem gravar | Tasks | In Tasks |

**Status values:** Pending → In Design → In Tasks → Implementing → Implemented → Verified

`Implemented` quer dizer que todas as tasks do requisito estão commitadas com o gate verde.
`Verified` é do Verifier independente, depois da última task, e nenhuma linha o recebe do autor.

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Excluir uma compra parcelada leva dois toques no "⋯" da parcela, e o aviso diz parcelas,
      meses e soma antes do segundo
- [ ] Nenhuma soma de nenhum mês conta parcela excluída, e nenhuma parcela paga sai
- [ ] A compra continua fechando total = amortizado anterior + soma das parcelas que ficaram
