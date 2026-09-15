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

`--container-conteudo`, **1024px**. Ele vale para o cabeçalho e para o miolo ao mesmo tempo, num
token só: se os dois escolherem a sua largura, a pílula de navegação deixa de alinhar com o conteúdo
embaixo dela — desalinhamento de poucos pixels é do tipo que ninguém consegue nomear mas todo mundo
sente.

**Já foram 1440px, e foi erro.** A aposta era que tabela de lançamento lida todo dia quer largura, e
que os "~1200px centered" do `DESIGN.md` valiam só para página de marketing. Na tela real a aposta
não se sustentou: com 1440px a descrição fica numa ponta da linha e o valor na outra, e a cada
lançamento o olho atravessa um vão sem informação. O que cansa quem lê a tabela não é densidade
vertical — é essa varredura horizontal.

1024px encurta o percurso sem apertar nenhuma das seis colunas: descontando a navegação lateral
(208px) e o vão entre as duas (32px), sobram ~784px de tabela. A única prosa da interface (a
explicação de Planejamento × Movimentações) continua limitada em `62ch` por conta própria, então a
largura do contêiner não decide leitura de texto corrido em lugar nenhum.

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

O que **não** recebe semântica, de propósito:

- **Investimento.** Não é entrada nem saída da casa; é dinheiro que mudou de lugar. Pintá-lo
  afirmaria algo que o app não sabe.
- **"Ainda não pago".** É obrigação pendente, não saída realizada. Pintá-lo de vermelho deixaria três
  dos quatro cartões vermelhos.
- **O cartão de ênfase.** A inversão já é o destaque, e o verde e o vermelho do tema claro foram
  medidos contra o canvas claro, não contra a superfície invertida.
- **A barra do gráfico**, inclusive no estouro de orçamento. Preenchimento com semântica é proibido
  pelo sistema, e o azul gastaria a cor de ação em quatro barras seguidas. Quem sinaliza o estouro é
  o par ícone mais texto.

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
