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

---

## Handoff

- **Feature**: painel-e-lancamentos (fatia 1) — **entregue**. `mvp-gestao-financeira` concluída e com Verifier PASS.
- **Commit**: `1bfe4d4`, branch `main`.
- **Gates**: `pnpm verify` exit 0 — 369 unit, 128/128 branches em `src/domain`, 115 integração, 10/10 e2e.
- **Next step**: avaliação visual do usuário. O backend das fatias 2 a 4 está em `docs/roadmap.md` por decisão dele ("depois implementamos o back end").
- **Contexto completo de retomada**: `.specs/HANDOFF.md` — stack, regras invioláveis, decisões, estado da UI, pendências e comandos.
- **Pendências conhecidas**:
  - `pnpm db:seed` não é idempotente (quebra na chave única de e-mail na segunda execução). Recomeço limpo: `db:reset && db:migrate && db:seed`.
  - Seed popula 2026-03/04/05; setembro/2026, o mês corrente, aparece vazio.
  - Eixo caixa ainda soma só lançamentos da própria competência já pagos, sem `pagamento_fatura`.
  - Google OAuth sem credenciais — bloqueia login real, não o desenvolvimento.
- **Resolvido desde o handoff anterior**: o buraco de `NaN` em `gerarParcelas` foi fechado no domínio com guardas `Number.isInteger` nos três argumentos (128/128 branches).
- **Uncommitted files**: `next-env.d.ts` (gerado pelo Next)
