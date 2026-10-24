# Deploy — Vercel + Neon

App na **Vercel**, banco no **Neon** (São Paulo, Postgres 18). Este documento é o roteiro de
execução: cada passo é uma ação, e cada escolha traz a razão junto, para que ninguém a desfaça sem
saber o que estava resolvendo.

**Nenhum segredo entra neste repositório.** Os valores reais vivem em `.env.local` (coberto pelo
`.gitignore`), nas variáveis da Vercel e nos secrets do GitHub.

---

## O que já está pronto

- **Banco provisionado e migrado.** Neon em São Paulo, Postgres 18, Neon Auth desligado, as três
  migrations aplicadas no branch `production`, controle de migrations consistente. Foram aplicadas
  pelo SQL Editor do console (`pnpm db:sql`), com o mesmo `hash` e o mesmo `created_at` que o
  drizzle gravaria — por isso o primeiro `pnpm db:migrate` do CI não tem nada a aplicar.
- **O CI roda o gate completo**: typecheck, lint, 856 unitários, 237 de integração, build e 57 e2e.
  O job `migrate` só fica verde depois do passo 4; o run do push que o introduziu falhou sem o
  secret, e basta "Re-run failed jobs" depois de criá-lo.
- **`trustHost: true`** em `src/infrastructure/auth/auth.ts`, então o Auth.js resolve a URL sozinho
  na Vercel. **Não** defina `AUTH_URL`.
- **`pg.Pool` com `max: 5`** e timeouts de 10s (`src/infrastructure/db/client.ts`), que é a
  configuração que serverless exige.
- **`vercel.json`** fixa a região em `gru1`.

---

## Passo 1 — Importar o projeto na Vercel

No painel: **Add New → Project → Import Git Repository → `mgmenezes/myBilling`**.

A Vercel detecta Next.js e lê o `packageManager` do `package.json` (pnpm 12.4.1). **Não sobrescreva
o build command.** Ele é `next build`, e a migration **não** roda aqui — ver o passo 4.

Confirme, em **Settings → Functions**, que a região é **São Paulo (`gru1`)**. O `vercel.json` já
pede isso, e a razão não é só latência: competência e data de pagamento são resolvidas em
`America/Sao_Paulo` explicitamente, e banco, função e fuso na mesma região eliminam uma classe
inteira de confusão de virada de mês.

---

## Passo 2 — As cinco variáveis de ambiente

Em **Settings → Environment Variables**, no escopo **Production**:

| Variável | De onde vem |
| --- | --- |
| `DATABASE_URL` | Neon, **connection string com `-pooler`** |
| `AUTH_SECRET` | gere uma nova: `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google Cloud Console, o mesmo de `.env.local` |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console, o mesmo de `.env.local` |
| `EMAILS_PERMITIDOS` | os dois e-mails da casa, separados por vírgula |

São exatamente cinco — a lista completa está em `.env.example`.

**`DATABASE_URL` usa o endpoint com pooler.** Cada invocação serverless abre seu próprio pool, e
sem o PgBouncer do Neon na frente o número de conexões cresce com o tráfego até estourar o limite
do projeto.

**`AUTH_SECRET` precisa ser novo.** Ele assina o cookie de sessão, e o valor do `.env.example` está
publicado neste repositório. Reaproveitá-lo é publicar a chave da sessão.

> [!WARNING]
> **Nunca defina `AUTH_PROVIDER_DE_TESTE` na Vercel.** Em build de produção ela **derruba o boot**
> por desenho (`provedorDeTesteHabilitado`, em `src/infrastructure/auth/auth.ts`). A falha
> barulhenta é a feature: degradar em silêncio deixaria um provider de credenciais sem senha
> exposto na internet.

---

## Passo 3 — Google Auth Platform

O OAuth fica no **Google Auth Platform**, com menu lateral Visão geral, Branding, Público-alvo,
Clientes, Acesso a dados, Central de verificação e Configurações. Os nomes da interface antiga
correspondem assim: "Credenciais" é **Clientes**; "Tela de consentimento OAuth" se dividiu entre
Branding, **Público-alvo** e Acesso a dados.

Depois do primeiro deploy, quando o domínio existir:

1. **Clientes** → o cliente cujo ID está em `AUTH_GOOGLE_ID` → acrescente, sem apagar as entradas
   de `localhost`:
   - **Origens JavaScript autorizadas**: `https://<dominio>`
   - **URIs de redirecionamento autorizados**: `https://<dominio>/api/auth/callback/google`

   `<dominio>` é o domínio de produção do projeto na Vercel, e não a URL de um deploy específico,
   que muda a cada publicação. O Google compara letra por letra, e a mudança pode levar alguns
   minutos para valer.
2. **Público-alvo** → confira o **status de publicação**. **Em teste**, o Google só deixa autenticar
   quem estiver em **Usuários de teste**, e recusa os demais antes de o pedido chegar ao app. Os
   dois e-mails de `EMAILS_PERMITIDOS` precisam estar lá — ou o app precisa ser publicado.

Sem o passo 1, o login devolve `redirect_uri_mismatch`. São duas listas com papéis diferentes: a do
Google decide quem consegue autenticar, a do app decide quem entra. Quem passar pela primeira e não
estiver em `EMAILS_PERMITIDOS` recebe 403 e **nenhum usuário é criado** (AD-007).

---

## Passo 4 — O secret da migration, no GitHub

Em **Settings → Secrets and variables → Actions**, crie:

| Secret | Valor |
| --- | --- |
| `NEON_DATABASE_URL_DIRETA` | connection string do Neon **sem** `-pooler` |

Sem ele, o job falha no primeiro passo, "Conferir o secret da migration", com o nome do secret na
mensagem. Antes dessa conferência, a falha era um código 1 mudo do `drizzle-kit`.

**É outra URL, e a diferença importa.** O app fala pelo pooler; a migration, não. O PgBouncer do
Neon opera em modo transação, e DDL por ele é caminho de falha intermitente — o tipo de erro que
aparece uma vez em dez e some quando você vai investigar.

O job `migrate` do `.github/workflows/ci.yml` roda `pnpm db:migrate` **depois** do gate completo e
**só** em `main`. Ele referencia o environment `producao`: se você configurar revisores nele, toda
migration de produção passa a esperar aprovação humana. Sem revisores, ela roda direto.

---

## O que este arranjo **não** garante: a ordem

A Vercel builda e publica por conta própria assim que o push chega, e o job de migration roda em
paralelo, no GitHub. **Não há ordem garantida entre os dois.**

Para migration aditiva — coluna nova, tabela nova, `CHECK` novo, que é tudo que este projeto teve
até aqui — isso é inofensivo: o código antigo ignora o que não conhece. Para migration que
**remove ou renomeia**, não é: existe uma janela em que o código novo roda contra o schema velho,
ou o contrário.

Quando chegar uma migration destrutiva, há dois caminhos:

1. **Separar em dois deploys** — primeiro a migration aditiva e o código que tolera os dois
   formatos; depois, num segundo merge, a remoção. É o padrão *expand/contract*, e não depende de
   nenhuma configuração.
2. **Desligar o auto-deploy da Vercel** (Settings → Git → Ignored Build Step) e disparar o deploy
   por *Deploy Hook* como passo final do job `migrate`, o que serializa os dois.

O caminho 1 é preferível: ele não acopla a publicação ao CI e continua funcionando se um dos dois
sistemas estiver fora do ar.

---

## Passo 5 — Conferir que subiu

1. Abrir `https://<dominio>` → deve **redirecionar para `/login`**.
2. Entrar com um e-mail de `EMAILS_PERMITIDOS` → cai no mês corrente.
3. Entrar com um e-mail fora da lista → **403, e nenhum usuário criado**.
4. Cadastrar um lançamento avulso e ver o indicador do painel se mover.
5. Abrir um mês futuro e voltar: as ocorrências de recorrência são materializadas **na leitura**, e
   a idempotência vem da restrição única `movimento_recorrencia_competencia_uq`.

O roteiro completo de QA manual, com o que digitar e o que esperar, está em `docs/qa.md`.

---

## Custo operacional que vale saber de antemão

**"Scale to zero" tem preço específico neste app.** Toda abertura de mês **escreve** no banco,
porque a materialização de recorrências roda durante a leitura da página. Com o banco hibernando, o
primeiro acesso do dia paga o cold start em cima disso. Não quebra nada — a materialização é
idempotente e a janela é de quatro meses —, mas é a diferença entre uma tela instantânea e uma de
alguns segundos, uma vez por dia.

**No plano gratuito, o branch é arquivado depois de um período sem uso.** O `production` foi
arquivado assim em 2026-09-29, antes de o app existir em lugar nenhum. A primeira consulta
desarquiva sozinha, sem perder nada; é o primeiro acesso depois de um período parado que paga.
