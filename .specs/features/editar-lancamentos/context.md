# Editar lançamentos — contexto e decisões

> **RASCUNHO, não aprovado.** Em 2026-10-28 o dono reduziu o escopo para os fixos — a fatia
> vigente é `.specs/features/editar-fixos/`. Este documento fica como ponto de partida para editar
> avulso, entrada avulsa e compra parcelada: as decisões "(dono)" sobre esses tipos valem; as
> "(autor)" ainda precisam ser confirmadas quando a fatia deles começar.

> Documento de descoberta, 2026-10-26. Base de `spec.md`, `design.md` e `tasks.md` desta fatia. O que
> o dono decidiu está marcado **(dono)**; o que ficou a cargo de quem escreveu, **(autor)**; o resto
> está em "Deixado para quem constrói".

---

## Por que existe

Hoje um lançamento gravado quase não muda. O avulso só pode ser excluído; o gasto fixo só tem
"Mudar valor" (a partir de um mês) e "Encerrar"; a compra parcelada não tem nenhum gesto. Corrigir
uma categoria, um nome ou um cartão errado significa apagar e cadastrar de novo — quando apagar
existe —, e para compra e fixo não existe.

A falta pesou mais depois da importação da planilha: as entradas chegam sem categoria, porque a
planilha não tem essa coluna, e um erro pontual depois de importar só se corrigia recomeçando. O
dono pediu, durante o teste da importação, para **editar qualquer item lançado, incluindo trocar a
categoria** e o nome (dono).

## O pedido, nas palavras do dono

> "Na mesma maneira que na inserção eu vejo todos os dados, na edição deve ser a mesma forma: exibir
> o que já foi cadastrado e poder editar."

## Objetivos

1. Todo item lançado — avulso, entrada avulsa, gasto fixo, entrada fixa e compra parcelada — tem um
   gesto "Editar".
2. "Editar" abre **o mesmo formulário do cadastro** daquele tipo, com todos os campos preenchidos
   com o que está gravado; o botão diz "Salvar alterações" (dono).
3. Trocar a categoria de qualquer item é um caso comum desse gesto, não uma tela à parte (dono).

## Não-objetivos

- **Renomear ou arquivar a categoria em si** (o cadastro "Mercado", com todos os seus lançamentos),
  e o mesmo para meio de pagamento. É a dívida "Renomear e arquivar cadastro não têm tela" do
  roadmap; aqui se troca **qual** categoria um item usa (autor).
- Excluir compra parcelada ou gasto fixo. O fixo já tem "Encerrar"; excluir compra é outra conversa.
- Editar vários itens de uma vez.
- Editar uma parcela isoladamente. Uma parcela é parte de uma compra: "Editar" numa parcela edita a
  compra (ver adiante).
- Histórico de alterações e desfazer edição.

## Anti-objetivos — o que faria a fatia falhar mesmo funcionando

- **Mudar o que já foi pago.** Uma parcela ou ocorrência paga continua paga, com a mesma data de
  pagamento (dono).
- **Reescrever em silêncio o valor de meses passados de um fixo.** O valor continua com "a partir de
  qual mês" (dono).
- Quebrar a conservação da soma de uma compra: total = amortizado anterior + soma das parcelas
  (AD-003, AD-005).
- Duplicar ocorrências de fixo, ou deixar ocorrência materializada com dado velho depois de editar.
- Um formulário de edição que divirja do de cadastro: validações, campos e textos são os mesmos.

---

## Como cada tipo se comporta

### Avulso — gasto ou entrada do mês (dono)

A edição muda **só aquele lançamento**: descrição, valor, natureza, categoria, meio, pessoa, data e
situação.

**O mês não muda pela edição** (dono). No cadastro, o mês é o da tela aberta e a data é um campo
livre, sem vínculo com ele; a edição mantém isso. Para mudar um avulso de mês, exclui-se e cadastra-se
de novo no mês certo. A razão de não derivar o mês da data: os avulsos importados têm data no dia 1
da competência, e compra no cartão costuma ter data no mês anterior ao da fatura — corrigir a data
real mandaria o item para o mês errado.

### Gasto fixo e entrada fixa (dono)

- **Nome, categoria, meio de pagamento, pessoa e dia de vencimento** valem para o fixo inteiro,
  **inclusive nos meses que já passaram**: o fixo e todas as suas ocorrências mudam juntos.
- **O valor** mantém o comportamento de hoje: muda "a partir de qual mês", sem reescrever o passado
  (`registrar-versao`). No formulário de edição, o valor aparece com o seletor "vale a partir de".
- Ocorrência já paga continua paga, com a mesma data de pagamento.

Decisões do autor:

- **Natureza** (despesa ↔ receita) **não é editável** no fixo. Trocar o sentido de uma série
  inverteria o sinal dos meses que já passaram, inclusive os pagos — a mesma reescrita do passado
  que o dono vetou para o valor. Quem errou o sentido encerra o fixo e cadastra de novo. O campo
  aparece, bloqueado, com essa razão ao lado.
- **Mês de início** fica visível e **não editável** nesta fatia. Antecipar exigiria materializar
  meses que não existiam; atrasar exigiria apagar ocorrências, inclusive pagas. O mês de fim já
  tem gesto próprio ("Encerrar").
- O "Mudar valor" que já existe no cartão **continua** como atalho; "Editar" é o gesto completo.

### Compra parcelada (dono)

- **Nome, categoria, cartão e pessoa** mudam a compra e **todas as parcelas**, pagas inclusive
  (pagamento não muda).
- **Valor e número de parcelas** mudam só as parcelas **ainda não pagas**; as pagas ficam como
  estão. O que "mudar o valor" quer dizer segue o **modo** da compra, como o rótulo do formulário
  diz (autor):
  - **Modo "valor da parcela"** — o de todas as compras importadas. Mudar o valor faz cada parcela
    não paga valer o valor novo (a operação de `reprecificarAPartirDe`, da importação, aplicada a
    partir da primeira não paga). Mudar a quantidade acrescenta ou retira parcelas **desse mesmo
    valor** no fim: o total cresce ou diminui.
  - **Modo "valor total"** — mudar o total ou a quantidade redistribui o restante entre as parcelas
    não pagas, pela política de resíduo da compra: o que `regenerarParcelas` (domínio, hoje sem
    chamador) já faz.
  - Em qualquer modo, o total gravado é amortizado anterior + soma das parcelas (conservação).
  - Reduzir a quantidade abaixo de uma parcela já paga é recusado com mensagem clara.
- Quando as parcelas não pagas têm valores diferentes (compra reprecificada pela importação), o
  campo de valor mostra o **da próxima parcela a pagar**, e o rótulo diz "valor das parcelas a
  pagar" (autor).

Decisões do autor:

- **Sem nenhuma parcela paga**, editar equivale a recadastrar: o plano inteiro — amortizado
  anterior inclusive — é recalculado a partir dos campos, como o cadastro faria.
- **O mês da compra não é editável**: o formulário de cadastro não tem campo de mês (usa o mês
  aberto na tela), e a edição não ganha um campo que o cadastro não tem. A **parcela inicial** é
  editável **só enquanto nenhuma parcela estiver paga**, ancorada no mês em que a parcela inicial
  está hoje.
- **Política de resíduo** segue o formulário de cadastro.

### Onde o "Editar" aparece (autor, aprovado no resumo)

- **Lançamentos**, em cada linha: avulso e entrada avulsa editam a si mesmos; **parcela edita a
  compra**; **ocorrência de fixo edita o fixo**. O formulário diz claramente o que está sendo
  editado ("Editar compra: Sofá, 10 parcelas"; "Editar gasto fixo: Internet").
- **"Todo mês"**, em cada cartão, ao lado de "Mudar valor" e "Encerrar".
- O formulário abre no mesmo `<dialog>` do cadastro (AD-014): não fecha ao salvar, e mostra a
  confirmação dentro dele.

---

## Ordem de entrada no ar (dono)

A importação reconhece, entre uma aba e a seguinte, a compra por nome, meio, quantidade, número da
parcela e valor, e o fixo por nome e meio. Renomear, trocar o meio ou mudar valor ou quantidade de um
item importado **antes da próxima aba** faria a importação seguinte encerrar o fixo e criar outro,
ou duplicar a compra.

Decisão do dono: **as três abas são importadas em produção antes de esta fatia ir ao ar** —
migration `0003` no Neon, push da importação, outubro, novembro e dezembro. Nenhuma proteção extra
é construída; a ordem fica registrada aqui e no handoff.

## Restrições do projeto que valem aqui

- AD-001: valores em centavos inteiros; AD-002: competência como `'YYYY-MM'`.
- AD-003 e AD-005: só `movimento` soma; a compra conserva total = amortizado + parcelas.
- AD-006: as regras de edição (o que pode mudar, o que a edição faz em cada parcela ou ocorrência)
  são funções puras em `src/domain`, com `Result`.
- AD-012: o bloco da lista é decidido pelo meio; trocar o meio de um item o move de bloco, e isso é
  esperado.
- AD-014: cadastro em `<dialog>` que não fecha ao gravar.
- AD-015: receita só cai em meio sem fatura.
- AD-016: "Vencido" vem do relógio; editar não muda essa regra.
- Toda Server Action: `requireSession()` primeiro, revalidação com o **mesmo schema Zod do
  cadastro**, `ResultadoAction`, `ERRO_INESPERADO` com correlação; a edição de uma compra ou de um
  fixo grava tudo ou nada (a transação que atravessa repositórios já existe desde a importação).
- Itens importados da planilha (`origem_dado = 'PLANILHA'`) editam-se como qualquer outro.
- Lição L-016: gate de task com `pnpm typecheck` encadeado por `&&`.

## Deixado para quem constrói

- Como reaproveitar os três formulários de cadastro para a edição (modo "editar" no mesmo
  componente, com os valores iniciais) sem duplicá-los.
- Como as ocorrências já materializadas de um fixo são atualizadas quando nome, categoria, meio,
  pessoa, natureza ou dia mudam — inclusive a data das ocorrências passadas quando o dia muda.
- A mensagem e o código de erro de cada recusa (parcela paga acima da nova quantidade; calendário
  de compra com parcela paga).
- Concorrência entre as duas pessoas editando o mesmo item: a última gravação vale, como no resto
  do app.

## Decisões do autor, para o dono conferir

1. Trocar **qual** categoria um item usa entra; renomear a categoria em si fica para outra fatia.
2. A natureza de um fixo não é editável: trocar o sentido inverteria o sinal dos meses passados.
3. O mês de início do fixo não é editável nesta fatia.
4. O mês da compra não é editável; a parcela inicial só muda sem parcela paga.
5. Reduzir parcelas abaixo de uma parcela já paga é recusado.
6. "Editar" numa parcela edita a compra; numa ocorrência de fixo, edita o fixo.
7. "Mudar valor" continua no cartão do fixo como atalho.
8. O que "mudar o valor" de uma compra significa segue o modo dela: no modo "valor da parcela",
   cada parcela não paga passa a valer o novo valor e a quantidade acrescenta ou retira parcelas
   desse valor; no modo "valor total", o restante se redistribui.
9. Com parcelas não pagas de valores diferentes, o campo mostra o valor da próxima a pagar.
10. Sem parcela paga, editar uma compra equivale a recadastrá-la.

## Nota da troca de categoria (verificação de `trocar-categoria`, 2026-10-29)

> Registrada a pedido do relatório da rodada 1 (`.specs/features/trocar-categoria/validation.md`,
> Notas, item 2). Não é decisão do dono nem do autor desta fatia.

A troca de categoria de um fixo (TRC-03 AC 1) reusa `atualizarOcorrenciasDaSerie`, a mesma escrita
da edição de fixo (`trocarNoFixo` em `src/application/mes/trocar-categoria/handler.ts:105-125`). Ela
regrava **descrição, meio, pessoa e data** de todas as ocorrências do fixo com os valores do fixo, e
não só a categoria.

Hoje isso não muda nada: só a materialização e a edição de fixo escrevem numa ocorrência, e as duas
usam os campos do fixo. Este rascunho também diz que "Editar" numa ocorrência edita o fixo (decisão
6 do autor). Se esta fatia passar a editar **uma ocorrência sozinha**, a troca de categoria do fixo
vai apagar essa edição e quebrar o "sem mudar data" do TRC-03 AC 1. Nesse caso, a troca no fixo
precisa mudar junto, para gravar só a categoria nas ocorrências.
