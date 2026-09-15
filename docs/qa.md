# QA antes de deployar

Roteiro para exercitar o app **em modo produção**, contra um banco limpo, antes de qualquer deploy.
Ele existe porque `pnpm dev` e `pnpm start` não são o mesmo programa: o build de produção embute
`NODE_ENV=production`, e isso muda autenticação, cookies e o provider de teste.

O QA tem **dois estágios**, e o segundo depende de algo que só você pode criar.

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

DATABASE_URL="postgres://mybilling:mybilling@localhost:5433/mybilling_qa" \
AUTH_SECRET="$(openssl rand -base64 32)" \
AUTH_GOOGLE_ID="..." \
AUTH_GOOGLE_SECRET="..." \
EMAILS_PERMITIDOS="seu-email@exemplo.com" \
pnpm start --port 3200
```

`pnpm dev` precisa estar parado se você usar a porta dele. O Next 16 recusa um segundo `next dev` no
mesmo diretório; `next start` numa porta livre convive com ele.

Conferência de que subiu e que a autenticação está ligada:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3200/
# 307 http://localhost:3200/login
```

---

## Estágio 2 — inserir à mão

É aqui que se digita uma despesa avulsa, um Pix recebido, uma compra parcelada e um gasto fixo, e se
confere na tela que cada um caiu no bloco certo e mexeu no indicador certo.

> [!IMPORTANT]
> **Depende das credenciais reais do Google OAuth, e só você pode criá-las.**

Não há contorno, e a razão é de desenho, não descuido. Em modo produção o único provider registrado
é o Google:

```bash
curl -s http://localhost:3200/api/auth/providers
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

### O que fazer, então

1. No Google Cloud Console, criar credenciais OAuth 2.0 do tipo *Aplicativo Web*.
2. Em **Origens JavaScript autorizadas**, acrescentar `http://localhost:3200`.
3. Em **URIs de redirecionamento autorizados**, acrescentar
   `http://localhost:3200/api/auth/callback/google`.
4. Pôr o id e o segredo nas variáveis do comando do estágio 1, passo 3.
5. Pôr o seu e-mail em `EMAILS_PERMITIDOS`. Quem não está na lista recebe 403, e nenhum usuário é
   criado (AD-007).

Essas credenciais são pré-requisito do deploy de qualquer forma — o app não autentica ninguém sem
elas. Fazê-las agora não é trabalho extra, é trabalho adiantado.

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

## Limpar depois

```bash
docker exec mybilling-db psql -U mybilling -d postgres -c "DROP DATABASE mybilling_qa;"
```

O banco de desenvolvimento não é tocado por nada deste roteiro.
