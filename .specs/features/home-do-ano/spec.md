# Home do ano: Specification

## Problem Statement

O app não tem porta de entrada. `/` redireciona direto para a competência corrente, então não
existe lugar onde o ano seja visível como unidade nem onde se troque de mês sem editar a URL ou
usar o seletor de dentro de um mês. Quem quer olhar março de 2026 a partir de setembro precisa
saber que a rota é `/2026-03`.

Falta também uma leitura de **estrutura**: a Visão geral responde "para qual categoria foi o
dinheiro", e nenhuma tela responde "que tipo de compromisso esse mês é" — quanto do que saiu era
fixo (decidido meses atrás), quanto vai cair na fatura, e quanto foi escolha do mês.

## Goals

- [ ] Abrir o app e ver o ano inteiro, com salto de um clique para qualquer mês
- [ ] Chegar na competência corrente sem pagar um clique a mais do que hoje
- [ ] Ler a composição do mês corrente entre Fixos, Cartão e Avulsos
- [ ] Ler a mesma composição no acumulado do ano
- [ ] Trocar de ano sem sair da home

## Out of Scope

| Feature | Reason |
| --- | --- |
| Número por mês na grade (gasto, saldo) | Escolhido pelo usuário: a grade é atalho, não painel. Um número por botão exigiria agregar 12 competências só para decorar a navegação |
| Roda de alocação com meta por grupo | As 6 fatias do mockup não existem no modelo: `categoria` é tabela plana, sem grupo nem percentual-alvo. Modelar meta de alocação é feature própria, não decoração de home |
| Investimento e receita nas fatias | Investimento "mudou de lugar, não saiu" (`tabela-lancamentos.tsx`); receita é o outro sinal. Um parte-do-todo que mistura os três tem um todo que não significa nada, e somar eixos viola AD-003 |
| Evolução mês a mês (série histórica) | É a Fatia 3 do roadmap e pede consulta agregada com teste de concordância SQL × função pura. A home usa o acumulado do ano, que 12 leituras paralelas resolvem |
| Navegação lateral na home | A nav vive em `[competencia]/layout.tsx`, dentro do mês. Num launcher, a página é a navegação |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que a home responde | "Para onde eu vou agora" — launcher | Escolhido pelo usuário entre painel do ano, launcher e lista de pendências | y |
| Conteúdo de cada botão de mês | Só o nome do mês | Escolhido pelo usuário. Zera a consulta agregada que um número por botão exigiria | y |
| Onde a home mora | `/`, com o mês corrente em cartão de destaque acima da grade | Escolhido pelo usuário. O destaque devolve o clique que o redirect dava de graça | y |
| O que as fatias do gráfico são | Os blocos que o app já tem: `FIXOS`, `CARTAO`, `AVULSOS` | Escolhido pelo usuário. `blocoDoLancamento` já decide isso, e `competenciaView` já soma os três | y |
| Forma do gráfico | Barra empilhada horizontal, não pizza | Parte-do-todo com 3 grupos: a barra lê percentual com precisão e fala a mesma língua do `GraficoCategorias` ao lado. Pizza seria defensável (≤6 fatias fixas) mas menos precisa | y |
| Cor das fatias | Uma neutra em três passos, escuro → claro | Os três blocos têm ordem natural (comprometido → discricionário), então a escala é sequencial, não categórica. Três matizes seriam o arco-íris que `globals.css` proíbe, e gastar o azul aqui queimaria a única cor de ação | n |
| Ano na URL | `searchParam` `?ano=AAAA` | Mantém a home Server Component, compartilhável e abrível em nova aba. Mesma escolha de `?visao=` e dos filtros de Lançamentos | n |
| Como o ano é agregado | 12 `listarPorCompetencia` em paralelo | Precedente em `obterVisaoMensal`, que já varre janela fixa assim (AD-008). SQL agregado é a troca a fazer quando o ano ficar lento, e é onde o teste de concordância da Fatia 3 entra | n |
| Estado temporal dos meses na grade | Forma, não cor: passado com hairline sólido, futuro tracejado, corrente com a barra `--primary` | Cor sozinha não distingue para quem não separa matiz. A barra é o mesmo marcador de `navegacao-principal.tsx` | n |

---

## Requirements

### HOME-01 — A raiz mostra o ano

1. WHEN uma pessoa autenticada abre `/`, THE SYSTEM SHALL renderizar a home com o ano corrente,
   resolvido em `America/Sao_Paulo`, sem redirecionar.
2. WHEN a home é renderizada, THE SYSTEM SHALL exibir os 12 meses do ano como links para
   `/{ano}-{mm}`.
3. WHEN a home é renderizada com `?ano=AAAA`, THE SYSTEM SHALL exibir aquele ano em vez do corrente.
4. IF `?ano=` não é um ano de quatro dígitos, THEN THE SYSTEM SHALL usar o ano corrente.
5. WHEN a home exibe o ano corrente, THE SYSTEM SHALL marcar o mês corrente por forma, não apenas
   por cor, e anunciá-lo a leitor de tela.

### HOME-02 — O mês corrente tem destaque

1. WHEN a home é renderizada, THE SYSTEM SHALL exibir um cartão de destaque que leva à competência
   corrente, na superfície invertida do sistema.
2. WHEN a pessoa aciona o cartão de destaque, THE SYSTEM SHALL navegar para `/{competência corrente}`.

### HOME-03 — Composição do mês e do ano

1. WHEN a home é renderizada, THE SYSTEM SHALL exibir a composição das despesas do mês corrente
   entre `FIXOS`, `CARTAO` e `AVULSOS`.
2. WHEN a home é renderizada, THE SYSTEM SHALL exibir a mesma composição para o acumulado das 12
   competências do ano exibido.
3. THE SYSTEM SHALL calcular as fatias pela mesma cascata `blocoDoLancamento` que a lista e o painel
   usam, de modo que os três totais somem exatamente o Total de Gastos.
4. THE SYSTEM SHALL exibir os percentuais somando exatamente 100%.
5. WHEN o total de despesas é zero, THE SYSTEM SHALL exibir estado vazio em vez de barra.
6. THE SYSTEM SHALL rotular cada fatia com nome, valor e percentual em texto, sem depender de cor
   para identificá-la.

---

## Traceability

| Requirement | Implementação | Teste |
| --- | --- | --- |
| HOME-01 | | |
| HOME-02 | | |
| HOME-03 | `domain/mes/composicao-de-blocos.ts` (ACs 3, 4) | `composicao-de-blocos.test.ts` |
