# Landing pela dor: Specification

> Pedido do dono em 2026-11-01: "vamos planejar para fazer uma boa landing page, que explore a dor
> dos usuários e onde o myBilling se encaixa; você pode buscar dados na internet". Plano aprovado em
> `~/.claude/plans/sprightly-inventing-sunrise.md`. Protótipo no canvas privado
> https://claude.ai/artifact/1DrgD3Nq2PGDTDHxhoyyZC (quadros Hoje, A, B e C). Revisa as specs de
> `campanha-lista-de-espera` e `campanha-o-que-vem` nos pontos marcados abaixo.

## Problem Statement

A landing de hoje abre pela cena "dá pra comprar?", mas trata a dor em seis blocos curtos, deixa
três números de 2025 no fim da página e se apresenta como "feita por um casal para o próprio uso".
O dono quer que a página explore a dor de quem paga as contas da casa, com dados de pesquisa
conferidos na fonte, e mostre onde o myBilling entra, sem fechar o público em casais e sem usar a
história de origem como prova. O simulador "Dá pra comprar?" já existe no app (AD-024), mas ainda
não está na landing: a seção "O que vem a seguir" fica como está, e a fatia `landing-simulador` a
reescreve.

## Goals

- [ ] A página abre pela dor nas palavras da pessoa, com a cena "Dá pra comprar?" em destaque, na
      estrutura C escolhida pelo dono
- [ ] Cinco números de mercado de 2026, numa seção só, cada um com fonte e ano, e nenhum número
      fora dela
- [ ] As objeções respondidas em perguntas frequentes, sem script
- [ ] A página fala com quem paga as contas da casa, sozinho ou a dois, sem a história de origem
- [ ] O teste estrutural recorta cada seção pelo próprio fechamento e lista toda seção, para a
      fatia do simulador entrar depois do hero sem mover o resto
- [ ] `pnpm site:verificar` e `pnpm verify` saem 0

## Out of Scope

| Feature | Reason |
| --- | --- |
| O simulador na landing (`site/simulador.js`, casa fictícia) | Fatia `landing-simulador`, depois desta |
| Reescrever "O que vem a seguir" dizendo que o simulador já existe no app | Decisão do dono em 2026-11-01: fica como está até o simulador entrar na página |
| Estender "O que vem a seguir" para a fatura | Decisão pendente do dono (copy, "Decisões que ficam com o dono") |
| Capturas novas do app | As telas não mudaram |
| Reescrever o kit de copy para o público mais largo | Só a headline que fecha o nicho sai; o resto fica para uma rodada própria |
| Rastreador, analytics, contagem de visitas | CAMP-03 AC 5; a medição fica na pergunta do formulário |
| Deploy na Vercel, `git push`, merge | Operação remota, autorização separada |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estrutura da página | Quadro C: inicio, onde-quebra, numeros, comparativo, para-dois, sua-planilha, perguntas, a-seguir, rodape | Escolhido pelo dono em 2026-11-01 no canvas; continua válido quando o simulador entrar depois do hero | y |
| Público | Quem paga as contas da casa, sozinho ou a dois; nenhuma frase fecha o nicho em casais | Dono em 2026-11-01: "remova dizeres que fecham o nicho de casais" | y |
| Quantos números de mercado | Até cinco, todos em `#numeros`, nenhum fora | Dono em 2026-11-01; muda a regra "máximo três" do posicionamento e CAMP-02 AC 5 | y |
| Quais números | 58% e 14% (CNDL e SPC Brasil, 2026), 61% (CNDL e SPC Brasil, 2026), 47% (CNDL e SPC Brasil, 2026), 82% (CNC, 2026), 45% (Serasa com Opinion Box, 2026), nesta ordem | Da dor à ponte: fatura, compra sem plano, quem controla e como, a casa endividada, a briga. O 49% (esconder do parceiro) saiu por fechar o nicho; os números de reserva ficam no posicionamento | n (decisão do autor) |
| História de origem | Sai da página como prova; o rodapé diz "em uso hoje, com contas de verdade, e abrindo para mais casas" | Dono em 2026-11-01: "esqueça o casal"; revisa CAMP-02 AC 6 e a regra 8 do tom | y |
| "Para dois" | Vira "Sozinho ou a dois", com as três definições (Um caixa, Quem gastou, Um número) | Mantém o diferencial de duas pessoas sem exigir duas | n (decisão do autor) |
| Base do branch | `feat/landing-dor` = `feat/campanha-lista-de-espera` rebaseado sobre a `main` (`99d74d4`); o branch da campanha não foi reescrito | Dono em 2026-11-01; a `main` já tem AD-023 e AD-024, então esta fatia registra AD-025 | y |
| Perguntas frequentes | `<details>` fechados, sem script; a resposta sobre a fatura diz "Não" sem "ainda" nem "hoje"; a resposta sobre o e-mail não promete "sem novidade, sem e-mail" | Estender a exceção à fatura e a promessa de e-mail são decisões pendentes do dono | n (decisão do autor) |
| A seção "O que vem a seguir" | Texto de hoje, sem mudança | Decisão do dono em 2026-11-01 | y |
| Medição dos testes A/B | Fora da página: um campo "versão" no link do formulário, preenchido pela URL | Dono em 2026-11-01; nenhum script além do tema | y |

**Open questions:** none - all resolved or logged above.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação de conteúdo | DOR-03 AC 3 e DOR-05 AC 2: nenhuma porcentagem fora de `#numeros`, nenhuma frase que fecha o nicho; os testes de promessas proibidas, allowlist de R$ e tom continuam valendo |
| Falha de dependência externa | Sem mudança: CAMP-03 AC 4 (fontes) e CAMP-04 AC 2 (formulário) |
| Demais dimensões | N/A: página estática sem entrada, sem escrita, sem dependência nova |

---

## User Stories

### P1: O teste recorta e lista as seções ⭐ MVP — DOR-01

**User Story**: Como mantenedor, quero que o teste estrutural recorte cada seção pelo próprio
fechamento e exija que toda seção esteja na lista de ordem, para mover e inserir seções sem o
teste vazar texto de uma para outra.

**Why P1**: Hoje o recorte vai do `id` de uma seção até o `id` da seguinte na lista: uma seção
nova entre duas listadas vaza para a anterior, e trocar a ordem esvazia o recorte. É condição para
o resto da fatia e para o simulador entrar depois.

**Acceptance Criteria**

1. The teste estrutural SHALL recortar o texto de cada seção do `<section` ou `<footer` que carrega
   o `id` até o fechamento correspondente, e SHALL falhar quando a seção não existe
2. The teste estrutural SHALL falhar quando uma `<section>` da página tem `id` fora da lista de
   ordem, ou não tem `id`
3. The teste estrutural SHALL rejeitar a palavra "já" na seção `a-seguir` com fronteiras que
   reconhecem letras acentuadas, de modo que "já existe" falha e "jáx" não é o caso de prova
4. WHILE o HTML é o de antes desta fatia, the teste estrutural revisto SHALL passar

**Independent Test**: inserir `<section id="x">` entre duas seções: o teste falha por id fora da
lista; trocar "ainda não existe" por "já existe" em `a-seguir`: o teste falha.

---

### P1: A página abre pela dor ⭐ MVP — DOR-02

**User Story**: Como pessoa que paga as contas da casa, quero me reconhecer na primeira seção
depois do hero, para entender em uma rolagem onde o mês quebra e o que o myBilling faz com isso.

**Why P1**: É a campanha.

**Acceptance Criteria**

1. The page SHALL ter as seções nesta ordem: inicio, onde-quebra, numeros, comparativo, para-dois,
   sua-planilha, perguntas, a-seguir, rodape, e nenhuma outra
2. The page SHALL manter no `<h1>` a frase "A planilha sabe o que você digitou. O myBilling sabe o
   que vem."
3. The hero SHALL ter, abaixo dos botões, a frase "A lista pede o e-mail e uma pergunta: como você
   controla as contas hoje. Nada mais."
4. WHILE na seção `onde-quebra`, the page SHALL ter um parágrafo de abertura com a classe `lead`
   que contém "A fatura chega maior do que você lembrava" e "o saldo de hoje continua dizendo que
   dá"
5. WHILE na seção `onde-quebra`, the page SHALL manter seis `article.dor` com os temas comprar,
   parcela, fatura, ano, luz e duas pessoas, o primeiro "Dá pra comprar?" com a classe
   `dor-destaque` e os outros cinco sem ela
6. WHILE em 768 px ou mais, the primeiro `article.dor` SHALL ocupar a largura inteira da grade e a
   cena dele SHALL ter tamanho de fonte maior que a cena do segundo
7. The seção `comparativo` SHALL manter a tabela e as linhas de CAMP-02 AC 3 e VEM-02 AC 3, e SHALL
   terminar com um parágrafo que contém "olha para a casa, com uma pessoa ou duas"

**Independent Test**: abrir a página e ler só a primeira dobra depois do hero: a dor está nas
palavras da pessoa antes de qualquer garantia.

---

### P1: Cinco números numa seção só ⭐ MVP — DOR-03

**User Story**: Como pessoa lendo a página, quero ver que a dor não é só minha, com números de
pesquisa recentes e a fonte ao lado, sem porcentagem espalhada pela página.

**Why P1**: É o pedido do dono: explorar a dor com dados.

**Acceptance Criteria**

1. The page SHALL ter entre um e cinco `figure.numero`, todos dentro de `section#numeros`, e
   nenhum fora dela
2. Each `figure.numero` SHALL ter um `figcaption` com um `<cite>` cujo texto contém a fonte e um ano
   de quatro dígitos
3. WHILE fora de `section#numeros`, the texto visível da página SHALL não conter porcentagem
   (dígitos seguidos de "%") nem a palavra "milhões"
4. The seção `numeros` SHALL ter o título "Não é só na sua casa" e os cinco valores "58%", "61%",
   "47%", "82%" e "45%", nesta ordem, com as fontes "CNDL e SPC Brasil, 2026" (três vezes), "CNC,
   2026" e "Serasa com Opinion Box, 2026"
5. The seção `numeros` SHALL vir logo depois de `onde-quebra` e antes de `comparativo`

**Independent Test**: contar as figuras e os "%" na página: cinco figuras, todas numa seção, e
nenhum "%" fora dela.

---

### P2: Perguntas frequentes sem script — DOR-04

**User Story**: Como pessoa em dúvida, quero as respostas às objeções (planilha, banco, a outra
pessoa, celular, custo, dados) antes de deixar o e-mail.

**Why P2**: Responde as cinco objeções da copy; a página funciona sem ela.

**Acceptance Criteria**

1. The page SHALL ter `section#perguntas` entre `sua-planilha` e `a-seguir`, com o `<h2>`
   "Perguntas frequentes"
2. The seção `perguntas` SHALL ter ao menos seis `<details>`, nenhum com o atributo `open`, cada um
   com um `<summary>` como primeiro filho cujo texto termina em "?", seguido de ao menos um `<p>`
3. The texto da seção `perguntas` SHALL conter, entre outros, "planilha", "banco", "outra pessoa",
   "celular", "custa" e "dados"
4. The seção `perguntas` SHALL não conter "sincroniz", "grátis", "gratuito", "de graça" nem "app na
   loja", e a resposta sobre a fatura SHALL começar com "Não."
5. The page SHALL continuar com exatamente um `<script>`, inline

**Independent Test**: abrir a página sem JavaScript e abrir cada pergunta: todas abrem e fecham.

---

### P1: Para quem paga as contas da casa, sem a história de origem ⭐ MVP — DOR-05

**User Story**: Como dono, quero que a página fale com quem paga as contas da casa, sozinho ou a
dois, e venda pelo produto, não pela história de quem o fez.

**Why P1**: Decisões do dono em 2026-11-01: "esqueça o casal" e "remova dizeres que fecham o nicho
de casais".

**Acceptance Criteria**

1. The rodapé SHALL conter "em uso hoje" e "abrindo para mais casas", e the texto visível da
   página SHALL não conter "por um casal", "de um casal" nem "nasceu de"
2. The texto visível da página SHALL não conter as palavras "casal" nem "casais", e the hero SHALL
   não conter "Para dois"
3. The seção `para-dois` SHALL ter o `<h2>` "Sozinho ou a dois", três `<dt>` com "Um caixa", "Quem
   gastou" e "Um número", e SHALL continuar como a única superfície invertida
4. The rodapé SHALL ter uma `ul.incluido` com três `<li>` que contêm "antes de quem não está na
   lista", "preço antes" e "uma pergunta", sem nenhum valor de preço
5. The seção `onde-quebra` SHALL ter o subtítulo "Seis situações que quem paga as contas reconhece"
   e the sexta cena SHALL começar com "Quando são duas pessoas"

**Independent Test**: procurar "casal" na página: nenhuma ocorrência; ler o rodapé: diz o que o
produto é hoje sem dizer quem o fez.

---

### P2: Documentos, decisão e gates — DOR-06

**User Story**: Como mantenedor, quero o posicionamento, as specs antigas e o registro de decisão
alinhados com a página, e os gates verdes.

**Why P2**: Condição de fechamento.

**Acceptance Criteria**

1. `docs/marketing/posicionamento.md` SHALL dizer, em "Para quem", que o público é quem paga as
   contas da casa, sozinho ou a dois, e SHALL manter os três estados (planilha, caderno, nada)
2. `docs/marketing/posicionamento.md` SHALL dizer, em "Números de mercado", "até cinco por peça,
   num bloco só, fonte e ano na mesma frase", e SHALL listar os cinco da página e a reserva com
   fonte, coleta, publicação e URL
3. `docs/marketing/posicionamento.md` SHALL ter a regra 8 do tom como "Dizer o que o produto é
   hoje: em uso, abrindo para mais casas", sem o casal
4. `docs/marketing/copy-landing-simulador.md` SHALL estar no repositório com a Seção 8 trocada pelos
   cinco números, e `docs/marketing/kit-de-copy.md` SHALL manter de seis a oito headlines sem a que
   começa com "Feito por um casal"
5. The specs `campanha-lista-de-espera` (CAMP-02 ACs 1, 5 e 6) e `campanha-o-que-vem` (VEM-02 AC 7)
   SHALL registrar que esta fatia as revisou; `.specs/STATE.md` SHALL ter AD-025 e o Handoff desta
   fatia; `.specs/HANDOFF.md` SHALL apontar para cá
6. WHEN `pnpm site:verificar` e `pnpm verify` rodam THEN they SHALL sair com código 0

**Independent Test**: `pnpm site:verificar && pnpm verify`; `grep -n casal docs/marketing/posicionamento.md`
devolve só a tabela de concorrência ou nada.

---

## Edge Cases

- IF uma `<section>` nova aparecer sem `id` THEN the teste estrutural SHALL falhar (DOR-01 AC 2)
- IF o texto de `a-seguir` ganhar "já" com acento THEN the teste SHALL falhar (DOR-01 AC 3)
- IF uma porcentagem aparecer no FAQ ou no rodapé THEN the teste SHALL falhar (DOR-03 AC 3)
- WHILE em 360 px, the grade de cinco números SHALL ter uma coluna e nenhuma região SHALL rolar de
  lado (CAMP-03 AC 6 pelo verificador de navegador)
- "em breve" continua só dentro de `.botao-lista` (VEM-04 AC 1)
- A palavra "casa" e "casas" continuam permitidas: o teste de DOR-05 AC 2 usa fronteira de palavra

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DOR-01 | P1: O teste recorta e lista as seções | Execute | Implemented: T2, `site/estrutura.test.mjs` (`secao()`, "DOR-01 AC 1", "DOR-01 AC 2", "DOR-01 AC 3", `JA_ISOLADO`); 28 testes verdes no HTML de antes (AC 4) |
| DOR-02 | P1: A página abre pela dor | Execute | Implemented: T4 (AC 1 pela lista `SECOES` e "DOR-01 AC 2", a seção `perguntas` entra em T5; AC 2 "VEM-02 AC 1"; ACs 3, 4, 5, 7 em "DOR-02 AC 3", "DOR-02 ACs 4 e 5", "DOR-02 AC 7" de `site/estrutura.test.mjs`; AC 6 em `site/verificar-navegador.mjs`, medida em 768 e 1.440 px); mutantes: sem `dor-destaque` e sem `grid-column` morrem |
| DOR-03 | P1: Cinco números numa seção só | Execute | Implemented: T3, `site/index.html` `#numeros` (cinco figuras), `site/estilos.css` (grade 2 e 6 colunas), `site/estrutura.test.mjs` ("revisto por DOR-03 ACs 1 e 2", "DOR-03 AC 3", "DOR-03 ACs 4 e 5"); mutante com "10%" no rodapé morre |
| DOR-04 | P2: Perguntas frequentes sem script | Tasks | Pending |
| DOR-05 | P1: Para quem paga as contas da casa, sem a história de origem | Tasks | Pending |
| DOR-06 | P2: Documentos, decisão e gates | Execute | Implementing: ACs 1 a 4 em T1 (`docs/marketing/posicionamento.md` "Para quem", "Números de mercado", regra 8; `copy-landing-simulador.md` Seção 8; `kit-de-copy.md` com sete headlines); ACs 5 e 6 em T7 |

**Coverage:** 6 total, 6 mapeados para tasks (T1 a T7 em `tasks.md`), 0 unmapped

---

## Success Criteria

- [ ] A página abre pela dor nas palavras da pessoa e os cinco números têm fonte e ano
- [ ] Nenhuma frase fecha o nicho em casais; a história de origem não aparece
- [ ] `pnpm site:verificar && pnpm verify` saem 0
- [ ] Verifier PASS em `validation.md`
