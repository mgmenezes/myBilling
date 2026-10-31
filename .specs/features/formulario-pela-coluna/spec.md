# Formulário de lançamento pela largura da coluna: Specification

> Pedido do dono em 2026-10-31, com a Visão geral aberta num monitor de 1.920 px: no formulário de
> lançamento da coluna da direita, os rótulos "Meio de pagamento" e "De quem é o lançamento"
> quebram em duas linhas, o atalho "+ novo" quebra, os dois controles de um par ficam desalinhados
> na vertical e o texto do seletor de pessoa fica cortado. Decisão do dono no mesmo dia, entre as
> opções apresentadas: "Um campo por linha".

## Problem Statement

Os pares de campos dos formulários Avulso e Parcelado ficam lado a lado a partir de 640 px de
**janela** (`sm:`). Na Visão geral, a coluna de ação tem 384 px em qualquer janela de 1.280 px ou
mais, e o formulário dentro dela tem uns 335 px. Numa janela larga, o par ainda fica lado a lado, e
cada campo recebe uns 160 px: o rótulo quebra, o "+ novo" quebra, os controles se desalinham e o
nome da pessoa não cabe no seletor.

A causa é o ponto de virada: ele olha a largura da janela, e quem importa é a largura do próprio
formulário. O gasto fixo já resolveu o mesmo defeito do mesmo jeito (`FIXCOL-07`, `form-recorrencia.tsx`).

## Goals

- [ ] Na coluna de ação da Visão geral, cada campo dos formulários Avulso e Parcelado ocupa a linha inteira
- [ ] Nenhum rótulo, "+ novo" ou "+ nova" quebra em duas linhas, e o nome da pessoa aparece inteiro
- [ ] Onde o formulário é largo (diálogo de Lançamentos, Visão geral abaixo de 1.280 px), os pares continuam lado a lado, como hoje

## Out of Scope

| Feature | Reason |
| --- | --- |
| Formulário de gasto fixo | Já resolvido em `FIXCOL-07`, em outra ramificação |
| Alargar a coluna de ação | Decisão do dono: a coluna de 384 px fica; muda o formulário, não a coluna |
| Encurtar rótulos ("Meio de pagamento", "De quem é o lançamento") | Opção preterida pelo dono; os textos e as buscas por rótulo dos testes não mudam |
| Mudar a ordem dos campos ou a lista de campos | Só o ponto de virada dos pares muda |
| Formulários de edição de lançamento | Não usam estes pares de campos |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Como resolver o aperto da coluna | Um campo por linha quando o formulário é estreito | Decisão do dono em 2026-10-31, opção "Um campo por linha" | y |
| Onde vale | Formulário Avulso e formulário Parcelado, em todo lugar onde aparecem | Pedido do dono: "no avulso e no parcelado" | y |
| Limiar | 448 px de largura do **formulário** (`@md` do Tailwind, 28rem), por consulta de contêiner e não por largura de janela | Com 448 px, cada campo do par tem uns 216 px e cabe "De quem é o lançamento" numa linha; com 335 px, 160 px, que é o defeito. O dono pediu "cerca de 448 px" | n (decisão do autor) |
| Mecanismo | `@container` no `<form>` e `@md:` no lugar de `sm:` nos pares | Mesmo padrão de `FormRecorrencia` (`FIXCOL-07`); o `<form>` já tem a largura do espaço que o contém | n (decisão do autor) |
| Pares de dias do cartão novo (Parcelado) | Também por `@md:` | Ficam dentro do formulário e sofrem do mesmo aperto; um ponto de virada só no formulário | n (decisão do autor) |
| Janela de 640 px a 1.279 px na Visão geral, e o diálogo de Lançamentos | Formulário com 448 px ou mais: pares lado a lado | Nesses lugares o formulário é largo; nada muda para o dono | n (decisão do autor) |
| Janela estreita, abaixo de 640 px | Um campo por linha, como hoje | O formulário tem menos de 448 px; o resultado é o de antes, só que agora pela largura do formulário | n (decisão do autor) |
| Como provar "nome inteiro" | Nome genérico longo ("Pessoa A com nome longo") posto no cadastro de teste, e a largura do texto medida contra a do seletor | O fixture do dono é irrelevante; o nome longo é o que aperta o seletor (AD-009) | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Um campo por linha na coluna estreita ⭐ MVP — FPC-01

**User Story**: Como quem lança pela coluna da Visão geral, quero cada campo numa linha só, para ler
os rótulos e o nome da pessoa inteiros e não errar o campo.

**Why P1**: É o pedido do dono.

**Acceptance Criteria**

1. WHILE a largura do formulário Avulso é menor que 448 px, the system SHALL mostrar cada campo dos dois pares, meio e categoria, pessoa e data, numa linha própria, o segundo abaixo do primeiro
2. WHILE a largura do formulário Parcelado é menor que 448 px, the system SHALL mostrar cada campo dos três pares, quantidade e parcela inicial, meio e categoria, pessoa e data, numa linha própria, o segundo abaixo do primeiro
3. WHILE a largura do formulário é menor que 448 px, the system SHALL mostrar cada rótulo de campo, e o atalho "+ novo" ou "+ nova", numa linha só
4. WHILE a largura do formulário é menor que 448 px, the system SHALL mostrar o nome da pessoa escolhida inteiro no seletor, sem corte, mesmo com o nome de 23 caracteres
5. WHILE o formulário está na coluna de ação da Visão geral, de 1.280 px a 1.920 px de janela, the system SHALL aplicar as ACs 1 a 4 aos dois formulários

**Independent Test**: em 1.920 px, na Visão geral, abrir as abas Avulso e Parcelado e medir: cada
campo numa linha, rótulos com uma linha de altura, nome longo inteiro no seletor.

---

### P1: Lado a lado onde o formulário é largo ⭐ MVP — FPC-02

**User Story**: Como quem lança pelo diálogo de Lançamentos, quero os pares lado a lado como hoje,
para não rolar o formulário à toa.

**Why P1**: A correção não pode piorar os lugares que já funcionavam.

**Acceptance Criteria**

1. WHILE a largura do formulário Avulso é de 448 px ou mais, the system SHALL mostrar o segundo campo de cada par ao lado do primeiro, na mesma faixa
2. WHILE a largura do formulário Parcelado é de 448 px ou mais, the system SHALL mostrar o segundo campo de cada par ao lado do primeiro, na mesma faixa
3. WHEN o diálogo de Lançamentos abre em 1.280 px de janela, the system SHALL mostrar os pares dos dois formulários lado a lado
4. WHERE a coluna de ação fica abaixo do centro, abaixo de 1.280 px de janela e a partir de 768 px, the system SHALL mostrar os pares dos dois formulários lado a lado

**Independent Test**: em 1.280 px, abrir "+ Novo lançamento" em Lançamentos e ver os pares lado a lado.

---

### P1: O limiar é o do formulário, não o da janela ⭐ MVP — FPC-03

**User Story**: Como quem mantém o layout, quero o ponto de virada preso à largura do formulário,
para ele valer em qualquer lugar onde o formulário for montado.

**Why P1**: A causa do defeito é a janela como referência.

**Acceptance Criteria**

1. The system SHALL decidir se os pares ficam lado a lado pela largura do próprio formulário, e não pela da janela
2. WHEN o formulário mede 447 px THEN the system SHALL empilhar os pares dos dois formulários
3. WHEN o formulário mede 448 px THEN the system SHALL pôr os pares dos dois formulários lado a lado

**Independent Test**: escolher a janela que deixa o formulário em 447 px e em 448 px e medir os pares.

---

## Edge Cases

- Nome de pessoa longo ("Pessoa A com nome longo"): cabe inteiro no seletor com o formulário estreito (FPC-01, AC 4); com o formulário largo, cada campo do par tem uns 216 px, e o seletor usa a largura que tem
- Modo Receita do Avulso: o rótulo do meio vira "Onde o dinheiro cai" e aparece o texto de ajuda; vale o mesmo layout, e o rótulo continua numa linha só (FPC-01, AC 3)
- Cadastro inline aberto por "+ novo" ou "+ nova": o bloco abre abaixo do campo, com a largura do campo, e o par continua empilhado ou lado a lado conforme o formulário; o par de dias do cartão novo segue o mesmo ponto de virada
- Celular, 375 px: o formulário tem menos de 448 px, e o resultado é um campo por linha, como já era
- Janela de 640 px a 767 px, com menu em barra no topo: o formulário da Visão geral é largo, e os pares ficam lado a lado
- Erro de validação num campo: a mensagem fica abaixo do campo, e o par continua alinhado pelo topo

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FPC-01 | P1: Um campo por linha na coluna estreita | Execute | Pending |
| FPC-02 | P1: Lado a lado onde o formulário é largo | Execute | Pending |
| FPC-03 | P1: O limiar é o do formulário, não o da janela | Execute | Pending |

---

## Success Criteria

- [ ] Em 1.920 px, na coluna da Visão geral, nenhum rótulo ou atalho dos formulários quebra e o nome da pessoa aparece inteiro
- [ ] No diálogo de Lançamentos, os pares continuam lado a lado
- [ ] Nenhuma mudança de banco, de rota ou de texto
