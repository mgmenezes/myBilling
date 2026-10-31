# Lançamentos em lista densa: Design

Spec: `spec.md` (DENS-01 a DENS-04). Protótipo aprovado: quadro "A · Lista densa e filtros à
direita" do canvas do dono. O mapa de impacto, com as consultas dos testes que dependem da tela de
hoje, guiou cada escolha abaixo.

## A página (DENS-03)

`lancamentos/page.tsx` deixa a `AreaEstreita` e passa a ser uma grade com **um único** cartão de
filtros, que muda de lugar só por CSS:

```
<div class="grid 2xl:grid-cols-[minmax(0,1fr)_20rem]">
  cabeçalho (h1 + "+ Novo lançamento")   2xl: coluna 1, linha 1    mx-auto max-w-[1000px]
  <div 2xl: coluna 2, linhas 1-2, border-l>                        (a linha fina, da altura toda)
    <div id="cartao-de-filtros" 2xl:sticky 2xl:top-0 2xl:max-h-dvh 2xl:overflow-y-auto>
      FiltrosDeLancamentos
  BarraDeFiltrosCompacta
  lista (blocos)                          2xl: coluna 1, linha 2    mx-auto max-w-[1000px]
</div>
```

- **Abaixo de 1.536 px**, a ordem do DOM é a de hoje: cabeçalho, filtros e lista, numa coluna
  centrada de até 1.024 px, com o respiro da `AreaEstreita`.
- **Um id só e um `<search>` só.** As consultas de `busca-e-filtros`, `trocar-categoria`,
  `categorias` e `visao-tres-colunas` usam `#cartao-de-filtros search`. Dois cartões duplicariam o
  id.
- **Barra compacta:** a partir de 1.536 px o cartão fica preso e sempre na tela, então o
  `IntersectionObserver` da `BarraDeFiltrosCompacta` nunca o vê sair, e a barra não aparece
  (DENS-03, AC 6). Nada muda no componente da barra.
- **`FiltrosDeLancamentos` na coluna**, com classes `2xl:`:
  - o cartão perde a moldura (`2xl:rounded-none 2xl:border-0 2xl:bg-transparent 2xl:p-6`);
  - os três seletores empilham (`2xl:grid-cols-1`);
  - a linha da contagem e do total (`role="status"`) sobe para o alto com `2xl:order-first`, sem
    mudar a ordem do DOM;
  - os chips continuam os de hoje e quebram linha na largura da coluna (DENS-03, AC 4).
- **Sem `h3`, sem um segundo `role="status"` e sem texto com "lançamento" na coluna.** Os testes
  de `lancamento-avulso` e `busca-e-filtros` contam esses elementos sem escopo.

## A linha (DENS-01)

- **Altura:** a `CELULA` da tabela troca `md:pointer-fine:py-2.5` por `md:pointer-fine:py-1`. Com o
  seletor de 36 px, a linha fica com 44 px.
- **Alvos:** as reduções valem só para `md:pointer-fine:`. No toque e abaixo de 768 px, os alvos
  continuam com 44 px (TOQUE-01). As classes `min-h-11 min-w-11` que os testes de hoje conferem
  ficam.
- **Parcela:** um `span` em linha, logo depois da descrição: `<span class="tabular">2/4</span> ·
  faltam 2`, ou `4/4 · última`, em 13 px e `text-ink-muted`. O texto vem de uma função pura,
  `textoDaParcela(parcela)`, testada à parte.
- **`BotaoPago`:** o mesmo componente, com o mesmo nome acessível, o mesmo texto e o mesmo
  `aria-pressed`. Ganha `md:pointer-fine:min-h-8`. O ícone ✓ ou ○ do protótipo fica de fora: ele
  mudaria o texto do botão que os testes de hoje leem, sem informar nada que "Pago" já não diga.
- **`ValorConfirmavel`, fechado:** o `span` passa de `flex-col` para `md:flex-row-reverse
  md:items-baseline md:gap-2`. O texto ("previsto" ou "confirmado · previa R$ X") fica à esquerda do
  valor, na mesma linha, com o mesmo texto de hoje (FIXO-04).
- **Descrição longa:** quebra linha, e só aquela linha cresce. Cortar com reticências pediria largura
  fixa na célula e arriscaria a tabela sair da margem (LST-05, AC 3).

## O menu "⋯" (DENS-02)

**`src/components/menu-da-linha.tsx`** (cliente, novo):
- **O que é:** um botão "⋯" com `aria-expanded`, `aria-controls` e o nome "Mais ações para
  <descrição>", que mostra um painel posicionado (`absolute right-0 top-full z-20`) **dentro da
  própria célula**. Não usa portal, para as consultas presas à linha continuarem valendo.
- **Fechar:** `Escape` fecha e devolve o foco ao "⋯"; clique fora fecha (`pointerdown` no
  `document`); o foco saindo do painel fecha.
- **Conteúdo:** o `BotaoExcluir` de hoje, sem mudança de comportamento. Ele já se desarma no
  `Escape` e ao perder o foco. A confirmação em dois toques acontece dentro do painel aberto.
- **Papel:** não usa `role="menu"`, para o "Excluir" continuar sendo um botão, como os testes e o
  leitor de tela o encontram hoje. O padrão é o de divulgação (disclosure), mais simples e certo
  para uma ação só.
- **Tamanho:** 44×44 px no toque e abaixo de 768 px; 32×32 px com ponteiro fino a partir de 768 px.

A tabela renderiza o `MenuDaLinha` só na linha de avulso, no lugar do `BotaoExcluir`.

## Títulos presos (DENS-04)

A `div` do cabeçalho do `BlocoRecolhivel` ganha `2xl:sticky 2xl:top-0 2xl:z-10 2xl:bg-canvas`. A `div
id="linhas-…"` não ganha atributo nenhum: o e2e de LST-02 lê esse HTML exato. A partir de 1.536 px
não há barra compacta. O `scroll-padding-top` de hoje, de 4 rem, é maior que o cabeçalho de 3 rem,
então o foco pelo teclado não para debaixo dele.

## Testes que mudam porque a spec mudou

As mudanças abaixo seguem regras novas aprovadas pelo dono. Nenhuma delas afrouxa o que o teste
prova.

| Teste | Por quê | Mudança |
| --- | --- | --- |
| `tabela-lancamentos.test.tsx` (PARC-08, LST-05 AC 1, AVUL-03 AC 6, TOQUE-01) | Parcela curta; "Excluir" no menu | Novos textos da parcela; abrir o "⋯" antes de achar "Excluir" |
| `compra-parcelada.spec.ts:115-117,176-178,184` | Parcela curta | "8/10 · faltam 2" e "10/10 · última" |
| `lista-enxuta.spec.ts:453-466` (LST-05 AC 1) | Parcela curta; a mesma linha só é garantida a partir de 1.280 px | Texto novo; a parcela na mesma altura da descrição em 1.280 e 1.440 px |
| `lista-enxuta.spec.ts:409-431` (LST-05 AC 3) | Roda em 1.024, 1.280 e 1.440 px, todas abaixo de 1.536 px | Nada muda: o cartão continua no topo nessas larguras |
| `lista-enxuta.spec.ts:351-376` (LST-03) | Roda em 1.280 px, abaixo de 1.536 px | Nada muda |
| `lancamento-avulso.spec.ts:243-276` (AVUL-03) | "Excluir" no menu | Abrir o "⋯" da linha primeiro |
| `acessibilidade.spec.ts:118-160` (TOQUE-01, 400 px) | "Excluir" no menu | Abrir o "⋯" e medir o "⋯" e o "Excluir" com 44×44 |
| `visao-tres-colunas.spec.ts:213-232` (TRES-01 AC 8) | Lançamentos deixa a `AreaEstreita` | O laço fica com Todo mês e Categorias |
| `visao-tres-colunas.spec.ts:560-571` | Roda em 1.280 px, abaixo de 1.536 px | Nada muda |

## e2e novo: `e2e/lancamentos-densos.spec.ts`

| Faixa | O que mede |
| --- | --- |
| 1.920 px | Toda linha com até 48 px, inclusive parcela, fixo confirmado e vencido (DENS-01); a parcela "2/3 · faltam 1" na mesma altura da descrição |
| 1.920 px | O "⋯" só nas linhas de avulso; abrir, excluir, confirmar, a linha some (DENS-02) |
| 1.920 px | A coluna de filtros à direita da lista, com o `border-left` computado; presa ao rolar até o fim; sem a barra compacta; a lista com até 1.000 px e centrada (DENS-03) |
| 1.920 px | O título "Fixos" no alto ao rolar até o meio do bloco (DENS-04) |
| 1.535 px e 1.536 px | O limiar dos dois lados: filtros no topo a 1.535 px e na coluna a 1.536 px |
| 400 px | Sem rolagem lateral |
