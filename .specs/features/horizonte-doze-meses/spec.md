# Horizonte de doze meses: Specification

> Fatia 1 do plano aprovado em 2026-11-01 (`~/.claude/plans/estou-sentindo-que-ainda-ancient-cosmos.md`):
> o diferencial "o app sabe o que vem" e o simulador "Simular". Esta fatia só alarga o que o app
> enxerga à frente; o simulador é a fatia 2 e a landing, a fatia 3.

## Problem Statement

O app materializa as ocorrências das contas fixas e projeta o saldo dos meses seguintes dentro de
uma janela de 3 meses (`MESES_DE_PROJECAO`). O simulador "Dá pra comprar?" precisa responder sobre
uma compra em 10x ou 12x, e a resposta de um mês que ninguém materializou sairia sem o salário e sem
as contas fixas, otimista por construção. Projetar a partir dos planos de recorrência somaria plano
com razão, o que AD-003 proíbe. O caminho é materializar e projetar 12 meses.

## Goals

- [ ] Abrir qualquer tela que materializa deixa os 12 meses seguintes com as ocorrências de todo fixo
      vigente
- [ ] `obterVisaoMensal` entrega comprometido e saldo dos 12 meses seguintes
- [ ] A seção "Próximos meses" da Visão geral continua com 3 linhas, com os mesmos números de hoje
- [ ] A leitura da janela passa a ser uma consulta, e não uma por mês

## Out of Scope

| Feature | Reason |
| --- | --- |
| O simulador, a rota `/simular`, a barra inferior com cinco itens | Fatia 2 (`simular`) |
| A landing e o posicionamento | Fatia 3 (`landing-simulador`) |
| Mostrar 12 linhas em "Próximos meses" | Decisão registrada no plano: 12 linhas dobrariam a altura da página |
| Projetar recorrência sem materializar | AD-003: plano de geração não entra em soma |
| Saldo acumulado entre meses | Cada mês isolado (`saldo-futuro`, decisão do dono) |
| Mudar a janela do seed de avulsos (`MESES_DE_AVULSOS`) | Avulso é gasto do mês; o seed já cobre seis meses deles |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tamanho do horizonte | 12 meses além do mês aberto | Decisão do dono em 2026-11-01 | y |
| Linhas de "Próximos meses" | 3, as primeiras do horizonte | Decisão do plano aprovado; o número de cada linha continua igual ao card "Saldo previsto" do mês (SALDO-03, AC 7) | y |
| Uma constante ou duas | Duas: o horizonte (materialização e projeção) e as linhas exibidas na Visão geral | Materialização e projeção precisam coincidir (FIXO-05, AC 2); a exibição é escolha de tela e não pode arrastar as outras duas | n (decisão do autor) |
| Como a janela é lida | Um método de port `listarEntre(inicio, fim)`, inclusivo nas duas pontas, só não cancelados, na mesma ordem de `listarPorCompetencia` | 12 consultas em sequência por abertura de página multiplicam por quatro o custo de hoje; AD-008 fixa o critério de reavaliação em 300 ms de p95 | n (decisão do autor) |
| O que o seed materializa | O mesmo horizonte do app | `pnpm db:seed` deve deixar o banco como uma abertura de mês deixaria; hoje ele materializa `MESES_DE_AVULSOS − 1` | n (decisão do autor) |
| Custo da materialização maior | Aceito: até 12 ocorrências por fixo por abertura, num lote só, idempotente pela restrição única | AD-008 e a spec de recorrências já aceitam o GET que escreve; a janela maior não muda o mecanismo | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Persistência e estado | HORIZ-01: a materialização passa a cobrir 12 meses; idempotente pela restrição `movimento_recorrencia_competencia_uq`, sem mudança de schema |
| Concorrência | Inalterada: dois carregamentos simultâneos continuam protegidos pela restrição única, não por consulta prévia (`recorrencias/spec.md`) |
| Desempenho | HORIZ-03: uma consulta para a janela; critério de reavaliação de AD-008 continua valendo |
| Demais dimensões | N/A para este escopo: sem entrada de usuário, sem chamada externa, sem autenticação nova, sem transição de estado |

---

## User Stories

### P1: O app enxerga doze meses à frente ⭐ MVP — HORIZ-01

**User Story**: Como quem vai simular uma compra em 12x, quero que todo mês até doze à frente já
tenha as contas fixas lançadas, para o saldo de cada mês ser o verdadeiro.

**Why P1**: Sem isso o simulador da fatia 2 responde errado em todo mês além do terceiro.

**Acceptance Criteria**

1. WHEN uma página que materializa (Visão geral, Lançamentos, home, Cadastros) é aberta na
   competência C THEN o sistema SHALL materializar, para cada recorrência vigente, as ocorrências
   das competências de C até C + 12, respeitando `competenciaInicio` e `competenciaFim`
2. WHEN `obterVisaoMensal` é chamada para C THEN o sistema SHALL entregar em `futuro` exatamente 12
   itens, das competências C + 1 até C + 12, em ordem, cada um com `competencia`, `comprometido` e
   `saldo`
3. The system SHALL usar uma única constante para o horizonte de materialização e o de projeção, de
   modo que os dois não possam divergir
4. WHEN C é novembro de um ano THEN o sistema SHALL incluir em `futuro` as competências de dezembro
   daquele ano e de janeiro a novembro do ano seguinte

**Independent Test**: com um fixo sem fim de R$ 300,00 e uma entrada fixa de R$ 1.000,00 em março,
abrir março materializa as duas em março e nos 12 meses seguintes, e `futuro` tem 12 itens, cada um
com `saldo` de R$ 700,00.

---

### P1: "Próximos meses" continua com três linhas ⭐ MVP — HORIZ-02

**User Story**: Como quem olha a Visão geral, quero continuar vendo os três meses seguintes, para a
página não dobrar de altura.

**Why P1**: É a decisão do plano; sem ela, HORIZ-01 muda uma tela que não deveria mudar.

**Acceptance Criteria**

1. WHEN a Visão geral de C é exibida THEN o sistema SHALL mostrar na seção "Próximos meses"
   exatamente 3 itens, das competências C + 1, C + 2 e C + 3
2. WHEN a pessoa abre um dos três meses seguintes THEN o sistema SHALL mostrar no card "Saldo
   previsto" o mesmo valor que a linha daquele mês mostrava (SALDO-03, AC 7, mantido)
3. The system SHALL definir o número de linhas exibidas numa constante própria, distinta do
   horizonte

**Independent Test**: o e2e de `saldo-futuro` continua a contar 3 itens na seção e a conferir abril e
maio abertos.

---

### P1: A janela é lida numa consulta ⭐ MVP — HORIZ-03

**User Story**: Como a página do mês, quero ler os 12 meses seguintes numa ida ao banco, para abrir
o mês não ficar quatro vezes mais lento.

**Why P1**: Doze consultas em sequência por abertura é o custo que AD-008 manda evitar.

**Acceptance Criteria**

1. The system SHALL oferecer em `MovimentoRepository` o método `listarEntre(inicio, fim)` que
   devolve os lançamentos não cancelados cuja competência está entre `inicio` e `fim`, inclusive as
   duas pontas
2. WHEN `listarEntre(inicio, fim)` é chamado THEN o sistema SHALL devolver o mesmo conjunto que a
   união de `listarPorCompetencia` de cada competência de `inicio` a `fim`, na ordem de
   competência, data do evento e id
3. IF `fim` é anterior a `inicio` THEN o sistema SHALL devolver lista vazia
4. WHEN `obterVisaoMensal` é chamada para C THEN o sistema SHALL ler as competências C + 1 até
   C + 12 com uma única chamada a `listarEntre`

**Independent Test**: com lançamentos em março, abril, junho e um cancelado em maio,
`listarEntre(2026-03, 2026-06)` devolve os três vigentes, em ordem, e `listarEntre(2026-06,
2026-03)` devolve vazio.

---

### P2: O seed deixa o banco como uma abertura de mês deixaria — HORIZ-04

**User Story**: Como quem roda `pnpm db:seed`, quero que os fixos do seed já cubram o horizonte do
app, para a primeira abertura não materializar nada e as capturas saírem iguais ao uso.

**Why P2**: Sem isso o app continua correto (a abertura materializa), só o seed fica aquém.

**Acceptance Criteria**

1. WHEN `pnpm db:seed` roda com base B THEN o sistema SHALL materializar as recorrências do seed de
   B até B + 12, pela mesma constante do horizonte

**Independent Test**: depois do seed, abrir a base não cria nenhuma ocorrência (`materializar`
devolve zero).

---

## Edge Cases

- Recorrência com `competenciaFim` dentro da janela: ocorrências só até o fim (já provado por
  `janelaMaterializacao`; HORIZ-01, AC 1 o exige na composição)
- Mês da janela sem lançamento: `comprometido` e `saldo` zero, como em SALDO-01, AC 5
- Virada de ano na janela: HORIZ-01, AC 4
- `listarEntre` com `inicio === fim`: devolve o mesmo que `listarPorCompetencia(inicio)`
- Abrir o mesmo mês duas vezes: a segunda materialização devolve zero (idempotência mantida)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| HORIZ-01 | P1: O app enxerga doze meses à frente | Tasks | Pending |
| HORIZ-02 | P1: "Próximos meses" continua com três linhas | Tasks | Pending |
| HORIZ-03 | P1: A janela é lida numa consulta | Execute | Implementing: ACs 1 a 3 provados no fake (`fakes.test.ts`, "listar entre duas competências") e no Postgres (`movimento.repository.integration.test.ts`, "listar entre duas competências"), com o Edge Case `inicio === fim`; AC 4 na T3 |
| HORIZ-04 | P2: O seed deixa o banco como uma abertura de mês deixaria | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks (T1 a T8), 0 unmapped

---

## Success Criteria

- [ ] Abrir um mês materializa um fixo sem fim em 13 competências (a aberta e 12 seguintes)
- [ ] `futuro` tem 12 itens; a Visão geral mostra 3 linhas com os mesmos números de antes
- [ ] A leitura da janela é uma consulta
- [ ] `pnpm verify` e `pnpm test:e2e` saem 0
