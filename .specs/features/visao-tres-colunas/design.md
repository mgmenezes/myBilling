# Visão geral em três colunas: Design

Spec: `spec.md` (TRES-01 a TRES-05). Protótipo aprovado: quadro "A · Três colunas" do canvas do
dono.

## Visão de conjunto

```
┌ (app)/layout.tsx ──────────────────────────────────────────────────────────────┐
│ MenuLateral (aside)        │ <main> filho                                      │
│  marca → /                 │ ┌ [competencia]/layout.tsx ──────────────────────┐│
│  NavegacaoPrincipal        │ │ barra do topo: SeletorCompetencia              ││
│   (competência da URL;     │ ├────────────────────────────────────────────────┤│
│    some na home)           │ │ page.tsx da Visão geral                        ││
│  ─ espaço ─                │ │  ┌ centro (flex-1) ────────┬ ColunaDeAcao ────┐││
│  rodapé:                   │ │  │ título + alternador     │ cadastro inline  │││
│   Importar planilha        │ │  │ 4 cards                 │ busca (next/form)│││
│   nome · tema              │ │  │ categorias │ próximos   │ últimos (8)      │││
│                            │ │  └─────────────────────────┴──────────────────┘││
│                            │ │ outras telas: AreaEstreita (max 1.024 px)      ││
│                            │ └────────────────────────────────────────────────┘│
└────────────────────────────┴───────────────────────────────────────────────────┘
```

## Moldura (TRES-01)

**`src/app/(app)/layout.tsx`** deixa de desenhar a pílula e o `<main>` de 1.024 px. Ele desenha
`flex min-h-dvh flex-col md:flex-row`: o `MenuLateral` e um `<main className="min-w-0 flex-1">`
sem largura máxima nem padding. Ele resolve a sessão, como hoje (AUTH-01, AC 3), e passa a carregar
os meios disponíveis e a última competência importada, que o diálogo de importação pede. São as
duas consultas que a Visão geral faz hoje para o mesmo diálogo, e que saem de lá.

**`src/components/menu-lateral.tsx`** (servidor, novo). Aside com `border-line`:
- **De 768 px para cima:** coluna de 15 rem encostada na borda, `border-r`, da altura da página
  (`md:min-h-dvh`, esticada pelo flex, sem `sticky`). Mostra a marca, a navegação, um espaço que
  cresce e o rodapé.
- **Abaixo de 768 px:** barra no topo com `border-b` e `flex-wrap`. A marca fica à esquerda e o
  rodapé à direita. A navegação continua a barra fixa de baixo, como hoje.
- **O rodapé:** `DialogoImportacao`, o nome de quem está logado e o `AlternadorDeTema`.

**`NavegacaoPrincipal`** deixa de receber `competencia` por prop. Ela lê o segmento com
`useParams()` e o valida com `criarCompetencia` do domínio (puro, roda no cliente). Sem competência
válida, que é o caso da home do ano, ela não desenha nada (TRES-01, AC 4). O `estaAtiva` não muda.
O motivo: o menu agora mora num layout acima da rota `[competencia]` e não recebe o parâmetro.

**`[competencia]/layout.tsx`** perde a coluna da navegação. Ele desenha a barra do topo, com o
`SeletorCompetencia` (`px-4 py-3 sm:px-8`, `border-b border-line`, TRES-01, AC 7), e os filhos.
Mantém `pb-24 md:pb-0`, para a barra inferior do celular não cobrir conteúdo.

**`src/components/area-estreita.tsx`** (novo, `<div className="mx-auto w-full max-w-conteudo
px-4 py-8 sm:px-6 sm:py-10">`). Reproduz o padding e a largura que o `<main>` antigo dava. Ele
embrulha:
- a home do ano;
- Lançamentos;
- Todo mês;
- Categorias;
- o `error.tsx` de `[competencia]`.

O `loading.tsx` tem forma própria (veja abaixo).

Cada uma dessas telas fica exatamente como era por dentro (TRES-01, AC 8).

**`DialogoDeCadastro`** ganha `variante?: "primario" | "discreto"`. O padrão continua `primario`, o
botão azul. A variante `discreto` é a do rodapé: botão sem preenchimento, `text-ink-muted`, com o
ícone de upload, em 44 px de altura. O azul é escasso, e na Visão geral a ação primária passa a ser
gravar o lançamento. `DialogoImportacao` repassa `variante="discreto"`.

## Visão geral (TRES-02)

`page.tsx` passa a desenhar `flex flex-col xl:flex-row`:

- **Centro** (`min-w-0 flex-1`). Painéis separados por `border-b border-line`, com `px-4 py-6
  sm:px-8`:
  1. **Cabeçalho:** o `h1` do mês, o `AlternadorDeVisao` e o `<details>` "Qual é a diferença". O
     `DialogoImportacao` sai daqui.
  2. **Cards:** a `GradeDeIndicadores`, sem mudança.
  3. **Seções:** `flex flex-wrap` com "Gastos por categoria" (`flex-[3_1_26rem]`) e "Próximos
     meses" (`flex-[2_1_20rem]`). Quando cabem lado a lado, uma linha fina as separa.
- **Coluna de ação** (`xl:w-[24rem] xl:shrink-0`). Usa `border-t` abaixo de 1.280 px e
  `xl:border-t-0 xl:border-l` a partir dele (TRES-02, ACs 1 e 5).

**`TransicaoMes` e o GSAP.** A divisão entre o que fica dentro e fora do Motion está em "Pontos que
o mapa de impacto obrigou a decidir", mais abaixo.

**`HorizonteFuturo`** vira linhas (TRES-02, AC 4). O `<ul>` perde o `snap-x`/`overflow-x-auto`.
Cada `<li className="mes-futuro">` passa a ser `flex flex-wrap items-center justify-between
border-b`, com o mês à esquerda e o `<dl>` à direita. Os dois pares `dt`/`dd` ficam lado a lado,
com o `dd` logo depois do seu `dt`, como hoje. `apresentarSaldo` e a animação de entrada não mudam.

## Coluna de ação (TRES-03, TRES-04, TRES-05)

**`src/app/(app)/[competencia]/cadastro-de-lancamento.tsx`** (servidor, novo). Extrai de
Lançamentos o `SeletorDeFormulario` com as abas Avulso e Parcelado e as server actions que ele usa:
- `criarLancamentoAvulso`;
- `criarCompra`;
- `criarCategoria`;
- `criarMeioDePagamento`.

Recebe a competência, a data padrão, os meios, as categorias e os usuários. Lançamentos o usa dentro
do `DialogoDeCadastro`, sem mudança visível (TRES-03, AC 4). A Visão geral o usa direto na coluna,
sob o título "Novo lançamento" (TRES-03, AC 1). Fica na camada `app` porque importa server actions,
como as páginas já fazem.

**Atualizar a Visão geral depois de gravar (TRES-03, AC 2):** as actions de hoje já bastam. Veja
"Revalidação".

**Busca (TRES-04):** `Form` de `next/form` com `action={`/${competencia}/lancamentos`}` (GET,
navegação no cliente) e `role="search"`. Contém um `<input type="search" name="busca">` com
`<label>` "Buscar lançamento" só para leitor de tela e um botão de envio com o ícone de lupa e o
rótulo acessível "Buscar". A busca vazia gera `?busca=`, que a página de Lançamentos já trata como
sem filtro (a função `texto` descarta o vazio) (TRES-04, AC 3).

**`src/application/mes/ultimos-lancamentos.ts`** (puro, novo). A função é
`ultimosLancamentos(itens, hoje, limite = 8)`:
- mantém só os não cancelados;
- mantém só os de `dataEvento <= hoje` (comparação de `'YYYY-MM-DD'` como texto, AD-002);
- ordena por `dataEvento` decrescente e, no empate, por `descricao` com
  `localeCompare(…, "pt-BR")`;
- corta em `limite`.

Fica ao lado de `filtrar-lancamentos.ts`, que é o mesmo tipo de função sobre a mesma lista.

**`src/components/ultimos-lancamentos.tsx`** (servidor, novo).
- **Título e link:** "Últimos lançamentos" com "Ver todos", um link em `text-primary-texto` para
  `/${competencia}/lancamentos`.
- **Linhas:** uma por lançamento, com 44 px ou mais e `border-b`. Cada linha mostra a descrição, a
  data por `formatarData`, a pill da categoria e o valor.
- **Pill da categoria:**
  - com categoria: `CLASSES_DA_COR[cor].pill`;
  - entrada: neutra com "Receita", como a coluna Categoria da lista;
  - gasto sem categoria: neutra com "Sem categoria".
- **Valor:** vem de `ValorDaNatureza`.
- **Lista vazia:** "Nenhum lançamento até hoje neste mês.".

**`src/components/valor-da-natureza.tsx`** (novo). Extrai da `TabelaLancamentos` três peças:
`corDaNatureza`, `rotuloDaNatureza` e o trecho do sinal (`+`, `−` ou nada) com o rótulo só para
leitor de tela. A tabela passa a usá-lo, e o resultado visível é idêntico. É a regra "como na
lista" de TRES-05, AC 3, num lugar só.

## Revalidação

Nada muda nas actions.
- **Avulso:** `criarLancamentoAvulso` revalida o caminho literal `/${competencia}` e
  `/${competencia}/lancamentos` (`src/app/actions/lancamentos.ts:174-177`).
- **Compra:** `criarCompra` revalida `/${c}` de cada competência tocada
  (`src/app/actions/compras.ts:69-77`).
- **Formulários:** os dois chamam `router.refresh()` depois de gravar (`form-lancamento-avulso.tsx:218`,
  `form-compra.tsx:247`).

Com isso, a Visão geral aberta é re-renderizada inteira, layouts incluídos. A prova de TRES-03, AC 2
é o e2e da T7, que atravessa a composição (L-014).

Os meios do diálogo de importação ficam no layout. Um meio criado em Lançamentos aparece no
diálogo depois do `router.refresh()` do formulário, ou na próxima navegação completa. O diálogo de
importação já guarda localmente o meio que ele mesmo cria (`dialogo-importacao.tsx`).

## Pontos que o mapa de impacto obrigou a decidir

- **Formulários e GSAP fora do `TransicaoMes`.**
  - O `TransicaoMes` embrulha o cabeçalho e os cards.
  - "Gastos por categoria" ganha um segundo `TransicaoMes`.
  - "Próximos meses" e a coluna de ação ficam fora dos dois. Formulário dentro da árvore do Motion
    corre o risco de ser reconstruído na hidratação com movimento reduzido. O GSAP dentro dela mede
    posições deslocadas (`[competencia]/page.tsx:39-43`).
  - Trocar de mês remonta a página inteira de qualquer jeito, porque o Next chaveia o segmento
    dinâmico, e o rascunho do cadastro se perde, como já acontece hoje.
- **Esqueleto (`[competencia]/loading.tsx`).** Passa a ter a forma da Visão geral nova, com estes
  blocos `animate-pulse`:

  | Onde | Blocos |
  | --- | --- |
  | Centro | título, os 4 cards, categorias e próximos meses |
  | Coluna de ação | cadastro e últimos lançamentos |

  São 9 blocos. A contagem de `e2e/acessibilidade.spec.ts:278` acompanha, porque REDE-03, AC 5 pede
  a mesma contagem da página.
- **`<dialog>` do menu antes do `<main>`.** O `aside` vem antes do `<main>` no DOM, pela ordem de
  leitura. O teste de foco preso de `e2e/lancamento-avulso.spec.ts:320,331` pega o primeiro
  `dialog` do documento. Ele passa a pegar `dialog[open]`, que é o diálogo que o teste abriu. É a
  mesma prova, com o alvo nomeado.
- **"Saiu da conta" (MOV-03).** `e2e/compra-parcelada.spec.ts:240,247` procura o rótulo do card sem
  `exact`. Com o formulário aberto, o rótulo "Já saiu da conta" casaria. A consulta passa a usar
  `{ exact: true }`, que é o rótulo do card. A garantia de MOV-03, rótulo do eixo caixa ausente do
  Planejamento, continua inteira.
- **Barra de filtros compacta.** `barra-de-filtros-compacta.tsx:81-84` é `fixed inset-x-0 top-0`
  com `max-w-conteudo`. A partir de 768 px, ela passa a começar depois do menu (`md:left-60`), com
  o miolo centrado como a `AreaEstreita`, senão cobre o menu.
- **Nada no menu que outro teste pega sem escopo.** O menu não tem `h1`, por causa do `h1` estrito
  da home em `auth.spec.ts:160`. Também não tem `h3` visível, por causa de
  `lancamento-avulso.spec.ts:239`, nem `role="status"` visível, por causa de
  `recorrencias.spec.ts:68`.
- **A grade dos cards não muda de pai**, porque `acessibilidade.spec.ts:239-251` conta 4 filhos.
- **O seletor de competência fica em `[competencia]/layout.tsx`**, porque `auth.spec.ts:147` exige
  que ele não apareça na página de não encontrado.
- **Larguras de Lançamentos.**
  - A 1.024 px: menu de 240 px mais `AreaEstreita` com padding de 24 px dão 736 px úteis. É a
    mesma largura de hoje (208 + 32 de navegação e vão).
  - A 1.280 px e a 1.440 px: mais largura que hoje. LST-05, AC 3 continua valendo.
- **Comentários que deixam de ser verdade** são corrigidos na task que os torna falsos:
  - `(app)/layout.tsx`;
  - `(app)/page.tsx`, que diz que "a home não tem navegação lateral" e fala da "pílula do
    cabeçalho";
  - `[competencia]/page.tsx`, sobre o importar ao lado do título;
  - `lancamentos/page.tsx`, que diz que "o cadastro mora aqui, e não no painel".

## Testes

| Camada | Arquivo | Prova |
| --- | --- | --- |
| Aplicação | `ultimos-lancamentos.test.ts` | Cancelado fora, data futura fora, ordem por data e por descrição, corte em 8, lista vazia (TRES-05, ACs 1 e 2) |
| Componente | `navegacao-principal.test.tsx` | Sem competência na URL não desenha itens; com competência, os quatro itens e o ativo (TRES-01, ACs 3 e 4) |
| Componente | `menu-lateral.test.tsx` | Rodapé com o nome, o tema e "Importar planilha", com consultas presas ao `aside` (TRES-01, AC 5; L-018) |
| Componente | `horizonte-futuro.test.tsx` | Os testes de SALDO-03 continuam valendo com as linhas |
| Componente | `ultimos-lancamentos.test.tsx` | Pill com cor, "Receita" e "Sem categoria"; sinal e cor da natureza; mensagem vazia; "Ver todos" (TRES-05, ACs 3 a 5) |
| e2e | `e2e/visao-tres-colunas.spec.ts` | Medidas em 1.920 px (menu em x = 0, coluna de ação à direita do centro) e em 1.024 px (coluna abaixo); importar pelo rodapé em Lançamentos; lançar na coluna e ver o card e o topo dos últimos mudarem (L-014); buscar e cair em Lançamentos filtrado; 400 px sem rolagem em home, Visão geral, Lançamentos, Todo mês e Categorias |
| e2e | Ajustes nos specs que localizam a pílula, o botão de importar ou a navegação | O lugar novo, pelas consultas restritas à região (L-018) |
