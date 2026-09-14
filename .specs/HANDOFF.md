# myBilling — contexto para continuar

> Documento de retomada. Cole ou aponte este arquivo ao iniciar uma nova sessão.
> Última atualização: 2026-09-14, commit `1bfe4d4`, branch `main`.

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
Ícones: `@phosphor-icons/react`. Fonte: Sofia Sans variável.

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
Hoje `HorizonteFuturo` (GSAP) fica fora do `TransicaoMes` (Motion).

## Onde está o trabalho

```
.specs/STATE.md                                  decisões AD-001..AD-011 + handoff curto
.specs/HANDOFF.md                                este arquivo
.specs/features/mvp-gestao-financeira/           54 tasks, todas concluídas, Verifier PASS
.specs/features/painel-e-lancamentos/spec.md     20 requisitos EARS (fatia 1)
docs/design.md                                   identidade visual normativa, escada de tema medida
docs/roadmap.md                                  o que ficou para depois, em 4 fatias
AGENTS.md                                        as 5 regras acima
```

Backend do MVP **está pronto e testado**: `pnpm verify` sai 0 com 369 testes unitários,
128/128 branches no domínio, 115 de integração e 10/10 e2e. O e2e prova a dor central:
cadastra 1.000,00 em 3x em `2026-03`, navega para `2026-04` e `2026-05` e acha as
parcelas sem nenhuma ação adicional.

## Estado da UI (fatia 1, entregue)

- Navegação por áreas: **Visão geral** e **Lançamentos** (lateral no desktop, barra fixa
  no mobile)
- Painel com **alternador Planejamento ┊ Movimentações**, estado na URL
  (`?visao=movimentacoes`), 4 indicadores que trocam de rótulo junto
- Cada indicador é link para a lista já filtrada; painel e lista usam **o mesmo
  predicado** (`src/application/mes/filtrar-lancamentos.ts`) para que os totais não
  divirjam
- Gráfico de categorias em barras horizontais, **uma cor neutra só**; laranja reservado
  para estouro de orçamento, com ícone e texto (a validação de paleta reprovou dois
  laranjas: ΔE 4.8 sob protanopia)
- Lançamentos com busca (debounce de 250ms) e filtros por categoria, meio, pessoa e
  situação — tudo na URL
- Cadastro de compra parcelada com preview ao vivo das parcelas

## Pendências reais

1. **Setembro/2026 (mês corrente) está vazio.** O seed popula **2026-03, 04 e 05**. Para
   ver dados, abra `http://localhost:3000/2026-03`.
2. **`pnpm db:seed` não é idempotente** — roda duas vezes e quebra na chave única de
   e-mail. Recomeço limpo: `pnpm db:reset && pnpm db:migrate && pnpm db:seed`.
3. **Eixo Movimentações parcial**: soma só lançamentos da própria competência já pagos,
   sem `pagamento_fatura`.
4. **A UI só cria compra parcelada.** Marcar pago, lançamento avulso, recorrência,
   orçamento, cartões e edição estão em `docs/roadmap.md`.
5. **Domínio com código sem chamador**: `avaliarOrcamento`, `regenerarParcelas`,
   `resolverCicloFatura`, `resolverValorEfetivo`. Quatro tabelas ainda sem repositório.
6. **Credenciais do Google OAuth não configuradas** — bloqueia login real.

## Como subir

```bash
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev          # http://localhost:3000/2026-03
pnpm verify       # gate completo
```

## Processo combinado

Superpowers para descoberta e planejamento, `tlc-spec-driven` para execução e revisão.
Uma task = um commit atômico; Verifier independente ao fim de cada fase; teste de mutação
como sensor de discriminação em `git worktree` isolado (**nunca `git stash`**).
Não presumir que algo está implementado porque a documentação menciona; não presumir
fórmula a partir de imagem.
