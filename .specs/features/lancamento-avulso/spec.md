# Lançamento avulso e entradas: Specification

## Problem Statement

O mês não fecha. Só compra parcelada e recorrência têm caminho até o banco, então um almoço pago
no débito, um Pix recebido de um amigo e um salário extra não têm onde ser digitados. O contorno
existente — cadastrar compra de 1 parcela — funciona para o cartão e falha para tudo que entra:
não existe compra de valor positivo que represente dinheiro recebido.

Duas coisas agravam a ausência, e as duas foram descobertas auditando o código, não a documentação:

- **Os blocos da lista agrupam por `origem`, não por meio de pagamento.** "Cartão de Crédito"
  significa hoje "veio de compra parcelada". Uma despesa avulsa paga no cartão cairia em
  "Gastos do Mês" — fora da fatura, que é o oposto do que a pessoa espera e o oposto do que a
  fatia de Faturas vai precisar.
- **O bloco de entradas aparece só quando tem conteúdo**
  (`tabela-lancamentos.tsx`, `outros.length === 0 ? null`), enquanto os três blocos de despesa
  aparecem sempre, mesmo vazios, para que a ausência seja legível como ausência. O dinheiro que
  entra é o único que some da tela quando falta — e é justamente o que o usuário relatou não achar.

O trabalho de baixo já está feito: `Origem` já tem `"AVULSO"`, `movimento` já disciplina o avulso
por `CHECK` bicondicional, `resumoMensal` já soma `avulsos` e `entradas`, e `cancelado_em` já existe
e já é ignorado por toda soma. Falta a metade de cima.

## Goals

- [ ] Registrar uma despesa avulsa em qualquer meio de pagamento, sem fingir que é compra de 1x
- [ ] Registrar dinheiro que entra fora do salário — o Pix do amigo — em um só formulário
- [ ] Ler no bloco "Cartão de Crédito" tudo que vai cair na fatura, qualquer que seja a origem
- [ ] Desfazer um lançamento avulso digitado errado, sem apagar histórico
- [ ] Achar onde se cadastra o salário sem ter que adivinhar o que a palavra "Fixos" cobre

## Out of Scope

| Feature | Reason |
| --- | --- |
| Estorno e reembolso | Pix de amigo devolvendo a parte dele de uma conta não é receita: é despesa que encolheu. Tratado como receita, ele infla os dois lados do mês. Modelar direito exige vincular o estorno à despesa original, que é relação que não existe no banco. Registrado como limitação conhecida, não como descuido |
| Editar um lançamento avulso | Excluir e recriar resolve o caso inteiro nesta fatia, e edição com escopo de série é decisão da fatia de compra parcelada. Duas semânticas de edição ao mesmo tempo produziriam duas verdades |
| Excluir parcela isolada ou ocorrência de recorrência | Remover uma parcela quebra a conservação da soma da compra, que é invariante do domínio. Ocorrência de recorrência renasce na próxima materialização; o gesto equivalente é encerrar |
| Natureza investimento | Nenhum formulário do app a oferece hoje, inclusive o de recorrência. Abrir só aqui criaria um dado que nenhuma outra tela sabe administrar |
| Bloco por meio individual (um por cartão) | A cascata resolve "vai na fatura ou não". Um bloco por cartão só faz sentido com a fatia de Faturas, que dará a cada cartão um ciclo e um total próprios |
| Chave de idempotência no avulso | Dois Pix de R$ 50 no mesmo dia são dois Pix. Deduplicar aqui impediria o caso legítimo para prevenir um clique duplo que a action já evita pelo estado do botão |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Como os blocos da lista passam a agrupar | Cascata: `RECORRENCIA` → Fixos; meio do tipo cartão → Cartão de Crédito; resto → Gastos do Mês | Escolhido pelo usuário. "Cartão de Crédito" volta a significar "vai na fatura", que é o que a planilha queria dizer e o que a fatia de Faturas vai consumir. A precedência de Fixos preserva o bloco que administra ciclo de vida | y |
| O indicador "Cartão" do painel muda junto | Sim: passa a somar pelo mesmo predicado da lista | Painel e lista divergirem é o defeito que `filtrar-lancamentos.ts` existe para evitar. Um indicador que promete um total que a lista não confirma é pior que indicador nenhum | y |
| Parcela de compra paga em carnê (meio sem fatura) | Cai em "Gastos do Mês" | Consequência direta da cascata. Ela de fato não vai em fatura nenhuma, e a coluna "Parcela" continua aparecendo só onde há parcela | n |
| Escopo da fatia | Criar **e** excluir | Escolhido pelo usuário. Sem excluir, o primeiro erro de digitação fica no banco para sempre — inclusive os do teste em QA | y |
| Onde o dinheiro que entra mora na navegação | Sem área nova: a área "Fixos" é renomeada e o bloco de entradas passa a aparecer sempre, no topo | Escolhido pelo usuário. Área própria duplicaria criar/reajustar/encerrar em duas telas, criando duas verdades sobre o mesmo ciclo de vida | y |
| Nome novo da área | "Todo mês" | Escolhido pelo usuário. É a frase que a própria página já usa, cabe conta de luz e salário sem privilegiar nenhum, e não é jargão | y |
| O invariante "área tem o nome do bloco que administra" | Abandonado, com a razão registrada no lugar | Ele já estava quebrado em silêncio: a área administra receita recorrente, cuja ocorrência nunca aparece no bloco "Fixos", porque o bloco filtra por despesa. Renomear reconhece a quebra em vez de criá-la | n |
| Naturezas aceitas no avulso | Despesa e receita | Espelha `recorrencia.schema.ts`, que também exclui investimento. Divergir criaria duas regras para a mesma pergunta | n |
| Se o lançamento já nasce pago | Marcado por padrão quando o meio **não** gera fatura; desmarcado quando gera | Dinheiro em conta corrente se move no ato do gesto; compra no cartão só sai na fatura. O padrão acerta o caso comum dos dois lados e continua sendo uma caixa que a pessoa pode desmarcar | n |
| Data de pagamento quando nasce pago | A própria data do evento | Registrar o Pix é registrar que ele caiu. Pedir uma segunda data para o mesmo instante seria campo que só existe para ser repetido | n |
| Como a exclusão é persistida | Lógica: `cancelado_em` recebe o instante; a linha permanece | `cancelado_em` já existe e toda soma já o ignora (`vigente()` em `resumo-mensal.ts`). `DELETE` físico perderia auditoria e abriria a porta para apagar parcela por engano | n |
| O que pode ser excluído | Apenas `origem = 'AVULSO'` e ainda não cancelado | Parcela quebra a conservação da soma da compra; ocorrência de recorrência renasce na materialização seguinte. A regra é função pura, confrontada com o `WHERE` do `UPDATE` por teste de concordância, como `ocorrenciaProtegida` | n |
| Confirmação antes de excluir | Dois toques na própria linha, sem modal | Mesmo padrão de ilha cliente do `BotaoPago` e do `ValorConfirmavel`. Modal exigiria foco gerenciado e devolveria menos que custa | n |
| `CHECK` de positividade em `movimento.valor_centavos` | Acrescentado na migration `0002` | `recorrencia_versao`, `orcamento_categoria` e `pagamento_fatura` têm o deles; o razão — a única tabela somável — não tem. Sem ele a transação do avulso é infalsificável, que foi exatamente a razão da migration `0001` | n |
| Meios arquivados na cascata | O conjunto de meios com fatura inclui arquivados | Lançamento antigo continua apontando para cartão encerrado. Ler só os disponíveis reclassificaria o passado ao arquivar um cartão | n |
| Idempotência do avulso | Nenhuma | Ver Out of Scope. Duplicata é caso legítimo neste domínio | n |

**Open questions:** none. As cinco decisões de produto foram resolvidas com o usuário e estão acima
com `y`. As linhas com `n` são decisões de engenharia tomadas com a justificativa registrada,
sujeitas à revisão desta spec.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação e limites de entrada | AVUL-01 AC 2-5 (descrição 1..120, valor > 0, competência `AAAA-MM`, data `AAAA-MM-DD`) |
| Falha e falha parcial | AVUL-01 AC 8. O avulso é um único `INSERT`: não há estado intermediário a reverter |
| Idempotência, retentativa, duplicata | Deliberadamente ausente — ver Out of Scope e Assumptions |
| Fronteiras de autorização e limite de taxa | AVUL-01 AC 7. Limite de taxa: N/A porque o app é privado, com allowlist de dois e-mails (AD-007) |
| Concorrência e ordenação | AVUL-03 AC 4. Linhas independentes, sem estado compartilhado; segunda exclusão do mesmo id não é erro |
| Ciclo de vida do dado | AVUL-03 AC 1-2. Exclusão lógica; nenhuma linha é removida fisicamente |
| Observabilidade | AVUL-01 AC 8: identificador de correlação no servidor, sem stack trace no navegador |
| Falha de dependência externa | N/A porque esta fatia não chama nenhum serviço externo |
| Integridade de transição de estado | AVUL-04. Cancelado não se cancela de novo nem se marca como pago |

---

## User Stories

### P1: Registrar um gasto avulso ⭐ MVP

**User Story**: Como morador da casa, quero registrar um gasto que não é parcelado nem fixo — o
almoço no débito, a farmácia no cartão — para que o mês pare de ficar incompleto.

**Why P1**: Sem ele o mês nunca fecha, porque só compra parcelada e recorrência entram no app.

**Acceptance Criteria**

1. WHEN um lançamento avulso é criado com descrição, valor, natureza, competência, data, pessoa e
   meio de pagamento THEN o sistema SHALL gravar exatamente um `movimento` com `origem = 'AVULSO'`,
   sem `compra_id`, sem `numero_parcela` e sem `recorrencia_id`
2. IF a descrição estiver vazia ou tiver mais de 120 caracteres THEN o sistema SHALL recusar a
   criação e devolver erro de validação no campo `descricao`, sem gravar linha alguma
3. IF o valor em centavos não for inteiro maior que zero THEN o sistema SHALL recusar a criação e
   devolver erro de validação no campo `valorCentavos`, sem gravar linha alguma
4. IF a competência não estiver no formato `AAAA-MM` THEN o sistema SHALL recusar a criação e
   devolver erro de validação no campo `competencia`, sem gravar linha alguma
5. IF a data do evento não estiver no formato `AAAA-MM-DD` THEN o sistema SHALL recusar a criação e
   devolver erro de validação no campo `dataEvento`, sem gravar linha alguma
6. WHEN o lançamento é gravado THEN o sistema SHALL revalidar as rotas `/[competencia]` e
   `/[competencia]/lancamentos`, de modo que painel e lista reflitam o novo valor sem recarga manual
7. IF a requisição chegar sem sessão válida THEN o sistema SHALL recusar a criação com o código
   de erro de sessão, antes de qualquer acesso ao banco
8. IF ocorrer falha não prevista durante a gravação THEN o sistema SHALL devolver `ERRO_INESPERADO`
   com um identificador de correlação, e SHALL não expor stack trace ao navegador

**Independent Test**: cadastrar "Almoço" de R$ 32,50 em conta corrente numa competência e ver a
linha na lista e o indicador "Despesas do mês" maior em 3250 centavos.

---

### P1: Registrar dinheiro que entra ⭐ MVP

**User Story**: Como morador da casa, quero registrar um Pix que um amigo me mandou ou um salário
extra, para que "Receitas do mês" pare de mostrar só o que o seed inventou.

**Why P1**: É a metade do mês que hoje não tem porta de entrada nenhuma, e foi o que o usuário
relatou não achar.

**Acceptance Criteria**

1. WHEN o lançamento avulso é criado com natureza receita THEN o sistema SHALL gravá-lo como
   `natureza = 'RECEITA'` e SHALL somá-lo em "Receitas do mês", nunca em "Despesas do mês"
2. The system SHALL oferecer no formulário de avulso exatamente as naturezas despesa e receita
3. WHEN uma receita avulsa existe na competência aberta THEN o sistema SHALL exibi-la no bloco
   "Entradas", e SHALL não exibi-la em nenhum bloco de despesa
4. WHEN o meio de pagamento escolhido não gera fatura THEN o sistema SHALL marcar o lançamento como
   já pago por padrão, usando a data do evento como data de pagamento
5. WHEN o meio de pagamento escolhido gera fatura THEN o sistema SHALL deixar o lançamento como não
   pago por padrão
6. The system SHALL permitir que a pessoa altere esse padrão antes de enviar o formulário

**Independent Test**: cadastrar "Pix recebido" de R$ 50,00 em conta corrente e ver a linha no bloco
"Entradas" e o indicador "Receitas do mês" maior em 5000 centavos.

---

### P1: Ler no bloco do cartão tudo que vai na fatura ⭐ MVP

**User Story**: Como morador da casa, quero que o bloco "Cartão de Crédito" mostre tudo que vai cair
na fatura, para não precisar lembrar que ele significa outra coisa.

**Why P1**: Sem isso, o primeiro gasto avulso no cartão aparece no lugar errado — a fatia entregaria
um formulário que produz dado confuso.

**Acceptance Criteria**

1. The system SHALL classificar cada despesa da competência em exatamente um dos blocos Fixos,
   Cartão de Crédito ou Gastos do Mês, por uma única função de domínio
2. WHEN a despesa tem `origem = 'RECORRENCIA'` THEN o sistema SHALL classificá-la como Fixos,
   mesmo que o meio de pagamento dela seja um cartão de crédito
3. WHILE a despesa não é recorrente, WHEN o meio de pagamento dela é do tipo cartão de crédito
   THEN o sistema SHALL classificá-la como Cartão de Crédito, qualquer que seja a origem
4. WHEN a despesa não é recorrente e o meio de pagamento dela não gera fatura THEN o sistema SHALL
   classificá-la como Gastos do Mês, inclusive quando ela for parcela de compra parcelada
5. The system SHALL usar a mesma classificação para o indicador "Cartão" do painel e para os blocos
   da lista, de modo que o total do indicador seja igual à soma do bloco correspondente
6. The system SHALL considerar como cartão também os meios arquivados, para que arquivar um cartão
   não reclassifique lançamentos passados
7. WHERE a despesa está no bloco Cartão de Crédito e é parcela de compra parcelada THEN o sistema
   SHALL exibir a coluna "Parcela"; nos demais blocos SHALL omiti-la

**Independent Test**: cadastrar um avulso num cartão e conferir que ele aparece sob "Cartão de
Crédito" e que o indicador "Cartão" cresceu no mesmo valor.

---

### P2: Excluir um lançamento avulso

**User Story**: Como morador da casa, quero apagar um lançamento que digitei errado, para o mês não
carregar um número falso para sempre.

**Why P2**: Não bloqueia o fechamento do mês, mas sem ele todo erro de digitação é permanente.

**Acceptance Criteria**

1. WHEN a exclusão de um lançamento avulso é solicitada THEN o sistema SHALL preencher
   `cancelado_em` com o instante da operação e SHALL manter a linha no banco
2. WHEN um lançamento está cancelado THEN o sistema SHALL excluí-lo de toda soma do mês e de toda
   lista da interface
3. IF o lançamento não tiver `origem = 'AVULSO'` THEN o sistema SHALL recusar a exclusão com o
   código `LANCAMENTO_NAO_CANCELAVEL` e SHALL não alterar linha alguma
4. IF o lançamento já estiver cancelado THEN o sistema SHALL não alterar `cancelado_em` e SHALL
   devolver sucesso, de modo que uma segunda exclusão não seja erro
5. The system SHALL exibir o controle de excluir apenas nas linhas de lançamento avulso
6. WHEN o controle de excluir é acionado pela primeira vez THEN o sistema SHALL pedir confirmação na
   própria linha, e SHALL só excluir no segundo acionamento
7. WHEN a exclusão é concluída THEN o sistema SHALL revalidar `/[competencia]` e
   `/[competencia]/lancamentos`

**Independent Test**: criar um avulso, conferir o total, excluí-lo e conferir que o total voltou ao
valor anterior.

---

### P2: Achar onde mora o dinheiro que entra

**User Story**: Como morador da casa, quero achar onde se cadastra o salário sem adivinhar, e quero
ver o bloco de entradas mesmo quando ele está vazio.

**Why P2**: O recurso existe e está escondido atrás de uma palavra que promete conta a pagar.

**Acceptance Criteria**

1. The system SHALL nomear "Todo mês" a área que administra recorrências, na navegação e no título
   da página
2. The system SHALL exibir o bloco "Entradas" na lista do mês sempre, inclusive quando ele não tem
   nenhum lançamento, como já faz com os blocos de despesa
3. The system SHALL exibir o bloco "Entradas" antes de todos os blocos de despesa
4. WHEN o bloco "Entradas" está vazio THEN o sistema SHALL exibir texto indicando a ausência, e
   SHALL não exibir tabela vazia
5. The system SHALL manter o bloco de despesa recorrente com o nome "Fixos", ainda que a área que o
   administra passe a se chamar "Todo mês"

**Independent Test**: abrir um mês sem nenhuma receita e ver o bloco "Entradas" no topo, com o texto
de ausência.

---

## Edge Cases

- IF o meio de pagamento escolhido estiver arquivado entre a abertura do formulário e o envio THEN o
  sistema SHALL recusar a criação com erro de validação, e SHALL não gravar linha alguma
- IF a categoria não for informada THEN o sistema SHALL gravar o lançamento com categoria nula, e
  SHALL exibi-lo na lista com a pílula "Sem categoria"
- WHEN a competência informada é diferente da competência aberta THEN o sistema SHALL gravar na
  competência informada e SHALL revalidar as duas
- IF o valor exceder o limite de inteiro seguro THEN o sistema SHALL recusar a criação com erro de
  validação no campo `valorCentavos`
- WHEN nenhum meio de pagamento do tipo cartão existe THEN o sistema SHALL exibir o bloco "Cartão de
  Crédito" vazio, com o texto de ausência, como já faz hoje

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AVUL-01 | P1: Registrar um gasto avulso | Design | Pending |
| AVUL-02 | P1: Registrar dinheiro que entra | Design | Pending |
| AVUL-03 | P2: Excluir um lançamento avulso | Implementing | In Tasks |
| AVUL-04 | P2: Excluir um lançamento avulso | Implementing | In Tasks |
| BLOCO-01 | P1: Ler no bloco do cartão tudo que vai na fatura | Implementing | In Tasks |
| BLOCO-02 | P1: Ler no bloco do cartão tudo que vai na fatura | Implementing | In Tasks |
| ENTR-01 | P2: Achar onde mora o dinheiro que entra | Design | Pending |
| ENTR-02 | P2: Achar onde mora o dinheiro que entra | Implementing | In Tasks |

**Coverage:** 8 total, 0 mapeados para tasks, 8 não mapeados ⚠️

---

## Success Criteria

- [ ] Um mês pode ser fechado usando só a interface: despesa avulsa, receita, parcelada e fixo
- [ ] O indicador "Cartão" do painel e a soma do bloco "Cartão de Crédito" são iguais, provado por
      teste de concordância
- [ ] Trocar a ordem da cascata de blocos quebra a suíte
- [ ] Um lançamento avulso errado pode ser desfeito pela tela, e o total do mês volta ao anterior
- [ ] Abrir um mês vazio mostra os quatro blocos, "Entradas" primeiro
