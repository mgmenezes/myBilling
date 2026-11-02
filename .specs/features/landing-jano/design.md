# Landing do Jano — Design

**Spec**: `.specs/features/landing-jano/spec.md`

## O que muda, em uma frase

A landing ganha um segundo script, `site/simulador.js`, gerado por esbuild a partir de uma entrada
em TypeScript que importa a conta do app (`src/domain`) e a frase do app (um módulo puro novo em
`src/components`). O resto é HTML, CSS e testes da landing, mais a troca do nome público.

## Peças

| Peça | Onde | O que faz |
| --- | --- | --- |
| Frase do veredito | `src/components/texto-do-veredito.ts` (novo, puro) | `textoDoVeredito` e `textoEnxergaAte`, tirados de `resposta-da-simulacao.tsx` sem mudar texto. O componente passa a importar daqui |
| Casa inventada | `site/fonte/casa-inventada.ts` (novo) | `SALDOS_DA_CASA`: doze saldos em centavos, com cabeçalho "valores inventados" (AD-009) |
| Entrada do pacote | `site/fonte/simulador.ts` (novo) | `horizonteDaCasa(competencia)`, `responder({ valor, vezes, horizonte })` puros; `iniciar(document)` liga o DOM só quando há `document` |
| Construção | `site/construir.mjs` (novo) e `pnpm site:construir` | `esbuild.build` com opções exportadas (`OPCOES`), saída `site/simulador.js` com banner "Gerado por pnpm site:construir. Não edite." |
| Pacote | `site/simulador.js` (gerado, versionado) | ESM, sem dependência externa; a Vercel publica como está |
| Testes do pacote | `site/simulador.test.mjs` (novo) | Frescor (reconstrói em memória com `OPCOES` e compara), comportamento (`responder`) e regras da casa |

### A entrada `site/fonte/simulador.ts`

- Importa por `@/` (o esbuild lê `paths` do `tsconfig.json`): `parseBRL`, `dataParaCompetencia`,
  `addMeses`, `simularCompra`, `menorParcelamentoQueCabe` de `@/domain`; `planoDaCompra` de
  `@/application/compras/plano-da-compra` **se** o grafo dele for só domínio, senão `gerarParcelas`
  com os mesmos argumentos que `planoDaCompra` passa (o builder confere e registra a escolha);
  `mensagemDoErro` de `@/lib/erros` (só imports de tipo); `formatarBRL`, `formatarCompetencia`,
  `nomeDoMes` de `@/lib/formatar`; `apresentarSaldo` de `@/components/apresentar-saldo`; a frase de
  `@/components/texto-do-veredito`.
- `responder` repete a sequência de `Simulador` (`src/components/simulador.tsx:100-128`): `parseBRL`
  → plano com `modo: "TOTAL"`, `parcelaInicial: 1`, primeira parcela no começo do horizonte,
  `politicaResiduo: "PRIMEIRAS"` → `simularCompra` → `menorParcelamentoQueCabe` quando não cabe.
  Devolve `{ tipo: "SEM_VALOR" } | { tipo: "ERRO", mensagem } | { tipo: "RESPOSTA", veredito,
  enxergaAte?, colunas }`, onde cada coluna tem `mes` (curto, três letras), `antes`, `depois`,
  `parcela` em centavos e `vermelho`.
- `iniciar` lê `#simulador-valor` e `#simulador-vezes`, escuta `input`, escreve o veredito em
  `#simulador-veredito`, o detalhe em `#simulador-detalhe` e as colunas em `#simulador-grafico`
  (elementos criados com `createElement`, nunca `innerHTML` com texto do usuário), e troca o
  `aria-label` do gráfico. Tira o `hidden` de `[data-simulador]` ao iniciar.
- O mês corrente vem de `dataParaCompetencia(new Date().toISOString(), "America/Sao_Paulo")`, a
  única porta de relógio (AGENTS.md, regra 3). O `new Date()` vive na entrada do site, fora de
  `src/domain`.

### A página

- Herói em grade de duas colunas (`auto-fit, minmax(min(100%, 440px), 1fr)`): à esquerda selo,
  `<h1>`, subtítulo, ações, confiança e história; à direita o card `#simulador`.
- Dentro do card: `<div data-simulador hidden>` com os dois campos e a resposta; `<noscript>` com o
  exemplo de R$ 1.000,00 em 3x. Sem JavaScript, o `hidden` fica e o `<noscript>` aparece.
- Gráfico: doze colunas em `repeat(12, minmax(0, 1fr))`; barra fantasma (`--surface-strong`) com o
  antes, barra cheia (`--ink-muted`) com o depois, barra abaixo da linha (`--negativo`) com o que
  falta. Altura proporcional ao maior saldo da casa; o que falta tem altura mínima visível.
- `<script type="module" src="simulador.js"></script>` no fim do `<body>`.
- Marca: dois arcos de costas com um ponto cada, em SVG inline com `currentColor`; o favicon passa
  a ser o mesmo desenho em `data:` (como hoje), sem o azul.

### Testes

| Camada | Arquivo | O que prova |
| --- | --- | --- |
| Frase | `src/components/resposta-da-simulacao.test.tsx` e `simulador.test.tsx` (sem mudar asserção) | JANO-03 AC 8 |
| Pacote | `site/simulador.test.mjs` | JANO-03 ACs 1 a 5 e 7, JANO-04, JANO-05 ACs 1 e 2 |
| Estrutura | `site/estrutura.test.mjs` | JANO-01, JANO-02 ACs 1, 5 e 6, JANO-03 AC 6, JANO-05 AC 3, JANO-06, JANO-07 ACs 2 a 4 |
| Navegador | `site/verificar-navegador.mjs` | JANO-02 ACs 2 a 4 (digitar e ver o veredito trocar), axe e rolagem com o card preenchido |

O `node:test` importa `site/simulador.js` direto: o pacote não roda `iniciar` sem `document`.

## Riscos

- **Biome e TypeScript na entrada do site.** `tsconfig.json` inclui `**/*.ts`, então
  `site/fonte/*.ts` entra no `pnpm typecheck`; o Biome passa a ignorar só `site/simulador.js`.
- **Cobertura.** `src/components/texto-do-veredito.ts` entra no projeto `componentes`; os testes
  atuais já passam por todos os ramos da frase.
- **Frescor e plataforma.** O esbuild gera o mesmo arquivo em qualquer máquina com a mesma versão;
  a versão fica fixa como devDependency.
- **Captura.** O recorte depende do seletor da área de conteúdo do app; o builder escolhe o
  elemento (`main` ou o contêiner da coluna) e ajusta `width`/`height` no HTML.
