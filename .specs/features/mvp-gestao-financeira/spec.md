# MVP Gestão Financeira Doméstica — Specification

## Problem Statement

Moisés e Ana controlam as finanças da casa numa planilha do Google Sheets com uma aba por mês. Compras parceladas precisam ser re-digitadas manualmente em cada aba futura — o print de Março mostra 12 parcelamentos ativos, cada um exigindo uma digitação por mês. Esquecer uma parcela corrompe o saldo apresentado, que é justamente o número usado para decidir gastos.

A planilha também mistura dois regimes contábeis sem sinalizar: o bloco "Saídas" (R$ 9.400,00) mede caixa e os blocos de gasto (R$ 8.200,00) medem competência, divergindo em R$ 1.200,00 sem explicação visível.

Esta feature entrega as Fases 0 a 6 do design aprovado: núcleo financeiro puro e testado, persistência, autenticação e o corte vertical mínimo que resolve a dor central.

## Goals

- [ ] Cadastrar uma compra parcelada **uma única vez** e ver as parcelas nos meses seguintes sem nenhuma ação adicional
- [ ] Garantir que a soma das parcelas seja **exatamente** igual ao valor total da compra, em qualquer divisão
- [ ] Cadastrar uma compra **já em andamento** (ex: parcela 8 de 10) sem criar despesas pendentes nos sete meses anteriores
- [ ] Distribuir parcelas corretamente na **virada de ano**
- [ ] Tornar a **dupla contagem estruturalmente impossível** entre compra no cartão e pagamento da fatura
- [ ] Navegar entre meses por seletor, sem criar estrutura nova a cada mês
- [ ] Restringir o acesso às duas pessoas autorizadas

## Out of Scope

Explicitamente excluído desta feature. Documentado para prevenir scope creep.

| Feature | Reason |
| --- | --- |
| Importador CSV das abas mensais | O exportador da Fase 9 precisa definir o formato primeiro. O modelo já nasce preparado com `origem_dado` e `origem_hash` |
| UI de marcar pago, lançamento avulso e recorrência | Fase 7. O domínio é construído e testado aqui, mas sem tela |
| UI de orçamento e dashboard com gráficos | Fase 8. O usuário optou por usar 2 semanas com dados reais antes, para calibrar os limites com histórico |
| Exportação e deploy em produção | Fase 9 |
| Tela de conciliação competência ↔ caixa | Explica os R$ 1.200,00 linha a linha. Valiosa, mas não é MVP |
| Fechamento de mês (`competencia_mes`) e changelog completo (`auditoria`) | `pago_em` já torna imutável o que foi pago. Adiáveis sem retrabalho |
| Lançamento privado (`visibilidade`) | Aditivo: coluna com default mais um `WHERE`. Custo zero de retrabalho ao adiar |
| Migração do histórico da planilha | O usuário optou por cadastro manual. O histórico antigo permanece na planilha |
| Notificações, PWA/offline, anexos, metas, acerto de contas entre pessoas | Fora do MVP por decisão do usuário |
| Integrações bancárias, IA, Open Finance | Descartados por pedido explícito do usuário |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Destaque vermelho na coluna "Valor gasto" da planilha | Ignorar; não reproduzir | O usuário não o explicou e é inconsistente nos dados: Mercado R$ 820,00 está vermelho abaixo do limite de R$ 900,00, enquanto Pets outros R$ 140,00 não está abaixo de R$ 250,00. Tratado como formatação manual residual | n |
| Fuso horário para converter data em competência | `America/Sao_Paulo`, passado como parâmetro explícito para a função de conversão | Sem fuso fixo, uma compra às 21h de 31/03 em UTC cairia em abril. Parâmetro explícito em vez de global torna o comportamento testável | n |
| Compra feita exatamente no dia do fechamento do cartão | Entra na fatura **seguinte**, configurável por cartão | É o comportamento mais comum entre emissores brasileiros. A competência permanece o mês da compra em qualquer configuração, então o risco do default errado é baixo | n |
| Alocação do centavo residual do rateio | **Primeiras** parcelas: R$ 100,00 em 3x gera 33,34 / 33,33 / 33,33 | É a prática dominante das operadoras brasileiras, então o valor no app bate com a fatura real — o único critério que o usuário consegue conferir. Também deixa o saldo devedor monotônico, simplificando a redistribuição ao editar | n |
| Excluir categoria que possui lançamentos | Bloquear a exclusão e oferecer arquivar ou realocar | Apagar em cascata destruiria histórico financeiro. Arquivar remove a categoria dos formulários mantendo os relatórios íntegros | n |
| Duas pessoas editam o mesmo lançamento simultaneamente | Lock otimista por coluna `versao`, respondendo 409 com o estado atual | Last-write-wins silencioso em dado financeiro é indefensável, e o volume de dois usuários não justifica nada mais elaborado | n |
| Autenticação | Google OAuth com allowlist de dois e-mails em variável de ambiente | Zero senha armazenada, zero SMTP, zero fluxo de reset, 2FA herdado do Google. Para exatamente duas pessoas, allowlist é autorização suficiente | n |
| Número máximo de parcelas aceito | 120 | Cobre folgadamente o maior parcelamento plausível (10 anos) e impede entrada acidental absurda | n |

**Open questions:** none — todas resolvidas com o usuário nas três rodadas de perguntas ou registradas como assumption acima.

---

## User Stories

### P1: Compra parcelada com distribuição automática ⭐ MVP

**User Story**: Como Moisés, quero cadastrar uma compra parcelada uma única vez para que as parcelas apareçam sozinhas nos meses seguintes, sem eu precisar re-digitar nada.

**Why P1**: É a dor central que motivou o projeto. Sem isso, o app não substitui a planilha.

**Acceptance Criteria**

1. WHEN uma compra de R$ 1.000,00 em 3 parcelas é cadastrada com competência de compra 2026-03 THEN o sistema SHALL persistir exatamente 3 parcelas com valores 33334, 33333 e 33333 centavos, nas competências 2026-03, 2026-04 e 2026-05
2. WHEN qualquer compra parcelada é persistida THEN o sistema SHALL garantir que a soma dos valores das parcelas persistidas mais o valor amortizado anterior seja exatamente igual ao valor total da compra, em centavos
3. WHEN o valor total não é divisível pelo número de parcelas THEN o sistema SHALL alocar um centavo adicional a cada uma das primeiras `resto` parcelas, onde `resto = total − (total ÷ n) × n`
4. WHEN uma compra é cadastrada informando o valor da parcela em vez do valor total THEN o sistema SHALL calcular o total como `valor_parcela × quantidade` e gerar parcelas todas de valor idêntico, com resto zero
5. IF o número de parcelas é maior que o valor total em centavos THEN o sistema SHALL rejeitar a operação com o código `PARCELA_INFERIOR_A_UM_CENTAVO` e não persistir nada
6. IF o número de parcelas é menor que 1 ou maior que 120 THEN o sistema SHALL rejeitar a operação com o código `QTD_PARCELAS_INVALIDA`
7. IF o valor total é menor que 1 centavo THEN o sistema SHALL rejeitar a operação com o código `VALOR_NAO_POSITIVO`
8. IF a persistência de qualquer parcela falha THEN o sistema SHALL reverter toda a transação, não deixando a compra sem suas parcelas
9. WHEN o mesmo formulário de compra é submetido duas vezes com a mesma chave de idempotência THEN o sistema SHALL retornar a compra já criada e SHALL manter a contagem de parcelas inalterada

**Independent Test**: Cadastrar R$ 1.000,00 em 3x com competência 2026-03 pela interface, navegar para 2026-04 e 2026-05, e encontrar as parcelas 2/3 e 3/3 com R$ 333,33 cada — sem nenhuma ação adicional entre as navegações.

---

### P1: Virada de ano e aritmética de calendário ⭐ MVP

**User Story**: Como usuário, quero que as parcelas atravessem a virada de ano corretamente para que compras feitas em novembro e dezembro não sumam ou caiam no mês errado.

**Why P1**: A planilha tem abas JAN/27, FEV/27 e MAR/27 justamente por causa disso. Errar aqui corrompe silenciosamente os meses seguintes.

**Acceptance Criteria**

1. WHEN uma compra com competência 2026-11 é parcelada em 5 vezes THEN o sistema SHALL gerar as competências 2026-11, 2026-12, 2027-01, 2027-02 e 2027-03
2. WHEN uma compra com competência 2026-11 é parcelada em 24 vezes THEN o sistema SHALL gerar a última parcela na competência 2028-10, sem nenhuma competência repetida
3. WHEN uma data com horário é convertida em competência THEN o sistema SHALL usar o fuso `America/Sao_Paulo` recebido como parâmetro explícito, de modo que a data 2026-03-31T23:30:00Z resulte na competência 2026-03
4. WHEN uma competência recebe um deslocamento negativo de meses THEN o sistema SHALL retroceder o ano corretamente, de modo que 2026-01 deslocada em −1 mês resulte em 2025-12
5. The system SHALL representar competência como a string `'YYYY-MM'` e SHALL calcular deslocamento de meses por aritmética inteira, sem usar objeto de data nativo

**Independent Test**: Cadastrar uma compra em 2026-12 em 3x e confirmar que as parcelas aparecem em dezembro de 2026, janeiro de 2027 e fevereiro de 2027.

---

### P1: Compra já em andamento ⭐ MVP

**User Story**: Como Moisés, quero cadastrar uma compra que já está na parcela 8 de 10 para que o app assuma o controle das três parcelas restantes sem inventar despesas nos sete meses anteriores.

**Why P1**: Todas as 12 compras parceladas ativas hoje estão em andamento. Sem isso, não há como migrar da planilha.

**Acceptance Criteria**

1. WHEN uma compra é cadastrada informando que a parcela inicial é a 8 de 10 THEN o sistema SHALL persistir exatamente 3 parcelas, numeradas 8, 9 e 10
2. WHEN uma compra é cadastrada com parcela inicial maior que 1 THEN o sistema SHALL registrar a soma das parcelas 1 até `inicial − 1` no campo `valor_amortizado_anterior_centavos` da compra
3. WHEN uma compra é cadastrada com parcela inicial maior que 1 THEN o sistema SHALL criar zero lançamentos em competências anteriores à competência da parcela inicial
4. WHILE uma compra possui valor amortizado anterior maior que zero, o sistema SHALL manter esse valor fora de todo somatório de despesa
5. WHEN uma compra é cadastrada na última parcela, como 10 de 10 THEN o sistema SHALL persistir exatamente 1 parcela
6. IF a parcela inicial informada é maior que a quantidade de parcelas THEN o sistema SHALL rejeitar a operação com o código `PARCELA_INICIAL_INVALIDA`
7. WHEN uma compra em andamento é exibida THEN o sistema SHALL apresentar a identificação da parcela no formato `8/10` e a quantidade de parcelas restantes

**Independent Test**: Cadastrar a compra "Abraão" com valor de parcela R$ 60,00, 10 parcelas, iniciando na parcela 8 na competência 2026-03; confirmar 3 lançamentos em março, abril e maio de 2026 e nenhum lançamento antes de março.

---

### P1: Visão do mês e navegação ⭐ MVP

**User Story**: Como usuário, quero abrir um mês e ver o que está comprometido nele para que eu saiba quanto ainda tenho disponível.

**Why P1**: Sem uma tela que leia os dados, o núcleo de parcelamento não entrega valor observável.

**Acceptance Criteria**

1. WHEN o usuário acessa a raiz autenticado THEN o sistema SHALL redirecionar para a rota da competência corrente no formato `/AAAA-MM`
2. WHEN o usuário seleciona outro mês no seletor THEN o sistema SHALL navegar para a rota daquela competência sem exigir nenhuma criação de estrutura prévia
3. IF a competência na URL não corresponde ao formato `AAAA-MM` ou representa um mês inexistente THEN o sistema SHALL responder com a página de não encontrado, sem lançar erro não tratado
4. WHEN a visão mensal é montada THEN o sistema SHALL apresentar o Total de Gastos do eixo competência e o total de Saídas do eixo caixa em blocos visualmente separados, cada um rotulado com o eixo correspondente
5. WHEN a visão mensal é montada THEN o sistema SHALL segmentar os lançamentos por origem em Fixos, Cartão de Crédito e Gastos do Mês, reproduzindo os três blocos da planilha
6. WHEN um mês não possui nenhum lançamento THEN o sistema SHALL apresentar um estado vazio explicativo, e não uma tabela em branco
7. WHILE os dados do mês estão sendo carregados, o sistema SHALL apresentar um estado de carregamento
8. IF a leitura dos dados do mês falha THEN o sistema SHALL apresentar um estado de erro com identificador de correlação, sem expor stack trace ao navegador
9. WHEN a tela é exibida em viewport de 400 pixels de largura THEN o sistema SHALL apresentar os lançamentos em cartões empilhados, sem rolagem horizontal da página

**Independent Test**: Fazer login, confirmar que a URL contém a competência corrente, navegar para o mês seguinte pelo seletor e voltar, observando os três blocos e os dois eixos rotulados.

---

### P1: Acesso restrito às duas pessoas ⭐ MVP

**User Story**: Como Moisés, quero que só eu e Ana acessemos o aplicativo para que nossos dados financeiros não fiquem expostos.

**Why P1**: A aplicação fica pública na internet e contém todos os dados financeiros da família.

**Acceptance Criteria**

1. WHEN um usuário não autenticado acessa qualquer rota protegida THEN o sistema SHALL redirecionar para `/login`
2. IF um e-mail fora da lista de e-mails permitidos completa o fluxo do Google THEN o sistema SHALL negar o acesso com status 403 e SHALL não criar nenhum registro de usuário
3. WHEN uma Server Action é invocada THEN o sistema SHALL validar a sessão na primeira instrução, independentemente da proteção de middleware
4. WHEN uma Server Action recebe dados THEN o sistema SHALL revalidar o payload no servidor, mesmo que o cliente já tenha validado
5. IF uma variável de ambiente obrigatória está ausente na inicialização THEN o sistema SHALL encerrar o processo com erro explícito, e SHALL não iniciar com valor indefinido
6. The system SHALL manter todo segredo fora do bundle do navegador, sem nenhuma variável sensível prefixada com `NEXT_PUBLIC_`

**Independent Test**: Acessar a raiz sem sessão e observar o redirecionamento; autenticar com um e-mail fora da allowlist e observar 403 sem criação de usuário no banco.

---

### P1: Integridade do razão e anti-dupla-contagem ⭐ MVP

**User Story**: Como usuário, quero confiar que nenhum valor é contado duas vezes para que o total de gastos seja verdadeiro.

**Why P1**: A dupla contagem entre compra no cartão e pagamento da fatura é o erro que mais corrompe controles financeiros caseiros, e o usuário pediu isso explicitamente.

**Acceptance Criteria**

1. WHEN qualquer total de despesa é calculado THEN o sistema SHALL somar exclusivamente a tabela de lançamentos, e SHALL não somar valores das tabelas de plano de compra parcelada nem de recorrência
2. WHEN o pagamento de uma fatura é registrado THEN o sistema SHALL gravá-lo em tabela própria, sem natureza e sem categoria, de modo que nenhuma consulta do eixo competência consiga lê-lo
3. WHEN a resposta da visão mensal é montada THEN o sistema SHALL entregar os valores de competência, de caixa e de comprometimento futuro em três objetos distintos, sem nenhum campo que some valores de objetos diferentes
4. WHEN um lançamento de natureza investimento existe no mês THEN o sistema SHALL mantê-lo fora do Total de Gastos e fora das Saídas, e SHALL subtraí-lo do saldo
5. WHEN o saldo de um mês é calculado THEN o sistema SHALL aplicar `Entradas − Saídas − Investimentos`
6. WHEN a mesma parcela de uma compra é gerada duas vezes THEN o sistema SHALL rejeitar a segunda pela restrição de unicidade de compra mais número de parcela
7. WHEN as porcentagens de distribuição por categoria são calculadas THEN o sistema SHALL usar o Total de Gastos do eixo competência como denominador, de modo que a soma das porcentagens seja 100,00%
8. IF o Total de Gastos do mês é zero THEN o sistema SHALL retornar porcentagem de distribuição zero para todas as categorias, sem divisão por zero

**Independent Test**: Semear um mês com uma compra de cartão e o pagamento da fatura correspondente, e confirmar que o Total de Gastos conta o valor uma única vez.

---

### P2: Ciclo de fatura do cartão

**User Story**: Como usuário, quero que o app saiba o fechamento e o vencimento de cada cartão para que eu veja quanto vai vir em cada fatura.

**Why P2**: O usuário confirmou que quer o recurso e conhece as datas, mas ele não altera nenhum número do eixo competência — a visão mensal funciona sem ele.

**Acceptance Criteria**

1. WHEN uma compra é alocada a uma fatura THEN o sistema SHALL determinar a fatura pelo dia de fechamento do cartão, e SHALL manter a competência do lançamento como o mês da compra, independentemente do fechamento
2. WHEN uma compra ocorre exatamente no dia de fechamento de um cartão configurado como fatura seguinte THEN o sistema SHALL alocá-la à fatura seguinte
3. IF o dia de fechamento configurado não existe no mês corrente, como 31 em fevereiro THEN o sistema SHALL usar o último dia daquele mês
4. WHEN ciclos consecutivos de fatura são gerados THEN o sistema SHALL garantir que o início de cada ciclo seja o dia seguinte ao fim do ciclo anterior, sem intervalo vazio e sem sobreposição
5. WHEN um meio de pagamento é do tipo conta corrente ou rótulo THEN o sistema SHALL não gerar fatura nem exigir dia de fechamento
6. WHILE um cartão está arquivado, o sistema SHALL manter as parcelas pendentes existentes contabilizadas e SHALL continuar gerando faturas até a última parcela ser quitada
7. IF uma nova compra é cadastrada em um meio de pagamento arquivado THEN o sistema SHALL rejeitar a operação com o código `MEIO_PAGAMENTO_ARQUIVADO`

**Independent Test**: Cadastrar um cartão com fechamento dia 25 e vencimento dia 5, lançar compras em 20, 25 e 26 de março, e confirmar que as três permanecem na competência 2026-03 mas caem em faturas diferentes.

---

### P2: Previsto versus realizado

**User Story**: Como usuário, quero distinguir o que já saiu da conta do que ainda vai sair para que eu saiba quanto está pendente.

**Why P2**: O domínio é construído e testado nesta feature; a interface de marcar pago fica para a Fase 7.

**Acceptance Criteria**

1. WHEN um lançamento possui data de pagamento preenchida THEN o sistema SHALL considerá-lo realizado, e SHALL considerá-lo previsto caso contrário
2. WHEN o total pendente de um mês é calculado THEN o sistema SHALL somar apenas os lançamentos de despesa daquela competência sem data de pagamento
3. WHEN o comprometimento futuro é calculado THEN o sistema SHALL somar os lançamentos de despesa sem pagamento de competências posteriores ao mês corrente, SHALL quebrar o resultado por competência e SHALL não agregá-lo em um único número
4. WHILE um lançamento possui data de pagamento preenchida, o sistema SHALL rejeitar alteração de valor, de competência e de meio de pagamento sem estorno explícito

**Independent Test**: Marcar um lançamento como pago via caso de uso e confirmar que ele migra de pendente para realizado sem alterar o valor previsto registrado.

---

### P2: Orçamento por categoria

**User Story**: Como usuário, quero ver quanto de cada categoria já consumi e quanto ela pesa no total para que eu saiba onde cortar.

**Why P2**: O usuário optou por usar o app 2 semanas antes de construir a tela de orçamento, para calibrar os limites com histórico real. O cálculo é construído e testado agora.

**Acceptance Criteria**

1. WHEN a avaliação de orçamento de uma categoria é calculada THEN o sistema SHALL produzir a porcentagem de consumo como `gasto ÷ limite` e a porcentagem de distribuição como `gasto ÷ total de gastos`, como dois campos distintos
2. WHEN o gasto de uma categoria excede seu limite THEN o sistema SHALL retornar porcentagem de consumo maior que 100 e SHALL sinalizar estouro, sem truncar o valor
3. IF uma categoria não possui limite definido no mês THEN o sistema SHALL retornar porcentagem de consumo nula, e SHALL não retornar zero nem infinito
4. WHEN o indicador global do mês é calculado THEN o sistema SHALL aplicar `total gasto ÷ soma dos limites do mês`
5. IF a soma dos limites do mês é zero THEN o sistema SHALL retornar indicador global nulo, sem produzir `NaN`
6. WHEN um limite de categoria é definido THEN o sistema SHALL associá-lo a uma competência específica, de modo que alterar o limite de um mês não altere outro mês

**Independent Test**: Avaliar uma categoria com limite R$ 1.000,00 e gasto R$ 2.460,00 e confirmar consumo de 246,0% com sinalização de estouro, e distribuição calculada sobre o total de gastos.

---

### P3: Recorrência com valor variável

**User Story**: Como usuário, quero que contas como a Celpe apareçam com um valor previsto e eu confirme o valor real quando a conta chegar, sem bagunçar os outros meses.

**Why P3**: Só entrega valor completo com a UI da Fase 7. O cálculo puro é construído aqui porque o modelo de dados depende dele.

**Acceptance Criteria**

1. WHEN o valor real de uma ocorrência de recorrência é confirmado THEN o sistema SHALL alterar apenas o lançamento daquela competência, SHALL preservar o valor previsto original e SHALL não alterar nenhuma outra competência
2. WHEN uma ocorrência recebe confirmação manual THEN o sistema SHALL marcá-la como sobrescrita, de modo que uma nova materialização não altere seu valor
3. WHEN a materialização de recorrências é executada mais de uma vez para a mesma competência THEN o sistema SHALL não criar lançamento duplicado
4. WHEN o valor de uma recorrência muda a partir de uma competência THEN o sistema SHALL registrar uma nova versão vigente, e SHALL preservar as competências anteriores inalteradas
5. WHILE uma recorrência não possui competência de fim, o sistema SHALL materializar ocorrências em uma janela rolante limitada, e SHALL não gerar ocorrências indefinidamente

**Independent Test**: Materializar uma recorrência de R$ 300,00 em três meses, confirmar R$ 347,50 no mês do meio, e verificar que os outros dois meses permanecem em R$ 300,00.

---

## Edge Cases

- IF o valor total é R$ 0,05 e o número de parcelas é 3 THEN o sistema SHALL gerar os valores 2, 2 e 1 centavos, somando exatamente 5
- IF o valor total é R$ 1.000,01 e o número de parcelas é 7 THEN o sistema SHALL gerar seis parcelas de 14286 centavos e uma de 14285, somando exatamente 100001
- IF o valor total é R$ 0,02 e o número de parcelas é 3 THEN o sistema SHALL rejeitar com `PARCELA_INFERIOR_A_UM_CENTAVO`
- IF o valor total é R$ 0,03 e o número de parcelas é 3 THEN o sistema SHALL gerar três parcelas de 1 centavo
- WHEN uma compra possui exatamente 1 parcela THEN o sistema SHALL gerar um único lançamento na competência da compra
- WHEN uma compra de R$ 99.999,99 é parcelada em 120 vezes THEN o sistema SHALL preservar a soma exata, sem estouro de inteiro
- IF um módulo dentro da camada de domínio importa qualquer símbolo de framework, de banco ou de infraestrutura THEN a suíte de testes SHALL falhar
- IF um arquivo versionado do repositório contém valores financeiros reais da família THEN a revisão SHALL tratá-lo como defeito

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PARC-01 | P1: Compra parcelada com distribuição automática | Tasks | Implementing |
| PARC-02 | P1: Compra parcelada com distribuição automática | Tasks | Implementing |
| PARC-03 | P1: Compra parcelada com distribuição automática | Tasks | Implementing |
| PARC-04 | P1: Compra parcelada com distribuição automática | Tasks | Implementing |
| PARC-05 | P1: Compra parcelada com distribuição automática | Tasks | Implementing |
| PARC-06 | P1: Compra já em andamento | Tasks | Implementing |
| PARC-07 | P1: Compra já em andamento | Tasks | Implementing |
| PARC-08 | P1: Compra já em andamento | Tasks | Implementing |
| COMP-01 | P1: Virada de ano e aritmética de calendário | Fase 1-2 | Verified |
| COMP-02 | P1: Virada de ano e aritmética de calendário | Fase 1-2 | Verified |
| COMP-03 | P1: Virada de ano e aritmética de calendário | Fase 1-2 | Verified |
| COMP-04 | P1: Virada de ano e aritmética de calendário | Fase 1-2 | Verified |
| MOV-01 | P1: Integridade do razão e anti-dupla-contagem | Fase 3 | Implementing |
| MOV-02 | P1: Integridade do razão e anti-dupla-contagem | Design | Pending |
| MOV-03 | P1: Integridade do razão e anti-dupla-contagem | Fase 3 | Implementing |
| MOV-04 | P1: Integridade do razão e anti-dupla-contagem | Fase 3 | Implementing |
| MOV-05 | P1: Integridade do razão e anti-dupla-contagem | Fase 3 | Implementing |
| MOV-06 | P2: Previsto versus realizado | Fase 3 | Implementing |
| CART-01 | P2: Ciclo de fatura do cartão | Tasks | Implementing |
| CART-02 | P2: Ciclo de fatura do cartão | Tasks | Implementing |
| CART-03 | P2: Ciclo de fatura do cartão | Tasks | Implementing |
| ORC-01 | P2: Orçamento por categoria | Fase 3 | Verified |
| ORC-02 | P2: Orçamento por categoria | Fase 3 | Implementing |
| REC-01 | P3: Recorrência com valor variável | Fase 3 | Verified |
| REC-02 | P3: Recorrência com valor variável | Fase 3 | Implementing |
| AUTH-01 | P1: Acesso restrito às duas pessoas | Design | Pending |
| AUTH-02 | P1: Acesso restrito às duas pessoas | Design | Pending |
| UI-01 | P1: Visão do mês e navegação | Design | Pending |
| UI-02 | P1: Visão do mês e navegação | Design | Pending |
| UI-03 | P1: Visão do mês e navegação | Design | Pending |
| DADO-01 | P1: Compra parcelada com distribuição automática | Fase 3 | Implementing |
| DADO-02 | P1: Integridade do razão e anti-dupla-contagem | Design | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 32 total, 0 mapped to tasks, 32 unmapped

---

## Success Criteria

- [ ] Cadastrar R$ 1.000,00 em 3x na competência 2026-03 e encontrar as parcelas 2/3 e 3/3 em 2026-04 e 2026-05 sem nenhuma ação adicional
- [ ] Teste de propriedade confirma que a soma das parcelas é igual ao total para toda combinação de valor entre 1 e 10.000.000 centavos e de 1 a 120 parcelas
- [ ] Cadastrar uma compra na parcela 8 de 10 produz exatamente 3 lançamentos e zero lançamentos em competências anteriores
- [ ] Cobertura de 100% de branches em `src/domain`
- [ ] Importar símbolo de framework dentro de `src/domain` faz a suíte de testes falhar
- [ ] E-mail fora da allowlist recebe 403 e não cria registro de usuário
- [ ] A tela do mês não produz rolagem horizontal em viewport de 400 pixels
- [ ] Nenhum valor financeiro real da família aparece em arquivo versionado
