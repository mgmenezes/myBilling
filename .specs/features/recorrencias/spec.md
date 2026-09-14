# Recorrências: Specification

## Problem Statement

Água, luz e internet não têm caminho nenhum no myBilling. O usuário perguntou "como insiro gastos
fixos?" e a resposta hoje é: não insere. O contorno existente — cadastrar uma compra de N parcelas —
serve para internet, que tem valor fixo, e falha exatamente no caso que mais importa: a conta de
energia, cujo valor muda todo mês e que exigiria chutar um número sem forma de corrigi-lo depois.

Pior que a ausência: o bloco **"Fixos"** já existe na lista, filtrando por `origem = 'RECORRENCIA'`.
Ele promete um lugar e nunca entrega conteúdo. Todo mês ele diz "Nenhum lançamento neste bloco" para
uma casa que paga água, luz e internet todo mês.

A auditoria do roadmap (2026-09-14) mostrou que **o trabalho pesado já está feito e migrado**, e que
o adiamento desta fatia se apoiava numa premissa vencida:

- `recorrencia` e `recorrencia_versao` existem, com `vigente_desde` + `valor_previsto_centavos` e
  índice único por `(recorrencia, vigência)` — o versionamento está modelado
- `movimento` tem `recorrencia_id`, `valor_previsto_centavos`, `CHECK` bicondicional e o índice
  único `movimento_recorrencia_competencia_uq`, que **torna a materialização idempotente de graça**
- `resolverValorEfetivo` e `confirmarValorReal` estão escritos e testados: previsto convive com
  real, e confirmar um mês não alcança outro

O que falta é a metade de cima: repositório, materialização, área e formulário.

## Goals

- [ ] Cadastrar um gasto fixo uma vez e vê-lo aparecer em todo mês, sem redigitar
- [ ] Registrar que o valor de uma conta mudou, **a partir do mês escolhido**, sem reescrever o
      histórico do que foi planejado antes
- [ ] Confirmar o valor real quando a conta chega, sem que isso altere nenhum outro mês
- [ ] Ver os fixos na régua de comprometimento futuro, que hoje só enxerga parcelas
- [ ] Cadastrar receita recorrente, para "Receitas do mês" deixar de ser o que o seed inventou
- [ ] Encerrar uma recorrência sem apagar o histórico dela

## Out of Scope

| Feature | Reason |
| --- | --- |
| Recorrência que não é mensal (quinzenal, anual, a cada N meses) | `recorrencia` não tem coluna de periodicidade. Água, luz, internet e salário são todos mensais; adicionar o eixo exige migration e um caso de uso de cálculo de ocorrência que não serve a nenhum dado real da casa hoje |
| Editar descrição, categoria, meio ou pessoa de uma recorrência | Só o **valor** tem versionamento por vigência no banco. Mudar os demais campos altera todas as ocorrências, inclusive passadas, e a semântica disso precisa ser decidida separadamente |
| Excluir uma ocorrência isolada | Ela renasce na próxima materialização. Remover de verdade exigiria marcar a competência como pulada, que é coluna que não existe |
| Notificar vencimento próximo | Não há canal de notificação no app |
| Pagamento de fatura de cartão | Fatia 3 do roadmap. Recorrência no cartão gera lançamento na competência, como qualquer outro |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que acontece quando o valor muda | Nova versão vigente a partir da competência escolhida. Meses anteriores guardam o que foi planejado na época | Escolhido pelo usuário. É o que `recorrencia_versao` já modela, com índice único por vigência — não custa trabalho a mais de banco | y |
| Natureza aceita | Despesa **e** receita | Escolhido pelo usuário. Salário é a receita mais recorrente que existe, e o banco, o domínio e os blocos da lista já tratam receita | y |
| Quando a materialização acontece | Ao abrir um mês, para a competência visível **e** os 3 meses da janela de projeção | Sem job de fundo e sem estado a manter. O índice único torna a repetição inofensiva, e a janela coincide com `MESES_DE_PROJECAO`, que é o alcance da régua de comprometimento futuro. Meses nunca visitados ficam sem linha e se resolvem sozinhos ao serem visitados | n |
| Escrita durante uma leitura de página | Aceita, com `ON CONFLICT DO NOTHING` | Um GET que escreve é cheiro ruim, e a alternativa — materializar só na criação — deixaria buracos em todo mês fora da janela de então. O conflito concorrente é resolvido pelo índice, não por trava. O volume é limitado: janela de 4 meses × recorrências ativas | n |
| O que protege uma ocorrência de ser reescrita | Estar paga **ou** ter valor diferente do previsto | São os dois sinais de que alguém tocou nela. `valorCentavos <> valorPrevistoCentavos` é a definição de `sobrescritaManualmente` no domínio (REC-01, AC 2). Confirmar exatamente o valor previsto é indistinguível de não confirmar, e isso é aceito: o resultado é o mesmo número | n |
| Encerrar uma recorrência | Remove as ocorrências **não pagas** da competência de encerramento em diante; as pagas e as passadas ficam | Cancelar a internet não deve continuar cobrando nos meses à frente, e também não pode apagar o que já foi pago. O histórico permanece íntegro | n |
| Onde o cadastro mora | Área nova **"Fixos"**, ao lado de Visão geral e Lançamentos | O bloco da lista já se chama "Fixos", então a área que os administra tem o mesmo nome. Recorrência tem listar, criar, mudar valor e encerrar: não cabe dentro do formulário de compra, como coube o cadastro de categoria | n |
| Dia de vencimento em mês curto | `diaEfetivo` faz `min(dia, último dia do mês)` | Já implementado e testado para o ciclo de fatura (CART-03, AC 3). Vencimento dia 31 em fevereiro vira 28 | n |
| Onde o valor real é confirmado | Na própria linha da lista, no valor, como edição embutida | Confirmar o valor e marcar pago são o mesmo gesto para quem usa. O selo-botão de pago já está na linha; a confirmação entra ao lado, não numa tela à parte | n |

**Open questions:** none. As duas perguntas de produto foram resolvidas com o usuário e estão acima
com `y`. As linhas com `n` não são perguntas em aberto: são decisões de engenharia tomadas com a
justificativa registrada, sujeitas à revisão desta spec.

---

## User Stories

### P1: Cadastrar um gasto fixo uma vez ⭐ MVP

**User Story**: Como morador da casa, quero cadastrar água, luz e internet uma vez, para que elas
apareçam em todo mês sem eu redigitar nada.

**Why P1**: É a pergunta que originou a fatia, e é a segunda re-digitação que a planilha impunha.

**Acceptance Criteria**

1. WHEN uma recorrência é criada com competência de início THEN o sistema SHALL registrar a
   recorrência e uma versão inicial vigente a partir daquela competência
2. WHEN um mês igual ou posterior à competência de início é aberto THEN o sistema SHALL garantir a
   existência de exatamente um lançamento daquela recorrência naquela competência
3. WHEN um mês anterior à competência de início é aberto THEN o sistema SHALL não criar lançamento
   algum daquela recorrência
4. WHEN a recorrência tem competência de fim preenchida THEN o sistema SHALL não materializar
   ocorrência em competência posterior a ela
5. WHEN o lançamento de uma recorrência é criado THEN o sistema SHALL usar como data de evento o dia
   de vencimento aplicado àquela competência, reduzido ao último dia do mês quando ele não existir
6. WHEN a natureza da recorrência é receita THEN o sistema SHALL criar o lançamento como receita, e
   ele SHALL aparecer no bloco de entradas e não no bloco de fixos

**Independent Test**: Cadastrar "Internet", 120,00, início em 2026-03, vencimento dia 10. Abrir
2026-03, 2026-04 e 2026-05 e encontrar um lançamento em cada, com data 10. Abrir 2026-02 e não
encontrar nenhum.

---

### P1: Materializar sem duplicar ⭐ MVP

**User Story**: Como morador da casa, quero abrir o mesmo mês quantas vezes eu quiser sem que as
contas fixas se multipliquem na lista.

**Why P1**: A materialização acontece durante a leitura da página. Sem a garantia de unicidade, dois
carregamentos simultâneos duplicariam todo gasto fixo, e o total do mês passaria a mentir.

**Acceptance Criteria**

1. WHEN o mesmo mês é aberto mais de uma vez THEN o sistema SHALL manter exatamente um lançamento
   por recorrência por competência
2. WHEN duas materializações da mesma competência ocorrem concorrentemente THEN o sistema SHALL
   gravar apenas uma ocorrência e SHALL não falhar por conflito
3. WHEN uma ocorrência já materializada foi paga THEN a materialização SHALL não alterar seu valor
4. WHEN uma ocorrência já materializada tem valor diferente do previsto THEN a materialização SHALL
   não alterar seu valor

**Independent Test**: Abrir a mesma competência três vezes seguidas e contar os lançamentos da
recorrência: exatamente um. Marcar como pago, abrir de novo, e confirmar que o valor não mudou.

---

### P1: Registrar que o valor mudou ⭐ MVP

**User Story**: Como morador da casa, quero dizer que a conta de luz passou de 180 para 240 a partir
de outubro, para que os meses anteriores continuem mostrando o que eu tinha planejado na época.

**Why P1**: É a diferença entre um cadastro de recorrência que funciona e um que erra exatamente no
mês em que o valor muda — o motivo pelo qual esta fatia foi adiada duas vezes.

**Acceptance Criteria**

1. WHEN uma nova versão é registrada com vigência a partir de uma competência THEN o sistema SHALL
   preservar as versões anteriores e SHALL não alterar nenhuma ocorrência de competência anterior à
   vigência
2. WHEN existe mais de uma versão THEN o sistema SHALL usar, para cada competência, a versão de
   maior vigência que não seja posterior a ela
3. WHEN uma nova versão passa a valer THEN o sistema SHALL atualizar as ocorrências já
   materializadas daquela competência em diante que não estejam pagas nem tenham valor confirmado
4. IF já existe versão com a mesma vigência THEN o sistema SHALL substituir o valor dela em vez de
   criar uma segunda

**Independent Test**: Criar recorrência de 180 vigente em 2026-03. Abrir 2026-03 a 2026-06. Registrar
240 vigente a partir de 2026-05. Conferir que 03 e 04 seguem 180, e que 05 e 06 passaram a 240.

---

### P2: Confirmar o valor real quando a conta chega

**User Story**: Como morador da casa, quero escrever o valor que a conta de luz realmente veio, para
que o mês feche com o número certo sem eu alterar o que estava previsto.

**Why P2**: Sem isso o app fica com uma estimativa permanente. Com isso, o previsto continua sendo
comparável ao real. Depende de P1 estar materializando.

**Acceptance Criteria**

1. WHEN o valor real de uma ocorrência é confirmado THEN o sistema SHALL passar a considerar esse
   valor nos totais e SHALL preservar o valor previsto registrado
2. WHEN o valor real de uma ocorrência é confirmado THEN o sistema SHALL não alterar nenhuma outra
   competência da mesma recorrência
3. WHEN uma ocorrência com valor confirmado é exibida THEN o sistema SHALL indicar que o valor foi
   confirmado, de forma que não dependa só de cor

**Independent Test**: Confirmar 192,40 numa ocorrência prevista em 180,00. Conferir que o total do
mês mudou em 12,40, que o previsto registrado continua 180,00, e que o mês seguinte segue 180,00.

---

### P2: Ver os fixos no comprometimento futuro

**User Story**: Como morador da casa, quero que a régua de "já comprometido nos próximos meses"
inclua água, luz e internet, para que ela pare de subestimar o que já está gasto.

**Why P2**: A régua existe e hoje só enxerga parcelas de compra. Com fixos materializados na janela,
ela passa a responder a pergunta que promete.

**Acceptance Criteria**

1. WHEN a régua de comprometimento futuro é calculada THEN ela SHALL incluir as ocorrências de
   recorrência não pagas das competências seguintes, junto das parcelas
2. WHEN a janela de projeção é materializada THEN o sistema SHALL cobrir as mesmas competências que
   a régua projeta

**Independent Test**: Com uma recorrência de 120,00 ativa, abrir um mês e conferir que cada um dos
três meses da régua aumentou em 120,00.

---

### P3: Encerrar uma recorrência

**User Story**: Como morador da casa, quero encerrar a internet quando eu cancelar o contrato, sem
perder o histórico do que já paguei por ela.

**Why P3**: Necessário para o cadastro não virar lixo acumulado, mas nada quebra enquanto não
existir.

**Acceptance Criteria**

1. WHEN uma recorrência é encerrada a partir de uma competência THEN o sistema SHALL parar de
   materializar ocorrências daquela competência em diante
2. WHEN uma recorrência é encerrada THEN o sistema SHALL remover as ocorrências não pagas daquela
   competência em diante e SHALL preservar as pagas
3. WHEN uma recorrência encerrada é listada THEN o sistema SHALL exibi-la como encerrada em vez de
   ocultá-la

**Independent Test**: Encerrar a partir de 2026-05 uma recorrência com ocorrências pagas em 03 e 04 e
previstas em 05 e 06. Conferir que 03 e 04 seguem, e que 05 e 06 sumiram.

---

## Requirement Traceability

Prefixo `FIXO` e não `REC`: `REC-01` e `REC-02` já pertencem à spec do MVP, onde descrevem o
domínio de valor efetivo. Reusar os números faria duas specs reivindicarem o mesmo identificador.

| ID | User Story | Status |
| --- | --- | --- |
| FIXO-01 | P1: Cadastrar um gasto fixo uma vez | Spec |
| FIXO-02 | P1: Materializar sem duplicar | Spec |
| FIXO-03 | P1: Registrar que o valor mudou | Tasks |
| FIXO-04 | P2: Confirmar o valor real | Spec |
| FIXO-05 | P2: Ver os fixos no comprometimento futuro | Spec |
| FIXO-06 | P3: Encerrar uma recorrência | Spec |

## Success Criteria

- Água, luz e internet cadastradas uma vez aparecem em todo mês aberto, sem ação adicional
- O bloco "Fixos" da lista deixa de estar permanentemente vazio
- Mudar o valor de uma conta não altera nenhum mês anterior à vigência escolhida
- `resolverValorEfetivo` e `confirmarValorReal` deixam de ser domínio sem chamador
- `pnpm verify` em 0 e o e2e provando o ciclo completo: cadastrar, navegar, confirmar, encerrar
