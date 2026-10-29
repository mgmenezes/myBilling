# Trocar a categoria na lista de Lançamentos: Specification

> Pedido do dono em 2026-10-29, depois de conferir fevereiro e março contra a planilha: "observe
> que nos lançamentos, as entradas estão sem categoria" e "se inserir um dropdown para, se
> desejarmos, trocar de categoria". Resumo aprovado em chat no mesmo dia, com uma troca: o aviso
> da troca é um toast.

## Problem Statement

Na lista de Lançamentos, toda entrada aparece como "Sem categoria", embora seja uma receita e o
cartão dela em "Todo mês" diga "Receita". E a categoria de um gasto só muda abrindo um formulário,
quando há um: a edição de fixo existe, a de compra parcelada e a de gasto do mês ainda não.

A importação criou muitos lançamentos com a categoria da aba, e corrigir uma categoria errada é o
ajuste mais comum depois dela. O conserto pedido é trocar ali mesmo, na linha.

## Goals

- [ ] Toda entrada aparece como "Receita" na coluna Categoria
- [ ] A categoria de qualquer gasto troca num gesto, na linha, sem abrir formulário
- [ ] Trocar a categoria de um fixo ou de uma compra vale para todos os meses dele, e a pessoa é
      avisada disso no momento da troca

## Out of Scope

| Feature | Reason |
| --- | --- |
| Categoria para entradas | Decisão do dono: "toda entrada pode ser inserida como receita, vamos ter o seletor apenas nos gastos" |
| Desfazer | Escolher a categoria anterior de novo desfaz a troca |
| Criar categoria nova pelo seletor da linha | O pedido é trocar entre as que existem; o cadastro inline continua nos formulários |
| Trocar a categoria de vários lançamentos de uma vez | Fora do pedido |
| Trocar só um mês de um fixo ou só uma parcela de uma compra | Decisão do dono: o alcance é o fixo inteiro e a compra inteira |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Alcance num fixo | O fixo e todas as ocorrências dele, de todas as competências, passadas inclusive | Decisão do dono ("todos, seja compras, fixos ou entradas") | y |
| Alcance numa compra parcelada | A compra e todas as parcelas dela | Decisão do dono | y |
| Alcance num gasto do mês | Só ele | Decisão do dono | y |
| Quando grava | Ao escolher a opção, sem botão de salvar e sem confirmação | Resumo aprovado | y |
| Aviso da troca | Toast, com o alcance no texto | Pedido do dono ao aprovar o resumo | y |
| Erro na troca | O seletor volta à categoria anterior e a mensagem aparece na linha; não há toast | Resumo aprovado | y |
| Investimento | Recebe o seletor, como despesa: o seletor fica em tudo que não é entrada | Resumo aprovado ("tudo certo") | y |
| Entrada com categoria gravada | Também mostra "Receita" | "Toda entrada pode ser inserida como receita" | y |
| Ordem das opções | "Sem categoria" primeiro, depois as categorias ativas na ordem de `listarCategoriasDisponiveis` | É a ordem dos formulários de cadastro | n (decisão do autor) |
| Categoria gravada que não está entre as ativas | Aparece selecionada como opção a mais, com o nome dela ou "Categoria removida" | Sem isso o seletor mostraria "Sem categoria" para um lançamento que tem categoria | n (decisão do autor) |
| Duração do toast | 4 segundos; um toast por vez, o novo substitui o anterior | Tempo para ler uma frase curta sem ficar na frente da lista | n (decisão do autor) |
| Lançamento cancelado | Tratado como inexistente | Não aparece na lista; é o que `marcarPagamento` já faz | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Entrada aparece como Receita ⭐ MVP — TRC-01

**User Story**: Como quem confere o mês, quero ver "Receita" na categoria de uma entrada, para não
achar que ela ficou sem classificação.

**Why P1**: Hoje toda entrada da lista diz "Sem categoria", o que parece um erro da importação.

**Acceptance Criteria**

1. WHEN a lista de Lançamentos mostra uma entrada THEN o sistema SHALL exibir "Receita" na coluna
   Categoria, tenha ela categoria gravada ou não
2. WHEN a lista de Lançamentos mostra uma entrada THEN o sistema SHALL exibi-la sem seletor de
   categoria

**Independent Test**: com uma entrada fixa e uma avulsa em fevereiro, a lista mostra "Receita" nas
duas e nenhum seletor na seção Entradas.

---

### P1: Trocar a categoria de um gasto na linha ⭐ MVP — TRC-02

**User Story**: Como quem corrige o que a importação trouxe, quero trocar a categoria de um gasto
na própria linha, para não abrir um formulário por categoria errada.

**Why P1**: É o conserto pedido.

**Acceptance Criteria**

1. WHEN a lista de Lançamentos mostra um gasto (despesa ou investimento) THEN o sistema SHALL
   exibir na coluna Categoria um seletor com "Sem categoria" e as categorias ativas, com a
   categoria gravada selecionada
2. WHEN a pessoa escolhe outra opção no seletor THEN o sistema SHALL gravar a troca sem outro
   clique e sem pedir confirmação
3. IF a categoria gravada do gasto não está entre as ativas THEN o seletor SHALL mostrá-la
   selecionada como opção a mais, com o nome dela, ou "Categoria removida" quando o nome não é
   conhecido
4. WHILE a troca está sendo gravada o seletor SHALL ficar desabilitado
5. The system SHALL dar ao seletor de cada linha o nome acessível "Categoria de <descrição>"

**Independent Test**: em fevereiro, escolher "Categoria Dois" no seletor do Mercado grava a troca,
e ao recarregar a linha mostra "Categoria Dois".

---

### P1: O alcance da troca ⭐ MVP — TRC-03

**User Story**: Como quem corrige uma categoria, quero que a troca de um fixo ou de uma compra
valha para todos os meses dela, para não corrigir mês a mês.

**Why P1**: Decisão do dono; uma categoria errada num fixo está errada em todos os meses.

**Acceptance Criteria**

1. WHEN o gasto trocado é ocorrência de um fixo THEN o sistema SHALL gravar a categoria nova no
   fixo e em todas as ocorrências dele, de todas as competências, sem mudar valor, valor previsto,
   data, pagamento nem cancelamento de nenhuma
2. WHEN um fixo tem a categoria trocada THEN as ocorrências que ele gerar depois SHALL nascer com a
   categoria nova
3. WHEN o gasto trocado é parcela de uma compra parcelada THEN o sistema SHALL gravar a categoria
   nova na compra e em todas as parcelas dela, sem mudar valor, número, data nem pagamento de
   nenhuma
4. WHEN o gasto trocado não é de fixo nem de compra THEN o sistema SHALL gravar a categoria nova só
   nele, sem tocar em nenhum outro lançamento
5. WHEN a pessoa escolhe "Sem categoria" THEN o sistema SHALL gravar a ausência de categoria com o
   mesmo alcance dos ACs 1, 3 e 4
6. IF uma das escritas de uma troca falha THEN o sistema SHALL desfazer todas as escritas daquela
   troca

**Independent Test**: com um fixo de outubro a dezembro, outubro pago, trocar a categoria em
novembro muda os três meses, e outubro continua pago.

---

### P1: Avisar a troca ⭐ MVP — TRC-04

**User Story**: Como quem trocou uma categoria, quero ser avisado de até onde a troca foi, para não
mudar um fixo inteiro achando que mexi num mês só.

**Why P1**: Sem o aviso, o alcance da troca é invisível.

**Acceptance Criteria**

1. WHEN a troca de um fixo é gravada THEN o sistema SHALL mostrar um toast com "Categoria trocada
   em todos os meses deste fixo."
2. WHEN a troca de uma parcela de compra é gravada THEN o sistema SHALL mostrar um toast com
   "Categoria trocada em todas as parcelas desta compra."
3. WHEN a troca de um gasto que não é de fixo nem de compra é gravada THEN o sistema SHALL mostrar
   um toast com "Categoria trocada."
4. The system SHALL anunciar o toast a leitor de tela como `role="status"` e retirá-lo da tela 4
   segundos depois de aparecer
5. WHEN uma troca é gravada THEN o sistema SHALL revalidar a lista de Lançamentos, a Visão geral e
   "Todo mês", para que "Gastos por categoria" e a lista mostrem a categoria nova

**Independent Test**: trocar a categoria de uma parcela mostra "Categoria trocada em todas as
parcelas desta compra.", e o toast some sozinho.

---

### P1: Recusar sem gravar ⭐ MVP — TRC-05

**User Story**: Como quem troca uma categoria, quero que uma troca que não pode valer não grave
nada e me diga por quê.

**Why P1**: A troca grava ao escolher; um erro silencioso deixaria a tela mentindo.

**Acceptance Criteria**

1. IF a gravação da troca falha THEN o seletor SHALL voltar à categoria anterior e o sistema SHALL
   mostrar a mensagem do erro na linha (`role="alert"`), sem toast
2. IF o lançamento não existe ou foi cancelado THEN o sistema SHALL recusar com
   `LANCAMENTO_NAO_ENCONTRADO`, sem gravar
3. IF a categoria escolhida não existe ou está arquivada THEN o sistema SHALL recusar com
   `CATEGORIA_NAO_ENCONTRADA`, sem gravar
4. IF o lançamento é uma entrada THEN o sistema SHALL recusar com `CATEGORIA_EM_RECEITA` e a
   mensagem "Entrada não tem categoria.", sem gravar
5. IF o payload não traz `lancamentoId` uuid e `categoriaId` uuid ou nulo, ou traz outro campo THEN
   o sistema SHALL recusar com `VALIDACAO`, sem gravar
6. The system SHALL chamar `requireSession()` na action antes de qualquer leitura; sem sessão, a
   action SHALL recusar com o código da sessão
7. IF a gravação lança um erro inesperado THEN a action SHALL devolver `ERRO_INESPERADO` com uma
   referência, sem lançar para o cliente

**Independent Test**: com o servidor recusando, o seletor volta à categoria anterior e a linha diz
o motivo.

---

## Edge Cases

- WHEN o gasto é a última parcela de uma compra THEN a troca SHALL alcançar também as parcelas
  anteriores (TRC-03 AC 3)
- WHEN o fixo está encerrado THEN a troca SHALL alcançar as ocorrências que ele já tem (TRC-03 AC 1)
- WHEN a lista está filtrada pela categoria antiga THEN o gasto trocado SHALL sair da lista na
  revalidação (TRC-04 AC 5)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TRC-01 | P1: Entrada aparece como Receita | Execute | Implementing: entrada avulsa sem categoria e entrada fixa com categoria gravada dizendo "Receita" na tabela, AC 1, sem seletor na linha nem em Entradas, AC 2 (T8); no navegador, entrada fixa com categoria gravada e entrada avulsa sem categoria dizendo "Receita", sem nenhum seletor em Entradas, ACs 1 e 2 e Independent Test (T9) |
| TRC-02 | P1: Trocar a categoria de um gasto na linha | Execute | Implementing: seletor com "Sem categoria" e as categorias na ordem recebida, a gravada selecionada e o nome "Categoria de <descrição>", ACs 1 e 5, a gravada fora da lista como opção a mais com o nome recebido ou "Categoria removida", AC 3, escolher chamando a action uma vez com `{ lancamentoId, categoriaId }` e `null` para "Sem categoria", AC 2, e desabilitado só durante a gravação, AC 4 (T7); na tabela, despesa e investimento com o seletor, a gravada selecionada e só as ativas como opções, AC 1, a página passando o nome de todas as categorias para o gasto com arquivada vê-la pelo nome, AC 3, e as assertions de categoria de gasto lendo o seletor (T8); no navegador, escolher a opção grava sem outro clique e a linha mostra a nova sem recarregar e depois de recarregar, AC 2 e Independent Test (T9) |
| TRC-03 | P1: O alcance da troca | Execute | Implementing: alcance no domínio: FIXO com fixo, COMPRA com compra e LANCAMENTO sem nenhum dos dois, em despesa e investimento, e FIXO quando há os dois, ACs 1, 3 e 4 (T1); categoria gravada na compra e em todas as parcelas, e só no lançamento dado, com o vizinho igual intacto, sem tocar em valor, número, data nem pagamento, AC 3 e 4, e `null` com o mesmo alcance, AC 5, no banco e nos fakes (T2); troca pelo caso de uso no fixo e nas ocorrências de outubro a dezembro, com outubro pago, AC 1, na ocorrência materializada depois, AC 2, nas quatro parcelas da compra, AC 3, só no gasto do mês, AC 4, `null` nos três alcances, AC 5, e a falha nas ocorrências depois do fixo subindo para a transação desfazer, AC 6 (T4); troca de um fixo pela action contra Postgres, com o fixo e os três meses na categoria nova e outubro pago, AC 1, e o rollback de falha injetada nas ocorrências, AC 6 (T5); no navegador, fixo de outubro a dezembro trocado em novembro com os três meses na nova e outubro pago, AC 1, parcela 2 de 3 trocada com as três parcelas na nova, AC 3, e gasto do mês trocado com o outro de mesma categoria intacto, AC 4 (T9) |
| TRC-04 | P1: Avisar a troca | Execute | Implementing: as três rotas revalidadas no sucesso e nenhuma na recusa, AC 5 (T5); aviso numa região `role="status"` que só existe enquanto há aviso e sai da tela aos 4 segundos, com relógio falso, um por vez, o novo, de mesmo texto inclusive, substituindo o anterior e reiniciando o prazo, AC 4 (T6); o seletor avisando "Categoria trocada em todos os meses deste fixo.", "Categoria trocada em todas as parcelas desta compra." e "Categoria trocada." pelo alcance devolvido, ACs 1 a 3 (T7); no navegador, os três textos do toast, ACs 1 a 3, o toast saindo sozinho, AC 4, e, depois da troca, "Gastos por categoria" com o valor do fixo na nova e o gasto saindo da lista filtrada pela antiga, AC 5 (T9) |
| TRC-05 | P1: Recusar sem gravar | Execute | Implementing: entrada, com ou sem fixo, recusada com `CATEGORIA_EM_RECEITA` no domínio, AC 4 (T1); payload estrito com `lancamentoId` uuid e `categoriaId` uuid ou nulo, recusando campo ausente, malformado ou a mais, AC 5 (T3); lançamento inexistente ou cancelado, AC 2, categoria inexistente ou arquivada, AC 3, e entrada avulsa ou fixa, AC 4, recusados pelo caso de uso sem escrita (T4); action com sessão antes de qualquer leitura, AC 6, `VALIDACAO` no payload inválido, AC 5, as recusas do caso de uso com a mensagem de `erros.ts`, "Entrada não tem categoria." inclusive, ACs 2 a 4, e `ERRO_INESPERADO` com referência, AC 7 (T5); recusa da action volta o seletor à categoria anterior, com a mensagem em `role="alert"` e nenhum toast, AC 1 (T7) |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Nenhuma entrada da lista de Lançamentos diz "Sem categoria"
- [ ] Trocar a categoria de um fixo, de uma compra e de um gasto do mês leva um gesto cada, e o
      toast diz o alcance certo nos três
- [ ] Nenhuma troca muda valor, data ou pagamento de lançamento algum
