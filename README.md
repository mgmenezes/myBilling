# myBilling

Gestão financeira doméstica para duas pessoas. Substitui uma planilha com uma aba por mês.

**O problema que ele resolve:** compras parceladas exigiam re-digitação manual em cada aba futura, e esquecer uma parcela corrompia o saldo. Aqui a compra é cadastrada **uma vez** e as parcelas se distribuem sozinhas pelos meses seguintes, inclusive na virada de ano, com garantia aritmética de que a soma das parcelas é exatamente o valor total.

## Como executar

### Pré-requisitos

- Node 24+
- pnpm (`corepack enable`, ou `npm i -g pnpm`)
- Docker (para o Postgres local)

### 1. Dependências e banco

```bash
pnpm install
pnpm db:up          # sobe o Postgres em Docker, porta 5433
pnpm db:migrate     # aplica as migrations
pnpm db:seed        # dados sintéticos para desenvolvimento
```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. O `.gitignore` bloqueia `.env*`, com exceção do `.env.example` — **os valores reais nunca entram no repositório**.

```bash
cp .env.example .env.local
```

| Variável | O que é |
| --- | --- |
| `DATABASE_URL` | conexão do Postgres. Local: `postgres://mybilling:mybilling@localhost:5433/mybilling` |
| `AUTH_SECRET` | gere com `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | credenciais do Google OAuth (abaixo) |
| `EMAILS_PERMITIDOS` | os e-mails autorizados, separados por vírgula. **É a única fronteira de autorização** |

A aplicação **derruba o processo na inicialização** se faltar qualquer uma dessas chaves. Falha barulhenta no deploy é melhor que `undefined` silencioso em runtime.

### 3. Google OAuth

Em [console.cloud.google.com](https://console.cloud.google.com):

1. Crie um projeto
2. *APIs e Serviços* → *Tela de permissão OAuth* → tipo **Externo**
3. Em *Usuários de teste*, adicione os e-mails que vão usar o app
4. *Credenciais* → *Criar credenciais* → **ID do cliente OAuth** → **Aplicativo da Web**
5. Em *URIs de redirecionamento autorizados*, adicione `http://localhost:3000/api/auth/callback/google`
6. Copie o Client ID e o Client Secret para o `.env.local`

### 4. Rodar

```bash
pnpm dev            # http://localhost:3000
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm test:unit` | testes puros de domínio e aplicação, com cobertura |
| `pnpm test:integration` | testes contra Postgres real (exige `pnpm db:up`) |
| `pnpm test:e2e` | Playwright, usa o Chrome do sistema |
| `pnpm verify` | `typecheck && lint && test:unit && test:integration && build` |
| `pnpm db:up` / `db:reset` / `db:migrate` / `db:seed` | ciclo do banco local |

## Arquitetura

```
src/
├── domain/          núcleo puro: sem I/O, sem framework, sem Date, não lança
├── application/     casos de uso, um diretório por caso; ports e schemas Zod
├── infrastructure/  Drizzle, repositórios, auth, configuração
├── app/             Next App Router; Server Actions; camada mais fina possível
├── components/      UI
└── lib/             formatação BRL e pt-BR — única fronteira onde centavos viram texto
```

Cinco regras estruturam o resto, detalhadas em [AGENTS.md](AGENTS.md) e decididas em [.specs/STATE.md](.specs/STATE.md):

1. **Nenhum dado financeiro real no repositório.** Seeds e fixtures são sintéticos.
2. **Dinheiro é inteiro em centavos**, com sufixo `_centavos`. Nenhum float, em nenhuma camada.
3. **Competência é `'YYYY-MM'`**, com aritmética de meses em inteiros. Nenhum `Date` no domínio.
4. **`src/domain` é puro**, e isso é enforçado por um teste que lê os imports da camada — não é convenção.
5. **Só a tabela `movimento` é somável.** `pagamento_fatura` não tem `natureza` nem `categoria_id`, e um teste fixa esse conjunto de colunas: é o que impede que uma compra no cartão e o pagamento da fatura sejam contados duas vezes.

## Estado e limitações

Verificado por um agente independente; relatório em [.specs/features/mvp-gestao-financeira/validation.md](.specs/features/mvp-gestao-financeira/validation.md).

**Funciona e está coberto:** cadastro de compra parcelada com distribuição automática, compras já em andamento (`8/10` sem inventar meses passados), virada de ano, ciclo de fatura, visão mensal com os dois eixos separados, autenticação restrita por allowlist.

**Limitações conhecidas:**

- **O eixo caixa é parcial.** Soma apenas os lançamentos da própria competência já pagos. A fórmula completa inclui o pagamento de fatura, cuja tela ficou fora do MVP.
- **`pagamento_fatura` tem a forma provada e o comportamento inexistente.** A tabela está correta e fiscalizada, mas nada escreve nela ainda.
- **Sem UI para marcar pago, lançamento avulso, recorrências, orçamento e dashboard.** O domínio está pronto e testado; falta a interface.
- **Sem importador da planilha.** O histórico antigo permanece nela; o cadastro aqui é manual.
- **100% de cobertura de branches vale só para `src/domain`.**
- **Nada vigia o `vitest.config.ts`**: reverter uma linha de `include` esconde testes com a suíte verde.

Os itens adiados estão listados com justificativa em [spec.md](.specs/features/mvp-gestao-financeira/spec.md), seção *Out of Scope*.
