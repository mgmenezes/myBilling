# myBilling — contexto para continuar

> Documento de retomada. Cole ou aponte este arquivo ao iniciar uma nova sessão.
> Última atualização: 2026-09-14, branch `main`.

> [!IMPORTANT]
> **`main` está 32 commits à frente de `origin/main`, sem push.** O histórico é linear e o
> `pnpm verify` sai 0 neste ponto. `git push` continua exigindo autorização explícita e separada,
> como toda operação remota. A branch `ajustes-visuais-e-cadastros` aponta para o mesmo commit e
> pode ser apagada.

## O projeto

App web de finanças domésticas para duas pessoas (Moisés e Adriele), substituindo uma
planilha do Google Sheets com uma aba por mês. **A dor central:** compras parceladas
precisam ser redigitadas em cada aba futura; esquecer uma corrompe o saldo. O app
cadastra a compra **uma vez** e distribui as parcelas sozinho.

Repositório: `/Users/moisesmenezes/Documents/myBilling`, espelhado em
`github.com/mgmenezes/myBilling` (privado).

## Stack

Next.js 16.3.5 (App Router, Turbopack) · React 19.2.8 · TypeScript strict · Tailwind v4 ·
Drizzle ORM · Postgres 17 em Docker (porta **5433**) · Auth.js v5 + Google OAuth ·
Vitest · Playwright · Biome · pnpm.

Animação: `motion` 13.2.0 (`motion/react`) e `gsap` 3.15.0 + ScrollTrigger.
Ícones: `@phosphor-icons/react`. Fontes: **Inter** (corpo e display) e **JetBrains Mono** (toda
grandeza numérica).

## Regras invioláveis (`AGENTS.md`)

1. **Nenhum dado financeiro real da família** em código, seed, fixture, screenshot ou commit.
2. **Dinheiro é inteiro em centavos**, sufixo `_centavos` obrigatório em coluna monetária.
3. **Competência é `'YYYY-MM'`**, string branded. Aritmética de mês em inteiros
   (`ano*12+mes`). **Nunca `Date`** — mata os bugs de 31/03→31/04 e de UTC−3 virando o
   mês à meia-noite.
4. **`src/domain` é puro**: sem `next`, `react`, `drizzle`, `zod`, `Date`, sem async, sem
   exceção. Retorna `Result<T, DomainError>`. Enforçado por
   `src/domain/shared/arquitetura.test.ts`, não por documentação.
5. **Só `movimento` é somável.** `compra_parcelada` e `recorrencia` são planos de geração
   e jamais entram em `SUM`.

## Decisões que não devem ser reabertas sem motivo

| ID | Decisão |
|---|---|
| AD-001 | Formatação monetária só em `src/lib/formatar.ts` (há teste de fronteira que pega `toFixed` fora dali) |
| AD-003 | Razão único: `movimento`. `pagamento_fatura` é tabela separada **sem `natureza` nem `categoria_id`** — dupla contagem vira impossível de compilar, e há teste de `information_schema` nos dois sentidos |
| AD-004 | Resíduo do rateio nas **primeiras** parcelas: 1.000,00/3 → `33334, 33333, 33333` (é o que a operadora faz, então bate com a fatura real) |
| AD-005 | Compra em andamento (8/10) persiste só as parcelas ≥ inicial, com `valorAmortizadoAnterior` no pai — que nunca entra em soma |
| MOV-03 | **Competência e caixa nunca aparecem juntos na tela.** É por isso que existe o alternador |
| AD-011 | Dois mutantes obrigatórios: truncar o resíduo do rateio, e remover a virada de ano de `addMeses`. Se sobreviverem, a suíte não vale nada |

Restrição técnica: **GSAP e Motion nunca compartilham árvore de componente** (brigam por
frame, e um ancestral com `transform` quebra o cálculo de posição do ScrollTrigger).
`HorizonteFuturo` (GSAP) fica fora do `TransicaoMes` (Motion) — o `page.tsx` estava
violando isso, e era uma das duas causas dos cartões do horizonte ficarem invisíveis.

Restrição de animação por scroll: **nenhuma revelação pode depender de rolagem que a
página talvez não tenha.** O horizonte é a última seção da tela do mês; com `scrub` de
`top 85%` a `top 45%` o progresso empacava perto de zero e o conteúdo ficava apagado.
O gatilho válido é `top bottom`: página que não rola é página onde a seção já está
visível, e o ScrollTrigger dispara na criação.

Restrição de transbordo: o `TransicaoMes` translada o conteúdo 28px, e **translação para a
direita cria área rolável**. O invólucro tem `overflow-x: clip` — que recorta o `transform`
de uma animação, e não é o `overflow-x: hidden` de página inteira que o projeto proíbe
(esse esconderia transbordo de layout de verdade e faria a medição de 400px passar sem
significar nada).

Restrição de tema: a **ausência** de `data-tema` no `<html>` é o estado "sistema", e é
significativa — sem atributo, `color-scheme: light dark` deixa o sistema operacional
decidir, inclusive sem JavaScript. **Nunca escrever `data-tema="sistema"`.**

Restrição de materialização: as ocorrências de recorrência nascem **durante a leitura** da
página do mês. É um GET que escreve, aceito com a razão registrada na spec — a alternativa
deixaria buraco em todo mês fora da janela daquele momento. Ele só é seguro porque a
idempotência vem da restrição única `movimento_recorrencia_competencia_uq`, e **não** de
consultar antes de inserir: consultar-e-inserir perderia a corrida entre dois carregamentos
simultâneos. Há teste de integração disparando três materializações concorrentes.

Restrição de encerramento: `recorrencia.competencia_fim` é a **última competência em que ela
ainda vale**; a pessoa informa a partir de qual mês ela para. Encerrar a partir de maio grava
abril. A tradução vive num ponto único — o caso de uso `encerrar` — porque espalhada viraria
duas verdades, e a segunda estaria errada por um mês.

Regra de dívida: **função de domínio sem chamador é dívida, não prevenção.** A fatia de
recorrências recusou três tentativas de fabricar chamador, e a quarta — `ocorrenciaProtegida` —
virou especificação executável, com teste de concordância que confronta a função pura contra o
`WHERE` do `UPDATE`. Se um dia esse teste sumir, a função vira dívida de novo.

## Onde está o trabalho

```
.specs/STATE.md                                  decisões AD-001..AD-011 + handoff curto
.specs/HANDOFF.md                                este arquivo
.specs/features/mvp-gestao-financeira/           54 tasks, todas concluídas, Verifier PASS
.specs/features/painel-e-lancamentos/spec.md     20 requisitos EARS (fatia 1)
.specs/features/recorrencias/                    spec (FIXO-01..06) + 22 tasks, todas concluídas
DESIGN.md                                        referência de linguagem visual (Coinbase), não rastreado
docs/design.md                                   identidade visual normativa, derivada dela, com contraste medido
docs/referencias/LEIA-ME.md                      o que da referência entra e o que nunca entra
docs/roadmap.md                                  o que ficou para depois, em 3 fatias
AGENTS.md                                        as 5 regras acima

src/app/actions/                                 compras · categorias · meios-de-pagamento ·
                                                 pagamentos · recorrencias
src/application/recorrencias/                    materializar · criar · registrar-versao · encerrar
src/application/schemas/nome.ts                  normalização de nome compartilhada pelos cadastros
src/components/cadastro-inline.tsx               o padrão "criar sem sair do formulário"
src/components/botao-pago.tsx                    o selo de situação que é botão
src/components/valor-confirmavel.tsx             o valor de gasto fixo que abre campo
src/components/alternador-de-tema.tsx            o seletor e o SCRIPT_TEMA do <head>
src/infrastructure/db/limpar.ts                  TRUNCATE compartilhado entre o seed e os testes
drizzle/0001_valor_previsto_positivo.sql         CHECK que faltava; sem ele a transação de criar
                                                 recorrência era infalsificável
```

**Toda Server Action segue a mesma forma** (`compras.ts` é a referência): `requireSession()`
na primeira instrução mesmo havendo proxy, payload revalidado no servidor com o **mesmo**
schema Zod que o formulário usou, e nada lança para o cliente — todo caminho sai no envelope
`ResultadoAction`, e falha não prevista vira `ERRO_INESPERADO` com identificador de
correlação. Stack trace não chega ao navegador.

`pnpm verify` sai 0: **582 testes unitários, 144/144 branches no domínio, 187 de integração** e
**23 e2e**. Os dois e2e que mais importam provam as duas re-digitações que a planilha impunha:
cadastrar 1.000,00 em 3x em `2026-03` e achar as parcelas em abril e maio sem ação nenhuma; e
cadastrar um gasto fixo uma vez e vê-lo em março, abril e maio.

## Estado da UI

- Navegação por áreas: **Visão geral**, **Lançamentos** e **Fixos** (lateral no desktop, barra
  fixa no mobile). Área sem implementação não entra na lista (NAV-03, AC 5)
- Painel com **alternador Planejamento ┊ Movimentações**, estado na URL
  (`?visao=movimentacoes`), 4 indicadores que trocam de rótulo junto
- Cada indicador é link para a lista já filtrada; painel e lista usam **o mesmo
  predicado** (`src/application/mes/filtrar-lancamentos.ts`) para que os totais não
  divirjam
- Gráfico de categorias em barras horizontais, **uma cor neutra só**; o estouro de orçamento
  é sinalizado por ícone mais texto, nunca por preenchimento colorido
- Lançamentos com busca (debounce de 250ms) e filtros por categoria, meio, pessoa e
  situação — tudo na URL
- Cadastro de compra (1 parcela é a compra avulsa no cartão, n é o parcelamento) com preview
  ao vivo das parcelas
- Lista com **pílula de categoria** em todo bloco; a coluna "Parcela" existe **só** no bloco de
  compra parcelada, onde carrega informação. Fora dele ela era coluna permanentemente vazia,
  empurrando descrição e valor para pontas opostas da tela
- **Gastos fixos e receita recorrente**, na área "Fixos". Cadastrar uma vez e aparecer em todo mês;
  reajustar a partir de um mês **sem reescrever o passado** (versionamento por vigência); confirmar o
  valor real quando a conta chega, com a previsão ainda visível ao lado; encerrar preservando o que
  foi pago. As ocorrências são materializadas **na abertura do mês**, para a competência visível mais
  a janela de projeção — é um GET que escreve, e só é seguro porque a garantia é a restrição única
  `movimento_recorrencia_competencia_uq`, não uma consulta prévia
- **Marcar pago e desfazer**: o selo de situação **é** o botão, com estado otimista. Marcar move o
  indicador do painel, não só a lista — a action revalida as duas rotas
- **Criar categoria e meio de pagamento dentro do formulário**, pelo "+ nova"/"+ novo" ao lado do
  rótulo. Os dois usam `CadastroInline` (`src/components/cadastro-inline.tsx`), que carrega o padrão
  inteiro: atalho, bloco que abre, foco na transição, `Enter` que não submete o formulão, estado de
  gravação e erro. O terceiro cadastro sai de graça. Detalhes que não são óbvios:
  - **Categoria vale para todo mês sem nenhum código de sincronização**, porque `categoria` não tem
    competência. Era a segunda re-digitação da planilha e ela morreu por construção, não por feature
  - Nome de categoria repetido **nunca duplica**: a action compara **sem caixa** (o `UNIQUE` do
    Postgres não ignora) e **reativa** categoria arquivada, que continua ocupando o nome sem
    aparecer em lista nenhuma
  - Meio de pagamento é **união discriminada pelo tipo**, espelhando o `CHECK` bicondicional do
    banco: cartão exige os dois dias de ciclo, conta e rótulo os proíbem. Campo opcional aqui
    morreria só na constraint do Postgres, como erro genérico no lugar errado
  - Nome de meio repetido vira **erro**, e não reaproveitamento como em categoria: um cartão carrega
    dias de ciclo, e devolver outro jogaria fora o que a pessoa digitou. A busca dele ignora
    arquivado, porque `meio_pagamento.nome` não tem `UNIQUE` e recriar cartão encerrado é legítimo
  - `fechamentoVaiParaFaturaSeguinte` é fixo em `true` por decisão de produto: a alocação de fatura
    não tem tela, então seria um botão cujo efeito ninguém consegue observar
- **Identidade derivada do `DESIGN.md` (Coinbase)**: canvas branco, azul `#0052ff` como única cor
  de ação e escassa, cartão chapado com hairline em vez de sombra, geometria de pílula, display em
  peso 400, mono em toda grandeza numérica, e verde/vermelho semânticos **só como cor de texto**,
  sempre acompanhados de rótulo e sinal. Três cores do documento reprovaram em contraste no uso
  deste app e foram derivadas — a tabela está em `docs/design.md`. A largura de conteúdo
  (`--container-conteudo`, 1440px) também diverge do documento, que pede ~1200px: lá o conteúdo é
  parágrafo e foto, aqui é tabela lida todo dia
- **Tema claro, escuro ou do sistema**, no cabeçalho. A paleta é declarada uma vez só, com
  `light-dark()`; quem escolhe o lado é `color-scheme`, o que leva junto barra de rolagem,
  `<select>` e `<input type=date>`. A ausência de `data-tema` no `<html>` **é** o estado
  "sistema" — nunca escrever `data-tema="sistema"`. Um script inline no `<head>`
  (`SCRIPT_TEMA`) aplica a escolha antes da primeira pintura

## Pendências reais

1. **Eixo Movimentações parcial**: soma só lançamentos da própria competência já pagos,
   sem `pagamento_fatura`.
2. **Falta lançamento avulso e receita à vista**, que é a fatia 1 do roadmap: sem eles o mês não
   fecha, porque só compra parcelada e recorrência entram no app. Orçamento, faturas e edição com
   escopo vêm depois. Renomear e arquivar cadastro seguem sem tela.
3. **Os blocos da lista agrupam por `origem`, não por meio de pagamento.** "Cartão de Crédito"
   quer dizer "veio de compra parcelada" e "Gastos do Mês" quer dizer "é avulso" — um lançamento
   avulso num cartão cai no segundo. É decisão de modelo a resolver junto com o formulário de
   avulso, não depois dele.
4. **Domínio com código sem chamador**: `avaliarOrcamento`, `regenerarParcelas`,
   `resolverCicloFatura` e `confirmarValorReal`. Duas tabelas ainda sem repositório:
   `orcamento_categoria` e `pagamento_fatura`. `resolverValorEfetivo` saiu desta lista com a fatia
   de recorrências — ela decide o que exibir na linha de um gasto fixo.
5. **Credenciais do Google OAuth não configuradas** — bloqueia login real, não o desenvolvimento.
6. **Não existe caminho de deploy, e o roadmap não o cobre.** Ele foi escrito como roadmap de
   produto e nunca teve linha de infraestrutura. O que falta decidir e fazer: onde o app roda,
   como as variáveis de ambiente chegam lá, e como `pnpm db:migrate` é executado contra o banco
   gerenciado. As duas migrations aplicam num banco limpo — `recriarBancoDeTeste` prova isso a
   cada execução da suíte de integração —, então o risco não é a migration: é não haver processo.
7. **`DESIGN.md` está na raiz sem commit, e é decisão aberta.** A referência anterior
   (`DESIGN-mastercard.md`) foi mantida fora do repositório de propósito, por descrever identidade
   de marca de terceiros. Versioná-lo torna a derivação auditável; deixá-lo de fora mantém a regra.
   Registrado em `docs/referencias/LEIA-ME.md`.
8. **A tabela espalha as colunas por igual.** Com 1440px de largura, descrição e valor ficam em
   pontas opostas. A pílula de categoria reduziu o sintoma ao ocupar o vão, mas a correção real é
   deixar a descrição absorver a folga e as demais colunas ocuparem só o que precisam.

## Como subir, localmente

```bash
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev          # http://localhost:3000 redireciona para o mês corrente
pnpm verify       # gate completo
```

## Banco gerenciado, quando houver

O projeto no Neon estava sendo criado quando esta sessão terminou; nada foi provisionado por
aqui — criação de recurso em nuvem exige autorização explícita e separada, como `git push`.

Três coisas que o app exige e que valem no momento de configurar:

- **Desligar o Neon Auth.** A autenticação é do app: Auth.js v5 com Google OAuth e allowlist de
  dois e-mails (AD-007). Ligar o serviço acrescenta uma peça que nada no código usa.
- **Região São Paulo**, e não só por latência: competência e data de pagamento são resolvidas em
  `America/Sao_Paulo` explicitamente, nunca no fuso da máquina. Banco e fuso na mesma região
  evitam uma classe inteira de confusão de virada de mês.
- **"Scales to zero" tem custo específico aqui.** Toda abertura de mês faz uma escrita — a
  materialização de recorrências roda durante a leitura da página. Com o banco hibernando, o
  primeiro acesso do dia paga o cold start em cima disso. Não quebra nada: a materialização é
  idempotente e a janela é de quatro meses.

O caminho é `DATABASE_URL` no ambiente e `pnpm db:migrate`. As duas migrations aplicam num banco
limpo, e `recriarBancoDeTeste` prova isso a cada execução da suíte de integração.

**O Next 16 recusa um segundo `next dev` no mesmo diretório.** Com `pnpm dev` de pé, tanto o
`pnpm test:e2e` (que sobe o próprio servidor na 3100) quanto qualquer inspeção manual falham com
"Another next dev server is already running". Ou se derruba o primeiro, ou se roda a partir de uma
cópia da árvore em outro diretório — nesta sessão foi o segundo caminho, com `pnpm install
--offline` na cópia, porque `node_modules` por symlink quebra o Turbopack.

`pnpm db:seed` **esvazia o banco antes de popular** e ancora os meses no relógio: de dois
meses atrás a três à frente, com compras parceladas que alcançam a régua de
comprometimento futuro. O módulo `seed.ts` continua sem saber que dia é hoje — quem
calcula a competência-base é a CLI (`--base=AAAA-MM` sobrescreve, `--manter` não limpa).

## Processo combinado

Superpowers para descoberta e planejamento, `tlc-spec-driven` para execução e revisão.
Uma task = um commit atômico; Verifier independente ao fim de cada fase; teste de mutação
como sensor de discriminação em `git worktree` isolado (**nunca `git stash`**).
Não presumir que algo está implementado porque a documentação menciona; não presumir
fórmula a partir de imagem.
