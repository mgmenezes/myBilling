# Todo mês em linhas, com o fixo aberto à direita: Specification

> Pedido do dono em 2026-10-30, na rodada de aproveitamento de tela inspirada na Coinbase, depois da
> Visão geral em três colunas (AD-019) e de Lançamentos em lista densa (AD-020). Ele escolheu a
> opção "A · Detalhe à direita" do canvas https://claude.ai/artifact/DKoKx1hcKxeEoU5Wuh7w5Y
> (privado, só do dono) e respondeu três perguntas no mesmo dia: a estrutura é a opção A; o valor da
> linha e dos totais é o do mês aberto; e os formulários abrem na coluna, sem diálogo.

## Problem Statement

"Todo mês" é a tela onde o dono confere e ajusta o que se repete todo mês. No monitor grande ela
aproveita mal o espaço e esconde o que ele procura:
- **Cartões altos:** cada fixo é um cartão de uns 130 px, com três botões repetidos ("Editar",
  "Mudar valor" e "Encerrar"). Com dez fixos, a lista passa da altura da tela.
- **Valor da previsão, e não do mês:** o cartão mostra o valor previsto da vigência
  (`recorrencia_versao`), e não o que o mês de fato tem. Uma conta confirmada diferente aparece com
  o número errado, e não há total nenhum.
- **Histórico descartado:** a página já lê todas as vigências de cada fixo
  (`fixos/page.tsx:57`) e joga fora depois de achar a do mês. "Quanto era antes" não aparece em lugar
  nenhum.
- **Diálogos:** cadastrar e editar abrem um `<dialog>` por cima da lista, que some de vista enquanto
  a pessoa preenche.

## Goals

- [ ] Ver todos os fixos do mês numa tela, com o valor que o mês de fato tem e os dois totais no alto
- [ ] O total de saídas fixas bate com o bloco "Fixos" de Lançamentos, em qualquer mês
- [ ] Abrir um fixo mostra tudo dele, inclusive o valor ao longo dos meses, sem sair da lista
- [ ] Cadastrar, editar, mudar o valor e encerrar sem diálogo, ao lado da lista

## Out of Scope

| Feature | Reason |
| --- | --- |
| Confirmar o valor real e marcar pago | Continuam na linha de Lançamentos (FIXO-04, VENC); aqui só aparecem |
| Resumo na coluna sem fixo aberto (a opção C do protótipo) | O dono não pediu; a coluna mostra uma dica |
| Mudar as regras de cadastrar, editar, reajustar e encerrar | Mesmas actions, mesmas validações e mesmas mensagens (FIXO-01 a 06, EDF-01 a 06) |
| Mudar os formulários de lançamento da Visão geral | O `@container` desta fatia vale só para `FormRecorrencia` |
| Filtrar ou buscar fixos | A lista do mês cabe numa tela |
| Mudança de banco | Nenhuma coluna nova: a ocorrência do mês e as vigências já existem |
| Lançamentos, Cadastros e Categorias | Rodadas próprias |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estrutura | A opção A do protótipo: uma linha baixa por fixo, sem botão, em "Entradas fixas" e depois "Saídas fixas", ordenada pelo dia; os totais "Saídas fixas em <mês>" e "Entradas fixas em <mês>" no alto; uma coluna à direita com o fixo aberto, os dados, "Valor ao longo dos meses" e as ações "Mudar valor", "Editar" e, no pé, "Encerrar" em vermelho | Escolha do dono sobre o protótipo, em 2026-10-30 | y |
| Valor da linha e dos totais | O da ocorrência do mês aberto (`movimento`), inclusive o valor confirmado quando a conta chegou diferente; nunca o da vigência. O total de saídas é o do bloco "Fixos" de Lançamentos | Resposta do dono em 2026-10-30. É também o que AD-003 exige: só `movimento` é somável | y |
| Onde os formulários abrem | "+ Novo fixo", "Editar", "Mudar valor" e "Encerrar" abrem no painel do fixo, sem diálogo, como o cadastro aberto da Visão geral | Resposta do dono em 2026-10-30 | y |
| Onde a coluna começa | A partir de 1.536 px, como em Lançamentos | Em 1.280 px, o menu (240 px) e uma coluna de 384 px deixariam uns 610 px para a lista, e a descrição espremeria. O dono vê a mesma virada nas duas telas | n (decisão do autor) |
| Largura da coluna e da lista | Coluna de 384 px; lista com até 1.100 px, centrada entre o menu e a coluna | 384 px é a largura da coluna de ação da Visão geral, que já abriga um formulário de cadastro; 1.100 px é a lista de Lançamentos (AD-020). O protótipo usava 360 px | n (decisão do autor) |
| Abaixo de 1.536 px | Uma coluna só, de até 1.024 px. O painel aparece entre os totais e a lista enquanto um fixo ou o cadastro estiver aberto, e some quando nada está aberto. Abrir leva o foco ao título do painel | Um painel só, que muda de lugar por CSS, como o cartão de filtros de Lançamentos: dois painéis duplicariam ids e campos. Abaixo da lista ele ficaria longe do "+ Novo fixo" e das linhas; ao lado, espremeria a lista | n (decisão do autor) |
| Coluna sem fixo aberto | "Nenhum fixo aberto" e a dica do protótipo | O dono não pediu o resumo da opção C. O cadastro aberto por padrão deixaria o "+ Novo fixo" sem função, e criar fixo é raro | n (decisão do autor) |
| Corte entre as seções | Despesa em "Saídas fixas"; o resto em "Entradas fixas" | É o corte de Lançamentos (`tabela-lancamentos.tsx:173-174`). Recorrência de investimento não nasce por caminho nenhum do app (`recorrencia.schema.ts:39` e a importação só aceitam despesa e receita) | n (decisão do autor) |
| Desempate da ordem | No mesmo dia, descrição em ordem alfabética pt-BR | O dia vem do protótipo; a descrição é o desempate que a pessoa reconhece | n (decisão do autor) |
| Fixo encerrado com ocorrência paga depois do fim | Aparece na lista do mês dessa ocorrência, com o selo "Encerrado" e o valor dela | Encerrar preserva a ocorrência paga (`encerrar/handler.ts:47-49`), e ela entra no bloco "Fixos" de Lançamentos. Sem a linha, o total de saídas não seria a soma das linhas. Revê FIXO-07, AC 1, só nesse caso; FIXO-07, AC 4 continua: o mês tem ocorrência | n (decisão do autor) |
| Valor confirmado | "confirmado" junto do valor na linha; "confirmado · previa R$ X" no painel | FIXO-04, AC 3 pede que a confirmação não dependa de cor. A linha fica curta; o painel mostra os dois valores | n (decisão do autor) |
| Coluna Categoria | Pill com a cor da categoria nas saídas; "Sem categoria" e "Categoria removida" na neutra; "Receita" nas entradas | COR-03 e COR-02, AC 5 nas saídas; TRC-01 já mostra "Receita" em toda entrada de Lançamentos | n (decisão do autor) |
| Selos e contagens do protótipo | Sem a contagem ao lado do título ("8 fixos e 2 entradas") e sem a linha de baixo dos totais ("7 contas · 1 começa em dezembro"); a quantidade fica no título de cada seção. O parágrafo de explicação do alto sai; o texto vai para o aviso de lista vazia | O título da seção já diz quantas são; três contagens da mesma coisa competem com o valor | n (decisão do autor) |
| Linha inteira clicável | Um clique em qualquer ponto da linha abre o fixo; o botão da descrição é o alvo do teclado | Com o mouse, a linha toda é o alvo natural; o botão dá o nome e o foco | n (decisão do autor) |
| Estado na URL | O fixo aberto vai para `?fixo=<id>` por `router.replace(…, { scroll: false })`, sem entrada nova no histórico. O cadastro novo e as vistas de "Mudar valor", "Editar" e "Encerrar" não vão para a URL | Recarregar ou mandar o link abre o mesmo fixo. Sem entrada por clique, o "Voltar" do navegador sai da tela, como hoje. Revisto em 2026-10-31, na correção F7: por `history.replaceState`, o Next guardava uma rolagem até o alto, que a página relida seguinte executava, e a confirmação de salvar saía da janela (FIXCOL-05, AC 5). Custa uma ida ao servidor a cada abrir ou fechar | n (decisão do autor) |
| Teclado | Abrir leva o foco ao título do painel; `Escape` dentro do painel e "Fechar" fecham e devolvem o foco à linha ou ao "+ Novo fixo" | O painel vem antes da lista no DOM; sem levar o foco, quem usa teclado não chega a ele | n (decisão do autor) |
| Onde fica a confirmação de salvar | À vista, junto do botão que a pessoa clicou ("Salvar alterações" ou o de cadastrar); a tela não vai ao título do painel | Escolha do dono em 2026-10-31 ("Onde você clicou"), quando perguntado depois da rodada 1 do Verifier: enquanto o botão gravava, o painel devolvia o foco ao título e rolava a tela até ele, e a confirmação ficava fora da janela em 1.280 × 720 e, na edição, em 1.920 × 1.080 | y |
| O foco depois de salvar | Na confirmação, que o recebe quando aparece. Enquanto grava, o painel segura o foco no título, sem rolar a tela | No título, o foco ficaria fora da janela, e o próximo `Tab` levaria a tela ao alto do painel. Na confirmação, ele fica à vista, o próximo `Tab` volta ao botão e o leitor de tela lê a confirmação | n (decisão do autor) |
| Fechar ou trocar de fixo com algo digitado | Descarta o que foi digitado | É o que fechar o diálogo de edição já faz hoje (EDF-01, AC 3) | n (decisão do autor) |
| Fixo que sai do mês depois de uma ação | O painel mostra "<descrição> não aparece mais em <Mês de Ano>." com "Fechar" | Encerrar a partir do mês aberto, ou pôr "Termina em" antes dele, tira o fixo da lista; o painel não pode mostrar ações de um fixo que já não está ali | n (decisão do autor) |
| Formulário estreito | Os pares de campos (valor e dia, início e fim, meio e categoria, e a pessoa pela metade) ficam lado a lado só com o formulário de 448 px ou mais, pela largura do contêiner | Hoje a regra é a largura da janela (`sm:`); na coluna de 384 px cada campo ficaria com uns 160 px | n (decisão do autor) |
| Celular | Abaixo de 768 px, cada fixo em duas linhas de texto, sem cabeçalho de tabela; o painel acima da lista, na largura toda | O mesmo corte de Lançamentos (`block md:table-cell`); a tabela de cinco colunas não cabe em 400 px | n (decisão do autor) |
| Mês sem fixo | Um aviso só, no lugar das duas seções; seção vazia mostra uma linha de texto | Distingue "não há nada cadastrado" de "não há entrada neste mês" | n (decisão do autor) |
| Rótulo do botão de encerrar | "Encerrar", como hoje, em vermelho no pé do painel | O protótipo dizia "Encerrar este fixo"; o painel já é de um fixo só | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

### Dimensões implícitas

| Dimensão | Como fica |
| --- | --- |
| Validação e limites | As de hoje, nos mesmos formulários e actions (FIXO-03, FIXO-06, EDF-05). `?fixo=` que não é fixo da lista é ignorado (FIXCOL-09, AC 3) |
| Falha e falha parcial | Recusa da action aparece no painel, como hoje (FIXCOL-05, AC 7); gravação tudo ou nada segue EDF-06 |
| Idempotência e duplicata | A materialização ao abrir a tela é a de hoje, idempotente pela restrição única (FIXO-02) |
| Autorização e limite de taxa | Mesmas actions, com `requireSession()`. Limite de taxa: N/A, app privado (AD-007) |
| Concorrência e ordem | A última gravação vale, como em EDF |
| Ciclo de vida do dado | Encerrado aparece enquanto vale, ou enquanto o mês tem ocorrência dele (FIXCOL-02, AC 4) |
| Observabilidade | N/A: nenhum caminho novo de servidor além da leitura |
| Falha de dependência externa | N/A: nenhum serviço externo |
| Integridade de estado | Painel: vazio, cadastro, detalhe, mudar valor, encerrar, editar, fixo fora do mês; trocar de fixo volta ao detalhe (FIXCOL-04, AC 9) |

---

## User Stories

### P1: Uma linha por fixo, em duas seções ⭐ MVP — FIXCOL-01

**User Story**: Como quem confere o que se repete todo mês, quero cada fixo numa linha baixa,
separada entre o que entra e o que sai, para ver todos de uma vez.

**Why P1**: É a troca dos cartões altos pela lista, o centro do pedido.

**Acceptance Criteria**

1. The system SHALL mostrar os fixos do mês aberto em duas seções, "Entradas fixas" e depois
   "Saídas fixas", cada uma com uma tabela de colunas Descrição, Categoria, "Vence" ("Cai" nas
   entradas), "Meio" ("Onde cai" nas entradas) e "Valor em <nome do mês>"
2. The system SHALL pôr em "Saídas fixas" os fixos de natureza despesa e em "Entradas fixas" os
   demais
3. The system SHALL ordenar as linhas de cada seção pelo dia de vencimento, do menor para o maior,
   e, no mesmo dia, pela descrição em ordem alfabética pt-BR
4. The system SHALL mostrar no título de cada seção a quantidade de linhas e o total dela, como
   "4 · R$ 185,00"
5. The system SHALL mostrar na coluna Categoria das saídas a pill com a cor da categoria (COR-03), e
   "Sem categoria" ou "Categoria removida" na neutra (COR-02, AC 5)
6. The system SHALL mostrar "Receita" na coluna Categoria de toda entrada (TRC-01)
7. The system SHALL não mostrar na linha nenhum botão além do que abre o fixo
8. WHEN o fixo está encerrado THEN o sistema SHALL mostrar o selo "Encerrado" ao lado da descrição
   (FIXO-07, AC 5)
9. WHEN o fixo começa depois do mês aberto THEN o sistema SHALL mostrar "—" no valor e o selo
   "Começa em <Mês de Ano>" ao lado da descrição
10. WHEN a lista é exibida a partir de 1.280 px com ponteiro fino THEN o sistema SHALL desenhar cada
    linha das duas tabelas com no máximo 48 px de altura, inclusive a encerrada, a que começa depois
    e a de valor confirmado
11. WHEN a janela tem menos de 768 px THEN o sistema SHALL mostrar cada fixo em duas linhas de texto,
    com a descrição e o valor em cima e a categoria, o dia e o meio embaixo, sem cabeçalho de tabela
12. IF o mês aberto não tem fixo nenhum THEN o sistema SHALL mostrar, no lugar das seções, "Nenhum
    gasto fixo ou entrada neste mês. Cadastre pelo “+ Novo fixo”: ele passa a aparecer em todo mês,
    sem você precisar repetir nada."
13. IF uma seção não tem fixo THEN o sistema SHALL mostrá-la com "Nenhuma entrada fixa neste mês." ou
    "Nenhuma saída fixa neste mês."

**Independent Test**: em março, com um fixo no dia 1, dois no dia 10 e uma entrada, "Entradas
fixas" vem antes de "Saídas fixas", a saída do dia 1 é a primeira e as duas do dia 10 seguem a
ordem alfabética.

---

### P1: O valor do mês aberto ⭐ MVP — FIXCOL-02

**User Story**: Como quem confere o mês, quero ver em cada fixo o valor que o mês de fato tem, para
o número bater com Lançamentos.

**Why P1**: É a resposta do dono: o valor da linha é o do mês aberto.

**Acceptance Criteria**

1. The system SHALL mostrar em cada linha o valor da ocorrência do fixo no mês aberto, inclusive o
   valor confirmado quando ele difere do previsto
2. WHEN a ocorrência tem valor confirmado diferente do previsto THEN o sistema SHALL mostrar
   "confirmado", em texto, junto do valor (FIXO-04, AC 3)
3. WHEN Todo mês é aberta numa competência cujas ocorrências ainda não existem THEN o sistema SHALL
   criá-las antes de ler, com a mesma materialização e a mesma janela de Lançamentos e da Visão
   geral
4. WHEN o mês aberto tem uma ocorrência de um fixo encerrado antes dele THEN o sistema SHALL mostrar
   esse fixo na lista, com o selo "Encerrado" e o valor da ocorrência
5. The system SHALL continuar mostrando, sem ocorrência, o fixo que começa depois do mês aberto
   (FIXO-07, AC 3), e omitindo o encerrado antes dele que não tem ocorrência no mês (FIXO-07, AC 1)

**Independent Test**: um fixo previsto em R$ 100,00 e confirmado em R$ 105,00 em março mostra
"confirmado" e R$ 105,00 na linha de março.

---

### P1: Os totais do mês no alto ⭐ MVP — FIXCOL-03

**User Story**: Como quem administra os fixos da casa, quero ver no alto quanto sai e quanto entra de
fixo no mês, para saber o peso deles sem somar de cabeça.

**Why P1**: Hoje não há total nenhum na tela.

**Acceptance Criteria**

1. The system SHALL mostrar acima das seções "Saídas fixas em <Mês de Ano>" e "Entradas fixas em
   <Mês de Ano>", cada um com o total do mês aberto
2. The system SHALL calcular "Saídas fixas" como a soma das ocorrências de despesa de fixo do mês
   aberto, a mesma soma do bloco "Fixos" de Lançamentos naquele mês
3. The system SHALL calcular "Entradas fixas" como a soma das ocorrências do mês aberto dos fixos
   que não são despesa
4. The system SHALL somar só valores de ocorrência (`movimento`) e nenhum valor de vigência
   (`recorrencia_versao`), de modo que o fixo que começa depois do mês aberto some zero (AD-003)
5. The system SHALL mostrar no título de cada seção o mesmo total do alto, igual à soma dos valores
   das linhas dela

**Independent Test**: em março, "Saídas fixas em Março de 2026" mostra o mesmo valor que o título
do bloco "Fixos" de Lançamentos de março.

---

### P1: O fixo aberto no painel ⭐ MVP — FIXCOL-04

**User Story**: Como quem administra um fixo, quero abri-lo ao lado da lista e ver tudo dele, para
conferir sem procurar.

**Why P1**: É a coluna da direita da opção A, e é onde o histórico passa a aparecer.

**Acceptance Criteria**

1. WHEN a pessoa clica em qualquer ponto da linha de um fixo, ou aciona o botão da descrição, THEN o
   sistema SHALL abrir esse fixo no painel, com a descrição como título e "Saída fixa · vence dia N"
   ou "Entrada fixa · cai dia N" abaixo dele
2. The system SHALL mostrar no painel o valor do mês aberto com "em <Mês de Ano>"; "confirmado ·
   previa R$ X" quando confirmado; e "—" com "Começa em <Mês de Ano>" quando o fixo começa depois
3. The system SHALL mostrar no painel a categoria como na linha, o meio ("Meio de pagamento" ou "Onde
   o dinheiro cai", AD-015), "De quem é", o início ("Começou em", ou "Começa em" quando é depois do
   mês aberto) e "Termina em", com "Sem fim" quando não há fim
4. The system SHALL mostrar no painel "Valor ao longo dos meses": cada vigência do fixo, da mais
   antiga para a mais nova, com "desde <Mês de Ano>" e o valor previsto, e o selo "vale em <nome do
   mês>" na vigência do mês aberto
5. The system SHALL mostrar no painel os botões "Mudar valor" e "Editar" e, depois deles, no pé,
   "Encerrar" em vermelho
6. WHEN o fixo aberto está encerrado THEN o sistema SHALL mostrar "Encerrado: vale até <Mês de Ano>.
   Para reabrir, use Editar e apague o “Termina em”." e SHALL mostrar "Editar" como única ação
7. The system SHALL marcar a linha do fixo aberto com fundo diferente das outras e com
   `aria-expanded="true"` no botão dela, e todas as outras com `aria-expanded="false"`
8. WHEN "Fechar" é acionado THEN o sistema SHALL fechar o painel e desmarcar a linha
9. WHEN outro fixo é aberto com o painel ocupado THEN o sistema SHALL mostrar o detalhe do novo fixo,
   descartando o que estava digitado

**Independent Test**: em março, abrir "Fixo A", com vigências em janeiro (R$ 90,00), fevereiro
(R$ 100,00) e maio (R$ 110,00), mostra as três nessa ordem, com "vale em Março" na de fevereiro.

---

### P1: Mudar valor, editar e encerrar no painel ⭐ MVP — FIXCOL-05

**User Story**: Como quem administra um fixo, quero mudar o valor, editar e encerrar ao lado da
lista, para ver o resultado sem fechar nada.

**Why P1**: É a terceira resposta do dono: sem diálogo.

**Acceptance Criteria**

1. WHEN "Mudar valor" é acionado THEN o sistema SHALL mostrar no painel "Novo valor (R$)" e "Vale a
   partir de", preenchido com o mês aberto, com "Registrar" e "Cancelar", e as regras e mensagens de
   hoje (FIXO-03)
2. WHEN o valor novo é registrado THEN o sistema SHALL voltar ao detalhe do fixo, com a vigência
   nova em "Valor ao longo dos meses"
3. WHEN "Encerrar" é acionado THEN o sistema SHALL mostrar no painel o aviso de hoje, "Encerrar a
   partir de" preenchido com o mês aberto, "Encerrar mesmo assim" e "Cancelar", com as regras de
   hoje (FIXO-06)
4. WHEN "Editar" é acionado THEN o sistema SHALL mostrar no painel, sem diálogo, o formulário do
   cadastro em modo de edição, sob o título "Editar gasto fixo" ou "Editar entrada", preenchido como
   hoje (EDF-01, ACs 3 a 5)
5. WHEN a edição é salva THEN o sistema SHALL manter o formulário no painel, com "Alterações salvas."
   quando algo mudou ou "Nada mudou: já estava tudo assim." quando nada mudou, à vista, junto do
   botão "Salvar alterações", sem levar a tela ao título do painel (confirmado pelo dono em
   2026-10-31)
6. WHEN "Voltar" é acionado na edição, ou "Cancelar" em "Mudar valor" ou "Encerrar", THEN o sistema
   SHALL mostrar o detalhe do fixo com o que está gravado
7. IF a action recusar o pedido THEN o sistema SHALL mostrar a mensagem no painel, em alerta, como
   hoje
8. IF o fixo aberto sai da lista do mês depois de uma ação THEN o sistema SHALL mostrar no painel
   "<descrição> não aparece mais em <Mês de Ano>." com "Fechar", no lugar do detalhe

**Independent Test**: abrir "Fixo B", mudar o valor para R$ 60,00 a partir de abril, ver a vigência
de abril no histórico e a linha de março ainda em R$ 50,00.

---

### P1: Novo fixo no painel ⭐ MVP — FIXCOL-06

**User Story**: Como quem cadastra um fixo, quero o formulário ao lado da lista, para ver o fixo novo
aparecer nela.

**Why P1**: É a terceira resposta do dono, para o cadastro.

**Acceptance Criteria**

1. The system SHALL mostrar "+ Novo fixo" no topo da tela, acima dos totais e da lista, em todas as
   larguras (AVUL-05, AC 8)
2. WHEN "+ Novo fixo" é acionado THEN o sistema SHALL abrir no painel, sem diálogo, o formulário de
   cadastro sob o título "Novo gasto fixo ou entrada", e SHALL fechar o fixo que estivesse aberto
3. WHEN o fixo é cadastrado THEN o sistema SHALL manter o formulário no painel, com a confirmação de
   hoje à vista, junto do botão de cadastrar, sem levar a tela ao título do painel, e os campos
   limpos, e SHALL mostrar o fixo novo na lista (confirmado pelo dono em 2026-10-31)

**Independent Test**: cadastrar "Fixo E" pelo painel e vê-lo na lista sem fechar o formulário.

---

### P1: A coluna da direita a partir de 1.536 px ⭐ MVP — FIXCOL-07

**User Story**: Como quem usa o monitor grande, quero a lista e o fixo aberto lado a lado, para não
perder um de vista ao mexer no outro.

**Why P1**: É o aproveitamento de tela que motiva a rodada.

**Acceptance Criteria**

1. WHEN Todo mês é exibida a partir de 1.536 px THEN o sistema SHALL mostrar o painel numa coluna de
   384 px à direita da lista, separada dela por uma linha fina
2. WHILE a página rola a partir de 1.536 px THE system SHALL manter o título do painel à vista
3. WHILE nenhum fixo nem o cadastro está aberto a partir de 1.536 px THE system SHALL mostrar na
   coluna "Nenhum fixo aberto" e "Escolha um fixo na lista para ver o valor ao longo dos meses e para
   mudar o valor, editar ou encerrar."
4. WHEN Todo mês é exibida a partir de 1.536 px THEN o sistema SHALL limitar o título, os totais e
   as seções a 1.100 px de largura, centrados no espaço entre o menu e a coluna
5. WHEN Todo mês é exibida com menos de 1.536 px THEN o sistema SHALL mostrar a tela numa coluna só,
   de até 1.024 px, com o painel entre os totais e as seções enquanto um fixo ou o cadastro estiver
   aberto
6. WHILE nenhum fixo nem o cadastro está aberto com menos de 1.536 px THE system SHALL não mostrar o
   painel
7. WHILE o formulário de cadastro ou de edição tem menos de 448 px de largura THE system SHALL
   mostrar um campo por linha
8. WHILE o formulário tem 448 px de largura ou mais THE system SHALL mostrar lado a lado os pares de
   hoje: valor e dia, início e fim, meio e categoria
9. WHEN Todo mês é exibida em 400 px com um fixo aberto THEN o sistema SHALL caber sem rolagem
   lateral (TRES-01, AC 10)

**Independent Test**: em 1.920 px, abrir um fixo, rolar até o fim e ver o painel ainda à direita;
em 1.535 px, o painel aparece acima da lista.

---

### P1: Teclado e foco ⭐ MVP — FIXCOL-08

**User Story**: Como quem usa o teclado, quero chegar ao painel quando abro um fixo e voltar à linha
quando fecho, para não me perder na página.

**Why P1**: O painel vem antes da lista no DOM, em toda largura; sem o foco, ele fica fora do
caminho de quem usa teclado.

**Acceptance Criteria**

1. The system SHALL fazer do botão da descrição de cada linha um alvo do `Tab`, que abre o fixo com
   `Enter` ou espaço
2. WHEN a pessoa abre um fixo ou o cadastro THEN o sistema SHALL levar o foco ao título do painel
3. WHEN `Escape` é pressionado com o foco dentro do painel THEN o sistema SHALL fechar o painel
4. WHEN o painel é fechado por `Escape` ou por "Fechar" THEN o sistema SHALL devolver o foco ao
   botão da linha do fixo, ou ao "+ Novo fixo" quando o painel tinha o cadastro
5. WHEN um fixo é aberto com menos de 1.536 px THEN o sistema SHALL trazer o título do painel para
   dentro da janela
6. WHILE a janela tem menos de 768 px THE system SHALL desenhar o botão da linha, "Fechar" e cada
   ação do painel com ao menos 44 por 44 px (TOQUE-01)

**Independent Test**: com o teclado, levar o foco a "Fixo B", apertar `Enter`, ver o foco no título
"Fixo B" do painel, apertar `Escape` e ver o foco de volta na linha.

---

### P2: O fixo aberto no endereço — FIXCOL-09

**User Story**: Como quem recarrega a página ou manda um link, quero que o mesmo fixo continue
aberto, para não procurá-lo de novo.

**Why P2**: Útil, mas a tela funciona sem ele.

**Acceptance Criteria**

1. WHEN um fixo é aberto THEN o sistema SHALL pôr o id dele na URL como `?fixo=<id>`, sem recarregar
   a página e sem criar entrada nova no histórico
2. WHEN a página é carregada com `?fixo=<id>` de um fixo da lista THEN o sistema SHALL mostrá-lo
   aberto no painel
3. IF `?fixo=` não corresponde a nenhum fixo da lista do mês THEN o sistema SHALL ignorá-lo, com o
   painel fechado e sem mensagem de erro
4. WHEN o painel é fechado ou o cadastro é aberto THEN o sistema SHALL tirar `?fixo=` da URL

**Independent Test**: abrir "Fixo A", recarregar a página e ver "Fixo A" aberto no painel.

---

## Edge Cases

- Descrição longa: quebra linha, e só aquela linha fica mais alta (como DENS)
- Fixo que começa depois do mês aberto: "—", o selo "Começa em <Mês de Ano>", e nenhuma parcela no
  total; "Mudar valor", "Editar" e "Encerrar" continuam no painel, como hoje no cartão
- Valor confirmado: a linha e o total mostram o confirmado; o formulário de edição continua aberto
  com a previsão vigente no mês (`valorNoMesExibido`, EDF-01 AC 3 e EDF-03 AC 3), e não com o
  confirmado
- Fixo encerrado com ocorrência paga depois do fim: aparece no mês dessa ocorrência (FIXCOL-02,
  AC 4)
- Encerrar a partir de um mês posterior ao aberto: o fixo continua na lista, agora com "Encerrado", e
  o painel volta ao detalhe com o aviso de encerrado
- Renomear muda a posição da linha quando há outro fixo no mesmo dia: o painel, fora da tabela, não
  se move, e o formulário continua com a confirmação
- O formulário de edição é mais alto que a janela, a partir de 1.536 px: a coluna rola por conta
  própria, presa no alto
- Trocar de mês pelo seletor: a navegação não leva `?fixo=`, e o painel abre fechado no outro mês
- Erro numa action: a mensagem aparece no painel e o painel continua no mesmo modo

## O que esta fatia substitui

- EDF-01, AC 1: "Editar" sai de cada cartão e fica no painel do fixo aberto (FIXCOL-04, AC 5)
- EDF-01, AC 2: o formulário de edição abre no painel, sob o mesmo título, e não num `<dialog>`
  (FIXCOL-05, AC 4)
- EDF-06, AC 6: a confirmação aparece no painel, que continua aberto, e não "dentro do diálogo"
  (FIXCOL-05, AC 5)
- AVUL-05, AC 8: em Todo mês o cadastro abre por controle no topo, no painel, e não "no mesmo
  diálogo" (FIXCOL-06)
- FIXO-07, AC 1: o fixo encerrado antes do mês aberto aparece quando o mês tem ocorrência dele
  (FIXCOL-02, AC 4)
- AD-014 em Todo mês: sem diálogo de cadastro (FIXCOL-06)
- TRES-01, AC 8, e AD-019 em Todo mês: a partir de 1.536 px a tela deixa a `AreaEstreita`
  (FIXCOL-07, AC 4)

A decisão nova é o AD-021.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FIXCOL-01 | P1: Uma linha por fixo, em duas seções | Execute | In progress: `fixos-do-mes.test.ts` prova a despesa nas saídas e a receita e o investimento nas entradas, AC 2, e a ordem pelo dia (dia 1 "Fixo D" antes de dia 5 "Fixo A"), pela descrição em pt-BR ("Item Ú" antes de "Item V") e pelo id, AC 3 (T1); `tabela-de-fixos.test.tsx` prova "Entradas fixas" antes de "Saídas fixas" e as colunas de cada uma, com "Valor em Março", AC 1, o "4 · R$ 185,00" dentro da região da seção, AC 4, a pill na cor da categoria e "Sem categoria" e "Categoria removida" na neutra, dentro da linha, AC 5, "Receita" em toda entrada, AC 6, um botão só por linha, AC 7, o selo "Encerrado" no botão da descrição, AC 8, "—" e "Começa em Junho de 2026", AC 9, e o aviso único sem seções e a linha de texto da seção vazia, ACs 12 e 13 (T3); `todo-mes-colunas.spec.ts:351` prova no navegador "Entradas fixas" acima de "Saídas fixas", as colunas de cada uma, as saídas na ordem D, A, B, C e os títulos "4 · R$ 185,00" e "1 · R$ 1.000,00", ACs 1 a 4, `:385` o selo "Encerrado" em C e "—" com "Começa em Junho de 2026" em D, ACs 8 e 9, `:649` toda linha das duas tabelas com até 48 px em 1.280 px, com ponteiro fino, a encerrada, a que começa depois e a confirmada entre elas, e só as de descrição longa crescendo, AC 10, e `:740` e `:802` cada fixo em duas faixas, a descrição e o valor em cima, sem cabeçalho, em 400 e 767 px, com os cabeçalhos de volta em 768 px, AC 11 (T8); `todo-mes-colunas.spec.ts:946` prova toda linha das duas tabelas com até 48 px em 1.536 e 1.920 px, com ponteiro fino e as descrições longas, AC 10 (T9); `todo-mes-colunas.spec.ts:385` prova também Fixo B e Entrada A, que começam em março, o mês aberto, sem "Começa em" na linha, AC 9, o lado colado do limiar (F2) |
| FIXCOL-02 | P1: O valor do mês aberto | Execute | In progress: `fixos-do-mes.test.ts` prova o valor da ocorrência, e não o da vigência, inclusive o confirmado (10500 sobre 10000), AC 1; `confirmado` só com valor diferente do previsto, AC 2; o encerrado antes do mês na lista com a ocorrência paga dele, AC 4; e o que começa depois sem valor, e o encerrado sem ocorrência fora da lista, AC 5 (T1); `obter-todo-mes/handler.test.ts` prova, com os fakes, que num mês nunca aberto a linha vem com o valor da vigência e os totais não são zero, com o controle lido antes de materializar saindo vazio, a janela de `MESES_DE_PROJECAO` e abrir duas vezes sem ocorrência nova, AC 3, e a ocorrência confirmada em 10500 na linha, AC 1 (T2); `tabela-de-fixos.test.tsx` prova "confirmado" na célula do valor, só na linha confirmada, AC 2 (T3); `todo-mes-colunas.spec.ts:324` prova, abrindo março antes de qualquer outra tela e sem a ocorrência de B em março no banco, a linha de B em R$ 50,00, AC 3, e `:385` A com "confirmado" e R$ 105,00, ACs 1 e 2, e C, encerrado em fevereiro, com a ocorrência paga de R$ 30,00, AC 4 (T8); FIXO-07, AC 1, em `lancamento-avulso/spec.md`, aponta para o AC 4 (T11) |
| FIXCOL-03 | P1: Os totais do mês no alto | Execute | In progress: `fixos-do-mes.test.ts` prova as saídas em 18500, iguais a `resumoMensal(...).competenciaView.fixos` para a mesma entrada, com o fixo pago no cartão e o encerrado pago, AC 2; as entradas com a receita e o investimento, AC 3; o fixo que começa depois somando zero com vigência de 999900, AC 4; e cada total igual à soma das linhas da seção, AC 5 (T1); `obter-todo-mes/handler.test.ts` prova o total de saídas com o valor confirmado, 10500, depois de materializar, AC 2 (T2); `todo-mes.test.tsx` prova "Saídas fixas em Março de 2026" e "Entradas fixas em Março de 2026" no alto, cada um com o seu valor no par termo e definição, AC 1 (T7); `todo-mes-colunas.spec.ts:324` prova "Saídas fixas em Março de 2026" em R$ 185,00, sem os R$ 70,00 de D, que começa em junho, e "Entradas fixas em Março de 2026" em R$ 1.000,00, ACs 1, 3 e 4, e depois o mesmo R$ 185,00 no título do bloco "Fixos" de Lançamentos, AC 2 (L-014); `:351` o título de cada seção com o total do alto, AC 5 (T8) |
| FIXCOL-04 | P1: O fixo aberto no painel | Execute | In progress: `tabela-de-fixos.test.tsx` prova que o clique na célula do valor abre o fixo da linha e que o botão da descrição, por `Enter` e por espaço, também abre, uma vez só, AC 1, e `aria-expanded` "true" só na linha aberta, com `aria-controls="painel-do-fixo"` e o fundo de elevação nela, AC 7 (T3); `detalhe-do-fixo.test.tsx` prova o valor com "em Março de 2026", "confirmado · previa R$ 100,00" no confirmado e "—" com "Começa em Junho de 2026", AC 2, a pill da categoria, "Meio de pagamento" na saída e "Onde o dinheiro cai" na entrada, "De quem é", "Começou em" ou "Começa em" e "Termina em" com "Sem fim", AC 3, as três vigências na ordem dentro da região "Valor ao longo dos meses", com "vale em Março" só na de fevereiro, AC 4, "Mudar valor", "Editar" e "Encerrar" no pé, em vermelho, cada um com o seu callback, AC 5, e o aviso do encerrado com "Editar" como única ação, AC 6 (T4); `painel-do-fixo.test.tsx` prova a descrição no título com "Saída fixa · vence dia 31" ou "Entrada fixa · cai dia 5", AC 1, "Fechar" chamando o fechamento, AC 8, e trocar de fixo com o valor digitado voltando ao detalhe do novo, sem o digitado, AC 9 (T6); `todo-mes-colunas.spec.ts:421` prova no navegador o painel de A com "Saída fixa · vence dia 5", "confirmado · previa R$ 100,00" e as três vigências na ordem, com "vale em Março" só na de fevereiro, ACs 1, 2 e 4, `:620` a linha aberta com fundo computado diferente e o filete de 2 px na cor primária, que as outras não têm, AC 7, e `:563` o `Escape` fechando e desmarcando a linha, AC 8 (T8); EDF-01, AC 1, em `editar-fixos/spec.md`, aponta para o AC 5, e o AD-021 registra a decisão (T11); `todo-mes-colunas.spec.ts:385` prova no painel de B, que começa no mês aberto, "em Março de 2026" junto do valor e o termo "Começou em" com "Março de 2026", sem "Começa em", ACs 2 e 3 (F2); `todo-mes-colunas.spec.ts:421` lê no navegador cada dado do painel pelo termo: no de A, dono uma segunda pessoa semeada no teste, "Categoria Um", "Conta Corrente" em "Meio de pagamento", "Pessoa B" em "De quem é", "Janeiro de 2026" em "Começou em" e "Sem fim" em "Termina em", e no de Entrada A "Conta Corrente" em "Onde o dinheiro cai" e "Pessoa A" em "De quem é", AC 3 (F3) |
| FIXCOL-05 | P1: Mudar valor, editar e encerrar no painel | Execute | In progress: `ciclo-do-fixo.test.tsx` prova "Novo valor (R$)" e "Vale a partir de" pré-preenchido com o mês aberto, o envio em centavos com a competência escolhida e o texto inválido barrado no navegador, AC 1, "Encerrar a partir de" pré-preenchido, o aviso de hoje e "Encerrar mesmo assim", AC 3, gravar com sucesso concluindo o controle, AC 2, "Cancelar" fechando sem gravar nos dois modos, AC 6, e a recusa da action em alerta, com o controle aberto, nos dois modos, AC 7 (T5); `painel-do-fixo.test.tsx` prova "Mudar valor" e "Encerrar" do detalhe abrindo o controle certo, com o mês aberto, ACs 1 e 3, registrar voltando ao detalhe, AC 2, a região "Editar gasto fixo" ou "Editar entrada" sem diálogo, com o fixo e o mesmo payload de hoje e a previsão do mês no valor, AC 4, "Alterações salvas." e "Nada mudou: já estava tudo assim." com o formulário no painel, AC 5, "Voltar" e os dois "Cancelar" voltando ao detalhe com o gravado, AC 6, e "Fixo B não aparece mais em Março de 2026." com "Fechar" quando a lista relida não tem o fixo, AC 8 (T6); `todo-mes-colunas.spec.ts:466` prova "Vale a partir de" com março, a vigência de abril no histórico depois de "Registrar" e a linha de março em R$ 50,00, ACs 1 e 2, e `:490` encerrar a partir de março mostrando "Fixo F não aparece mais em Março de 2026." com "Fechar", e a linha fora, AC 8; `editar-fixo.spec.ts:108`, `:167` e `:211` a edição aberta pela linha e por "Editar", na região "Editar gasto fixo" do painel, com "Alterações salvas." e "Nada mudou: já estava tudo assim." e o formulário no painel, ACs 4 e 5 (T8); EDF-01, AC 2, e EDF-06, AC 6, em `editar-fixos/spec.md`, apontam para os ACs 4 e 5, e FIXO-07, AC 1, em `lancamento-avulso/spec.md`, para FIXCOL-02, AC 4 (T11); `form-recorrencia.test.tsx:575` prova que salvar a edição leva o foco à confirmação, logo antes do botão "Salvar alterações", AC 5, e `todo-mes-colunas.spec.ts:1203` prova, em 1.280 × 720 e em 1.920 × 1.080, depois de "Salvar alterações", "Alterações salvas." inteira na janela, com o foco nela, o título do painel sem entrar na janela durante a gravação e o `Escape` fechando o painel, AC 5; `:1239` prova, em 400 × 800, o alerta de "Registrar" recusado inteiro na janela, AC 7 (F1); `todo-mes-colunas.spec.ts:1203` passa a medir depois da página relida, com a edição aberta pelo clique, que muda o `?fixo=`: a confirmação continua inteira na janela, com o foco nela, e o título fora dela, AC 5 (F6) |
| FIXCOL-06 | P1: Novo fixo no painel | Execute | In progress: `painel-do-fixo.test.tsx` prova o formulário de cadastro no painel sob "Novo gasto fixo ou entrada", sem diálogo, AC 2, e cadastrar mantendo o formulário, com a confirmação e os campos limpos, AC 3 (T6); `todo-mes.test.tsx` prova "Todo mês" e "+ Novo fixo" antes dos totais e das seções, AC 1, e "+ Novo fixo" fechando o fixo aberto e mostrando o cadastro no painel, AC 2 (T7); `todo-mes-colunas.spec.ts:512` prova o cadastro no painel, sem diálogo, e "Fixo E" na lista com o formulário aberto, limpo e com a confirmação, ACs 2 e 3; `recorrencias.spec.ts:105` "+ Novo fixo" acima da linha do fixo, AC 1 (T8); AVUL-05, AC 8, em `lancamento-avulso/spec.md`, aponta para cá (T11); `form-recorrencia.test.tsx:207` prova que cadastrar leva o foco à confirmação, logo antes do botão, AC 3, e `todo-mes-colunas.spec.ts:1203` prova, em 1.280 × 720 e em 1.920 × 1.080, depois de "Cadastrar gasto fixo", a confirmação inteira na janela, com o foco nela, sem o título do painel entrar na janela durante a gravação, AC 3 (F1); `todo-mes-colunas.spec.ts:1203` mede o cadastro aberto a partir de uma carga com `?fixo=`, depois da página relida, com a confirmação inteira na janela, AC 3 (F6); `todo-mes-colunas.spec.ts:914` mede, em 1.536 e 1.920 px, onde a grade decide a ordem, "+ Novo fixo" terminando antes do topo dos totais e os totais antes do topo de "Entradas fixas", e `:740`, o mesmo em 400 px, AC 1 (F4) |
| FIXCOL-07 | P1: A coluna da direita a partir de 1.536 px | Execute | In progress: `painel-do-fixo.test.tsx` prova "Nenhum fixo aberto" e a dica, sem "Fechar", no painel sem nada aberto, AC 3, o texto (T6); `todo-mes.test.tsx` prova, na ordem do DOM, o painel entre os totais e as seções com um fixo ou o cadastro aberto, AC 5, e nenhum painel sem nada aberto, AC 6; a medida é do e2e (T7); `todo-mes-colunas.spec.ts:599` prova em 1.280 px nenhum painel sem nada aberto e o painel entre os totais e as seções com um fixo e com o cadastro, ACs 5 e 6, `:683` em 1.024, 1.280 e 1.440 px as seções com até 1.024 px e as tabelas dentro delas, com o fixo confirmado e as descrições longas, sem rolagem lateral, AC 5, e `:740` 400 px com A aberto sem rolagem lateral, AC 9 (T8); `todo-mes-colunas.spec.ts:858` prova o limiar dos dois lados: em 1.535 px o painel aberto acima das seções e, sem nada aberto, nenhum painel nem dica, e em 1.536 px o painel à direita da lista e, sem nada aberto, "Nenhum fixo aberto" com a dica, ACs 1, 3, 5 e 6, `:893` em 1.535 px o título, os totais, o painel e as seções com até 1.024 px, AC 5, `:914` em 1.536 e 1.920 px a coluna com 384 px e `border-left` computado de 1 px, e o título, os totais e as seções com até 1.100 px, centrados entre o menu e a coluna, ACs 1 e 4, `:956` o título do painel à vista depois de rolar até o fim em 1.536 × 480 e 1.920 × 480, AC 2, e `:973` a edição mais alta que a janela rolando dentro da coluna presa (edge case); `todo-mes.test.tsx:208` o painel em "Nenhum fixo aberto" numa coluna `hidden 2xl:block` e `:214` a coluna sem `hidden` com algo aberto, ACs 3 e 6 (T9); `todo-mes-colunas.spec.ts:1062` prova, em 1.536 e 1.920 px, na coluna, no cadastro e na edição, o formulário com menos de 448 px e "Dia de vencimento" abaixo do valor, "Termina em (opcional)" abaixo de "Começa em" e "Categoria" abaixo do meio, AC 7, `:1079` em 1.280 px, no cadastro e na edição, os três pares lado a lado, AC 8, e `:1098` o formulário medido em 447 px, empilhado, e em 448 px, lado a lado, ACs 7 e 8 (T10); TRES-01, AC 8, em `visao-tres-colunas/spec.md`, aponta para o AC 4, e `docs/design.md` registra a coluna de 384 px em "Largura do conteúdo" (T11) |
| FIXCOL-08 | P1: Teclado e foco | Execute | In progress: `painel-do-fixo.test.tsx` prova o foco no título quando `focarTitulo` muda e na montagem com um pedido de foco, e nenhum foco na montagem da carga com `?fixo=`, AC 2, e `Escape` num campo do painel, no fixo e no cadastro, fechando, AC 3 (T6); `todo-mes.test.tsx` prova o foco no título do painel ao abrir a linha e o cadastro, AC 2, e "Fechar" e `Escape` devolvendo o foco ao botão da linha, e ao "+ Novo fixo" quando era o cadastro, AC 4 (T7); `todo-mes-colunas.spec.ts:563` prova `Tab` até "Fixo B", `Enter` e espaço abrindo, o foco no título do painel, e `Escape` fechando e devolvendo o foco à linha, ACs 1 a 4, `:658` abrir a última linha, com a página rolada, trazendo o título do painel para a janela, AC 5, e `:740`, `:802` e `:834` o botão da linha, "Fechar" e as ações com 44 × 44 em 400 e 767 px e com ponteiro grosso em 1.280 px, AC 6; `painel-do-fixo.test.tsx:525` e `:576` provam o foco no título do modo novo e no do painel na volta, e o botão de envio desabilitado que não leva o foco para fora, ACs 2 e 3 (T8); `todo-mes-colunas.spec.ts:1203` prova, depois de salvar e de cadastrar, o `Escape` fechando o painel e devolvendo o foco à linha ou ao "+ Novo fixo", ACs 3 e 4 (F1); `painel-do-fixo.test.tsx:606` prova que "Mudar valor", um botão habilitado do painel, que perde o foco para fora não o leva ao título: a guarda só age no botão desabilitado, AC 3 (F5) |
| FIXCOL-09 | P2: O fixo aberto no endereço | Execute | In progress: `todo-mes.test.tsx` prova `?fixo=<id>` na URL por `replaceState`, sem `pushState`, com os outros parâmetros e o mesmo `history.length`, AC 1, `fixoInicial` da lista abrindo o painel sem roubar o foco, AC 2, um id fora da lista deixando o painel fechado e sem alerta, AC 3, e fechar ou abrir o cadastro tirando `?fixo=`, sem deixar "?" sozinho, AC 4 (T7); `todo-mes-colunas.spec.ts:532` prova no navegador `?fixo=<id de A>` sem recarregar e com o mesmo `history.length`, AC 1, recarregar com A aberto, AC 2, e um id fora da lista com o painel fechado e sem alerta, AC 3, e `:563` o `Escape` tirando `fixo` da URL, AC 4 (T8); `todo-mes.test.tsx:275` prova que abrir um fixo, que muda o `?fixo=`, troca o endereço por `router.replace` com `{ scroll: false }`, e `:284`, que abrir o cadastro com o endereço já sem `?fixo=` não navega, AC 1; `todo-mes-colunas.spec.ts:1265` prova, em 1.920 × 480, que abrir um fixo com a página rolada até o fim deixa a linha clicada à vista e a página fora do alto, também depois da página relida, AC 1 (F7, no lugar da releitura da F6) |

**Coverage:** 9 total, 9 mapeados para tasks (T1 a T11), 0 sem task.

---

## Success Criteria

- [ ] Em 1.920 px, a lista inteira e o fixo aberto cabem na mesma tela, sem diálogo
- [ ] Em qualquer mês, "Saídas fixas" é igual ao total do bloco "Fixos" de Lançamentos
- [ ] Nenhuma ação some: cadastrar, editar, mudar o valor e encerrar continuam a dois cliques
- [ ] Nenhuma mudança de banco
