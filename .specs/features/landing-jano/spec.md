# Landing do Jano: Specification

> Pedidos do dono em 2026-11-02, nesta ordem: "quando eu chego nessas plataformas eu já sei do que se
> trata o software, não sinto essa clareza no myBilling logo de cara"; "gostei do modelo C e a
> headline"; "estou disposto a mudar de nome"; "vamos de Jano"; "vamos na opção 1 dos 3 quadros".
> Protótipo no canvas privado https://claude.ai/artifact/WDUfpjEipw9geX6fuyG23j (quadro "Jano 1,
> Antes de parcelar, pergunte ao Jano"). É a fatia `landing-simulador` do plano
> `estou-sentindo-que-ainda-ancient-cosmos.md`, somada à troca de nome da landing. Revisa
> `campanha-lista-de-espera`, `campanha-o-que-vem` e `landing-dor` nos pontos marcados.

## Problem Statement

A landing abre por uma frase de contraste ("A planilha sabe o que você digitou. O myBilling sabe o
que vem.") que não diz que é um app nem para quê, e o nome "myBilling" lê como cobrança. O simulador
"Dá pra comprar?" já existe no app (AD-024), mas a landing ainda diz que ele "ainda não existe". Esta
fatia troca o nome público da landing para Jano, abre a página por uma manchete que diz o que é em
cinco segundos e põe o simulador funcionando ao lado dela, com a mesma conta do app, sobre uma casa
inventada.

## Goals

- [ ] A landing se chama Jano e nenhuma frase visível, título, descrição ou texto alternativo diz
      "myBilling"
- [ ] O herói diz o que é em cinco segundos: selo de categoria, "Antes de parcelar, pergunte ao
      Jano.", subtítulo que diz que é um app para as contas da casa
- [ ] O simulador funciona no herói, com a conta e as frases do app, sem servidor e sem login
- [ ] A página não promete nada que não existe: "O que vem a seguir" sai
- [ ] As capturas do app não mostram o nome antigo
- [ ] `pnpm verify` e `pnpm site:verificar` saem 0

## Out of Scope

| Feature | Reason |
| --- | --- |
| Renomear o app, o repositório, pastas, chave de tema e o projeto na Vercel | Decisão do dono em 2026-11-02: só a landing agora; o resto depois do domínio e da busca no INPI |
| Registrar domínio, buscar no INPI, publicar na Vercel, `git push` | Operação externa, com o dono |
| "Lançar esta compra" na landing | A landing não tem conta nem login; a chamada é a lista de espera |
| Fatura no simulador ou na página | Depende da fatia de Faturas; o FAQ continua dizendo "Não" |
| Modo "valor da parcela" e escolha do mês da primeira parcela na landing | O herói tem dois campos; a primeira parcela é o mês corrente (decisão do autor, abaixo) |
| Anúncios e vídeo | Peças separadas, depois desta fatia |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Nome público | Jano, só na landing e nos documentos de marketing | Dono em 2026-11-02: "vamos de Jano"; "só a landing agora" | y |
| Manchete | "Antes de parcelar, pergunte ao Jano." com o selo "Contas da casa, mês a mês" | Dono escolheu o quadro Jano 1 | y |
| Card ao lado da manchete | O simulador funcionando, não um resultado fixo | Dono em 2026-11-02 | y |
| Capturas | Recortadas sem o menu lateral, onde está o nome | Dono em 2026-11-02 | y |
| "O que vem a seguir" | Sai da página | Dono em 2026-11-02; com o simulador na página, a seção ficaria falsa | y |
| Campos do simulador | Valor da compra e em quantas vezes; primeira parcela no mês corrente | O herói tem de caber na primeira tela; o app tem os outros modos | n (decisão do autor) |
| Horizonte da casa inventada | Doze meses, do mês corrente a onze meses depois, no fuso `America/Sao_Paulo` | Igual ao horizonte de doze meses do app (AD-023), sem página que envelhece | n (decisão do autor) |
| Estado inicial | R$ 2.400,00 em 10x, que deixa dois meses no vermelho e cabe em 12x | A página abre mostrando o que o produto faz | n (decisão do autor) |
| Mesma conta e mesma frase | A landing carrega um pacote gerado de `src/domain` e do módulo puro do veredito; nenhuma conta reescrita à mão | "A conta é a mesma do app" precisa ser verdade verificável | n (decisão do autor) |
| Pacote versionado | `site/simulador.js` entra no git, gerado por `pnpm site:construir`, com teste de frescor | O projeto da Vercel publica `site/` sem build | n (decisão do autor) |
| Segundo script | A página passa a carregar dois `<script>`: o do tema, inline, e `simulador.js`, local, como módulo | Revisa CAMP-03 AC 5; nenhum terceiro | n (decisão do autor) |
| Sem JavaScript | O card mostra o exemplo pronto de R$ 1.000,00 em 3x (333,34, 333,33 e 333,33) e diz que o simulador precisa de JavaScript | Valores da fixture do MVP, já na allowlist | n (decisão do autor) |
| Captura da Visão geral | Sai do herói e vai para "Traga a sua planilha ou comece do zero" | O herói passa a ter o simulador; CAMP-05 continua com duas capturas | n (decisão do autor) |
| Coluna do comparativo | "myBilling" vira "Jano", inclusive em `data-vence` | Coerência da página; atributo invisível, mas lido pelo teste | n (decisão do autor) |
| Pergunta nova no FAQ | "Como funciona o Dá pra comprar?", da copy (Seção 10) | O simulador agora existe | n (decisão do autor) |
| O 14% da CNDL | Sai da legenda do 58% | A base é ambígua na fonte (pode ser parte dos 58%); achado de 2026-11-02 | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação e limites de entrada | JANO-03 ACs 4 e 5: valor inválido e parcelas fora de 1 a 120 mostram a mensagem do app, sem quebrar a página |
| Falha e falha parcial | JANO-03 AC 6: sem JavaScript, o exemplo pronto; JANO-03 AC 7: compra além do horizonte diz até onde enxerga |
| Idempotência, retentativa, duplicata | N/A: nada é gravado |
| Fronteiras de autorização | N/A: página pública, sem dado de ninguém; a casa é inventada (JANO-04) |
| Concorrência e ordenação | N/A: cálculo síncrono no cliente |
| Ciclo de vida do dado | JANO-04 AC 3: nenhum valor real; a casa vive num arquivo com cabeçalho que diz que é inventada |
| Observabilidade | N/A: sem rastreador (CAMP-03 AC 5) |
| Falha de dependência externa | JANO-05 AC 2: pacote desatualizado reprova o gate; sem fontes, a página cai para a pilha de sistema (CAMP-03 AC 4) |
| Integridade de transição de estado | JANO-03 AC 2: cada tecla recalcula a resposta inteira a partir dos dois campos |

---

## User Stories

### P1: O herói diz o que é ⭐ MVP — JANO-01

**User Story**: Como pessoa que chega à página, quero entender em cinco segundos o que é e para quê,
para decidir se continuo lendo.

**Why P1**: É o problema que o dono apontou.

**Acceptance Criteria**

1. The page SHALL ter `<title>` "Jano · As contas da casa, mês a mês" e `<meta name="description">`
   que começa com "Antes de parcelar, pergunte ao Jano."
2. The cabeçalho SHALL ter a marca "Jano" com o símbolo de dois arcos, e links "Como funciona" para
   `#onde-quebra` e "Perguntas" para `#perguntas`
3. The hero SHALL ter o selo "Contas da casa, mês a mês", o `<h1>` exato "Antes de parcelar,
   pergunte ao Jano." e um subtítulo que começa com "O Jano é um app para as contas da casa, sozinho
   ou a dois."
4. The hero SHALL ter o botão da lista de espera e um link "Testar o simulador" para `#simulador`
5. The hero SHALL ter a lista de confiança com "Pede só o e-mail", "Não pede acesso ao seu banco" e
   "Página sem rastreador"
6. The hero SHALL ter a linha da história: "Jano era o deus romano de duas faces: uma olhava para o
   que passou, a outra para o que vem. Era o deus das portas da casa, e janeiro leva o nome dele."
7. The texto visível, o `<title>`, a descrição e todo `alt` SHALL não conter "myBilling"
8. The comparativo SHALL ter as colunas "Caderno", "Planilha" e "Jano", e a linha "Quanto vai sobrar
   nos próximos meses" SHALL ter `data-vence="jano"`

**Independent Test**: abrir a página e responder "o que é e para quê" lendo só o herói.

---

### P1: O simulador funciona no herói ⭐ MVP — JANO-02

**User Story**: Como pessoa que vai parcelar algo, quero digitar o valor e as vezes e ver na hora os
meses que ficam no vermelho, sem cadastro.

**Why P1**: É a prova do produto na primeira tela.

**Acceptance Criteria**

1. The hero SHALL ter o card `#simulador` com o título "Dá pra comprar?", a marca "casa inventada",
   e os campos rotulados "Valor da compra" e "Em quantas vezes"
2. WHEN a página carrega com JavaScript THEN the card SHALL mostrar R$ 2.400,00 em 10x e o veredito
   do app para essa compra na casa inventada
3. WHEN a pessoa muda qualquer campo THEN the card SHALL recalcular o veredito e o gráfico sem
   recarregar a página e sem chamada de rede
4. The card SHALL ter uma coluna por mês do horizonte, com o nome curto do mês, o que sobrava antes e
   o que sobra ou falta depois, e os meses que ficam no vermelho SHALL ter a cor `--negativo` e o
   nome em negrito
5. The veredito SHALL estar numa região `aria-live="polite"`, e o gráfico SHALL ter um nome acessível
   que repete o veredito
6. The card SHALL terminar com "Quer essa resposta com as suas contas?" e um link para a lista de
   espera

**Independent Test**: mudar de 10x para 12x e ver o veredito trocar para "Cabe."

---

### P1: A mesma conta e as mesmas frases do app ⭐ MVP — JANO-03

**User Story**: Como dono, quero que a landing responda exatamente o que o app responderia, para que
"a conta é a mesma do app" seja verdade.

**Why P1**: Sem isso a frase do card mente.

**Acceptance Criteria**

1. The resposta da landing SHALL vir de `simularCompra` e `menorParcelamentoQueCabe` de `src/domain`,
   com o plano de `planoDaCompra` (ou `gerarParcelas`) e `politicaResiduo: "PRIMEIRAS"`, como no app
2. The veredito SHALL ser o texto de `textoDoVeredito`, vindo de um módulo puro que o componente do
   app também usa
3. WHEN R$ 1.000,00 em 3x THEN the parcelas SHALL ser 333,34, 333,33 e 333,33, nesta ordem
4. IF o valor não é um valor em reais válido THEN the card SHALL mostrar "Informe o valor para ver a
   resposta." e nenhum veredito
5. IF as vezes estão fora de 1 a 120 THEN the card SHALL mostrar a mensagem de `QTD_PARCELAS_INVALIDA`
   de `src/lib/erros.ts` e nenhum veredito
6. IF o JavaScript está desligado THEN the card SHALL mostrar o exemplo pronto de R$ 1.000,00 em 3x
   e a frase "Ligue o JavaScript para testar outra compra.", e os campos SHALL ficar ocultos
7. WHEN a compra tem parcelas além do horizonte THEN the card SHALL mostrar a frase "Enxergo até
   <Mês de ano>." do app
8. The app SHALL continuar mostrando o mesmo veredito de antes: os testes de `resposta-da-simulacao`
   e `simulador` passam sem mudança de asserção

**Independent Test**: comparar a resposta da landing e a do app para a mesma compra e o mesmo
horizonte.

---

### P1: A casa inventada ⭐ MVP — JANO-04

**User Story**: Como dono, quero que o simulador da landing rode sobre uma casa que não é de ninguém.

**Why P1**: AD-009.

**Acceptance Criteria**

1. The casa SHALL ter doze saldos previstos, em centavos inteiros, num arquivo com cabeçalho que diz
   que os valores são inventados
2. The horizonte SHALL começar no mês corrente do fuso `America/Sao_Paulo`, calculado por
   `dataParaCompetencia`, e seguir por onze meses consecutivos
3. Each saldo SHALL ser múltiplo de R$ 5,00 e estar entre R$ 0,00 e R$ 2.000,00
4. WHEN R$ 2.400,00 em 10x sobre a casa THEN the veredito SHALL ser "não cabe" com exatamente dois
   meses derrubados, e o menor parcelamento que cabe SHALL ser 12

**Independent Test**: ler o arquivo da casa e conferir que nenhum valor parece de verdade.

---

### P1: O pacote versionado e fresco ⭐ MVP — JANO-05

**User Story**: Como mantenedor, quero que a landing publique sem build e que o pacote nunca fique
atrás do código do app.

**Why P1**: A Vercel publica `site/` como está.

**Acceptance Criteria**

1. `pnpm site:construir` SHALL gerar `site/simulador.js` a partir de `site/fonte/simulador.ts`, com um
   comentário no topo dizendo que o arquivo é gerado
2. IF `site/simulador.js` difere do que `pnpm site:construir` geraria agora THEN the teste SHALL
   falhar dizendo para rodar o comando
3. The page SHALL carregar exatamente dois `<script>`: o do tema, inline, sem `src`, e
   `<script type="module" src="simulador.js">`, e SHALL não carregar nenhum recurso de terceiros além
   das fontes
4. The Biome SHALL ignorar `site/simulador.js`

**Independent Test**: mudar uma frase do veredito em `src/` sem rodar o comando; o teste reprova.

---

### P2: A página não promete o que não existe — JANO-06

**User Story**: Como pessoa lendo, quero que a página diga só o que o produto faz hoje.

**Why P2**: Com o simulador na página, "ainda não existe" vira mentira.

**Acceptance Criteria**

1. The page SHALL não ter a seção `a-seguir`, e a ordem SHALL ser inicio, onde-quebra, numeros,
   comparativo, para-dois, sua-planilha, perguntas, rodape
2. The texto visível SHALL não conter "ainda não existe" nem "O que vem a seguir"
3. The seção `perguntas` SHALL ter a pergunta "Como funciona o Dá pra comprar?", com resposta que
   diz que você informa o valor e as vezes, que o app mostra quanto sobra em cada mês, e que diz em
   quantas vezes caberia
4. The legenda do 58% SHALL não citar o 14%

**Independent Test**: procurar "ainda não existe" na página.

---

### P2: As capturas sem o nome antigo — JANO-07

**User Story**: Como pessoa lendo, quero ver o app sem um nome diferente do que a página diz.

**Why P2**: Coerência; a imagem é prova.

**Acceptance Criteria**

1. `site/capturar.mjs` SHALL gravar cada tela só com a área de conteúdo, sem o menu lateral
2. Each `<img>` de captura SHALL declarar `width` e `height` iguais às dimensões do arquivo, em pixels
   CSS
3. The captura da Visão geral SHALL estar na seção `sua-planilha`, e a de Lançamentos continua em
   `onde-quebra`
4. The legendas SHALL continuar dizendo "dados de demonstração"

**Independent Test**: abrir as quatro imagens; nenhuma mostra "myBilling".

---

### P2: Documentos, decisão e gates — JANO-08

**User Story**: Como mantenedor, quero o posicionamento, o kit e as specs alinhados com a página.

**Why P2**: Condição de fechamento.

**Acceptance Criteria**

1. `docs/marketing/posicionamento.md` SHALL dizer que o nome público é Jano desde 2026-11-02, que o
   app continua myBilling por dentro até o domínio e a busca no INPI, e SHALL tirar o simulador da
   lista "O que nunca prometer"
2. `docs/marketing/posicionamento.md` SHALL não ter a seção "O que vem a seguir" e SHALL registrar que
   o 14% da CNDL não entra em peça sozinho
3. `docs/marketing/kit-de-copy.md` SHALL ter de seis a oito headlines, a primeira igual ao `<h1>`, e
   nenhum texto SHALL dizer "myBilling" nem que o simulador "ainda não existe"
4. The specs `campanha-lista-de-espera` (CAMP-03 AC 5), `campanha-o-que-vem` (VEM-02 ACs 1, 4, 5 e 7)
   e `landing-dor` (DOR-02 AC 1) SHALL registrar que esta fatia as revisou; `.specs/STATE.md` SHALL ter
   AD-026 e o Handoff; `.specs/HANDOFF.md` SHALL apontar para cá; `site/README.md` SHALL explicar
   `pnpm site:construir`
5. WHEN `pnpm verify` e `pnpm site:verificar` rodam THEN they SHALL sair com código 0

**Independent Test**: `pnpm verify && pnpm site:verificar`.

---

## Edge Cases

- WHEN a pessoa apaga o valor THEN the card SHALL mostrar "Informe o valor para ver a resposta."
  (JANO-03 AC 4)
- WHEN as vezes passam de 12 THEN the card SHALL mostrar as colunas do horizonte e "Enxergo até"
  (JANO-03 AC 7)
- WHILE em 360 px, the card SHALL caber sem rolagem horizontal, com as doze colunas (CAMP-03 AC 6)
- WHEN o mês corrente é dezembro THEN the horizonte SHALL atravessar o ano sem buraco (JANO-04 AC 2)
- Os testes de VEM-02 ACs 4 e 5 (seção `a-seguir`) saem junto com a seção, por decisão do dono
  registrada nesta spec; nenhum outro teste é apagado

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| JANO-01 | P1: O herói diz o que é | Tasks | Pending |
| JANO-02 | P1: O simulador funciona no herói | Tasks | Pending |
| JANO-03 | P1: A mesma conta e as mesmas frases do app | Execute | Implementing: ACs 2 e 8 em T2 (`src/components/texto-do-veredito.ts`, sem React; `resposta-da-simulacao.test.tsx` e `simulador.test.tsx` sem mudança, 2.164 unitários verdes); ACs 1, 3 a 5 e 7 em T3; AC 6 em T4 |
| JANO-04 | P1: A casa inventada | Tasks | Pending |
| JANO-05 | P1: O pacote versionado e fresco | Tasks | Pending |
| JANO-06 | P2: A página não promete o que não existe | Tasks | Pending |
| JANO-07 | P2: As capturas sem o nome antigo | Tasks | Pending |
| JANO-08 | P2: Documentos, decisão e gates | Execute | Implementing: ACs 1 a 3 em T1 (`posicionamento.md` seções "Nome" e "O produto em uma frase", sem "O que vem a seguir", nota do 14%; `kit-de-copy.md` com 8 headlines, a primeira "Antes de parcelar, pergunte ao Jano.", 0 "myBilling", 0 "ainda não existe"); ACs 4 e 5 em T8 |

**Coverage:** 8 total, 8 mapeados para tasks (T1 a T8 em `tasks.md`), 0 unmapped

---

## Success Criteria

- [ ] Quem chega diz o que é o Jano lendo só o herói
- [ ] O simulador da landing e o do app dão a mesma resposta para a mesma compra
- [ ] Nenhuma ocorrência de "myBilling" na landing e nas capturas
- [ ] `pnpm verify && pnpm site:verificar` saem 0; Verifier PASS
