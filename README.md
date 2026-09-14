# myBilling

Gestão financeira doméstica para duas pessoas. Substitui uma planilha com uma aba por mês.

**O problema que ele resolve:** compras parceladas exigiam re-digitação manual em cada aba futura, e esquecer uma parcela corrompia o saldo. Aqui a compra é cadastrada **uma vez** e as parcelas se distribuem sozinhas pelos meses seguintes, inclusive na virada de ano, com garantia aritmética de que a soma das parcelas é exatamente o valor total.

## Como executar

### Pré-requisitos

- Node 24+
- pnpm (`corepack enable`, ou `npm i -g pnpm`)
- Docker (para o Postgres local)

### 1. Dependências

```bash
pnpm install
```

### 2. Variáveis de ambiente

**Antes do banco.** `pnpm db:migrate` e `pnpm db:seed` leem a `DATABASE_URL` do `.env.local`; sem o arquivo, os dois falham.

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

Em [console.cloud.google.com](https://console.cloud.google.com), na **Google Auth Platform**:

1. Crie um projeto e abra *Google Auth Platform* (a busca do topo acha por esse nome)
2. **Branding** — nome do app e e-mail de suporte
3. **Público-alvo** — tipo **Externo**, e em *Usuários de teste* adicione os e-mails que vão usar o app.
   Enquanto o app estiver em modo de teste, **só esses e-mails conseguem entrar**. É uma camada além
   da `EMAILS_PERMITIDOS`; as duas precisam conter os mesmos endereços.
4. **Clientes** → *Criar cliente* → tipo **Aplicativo da Web**
5. Em *URIs de redirecionamento autorizados*, adicione:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   Em produção, acrescente o mesmo caminho no domínio real.
6. Copie o **Client ID** e o **Client Secret** para o `.env.local`

> A interface antiga (*APIs e Serviços* → *Credenciais* → *Tela de permissão OAuth*) foi substituída
> pela Google Auth Platform. Se encontrar um tutorial falando em "Tela de permissão OAuth", ela virou
> três itens: **Branding**, **Público-alvo** e **Acesso a dados**.

### 4. Banco

Nesta ordem, e só depois de o `.env.local` existir:

```bash
pnpm db:up          # sobe o Postgres em Docker, porta 5433
pnpm db:migrate     # cria as 10 tabelas a partir de drizzle/
pnpm db:seed        # dados sintéticos para desenvolvimento (opcional)
```

`db:up` só sobe o contêiner: **ele não cria tabela nenhuma**. Pular o `db:migrate` produz um erro de consulta na primeira tela autenticada, porque o login grava o usuário mas a leitura seguinte não acha a tabela.

Para conferir que deu certo:

```bash
docker exec mybilling-db psql -U mybilling -d mybilling -c '\dt'
```

Devem aparecer 10 tabelas.

### 5. Rodar

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
| `pnpm db:up` / `db:down` / `db:reset` | ciclo do contêiner Postgres local |
| `pnpm db:migrate` | aplica as migrations de `drizzle/` no banco da `DATABASE_URL` |
| `pnpm db:generate` | gera uma migration nova a partir do schema, **para revisão à mão** |
| `pnpm db:seed` | popula com dados sintéticos e determinísticos |

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
