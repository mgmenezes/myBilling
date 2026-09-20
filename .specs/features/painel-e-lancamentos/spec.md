# Painel e Lançamentos (fatia 1): Specification

## Problem Statement

O myBilling hoje é uma tela só: a competência atual, dois blocos de resumo com jargão contábil exposto, uma tabela e um formulário de 400 linhas permanentemente aberto. Não há navegação entre áreas, não há como registrar uma despesa à vista ou uma receita, não há filtro nem busca, e não há como marcar um lançamento como pago pela interface.

A auditoria do código mostrou que a matemática financeira está pronta e testada, mas a camada entre ela e a tela não existe: quatro tabelas do banco (`orcamento_categoria`, `pagamento_fatura`, `recorrencia`, `recorrencia_versao`) não têm nenhum repositório, `regenerarParcelas` tem 153 linhas de domínio testado sem chamador em produção, e `avaliarOrcamento` calcula estouro que nenhuma tela consegue exibir.

Esta é a **primeira de três fatias**. Ela entrega navegação, painel de decisão, listagem com filtros e cadastro rápido de despesa à vista e receita. Gráficos e orçamento ficam na fatia 2; cartões, faturas e edição com escopo ficam na fatia 3.

## Goals

- [ ] Navegar entre Visão geral e Lançamentos preservando o mês selecionado, sem sincronização de estado
- [ ] Entender a situação do mês em poucos segundos, com no máximo quatro indicadores por vez
- [ ] Eliminar o jargão "eixo competência" e "eixo caixa" da interface sem perder a distinção que eles carregam
- [ ] Registrar despesa à vista e receita, além da compra parcelada que já existe
- [ ] Encontrar um lançamento por busca, filtro de categoria, meio de pagamento, pessoa e situação
- [ ] Marcar um lançamento como pago e desfazer, pela interface
- [ ] Tirar o formulário extenso do caminho de quem só quer consultar

## Out of Scope

Explicitamente excluído desta fatia.

| Feature | Reason |
| --- | --- |
| Gráfico de evolução mensal e de gastos por categoria | Fatia 2. Exige repositório de série histórica, que não existe: `listarPorCompetencia` lê um mês só |
| Orçamento por categoria e alerta de estouro | Fatia 2. `avaliarOrcamento` já calcula, mas `orcamento_categoria` não tem repositório e não há tela para definir limite |
| Área de Cartões, faturas e pagamento de fatura | Fatia 3. `pagamento_fatura` não tem repositório; a tabela existe e nada escreve nela |
| Editar e excluir compra parcelada com escopo de série | Fatia 3. `regenerarParcelas` está pronto e sem chamador; a semântica de "esta, as futuras, toda a série" é subsistema próprio |
| Despesa recorrente | Adiada por decisão do usuário. Exige versionamento por vigência, materialização mês a mês e semântica de edição. Entregar versão simples criaria um controle que parece funcionar e erra o mês em que o valor muda |
| CRUD de categorias, meios de pagamento e pessoas | Fatia 3. Hoje só há listagem, e o seed cobre o cadastro inicial |
| Importador da planilha | Fora do MVP inteiro, como já registrado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Como a competência atravessa as áreas | Segmento de rota: `/AAAA-MM` e `/AAAA-MM/lancamentos` | Estado global exigiria sincronização entre áreas e quebraria abrir em nova aba. A rota já existe nesse formato e o e2e depende dela | y |
| Substituição do jargão contábil | Alternador de duas posições, "Planejamento" e "Movimentações", uma visão por vez | Resolve três problemas juntos: tira o jargão, respeita MOV-03 (os eixos nunca aparecem somados) e cabe no limite de quatro indicadores. Assume que os dois eixos raramente precisam ser lidos lado a lado | y |
| Escada de superfícies no tema escuro | `#100F0E` canvas, `#1E1E1A` superfície, `#2E2E28` campo | Medido: os degraus atuais dão 1.104 e 1.101, abaixo do limiar em que a camada é percebida. A escada nova dá 1.145 e 1.224, com texto a 14.74:1 e acento a 7.16:1 | n |
| Onde o cadastro acontece | Painel lateral sobre a tela, aberto por ação "Novo lançamento" | Tira o formulário do fluxo de consulta sem custar uma navegação. Em telas estreitas ocupa a altura inteira, porque campo de formulário em painel curto é hostil no polegar | n |
| Indicador sem dado versus valor zero | Zero é exibido como `R$ 0,00`; ausência de configuração é exibida como texto explicativo | Um traço no lugar de zero faz o usuário achar que houve falha de carregamento | n |
| Rótulo do quarto indicador | "Saldo previsto" em Planejamento, "Saldo do período" em Movimentações | O termo "saldo disponível" seria falso: nenhum dado no sistema representa conta bancária | y |
| Exclusão de lançamento | Só despesa avulsa e receita, com confirmação. Parcela de compra não é excluível nesta fatia | Excluir uma parcela isolada quebra a conservação da soma, que é invariante do domínio (I3). O caminho correto passa pela edição com escopo, que é fatia 3 | n |

**Open questions:** none. Todas resolvidas com o usuário ou registradas como assumption acima.

---

## User Stories

### P1: Navegação com período persistente ⭐ MVP

**User Story**: Como morador da casa, quero circular entre as áreas do app sem perder o mês que estou analisando, para não ter que reselecionar o período a cada troca de tela.

**Why P1**: Sem isso não existe "plataforma", existe uma tela só. Toda a fatia depende desta estrutura.

**Acceptance Criteria**

1. WHEN o usuário navega de Visão geral para Lançamentos THEN o sistema SHALL preservar a competência selecionada, levando-a no endereço da rota de destino
2. WHEN o usuário aciona o controle "Mês atual" THEN o sistema SHALL navegar para a competência correspondente à data de hoje, mantendo a área em que ele já estava
3. WHILE a largura da janela é menor que 768 pixels, o sistema SHALL apresentar a navegação principal como barra inferior fixa, e SHALL apresentá-la como barra lateral a partir dessa largura
4. WHEN a navegação principal é renderizada THEN o sistema SHALL indicar a área ativa por meio que não dependa apenas de cor
5. IF uma área ainda não foi implementada THEN o sistema SHALL omiti-la da navegação, e SHALL não apresentar link para página vazia
6. WHEN o usuário percorre a interface apenas pelo teclado THEN o sistema SHALL manter o foco visível em todos os controles de navegação e SHALL seguir a ordem visual

**Independent Test**: Selecionar Março de 2026 na Visão geral, clicar em Lançamentos, e confirmar que o endereço contém `2026-03` e que a lista mostra aquele mês.

---

### P1: Painel de decisão com visão única ⭐ MVP

**User Story**: Como morador da casa, quero entender em poucos segundos quanto entrou, quanto gastei, quanto falta pagar e o que sobra, sem precisar aprender vocabulário contábil.

**Why P1**: É o objetivo declarado do produto e o problema número um da interface atual.

**Acceptance Criteria**

1. WHEN o painel é renderizado THEN o sistema SHALL apresentar exatamente quatro indicadores principais: receitas, despesas, pendente e saldo
2. WHEN o alternador está em "Planejamento" THEN o sistema SHALL alimentar os quatro indicadores com os valores do eixo competência, e SHALL rotular o saldo como "Saldo previsto"
3. WHEN o alternador está em "Movimentações" THEN o sistema SHALL alimentar os quatro indicadores com os valores do eixo caixa, e SHALL rotular o saldo como "Saldo do período"
4. The system SHALL apresentar uma visão por vez, e SHALL não exibir simultaneamente valores dos dois eixos em nenhuma composição do painel
5. WHEN o usuário aciona um indicador THEN o sistema SHALL abrir a área de Lançamentos com o filtro correspondente já aplicado
6. WHEN o filtro aberto por um indicador é aplicado THEN a soma dos lançamentos listados SHALL ser igual ao valor daquele indicador
7. WHEN o usuário aciona o controle de ajuda ao lado do alternador THEN o sistema SHALL apresentar a explicação da diferença entre os dois eixos, e SHALL mantê-la oculta até esse acionamento
8. IF o mês não possui nenhum lançamento THEN o sistema SHALL apresentar os indicadores com valor zero formatado, e SHALL apresentar um estado vazio com ação de cadastro

**Independent Test**: Abrir um mês com lançamentos, alternar entre as duas visões e confirmar que os quatro indicadores mudam de valor e que o rótulo do saldo acompanha.

---

### P1: Lançamentos com busca e filtro ⭐ MVP

**User Story**: Como morador da casa, quero encontrar um lançamento específico entre dezenas, para conferir o que compõe um total.

**Why P1**: Sem filtro, a reconciliação prometida pelo painel não se completa: o indicador leva à lista e a lista não deixa chegar ao lançamento.

**Acceptance Criteria**

1. WHEN o usuário digita no campo de busca THEN o sistema SHALL restringir a lista aos lançamentos cuja descrição contenha o texto, sem diferenciar maiúsculas de minúsculas nem acentuação
2. WHEN um filtro de categoria, meio de pagamento, pessoa ou situação é aplicado THEN o sistema SHALL restringir a lista e SHALL apresentar um indicador visível de que há filtro ativo
3. WHEN existe filtro ativo THEN o sistema SHALL oferecer um controle para limpar todos os filtros de uma vez
4. WHEN a lista é filtrada THEN o sistema SHALL apresentar o total dos lançamentos visíveis, para que ele possa ser conferido contra o indicador de origem
5. WHEN o conjunto filtrado é vazio THEN o sistema SHALL distinguir na mensagem o caso de nenhum lançamento no mês e o caso de nenhum resultado para o filtro aplicado
6. WHEN a situação de um lançamento é apresentada THEN o sistema SHALL distinguir pendente, pago e vencido por texto, e SHALL não usar cor como único meio
7. IF a competência do lançamento pendente é anterior à competência corrente THEN o sistema SHALL apresentá-lo como vencido
8. WHILE a largura da janela é menor que 768 pixels, o sistema SHALL apresentar descrição, valor, situação e data, e SHALL manter os demais campos acessíveis sob demanda

**Independent Test**: Buscar por parte da descrição de um lançamento conhecido e confirmar que só ele aparece, que o indicador de filtro ativo é exibido e que o total reflete apenas o resultado.

---

### P1: Cadastro rápido de despesa e receita ⭐ MVP

**User Story**: Como morador da casa, quero registrar uma despesa à vista ou uma receita em poucos segundos, sem sair da tela que estou consultando.

**Why P1**: Hoje o app só sabe registrar compra parcelada. Sem isto, o mês nunca fecha e os indicadores nunca correspondem à realidade.

**Acceptance Criteria**

1. WHEN o usuário aciona "Novo lançamento" THEN o sistema SHALL apresentar as opções despesa à vista, compra parcelada e receita
2. WHEN um tipo é selecionado THEN o sistema SHALL apresentar apenas os campos pertinentes àquele tipo
3. WHEN uma despesa à vista é gravada THEN o sistema SHALL criar exatamente um lançamento de natureza despesa e origem avulso na competência selecionada
4. WHEN uma receita é gravada THEN o sistema SHALL criar exatamente um lançamento de natureza receita na competência selecionada
5. WHEN o mesmo formulário é submetido duas vezes com a mesma chave de idempotência THEN o sistema SHALL retornar o lançamento já criado e SHALL manter a contagem inalterada
6. WHEN a gravação é concluída THEN o sistema SHALL apresentar confirmação e SHALL atualizar os indicadores e a lista sem recarga manual da página
7. IF a validação falha THEN o sistema SHALL apresentar a mensagem junto ao campo correspondente e SHALL preservar todo o preenchimento já feito
8. WHEN o usuário tenta fechar o painel com alterações não gravadas THEN o sistema SHALL pedir confirmação antes de descartar
9. WHEN o campo de valor recebe foco THEN o sistema SHALL aceitar o formato monetário brasileiro, e SHALL não exigir que o usuário digite separador de milhar
10. The system SHALL preencher a data da compra com a data corrente no momento da abertura do formulário, e SHALL permitir alterá-la

**Independent Test**: Abrir o painel, registrar uma despesa à vista de R$ 40,00, e confirmar que ela aparece na lista e que o indicador de despesas aumentou em R$ 40,00.

> [!NOTE]
> **Reconciliado com a fatia `lancamento-avulso`, em 2026-09-19.** Esta história foi escrita antes
> dela e três critérios não sobreviveram ao contato com a implementação. Ficam registrados aqui em
> vez de removidos, porque o que mudou e por quê é a informação útil.
>
> **AC 5 (idempotência) — revogado.** A fatia nova recusou chave de idempotência no lançamento
> avulso, e a razão está na spec dela: dois Pix de R$ 50 no mesmo dia são dois Pix, e deduplicar
> impediria o caso legítimo para prevenir um clique duplo que o botão desabilitado já evita. A
> compra parcelada **mantém** a chave, porque lá a duplicata é sempre erro. Vale para `AVUL-01`.
>
> **AC 8 (confirmar antes de descartar) — atendido de outra forma.** O cadastro vive num `<dialog>`
> cujo conteúdo **nunca é desmontado** (AD-014): fechar e reabrir devolve tudo que foi digitado.
> Isso atende a intenção do critério — não perder trabalho — sem o clique extra de um "tem
> certeza?" que apareceria mesmo quando não há nada a perder.
>
> **AC 10 (data corrente) — cumprido, com a qualificação que faltava.** O critério pedia "a data
> corrente" e estaria errado ao pé da letra: quem abre **março** a partir de setembro não quer
> hoje ali, porque cai fora da competência. A regra implementada é **hoje quando hoje pertence ao
> mês aberto, dia 1 quando não**, em `dataPadraoDoLancamento`.

---

### P2: Marcar pago e desfazer

**User Story**: Como morador da casa, quero marcar um lançamento como pago quando o dinheiro sai, para o eixo de movimentações refletir a realidade.

**Why P2**: O repositório já sabe fazer isso; falta o caminho até a tela. Sem ele o eixo Movimentações fica sempre em zero, mas o painel funciona.

**Acceptance Criteria**

1. WHEN o usuário marca um lançamento como pago THEN o sistema SHALL registrar a data de pagamento e SHALL mover o valor de pendente para realizado
2. WHEN o usuário desfaz a marcação THEN o sistema SHALL limpar a data de pagamento e SHALL devolver o valor a pendente
3. WHEN a marcação é alterada THEN o sistema SHALL atualizar os quatro indicadores sem recarga manual da página
4. WHEN uma despesa avulsa ou receita é excluída THEN o sistema SHALL pedir confirmação que nomeia o lançamento antes de remover
5. IF o lançamento é parcela de uma compra parcelada THEN o sistema SHALL não oferecer exclusão, porque remover uma parcela isolada quebraria a conservação da soma da compra

**Independent Test**: Marcar um lançamento pendente como pago e conferir que o indicador de pendente diminui e o de movimentações aumenta no mesmo valor.

---

### P2: Estados, densidade e acessibilidade

**User Story**: Como morador da casa, quero que a interface responda de forma previsível enquanto carrega, quando falha e quando está vazia, e que funcione com teclado e em tela estreita.

**Why P2**: São critérios verificáveis que atravessam todas as telas desta fatia.

**Acceptance Criteria**

1. WHILE os dados de uma área estão sendo carregados, o sistema SHALL apresentar um esqueleto com a forma do conteúdo que virá
2. IF a leitura dos dados falha THEN o sistema SHALL apresentar estado de erro com identificador de correlação, e SHALL não expor mensagem técnica nem rastro de pilha
3. WHEN qualquer estado vazio é apresentado THEN o sistema SHALL oferecer uma ação que permita sair daquele estado
4. WHEN um valor monetário é apresentado em lista ou tabela THEN o sistema SHALL usar algarismos de largura fixa e SHALL alinhar os valores pela direita
5. WHEN a interface é apresentada em viewport de 400 pixels de largura THEN o sistema SHALL não produzir rolagem horizontal, e SHALL não recorrer a ocultar a barra de rolagem
6. WHEN um controle interativo é apresentado THEN o sistema SHALL garantir área de toque de ao menos 44 por 44 pixels
7. WHERE a preferência de movimento reduzido está ativa, o sistema SHALL suprimir transições e animações de entrada

**Independent Test**: Percorrer as duas áreas apenas pelo teclado, em 400 pixels, com movimento reduzido ativo, e confirmar que tudo permanece operável.

---

## Edge Cases

- IF a competência do endereço não corresponde ao formato `AAAA-MM` THEN o sistema SHALL apresentar a página de não encontrado, sem erro não tratado
- IF a busca não retorna nenhum resultado THEN o sistema SHALL manter os filtros aplicados visíveis, e SHALL não limpá-los automaticamente
- IF o valor digitado no cadastro não é um valor monetário válido THEN o sistema SHALL rejeitar com mensagem junto ao campo, e SHALL não gravar
- IF a conexão com o banco falha durante a gravação THEN o sistema SHALL apresentar erro e SHALL preservar o preenchimento do formulário
- WHEN o mês selecionado é o mês corrente THEN o sistema SHALL apresentar o controle "Mês atual" em estado desabilitado ou não apresentá-lo
- WHEN a lista possui mais de cem lançamentos THEN o sistema SHALL permanecer utilizável sem travar a rolagem

---

## Requirement Traceability

> [!IMPORTANT]
> **O recorte por AC abaixo foi reconstruído pelo Verifier em 2026-09-19**, porque esta tabela nunca
> o teve: ela ligava cada requisito a uma *história*, e três requisitos apontando para os seis ACs da
> mesma história tornam "quantos estão cobertos" uma pergunta sem resposta. A reconstrução seguiu as
> únicas âncoras existentes — as citações de ID em `design.md` e em comentários de código
> (`NAV-03, AC 5`; `CAD-04, AC 10`; `LANC-03`; `UX-03`; `DASH-02`/`DASH-03`/`DASH-04`). O recorte
> definitivo é decisão do autor da spec; até lá, vale este, e ele está justificado em
> `validation.md`.

| Requirement ID | Story | ACs | Phase | Status |
| --- | --- | --- | --- | --- |
| NAV-01 | P1: Navegação com período persistente | 1, 2 | Implementing | ❌ Needs Fix — AC 1 provado; **AC 2 ("Mês atual") não implementado** |
| NAV-02 | P1: Navegação com período persistente | 3 | Implementing | ❌ Not Covered |
| NAV-03 | P1: Navegação com período persistente | 4, 5, 6 | Implementing | ⚠️ Partially Verified — ACs 4 e 5 provados; AC 6 pela metade |
| DASH-01 | P1: Painel de decisão com visão única | 1, 8 | Implementing | ❌ Needs Fix — nem a contagem de quatro nem o estado vazio com ação |
| DASH-02 | P1: Painel de decisão com visão única | 2 | Verified | ✅ Verified |
| DASH-03 | P1: Painel de decisão com visão única | 3, 4, 7 | Implementing | ⚠️ Partially Verified — ACs 3 e 4 provados; AC 7 pela metade |
| DASH-04 | P1: Painel de decisão com visão única | 5, 6 | Implementing | ❌ Not Covered — a reconciliação indicador↔lista não tem prova |
| LANC-01 | P1: Lançamentos com busca e filtro | 1 | Implementing | ❌ Not Covered |
| LANC-02 | P1: Lançamentos com busca e filtro | 2, 3, 4 | Implementing | ❌ Not Covered |
| LANC-03 | P1: Lançamentos com busca e filtro | 5 | Implementing | ⚠️ Partially Verified — só o vazio do mês tem prova |
| LANC-04 | P1: Lançamentos com busca e filtro | 6, 7, 8 | Implementing | ❌ Needs Fix — **"vencido" não existe na interface** |
| CAD-01 | P1: Cadastro rápido de despesa e receita | 1, 2 | Verified | ✅ Verified |
| CAD-02 | P1: Cadastro rápido de despesa e receita | 3, 4 | Verified | ✅ Verified |
| CAD-03 | P1: Cadastro rápido de despesa e receita | 5, 6, 7 | Implementing | ⚠️ Partially Verified — ACs 5 e 6 provados; AC 7 pela metade |
| CAD-04 | P1: Cadastro rápido de despesa e receita | 8, 9, 10 | Verified | ✅ Verified (ACs 8 e 10 contra a nota de reconciliação) |
| PAGO-01 | P2: Marcar pago e desfazer | 1, 2, 3 | Verified | ✅ Verified |
| PAGO-02 | P2: Marcar pago e desfazer | 4, 5 | Verified | ✅ Verified |
| UX-01 | P2: Estados, densidade e acessibilidade | 1, 2, 3 | Implementing | ❌ Needs Fix — AC 2 provado; AC 1 pela metade; AC 3 sem implementação |
| UX-02 | P2: Estados, densidade e acessibilidade | 4, 5 | Implementing | ❌ Needs Fix — AC 5 provado; AC 4 sem prova |
| UX-03 | P2: Estados, densidade e acessibilidade | 6, 7 | Implementing | ❌ Not Covered — 44×44 violado; movimento reduzido sem teste |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** contagem e status são estabelecidos pelo Verifier independente em `validation.md`. Esta tabela não afirma completude por conta própria.

**Veredito de 2026-09-19 — FAIL.** 6 de 20 requisitos verificados; 4 parciais; 10 sem evidência
suficiente. 44 critérios numerados: 22 ✅, 6 ⚠️, 16 ❌. Sensor de discriminação: 15 mutações, 4
mortas, **11 sobreviventes**. O relatório completo, com `file:line` por critério e o conserto exato
de cada lacuna, está em `.specs/features/painel-e-lancamentos/validation.md`.

---

## Success Criteria

- [ ] Selecionar um mês na Visão geral e ir para Lançamentos mantém o mês, comprovado pelo endereço
- [ ] O painel apresenta quatro indicadores e nenhuma composição mistura os dois eixos
- [ ] Acionar o indicador de despesas abre a lista filtrada cuja soma é igual ao indicador
- [ ] Registrar uma despesa à vista atualiza indicador e lista sem recarga manual
- [ ] Buscar por descrição encontra o lançamento e o total reflete apenas o resultado
- [ ] Marcar pago move o valor de pendente para movimentações no mesmo montante
- [ ] As duas áreas são operáveis apenas por teclado, em 400 pixels, com movimento reduzido ativo
- [ ] Nenhum valor financeiro real da família aparece em seed, fixture ou artefato versionado
