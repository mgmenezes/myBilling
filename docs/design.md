# Identidade visual do myBilling

Derivada do sistema descrito em `DESIGN.md` (análise das superfícies da Coinbase), **sem usar a marca
Coinbase**. O documento descreve uma linguagem visual; o logotipo, o nome e os tipos licenciados são
ativos de marca deles e não entram aqui. O que foi adotado: canvas branco, azul único e escasso,
geometria de pílula, cartão chapado com hairline, display em peso 400 e monoespaçada em toda
grandeza numérica.

> Este arquivo substituiu a identidade anterior, derivada de um sistema da Mastercard (canvas creme,
> laranja de sinal, Sofia Sans). Nada daquela paleta sobreviveu. Se você encontrar `--accent`,
> `rounded-cta`, `shadow-float` ou Sofia Sans em algum lugar, é resíduo e deve sair.

## Regra que manda em tudo

**O azul é escasso.** `--primary` é a única cor de ação do sistema: CTA primário, link e glifo de
marca. O documento diz "one or two blue moments per band", e é a escassez — não o matiz — que faz o
azul significar "aja aqui". Espalhá-lo por barra de gráfico, selo e ícone decorativo esvazia a cor e
a tela inteira perde o ponto de entrada.

Corolário: **preto não é superfície de cartão.** A inversão existe em exatamente um papel, o do
destaque (`pricing-tier-featured` no documento: *"visual inversion signals 'highlighted choice'
without colored ribbons"*), e aparece **uma vez por tela**. Hoje ela está no indicador de saldo e no
segmento ativo do alternador.

## Tokens

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--canvas` | `#FFFFFF` | `#0A0B0D` | Piso da página |
| `--surface-soft` | `#F7F7F7` | `#101216` | Faixa alternada, bloco embutido |
| `--surface` | `#FFFFFF` | `#16181C` | Cartão. No claro quem o separa do fundo é o hairline |
| `--surface-strong` | `#EEF0F3` | `#21242A` | Botão secundário, campo de busca, selo, placa de ícone |
| `--inverso` | `#0A0B0D` | `#EEF0F3` | A superfície de destaque. Inverte junto com o tema |
| `--on-inverso` | `#FFFFFF` | `#0A0B0D` | Texto sobre a inversão |
| `--on-inverso-suave` | `#A8ACB3` | `#5B616E` | Rótulo dentro da inversão |
| `--ink` | `#0A0B0D` | `#FFFFFF` | Texto principal |
| `--ink-muted` | `#5B616E` | `#A8ACB3` | Corpo e rótulo |
| `--ink-soft` | `#7C828A` | `#7C828A` | Texto terciário, sem informação |
| `--primary` | `#0052FF` | `#0052FF` | Preenchimento de CTA |
| `--primary-ativo` | `#003ECC` | `#003ECC` | Estado pressionado |
| `--primary-texto` | `#0052FF` | `#3979FF` | O mesmo azul como texto: link, glifo |
| `--positivo` | `#047D4A` | `#05B169` | Entrada de dinheiro. **Só texto** |
| `--negativo` | `#CF202F` | `#E34855` | Saída e erro. **Só texto** |
| `--line` | `#DEE1E6` | `rgba(255,255,255,.10)` | Hairline: é daqui que vem a separação |

### Contraste medido, não presumido

Os pares abaixo foram calculados, não estimados. Cada cor é medida contra a **superfície mais
exigente onde ela aparece** — o cartão, não o canvas.

| Par | Razão | Veredito |
| --- | --- | --- |
| ink sobre canvas (claro e escuro) | 19.69 | AA e AAA |
| ink-muted sobre canvas, claro | 6.21 | AA |
| ink-muted sobre canvas, escuro | 8.64 | AA |
| branco sobre `--primary` | 5.75 | AA |
| `--primary` como texto, claro | 5.75 | AA |
| `--positivo` sobre selo `#EEF0F3`, claro | 4.56 | AA |
| `--negativo` sobre selo `#EEF0F3`, claro | 4.72 | AA |
| `--positivo` e `--negativo` sobre cartão escuro | 6.35 e 4.51 | AA |
| `on-inverso-suave` dentro da inversão | 5.44 | AA |

### As três cores que o documento dá e que reprovaram aqui

O `DESIGN.md` analisa um **site de marketing claro**: manchete grande, canvas branco, sem tema
escuro. Três valores dele reprovam no uso que este app faz — texto pequeno, sobre cartão, nos dois
temas. Cada derivado preserva matiz e saturação e move **só a luminosidade**, até bater 4.5.

| Cor do documento | Razão no nosso uso | Derivado | Razão |
| --- | --- | --- | --- |
| `semantic-up #05B169` como texto sobre branco | **2.80** | `#047D4A` no tema claro | 5.20 |
| `primary #0052FF` como texto sobre `#0A0B0D` | **3.42** | `#3979FF` no tema escuro | 5.02 |
| `semantic-down #CF202F` como texto sobre `#0A0B0D` | **3.66** | `#E34855` no tema escuro | 4.99 |

Um quarto valor foi remapeado em vez de derivado: o **muted `#7C828A`** mede 3.88 sobre branco e não
serve para rótulo de cartão. O `--ink-muted` deste app aponta para o **body `#5B616E`** do documento
(6.21); o muted vive em `--ink-soft`, para texto terciário que não carrega informação.

### Degraus de superfície do tema escuro

O documento não tem tema escuro — ele tem faixas escuras dentro de uma página clara. O tema foi
construído a partir dos dois tons que ele declara (`#0A0B0D` e `#16181C`) mais um terceiro degrau,
escolhido por medição e não no olho. Abaixo de 1.10 duas superfícies adjacentes não se distinguem.

| Degrau | Razão |
| --- | --- |
| canvas `#0A0B0D` para cartão `#16181C` | **1.108** |
| cartão `#16181C` para campo `#21242A` | **1.143** |

## Como os dois temas convivem

Cada token é declarado **uma única vez**, com `light-dark(claro, escuro)`. Quem escolhe o lado é
`color-scheme`, e não uma segunda cópia da paleta dentro de `@media (prefers-color-scheme: dark)`.
Paleta duplicada é o jeito consagrado de os dois temas divergirem: alguém ajusta um token no bloco de
cima e esquece o de baixo.

Trocar `color-scheme` também faz o navegador pintar barra de rolagem, `<select>` e
`<input type="date">` no tema certo — coisa que classe utilitária nenhuma alcança.

A **ausência** de `data-tema` no `<html>` é o estado "sistema", e é significativa: sem atributo, o
`color-scheme: light dark` do `:root` deixa o sistema operacional decidir, inclusive para quem está
sem JavaScript. Nunca escrever `data-tema="sistema"`.

## Profundidade

O sistema tem **um** nível de sombra, e o documento é explícito: *"Don't add drop shadow tiers"*. O
padrão de 80% das superfícies é chapado; o cartão sobre canvas branco é separado por **hairline de
1px**, não por sombra.

| Nível | Tratamento | Uso |
| --- | --- | --- |
| Chapado | Sem sombra, sem borda | O padrão |
| Hairline | 1px `--line` | Cartão, painel, barra de navegação |
| `--sombra-1` | `0 4px 12px` | Único nível, reservado para estado levantado |

## Largura do conteúdo

**A moldura não tem largura máxima; as telas têm** (AD-019). O menu fica encostado na borda
esquerda, com 240px, da altura da janela e preso ao rolar, e o `<main>` ocupa o resto. Cada tela
decide a própria largura.

`--container-conteudo`, **1024px**, continua sendo a largura de leitura de Categorias e da home,
pela `AreaEstreita`, centradas no espaço à direita do menu. Lançamentos e Todo mês também, abaixo de
1536px, cada uma com a própria grade. A partir de 1536px, Lançamentos vira lista densa (AD-020): a
lista com até 1100px e os filtros numa coluna de 288px, presa à direita. Todo mês faz o mesmo
(AD-021): a lista de fixos com até 1100px e o fixo aberto numa coluna de 384px, presa à direita,
que mostra uma dica quando nada está aberto. São colunas ocupando a largura, e não uma linha
esticada.

**Já foram 1440px, e foi erro.** A aposta era que tabela de lançamento lida todo dia quer largura, e
que os "~1200px centered" do `DESIGN.md` valiam só para página de marketing. Na tela real a aposta
não se sustentou: com 1440px a descrição fica numa ponta da linha e o valor na outra, e a cada
lançamento o olho atravessa um vão sem informação. O que cansa quem lê a tabela não é densidade
vertical — é essa varredura horizontal.

**Por isso a largura extra do monitor grande vira coluna, e não linha.** A Visão geral não tem
máximo: no centro ficam os cards e, lado a lado quando cabem, as categorias e os próximos meses; à
direita, a partir de 1280px, a coluna de ação com o cadastro, a busca e os últimos lançamentos.
Nenhuma linha fica mais comprida que antes, e a sobra do monitor passa a ser conteúdo. Os cards
seguem a largura do centro (`@container`), e não a da janela: em 1280px o centro tem 656px, e
quatro cards lado a lado quebravam rótulo e link.

Em 1024px de janela, o menu (240px) e o respiro da `AreaEstreita` deixam os mesmos ~736px úteis que
a navegação de 208px e o vão de 32px deixavam antes. A única prosa da interface (a explicação de
Planejamento × Movimentações) continua limitada em `62ch` por conta própria, então a largura do
contêiner não decide leitura de texto corrido em lugar nenhum.

## Escala do gráfico de composição

A barra empilhada de Fixos, Cartão e Avulsos usa **três passos de uma neutra só**, e não três
matizes. Os blocos têm ordem natural — fixo foi decidido meses atrás, cartão já foi gasto e vai
cair na fatura, avulso foi escolha deste mês — então a pergunta é de grau, não de identidade. Cor
categórica aqui afirmaria uma identidade que os blocos não têm, e o azul gastaria a única cor de
ação em três faixas decorativas. A única escala categórica do sistema é a de categoria, com os
limites de [Cor por categoria](#cor-por-categoria).

`--grafico-trilho` foi usado na primeira versão e estava errado: ele é cor de **trilho**, existe
para ser recessivo, e mede 1,1:1 contra o branco. A maior fatia da barra lia como vazio.

| Passo | Bloco | Claro | Escuro |
| --- | --- | --- | --- |
| 1 | Fixos (mais comprometido) | `#0a0b0d` | `#ffffff` |
| 2 | Cartão | `#4e535c` | `#a8acb3` |
| 3 | Avulsos (mais discricionário) | `#8d939c` | `#646b78` |

**Medidos, não escolhidos no olho.** Cada par vizinho passa de ΔE 15 em visão normal (claro: 22,0;
escuro: 21,7) — abaixo disso duas faixas viram uma mancha para quem enxerga cor. Cada tom passa de
3:1 contra a própria superfície nos dois temas, então nenhum segmento depende do rótulo para ser
visto. E como a escala é de luminosidade, quem não separa matiz continua lendo a ordem.

Mesmo assim **nada depende de distinguir os três tons**: nome, valor e percentual de cada fatia
ficam impressos embaixo da barra, sempre. A cor ordena; o texto identifica.

## Escala de raios

Pílula para tudo que é interativo, 24px para contêiner, círculo para placa de ícone. Canto vivo é
ausente do sistema.

| Token | Valor | Uso |
| --- | --- | --- |
| `--r-xs` | `4px` | Anel de foco |
| `--r-sm` | `8px` | Linha compacta |
| `--r-md` | `12px` | Campo de formulário |
| `--r-lg` | `16px` | Bloco de aviso |
| `--r-xl` | `24px` | Cartão, painel |
| `--r-pill` | `100px` | Todo botão, selo, navegação, seletor de mês |

## Tipografia

**Inter** e **JetBrains Mono**, via `next/font`. São os substitutos abertos que o próprio documento
indica na seção de lacunas para CoinbaseDisplay/CoinbaseSans e CoinbaseMono — nenhum arquivo de marca
deles é distribuído.

Duas decisões carregam o tom, e as duas são contraintuitivas:

1. **Display em peso 400, não 700.** É a escolha mais distintiva do sistema. Engrossar a manchete
   transforma o app em plataforma de trading, que é o oposto do registro institucional calmo. O que
   dá hierarquia é tamanho e espaço, não gordura de traço.
2. **Monoespaçada em toda grandeza numérica**, e não apenas `tabular-nums`. Valor monetário, data,
   percentual e par de parcela vão para a mono. Frase que contém um número — "3 lançamentos" — não
   vai: em mono ela vira etiqueta de terminal.

| Papel | Tamanho | Peso | Tracking |
| --- | --- | --- | --- |
| Título de tela | 28 a 34px | 400 | -2,5% |
| Título de seção | 20px | 600 | -1% |
| Título de bloco | 17px | 600 | normal |
| Corpo | 15 a 16px | 400 | normal |
| Rótulo e selo | 12 a 14px | 600 | normal |
| Valor monetário | 17 a 20px | 500, mono | -1% |

A mono desenha bem mais larga que a sans no mesmo corpo. Os valores dos indicadores desceram de 26px
para 20px por causa disso — e o resultado ficou **mais perto** do documento, que põe grandeza
numérica em 18px, não mais longe.

## Semântica de valor

`--positivo` e `--negativo` são **cor de texto e nunca preenchimento**, por regra explícita do
documento. E nunca andam sozinhas: o rótulo acima diz "Receitas" ou "Despesas", e um `+` ou `−`
repete a informação em forma. Cor sozinha não distingue para quem não separa matiz.

O saldo dos **próximos meses** (seção "Próximos meses" da Visão geral) é o único lugar onde a cor
segue o sinal de um saldo: "Vai sobrar" em `--positivo`, "Vai faltar" em `--negativo`, e o zero sem
cor. A regra continua a mesma: a palavra do rótulo diz o sentido, o valor sai sem sinal e a cor só o
repete. O card "Saldo previsto" não ganha essa cor porque é o cartão de ênfase, invertido (abaixo).
O rótulo do card também não se repete na seção, que aparece em Movimentações, onde o rótulo do eixo
competência não existe (MOV-03).

O que **não** recebe semântica, de propósito:

- **Investimento.** Não é entrada nem saída da casa; é dinheiro que mudou de lugar. Pintá-lo
  afirmaria algo que o app não sabe.
- **"Ainda não pago".** É obrigação pendente, não saída realizada. Pintá-lo de vermelho deixaria três
  dos quatro cartões vermelhos.
- **O cartão de ênfase.** A inversão já é o destaque, e o verde e o vermelho do tema claro foram
  medidos contra o canvas claro, não contra a superfície invertida.
- **A barra do gráfico**, inclusive no estouro de orçamento. Ela tem a cor da categoria, e essa cor
  é identidade, não semântica: não vira vermelha no estouro nem verde abaixo do limite (veja
  [Cor por categoria](#cor-por-categoria)). Preenchimento com semântica continua proibido, e o azul
  de ação continua fora do gráfico. Quem sinaliza o estouro é o par ícone mais texto.

## Cor por categoria

**Esta seção revê uma decisão.** Até a fatia `cor-por-categoria` (AD-018), toda pill, chip e barra
de categoria era da mesma neutra. Este documento recusava "o arco-íris", e o comentário do gráfico
em `globals.css` dizia que "vinte matizes seria o anti-padrão". O argumento era certo para vinte
matizes soltos. O que entrou é outra coisa: uma **paleta fechada de dez**, medida nos dois temas, e
**sempre com o nome impresso ao lado**. A cor serve para reconhecer a categoria de longe e para
ligar a linha da lista à barra do gráfico. Quem identifica continua sendo o nome.

### Onde a cor aparece, e como

| Lugar | Tratamento |
| --- | --- |
| Pill da categoria em "Todo mês", na linha das saídas e no fixo aberto | Fundo tingido, texto em tinta da mesma cor |
| Selos "Receita", "Encerrado" e "Começa em" de "Todo mês" | A neutra (`surface-strong`), nunca a cor da categoria |
| Seletor de categoria da linha, em Lançamentos | Fundo e texto da cor escolhida, com o chevron de sempre |
| Chip de filtro **inativo** | Fundo e texto da cor, sem borda |
| Chip de filtro **ativo** | Continua invertido (`bg-inverso`), como antes |
| Barra de "Gastos por categoria" | O tom médio da cor; o trilho continua neutro |
| "Sem categoria" e "Categoria removida" | A neutra de antes (`surface-strong`, `grafico-barra`) |

A cor de cada categoria é a escolhida na tela de Categorias, ou uma **automática** derivada do
nome normalizado, quando ninguém escolheu. O banco guarda o **nome** do matiz (`verde`,
`verde-agua`…), nunca o hex: o hex mora só nos tokens `--cat-<cor>-{fundo,texto,barra}` de
`globals.css`, e remedir um tom não pede migração. As classes saem de `CLASSES_DA_COR`
(`src/components/cor-de-categoria.ts`), escritas por extenso, porque o Tailwind v4 só gera a classe
que lê no fonte.

### A paleta

| Cor | Fundo claro | Texto claro | Barra clara | Fundo escuro | Texto escuro | Barra escura |
| --- | --- | --- | --- | --- | --- | --- |
| `vermelho` | `#fceae8` | `#ab504b` | `#dc665f` | `#422522` | `#d87972` | `#ac4a45` |
| `laranja` | `#fdeae0` | `#a55725` | `#d56e2c` | `#402719` | `#d17f4f` | `#a65216` |
| `ambar` (âmbar) | `#fbedd5` | `#8e6503` | `#b58101` | `#3a2b11` | `#bc8c30` | `#8a620c` |
| `verde` | `#e1f5e0` | `#357a3a` | `#3f9d48` | `#1f3420` | `#61a764` | `#297831` |
| `verde-agua` (verde-água) | `#d7f7ed` | `#0d7a66` | `#0d9c83` | `#10352c` | `#19aa8e` | `#167763` |
| `ciano` | `#d6f5ff` | `#037690` | `#0697b7` | `#0e333d` | `#08a4c6` | `#0d738b` |
| `azul` | `#e7effc` | `#456bb2` | `#5789e6` | `#212e45` | `#6c94df` | `#3f67b5` |
| `roxo` | `#f1ebfd` | `#7a5da9` | `#9e77dc` | `#312941` | `#a285d6` | `#7859ac` |
| `rosa` | `#fde8f1` | `#a2507a` | `#d2659d` | `#3f2431` | `#cf78a3` | `#a44a78` |
| `marrom` | `#fbecde` | `#866648` | `#aa835f` | `#382b1e` | `#af8e6e` | `#826344` |

O azul daqui é pálido e não é o `--primary`: categoria não é ação, e o azul de ação continua
escasso. Os nomes CSS não têm acento (`ambar`, `verde-agua`), porque são os mesmos que vão para o
banco e para o `CHECK`.

### Medido, não escolhido no olho

Texto contra o próprio fundo tingido, piso de 4,5:1. Barra contra o **trilho** em que ela é
desenhada e contra o canvas, que é o fundo do gráfico, piso de 3:1 nos dois. Nos dois temas. O
teste `src/components/cor-de-categoria.test.ts` lê os hex de `globals.css` e refaz estas contas:
trocar um tom que reprove derruba a suíte.

O trilho do claro é `#eef0f3`, opaco. O do escuro é `rgb(255 255 255 / 0.08)`, e o que a tela
mostra é ele composto sobre o canvas `#0a0b0d`: `rgb(29.6 30.5 32.4)`, que o navegador pinta como
`#1e1f20`. O teste compõe a partir dos dois tokens, sem copiar o resultado.

| Cor | Texto/fundo, claro | Texto/fundo, escuro | Barra/trilho, claro | Barra/trilho, escuro | Barra/canvas, claro | Barra/canvas, escuro |
| --- | --- | --- | --- | --- | --- | --- |
| vermelho | 4,54 | 4,54 | 3,01 | 3,02 | 3,44 | 3,58 |
| laranja | 4,52 | 4,51 | 3,02 | 3,03 | 3,44 | 3,60 |
| âmbar | 4,53 | 4,52 | 3,01 | 3,03 | 3,44 | 3,59 |
| verde | 4,59 | 4,60 | 3,00 | 3,02 | 3,43 | 3,59 |
| verde-água | 4,61 | 4,58 | 3,02 | 3,04 | 3,44 | 3,61 |
| ciano | 4,59 | 4,58 | 3,01 | 3,03 | 3,43 | 3,60 |
| azul | 4,54 | 4,50 | 3,00 | 3,02 | 3,43 | 3,58 |
| roxo | 4,55 | 4,50 | 3,00 | 3,02 | 3,43 | 3,58 |
| rosa | 4,54 | 4,55 | 3,02 | 3,02 | 3,45 | 3,59 |
| marrom | 4,53 | 4,51 | 3,01 | 3,01 | 3,43 | 3,58 |
| **Pior caso** | **4,52** | **4,50** | **3,00** | **3,01** | **3,43** | **3,58** |

Os dois 4,50 do escuro são 4,502 (azul) e 4,503 (roxo), e os três 3,00 do claro são 3,002
(verde e azul) e 3,003 (roxo): passam, sem folga. No escuro, a barra passa também contra o trilho
já arredondado para `#1e1f20`, com 3,001 no pior caso.

**A barra mudou depois da primeira medição.** Os tons da T3 mediam 3,22:1 contra o canvas, mas
cerca de 2,8:1 contra o trilho, e é o trilho que fica encostado na barra. A T13 escureceu as dez
barras do claro e clareou as dez do escuro, só o necessário: mexeu na luminosidade em OKLCH, com o
mesmo matiz e a mesma croma, salvo o arredondamento para hex. Os tons de antes:

| Cor | Barra clara, antes | Barra escura, antes |
| --- | --- | --- |
| vermelho | `#e16a63` | `#a74541` |
| laranja | `#d97230` | `#a24e10` |
| âmbar | `#bb8603` | `#845d00` |
| verde | `#45a24d` | `#24732c` |
| verde-água | `#19a187` | `#0d725f` |
| ciano | `#0a9cbc` | `#046f87` |
| azul | `#5c8eeb` | `#3b63b0` |
| roxo | `#a37ce1` | `#7555a8` |
| rosa | `#d76aa2` | `#9e4573` |
| marrom | `#af8863` | `#7d5e3f` |

Contra o `surface-soft` do hover da linha, a barra mede no mínimo 3,20 no claro e 3,41 no escuro.
**No hover do escuro, o trilho fica abaixo de 3:1**: o branco translúcido passa a ser composto
sobre o `surface-soft`, e a barra mede cerca de 2,8:1 contra ele. Não bloqueia: é um estado de
passagem, só de ponteiro, e o valor e a porcentagem estão impressos na própria linha.

### Os limites

- **Nome sempre ao lado.** Nenhuma cor de categoria aparece sem o nome dela escrito no mesmo
  elemento. Cor nunca carrega informação sozinha.
- **Nome acessível sem a cor.** O leitor de tela continua ouvindo "Categoria Um R$ 300,00 75,00%",
  e não o nome do matiz.
- **Chip ativo invertido.** O estado pressionado é a inversão, como antes. Tingir o ativo faria
  "escolhido" e "da cor verde" competirem pelo mesmo sinal.
- **Estouro por ícone e texto.** A barra de uma categoria acima do limite não muda de cor. A cor é
  identidade; o alerta é o par ícone mais "acima do limite".
- **Nada de pill cheia.** Fundo tingido e texto em tinta. Preenchimento saturado com texto branco
  viraria um selo de alerta, e dez deles numa lista seriam ruído.
- **Paleta fechada.** Sem cor livre: só as dez, cada uma medida. O `CHECK`
  `categoria_cor_valida` recusa qualquer outra no banco.
- **Fora daqui, nada muda.** Os cards de indicadores, a barra de composição e a semântica de
  valor continuam como estão.

### O que o validador de paleta reprovou, e por que não bloqueia

As barras foram passadas pelo validador de paleta categórica da skill `dataviz`
(`validate_palette.py`, contra o canvas de cada tema), e passadas de novo com os tons da T13.
Passaram a faixa de luminosidade e o contraste contra a superfície. Reprovaram três checagens:

| Checagem | Claro | Escuro |
| --- | --- | --- |
| Croma mínima (0,10 em OKLCH) | marrom `#aa835f`, 0,069 | verde-água 0,091, ciano 0,091, marrom 0,06 |
| Separação para quem não distingue cor (ΔE ≥ 8 entre vizinhos) | âmbar e laranja, ΔE 1,6 (deutan) | âmbar e laranja, ΔE 1,2 (deutan) |
| Separação em visão normal (ΔE ≥ 15 entre vizinhos) | laranja e vermelho, ΔE 6,2 | laranja e vermelho, ΔE 5,6 |

**Com dez matizes, isso é esperado, e não bloqueia.** O validador mede uma paleta que precisa
distinguir séries só pela cor, como numa legenda. Aqui ninguém distingue categoria pela cor: o
nome está impresso em toda pill, chip, seletor e barra, que é exatamente a "codificação
secundária" que o próprio validador exige para liberar pares próximos. Vermelho e laranja vizinhos
se confundem; "Categoria Um" e "Categoria Dois" escritos, não. O marrom tem croma baixa de
propósito: é o tom terroso da paleta, e o texto dele continua passando de 4,5:1.

A consequência prática: a cor ajuda a reconhecer uma categoria que a pessoa já conhece, e nunca
deve ser o único jeito de achá-la. Quem propuser legenda de cor, gráfico sem rótulo ou filtro só
por cor esbarra neste limite.

## O que não foi adotado, e por quê

- **Herói escuro de sangria completa com cartões de mockup flutuantes.** É o padrão mais distintivo
  do documento e é de marketing: existe para vender o produto a quem ainda não entrou. Numa tela que
  a pessoa abre todo dia para conferir saldo, seria uma faixa decorativa ocupando a dobra.
- **Ritmo editorial de 96px entre seções.** O documento diz, ele mesmo, que "density lives behind
  login walls, not on marketing". Este app é inteiro atrás do login.
- **Amarelo `#F4B000`.** O documento o declara ilustrativo, restrito a glifo de ativo. Não há glifo
  de ativo aqui.
- **Verde e vermelho como preenchimento.** Proibido pelo próprio documento.

## O que a reestilização não pode quebrar

Os testes prendem **semântica, não CSS** — nenhum seletor depende de classe. Precisam sobreviver:

- `role="region"` com os nomes `Total de Gastos`, `Saídas`, `Fixos`, `Cartão de Crédito`,
  `Gastos do Mês`, `Entradas e investimentos`, `Previsão das parcelas`
- `role="navigation"` com o nome `Navegação entre meses`
- `aria-labelledby="eixo-competencia"` e `aria-labelledby="eixo-caixa"`
- `role="status"`, `role="alert"`, `role="radio"`
- Rótulos de formulário, nomes de botão e de link, e o texto visível hoje asserido
- Ausência de `overflow-x: hidden` de página: esconder a barra faria a medição de 400px passar sem
  significar nada. O `overflow-x: clip` do invólucro de transição é outra coisa — ele recorta o
  `transform` de uma animação, não conteúdo.
