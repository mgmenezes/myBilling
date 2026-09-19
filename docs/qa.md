# QA antes de deployar

Roteiro para exercitar o app **em modo produção**, contra um banco limpo, antes de qualquer deploy.
Ele existe porque `pnpm dev` e `pnpm start` não são o mesmo programa: o build de produção embute
`NODE_ENV=production`, e isso muda autenticação, cookies e o provider de teste.

O QA tem **dois estágios**. O segundo exige login pelo Google, que é gesto humano — nenhum agente
faz por você.

> [!IMPORTANT]
> **Ele roda contra o Postgres local, e não contra o Neon.** A porta 5432 de saída é bloqueada nesta
> rede, então o app rodando aqui não alcança o banco gerenciado — o mesmo bloqueio que impede o
> `pnpm db:migrate`. Exercitar o Neon de verdade só depois que o app estiver hospedado.

---

## Estágio 1 — banco limpo em modo produção

Roda sem depender de nada externo. Prova que as migrations aplicam do zero, que o build de
produção sobe contra esse banco e que a autenticação está ligada.

### 1. Um banco vazio, separado do de desenvolvimento

```bash
pnpm db:up   # se o contêiner não estiver de pé

docker exec mybilling-db psql -U mybilling -d postgres \
  -c "DROP DATABASE IF EXISTS mybilling_qa;" \
  -c "CREATE DATABASE mybilling_qa OWNER mybilling;"
```

Separado de propósito. Usar o banco de desenvolvimento faria o teste começar com os 114 movimentos
do seed, e nenhuma inserção nova seria distinguível do que já estava lá.

### 2. As migrations, do zero

```bash
DATABASE_URL="postgres://mybilling:mybilling@localhost:5433/mybilling_qa" pnpm db:migrate
```

Conferência — 10 tabelas, 3 migrations registradas:

```bash
docker exec mybilling-db psql -U mybilling -d mybilling_qa -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"   # 10
docker exec mybilling-db psql -U mybilling -d mybilling_qa -tAc \
  "SELECT count(*) FROM drizzle.__drizzle_migrations;"                            # 3
```

**Nenhum seed.** O ponto do estágio é digitar à mão e ver o que aparece.

### 3. O build de produção, apontando para ele

```bash
pnpm build

set -a; source .env.local; set +a
DATABASE_URL="postgres://mybilling:mybilling@localhost:5433/mybilling_qa" pnpm start
```

**Na porta 3000, e não numa porta alternativa.** O `AUTH_GOOGLE_ID` tem as URLs de redirecionamento
registradas no Google Cloud Console, e `http://localhost:3000/api/auth/callback/google` é a que já
existe — é por ela que o login funciona em `pnpm dev`. Subir noutra porta devolve
`redirect_uri_mismatch`, a menos que você acrescente a URL nova no console antes.

`pnpm dev` precisa estar parado: os dois disputam a 3000, e o Next 16 recusa um segundo `next dev`
no mesmo diretório de todo modo.

O `source .env.local` reaproveita as credenciais que já existem ali; só o `DATABASE_URL` é
sobrescrito, para apontar ao banco de QA em vez do de desenvolvimento.

Conferência de que subiu e que a autenticação está ligada:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/
# 307 http://localhost:3000/login
```

---

## Estágio 2 — inserir à mão

É aqui que se digita uma despesa avulsa, um Pix recebido, uma compra parcelada e um gasto fixo, e se
confere na tela que cada um caiu no bloco certo e mexeu no indicador certo.

> [!IMPORTANT]
> **Exige login pelo Google, no navegador. Nenhum agente faz isso por você.**

Não há contorno, e a razão é de desenho, não descuido. Em modo produção o único provider registrado
é o Google:

```bash
curl -s http://localhost:3000/api/auth/providers
# {"google":{...}}   — e nada mais
```

O provider de credenciais de teste exige **duas** condições simultâneas: `NODE_ENV=test` e
`AUTH_PROVIDER_DE_TESTE=1`. Num build de produção a variável não habilita nada: ela **derruba o
boot**, de propósito.

```
Error: AUTH_PROVIDER_DE_TESTE está definida em ambiente de produção.
O provedor de credenciais de teste nunca pode ser montado em produção:
remova a variável do ambiente.
```

Degradar em silêncio deixaria um provider de credenciais sem senha exposto na internet. A falha
barulhenta é a feature (`src/infrastructure/auth/auth.ts`, `provedorDeTesteHabilitado`).

### As credenciais já existem

`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` e `EMAILS_PERMITIDOS` estão preenchidos em `.env.local`, com
valores reais — é o que faz o login funcionar em `pnpm dev`. Rodando o estágio 1 na porta 3000 e
com `source .env.local`, o estágio 2 não precisa de nada novo.

**Quando o app for hospedado**, o Google Cloud Console precisa de duas entradas a mais, apontando
para o domínio de produção:

- **Origens JavaScript autorizadas**: `https://<dominio>`
- **URIs de redirecionamento autorizados**: `https://<dominio>/api/auth/callback/google`

Quem não está em `EMAILS_PERMITIDOS` recebe 403, e nenhum usuário é criado (AD-007).

**`AUTH_SECRET` é outra coisa, e não pode ficar como o exemplo.** Ele assina o cookie de sessão; o
valor do `.env.example` está publicado no repositório. Gere um por ambiente:

```bash
openssl rand -base64 32
```

**Nenhum segredo entra neste repositório.** Os valores acima são placeholders; os reais vivem em
`.env.local`, que o `.gitignore` cobre, ou no ambiente do host.

---

## Roteiro de inserção, quando o estágio 2 destravar

Cada linha tem um resultado observável na tela. A ordem importa: o primeiro item cria os cadastros
que os seguintes usam.

| # | O que inserir | Onde | O que conferir |
| --- | --- | --- | --- |
| 1 | Categoria "Mercado" e meio "Conta Corrente" pelo `+ nova` / `+ novo` | Lançamentos › + Novo lançamento | Aparecem selecionados sem recarregar a página |
| 2 | Um cartão de crédito, com dias de fechamento e vencimento | O mesmo `+ novo` | Os dois dias só aparecem quando o tipo é cartão |
| 3 | Despesa avulsa de R$ 32,50 na conta corrente | Aba Avulso | Cai em **Gastos do Mês**; "já saiu da conta" vem **marcada** |
| 4 | Despesa avulsa de R$ 48,90 no cartão | Aba Avulso | Cai em **Cartão de Crédito**; a caixa vem **desmarcada** |
| 5 | Receita de R$ 50,00 ("Pix recebido") | Aba Avulso, "Um dinheiro que entra" | Campo vira **"Onde o dinheiro cai"** e **não oferece o cartão**; a linha cai em **Entradas** |
| 6 | Compra de R$ 1.000,00 em 3x no cartão | Aba Parcelado | A prévia mostra 333,34 / 333,33 / 333,33; as parcelas aparecem nos dois meses seguintes **sem você cadastrar nada** |
| 7 | Gasto fixo "Conta de luz", R$ 180,00, vencimento dia 10 | Todo mês | Aparece em março, abril e maio |
| 8 | Receita fixa "Salário" | Todo mês, "Um dinheiro que entra" | Título vira **"Nova entrada fixa"**, botão **"Cadastrar entrada"**, dia vira **"Dia que costuma cair"** |
| 9 | Excluir o item 3, em dois toques | Lançamentos | O total do mês volta ao valor de antes dele |
| 10 | Tentar excluir uma parcela do item 6 | Lançamentos | **Não há controle de excluir** na linha de parcela |

Depois, em 400px de largura: nada deve rolar na horizontal, e o diálogo de cadastro deve ocupar a
tela inteira.

---

## O banco gerenciado — Neon

Projeto `mybilling` (`withered-sun-35456817`), branch `production`, banco `neondb`.

Três coisas foram conferidas na criação, e as três importam:

- **Região `sa-east-1` (São Paulo).** Não é latência: competência e data de pagamento são resolvidas
  em `America/Sao_Paulo` explicitamente. Banco e fuso na mesma região evitam uma classe inteira de
  confusão de virada de mês.
- **BetterAuth desligado.** A autenticação é do app — Auth.js v5, Google, allowlist de dois e-mails
  (AD-007). Ligar o serviço do Neon acrescentaria uma peça que nada no código usa.
- **Postgres 18.** O Docker local e o CI foram subidos para 18 por causa disso: testar numa versão
  e rodar noutra reintroduz, em escala menor, o problema que o AD-010 existe para evitar.

`scale to zero` em 5 minutos, e o plano free não deixa mudar. É o custo que o handoff já registrava:
**toda abertura de mês escreve no banco**, porque a materialização de recorrências roda durante a
leitura da página. O primeiro acesso depois de 5 minutos parado paga o cold start em cima disso. Não
quebra — a materialização é idempotente.

### Quando a porta 5432 está bloqueada

`pnpm db:migrate` não conecta de rede corporativa: 5432 de saída é comumente barrada. Na primeira
aplicação, os dois endpoints do Neon resolviam DNS e **nenhum** aceitava TCP, enquanto a 443 do
mesmo host conectava na hora.

O contorno usa o SQL Editor do Neon, que fala HTTPS:

```bash
pnpm db:sql > /tmp/migrations.sql
```

Cole o conteúdo no SQL Editor, no branch certo, e rode de uma vez — é uma transação só. O bloco
termina com uma consulta de conferência que devolve **uma linha com veredito**.

Três coisas sobre esse caminho:

**Não é um segundo mecanismo de migration.** Quem manda continua sendo o `drizzle-kit`. O `db:sql`
não inventa SQL: lê `drizzle/meta/_journal.json` e concatena os arquivos na ordem registrada.

**O resultado não se commita.** É gerado, e um bloco gravado no repositório ficaria obsoleto na
quarta migration — alguém colaria o velho achando que está em dia.

**A parte que importa são os `INSERT` em `drizzle.__drizzle_migrations`.** Sem eles o schema
existiria e o próximo `db:migrate`, de qualquer lugar, tentaria criar tudo de novo e estouraria em
"relation already exists". A coluna `hashes_certos` da conferência é o que prova que ficaram certos.

Conferido em 2026-09-15 no branch `production`: **10 tabelas, 3 migrations, 23 restrições `CHECK`,
0 movimentos, 3 hashes certos.**

### Se a rede permitir 5432

O caminho normal, e o preferido:

```bash
DATABASE_URL="<string do Neon, sem o -pooler>" pnpm db:migrate
```

**Sem o `-pooler` no host.** O endpoint com pooler serve a aplicação; para DDL, use o direto.

---

## Limpar depois

```bash
docker exec mybilling-db psql -U mybilling -d postgres -c "DROP DATABASE mybilling_qa;"
```

O banco de desenvolvimento não é tocado por nada deste roteiro.
