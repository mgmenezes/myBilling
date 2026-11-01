# Campanha de lista de espera: Specification

## Problem Statement

O myBilling existe para uma casa: dois e-mails numa allowlist (AD-007), sem cadastro aberto, sem
preço. O dono quer começar a **vender** a ideia para outros casais, com o argumento "por que usar o
myBilling em vez de uma planilha do Google Sheets", e decidiu que a primeira rodada é uma **lista de
espera**: uma página que explica o produto e recolhe e-mails, sem mudar nada no app. Abrir o produto
de verdade (multi-tenant, isolamento, preço) é outra fatia, e só vale a pena depois de medir
interesse.

O estudo que precedeu esta spec (sessão de 2026-10-31) fixou o público e o ângulo:

- **Público:** casais que dividem as contas da casa, nos três estados em que se encontram hoje:
  controlando numa planilha, num caderno, ou em nada. A planilha é o antagonista da narrativa porque
  é a referência que todo mundo entende, mas a página não pressupõe que a pessoa tenha uma.
- **Ângulo:** a planilha e o caderno deixam você errar; o myBilling não deixa. Os erros que corrompem
  controle doméstico (parcela esquecida, fatura somada com a compra, mês que vira errado, reajuste
  que apaga o passado) são impossíveis aqui por construção, e isso é verificável no código.
- **O espaço vazio:** Mobills e Organizze olham para o indivíduo e vendem sincronização bancária.
  "Para dois", com um caixa só e cada lançamento com dono, ninguém ocupa.

Duas restrições mandam em toda peça. **Nenhum dado financeiro real da família** pode aparecer em
texto, imagem ou alt (AD-009): toda captura vem do seed sintético. E **nenhuma promessa fora do que
o app faz hoje**: sem sincronização bancária, sem app nativo, sem orçamento por categoria, sem área
de cartões e fatura, sem edição de compra, sem proteção contra edição simultânea (a spec de
`editar-fixos` adota "a última gravação vale").

## Goals

- [ ] Um documento de posicionamento que qualquer peça futura consiga seguir sem voltar ao dono
- [ ] Uma landing page estática, na identidade do app, que explica onde as contas de casa quebram e
      recolhe e-mails para a lista de espera
- [ ] Um kit de copy com variações de headline, três textos curtos e um texto longo
- [ ] Zero dado real e zero promessa falsa, provados por teste onde o teste alcança

## Out of Scope

| Feature | Reason |
| --- | --- |
| Multi-tenant, cadastro aberto, preço | É o cenário "produto aberto". Exige mudar modelo de dados e autenticação; só se justifica depois de medir a lista de espera |
| Rota pública dentro do app Next.js | Decidido com o dono: a landing é projeto estático separado em `site/`, para não entrar no gate de cobertura nem no proxy de login |
| Back-end de formulário | Decidido com o dono: o e-mail cai num Google Forms criado por ele; a página só aponta para a URL |
| Deploy da landing | Criar projeto na Vercel é operação remota e exige autorização separada, como `git push` |
| Artigo técnico sobre as decisões AD-001..AD-011 | Boa peça de portfólio para público de engenharia, mas não vende o produto para quem o usa. Outra campanha |
| Repositório público | Decisão do dono, fora desta fatia |
| Lighthouse como gate | O número de Lighthouse depende da máquina e da rede. A acessibilidade é provada com axe-core no navegador, que é determinístico; o Lighthouse fica como conferência manual do dono |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que se vende nesta rodada | Lista de espera, sem mudança no app | Mede interesse antes de meses de multi-tenant; a página vira a home do produto depois sem retrabalho | y |
| Público | Casais que dividem as contas, em planilha, caderno ou nada | A pessoa exata para quem o produto foi feito. Entre quem controla parcelas, 22% usam caderno, 15% planilha e 11% app (Monitor Mercantil): só planilha deixaria a maioria de fora | y |
| Onde a landing vive | `site/` neste repositório, HTML e CSS puros | Não entra no gate de cobertura de `src/`, não mexe no proxy de login, e a identidade vem de `docs/design.md` | y |
| Destino do formulário | Google Forms do dono, URL numa constante única no HTML | Zero back-end; a URL ainda não existe, então o botão fica desabilitado com "em breve" até ela ser colada | y |
| Como se prova "sem dado real" | Lista de valores em R$ permitidos no próprio teste estrutural, só com fixtures matemáticas da spec do MVP (1.000,00 em 3x) | A lista de termos reais não pode entrar no repositório (AD-009). O teste prova que nada fora da allowlist aparece; a conferência contra nomes reais é do dono, fora do git | n |
| Como se prova acessibilidade e layout | Playwright com Chrome instalado e `@axe-core/playwright`, em 360, 768 e 1440 px, claro e escuro | É o que o e2e do app já faz para geometria. jsdom não calcula layout | n |
| Fontes | Inter e JetBrains Mono do Google Fonts, com `font-display: swap` | O app usa `next/font` com as mesmas famílias; a landing não tem Next, e a única folha externa permitida é de fontes | n |
| JavaScript na página | Só o alternador de tema, inline no `<head>`, como `SCRIPT_TEMA` do app | Sem JavaScript a página funciona inteira e o tema cai para o do sistema. Nada de rastreador | n |
| Capturas de tela | Geradas por script Playwright contra o seed, com o provider de teste, e versionadas em `site/imagens/` | O seed usa "Pessoa A", "Cartão Roxo", "Compra parcelada A": nada real. Versionar evita depender do app para publicar a landing | n |
| Números de mercado | No máximo três na página, cada um com fonte e ano no próprio texto | São de matérias que repercutem pesquisas; sem fonte visível viram afirmação da marca | n |

**Open questions:** none. As linhas marcadas `n` são decisões de engenharia tomadas com a
justificativa registrada, sujeitas à revisão desta spec.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação e limites de entrada | N/A: a página não recebe entrada; o formulário é externo |
| Falha e falha parcial | CAMP-04 AC 2: sem URL do formulário o botão não leva a lugar nenhum e diz por quê |
| Idempotência, retentativa, duplicata | N/A: nenhuma escrita |
| Fronteiras de autorização | N/A: página pública por definição, sem dado de ninguém |
| Concorrência e ordenação | N/A |
| Ciclo de vida do dado | CAMP-01 AC 4 e CAMP-05 AC 1: nenhum dado real entra, então nada precisa sair |
| Observabilidade | N/A: sem rastreador, por decisão (CAMP-03 AC 5) |
| Falha de dependência externa | CAMP-03 AC 4: sem a folha do Google Fonts a página cai para a pilha de sistema e continua legível |
| Integridade de transição de estado | CAMP-03 AC 3: tema claro, escuro e do sistema, sem `data-tema="sistema"` |

---

## User Stories

### P1: O posicionamento que toda peça segue ⭐ MVP

**User Story**: Como dono do produto, quero um documento curto de posicionamento, para que qualquer
texto futuro (página, post, e-mail) fale do mesmo produto, para a mesma pessoa, no mesmo tom.

**Why P1**: Sem ele cada peça reinventa a promessa, e a primeira que prometer sincronização bancária
mente.

**Requirement ID**: CAMP-01

**Acceptance Criteria**

1. The document SHALL nomear a persona nos três estados (planilha, caderno, nada) e, para cada
   estado, a dor em uma frase e a ponte para o produto em uma frase
2. The document SHALL listar cada promessa ao lado da garantia do app que a sustenta, com a decisão
   (AD) ou a spec que a prova
3. The document SHALL conter uma seção "O que nunca prometer" com, no mínimo: sincronização
   bancária, app nativo, orçamento por categoria, área de cartões e fatura, edição de compra,
   proteção contra edição simultânea, preço
4. The document SHALL não conter nenhum valor em R$, nome ou descrição que não venha do seed ou de
   fixture da spec do MVP
5. WHEN um número de mercado é citado THEN the document SHALL trazer fonte e ano na mesma linha
6. The document SHALL definir o tom em regras verificáveis: sem exclamação, sem emoji, português de
   casa, frases curtas

**Independent Test**: ler o documento e escrever um post de rede social só com ele; se o post
precisar de informação que não está lá, o documento falhou.

---

### P1: A landing page explica onde as contas de casa quebram ⭐ MVP

**User Story**: Como pessoa que divide as contas da casa com alguém, quero entender em uma rolagem o
que o myBilling faz que a minha planilha, o meu caderno ou a minha cabeça não fazem, para decidir se
deixo meu e-mail.

**Why P1**: É a campanha. Sem a página, não há onde a lista de espera viver.

**Requirement ID**: CAMP-02

**Acceptance Criteria**

1. The page SHALL ter, nesta ordem: hero com a promessa e o botão da lista; "Onde as contas da casa
   quebram" com cinco blocos; comparativo em três colunas (caderno, planilha, myBilling); "Para
   dois"; "Traga a sua planilha ou comece do zero"; números de mercado; rodapé com o botão de novo
2. WHILE na seção "Onde as contas da casa quebram", each bloco SHALL ter a cena em uma frase e a
   garantia do app em uma frase, para as cinco dores: parcela esquecida, fatura somada com a compra,
   mês que vira errado, conta fixa que muda de valor, duas pessoas e um número só
3. The comparativo SHALL incluir ao menos duas linhas em que a planilha ou o caderno ganham
   (flexibilidade, custo, qualquer dispositivo), e SHALL não marcar o myBilling como melhor nelas
4. The page SHALL não conter nenhuma das promessas listadas em "O que nunca prometer" do
   posicionamento, nem a palavra "grátis", nem preço
5. WHEN um número de mercado aparece THEN the page SHALL exibir a fonte e o ano no mesmo elemento,
   e SHALL não exibir mais de três números de mercado
6. The page SHALL declarar que o produto é usado hoje por um casal e está abrindo para mais casas,
   sem afirmar que já está disponível
7. The page SHALL ter `lang="pt-BR"`, `<title>`, `<meta name="viewport">` e `<meta name="description">`

**Independent Test**: abrir a página sem contexto e responder em voz alta "o que é, para quem é, o
que ganho, o que faço agora"; as quatro respostas têm que estar na tela.

---

### P1: A landing page tem a identidade do app e é acessível ⭐ MVP

**User Story**: Como dono do produto, quero que a landing pareça o app, para que quem entrar depois
reconheça o lugar.

**Why P1**: A identidade é uma decisão medida (`docs/design.md`); uma landing fora dela desfaz o
que o app construiu.

**Requirement ID**: CAMP-03

**Acceptance Criteria**

1. The stylesheet SHALL declarar cada token de cor uma vez, com `light-dark()`, com os mesmos
   valores de `docs/design.md`, e SHALL não ter paleta duplicada em `@media (prefers-color-scheme)`
2. The page SHALL usar `--primary` apenas em botão de chamada e em link, e a superfície invertida
   SHALL aparecer exatamente uma vez
3. WHEN a pessoa escolhe claro ou escuro THEN the page SHALL gravar a escolha em `data-tema` no
   `<html>`, e WHEN escolhe "sistema" THEN the page SHALL remover o atributo, e SHALL nunca escrever
   `data-tema="sistema"`
4. IF a folha do Google Fonts não carregar THEN the page SHALL cair para a pilha de sistema e
   SHALL continuar legível, porque toda regra de fonte declara a pilha de reserva
5. The page SHALL carregar no máximo um `<script>`, o do tema, inline, e SHALL não carregar nenhum
   recurso de terceiros além da folha de fontes
6. WHILE em 360, 768 e 1440 pixels, claro e escuro, the page SHALL não ter rolagem horizontal
   (`scrollWidth` igual a `clientWidth`) e SHALL não ter violação de axe-core nas regras WCAG 2.1 AA
7. The page SHALL usar monoespaçada em toda grandeza numérica isolada (valor, percentual, parcela) e
   SHALL não usá-la em frase corrida
8. The page SHALL ter display em peso 400 e SHALL não usar sombra além de `--sombra-1`

**Independent Test**: colocar a landing e a tela de login do app lado a lado; quem nunca viu os dois
tem que dizer que são do mesmo produto.

---

### P1: O botão da lista de espera ⭐ MVP

**User Story**: Como pessoa convencida, quero deixar meu e-mail em um toque.

**Why P1**: É a única conversão da página.

**Requirement ID**: CAMP-04

**Acceptance Criteria**

1. The page SHALL declarar a URL do formulário em uma constante única, no topo do `<head>`, e todo
   botão da lista SHALL ler dela
2. WHILE a constante contém o placeholder, each botão da lista SHALL estar desabilitado
   (`aria-disabled="true"`, sem `href`) e SHALL exibir "em breve"
3. WHEN a constante contém uma URL `https://` THEN each botão SHALL abrir essa URL em nova aba com
   `rel="noopener"`
4. IF JavaScript está desligado THEN the botão SHALL funcionar do mesmo jeito, porque o `href` é
   escrito no HTML e não montado em tempo de execução

**Independent Test**: trocar o placeholder por uma URL de teste, recarregar, clicar; o formulário
abre.

---

### P2: Capturas do app com dados sintéticos

**User Story**: Como pessoa lendo a página, quero ver o app de verdade, não um desenho.

**Why P2**: A página funciona sem imagem; com imagem, convence mais. Vem depois do texto.

**Requirement ID**: CAMP-05

**Acceptance Criteria**

1. Each imagem em `site/imagens/` SHALL ser gerada por script a partir do banco semeado por
   `pnpm db:seed`, com o provider de teste, e SHALL não conter nenhum valor, nome ou descrição fora
   do seed
2. Each `<img>` SHALL ter `alt` que descreve a tela em uma frase e SHALL declarar `width` e `height`
3. The script SHALL gerar cada tela nos dois temas, e the page SHALL exibir a do tema ativo com
   `<picture>` e `prefers-color-scheme`, respeitando `data-tema` quando houver
4. The page SHALL dizer, perto das imagens, que são dados de demonstração

**Independent Test**: rodar o script duas vezes; as imagens saem iguais em conteúdo (o seed tem
semente fixa).

---

### P2: Kit de copy

**User Story**: Como dono do produto, quero textos prontos para divulgar a página em redes e num post
longo, sem reescrever a promessa a cada vez.

**Why P2**: Depende do posicionamento e da página existirem.

**Requirement ID**: CAMP-06

**Acceptance Criteria**

1. The kit SHALL ter de seis a oito headlines alternativas, cada uma com o estado da persona a que
   se dirige
2. The kit SHALL ter três textos curtos, um por estado (planilha, caderno, nada), cada um com no
   máximo 280 caracteres e terminando com a chamada para a lista
3. The kit SHALL ter um texto longo em primeira pessoa contando a história da planilha que quebrou,
   sem nenhum valor real, sem nome real, com no mínimo 500 palavras
4. The kit SHALL respeitar o tom e a lista "O que nunca prometer" do posicionamento

**Independent Test**: colar um texto curto numa rede social; cabe, não promete nada falso, e termina
pedindo o e-mail.

---

### P3: O repositório continua verde

**User Story**: Como mantenedor, quero que a pasta `site/` não derrube nada do app.

**Why P3**: É condição, não feature.

**Requirement ID**: CAMP-07

**Acceptance Criteria**

1. WHEN `pnpm verify` roda com `site/` presente THEN it SHALL sair com código 0
2. The site SHALL ter um comando próprio, `pnpm site:verificar`, que roda o teste estrutural e o
   teste de navegador, e SHALL sair com código 0
3. The `HANDOFF.md` SHALL apontar para esta fatia e para `site/README.md`

**Independent Test**: `pnpm verify && pnpm site:verificar`.

---

## Edge Cases

- A constante do formulário com URL `http://` (sem s): o botão fica desabilitado como se fosse
  placeholder, e o teste estrutural falha. Formulário sem TLS não entra.
- Página aberta com JavaScript desligado: tema do sistema, botão funcionando, nada quebra.
- Página aberta em 320 px: pode haver quebra de palavra em headline, não pode haver rolagem
  horizontal. 360 é o piso testado; 320 é conferência manual.
- Fonte externa bloqueada: pilha de sistema. A mono cai para `ui-monospace`.
- O seed muda no futuro e as capturas ficam velhas: o script regenera; o teste estrutural só exige
  que o arquivo exista e tenha `alt`, `width` e `height`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CAMP-01 | P1: O posicionamento que toda peça segue — ACs 1 a 6 | Execute | ACs 1 a 6 (T1) ✅ `docs/marketing/posicionamento.md` |
| CAMP-02 | P1: A landing page explica onde as contas de casa quebram — ACs 1 a 7 | Execute | ACs 1, 6 e 7 (T2) ✅ e ACs 2 a 5 (T3) ✅ `site/estrutura.test.mjs` |
| CAMP-03 | P1: A landing page tem a identidade do app e é acessível — ACs 1 a 8 | Execute | ACs 1 a 5 e 8 (T2) ✅ `site/estrutura.test.mjs`; AC 7 (T3) ✅ conferido a olho nas capturas de 1280 e 360; AC 6 (T5) |
| CAMP-04 | P1: O botão da lista de espera — ACs 1 a 4 | Execute | ACs 1 a 4 (T2) ✅ `site/estrutura.test.mjs`, `site/formulario.mjs` |
| CAMP-05 | P2: Capturas do app com dados sintéticos — ACs 1 a 4 | Execute | ACs 1 e 3 (T4) ✅ `site/capturar.mjs`, troca por `data-tema` conferida no navegador; ACs 2, 3 e 4 (T4) ✅ `site/estrutura.test.mjs` |
| CAMP-06 | P2: Kit de copy — ACs 1 a 4 | Tasks | T6 |
| CAMP-07 | P3: O repositório continua verde — ACs 1 a 3 | Tasks | ACs 1 e 2 (T5); AC 3 (T6) |

**Coverage:** 7 total, 7 mapeados para tasks.

---

## Success Criteria

- [ ] Uma pessoa de fora lê a página e responde o que é, para quem é, o que ganha e o que faz agora
- [ ] `pnpm verify && pnpm site:verificar` sai 0
- [ ] Nenhum `R$` na página, nas imagens ou nos textos fora da allowlist de fixtures
- [ ] O dono cola a URL do Google Forms e o botão abre o formulário sem outra mudança
