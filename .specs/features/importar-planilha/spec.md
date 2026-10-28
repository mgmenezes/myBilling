# Importar a planilha: Specification

> Base: `.specs/features/importar-planilha/context.md` (descoberta aprovada em 2026-10-24). Este
> documento transforma aquelas decisões em critérios testáveis; onde os dois divergirem, este manda e
> o outro é corrigido.

## Problem Statement

O app nasceu para substituir uma planilha com uma aba por mês, e a primeira tentativa de cadastrar
à mão o conteúdo dela caiu inteira no ano errado — janeiro de 2026 em vez de janeiro de 2027. Copiar
linha por linha é lento e é onde o erro entra: o mês é digitado, e não lido.

A planilha já tem tudo o que o app precisa saber para três meses: gastos fixos, compras parceladas
em andamento, gastos do mês e entradas, com meio de pagamento e categoria. Falta um caminho que leia
a aba exportada, mostre o que vai acontecer com cada linha e grave tudo de uma vez — e que, na aba
seguinte, reconheça o que já existe em vez de duplicar.

É ferramenta de largada: as abas de outubro, novembro e dezembro de 2026 entram de uma vez, antes de
qualquer lançamento manual, e dali em diante tudo se lança no app.

## Goals

- [ ] Importar as três abas reais (outubro, novembro e dezembro de 2026) em localhost em menos de
      dez minutos no total, contando as decisões do passo 2
- [ ] Depois das três importações, cada gasto fixo e cada compra parcelada existir **uma** vez
- [ ] Nenhuma importação gravar numa competência que a pessoa não viu por extenso e confirmou
- [ ] Toda linha da aba que não virar lançamento aparecer na conferência com o motivo

## Out of Scope

| Feature | Reason |
| --- | --- |
| Orçamento ("Valor esperado" da tabela de categorias) | Não tem tela nem repositório; é a fatia seguinte do roadmap. Os nomes da tabela viram categorias, os valores são ignorados |
| Blocos de resumo: Saídas (exceto o total), Gastos por tipo de pagamento, Investimentos, Saldo, Total de gastos | São contas que a planilha faz e o app refaz |
| Coluna "Pago?" | Decisão do dono: tudo entra previsto, e o pagamento se marca no app pelo selo de situação |
| Datas do bloco Gastos do Mês | Decisão do dono: estão erradas na planilha |
| Desfazer uma importação gravada | Decisão do dono: a correção é recomeçar pelo script de limpeza (IMP-09). Desfazer exigiria rastrear cada linha criada, inclusive reajustes e encerramentos |
| Lançamento manual intercalado entre importações | As três abas entram de uma vez, antes de qualquer uso; nenhuma regra trata avulso feito à mão no mês de destino nem fixo criado à mão no reconhecimento |
| Sincronização contínua, outros formatos (`.xlsx`, extrato de banco) | É ferramenta de largada, não ponte permanente |
| Editar uma linha dentro da prévia | A correção de conteúdo é na planilha; a prévia só mostra e confirma |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que é "nome normalizado" | Sem espaços nas pontas, espaços internos reduzidos a um, e em minúsculas (`pt-BR`) | A planilha real tem nomes com espaço no fim e grafias que diferem só em caixa; reconhecer entre abas, ligar "Tipo" e reaproveitar categoria usam todos a mesma regra | n |
| Quem é a pessoa dos lançamentos importados | Quem está logado e importa | Decisão do dono, assumida como atalho para agora. AD-007 já diz que `usuario_id` é classificação, não permissão | y |
| Situação dos lançamentos importados | Todos previstos (`pago_em` nulo) | Decisão do dono | y |
| Data do lançamento (`data_evento`) | Dia 1 da competência | O banco exige; as datas do Gastos do Mês são ignoradas por decisão do dono, e fixos e parcelados não têm data | y |
| Ordem das importações | A primeira aceita qualquer mês; as seguintes, só o mês seguinte ao último importado | Reajuste e reconhecimento dependem do mês anterior | y |
| Correção de importação errada | Recomeçar: script de limpeza e reimportação das três abas | Decisão do dono | y |
| Fixo reconhecido com valor ilegível | Conta como presente e mantém o valor vigente; a linha aparece como não lida | Encerrar por causa de uma célula vazia apagaria os meses futuros de um gasto real | y |
| Parcela reconhecida com valor diferente | O valor novo vale para aquela parcela e as seguintes; o total da compra se ajusta | Decisão do dono para o mês; "e as seguintes" é a mesma lógica dos fixos | y |
| Tolerância do reconhecimento de parcela | Até 100 centavos de diferença; havendo mais de um candidato, o de valor mais próximo | O maior desvio observado nos dados reais foi de 4 centavos | y |
| Arquivo sem algum dos quatro blocos | Recusado inteiro | Ler parte de uma aba daria uma prévia que parece completa e não é | y |
| Tabela de categorias ausente | Aceita; só não há categorias extras | Ela é acessória à importação | y |
| Categorias da tabela sem nenhuma linha no mês | Criadas | Para existirem nos meses seguintes e na fatia de orçamento | y |
| Primeira importação com banco já populado | Recusada | Sem a guarda, esquecer o script de limpeza duplicaria os salários em silêncio | y |
| Dia de vencimento das recorrências criadas | 1 | O banco exige (`dia_vencimento NOT NULL`) e a planilha não tem; a classificação de vencido usa a competência, não o dia | n |
| Tamanho máximo do arquivo | 1 MB | Uma aba real tem cerca de 15 KB; o limite só barra arquivo errado | n |
| Compra de importação anterior que não aparece na aba | Mantida, e apontada na conferência como "não aparece nesta aba" | Não foi observado nos dados reais; apagar seria irreversível, e a prévia não permite decidir linha a linha | n |
| Chave repetida dentro da mesma aba (mesmo nome e meio em dois fixos) | Cada linha é um fixo; o reconhecimento pareia as linhas, na ordem de aparição, com as recorrências em ordem de `competencia_inicio` e, no empate, de `id` | Não observado nos dados reais; parear por ordem mantém a contagem certa. O `id` só desempata: é UUID aleatório, então a ordem é estável, mas não é a de criação | n |
| Meio criado no passo 2 | Gravado na hora, pela action que já existe, fora da transação da importação | É o padrão "criar sem sair do formulário"; um meio sem lançamento é inofensivo | n |
| Idempotência dos avulsos | `origem_dado = 'PLANILHA'` e `origem_hash` por linha, com o índice único que já existe | A regra de ordem já impede reimportar o mesmo mês; o índice é a segunda linha de defesa | n |

**Open questions:** none. As linhas `y` foram decididas com o dono na descoberta; as `n` são
decisões de engenharia com a razão registrada, sujeitas à revisão desta spec.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação e limites de entrada | IMP-01 AC 1-3, 8-11; IMP-02 AC 2-3 |
| Falha e falha parcial | IMP-06 AC 1-2: tudo ou nada |
| Idempotência, retentativa, duplicata | IMP-02 AC 5-6; IMP-07 inteiro; índice único de `origem_hash` |
| Fronteiras de autorização e limite de taxa | IMP-06 AC 4. Limite de taxa: N/A porque o app é privado, com allowlist de dois e-mails (AD-007) |
| Concorrência e ordenação | IMP-02 AC 5-7: ordem obrigatória, e duas gravações do mesmo mês ao mesmo tempo resultam em uma só |
| Ciclo de vida do dado | IMP-09: a limpeza é script do dono; a importação nunca apaga linha |
| Observabilidade | IMP-06 AC 5: identificador de correlação no servidor, sem stack trace no navegador |
| Falha de dependência externa | N/A porque o arquivo é lido no navegador e nenhum serviço externo é chamado |
| Integridade de transição de estado | IMP-02 AC 5-7 (ordem e banco vazio); IMP-07 AC 3-5 (reajuste e encerramento pelos casos de uso que já existem) |

---

## User Stories

### P1: Ler a aba exportada ⭐ MVP — IMP-01

**User Story**: Como quem mantém a planilha, quero que o app leia a aba exportada do jeito que ela
é, com os blocos lado a lado, para não ter que reformatar nada antes de importar.

**Why P1**: Sem leitura confiável, todo o resto é prévia de dado errado.

**Acceptance Criteria**

1. IF o arquivo não tiver extensão `.csv` ou passar de 1 MB (1.048.576) THEN o diálogo SHALL
   recusá-lo com a mensagem de `PLANILHA_ARQUIVO_INVALIDO`, medindo o tamanho do arquivo em bytes,
   sem montar prévia; e, como segunda linha de defesa, o servidor SHALL recusar o mesmo payload com
   `VALIDACAO`, medindo o tamanho do conteúdo em caracteres
2. WHEN o arquivo começa com marca de ordem de bytes UTF-8 THEN o sistema SHALL ignorá-la na leitura
3. IF faltar qualquer um dos títulos `Fixos`, `Cartão de Crédito`, `Gastos do Mês` ou `Entradas`
   THEN o sistema SHALL recusar o arquivo com `PLANILHA_BLOCO_AUSENTE`, nomeando o primeiro título
   ausente nessa ordem
4. WHEN um título é procurado THEN o sistema SHALL compará-lo sem os espaços das pontas, de modo que
   `Gastos do Mês ` seja encontrado
5. WHEN os blocos são localizados THEN o sistema SHALL derivar a coluna de cada campo da posição do
   título e do cabeçalho, e nunca de número de linha ou coluna fixos
6. WHEN o bloco Fixos é lido THEN o sistema SHALL ler da linha abaixo do cabeçalho até a linha cuja
   célula na coluna do título é `Total de Cartão de Crédito`, exclusive
7. WHEN o bloco Entradas é lido THEN o sistema SHALL ler da linha logo abaixo do título até a linha
   cuja célula na coluna do título é `Total:`, exclusive, sem esperar cabeçalho
8. WHEN uma linha de bloco tem nome e valor vazios THEN o sistema SHALL ignorá-la sem listá-la, mesmo
   que outra coluna (como "Tipo") esteja preenchida
9. IF uma linha tiver nome e a célula de valor vazia THEN o sistema SHALL listá-la como não lida com o
   motivo `VALOR_VAZIO`
10. IF a célula de valor, sem `R$` e sem espaços (inclusive o não separável), não for aceita por
    `parseBRL` THEN o sistema SHALL listar a linha como não lida com o motivo `VALOR_INVALIDO`
11. IF a coluna Parcelas de uma linha do Cartão de Crédito não estiver no formato `n/t` com
    `1 ≤ n ≤ t ≤ 120` THEN o sistema SHALL listar a linha como não lida com o motivo `PARCELA_INVALIDA`
12. IF uma linha tiver valor e o nome vazio THEN o sistema SHALL listá-la como não lida com o motivo
    `NOME_VAZIO`
13. WHEN o valor `R$ 1.234,56` é lido THEN o sistema SHALL obter exatamente 123456 centavos, sem
    passar por número de ponto flutuante
14. WHEN a tabela `Gastos do mês por categoria:` existe THEN o sistema SHALL ler os nomes da coluna
    `Categoria` da linha seguinte ao cabeçalho até a linha cuja célula nessa coluna é
    `Gastos por tipo de pagamento` ou até o fim do arquivo, pulando células vazias
15. WHEN a tabela de categorias não existe THEN o sistema SHALL aceitar o arquivo com a lista de
    categorias extras vazia
16. WHEN o arquivo é lido THEN o sistema SHALL ignorar todo conteúdo fora dos quatro blocos, da
    tabela de categorias e das células de total usadas pela conferência
17. IF nenhuma linha do arquivo tiver mais de uma coluna — como num CSV salvo de novo com ponto e
    vírgula — THEN o sistema SHALL recusá-lo com `PLANILHA_ARQUIVO_INVALIDO`, e não com
    `PLANILHA_BLOCO_AUSENTE`
18. IF o valor de uma linha for zero (`R$ 0,00`) THEN o sistema SHALL listá-la como não lida com o
    motivo `VALOR_ZERO`, e não `VALOR_INVALIDO`

**Independent Test**: a fixture sintética com as treze peculiaridades do `context.md` produz os
quatro blocos com as contagens esperadas, as linhas não lidas com seus motivos, e nenhuma linha dos
blocos ignorados.

---

### P1: Decidir o mês da aba ⭐ MVP — IMP-02

**User Story**: Como quem importa, quero ver o mês e o ano da aba por extenso e confirmá-los antes de
qualquer gravação, para que o erro de ano não se repita.

**Why P1**: É exatamente o erro que motivou a fatia.

**Acceptance Criteria**

1. WHEN o nome do arquivo segue `<título> - <aba>.csv` THEN o sistema SHALL pré-selecionar o mês
   pelo nome da aba comparado, sem caixa e sem acento, aos doze nomes de mês em português, e o ano
   pelo último número de quatro dígitos entre 2000 e 2099 no título, ignorando um sufixo ` (n)` que
   o navegador acrescenta a downloads repetidos
2. IF o nome do arquivo não permitir identificar o mês ou o ano THEN o sistema SHALL deixar o seletor
   correspondente sem seleção e SHALL impedir o avanço até que a pessoa escolha
3. WHEN o mês e o ano estão selecionados THEN o sistema SHALL exibir a competência por extenso
   ("Outubro de 2026") junto do aviso "Confira o ano antes de continuar"
4. WHEN já existe importação registrada THEN o sistema SHALL exibir "Próximo mês esperado:" seguido
   da competência seguinte à última importada, por extenso
5. IF já existir importação registrada e a competência escolhida não for a seguinte à última
   importada THEN o sistema SHALL recusar com `IMPORTACAO_FORA_DE_ORDEM`, informando a competência
   esperada, sem gravar nada
6. IF não houver importação registrada e existir qualquer linha em `movimento`, `compra_parcelada` ou
   `recorrencia` THEN o sistema SHALL recusar com `IMPORTACAO_BANCO_NAO_VAZIO`, sem gravar nada
7. WHEN duas gravações da mesma competência chegam ao mesmo tempo THEN o sistema SHALL registrar
   apenas uma, e a outra SHALL terminar com `IMPORTACAO_FORA_DE_ORDEM`

**Independent Test**: com o banco vazio, o arquivo `Planilha 2026 - Outubro.csv` pré-seleciona
outubro de 2026; importar dezembro em seguida é recusado nomeando novembro de 2026.

---

### P1: Transformar cada linha no que ela é ⭐ MVP — IMP-03

**User Story**: Como quem importa, quero que cada linha vire no app o mesmo tipo de coisa que ela é
na planilha, para que o mês importado se comporte como um mês lançado à mão.

**Why P1**: É o conteúdo da importação.

**Acceptance Criteria**

1. WHEN um lançamento ou plano é criado pela importação THEN o sistema SHALL usar como pessoa quem
   está logado, como competência a confirmada, como `data_evento` o dia 1 dessa competência, e
   `pago_em` nulo
2. WHEN uma linha de Fixos não é reconhecida THEN o sistema SHALL criar uma recorrência de natureza
   despesa iniciada na competência, com uma versão vigente desde ela com o valor da linha, o meio
   ligado ao "Tipo", a categoria da linha e dia de vencimento 1
3. WHEN uma entrada classificada como fixa não é reconhecida THEN o sistema SHALL criar uma
   recorrência de natureza receita iniciada na competência, sem categoria, com o meio escolhido em
   "cai em" e dia de vencimento 1
4. WHEN uma entrada é classificada como avulsa THEN o sistema SHALL criar um `movimento` de natureza
   receita e `origem = 'AVULSO'`, sem categoria, com o meio escolhido em "cai em"
5. WHEN uma linha `n/t` do Cartão de Crédito não é reconhecida THEN o sistema SHALL criar uma compra
   parcelada em andamento com `qtd_parcelas = t`, `parcela_inicial = n`, valor de parcela igual ao
   da linha e parcela `n` na competência, gravando só as parcelas de `n` a `t`
6. WHEN essa compra é criada THEN o sistema SHALL gravar `valor_amortizado_anterior_centavos` igual
   ao valor da parcela multiplicado por `n − 1`, e nenhum lançamento em competência anterior
7. WHEN uma linha de Gastos do Mês é lida THEN o sistema SHALL criar um `movimento` de natureza
   despesa e `origem = 'AVULSO'`, com o meio ligado ao "Tipo" e a categoria da linha
8. WHEN um avulso é criado pela importação THEN o sistema SHALL gravar `origem_dado = 'PLANILHA'` e
   um `origem_hash` que identifica a competência, o bloco e a posição da linha
9. WHEN o nome normalizado de uma categoria da aba coincide com o de uma categoria existente THEN o sistema SHALL reaproveitá-la, reativando-a se estiver arquivada
10. WHEN o nome de uma categoria não coincide com nenhuma existente THEN o sistema SHALL criá-la uma
    única vez, com a grafia da primeira linha em que aparece
11. WHEN a tabela de categorias traz um nome que não aparece em nenhuma linha THEN o sistema SHALL
    criar essa categoria pela mesma regra
12. IF a célula de categoria de uma linha estiver vazia THEN o sistema SHALL criar o lançamento ou
    plano sem categoria

**Independent Test**: importar a fixture de outubro num banco vazio e encontrar no banco exatamente
as recorrências, compras, avulsos e categorias que a fixture define, todos em nome de Pessoa A.

---

### P1: Resolver o que o app não sabe ⭐ MVP — IMP-04

**User Story**: Como quem importa, quero ligar uma vez cada nome da coluna "Tipo" a um meio do app e
dizer se cada entrada é fixa ou avulsa, para que a importação tenha o que a planilha não diz.

**Why P1**: Cartão exige dias de ciclo que a planilha não tem, e a entrada não diz se se repete.

**Acceptance Criteria**

1. WHEN a aba tem nomes de "Tipo" ainda sem ligação THEN o sistema SHALL exibir o passo "O que
   precisa de você" com um seletor de meio para cada nome, e a quantidade de linhas que o usam
2. WHEN a pessoa escolhe "cadastrar" para um nome THEN o sistema SHALL abrir o cadastro de meio que
   já existe (`CadastroInline`) com o nome pré-preenchido, e SHALL selecionar o meio criado
3. WHEN a aba tem entradas ainda sem classificação THEN o sistema SHALL pedir, para cada uma, "fixa"
   ou "avulsa" e a conta em que o dinheiro cai, listando só meios que não geram fatura (AD-015)
4. WHEN a importação é gravada THEN o sistema SHALL lembrar cada ligação de "Tipo" e cada
   classificação de entrada pelo nome normalizado
5. WHEN uma aba seguinte traz um nome já ligado ou uma entrada já classificada THEN o sistema SHALL
   aplicar a decisão lembrada sem perguntar de novo
6. WHEN não há nada a decidir THEN o sistema SHALL pular o passo e ir direto à conferência
7. IF a gravação chegar ao servidor com algum "Tipo" sem meio ou alguma entrada sem classificação
   THEN o sistema SHALL recusar com `IMPORTACAO_PENDENCIA_ABERTA`, sem gravar nada
8. WHILE houver "Tipo" sem meio, entrada sem classe ou entrada sem conta o sistema SHALL listar,
   junto do botão "Continuar" e sob "Para continuar, falta:", o nome de cada um, em uma linha por
   tipo de pendência, e SHALL ligar o botão a essa lista como descrição acessível
9. WHEN o passo "O que precisa de você" lista um meio, no seletor de um "Tipo" ou no "Cai em", THEN
   o sistema SHALL mostrar junto do nome o que ele é: "conta", "rótulo" ou, no cartão, "cartão,
   fecha dia D, vence dia V"; e o meio cadastrado no próprio passo SHALL aparecer do mesmo jeito

**Independent Test**: na fixture de outubro, os três nomes de "Tipo" e as três entradas são
perguntados; na de novembro, só o nome e a entrada que aparecem pela primeira vez.

---

### P1: Conferir antes de gravar ⭐ MVP — IMP-05

**User Story**: Como quem importa, quero ver se o que o app leu bate com os totais da própria
planilha e o que vai acontecer com cada linha, para gravar sabendo o que estou gravando.

**Why P1**: É a única defesa antes de uma gravação que só se desfaz recomeçando.

**Acceptance Criteria**

1. WHEN a conferência é exibida THEN o sistema SHALL mostrar, para cada um dos quatro blocos, a
   quantidade de linhas lidas, a soma lida em centavos formatada e o total da planilha
2. WHEN a soma lida de um bloco é igual ao total da planilha para esse bloco THEN o sistema SHALL
   marcá-lo como conferido
3. IF a soma lida de um bloco diferir do total da planilha, ou o total não puder ser lido, THEN o
   sistema SHALL marcá-lo como divergente e exibir a diferença em reais
4. WHEN a conferência é exibida THEN o sistema SHALL comparar a soma das despesas lidas (Fixos,
   Cartão de Crédito e Gastos do Mês) com o `Total:` do bloco Saídas, com as mesmas marcações
5. WHEN um bloco é aberto THEN o sistema SHALL listar cada linha com seu destino: "novo", "já
   existe", "reajuste a partir de <mês>" com o valor anterior e o novo, "continua de <mês>",
   "continua de <mês>, com valor novo" com o valor anterior e o novo, "compra nova", "deixa de
   valer a partir de <mês>" ou "não aparece nesta aba"
6. WHEN há linhas não lidas THEN o sistema SHALL listá-las com o bloco, o nome e o motivo em pt-BR
7. WHILE houver bloco ou conferência de Saídas divergente o sistema SHALL manter o botão de importar
   desabilitado até a pessoa marcar "Entendi a diferença, importar mesmo assim"
8. IF a gravação chegar ao servidor com divergência e sem essa confirmação THEN o sistema SHALL
   recusar com `IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA`, sem gravar nada
9. WHEN a conferência é exibida THEN o sistema SHALL rotular o botão "Importar N lançamentos", em que
   N é a quantidade de linhas lidas que criam ou alteram algo

**Independent Test**: a fixture com o total do Gastos do Mês cobrindo só as primeiras linhas mostra
esse bloco divergente com a diferença exata, a conferência de Saídas conferida, e o botão
desabilitado até a confirmação.

---

### P1: Gravar tudo ou nada ⭐ MVP — IMP-06

**User Story**: Como quem importa, quero que a importação de uma aba grave por inteiro ou não grave
nada, para nunca ficar com meio mês no banco.

**Why P1**: Um mês pela metade não é detectável depois, e a correção seria recomeçar tudo.

**Acceptance Criteria**

1. WHEN a importação de uma aba é gravada THEN o sistema SHALL gravar numa única transação as
   categorias, recorrências, versões, encerramentos, compras, parcelas, avulsos, o registro da
   importação e as decisões lembradas
2. IF qualquer escrita da transação falhar THEN o sistema SHALL desfazer todas as escritas dela, sem
   deixar registro de importação para a competência
3. WHEN a gravação termina THEN o sistema SHALL revalidar as rotas da competência importada, de modo
   que painel, lista e "Todo mês" mostrem o conteúdo sem recarga manual
4. IF a requisição chegar sem sessão válida THEN o sistema SHALL recusá-la com o código de erro de
   sessão, antes de qualquer acesso ao banco
5. IF ocorrer falha não prevista THEN o sistema SHALL devolver `ERRO_INESPERADO` com um identificador
   de correlação, e SHALL não expor stack trace ao navegador
6. WHEN o servidor recebe a gravação THEN o sistema SHALL revalidar o payload com Zod e reler o
   conteúdo do arquivo, sem confiar na prévia calculada no navegador

**Independent Test**: uma falha injetada na gravação da última parcela deixa o banco exatamente como
estava antes, sem registro de importação.

---

### P1: Importar a aba seguinte sem duplicar ⭐ MVP — IMP-07

**User Story**: Como quem importa, quero que novembro e dezembro reconheçam os fixos e as compras que
vieram de outubro, para que cada coisa exista uma vez e com o valor do mês certo.

**Why P1**: Três abas com os mesmos fixos e as mesmas compras são o caso real.

**Acceptance Criteria**

1. WHEN uma linha de Fixos da competência M tem nome normalizado e meio iguais aos de uma
   recorrência de despesa vigente em M − 1 THEN o sistema SHALL tratá-la como reconhecida
2. WHEN uma entrada fixa da competência M tem nome normalizado igual ao de uma recorrência de receita
   vigente em M − 1 THEN o sistema SHALL tratá-la como reconhecida
3. WHEN a recorrência reconhecida tem em M o mesmo valor da linha THEN o sistema SHALL não alterá-la
4. WHEN a recorrência reconhecida tem em M valor diferente do da linha THEN o sistema SHALL registrar
   uma nova vigência desde M com o valor da linha, pelo caso de uso `registrar-versao`
5. WHEN uma recorrência vigente em M − 1 não é reconhecida por nenhuma linha da aba M THEN o sistema
   SHALL encerrá-la a partir de M, pelo caso de uso `encerrar`
6. WHEN uma linha reconhecida tem valor ilegível THEN o sistema SHALL mantê-la presente, com o valor
   vigente, e SHALL listar a linha como não lida
7. WHEN uma linha `n/t` da competência M tem nome normalizado, meio e `t` iguais aos de uma compra
   parcelada que tem a parcela `n` na competência M THEN o sistema SHALL tratá-la como reconhecida e
   SHALL não criar compra nova
8. WHEN a diferença entre o valor da linha e o da parcela `n` passa de 100 centavos THEN o sistema
   SHALL não reconhecer essa compra para essa linha
9. WHEN mais de uma compra atende ao reconhecimento de uma linha THEN o sistema SHALL escolher a de
   valor mais próximo, e cada compra SHALL ser reconhecida por no máximo uma linha da aba
10. WHEN a compra reconhecida tem a parcela `n` com valor diferente do da linha THEN o sistema SHALL
    gravar o valor da linha nas parcelas de `n` a `t` e SHALL gravar como total da compra o valor
    amortizado anterior somado às parcelas gravadas
11. WHEN uma compra tem a parcela de número k na competência M e nenhuma linha da aba M a reconhece
    THEN o sistema SHALL mantê-la sem alteração e SHALL listá-la como "não aparece nesta aba"
12. WHEN duas linhas da mesma aba têm o mesmo nome e meio THEN o sistema SHALL pareá-las, na ordem
    de aparição, com as recorrências reconhecíveis tomadas em ordem de `competencia_inicio` e, no
    empate, de `id`, e SHALL tratar as excedentes como novas

**Independent Test**: importar as fixtures de outubro, novembro e dezembro em sequência e encontrar
cada compra uma vez, a parcela de dezembro com o valor de dezembro, o fixo que mudou com duas
vigências, e o que sumiu encerrado a partir do mês em que sumiu.

---

### P1: Abrir a importação pela Visão geral ⭐ MVP — IMP-08

**User Story**: Como quem importa, quero um botão na Visão geral que abra um diálogo com arrastar e
soltar, para importar sem procurar onde fica.

**Why P1**: Sem entrada na tela, a importação não existe para quem usa.

**Acceptance Criteria**

1. WHEN a Visão geral é exibida THEN o sistema SHALL mostrar o botão "Importar planilha" no topo da
   área
2. WHEN o botão é acionado THEN o sistema SHALL abrir um `<dialog>` nativo, no padrão do
   `DialogoDeCadastro`
3. WHEN o diálogo está no passo 1 THEN o sistema SHALL aceitar o arquivo por arrastar e soltar sobre
   a área indicada e por um seletor de arquivo restrito a `.csv`
4. WHEN o arquivo é lido THEN o sistema SHALL exibir o nome do arquivo e "4 blocos encontrados"
5. WHEN o diálogo está no passo 1 THEN o sistema SHALL exibir "Tudo entra em nome de <nome de quem
   está logado>"
6. WHEN a importação termina THEN o sistema SHALL exibir as quantidades criadas e alteradas, um link
   para abrir a competência importada e "Próximo: <competência seguinte por extenso>"
7. WHEN a área de arrastar recebe o arquivo pelo teclado (seletor acionado por `Enter` ou espaço)
   THEN o sistema SHALL ter o mesmo efeito que arrastar
8. IF o servidor recusar a gravação THEN o sistema SHALL exibir a mensagem pt-BR do código dentro do
   diálogo, sem fechá-lo
9. WHILE a conferência está na tela o sistema SHALL não exibir o aviso "Lendo a aba no servidor…",
   que pertence aos passos de leitura
10. WHILE a gravação está em andamento o sistema SHALL manter o botão de importar desabilitado, com o
    rótulo "Importando…"

**Independent Test**: em e2e, entrar como Pessoa A, abrir a Visão geral, importar a fixture de
outubro e ver o painel de outubro com as receitas e despesas da fixture.

---

### P2: Recomeçar do zero — IMP-09

**User Story**: Como dono do repositório, quero um script de limpeza documentado, para recomeçar as
três importações se algo sair errado.

**Why P2**: É a correção escolhida, mas só é usado se algo der errado.

**Acceptance Criteria**

1. WHEN o script de limpeza é executado THEN o sistema SHALL esvaziar `movimento`,
   `compra_parcelada`, `recorrencia_versao`, `recorrencia`, o registro de importações e as decisões
   lembradas
2. WHEN o script de limpeza é executado THEN o sistema SHALL preservar `usuario`, `meio_pagamento`,
   `categoria`, `fatura`, `pagamento_fatura` e `orcamento_categoria`
3. WHEN o script termina THEN a primeira importação seguinte SHALL ser aceita para qualquer mês

**Independent Test**: depois de importar duas fixtures, executar o script e importar de novo a de
outubro com sucesso.

---

## Edge Cases

- IF o arquivo tiver um caractere solto fora dos blocos, como em A1, THEN o sistema SHALL ignorá-lo
- IF um nome contiver vírgula entre aspas THEN o sistema SHALL lê-lo inteiro, com a vírgula
- IF duas categorias diferirem só em caixa THEN o sistema SHALL tratá-las como uma
- IF uma compra parcelada tiver como "Tipo" uma conta THEN o sistema SHALL criá-la com esse meio, e
  ela SHALL aparecer no bloco que AD-012 define para meio sem fatura
- IF a aba tiver uma entrada com valor `200*` THEN o sistema SHALL listá-la como não lida com
  `VALOR_INVALIDO`, e a conferência das Entradas SHALL bater quando a planilha também não a somar
- WHEN o total do Gastos do Mês da planilha cobre só parte das linhas THEN o sistema SHALL marcar o
  bloco como divergente e a conferência de Saídas SHALL bater quando Saídas incluir todas

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IMP-01 | P1: Ler a aba exportada | Execute | Verified (`validation.md`, 2026-10-26): AC 2 (T1); ACs 9, 10, 11, 13 e 18 na célula (T2); ACs 3 a 12 e 14 a 17 na aba (T3); AC 1 na extensão e no tamanho do payload (T16); mensagem do AC 3 nomeando o bloco, na action (T19); ACs 1 e 3 no navegador, antes de qualquer prévia (T21); correção da rodada 1: AC 11 no próprio limite, com `1/120` e `120/120` aceitos e `1/121` recusado (F2); AC 1 reescrito com as duas linhas de defesa, o diálogo medindo em bytes e o servidor em caracteres, cada unidade provada por um caso que as distingue (F7) |
| IMP-02 | P1: Decidir o mês da aba | Execute | Verified (`validation.md`, 2026-10-26): ACs 1 e 2 no nome do arquivo (T4); registro de importação, um por competência, base dos ACs 4, 5 e 7 (T11); última competência, guarda do AC 6 e importações concorrentes serializadas pela trava do AC 7 (T14); guarda de ordem e de banco vazio na prévia, ACs 4 a 6 (T17); AC 5 com a competência esperada por extenso e AC 7 com duas gravações simultâneas contra Postgres, nas actions (T19); ACs 1 a 4 no passo do arquivo, com o mês e o ano por extenso (T21); Independent Test de ponta a ponta, com dezembro recusado depois de outubro (T26); correção da rodada 1: AC 1 no próprio limite, com 2000 e 2099 aceitos e 2100 sem seleção (F2) |
| IMP-03 | P1: Transformar cada linha no que ela é | Execute | Verified (`validation.md`, 2026-10-26): ACs 2 a 5 e 7 a 12 no plano (T9); AC 8 na origem do avulso e AC 9 nas categorias com as arquivadas, no banco (T13); ACs 1 a 12 executados pelos casos de uso existentes na gravação, sobre os fakes (T18); correção da rodada 1: AC 10 com a primeira e a última ocorrência de grafias diferentes e a tabela sem nenhuma das duas (F1) |
| IMP-04 | P1: Resolver o que o app não sabe | Execute | Verified (`validation.md`, 2026-10-26): ACs 1, 3 e 5 e as decisões a lembrar do AC 4 no plano (T9); tabela das decisões lembradas, uma por tipo e nome (T11); port e fake das decisões lembradas, com upsert (T12); upsert das decisões no banco, AC 4 (T14); decisões lembradas somadas às do passo 2 na prévia, AC 5 (T17); recusa da pendência aberta, AC 7, e decisões gravadas com o registro, AC 4 (T18); cadastro de meio extraído com o nome pré-preenchido, base do AC 2 (T20); passo "O que precisa de você" com os ACs 1 a 3 na tela (T22); AC 6 no diálogo, que pula o passo 2 sem pendência e pede a prévia de novo com as decisões (T24); Independent Test de ponta a ponta, com o Cartão Azul cadastrado no passo 2 (T26); correção da rodada 1: AC 3 na composição da página, com o "Cai em" de ponta a ponta oferecendo Conta Corrente e não o Cartão Roxo (F4); AC 8, o aviso do que falta no passo 2, pedido do dono no teste em localhost (F13); implementado, a verificar: AC 9, o que cada meio é junto do nome, com os meios da página e o cadastrado no passo, pedido do dono depois da importação em produção (F14) |
| IMP-05 | P1: Conferir antes de gravar | Execute | Verified (`validation.md`, 2026-10-26): ACs 1 a 4 na conferência (T5); destinos do AC 5 e contagem do AC 9 no plano (T9); prévia no servidor com conferência, destinos e contagem, sem gravar (T17); recusa da divergência sem confirmação, AC 8 (T18); AC 8 na action, contra Postgres (T19); conferência por bloco e de Saídas, destinos, não lidas, confirmação e rótulo do botão na tela, ACs 1 a 7 e 9 (T23); divergência de outubro confirmada e novembro sem confirmação, de ponta a ponta (T26); o rótulo do AC 9 não passa por "Importando…" enquanto só a prévia é lida (F8) |
| IMP-06 | P1: Gravar tudo ou nada | Execute | Verified (`validation.md`, 2026-10-26): repositórios sobre uma transação de fora, base dos ACs 1 e 2 (T10); port `TransacaoDaImportacao` e fakes (T12); transação com trava e os cinco repositórios, rollback do AC 2 (T14); schema do payload revalidado no servidor, AC 6 (T16); plano recalculado dentro da transação, AC 6, e recusa de caso de uso relançada para o rollback do AC 2 (T18); actions com sessão primeiro (AC 4), payload revalidado (AC 6), rollback de falha injetada na última escrita (AC 2), revalidação das três rotas (AC 3) e erro inesperado com referência (AC 5) (T19) |
| IMP-07 | P1: Importar a aba seguinte sem duplicar | Execute | Verified (`validation.md`, 2026-10-26): AC 10 na reprecificação (T6); ACs 1 a 6 e 12 no reconhecimento de recorrências (T7); ACs 7, 8, 9 e 11 no reconhecimento de compras (T8); reajuste, encerramento e reprecificação compostos no plano (T9); port e fake de `reprecificar` com a conservação (T12); `reprecificar` no banco, com a conservação conferida na transação (T13); reajuste, encerramento e reprecificação executados pelos casos de uso, ACs 4, 5 e 10 (T18); sequência outubro → novembro → dezembro até o estado final do design, contra Postgres (T19); reajuste e encerramento vistos em "Todo mês" de novembro, de ponta a ponta (T26); correção da rodada 1: AC 12 com a ordem das recorrências definida (`competencia_inicio`, depois `id`), entregue nessa ordem pelo estado e provada com duas vigentes de mesma chave (F3); AC 12 também no elo do plano, com homônimos em ordem nas duas pontas (F9); e nas receitas fixas homônimas, decisão do dono depois da rodada 3 (F12) |
| IMP-08 | P1: Abrir a importação pela Visão geral | Execute | Verified (`validation.md`, 2026-10-26): ACs 3, 4, 5 e 7 no passo do arquivo (T21); correção da rodada 1: AC 7 também com o seletor acionado por espaço (F6); AC 8 no passo da conferência (T23); ACs 2, 6 e 8 no diálogo e no resultado (T24); AC 1 com o botão ao lado do título da Visão geral, que passa quem está logado, a competência esperada e os meios (T25); Independent Test de ponta a ponta, com o painel de outubro (T26); correção da rodada 1: o Independent Test com as despesas de outubro no painel, além das receitas (F4); AC 9, o aviso de leitura fora da conferência, vigiado commit a commit (F10); AC 10, o botão travado durante a gravação, ligado no diálogo (F11) |
| IMP-09 | P2: Recomeçar do zero | Execute | Verified (`validation.md`, 2026-10-26): script de limpeza com os ACs 1 a 3 provados contra Postgres (T15); quando e como rodá-lo, no local e no Neon, em `docs/importacao.md` (T27); correção da rodada 1: o AC 2 nomeia também `fatura`, `pagamento_fatura` e `orcamento_categoria`, e o teste do script prova que as três ficam com as mesmas linhas (F5) |

**ID format:** `IMP-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Implemented → Verified

`Implemented` quer dizer que todas as tasks do requisito estão commitadas com o gate verde.
`Verified` é do Verifier independente, depois da última task, e nenhuma linha o recebe do autor.

**Coverage:** 9 total, 9 mapped to tasks (T1–T27), 0 unmapped

---

## Success Criteria

- [ ] As três abas reais importam em localhost em menos de dez minutos no total
- [ ] Depois das três, a contagem de compras parceladas no banco é igual à de compras distintas das
      três abas, e a de recorrências é igual à de fixos e entradas fixas distintos
- [ ] Em cada uma das três, a conferência de Saídas bate; a única divergência por bloco é a do Gastos
      do Mês de outubro, já conhecida
- [ ] O painel de dezembro mostra as mesmas despesas que o total de Saídas da aba de dezembro
- [ ] A mesma sequência, repetida em produção depois do script de limpeza, termina igual
