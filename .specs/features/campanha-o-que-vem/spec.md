# Campanha: "o app sabe o que vem": Specification

> Pedido do dono em 2026-11-01: "atualiza a campanha". Respostas do dono no mesmo dia: reposicionar
> o texto agora, prometendo só o que existe; e a landing pode dizer que o simulador "Dá pra comprar?"
> está sendo construído, como "o que vem a seguir". Fonte do diferencial: o plano aprovado em
> `~/.claude/plans/estou-sentindo-que-ainda-ancient-cosmos.md` e o AD-023. Revisa a spec de
> `campanha-lista-de-espera` nos pontos marcados abaixo.

## Problem Statement

O posicionamento e a landing vendem "a planilha deixa você errar; o myBilling não deixa". O dono
confirmou que essa garantia é real mas invisível: ninguém vê um erro que não aconteceu. O diferencial
decidido é "o app sabe o que vem": a planilha sabe o que você digitou, o app sabe as parcelas, as
contas fixas e o saldo dos próximos meses. As peças precisam contar essa cena primeiro, sem prometer
o simulador, que ainda não existe, e dizendo com honestidade que ele é a próxima coisa.

## Goals

- [ ] Posicionamento, landing e kit de copy abrem pela cena "dá pra comprar?" respondida com o que o
      app já faz: cada mês seguinte nasce com o que foi decidido antes, e a Visão geral diz quanto vai
      sobrar ou faltar
- [ ] A garantia "não deixa errar" continua nas peças, como apoio e não como manchete
- [ ] A landing diz que o simulador está sendo construído, numa seção própria, sem apresentá-lo como
      existente
- [ ] Nenhuma promessa nova fora do que existe; `pnpm site:verificar` e `pnpm verify` saem 0

## Out of Scope

| Feature | Reason |
| --- | --- |
| O simulador na landing ou no app | Fatias `simular` e `landing-simulador` do plano |
| Capturas novas do app | As telas não mudaram nesta fatia; "Próximos meses" já aparece na captura da Visão geral |
| Números de mercado novos | Os três atuais continuam válidos |
| Mudar a identidade visual, tokens ou layout da landing | A seção nova usa os componentes que já existem (`cartao`, `secao-cabeca`) |
| Deploy, Vercel, push | Operação remota, autorização separada |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo | Reposicionar o texto agora, sem o simulador | Decisão do dono em 2026-11-01 | y |
| Falar do simulador | Sim, numa seção "O que vem a seguir", como coisa em construção | Decisão do dono em 2026-11-01; abre exceção explícita na regra "nunca prometer", registrada no posicionamento | y |
| Frase do herói | "A planilha sabe o que você digitou. O myBilling sabe o que vem." | Escolhida pelo dono em 2026-11-01 entre as três candidatas do plano | y |
| Onde a cena nova entra na landing | Primeiro bloco de "Onde as contas da casa quebram", que passa de cinco para seis blocos; linha nova no comparativo | O plano manda a cena "dá pra comprar?" ser a primeira; os outros cinco blocos continuam verdadeiros e viram apoio | n (decisão do autor) |
| Onde "O que vem a seguir" entra | Depois dos números de mercado e antes do rodapé | Promessa de futuro fica perto da chamada da lista, que é a quem ela se destina, e longe da prova do que existe | n (decisão do autor) |
| O que a cena nova pode afirmar | "Cada mês seguinte já nasce com as parcelas, as contas fixas e o salário"; "a Visão geral diz quanto vai sobrar ou faltar nos próximos meses" | É o que existe: `saldo-futuro` (SALDO-03), recorrências (FIXO-01), parcelas (AD-002). Não cita "doze meses" nem "três meses": o número muda com o merge de `horizonte-doze-meses` | n (decisão do autor) |
| O que a seção "a seguir" pode afirmar | Que o simulador não existe ainda, o que ele vai fazer em duas frases, e que a lista de espera recebe primeiro | Honestidade do tom (regra 8); sem data, sem "em breve" como promessa de prazo | n (decisão do autor) |
| Kit de copy | Headlines trocadas para a nova tese dentro do limite de 6 a 8; os três curtos reescritos; o longo ganha um parágrafo sobre o que vem | CAMP-06 continua valendo nos limites | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

### Cobertura das dimensões de requisito implícito

| Dimensão | Onde resolve |
| --- | --- |
| Validação de conteúdo | VEM-02 ACs 5 e 6: nenhuma promessa proibida, nenhum valor fora da allowlist; provado pelo teste estrutural |
| Demais dimensões | N/A: página estática sem entrada, sem escrita, sem dependência nova |

---

## User Stories

### P1: O posicionamento conta a cena primeiro ⭐ MVP — VEM-01

**User Story**: Como dono, quero que o posicionamento abra pela pergunta "dá pra comprar?" e pelo
que o app já responde, para toda peça partir da mesma cena.

**Why P1**: É a fonte das outras peças.

**Acceptance Criteria**

1. The document SHALL ter a tese "o app sabe o que vem" na seção "A tese", com a frase sobre a
   planilha saber o que foi digitado e o app saber o que vem
2. The document SHALL ter, como primeira linha da tabela de cenas, a cena "dá pra comprar?" com a
   garantia restrita ao que existe e a fonte `saldo-futuro/spec.md` (SALDO-03), `recorrencias/spec.md`
   (FIXO-01) e AD-002
3. The document SHALL manter as cinco cenas anteriores na tabela, depois da nova
4. The document SHALL acrescentar à tabela "O que nunca prometer": "o simulador como coisa que
   existe", "em qual fatura cai cada parcela" e "quantos meses à frente o app enxerga, em número"
5. The document SHALL ter uma seção "O que vem a seguir" que autoriza citar o simulador só como
   coisa em construção, com as palavras permitidas ("ainda não existe", "é o que estamos fazendo") e
   as proibidas ("em breve" como prazo, "já", "disponível")
6. The document SHALL manter as regras de tom e os números de mercado sem mudança

**Independent Test**: escrever um post só com o documento; o post abre pela cena da loja e não
promete o simulador como existente.

---

### P1: A landing abre pela cena e diz o que vem a seguir ⭐ MVP — VEM-02

**User Story**: Como pessoa que divide as contas, quero entender em uma rolagem que o app sabe o
que vem nos próximos meses, e saber o que ele ainda vai ganhar.

**Why P1**: É a campanha.

**Acceptance Criteria**

1. The page SHALL ter no `<h1>` a frase escolhida pelo dono e, no parágrafo do herói, a cena
   respondida com o que existe (parcelas e contas fixas nos meses seguintes, e quanto vai sobrar)
2. WHILE na seção "Onde as contas da casa quebram", the page SHALL ter seis blocos, o primeiro com o
   tema "dá pra comprar" (cena: decidir pelo saldo de hoje; garantia: o mês seguinte já nasce com o
   que foi decidido e a Visão geral diz quanto vai sobrar ou faltar), seguido dos cinco blocos
   anteriores
3. The comparativo SHALL ter uma linha "Quanto vai sobrar nos próximos meses", em que o myBilling
   vence, antes das linhas em que a planilha ou o caderno ganham
4. The page SHALL ter uma seção `id="a-seguir"`, entre os números de mercado e o rodapé, com o
   título "O que vem a seguir", que diz que o simulador "Dá pra comprar?" ainda não existe, o que ele
   vai fazer, e que a lista de espera recebe primeiro
5. The page SHALL não conter "em breve" fora dos botões da lista, nem "já" ou "disponível" na seção
   `a-seguir`, nem nenhuma promessa da lista "O que nunca prometer"
6. The page SHALL manter os valores em reais dentro da allowlist e o tom sem exclamação, travessão
   e emoji
7. The page SHALL continuar com uma ordem de seções provada pelo teste estrutural: inicio,
   onde-quebra, comparativo, para-dois, sua-planilha, numeros, a-seguir, rodape

**Independent Test**: abrir a página e responder "o que o app sabe que a planilha não sabe" e "o
que ainda não existe"; as duas respostas estão na tela.

---

### P2: O kit de copy fala da mesma cena — VEM-03

**User Story**: Como dono, quero posts prontos com a nova tese.

**Why P2**: Depende de VEM-01.

**Acceptance Criteria**

1. The kit SHALL ter de seis a oito headlines, a primeira igual ao `<h1>` da página, e ao menos
   três sobre "o que vem" (próximos meses, parcela que já está lá, saldo que sabe do futuro)
2. The kit SHALL ter os três textos curtos reescritos pela cena "dá pra comprar?", cada um com até
   280 caracteres e terminando com a chamada
3. The kit SHALL acrescentar ao texto longo um parágrafo sobre o que vem a seguir, nas palavras
   permitidas por VEM-01 AC 5, mantendo o mínimo de 500 palavras
4. The kit SHALL respeitar o tom e a lista "O que nunca prometer"

**Independent Test**: colar o curto "Planilha" numa rede; cabe e não promete o simulador.

---

### P2: Os gates continuam verdes e a spec antiga aponta para cá — VEM-04

**User Story**: Como mantenedor, quero que a mudança passe pelos mesmos testes da campanha.

**Why P2**: Condição.

**Acceptance Criteria**

1. The teste estrutural SHALL provar a ordem com oito seções, seis blocos de dor com o tema "comprar"
   entre os temas, a linha do comparativo de VEM-02 AC 3, a seção `a-seguir` com as palavras
   proibidas ausentes, e "em breve" só nos botões
2. WHEN `pnpm site:verificar` e `pnpm verify` rodam THEN they SHALL sair com código 0
3. The spec `campanha-lista-de-espera` SHALL registrar, em CAMP-01 AC 3, CAMP-02 ACs 1 e 2 e
   CAMP-06 AC 1, que esta fatia os revisou, e `.specs/HANDOFF.md` SHALL apontar para esta fatia

**Independent Test**: `pnpm site:verificar && pnpm verify`.

---

## Edge Cases

- "em breve" aparece nos botões desabilitados por CAMP-04 AC 2; o teste de VEM-04 AC 1 o permite só
  dentro de `.botao-lista`
- A seção `a-seguir` usa `cartao`, não `inverso`: a inversão continua aparecendo uma vez (CAMP-03 AC 2)
- Seis blocos em grade de três colunas: duas linhas cheias; em 360 px, uma coluna

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VEM-01 | P1: O posicionamento conta a cena primeiro | Execute | Verified: ACs 1 a 6 em `docs/marketing/posicionamento.md` ("A tese", primeira linha das seis cenas, três linhas novas em "nunca prometer", seção "O que vem a seguir"); conferido sem `!` nem travessão |
| VEM-02 | P1: A landing abre pela cena e diz o que vem a seguir | Execute | Verified: ACs 1 a 7 em `site/estrutura.test.mjs` ("VEM-02 AC 1", "CAMP-02 AC 2 e VEM-02 AC 2", "VEM-02 AC 3", "VEM-02 ACs 4 e 5", ordem com oito seções; allowlist e tom pelos testes existentes); `pnpm site:verificar` sem violação |
| VEM-03 | P2: O kit de copy fala da mesma cena | Execute | Verified: ACs 1 a 4 em `docs/marketing/kit-de-copy.md`: 8 headlines, a primeira igual ao h1, três sobre o que vem; curtos com 279, 249 e 231 caracteres; longo com 792 palavras e o parágrafo do que vem a seguir; sem `!` nem travessão |
| VEM-04 | P2: Os gates continuam verdes e a spec antiga aponta para cá | Execute | Verified: AC 1 em `site/estrutura.test.mjs` (os quatro testes novos e os dois revistos); AC 2 `pnpm site:verificar` e `pnpm verify` saem 0; AC 3 em `campanha-lista-de-espera/spec.md` (CAMP-01, CAMP-02, CAMP-06) e `.specs/HANDOFF.md`. Verifier PASS em 2026-11-01 (`validation.md`): 20/20 ACs, 7 mutantes mortos |

**Coverage:** 4 total, 4 mapeados para os passos inline (T1 posicionamento, T2 landing e teste, T3 kit, T4 specs e handoff), 0 unmapped

---

## Success Criteria

- [ ] A landing abre pela cena "dá pra comprar?" e diz, sem prometer, o que vem a seguir
- [x] `pnpm site:verificar && pnpm verify` saem 0 (Verifier, 2026-11-01)
- [x] Nenhum valor real, nenhuma promessa fora do que existe (Verifier, 2026-11-01)
