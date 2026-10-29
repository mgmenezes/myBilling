# Importar a planilha

Roteiro para levar as abas de **outubro, novembro e dezembro de 2026** da planilha para o app. Cada
passo é uma ação, e cada regra traz a razão junto.

É ferramenta de largada. As três abas entram de uma vez, **antes de qualquer lançamento feito à
mão**, e dali em diante tudo se lança no app. Lançamento manual entre uma importação e outra está
fora do desenho: nenhuma regra o trata.

**Nenhum arquivo da planilha entra neste repositório** (AD-009). Os CSVs ficam fora dele, em
`~/Downloads` ou onde você quiser, e nada deles vai para commit, issue, print ou log colado.

> [!NOTE]
> **O terminal do `pnpm dev` não imprime o conteúdo do arquivo.** Por padrão, o Next registra em
> desenvolvimento cada chamada de Server Action com os argumentos — e o argumento da prévia e da
> gravação é o texto inteiro da aba. O `next.config.ts` desliga esse registro
> (`logging.serverFunctions: false`). Se um dia ele for religado, o texto da aba real volta a
> aparecer no terminal. Em produção, na Vercel, esse registro não existe.

---

## O que já está pronto

- **O botão "Importar planilha"** fica na Visão geral, ao lado do nome do mês.
- **A leitura** acontece no navegador, para dizer na hora se o arquivo serve. O servidor lê o
  arquivo de novo na prévia e na gravação, e não confia no que o navegador concluiu.
- **A gravação de uma aba é tudo ou nada.** Se qualquer escrita falha, nada daquela aba fica no
  banco.
- **Tudo entra em nome de quem está logado.** Quem importa é a pessoa de todos os lançamentos. O
  diálogo diz isso no primeiro passo.
- **A tabela do registro de importação** vem na migration `0003_registro_de_importacao.sql`. Ela
  precisa estar aplicada no banco antes da primeira importação: no local, `pnpm db:migrate`; no
  Neon, pelo job `migrate` do CI depois do push, ou pelo `pnpm db:sql` no SQL Editor, como em
  `docs/deploy.md`.

---

## Passo 1 — Baixar cada aba em CSV

No Google Sheets, abra a aba do mês e use **Arquivo → Fazer download → Valores separados por
vírgula (.csv)**. O download traz só a aba aberta, então são três downloads.

**Não renomeie o arquivo.** Ele sai como `<título da planilha> - <nome da aba>.csv`, e é daí que o
app pré-seleciona o mês (pelo nome da aba) e o ano (pelo último ano de quatro dígitos no título). O
` (1)` que o navegador acrescenta a um download repetido é ignorado.

**Não abra o CSV no Excel e salve.** O Excel salva de novo com ponto e vírgula, e o app recusa o
arquivo dizendo que ele não parece uma aba exportada. Se aconteceu, baixe de novo do Google Sheets.

---

## Passo 2 — Testar primeiro em localhost

A primeira passada é contra o Postgres local. Ela é a prova de que as três abas reais importam
sem surpresa antes de tocar o banco de produção.

```bash
pnpm db:up
pnpm db:migrate
docker exec -i mybilling-db psql -U mybilling -d mybilling \
  < src/infrastructure/db/sql/limpar-para-importar.sql
pnpm dev
```

O script de limpeza entra aqui porque o banco local quase sempre tem o seed, e **a primeira
importação recusa um banco que já tem lançamento, compra parcelada ou gasto fixo**: "Já existem
lançamentos no app. Rode o script de limpeza antes da primeira importação." Sem essa guarda,
esquecer a limpeza duplicaria os salários em silêncio.

Entre em `http://localhost:3000` pelo Google, como de costume, e importe as três abas como no passo
3. Confira o painel e a lista de cada mês. Se algo sair errado, rode o script de novo e recomece
(ver "Recomeçar").

---

## Passo 3 — As três abas, em sequência

**Outubro, depois novembro, depois dezembro.** A primeira importação aceita qualquer mês; as
seguintes, só o mês seguinte ao último importado. Fora de ordem, o app recusa dizendo qual é o
esperado: "As abas entram em sequência. A próxima é Novembro de 2026." A ordem é obrigatória
porque o reajuste e o reconhecimento de cada aba comparam com a aba anterior.

Cada importação tem até quatro telas:

1. **Arquivo e mês.** Arraste o CSV para a área ou use "Escolher arquivo". O app mostra o nome do
   arquivo e "4 blocos encontrados". Confira o mês e o ano por extenso: **o ano vem do título da
   planilha**, e uma planilha que atravessa a virada do ano traz o ano do título, não o da aba. Foi
   esse erro que motivou a importação.
2. **O que precisa de você.** Só aparece quando há algo a decidir. Cada nome da coluna "Tipo"
   precisa de um meio de pagamento do app: escolha um que já existe ou use "+ cadastrar", que abre
   o cadastro com o nome preenchido e pede os dias de fechamento e vencimento quando é cartão. Cada
   opção diz o que o meio é: "conta", "rótulo" ou "cartão, fecha dia 25, vence dia 5". Cada
   entrada pede "fixa" ou "avulsa" e a conta em que o dinheiro cai. A conta das entradas se cria
   em "+ nova conta", na própria seção Entradas, e não pelo "+ cadastrar" de um Tipo, que liga o
   meio criado àquele Tipo. "Aplicar a todas" põe a mesma conta em todas as entradas, e depois dá
   para trocar uma ou outra. **As decisões ficam lembradas**: novembro só pergunta o que aparece
   pela primeira vez.
3. **Conferência.** O que foi lido contra os totais da própria planilha, e o que vai acontecer com
   cada linha. Detalhes na seção seguinte.
4. **Resultado.** Quantos itens foram criados, alterados e encerrados, o link para abrir o mês
   importado e qual é o próximo. "Importar a próxima aba" volta ao primeiro passo.

O meio cadastrado no passo 2 é gravado na hora, fora da importação. Se você desistir no meio, ele
continua cadastrado. É inofensivo.

---

## O que cada marcação da conferência significa

### Por bloco

Cada um dos quatro blocos (Fixos, Cartão de Crédito, Gastos do Mês e Entradas) mostra quantas
linhas foram lidas, a soma do que o app leu ("Lido") e o total que a própria planilha calcula
("Planilha").

| Marcação | Significado |
| --- | --- |
| **Confere** | A soma lida é igual ao total da planilha |
| **Diverge em R$ X** | As duas somas diferem nesse valor |
| **Sem total na planilha** | O app não achou o total do bloco. Conta como divergência |

A última linha, **Saídas**, soma Fixos, Cartão de Crédito e Gastos do Mês lidos e compara com o
`Total:` do bloco Saídas da planilha. É a segunda opinião: o total de Saídas é calculado pela
planilha por outro caminho, e é ele que distingue "a planilha somou errado" de "o app leu errado".

### O destino de cada linha

Cada bloco abre para mostrar as linhas, com o valor e o destino.

| Destino | O que acontece |
| --- | --- |
| **novo** | Criado agora. Na primeira aba, tudo é novo |
| **já existe** | Fixo ou entrada fixa que veio da aba anterior com o mesmo nome, o mesmo meio e o mesmo valor. Nada muda |
| **reajuste a partir de \<mês\>: A → B** | O mesmo fixo com valor novo. Ganha uma vigência nova a partir deste mês; os meses anteriores ficam como estavam |
| **continua de \<mês\>** | Compra parcelada reconhecida pela sequência: mesmo nome, mesmo meio, mesma quantidade de parcelas e a parcela seguinte à da aba anterior |
| **continua de \<mês\>, com valor novo: A → B** | A mesma compra, com a parcela alguns centavos diferente. Vale o valor novo para esta parcela e as seguintes, e o total da compra se ajusta |
| **compra nova** | Compra parcelada que o app ainda não tinha. Se ela já está na parcela 7 de 10, entra da 7 em diante |

Abaixo dos blocos, quando houver:

| Lista | O que significa |
| --- | --- |
| **Deixa de valer a partir de \<mês\>** | Fixo ou entrada fixa que estava na aba anterior e não está nesta. É encerrado a partir deste mês; os meses anteriores ficam |
| **Não aparece nesta aba** | Compra de uma importação anterior que tinha parcela neste mês e não veio na aba. Continua como está, sem alteração |
| **Linhas não lidas** | Ficam fora da importação, com o bloco, o nome e o motivo: "sem valor", "valor zero", "valor não é dinheiro", "parcela fora do formato n/t" ou "sem nome". A correção é na planilha |

Uma exceção nas linhas não lidas: **um fixo que já existia e veio sem valor** conta como presente e
mantém o valor que tinha. Ele não é encerrado, porque encerrar por causa de uma célula vazia
apagaria os meses futuros de um gasto real.

O botão diz **"Importar N lançamentos"**, em que N é a quantidade de linhas que criam ou alteram
algo. "Já existe" e "continua", sem valor novo, não contam.

---

## Quando um total diverge

Com qualquer divergência, o botão fica desabilitado até você marcar **"Entendi a diferença,
importar mesmo assim"**. A marca só libera o botão: o app não corrige nada.

1. **Só um bloco diverge, e Saídas confere.** Quem errou foi o total daquele bloco na planilha. O
   app leu todas as linhas, e o total de Saídas, que a planilha calcula por outro caminho, concorda
   com ele. Pode marcar e importar.
2. **Saídas também diverge.** Olhe as linhas não lidas. Uma linha que a planilha soma e o app não
   consegue ler (um valor com texto, uma parcela como `12/10`) aparece ali com o motivo, e a
   diferença costuma ser exatamente o valor dela. Corrija a célula na planilha, baixe a aba de novo
   e recomece do passo 1. Também dá para importar sem ela, sabendo que aquela linha fica de fora.
3. **Nada explica a diferença.** Não importe. Feche o diálogo: a prévia não grava nada.

### O caso já conhecido

Numa das abas reais, o total do Gastos do Mês da própria planilha cobre só parte das linhas: a
fórmula do total não alcança as últimas linhas do bloco. A conferência marca esse bloco como
divergente, e a conferência de Saídas confere, porque o total de Saídas soma o bloco inteiro. É a
situação do item 1: pode marcar e importar.

---

## Recomeçar

**Não há "desfazer importação".** Se um "Tipo" foi ligado ao meio errado, ou uma entrada foi
classificada errado, a correção é recomeçar: rodar o script de limpeza e importar as três abas de
novo, o que leva minutos.

O script `src/infrastructure/db/sql/limpar-para-importar.sql`:

- **apaga** todos os lançamentos (inclusive os lançados à mão), as compras parceladas, os gastos e
  receitas fixos com o histórico de valor, o registro das abas importadas e as decisões lembradas;
- **preserva** pessoas, meios de pagamento e categorias, que a importação seguinte reaproveita;
- deixa a próxima importação ser de novo a primeira, que aceita qualquer mês.

Rode-o em dois momentos: **antes da primeira importação**, num banco que já tem lançamento, e
**para recomeçar** as três. Não rode depois que o app estiver em uso de verdade: ele apaga também
o que foi lançado à mão, e não há volta.

---

## Passo 4 — Em produção, no Neon

**Só o dono do repositório, com autorização explícita.** É alteração de banco de produção, e nenhum
agente a executa.

1. **Confirme que a migration 0003 está aplicada no Neon.** Ela sobe com o push, pelo job `migrate`
   do CI. Sem acesso pela 5432, o caminho é o `pnpm db:sql` colado no SQL Editor, como em
   `docs/deploy.md`.
2. **Crie um branch do Neon como cópia de segurança**: Branches → New branch, a partir de
   `production`. É o que permite voltar ao banco de antes se a limpeza apagar mais do que devia.
3. **No SQL Editor do branch `production`**, cole o conteúdo de
   `src/infrastructure/db/sql/limpar-para-importar.sql` e execute. Ele limpa o cadastro que caiu em
   2026 por engano, inclusive as receitas fixas iniciadas em janeiro, que já se materializam em
   outubro e duplicariam os salários.
4. **Em `https://my-billing-pearl.vercel.app`**, entre com a conta de quem deve aparecer como dono
   dos lançamentos e importe as três abas como no localhost.
5. **Confira o painel de dezembro.** "Despesas do mês" precisa bater com o `Total:` de Saídas da
   aba de dezembro. Uma diferença só se explica pelas linhas que a conferência daquela aba listou
   como não lidas.
