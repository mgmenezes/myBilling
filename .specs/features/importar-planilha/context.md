# Importar a planilha — contexto e decisões

> Documento de descoberta, 2026-10-24. É a base de `spec.md`, `design.md` e `tasks.md` desta fatia.
> O que o dono do repositório decidiu está marcado **(dono)**; o que ficou a cargo de quem escreveu
> este documento, **(autor)**; o resto está em "Deixado para quem constrói".
>
> **Nenhum dado real está aqui.** O formato foi observado em duas abas reais exportadas, lidas fora
> do repositório; só a estrutura e contagens agregadas foram registradas (AD-009).

---

## Por que existe

O myBilling substitui uma planilha do Google Sheets com uma aba por mês. Depois do deploy, o
primeiro cadastro feito à mão caiu inteiro no ano errado — janeiro de 2026 em vez de janeiro de
2027 — e copiar linha por linha é exatamente onde esse tipo de erro entra.

O plano do dono: importar as abas de **outubro, novembro e dezembro de 2026**, nessa ordem, e dali
em diante lançar só no app. A planilha será aposentada quando o app tiver tudo o que ela faz. A
importação é **ferramenta de largada**, para agilizar o preenchimento agora — não uma ponte
permanente entre os dois (dono).

## Objetivos

1. A partir do CSV de uma aba mensal, criar de uma vez: categorias, gastos fixos, receitas fixas,
   compras parceladas em andamento e lançamentos avulsos (despesas e receitas) daquele mês.
2. Importar três abas consecutivas sem duplicar o que se repete entre elas (fixos e parcelados).
3. Nunca gravar no mês ou no ano errado sem a pessoa ter visto e confirmado.
4. Mostrar, antes de gravar, o que vai acontecer com cada linha e se os totais batem com os da
   própria planilha.

## Não-objetivos

- **Orçamento.** A tabela "Gastos do mês por categoria" tem "Valor esperado", que é o orçamento por
  categoria; ele não tem tela no app e vem na fatia seguinte. Os valores dela são ignorados.
- Os blocos de resumo: Saídas, Gastos por tipo de pagamento, Investimentos, Saldo, Total de gastos.
  São contas que a planilha faz e o app refaz. (Saídas ainda serve de conferência — ver adiante.)
- A coluna **"Pago?"** (dono): tudo entra como previsto, e o pagamento se marca no app pelo selo de
  situação que já existe.
- As **datas** do bloco Gastos do Mês (dono: estão erradas na planilha).
- Sincronização contínua, outros formatos (extrato de banco, `.xlsx`), edição de linha dentro da
  prévia.
- Desfazer uma importação gravada (dono: a correção é recomeçar — ver adiante).

## Anti-objetivos — o que faria a fatia falhar mesmo funcionando

- Gravar numa competência que a pessoa não confirmou.
- Duplicar um gasto fixo ou uma compra parcelada ao importar a aba seguinte.
- Descartar uma linha em silêncio: toda linha que não vira lançamento aparece, com o motivo.
- Ponto flutuante em qualquer etapa do valor (AD-001).
- Qualquer dado real em fixture, teste, screenshot ou commit (AD-009).

---

## Pré-requisito: banco limpo antes da primeira importação

O banco de produção já tem o cadastro que caiu em 2026 por engano, incluindo **receitas fixas
iniciadas em janeiro de 2026**, que já se materializam em outubro. Importar outubro em cima delas
duplicaria os salários.

Decisão (dono): tudo que está lá é descartável. Antes da primeira importação, apagam-se
**lançamentos (`movimento`), compras parceladas, gastos e receitas fixos (`recorrencia`,
`recorrencia_versao`)**; ficam **usuários, meios de pagamento e categorias**, que a importação
reaproveita.

É uma alteração de banco de produção: quem executa é o dono, no SQL Editor do Neon, com
autorização explícita e separada. Recomenda-se criar antes um branch do Neon como cópia de
segurança. O script entra na documentação da fatia, sem nenhum dado, e também limpa o registro de
importações e as decisões lembradas.

A primeira importação **recusa** se ainda houver lançamento, compra ou gasto fixo no banco, dizendo
que a limpeza não foi feita (autor). É a garantia de que o pré-requisito não depende de memória: sem
ela, esquecer o script duplicaria os salários em silêncio.

## Como se corrige uma importação errada

**Recomeçando** (dono). As três abas são importadas **de uma vez, antes de qualquer lançamento
feito à mão no app**. Se algo sair errado — um "Tipo" ligado ao meio errado, uma entrada
classificada errado —, roda-se de novo o script de limpeza e reimportam-se as três abas, o que leva
minutos.

Consequências para quem constrói:

- **Não há** "desfazer importação" nem tela para rever decisões lembradas.
- Linhas criadas não precisam registrar de qual importação vieram, além do que `origem_dado` e
  `origem_hash` já registram.
- Lançamento manual intercalado entre as importações está **fora do desenho**: nenhuma regra trata
  avulso feito à mão no mês de destino, fixo criado à mão entrando no reconhecimento, ou ocorrência
  já marcada como paga recebendo valor de outra aba.

---

## O arquivo

### Origem e nome

Google Sheets → Arquivo → Fazer download → CSV, que exporta **a aba aberta**. O nome sai como
`<título da planilha> - <nome da aba>.csv`, por exemplo `Planilha Financeira 2026 - Outubro.csv`.
UTF-8, separado por vírgula, aspas em campo que contém vírgula.

**O ano não está no conteúdo da aba** — a célula de título diz só o nome do mês. Ele está no título
da planilha, no nome do arquivo. O mês vem do nome da aba (nome do mês em português) e o ano do
número de quatro dígitos do título; os dois só **pré-preenchem** o diálogo, que exige confirmação.

### Layout

A aba é uma grade com **blocos lado a lado nas mesmas linhas**. A quantidade de linhas muda todo
mês, então cada bloco é localizado pela **célula de título** e pela linha de cabeçalho logo abaixo,
nunca por número de linha. Nas duas abas observadas as colunas foram as mesmas; ainda assim, a
coluna de cada campo é derivada da posição do título, não fixada.

| Bloco | Título | Cabeçalho | Campos usados (colunas observadas) | Onde termina |
| --- | --- | --- | --- | --- |
| Fixos | `Fixos` (C) | linha seguinte: Nome, —, Pago?, Data, Tipo, Categoria, Valor | Nome C · Tipo G · Categoria H · Valor I | na linha cuja coluna C é `Total de Cartão de Crédito` |
| Cartão de Crédito | `Cartão de Crédito` (C), **abaixo** dos Fixos | Nome, Parcelas, —, Data, Tipo, Categoria, Valor | Nome C · Parcelas D (`n/t`) · Tipo G · Categoria H · Valor I | fim do arquivo |
| Gastos do Mês | `Gastos do Mês ` (K) — **com espaço no fim** | Nome, Data, Tipo, Categoria, Valor | Nome K · Tipo M · Categoria N · Valor O | fim do arquivo |
| Entradas | `Entradas` (Q) | **não tem** — as linhas começam logo abaixo do título | Nome Q · Valor R | na linha cuja coluna Q é `Total:` |

Totais que a conferência usa:

| Total | Onde está | Cobre |
| --- | --- | --- |
| `Total de Fixos:` | rótulo em C, valor em G, acima dos blocos | Fixos |
| `Total de Cartão de Crédito` | rótulo em C, valor em G, **na linha logo após o último fixo** | Cartão de Crédito |
| `Total de Gastos do Mês:` | rótulo em K, valor em N, acima dos blocos | Gastos do Mês |
| `Total:` das Entradas | rótulo em Q, valor em R, fim do bloco Entradas | Entradas |
| `Total:` das Saídas | rótulo em Q, valor em R, fim do bloco `Saídas` (logo abaixo das Entradas) | **todas as despesas da aba**: fixos + cartão + gastos do mês |

Tudo fora dos quatro blocos é ignorado — a linha 2 (total de gastos, nome do mês, saldo), "Gastos
por tipo de pagamento", "Saídas" (exceto o total) e "Investimentos" —, com uma exceção: dos
**nomes** da tabela de categorias saem categorias (ver "Como cada linha vira coisa do app").

| Tabela | Título | Cabeçalho | Campo usado | Onde termina |
| --- | --- | --- | --- | --- |
| Gastos do mês por categoria | `Gastos do mês por categoria:` (T), na linha 2 | linha seguinte: Categoria, Valor esperado, Valor gasto, Porcentagem (T a W) | só o nome, em T | na linha cuja coluna T é `Gastos por tipo de pagamento`, ou no fim do arquivo |

A tabela divide as linhas com os blocos, tem **linhas vazias no meio** (que não a encerram) e às
vezes um valor solto na coluna X, ao lado da porcentagem. Ela é **opcional**: se não for
encontrada, o arquivo não é recusado; só não há categorias extras a criar (autor).

### Peculiaridades observadas — todas precisam estar na fixture sintética

1. Conteúdo solto fora dos blocos, como um caractere isolado em A1.
2. Título com espaço no fim (`Gastos do Mês `).
3. Nome com vírgula, entre aspas.
4. Valor como texto `R$ 1.234,56`. Tira-se `R$` e espaços (inclusive o não separável) e o resto vai
   para `parseBRL` (`src/domain/shared/money.ts`), que já converte sem passar por float.
5. Linha de fixo com a célula de valor vazia.
6. Valor que não é dinheiro numa entrada, como `200*`. A própria planilha não o soma.
7. Linha do Gastos do Mês sem nome e sem valor, mas com um "Tipo" residual de lista suspensa:
   é linha vazia, ignorada sem aviso.
8. Categorias que diferem só em caixa (`MERCADO` e `Mercado`).
9. **Total de bloco que não cobre o bloco inteiro.** Numa aba real, o "Total de Gastos do Mês"
   somava só as primeiras linhas — a fórmula parou antes do fim da lista. O total de Saídas incluía
   todas, e a diferença entre os dois era exatamente o que ficou fora. A conferência por bloco
   falha; a de Saídas passa.
10. Coluna "Pago?" com `TRUE`/`FALSE` (ignorada).
11. Datas no Gastos do Mês, algumas de meses anteriores (ignoradas).
12. Compra parcelada paga em conta, não em cartão (o "Tipo" é a conta).
13. Mesmo nome em linhas diferentes da mesma aba, distinguidas pelo meio ou pelo valor.

---

## Como cada linha vira coisa do app

Valem para todas:

- **Competência**: a confirmada no diálogo. A data do lançamento, que o banco exige, é o **dia 1**
  dessa competência (autor).
- **Pessoa (`usuario_id`)**: quem está importando (dono — atalho assumido para agora; AD-007 já diz
  que o campo é classificação, não permissão).
- **Situação**: tudo entra previsto (dono).
- **Categoria**: reaproveitada sem diferenciar caixa e reativada se estiver arquivada — a regra que
  `criarCategoria` já aplica — ou criada. Também são criadas as categorias listadas na tabela de
  "Valor esperado" que não apareceram em nenhuma linha, para que existam nos meses seguintes e na
  fatia de orçamento; os valores dela continuam ignorados (autor).
- **Meio de pagamento**: o nome da coluna "Tipo" é ligado a um meio do app no passo 2 do diálogo.

| Linha | Vira | Detalhe |
| --- | --- | --- |
| Fixo | gasto fixo (`recorrencia`, despesa) a partir da competência | valor da linha como valor previsto; meio e categoria da linha |
| Entrada marcada como **fixa** | receita fixa (`recorrencia`, receita) | sem categoria; meio é a conta escolhida em "cai em" — só contas, como já é na tela (AD-015) |
| Entrada marcada como **avulsa** | receita avulsa (`movimento`) | idem |
| Cartão de Crédito `n/t` | compra parcelada **em andamento**, parcelas de `n` a `t` | modo "valor da parcela" e `parcelaInicial = n`, pelo caso de uso que já existe; nada é criado antes de `n` (AD-005). Se o "Tipo" for uma conta, a compra cai no bloco que AD-012 já define |
| Gastos do Mês | despesa avulsa (`movimento`) | competência da aba, meio e categoria da linha |

Linha que não vira lançamento — valor vazio, valor que não é dinheiro, parcela fora do formato
`n/t` — aparece na conferência com o motivo.

---

## Três abas em sequência

**A ordem é obrigatória** (autor, aprovado): a primeira importação aceita qualquer mês; as
seguintes, só o mês imediatamente posterior ao último importado. Reajuste e reconhecimento dependem
do mês anterior.

**Fixos e receitas fixas** são reconhecidos por **nome (sem caixa, sem espaços nas pontas) + meio
de pagamento** — o nome sozinho não basta, porque a planilha tem fixos homônimos em cartões
diferentes.

- Reconhecido, mesmo valor: nada muda.
- Reconhecido, valor diferente: **nova vigência a partir da competência**, com o mecanismo de
  versionamento que a área "Todo mês" já usa (`registrar-versao`). Cada mês fica com o valor da sua
  aba, e os meses posteriores herdam o da última.
- Existia na aba anterior e não aparece nesta: **deixa de valer a partir desta competência**, pelo
  caso de uso `encerrar`, que já faz a tradução para "última competência em que vale".
- Existia na aba anterior e aparece nesta **com valor ilegível** (célula vazia ou texto que não é
  dinheiro): conta como **presente**, mantém o valor vigente e a conferência aponta a linha (autor).
  Encerrar por causa de uma célula vazia apagaria as ocorrências futuras de um gasto real, e a
  prévia não permite corrigir a linha.
- Não reconhecido: novo.

**Compras parceladas** são reconhecidas pela **sequência**: mesmo nome (sem caixa), mesmo meio,
mesma quantidade total de parcelas, e número da parcela igual ao da aba anterior somado à distância
em meses.

- O valor da parcela **pode variar alguns centavos** entre meses para a mesma compra. O
  reconhecimento tolera até **R$ 1,00** de diferença (autor; o maior desvio observado foi de 4
  centavos) e, havendo mais de um candidato, fica com o de valor mais próximo.
- Quando o valor diverge, **vale o da aba mais nova** (dono, aprovado: é o que a fatura cobra) —
  **para aquela parcela e para as seguintes** (autor), a mesma lógica dos fixos: o mês mais recente
  é a melhor previsão dos próximos. O total da compra se ajusta para manter a conservação da soma —
  total = amortizado anterior + soma das parcelas. Isso **não** é o que `regenerarParcelas` faz
  (ela redistribui o saldo entre as pendentes); é operação nova de domínio e de repositório.
- Não reconhecida: compra nova, começando em `n`.

**Avulsos** não se repetem: cada aba traz os seus.

**Decisões lembradas.** Ligação de "Tipo" a meio e classificação de entrada (fixa ou avulsa, e onde
cai) valem para as abas seguintes; o diálogo não pergunta de novo o que já foi decidido.

**Validado contra os dados reais** (outubro → dezembro, sem novembro no meio, deslocamento de dois
meses): das compras parceladas de dezembro, todas menos uma foram reconhecidas pela sequência — 50
com valor idêntico, 3 com até 4 centavos de diferença —, a restante começou depois de outubro, e
nenhuma compra de outubro que deveria continuar sumiu. Nos fixos, 24 apareceram nas duas abas (4 com
valor diferente) e 1 só em outubro; a chave nome + meio não repetiu dentro de nenhuma aba.

---

## O diálogo (fluxo aprovado: passo a passo que pula o que não tem pendência)

Entrada: botão **"Importar planilha"** na Visão geral, que abre um `<dialog>` nativo, no mesmo
padrão do cadastro de lançamentos (AD-014).

**① Arquivo e mês**

- Área de arrastar e soltar, ou escolher arquivo `.csv` no computador.
- Confirmação do arquivo lido e de quantos blocos foram encontrados. Arquivo sem os quatro blocos é
  recusado, dizendo qual título faltou.
- Mês e ano em dois seletores, **pré-preenchidos pelo nome do arquivo**, com o aviso "confira o
  ano". A competência é sempre exibida por extenso.
- "Próximo mês esperado: …" quando já houve importação.
- "Tudo entra em nome de <pessoa logada>".

**② O que precisa de você** — só aparece se houver algo a decidir:

- Nomes da coluna "Tipo" que ainda não estão ligados a um meio: escolher um meio existente ou
  cadastrar ali mesmo. Cartão exige os dias de fechamento e vencimento; o padrão "criar sem sair do
  formulário" (`CadastroInline`) já faz isso.
- Entradas ainda não classificadas: fixa ou avulsa, e em qual conta o dinheiro cai.

**③ Conferência**

- Por bloco: quantidade de linhas, soma lida e ✓/✗ contra o total da própria planilha.
- **Segunda conferência**: soma de todas as despesas lidas contra o `Total:` de Saídas (autor,
  aprovado). É o que distingue "a planilha somou errado" de "o importador leu errado".
- Cada bloco abre para mostrar as linhas e o destino de cada uma: novo, já existe, reajuste a partir
  deste mês, continua do mês anterior, compra nova, deixa de valer.
- Linhas não lidas, com o motivo.
- Com qualquer ✗, o botão fica bloqueado até a pessoa marcar "Entendi a diferença, importar mesmo
  assim".
- Botão "Importar N lançamentos". A gravação de uma aba é **tudo ou nada**.

**Depois de importar**: as contagens do que foi criado, atalho para abrir o mês importado e
"Próximo: <mês>".

---

## Validação antes da produção

O dono testa primeiro **em localhost**: as três abas reais contra o Postgres local (`pnpm db:up`),
com o mesmo fluxo de limpeza e importação. Só depois a importação é feita em produção. Os arquivos
reais ficam fora do repositório nos dois casos.

## Restrições do projeto que valem aqui

- AD-001: valores em centavos inteiros; `parseBRL` já existe.
- AD-002: competência como `'YYYY-MM'`; nome do mês para competência por aritmética inteira, sem `Date`.
- AD-003: só `movimento` é somável; compra e recorrência continuam planos de geração.
- AD-005: compra em andamento persiste só da parcela inicial em diante.
- AD-006: leitura da grade, localização dos blocos, conversão de linhas e reconhecimento entre abas
  são lógica pura — cabem em `src/domain`, com `Result`, sem exceção e sem `async`.
- AD-007: a pessoa do lançamento é quem importa.
- AD-009: fixture sintética com o mesmo layout e as treze peculiaridades acima; nada real.
- AD-010: integração contra Postgres real.
- AD-012 e AD-015: blocos por meio; receita só em conta.
- Server Action com `requireSession()` na primeira instrução e payload revalidado com Zod
  (`AGENTS.md`).
- `movimento.origem_dado` e `origem_hash` existem desde o MVP para isto, com índice único que
  ignora lançamentos manuais.
- Volume: uma aba tem por volta de 200 linhas. Desempenho não é preocupação.

## Deixado para quem constrói

- Onde o texto do arquivo é lido e interpretado (navegador ou servidor), respeitando que o servidor
  revalida o que recebe.
- Como registrar as importações feitas (para a ordem e o "próximo mês esperado") e as decisões
  lembradas — provavelmente tabelas novas, com migration.
- O valor de `origem_dado` e a composição de `origem_hash`.
- O dia de vencimento das recorrências criadas pela importação, que o banco exige e a planilha não
  tem.
- Como tratar chave repetida dentro da mesma aba (não observado nos dados reais).
- O que mostrar quando uma compra que deveria continuar não aparece na aba seguinte (não observado);
  o padrão é mantê-la e apontar na conferência.

## Decisões do autor, para o dono conferir

1. Data do lançamento importado: dia 1 da competência.
2. Categorias da tabela de "Valor esperado" sem nenhuma linha no mês também são criadas.
3. Tolerância de R$ 1,00 no reconhecimento de parcela.
4. Arquivo sem algum dos quatro blocos é recusado inteiro; a tabela de categorias é opcional.
5. Fixo já reconhecido que aparece com valor ilegível conta como presente e mantém o valor vigente.
6. Parcela com valor divergente: o valor novo vale daquele mês em diante, não só naquele mês.
7. A primeira importação recusa se o banco ainda tiver lançamento, compra ou gasto fixo.
