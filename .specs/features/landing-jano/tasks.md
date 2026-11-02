# Landing do Jano — Tasks

**Spec**: `.specs/features/landing-jano/spec.md`
**Design**: `.specs/features/landing-jano/design.md`
**Status**: Tasks concluídas, à espera do Verifier
**Total**: 8 tasks em 4 fases

> **Por que a frase e o pacote vêm antes da página.** A landing promete "a conta é a mesma do app".
> Isso só é verdade se o pacote nascer de `src/domain` e da mesma função de frase. T2 tira a frase do
> componente sem mudar o app; T3 gera o pacote e prova que ele responde o que o app responderia.
> Só então a página usa o pacote.

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Para cada task, nesta ordem:

1. **Pré-implementação** — declarar premissas, arquivos a tocar e critério de sucesso.
2. **Escrever os testes primeiro**, derivados dos acceptance criteria do `spec.md`, quando a task tem teste.
3. **Implementar** até os testes passarem.
4. **Gate Check** — rodar o comando do nível declarado na task.
5. **Test Adequacy Review** com citação `file:line` e a expressão da assertion.
6. **Marcar a task como concluída** neste arquivo e atualizar a traceability no `spec.md`, **dentro** do mesmo commit.
7. **Um commit atômico** em Conventional Commits, validado por `check_commit.py`.

Proibições absolutas: commitar antes do gate passar · enfraquecer, pular ou deletar teste para passar (a única saída de teste é a de VEM-02 ACs 4 e 5, registrada na spec) · agrupar tasks em um commit · "já que estou aqui" · dado financeiro real (AD-009) · mutante aplicado no arquivo real (mutantes só em cópia no scratchpad) · `git checkout -- arquivo` com trabalho não commitado no mesmo arquivo.

**Blast radius:** a aprovação destas tasks autoriza implementação e commits **locais** no branch `feat/landing-jano`. `git push`, deploy na Vercel, merge, registro de domínio e qualquer operação remota exigem autorização explícita e separada.

---

## Test Coverage Matrix

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `src/components/texto-do-veredito.ts` | unitário, Vitest (projeto `componentes`) | Todo ramo pelos testes existentes; JANO-03 AC 8 | `src/components/*.test.tsx` | `pnpm test:unit` |
| `site/simulador.js` (pacote) | `node:test` | JANO-03 ACs 1 a 5 e 7, JANO-04, JANO-05 ACs 1 e 2 | `site/simulador.test.mjs` | `node --test site/` |
| `site/index.html`, `site/estilos.css` | estrutural, `node:test` | JANO-01, JANO-02 ACs 1, 5, 6, JANO-03 AC 6, JANO-05 AC 3, JANO-06, JANO-07 ACs 2 a 4 | `site/estrutura.test.mjs` | `node --test site/` |
| Página renderizada | navegador, Playwright + axe | JANO-02 ACs 2 a 4; CAMP-03 AC 6 com o card preenchido | `site/verificar-navegador.mjs` | `node site/verificar-navegador.mjs` |
| `site/imagens/` | gerado por script | JANO-07 AC 1: o script é a prova; o teste estrutural confere dimensões | `site/capturar.mjs` | `pnpm site:capturar` |
| `docs/marketing/*.md`, `.specs/**` | **none** | JANO-08 ACs 1 a 4 por `grep` na task | — | — |

---

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| `docs` | task só de texto | `pnpm lint` |
| `unit` | task em `src/` | `pnpm typecheck && pnpm lint && pnpm test:unit` |
| `site` | task em `site/` sem mudança de layout | `pnpm lint && pnpm typecheck && node --test site/` |
| `navegador` | task que muda layout ou interação | `pnpm lint && pnpm typecheck && node --test site/ && node site/verificar-navegador.mjs` |
| `build` | última task | `pnpm verify && pnpm site:verificar` |

Pré-requisito do `build`: Postgres de pé (`pnpm db:up`, ou o contêiner `mybilling-db` já rodando). Pré-requisito de T7: banco `mybilling_test` semeado e a porta 3200 livre.

---

## Execution Plan

### Phase 0 — O texto que manda

```
T1
```

### Phase 1 — A conta do app, empacotada

```
T1 -> T2 -> T3
```

### Phase 2 — A página

```
T3 -> T4 -> T5 -> T6 -> T7
```

### Phase 3 — Fechamento

```
T7 -> T8
```

---

## Task Breakdown

### Phase 0 — O texto que manda

#### T1: Posicionamento e kit com o nome Jano
**What**: `posicionamento.md` com a seção "Nome" (público Jano desde 2026-11-02; app myBilling por dentro até domínio e INPI), sem o simulador em "O que nunca prometer", sem a seção "O que vem a seguir", com a nota do 14%; `kit-de-copy.md` com Jano, a primeira headline igual ao novo `<h1>`, sem "ainda não existe"; `copy-landing-simulador.md` com uma nota no topo apontando para esta fatia.
**Where**: `docs/marketing/posicionamento.md`, `docs/marketing/kit-de-copy.md`, `docs/marketing/copy-landing-simulador.md`
**Depends on**: nenhuma
**Reuses**: as decisões registradas na spec
**Requirement**: JANO-08 (ACs 1 a 3)
**Tools**: nenhuma
**Done when**:
- [x] Seção "Nome" e o simulador fora de "O que nunca prometer" (AC 1)
- [x] Sem "O que vem a seguir"; nota do 14% (AC 2)
- [x] Kit com 6 a 8 headlines, a primeira igual ao `<h1>`; `grep -c myBilling` e `grep -c "ainda não existe"` dão 0 no kit (AC 3)
**Tests**: none
**Gate**: docs

### Phase 1 — A conta do app, empacotada

#### T2: A frase do veredito num módulo puro
**What**: `textoDoVeredito`, `mesNoVeredito`, `listarMeses`, `iniciarComMaiuscula` e o texto "Enxergo até" saem de `resposta-da-simulacao.tsx` para `texto-do-veredito.ts`, sem mudar uma letra; o componente e quem importava `textoDoVeredito` passam a importar do módulo novo.
**Where**: `src/components/texto-do-veredito.ts`, `src/components/resposta-da-simulacao.tsx`
**Depends on**: T1
**Reuses**: o código atual, movido
**Requirement**: JANO-03 (ACs 2 e 8)
**Tools**: nenhuma
**Done when**:
- [x] O módulo novo não importa React nem JSX
- [x] Testes de `resposta-da-simulacao` e `simulador` passam sem mudar asserção (AC 8)
- [x] Cobertura do projeto `componentes` sem queda
**Tests**: os existentes em `src/components/resposta-da-simulacao.test.tsx` e `simulador.test.tsx`
**Gate**: unit

#### T3: O pacote da landing com a conta do app
**What**: `esbuild` como devDependency (a versão já presente no store); `site/construir.mjs` com `OPCOES` exportadas e o script `site:construir`; `site/fonte/casa-inventada.ts`; `site/fonte/simulador.ts` com `horizonteDaCasa`, `responder` e `iniciar`; `site/simulador.js` gerado; Biome ignora o gerado; `site/simulador.test.mjs` com frescor, comportamento e regras da casa.
**Where**: `package.json`, `pnpm-lock.yaml`, `biome.json`, `site/construir.mjs`, `site/fonte/casa-inventada.ts`, `site/fonte/simulador.ts`, `site/simulador.js`, `site/simulador.test.mjs`, `src/components/texto-do-veredito.ts` e `src/components/simulador.tsx` (a constante `TEXTO_SEM_VALOR` passa a ser compartilhada)
**Depends on**: T2
**Reuses**: `simularCompra`, `menorParcelamentoQueCabe`, `parseBRL`, `dataParaCompetencia`, `addMeses`, `planoDaCompra` ou `gerarParcelas`, `mensagemDoErro`, `apresentarSaldo`, `formatar*`, `textoDoVeredito`
**Requirement**: JANO-03 (ACs 1, 3, 4, 5, 7), JANO-04, JANO-05 (ACs 1, 2, 4)
**Tools**: nenhuma
**Done when**:
- [x] Teste: R$ 1.000,00 em 3x dá 333,34, 333,33 e 333,33 (JANO-03 AC 3)
- [x] Teste: valor vazio e "abc" dão `SEM_VALOR` com a frase do app (AC 4)
- [x] Teste: 0 e 121 vezes dão a mensagem de `QTD_PARCELAS_INVALIDA` (AC 5)
- [x] Teste: 14 vezes dão "Enxergo até <Mês de ano>." com o último mês do horizonte (AC 7)
- [x] Teste: o veredito de `responder` é igual a `textoDoVeredito` chamado com a mesma simulação (AC 1 e 2)
- [x] Teste: doze saldos, múltiplos de 500 centavos, entre 0 e 200000; horizonte de dezembro atravessa o ano (JANO-04 ACs 1 a 3)
- [x] Teste: R$ 2.400,00 em 10x não cabe, dois meses derrubados, menor que cabe 12 (JANO-04 AC 4)
- [x] Teste: o arquivo versionado é igual ao que `OPCOES` gera agora, e começa com o banner (JANO-05 ACs 1 e 2)
- [x] `biome check .` não lê `site/simulador.js` (JANO-05 AC 4)
**Tests**: `site/simulador.test.mjs`
**Gate**: site

### Phase 2 — A página

#### T4: O herói do Jano
**What**: título, descrição, favicon e marca do Jano; selo, `<h1>`, subtítulo, ações ("Testar o simulador" para `#simulador`), confiança e história; links do cabeçalho; coluna "Jano" e `data-vence="jano"` no comparativo; `alt` sem "myBilling"; a captura da Visão geral sai do herói e vai para `sua-planilha`; o card `#simulador` entra vazio, com o exemplo visível por padrão. Testes de VEM-02 AC 1, CAMP-02 AC 3 e VEM-02 AC 3 passam para o texto novo.
**Where**: `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`
**Depends on**: T3
**Reuses**: `.hero`, `.cartao`, `.captura`, `.botao`, `secao()`
**Requirement**: JANO-01, JANO-03 (AC 6), JANO-07 (AC 3)
**Tools**: nenhuma
**Done when**:
- [x] Testes de JANO-01 ACs 1 a 8
- [x] Teste do exemplo visível, com a frase de JavaScript, e dos campos com `hidden` (JANO-03 AC 6)
- [x] Teste: a captura da Visão geral em `sua-planilha` (JANO-07 AC 3)
- [x] Navegador sem rolagem e sem violação nas seis combinações
**Tests**: `site/estrutura.test.mjs`
**Gate**: navegador

#### T5: O simulador no herói
**What**: campos, veredito, detalhe e gráfico dentro de `[data-simulador]`; `<script src="simulador.js" defer>`; CSS do card e do gráfico; teste estrutural com dois scripts (revisa CAMP-03 AC 5); verificador de navegador digita e confere o veredito.
**Where**: `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`, `site/verificar-navegador.mjs`
**Depends on**: T4
**Reuses**: `iniciar` do pacote; tokens `--negativo`, `--surface-strong`, `--ink-muted`
**Requirement**: JANO-02, JANO-05 (AC 3)
**Tools**: nenhuma
**Done when**:
- [x] Teste estrutural: card, rótulos, "casa inventada", `aria-live`, link final (JANO-02 ACs 1, 5, 6)
- [x] Teste estrutural: exatamente os dois scripts, nenhum terceiro (JANO-05 AC 3)
- [x] Navegador: ao carregar, o veredito de 2.400 em 10x; ao trocar para 12, "Cabe."; meses vermelhos com `--negativo` e negrito (JANO-02 ACs 2 a 4)
- [x] Navegador: sem rolagem em 360 px com o card preenchido; axe sem violação
**Tests**: `site/estrutura.test.mjs`, `site/verificar-navegador.mjs`
**Gate**: navegador

#### T6: O que existe, sem o que vem a seguir
**What**: tira a seção `a-seguir` e os testes de VEM-02 ACs 4 e 5; `SECOES` sem `a-seguir`; pergunta "Como funciona o Dá pra comprar?" no FAQ; legenda do 58% sem o 14%.
**Where**: `site/index.html`, `site/estrutura.test.mjs`
**Depends on**: T5
**Reuses**: `secao()`, o teste exaustivo de seções
**Requirement**: JANO-06
**Tools**: nenhuma
**Done when**:
- [x] Teste: ordem de oito seções sem `a-seguir` (AC 1)
- [x] Teste: sem "ainda não existe" e sem "O que vem a seguir" no texto visível (AC 2)
- [x] Teste: a pergunta nova e as três ideias da resposta (AC 3)
- [x] Teste: a legenda do 58% sem "14%" (AC 4)
**Tests**: `site/estrutura.test.mjs`
**Gate**: site

#### T7: Capturas sem o menu lateral
**What**: `capturar.mjs` grava só a área de conteúdo; as quatro imagens regeneradas pelo seed; `width` e `height` no HTML iguais às dimensões novas; teste lê as dimensões do PNG.
**Where**: `site/capturar.mjs`, `site/imagens/*.png`, `site/index.html`, `site/estrutura.test.mjs`
**Depends on**: T6
**Reuses**: o fluxo atual de captura com o provider de teste
**Requirement**: JANO-07 (ACs 1, 2, 4)
**Tools**: nenhuma
**Done when**:
- [x] Quatro imagens novas, sem o menu (conferido abrindo cada uma) (AC 1)
- [x] Teste: `width`/`height` de cada `<img>` igual ao cabeçalho IHDR do PNG dividido pela escala 2 (AC 2)
- [x] Legendas com "dados de demonstração" (AC 4)
**Tests**: `site/estrutura.test.mjs`
**Gate**: navegador

### Phase 3 — Fechamento

#### T8: Specs revistas, AD-026 e handoff
**What**: anotações em CAMP-03 AC 5, VEM-02 ACs 1, 4, 5 e 7 e DOR-02 AC 1; AD-026 em `STATE.md` (nome público, pacote versionado, dois scripts) e o Handoff; `HANDOFF.md`; `site/README.md` com `pnpm site:construir`. Gate completo.
**Where**: `.specs/features/campanha-lista-de-espera/spec.md`, `.specs/features/campanha-o-que-vem/spec.md`, `.specs/features/landing-dor/spec.md` (DOR-02 AC 1 e DOR-04 AC 1), `.specs/STATE.md`, `.specs/HANDOFF.md`, `site/README.md`
**Depends on**: T7
**Reuses**: o formato dos ADs anteriores
**Requirement**: JANO-08 (ACs 4 e 5)
**Tools**: nenhuma
**Done when**:
- [x] Specs anotadas; AD-026 e Handoff; `HANDOFF.md`; README (AC 4)
- [x] `pnpm verify && pnpm site:verificar` saem 0 (AC 5)
**Tests**: none
**Gate**: build

---

## Fix tasks (Verifier, rodada 1)

- [x] **F1** (JANO-04 AC 2): o teste do fuso usa um instante que cai em março em São Paulo e em abril em UTC; o mutante `FUSO = "UTC"` morre.
- [ ] **F2** (JANO-02 AC 4): R$ 2.050,00 em 10x termina um mês em exatamente zero, que não é vermelho.
- [ ] **F3** (JANO-02 AC 3): o navegador também muda o campo do valor e confere o veredito.
- [ ] **F4** (JANO-02 AC 5): o navegador lê o `aria-label` do gráfico depois de cada resposta.

## Deviations

- **SPEC_DEVIATION (T3, antes de implementar):** o pacote sai como script clássico (`format: "iife"`,
  `globalName`), carregado com `<script src="simulador.js" defer>`, e não como módulo. Motivo: o Chrome
  bloqueia script de módulo em `file://`, que é como `verificar-navegador.mjs` e o README abrem a
  página. JANO-05 AC 3 ajustado na spec.
- **SPEC_DEVIATION (T3, antes de implementar):** o exemplo sem JavaScript é um bloco visível por
  padrão que o pacote esconde, e não um `<noscript>`. Motivo: cobre também o pacote que falha ao
  carregar. JANO-03 AC 6 ajustado na spec. O teste do pacote roda o IIFE em `node:vm`.
- **Observação (T3):** uma rodada do `pnpm test:unit` falhou 8 testes em 7 arquivos e contou 135
  arquivos em vez de 136; as duas rodadas seguintes, sem mudança de código, deram 136 arquivos e
  2.164 testes verdes. Tratado como falha passageira do ambiente; fica registrado para o Verifier.
- **Decisão do autor (T3):** "Informe o valor para ver a resposta." passa a ser a constante
  `TEXTO_SEM_VALOR` em `texto-do-veredito.ts`, usada pelo app e pela landing, em vez de duas cópias.
- **Decisão do autor (T4):** a nota "A lista pede o e-mail e uma pergunta..." (DOR-02 AC 3) fica no
  herói, menor, junto da lista de confiança; tirá-la revisaria DOR-02 AC 3, que esta spec não revê.
  Os links do cabeçalho somem abaixo de 640 px para o cabeçalho caber em 360 px. A chave interna do
  tema, `mybilling:tema`, fica: é nome de armazenamento, não texto, e renomeá-la apagaria a escolha
  de tema de quem já visitou.
- **Observação para o dono (T5):** em 360 px o card do simulador fica a uma rolagem, depois da linha
  da história; o quadro "Celular" do canvas punha o simulador antes do botão. A spec não pede essa
  ordem, então ficou como está.
- **SPEC_DEVIATION (T6):** tirar a seção revisa também DOR-04 AC 1 ("entre sua-planilha e a-seguir"),
  que o JANO-08 AC 4 não listava; a lista foi corrigida na spec. O teste apagado de VEM-02 ACs 4 e 5
  tinha também a regra de "em breve" só nos botões (VEM-04 AC 1), que não depende da seção: ela
  ficou como teste próprio.
- **Decisão do autor (T7):** as capturas usam um banco próprio, `mybilling_test_jano`, migrado e
  semeado por `pnpm db:seed`, via `DATABASE_URL_CAPTURA`, para não disputar o `mybilling_test` com
  os testes de integração. O React avisou de hydration mismatch durante a captura; é o aviso já
  registrado no handoff da campanha, fora desta fatia.
