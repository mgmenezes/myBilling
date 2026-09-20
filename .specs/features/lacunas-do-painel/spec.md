# Lacunas do painel e da lista: Specification

## Problem Statement

A verificação independente de `painel-e-lancamentos`, em 2026-09-19, devolveu **FAIL**: 6 dos 20
requisitos têm evidência de verdade, e o sensor de discriminação matou **4 de 15** mutantes.

O número que resume o problema: um único mutante quebrou **cinco comportamentos ao mesmo tempo** —
`filtrarLancamentos` parou de filtrar, o indicador "Despesas do mês" passou a apontar para
`natureza=RECEITA`, a busca deixou de chegar à URL, a media query de movimento reduzido foi
invertida, e o painel de filtros sumiu inteiro da página — e as **1.049 provas continuaram verdes**.

O padrão é nítido e vale mais que a contagem: **onde uma fatia posterior escreveu teste, o
comportamento está preso; onde a fatia 1 ficou sozinha, nada segura.** Não é que ela esteja
quebrada — a maior parte funciona. É que ela não tem rede, e o gate verde não percebe.

Junto com a ausência de rede vieram três defeitos que ninguém tinha visto, porque nenhum teste
olhava para lá.

## Goals

- [ ] "Vencido" deixar de ser opção que nunca casa com nada
- [ ] Voltar ao mês corrente sem perder a área em que se está
- [ ] Todo estado vazio oferecer a ação que tira dele
- [ ] Os dois controles mais tocados do app respeitarem a área de toque mínima
- [ ] Busca, filtros e a reconciliação indicador ↔ lista ganharem os testes que nunca tiveram
- [ ] Os mutantes que sobreviveram à verificação passarem a morrer

## Out of Scope

| Feature | Reason |
| --- | --- |
| Reescrever a lista ou o painel | Eles funcionam. O que falta é rede e três consertos pontuais; refatorar sob a mesma ausência de teste seria trocar risco conhecido por risco novo |
| A dívida de largura de coluna da tabela | Está no roadmap como dívida de interface, é decisão de desenho e não de correção, e mexer nela junto confundiria o que esta fatia prova |
| Esqueleto de carregamento redesenhado por completo | A forma nova depende de decisão visual; aqui ele só passa a ter a contagem certa de blocos |
| Recortar a rastreabilidade das outras fatias por AC | `recorrencias` e `home-do-ano` têm o mesmo problema. Consertar aqui e registrar a dívida lá |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| De onde vem a competência corrente | De `hojeEm()`, no fuso da casa, resolvido no servidor | É a mesma fonte que `dataPadrao` já usa desde a reconciliação do `CAD-04`. Usar o segmento de rota é exatamente o defeito: todo lançamento listado é daquela competência, então a comparação nunca é verdadeira | n |
| O que "vencido" significa | Lançamento não pago de competência **anterior** à corrente | É a definição que `situacaoDe` já tem. O defeito nunca foi a regra, foi o argumento que ela recebia | n |
| Onde fica o controle "Mês atual" | No seletor de competência, ao lado das setas | É onde a pessoa já está navegando. `design.md` previa um `seletor-periodo.tsx` próprio que nunca existiu; criar componente novo agora seria inventar estrutura para um botão | n |
| O que ele faz no mês corrente | Fica desabilitado, e não oculto | Sumir muda o layout do seletor conforme o mês, e um controle que aparece e desaparece é mais confuso que um apagado. É o edge case que a spec já listava | n |
| Como a área de toque chega a 44×44 | `min-h-11 min-w-11` nos dois botões | A pílula cresce, e isso é aceito: o alvo real precisa ter o tamanho do alvo declarado. Estender por pseudo-elemento daria o alvo sem o feedback visual, e no celular os dois ficam encostados — a pessoa precisa **ver** onde um acaba | n |
| Como a área de toque é provada | Medindo `getBoundingClientRect()` em 400px, no e2e | Assertion sobre classe CSS provaria que a classe está escrita, não que o alvo tem o tamanho. Foi assim que o critério regrediu sem ninguém ver | n |
| O que o vazio do mês oferece | O mesmo controle que abre o diálogo de cadastro | O texto atual diz "Cadastre um **abaixo**" e o cadastro subiu para o topo no AD-014 — a frase passou a mentir. Oferecer o controle resolve o texto e o critério de uma vez | n |

**Open questions:** none. As decisões acima são de engenharia, tomadas com a justificativa
registrada, sujeitas à revisão desta spec.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação e limites de entrada | N/A porque esta fatia não acrescenta entrada de dado; ela conserta leitura e apresentação |
| Falha e falha parcial | N/A pela mesma razão: nenhuma escrita nova |
| Idempotência, retentativa, duplicata | N/A — sem escrita |
| Fronteiras de autorização | N/A — as rotas e actions tocadas já resolvem sessão, e nenhuma muda |
| Concorrência e ordenação | VENC-01 AC 5: a competência corrente é resolvida por requisição, não em tempo de build |
| Ciclo de vida do dado | N/A — nada é criado nem removido |
| Observabilidade | REDE-03 AC 4: o estado de erro exibe identificador de correlação sem rastro de pilha |
| Falha de dependência externa | N/A — nenhum serviço externo |
| Integridade de transição de estado | VENC-01 AC 3: pago nunca é vencido, qualquer que seja a competência |

---

## User Stories

### P1: "Vencido" volta a existir ⭐ MVP

**User Story**: Como morador da casa, quero abrir um mês passado e ver o que ficou por pagar, para
saber o que atrasou.

**Why P1**: É um dos motivos declarados da lista, o filtro promete o estado, e ele nunca casa com
nada.

**Acceptance Criteria**

1. WHILE a competência aberta é anterior à corrente, WHEN um lançamento dela não está pago THEN o
   sistema SHALL classificá-lo como vencido
2. WHILE a competência aberta é a corrente ou posterior, WHEN um lançamento dela não está pago THEN
   o sistema SHALL classificá-lo como pendente
3. The system SHALL classificar como pago todo lançamento com data de pagamento, qualquer que seja
   a competência
4. WHEN o filtro de situação "Vencido" é aplicado num mês passado com pendência THEN o sistema SHALL
   exibir exatamente os lançamentos não pagos daquele mês
5. The system SHALL resolver a competência corrente a cada requisição, no fuso da casa, e SHALL não
   derivá-la do segmento de rota
6. WHEN um lançamento está vencido THEN o sistema SHALL distingui-lo na coluna de situação por
   texto, e SHALL não depender apenas de cor

**Independent Test**: com um pendente em março e a data corrente em setembro, abrir março, filtrar
por "Vencido" e ver a linha; filtrar por "Pendente" e não ver.

---

### P2: Voltar ao mês de hoje sem perder o lugar

**User Story**: Como morador da casa, quero um atalho para o mês corrente, para não precisar passar
pela home e perder a área em que eu estava.

**Why P2**: Não bloqueia nada, mas é o gesto de navegação mais frequente depois de olhar um mês
passado.

**Acceptance Criteria**

1. The system SHALL exibir no seletor de competência um controle que leva ao mês corrente
2. WHEN o controle é acionado THEN o sistema SHALL preservar a área em que a pessoa está
3. WHILE a competência aberta já é a corrente, o sistema SHALL apresentar o controle desabilitado, e
   SHALL não ocultá-lo

**Independent Test**: abrir `/2026-03/lancamentos`, acionar o controle, e chegar em
`/<mês corrente>/lancamentos` — a área preservada.

---

### P2: Todo estado vazio oferece saída

**User Story**: Como morador da casa, quero que uma tela vazia me diga o que fazer, em vez de só
informar que está vazia.

**Why P2**: O texto do mês vazio ainda manda cadastrar "abaixo", e o cadastro subiu para o topo.

**Acceptance Criteria**

1. WHEN o mês não tem nenhum lançamento THEN o sistema SHALL oferecer o controle que abre o cadastro
2. WHEN um filtro não devolve resultado THEN o sistema SHALL oferecer um controle que limpa os
   filtros
3. WHEN os filtros são limpos por esse controle THEN o sistema SHALL devolver a lista inteira do mês
4. The system SHALL não instruir a pessoa a procurar o cadastro em posição que ele não ocupa

**Independent Test**: num mês vazio, ver o controle de cadastro no próprio estado vazio; buscar por
algo inexistente e voltar à lista inteira pelo controle de limpar.

---

### P2: Os controles da linha respeitam a área de toque

**User Story**: Como morador da casa usando o celular, quero conseguir acertar o selo de pago e o
botão de excluir sem errar o vizinho.

**Why P2**: São os dois controles mais tocados do app, têm cerca de 24 pixels de altura e ficam lado
a lado em cada linha.

**Acceptance Criteria**

1. The system SHALL apresentar o controle de situação com ao menos 44 por 44 pixels de área
2. The system SHALL apresentar o controle de excluir com ao menos 44 por 44 pixels de área
3. The system SHALL verificar essa área pela geometria renderizada, e SHALL não se satisfazer com a
   presença de uma classe

**Independent Test**: em viewport de 400 pixels, medir os dois controles de uma linha e obter ao
menos 44 em cada dimensão.

---

### P1: A busca e os filtros ganham prova ⭐ MVP

**User Story**: Como quem mantém este código, quero que apagar a busca ou os filtros faça algum
teste falhar.

**Why P1**: `filtrar-lancamentos.ts` e `filtros-de-lancamentos.tsx` são os únicos módulos da fatia
sem arquivo de teste, e o painel inteiro de filtros pode sumir da página sem nada reclamar.

**Acceptance Criteria**

1. The system SHALL provar que a busca ignora acento e caixa
2. The system SHALL provar cada dimensão de filtro — categoria, meio, pessoa, situação e natureza —
   isoladamente
3. The system SHALL provar que filtros combinados são interseção, e não união
4. The system SHALL provar a contagem de filtros ativos, inclusive com busca em branco
5. WHEN a busca é digitada THEN o sistema SHALL refleti-la na URL
6. WHEN um filtro é aplicado THEN o sistema SHALL exibir o total apenas do que restou

**Independent Test**: buscar por parte de uma descrição, ver só ela na lista, ver o indicador de
filtro ativo, e ver o total refletir só o resultado.

---

### P1: O indicador e a lista param de poder divergir ⭐ MVP

**User Story**: Como morador da casa, quero que o número do painel seja o mesmo que a lista mostra
quando eu clico nele.

**Why P1**: `design.md` nomeia esta divergência como o risco número 1 da fatia e prescreve o teste
que a pegaria. O teste nunca foi escrito, e trocar o filtro de um indicador para a natureza errada
não quebra nada.

**Acceptance Criteria**

1. The system SHALL provar, para cada indicador do eixo competência, que o total exibido é igual à
   soma da lista filtrada pelo mesmo predicado do link
2. The system SHALL provar o mesmo para cada indicador do eixo caixa
3. WHEN um indicador é acionado THEN o sistema SHALL abrir a lista com o filtro dele aplicado
4. The system SHALL usar, nessa prova, o filtro que o link carrega, e SHALL não recalcular o
   predicado no teste

**Independent Test**: clicar num indicador e conferir que o total exibido pela lista é o número que
estava no indicador.

---

### P3: O que estava implementado e não provado

**User Story**: Como quem mantém este código, quero que os comportamentos que existem só em CSS
tenham prova, para não regredirem em silêncio.

**Why P3**: Nenhum deles está quebrado hoje. Todos podem quebrar sem aviso.

**Acceptance Criteria**

1. WHERE a preferência de movimento reduzido está ativa, o sistema SHALL suprimir a animação, e isso
   SHALL ser verificado na geometria ou no estilo computado
2. The system SHALL apresentar valor monetário com algarismo de largura fixa e alinhado à direita, e
   isso SHALL ser verificado no estilo computado
3. The system SHALL apresentar exatamente quatro indicadores em cada eixo do painel
4. IF a leitura dos dados falha THEN o sistema SHALL apresentar identificador de correlação sem
   rastro de pilha
5. The system SHALL apresentar o esqueleto de carregamento com a mesma contagem de blocos que a
   página tem

**Independent Test**: com movimento reduzido ativo, conferir que a transição do elemento animado é
instantânea.

---

## Edge Cases

- WHEN a competência aberta é a corrente THEN o sistema SHALL não classificar nada como vencido
- WHEN a competência aberta é futura THEN o sistema SHALL classificar os não pagos como pendentes,
  e SHALL não como vencidos
- IF a competência corrente não puder ser resolvida THEN o sistema SHALL falhar de forma visível, e
  SHALL não classificar tudo como pendente silenciosamente
- WHEN o mês está vazio e há filtro aplicado THEN o sistema SHALL oferecer limpar o filtro, e SHALL
  não oferecer cadastrar como se o mês tivesse conteúdo escondido
- WHEN a busca tem só espaços THEN o sistema SHALL tratá-la como ausente na contagem de ativos

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VENC-01 | P1: "Vencido" volta a existir — ACs 1 a 6 | Execute | ACs 1 a 3 (T1); AC 5 (T5); ACs 4 e 6 (T6); percurso na tela (T7) |
| MES-01 | P2: Voltar ao mês de hoje — ACs 1 a 3 | Design | Pending |
| VAZIO-01 | P2: Todo estado vazio oferece saída — ACs 1 a 4 | Design | Pending |
| TOQUE-01 | P2: Os controles da linha respeitam a área de toque — ACs 1 a 3 | Design | Pending |
| REDE-01 | P1: A busca e os filtros ganham prova — ACs 1 a 6 | Execute | ACs 1 a 4 (T1); ACs 5 e 6 (T3); percurso na tela (T4) |
| REDE-02 | P1: O indicador e a lista param de poder divergir — ACs 1 a 4 | Execute | ACs 1, 2 e 4 (T2); AC 3 (T4) |
| REDE-03 | P3: O que estava implementado e não provado — ACs 1 a 5 | Design | Pending |

**Coverage:** 7 total, 7 mapeados para tasks.

---

## Success Criteria

- [ ] Os onze mutantes que sobreviveram à verificação de `painel-e-lancamentos` passam a morrer
- [ ] Apagar `filtrarLancamentos`, o componente de filtros ou o predicado de um indicador quebra
      algum teste
- [ ] "Vencido" devolve linhas num mês passado com pendência
- [ ] Os dois controles da linha medem ao menos 44 por 44 em 400 pixels, medidos e não declarados
- [ ] A rastreabilidade de `painel-e-lancamentos` passa a recortar requisito por AC
