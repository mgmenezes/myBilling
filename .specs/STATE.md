# Project State — myBilling

## Decisions

### AD-001
- **Decision**: Todo valor monetário é `BIGINT` em centavos, com sufixo `_centavos` obrigatório em nome de coluna e de campo. Nenhum `DECIMAL`, nenhum float, em nenhuma camada.
- **Reason**: O rateio de parcelas é aritmética inteira — `base × n + resto == total` é identidade, não teorema a provar. O gargalo real não é o Postgres (onde `DECIMAL` é exato) e sim a fronteira HTTP/JSON/JavaScript: `JSON.parse("1234.56")` vira IEEE-754 e reintroduz ponto flutuante silenciosamente no front. Inteiro abaixo de 2^53 é exato em JS.
- **Trade-off**: SQL manual fica menos legível e existe risco de esquecer a divisão por 100 na apresentação. Mitigado pelo sufixo obrigatório (uma coluna `valor` que compile é sinal de bug) e por formatação isolada em `src/lib/formatar.ts`.
- **Scope**: Todas as features, todas as camadas, schema do banco.
- **Date**: 2026-09-13
- **Status**: active

### AD-002
- **Decision**: Competência é a string branded `'YYYY-MM'` no domínio e `DATE` no dia 1 do mês no banco. Aritmética de meses é feita em inteiros (`ano × 12 + mes`), sem `Date`, sem `setMonth`, sem fuso implícito.
- **Reason**: A planilha cruza anos (JAN/27, FEV/27, MAR/27) e o parcelamento precisa atravessar a virada de ano. `Date` nativo carrega duas famílias de bug: overflow de dia (31/03 + 1 mês vira 01/05) e deslocamento de fuso (UTC−3 vira o mês à meia-noite). Aritmética inteira não tem nenhuma das duas.
- **Trade-off**: Exige uma função de conversão explícita `dataParaCompetencia(dataISO, tz)` na fronteira, em vez de usar `Date` livremente.
- **Scope**: Camada de domínio, schema do banco, roteamento (`/[competencia]`).
- **Date**: 2026-09-13
- **Status**: active

### AD-003
- **Decision**: Um único razão materializado (tabela `movimento`) é a única fonte somável do sistema. `compra_parcelada`, `recorrencia` e `recorrencia_versao` são planos de geração e nenhuma coluna delas entra em qualquer somatório. O pagamento de fatura vive em tabela própria (`pagamento_fatura`), sem `natureza` e sem `categoria_id`.
- **Reason**: Dupla contagem é o erro que mais corrompe controle financeiro doméstico — somar a compra no cartão e o pagamento da fatura, ou somar o total da compra e suas parcelas. Com razão único, todo total é um `SUM` sobre uma tabela. Com `pagamento_fatura` sem as colunas que uma consulta de gasto exige, o erro fica impossível de compilar em vez de apenas improvável.
- **Trade-off**: `movimento` acumula colunas nullable específicas de cada origem (`compra_id`, `numero_parcela`, `recorrencia_id`, `fatura_id`), disciplinadas por `CHECK` condicionais. A alternativa — três tabelas de despesa — exigiria `UNION ALL` em cada total, ou seja, três oportunidades de errar por tela.
- **Scope**: Modelo de dados inteiro e toda consulta de agregação.
- **Date**: 2026-09-13
- **Status**: active

### AD-004
- **Decision**: O resíduo do rateio de parcelas é alocado nas **primeiras** parcelas, um centavo por parcela. R$ 100,00 em 3x gera 33,34 / 33,33 / 33,33.
- **Reason**: É a prática dominante dos emissores brasileiros, então o valor exibido bate com a fatura real — o único critério que o usuário consegue conferir de fato. Também mantém o saldo devedor monotônico, o que torna trivial a redistribuição ao editar uma compra com parcelas já pagas.
- **Trade-off**: Alguns lojistas alocam o resíduo na última parcela. Mitigado por um enum `politica_residuo` por compra, configurável sem deploy.
- **Scope**: `src/domain/parcelamento`, entidade `compra_parcelada`.
- **Date**: 2026-09-13
- **Status**: active

### AD-005
- **Decision**: Compra já em andamento persiste apenas as parcelas a partir da parcela inicial informada, e registra a soma das anteriores em `valor_amortizado_anterior_centavos` no plano. Nenhum lançamento é criado em competências anteriores.
- **Reason**: O app nasce em uma competência específica; as competências anteriores não existem no sistema. Criar as parcelas 1 a 7 de uma compra `8/10` inventaria meses fantasmas com totais parciais que apareceriam em qualquer gráfico anual, violando a exigência do usuário de não alterar histórico silenciosamente.
- **Trade-off**: O gráfico anual do ano de início subestima os gastos passados. É correto — o app não tem esses dados e não deve fingir que tem. A informação completa da compra vive na tela de detalhe.
- **Scope**: `src/domain/parcelamento`, entidade `compra_parcelada`, toda agregação histórica.
- **Date**: 2026-09-13
- **Status**: active

### AD-006
- **Decision**: A camada `src/domain/**` é pura: proibida de importar `next`, `react`, `drizzle-orm`, `zod`, `src/infrastructure`, `src/app` e módulos do Node. Não lança exceção (retorna `Result<T, DomainError>`), não é `async` e não conhece `Date.now()`. A proibição é enforçada por um teste que lê os imports de todos os arquivos da camada.
- **Reason**: Todo o risco do produto é aritmético — rateio, competência, virada de ano, ciclo de fatura. Isolar essa aritmética num lugar sem I/O permite testá-la exaustivamente em milissegundos, antes de existir banco ou tela, e permite o teste de propriedade sobre a conservação da soma. Enforçar por teste em vez de por convenção impede a erosão silenciosa da fronteira.
- **Trade-off**: Exige mapear entidades do banco para tipos de domínio na camada de infraestrutura, em vez de passar linhas do ORM adiante. É o custo que compra a testabilidade.
- **Scope**: Toda a arquitetura de código.
- **Date**: 2026-09-13
- **Status**: active

### AD-007
- **Decision**: Autorização é uma allowlist de e-mails em variável de ambiente, com Google OAuth. Não há isolamento de dados entre os dois usuários: `usuario_id` no lançamento é classificação de quem gastou, não permissão.
- **Reason**: As finanças são de fato conjuntas. Row-level security entre dois cônjuges que dividem conta é cerimônia sem ameaça correspondente. Google OAuth elimina senha armazenada, SMTP, fluxo de reset e traz 2FA de graça.
- **Trade-off**: Adicionar uma terceira pessoa ou um lançamento privado exige mudança (coluna `visibilidade` com default e um `WHERE` — aditiva, custo zero de retrabalho).
- **Scope**: Autenticação, autorização, toda Server Action.
- **Date**: 2026-09-13
- **Status**: active

### AD-008
- **Decision**: Agregações mensais são calculadas sob demanda em memória. Sem view materializada, sem coluna de saldo, sem tabela de resumo.
- **Reason**: Cerca de 300 lançamentos por mês; a consulta com índice em `(competencia)` retorna em menos de 5 ms e a soma pura leva cerca de 0,05 ms. Saldo materializado só adicionaria um mecanismo de invalidação, e invalidação incorreta é a causa número um de "o saldo está errado" — exatamente a dor que motivou o projeto.
- **Trade-off**: Não escala para volume alto. Critério de reavaliação registrado: p95 da página do mês acima de 300 ms, ou mais de 5.000 lançamentos por mês.
- **Scope**: Camada de leitura, `src/application/mes`.
- **Date**: 2026-09-13
- **Status**: active

### AD-009
- **Decision**: Nenhum valor financeiro real da família pode aparecer em seed, fixture, teste e2e, screenshot ou qualquer artefato versionado. Seeds usam PRNG com semente fixa e nomes genéricos; fixtures de teste buscam propriedade matemática, não realismo.
- **Reason**: Pedido explícito do usuário. O repositório pode virar público ou ser compartilhado, e dado financeiro doméstico em git é irreversível — reescrever histórico não desfaz clones.
- **Trade-off**: Testes ficam menos ilustrativos do uso real. Compensado por fixtures escolhidas por valor de teste (R$ 1.000,00 em 3x pelo resíduo, R$ 0,01 em 3x pelo caso degenerado, compra em 31/12 pela virada de ano).
- **Scope**: `src/infrastructure/db/seed.ts`, todos os testes, toda documentação versionada.
- **Date**: 2026-09-13
- **Status**: active

### AD-010
- **Decision**: Os testes de integração rodam contra Postgres real em Docker. SQLite em memória é proibido para esse fim.
- **Reason**: Divergência de dialeto — `ON CONFLICT`, tipos de data, `CHECK` condicionais, índices parciais — faria os testes passarem exatamente onde a confiança importa. O Docker já está instalado na máquina.
- **Trade-off**: Testes de integração exigem um contêiner rodando, então não são executáveis em qualquer ambiente sem preparo. Mitigado por `docker compose up -d db` num script npm e pelo `services: postgres` no CI.
- **Scope**: Estratégia de teste, CI.
- **Date**: 2026-09-13
- **Status**: active

### AD-011
- **Decision**: Dois mutantes são alvo obrigatório do discrimination sensor do Verifier: (a) trocar a política de resíduo do rateio, de "primeiras parcelas" para truncamento simples; (b) remover a virada de ano do deslocamento de competência.
- **Reason**: Esses dois mutantes atingem exatamente a dor central do produto. Se ambos sobreviverem à suíte, a cobertura do núcleo é decorativa, por mais verde que esteja.
- **Trade-off**: Nenhum relevante — o custo é um punhado de mutações por execução de verificação.
- **Scope**: Fase de verificação de toda feature que toque `src/domain/parcelamento` ou `src/domain/shared/competencia.ts`.
- **Date**: 2026-09-13
- **Status**: active

### AD-012
- **Decision**: O bloco de despesa em que um lançamento aparece é decidido por cascata de três ramos, numa única função pura (`blocoDoLancamento`): origem recorrente vira Fixos; meio de pagamento do tipo cartão vira Cartão de Crédito; o resto vira Gastos do Mês. O conjunto de cartões inclui os **arquivados**.
- **Reason**: Os blocos agrupavam por `origem`, então "Cartão de Crédito" significava "veio de compra parcelada" e uma despesa avulsa no cartão caía em "Gastos do Mês" — fora da fatura, que é o oposto do que a pessoa espera e do que a fatia de Faturas vai consumir. O critério correto é o meio, porque a pergunta que o bloco responde é "vai cair na fatura". A precedência de Fixos preserva o bloco que administra ciclo de vida. Incluir arquivados evita que arquivar um cartão **reclassifique o passado** e mude indicadores de meses fechados.
- **Trade-off**: Parcela paga em carnê sai do bloco do cartão e vai para Gastos do Mês. É correto — ela não vai em fatura nenhuma — mas é mudança visível para quem já usava. O indicador do painel e a lista passam a depender da mesma função, com teste de concordância obrigatório: se um dia ele sumir, os dois voltam a poder divergir.
- **Scope**: `src/domain/mes/bloco-do-lancamento.ts`, `resumoMensal`, `obterVisaoMensal`, `TabelaLancamentos`, e a barra de composição da home.
- **Date**: 2026-09-14
- **Status**: active

### AD-013
- **Decision**: O invariante "a área de navegação tem o mesmo nome do bloco da lista que ela administra" é abandonado. A área passa a se chamar "Todo mês"; o bloco continua "Fixos".
- **Reason**: O invariante já estava quebrado, em silêncio, desde a fatia de recorrências: aquela área administra também **receita recorrente**, e a ocorrência de um salário nunca aparece no bloco "Fixos", que filtra por despesa — ela aparece em "Entradas". Os dois nomes descrevem conjuntos diferentes, e insistir na igualdade era o que fazia o salário parecer não ter casa. Quem procura onde cadastrar o que entra não clica numa palavra que promete conta a pagar.
- **Trade-off**: Há dois nomes na interface para coisas relacionadas, e quem já usava aprendeu o antigo. A rota continua `/fixos`, para não quebrar link salvo nem histórico.
- **Scope**: `NavegacaoPrincipal`, página de recorrências.
- **Date**: 2026-09-14
- **Status**: active

### AD-014
- **Decision**: O cadastro de lançamento abre num `<dialog>` nativo, por botão no topo da área, e **não fecha ao gravar**. As abas ficam montadas ao mesmo tempo lá dentro.
- **Reason**: O formulário no rodapé exigia rolar a lista inteira para cadastrar, e a lista só cresce. O elemento nativo entrega confinamento de foco, `Escape`, backdrop e inércia da página sem código — um painel feito à mão seria a mesma coisa pior implementada. Fechar ao gravar levava embora a confirmação, que vive dentro do formulário: a pessoa clicava e tudo desaparecia sem dizer que deu certo. Manter aberto também serve o padrão real de lançar várias coisas seguidas ao atualizar o mês. Abas montadas preservam o que foi digitado na outra.
- **Trade-off**: Um clique para fechar. Duas abas montadas significam campos homônimos na árvore, então todo teste de interface precisa ser escopado ao formulário — foi o que quebrou seis e2e na transição.
- **Scope**: `DialogoDeCadastro`, `SeletorDeFormulario`, página de Lançamentos, e a suíte e2e de cadastro.
- **Date**: 2026-09-14
- **Status**: active

### AD-015
- **Decision**: Com natureza receita, os formulários trocam o vocabulário e restringem as opções: "Onde o dinheiro cai" em vez de "Meio de pagamento", listando apenas meios que **não** geram fatura, mais título, botão e rótulo do dia próprios. O campo de meio **não** é removido.
- **Reason**: O formulário dizia "Cadastrar gasto fixo" com "Um dinheiro que entra" marcado, e oferecia cartão de crédito como destino de salário. Contradizia a escolha de quem o preenchia e permitia um estado sem sentido. O campo em si é legítimo: o dinheiro cai em alguma conta, e saber em qual é o que permitirá conciliar depois. Removê-lo exigiria migration, porque `movimento.meio_pagamento_id` é `NOT NULL`.
- **Trade-off**: O vocabulário vive num objeto derivado da natureza, e cada rótulo novo precisa nascer nos dois lados. Filtrar a exibição não basta: a seleção precisa ser reposicionada quando a natureza muda, ou o formulário envia o que a lista não oferece mais.
- **Scope**: `FormRecorrencia`, `FormLancamentoAvulso`.
- **Date**: 2026-09-14
- **Status**: active

### AD-016
- **Decision**: A competência corrente usada para classificar situação vem de `hojeEm()`, resolvida no servidor a cada requisição, e **nunca** do segmento de rota. `situacaoDe` fica como está.
- **Reason**: "Vencido" era opção de filtro que nunca casava com nada, e a causa não era a regra — era o argumento. A página passava a competência da rota como corrente, e **todo lançamento listado é dessa mesma competência**, então `competencia < competenciaCorrente` era falso por construção. Um defeito de argumento não aparece lendo a função: ela estava certa o tempo todo, e um teste de `situacaoDe` sozinho continua verde com a interface morta. O que pega isso é prova que atravessa a fronteira entre página e domínio.
- **Trade-off**: A classificação deixa de ser função só dos dados e passa a depender do relógio, então todo teste que a toca precisa ancorar a data em vez de fixá-la. `TabelaLancamentos` recebe `competenciaCorrente` como prop **obrigatória**: um padrão silencioso ali reintroduziria exatamente este defeito.
- **Scope**: `src/app/(app)/[competencia]/lancamentos/page.tsx`, `TabelaLancamentos`, `PainelIndicadores`, `filtrarLancamentos`.
- **Date**: 2026-09-20
- **Status**: active

### AD-017
- **Decision**: O eixo caixa e a lista de lançamentos **não são reconciliáveis fora da competência aberta**, e isso fica registrado como dívida em vez de corrigido.
- **Reason**: O indicador do eixo caixa e o filtro da lista discordam sobre **quando** um lançamento conta como pago. O indicador usa `realizadoEm`, que exige `pagoEm` **dentro da competência aberta** (`src/domain/mes/resumo-mensal.ts:27`); a lista usa `situacaoDe`, que aceita **qualquer** `pagoEm` (`src/application/mes/filtrar-lancamentos.ts:44`). Um lançamento **do mês aberto, pago fora dele**, aparece na lista como pago e não entra no indicador. É alcançável e corriqueiro, porque a action de marcar pago carimba `hojeEm()`: quitar hoje uma conta de março é exatamente isso — o mesmo cenário para o qual o "Vencido" existe. Não é filtro errado, são recortes diferentes, e MOV-03 diz que competência e caixa nunca se somam. Fechar isso é reescrever o que o eixo Movimentações significa — fatia própria, não conserto.
- **Correção**: A primeira redação desta decisão dizia o contrário — que o eixo caixa alcançaria lançamentos de outras competências, com o exemplo "um de março pago em setembro entra no indicador de setembro". **É falso**, e a verificação independente pegou: `obterVisaoMensal` só entrega `listarPorCompetencia(competencia)` ao `resumoMensal` (`obter-visao-mensal/handler.ts:84,98`), então o eixo caixa nunca sai do mês aberto. O relatório do worker que achou o defeito estava certo; o erro entrou na transcrição para cá. Fica registrado porque o estreitamento do AC 2 de REDE-02 saiu correto por leitura do código, e não pela justificativa escrita ao lado dele.
- **Trade-off**: Fica um caso em que clicar num indicador do eixo caixa abre uma lista cuja soma não bate com ele. O AC 2 de REDE-02 passa a declarar o recorte em que a prova vale — lançamentos da competência aberta, pagos nela — em vez de afirmar uma paridade que o sistema não tem.
- **Scope**: `resumoMensal`, `PainelIndicadores` no eixo movimentações, `filtrarLancamentos`.
- **Date**: 2026-09-20
- **Status**: active

---

## Handoff

- **Feature**: `lacunas-do-painel` — **15 tasks, todas implementadas**; falta a verificação independente, que é o passo de fechamento da fase Execute.
- **Commit**: `main` local, de `74c0961` a este. **Sem push.** `main` está **21 commits à frente de `origin/main`**, e `git push` continua exigindo autorização explícita e separada.
- **Gates**: `pnpm verify` exit 0 e `pnpm test:e2e` exit 0 — **1.150 provas**: 856 unitários, 237 de integração, 57 e2e.
- **Next step**: despachar o Verifier independente (autor ≠ verificador) sobre `lacunas-do-painel`, com o sensor de discriminação. Só depois dele `validate_state.py` pode passar, e é por isso que o último critério de T14 ficou aberto de propósito.
- **Por que esta fatia existiu**: a verificação de `painel-e-lancamentos` devolveu FAIL com 6 de 20 requisitos provados e 4 de 15 mutantes mortos. Um único mutante quebrava cinco comportamentos ao mesmo tempo com as 1.049 provas verdes. O padrão era claro: onde uma fatia posterior escreveu teste, o comportamento estava preso; onde a fatia 1 ficou sozinha, nada segurava.
- **Entregue**:
  - **A rede primeiro, sobre o comportamento atual** (T1 a T4): o predicado de filtragem, a reconciliação indicador ↔ lista com o filtro lido do `href`, o painel de filtros, e o Independent Test em e2e que a spec pedia e nunca teve.
  - **"Vencido" passou a existir** (T5 a T7, AD-016). Era defeito de argumento, não de regra.
  - **44 × 44 nos dois controles mais tocados** (T8, T9), medidos pela geometria renderizada em 400px, e não por presença de classe.
  - **Todo estado vazio com saída** (T10), e o texto que mandava cadastrar "abaixo" corrigido — o cadastro subiu para o topo no AD-014.
  - **Atalho para o mês corrente** (T11), preservando a área.
  - **T15, que não estava no plano**: a T5 criou uma regressão — com a competência corrente vinda do relógio, o indicador "Ainda não pago" apontava para `PENDENTE` enquanto os lançamentos de mês passado viravam `VENCIDO`, e a lista voltava vazia. O teste da T2 não pegou porque as fixtures dele têm competência aberta igual à corrente.
  - **O que só existia em CSS** (T12): movimento reduzido, algarismo tabular, contagem de quatro indicadores por eixo.
  - **Rastreabilidade de `painel-e-lancamentos` datada** (T13): de 6 para 13 verificados, com os sete restantes nomeando o que falta.
- **Três achados sobre o Next que não estavam em lugar nenhum**, medidos nesta sessão e registrados em `e2e/acessibilidade.spec.ts:252`: em `next dev` o `Link` **não prefetcha**, então a navegação por clique não desenha a fronteira de carregamento e a URL nem muda; na navegação dura o React substitui o esqueleto **antes de 40ms**, com vinte amostras seguidas em zero; e a carga serializada do RSC **repete cada `className` no mesmo documento**, então contar `animate-pulse` cru devolve o dobro do número de blocos.
- **Lacuna declarada, não fechada**: o AC 5 de REDE-03 pede "a mesma contagem de blocos que a página tem", e a página não define isso — tem cabeçalho, quatro indicadores e duas `section`, contra três zonas e sete blocos do esqueleto. Pior: o esqueleto **derivou**, declarando espelhar uma proporção 3:2 que não existe mais em `page.tsx`, no painel nem no gráfico. Redesenhá-lo é decisão visual, e está em Out of Scope.
- **Dívida de eixo registrada** (AD-017): o eixo caixa e a lista não reconciliam fora da competência aberta.
- **Armadilha de ambiente desta sessão**: o e2e usa `channel: "chrome"`, o Chrome da máquina. Três execuções seguidas estouraram `browserType.launch` em 180s cada, o que virou "flakiness" e execuções de 17 minutos sem nada de errado no código — o arquivo inteiro roda em 10s quando o navegador abre. Se voltar a acontecer, suspeite do navegador antes do teste.
- **Contexto completo de retomada**: `.specs/HANDOFF.md`.
- **Pendências conhecidas**: ver `.specs/HANDOFF.md`. A mais estrutural segue sendo a ausência de caminho de deploy, com o estágio 2 do QA bloqueado nas credenciais do Google.
