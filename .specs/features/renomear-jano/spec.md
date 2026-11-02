# O app se chama Jano: Specification

> Pedido do dono em 2026-11-02: "vamos mudar o herói e o nome para jano, onde estiver mybilling no
> nosso projeto". Respostas do dono no mesmo dia: o herói do login ganha a mesma voz da landing; a
> troca alcança o que se vê e os documentos vivos, e não os identificadores técnicos nem o histórico.
> Continua a fatia `landing-jano` (AD-026), que renomeou só a landing.

## Problem Statement

A landing já se chama Jano, mas quem entra no app vê "myBilling" no login, no menu lateral, no
título da aba e em mensagens. O dono decidiu levar o nome para o app agora. A troca precisa atingir
tudo o que uma pessoa lê, sem quebrar o ambiente local, os testes ou a produção, que dependem de
nomes técnicos como o banco `mybilling`.

## Goals

- [ ] Nenhum texto que uma pessoa lê no app diz "myBilling"
- [ ] O login abre pela marca do Jano e pela manchete da landing
- [ ] Os documentos vivos chamam o produto de Jano
- [ ] `pnpm verify`, `pnpm site:verificar` e `pnpm test:e2e` saem 0

## Out of Scope

| Feature | Reason |
| --- | --- |
| Banco, usuário e senha do Postgres (`mybilling`, `mybilling_test`), contêiner `mybilling-db`, volume | Decisão do dono: identificadores técnicos ficam; trocar quebraria o ambiente local e o `DATABASE_URL` de produção |
| Nome do pacote (`"name": "mybilling"`), nome da pasta e do repositório no GitHub | Idem; o repositório é operação remota |
| Chave do tema no navegador (`mybilling:tema`) | Trocar apagaria a escolha de tema de quem já usa; não é texto |
| Specs antigas, ADs anteriores, handoffs anteriores, `docs/referencias/` | Histórico de como as decisões foram tomadas; decisão do dono |
| Variáveis e projetos na Vercel | Operação remota; o dono já renomeou os projetos à mão |
| Domínio próprio e busca no INPI | Com o dono |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Alcance | Texto visível do app, nomes acessíveis, título e descrição da aba, ícone, comentários de código e documentos vivos | Dono em 2026-11-02 | y |
| Herói do login | Marca do Jano, `<h1>` "Antes de parcelar, pergunte ao Jano." e um subtítulo curto; continua uma tela de entrar, sem simulador | Dono em 2026-11-02: "mesma voz da landing" | y |
| Marca no app | Um componente `MarcaJano` com o mesmo desenho de dois arcos da landing, em `currentColor` | Uma marca só nos dois lugares; continua provisória | n (decisão do autor) |
| Ícone da aba | `src/app/icon.svg` com a marca, no lugar do `favicon.ico` | O arquivo antigo é o ícone padrão; o Next lê `icon.svg` sozinho | n (decisão do autor) |
| Nomes acessíveis | "Menu do Jano" e "Áreas do Jano" | O leitor de tela fala o nome do produto | n (decisão do autor) |
| Descrição da aba | "As contas da casa, mês a mês." | O selo da landing | n (decisão do autor) |
| Subtítulo do login | "Cadastre a compra parcelada e as contas fixas uma vez. O Jano mostra quanto vai sobrar em cada um dos próximos meses." | Diz o que é, como na landing, em duas frases | n (decisão do autor) |
| Como se prova "nenhum myBilling visível" | Um teste que varre `src/` e `site/` (fontes, não o pacote gerado) por "myBilling" com essa grafia | Os identificadores técnicos que ficam são todos em minúscula (`mybilling`), e o pacote é regenerado | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Ciclo de vida do dado | N/A: nenhum dado muda; a chave do tema fica para não apagar escolhas |
| Falha de dependência externa | NOME-04 AC 4: os identificadores do banco ficam, e o gate com Postgres prova que nada quebrou |
| Demais dimensões | N/A: troca de texto, sem entrada, escrita ou estado novo |

---

## User Stories

### P1: A marca do Jano no app ⭐ MVP — NOME-01

**User Story**: Como pessoa que usa o app, quero ver o mesmo nome da página que me trouxe até aqui.

**Why P1**: É o pedido.

**Acceptance Criteria**

1. The menu lateral SHALL ter o link "Jano", com o símbolo de dois arcos, para `/`
2. The menu lateral SHALL ter o nome acessível "Menu do Jano", e a navegação SHALL ter "Áreas do Jano"
3. The `<title>` do app SHALL ser "Jano" e a descrição SHALL ser "As contas da casa, mês a mês."
4. The app SHALL servir o ícone da aba a partir de `src/app/icon.svg`, com o símbolo de dois arcos, e
   SHALL não ter mais `src/app/favicon.ico`

**Independent Test**: entrar no app e ler o menu e a aba do navegador.

---

### P1: O herói do login ⭐ MVP — NOME-02

**User Story**: Como pessoa que vai entrar, quero reconhecer o produto da landing na tela de login.

**Why P1**: Decisão do dono: "mesma voz da landing".

**Acceptance Criteria**

1. The login SHALL ter a marca "Jano" com o símbolo de dois arcos
2. The login SHALL ter o `<h1>` exato "Antes de parcelar, pergunte ao Jano."
3. The login SHALL ter o subtítulo "Cadastre a compra parcelada e as contas fixas uma vez. O Jano
   mostra quanto vai sobrar em cada um dos próximos meses."
4. The login SHALL manter o botão "Entrar com o Google" e a frase de acesso restrito

**Independent Test**: abrir `/login` sem sessão.

---

### P1: Nenhum myBilling que se lê ⭐ MVP — NOME-03

**User Story**: Como dono, quero ter certeza de que nenhuma tela ou mensagem ficou com o nome antigo.

**Why P1**: Uma ocorrência esquecida desmente o nome novo.

**Acceptance Criteria**

1. The página de acesso negado, a mensagem `ACESSO_NEGADO` e a frase do alternador da Visão geral
   SHALL dizer "Jano" onde diziam "myBilling"
2. The código-fonte em `src/` e `site/` (fora o pacote gerado `site/simulador.js`) SHALL não conter
   "myBilling" nessa grafia, nem em comentário
3. The pacote `site/simulador.js` SHALL ser regenerado e continuar fresco (JANO-05)
4. The testes de componente e e2e que procuram o nome SHALL procurar "Jano"

**Independent Test**: `git grep -n "myBilling" -- src site` devolve só o pacote antes de regenerar, e
nada depois.

---

### P2: Documentos vivos e gates — NOME-04

**User Story**: Como mantenedor, quero que quem chega ao repositório leia o nome certo.

**Why P2**: Condição de fechamento.

**Acceptance Criteria**

1. `README.md`, `AGENTS.md` (fora o bloco gerado pelo `next dev`), `docs/design.md`, `docs/deploy.md`,
   `docs/qa.md`, `docs/importacao.md` e `site/README.md` SHALL chamar o produto de Jano, e SHALL dizer
   que banco, contêiner e pacote continuam `mybilling`
2. `docs/marketing/posicionamento.md` SHALL registrar, na seção "Nome", que desde 2026-11-02 o app
   também se chama Jano por fora
3. `.specs/STATE.md` SHALL ter AD-027 e o Handoff; `.specs/HANDOFF.md` SHALL apontar para cá
4. WHEN `pnpm verify`, `pnpm site:verificar` e `pnpm test:e2e` rodam THEN they SHALL sair com código 0

**Independent Test**: os três comandos.

---

## Edge Cases

- A chave `mybilling:tema` continua: quem já escolheu tema não perde a escolha
- Os `DATABASE_URL` com `mybilling` continuam valendo no local, no teste e em produção
- Specs antigas e ADs anteriores continuam dizendo myBilling, como registro do que foi decidido

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| NOME-01 | P1: A marca do Jano no app | Tasks | Pending |
| NOME-02 | P1: O herói do login | Tasks | Pending |
| NOME-03 | P1: Nenhum myBilling que se lê | Tasks | Pending |
| NOME-04 | P2: Documentos vivos e gates | Tasks | Pending |

**Coverage:** 4 total, 4 mapeados para tasks (T1 a T4 em `tasks.md`), 0 unmapped

---

## Success Criteria

- [ ] Nenhuma tela do app diz myBilling
- [ ] O login abre pela manchete do Jano
- [ ] `pnpm verify && pnpm site:verificar && pnpm test:e2e` saem 0; Verifier PASS
