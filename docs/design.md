# Identidade visual do myBilling

Derivada do sistema em `DESIGN-mastercard.md`, **sem usar a marca Mastercard**. O documento descreve
uma linguagem visual; o logo vermelho-e-amarelo é ativo de marca deles e não entra aqui. O que foi
adotado: canvas quente, escala de raios extremos, formas pill, tipografia geométrica com tracking
negativo e peso 450 no corpo.

## Design read

Redesign de **product UI**, não de landing page. A skill `design-taste-frontend` declara no capítulo 13
que não cobre "dense product UI"; foram aplicadas as partes de cor, forma, tipografia, estados e
acessibilidade, e **ignoradas** as de landing (disciplina de hero, contagem de eyebrow, marquee, logo
wall). Aplicá-las produziria uma página de marketing em vez de um app de uso diário.

Diais: `DESIGN_VARIANCE 5` · `MOTION_INTENSITY 3` · `VISUAL_DENSITY 5`.

A variância fica em 5 e não em 8 porque o conteúdo é tabular e lido todo dia no celular: assimetria
aqui custa escaneabilidade sem devolver nada. A motion fica em 3 porque não há biblioteca de animação
no projeto e a skill é explícita — "se você não consegue entregar motion funcionando no escopo
disponível, baixe o dial para 3 e entregue uma página estática limpa". Transição de CSS em `:hover` e
`:active` cobre o que este app precisa.

## Sobre a regra de paleta da skill

A skill bane creme + laranja-terra como **escolha padrão** para briefings premium-consumer, por ser o
reflexo automático de LLM. A exceção prevista é o briefing nomear as cores, e é o caso: `#F3F0EE`,
`#CF4500` e `#F37338` vêm escritos no documento fornecido. Não é reflexo, é requisito.

## Tokens

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--canvas` | `#F3F0EE` | `#141413` | Fundo da página. **Nunca branco puro** |
| `--surface` | `#FCFBFA` | `#1E1E1C` | Cartões elevados |
| `--surface-strong` | `#FFFFFF` | `#262624` | Nav flutuante, campos de formulário |
| `--ink` | `#141413` | `#F3F0EE` | Texto principal e CTA primário |
| `--ink-muted` | `#5C5A57` | `#A8A49E` | Texto secundário |
| `--accent` | `#CF4500` | `#FF8A4C` | Sinal de atenção |
| `--line` | `rgba(20,20,19,.12)` | `rgba(243,240,238,.14)` | Divisores |

### Contraste medido, não presumido

| Par | Razão | Veredito |
| --- | --- | --- |
| ink sobre canvas (claro e escuro) | 16.25 | AA e AAA |
| ink-muted sobre canvas, claro | 6.06 | AA |
| ink-muted sobre canvas, escuro | 7.43 | AA |
| branco sobre acento | 4.66 | AA |
| **acento sobre canvas, claro** | **4.11** | **reprova em corpo** |

**Restrição que sai daí:** `--accent` no tema claro não pode ser cor de parágrafo. Serve para
preenchimento, borda, e rótulo a partir de 18px. Texto pequeno em laranja sobre creme é ilegível para
parte das pessoas e passaria despercebido numa revisão visual.

## Escala de raios

A skill exige um sistema único e documentado. O do briefing pula a faixa de 8 a 16px de propósito.

| Token | Valor | Uso |
| --- | --- | --- |
| `--r-chip` | `999px` | Chips, selos, nav, seletor de mês |
| `--r-cta` | `20px` | Botões |
| `--r-card` | `24px` | Cartões compactos |
| `--r-panel` | `40px` | Painéis grandes |

Nada no app usa raio entre 1 e 19px fora dessa tabela.

## Tipografia

**Sofia Sans**, via `next/font`. O próprio documento a indica como o substituto aberto mais próximo do
MarkForMC, e ela já consta na pilha de fallback declarada pela Mastercard. Variável de 1 a 1000, então
o peso 450 do corpo existe de verdade em vez de ser arredondado para 400.

Hoje o app renderiza em **Arial**: `globals.css` sobrescreve o `body` e as variáveis do Geist nunca
chegam a ser usadas. É scaffold do Next que ninguém tocou.

| Papel | Tamanho | Peso | Tracking |
| --- | --- | --- | --- |
| Título de tela | 32 a 40px | 500 | -2% |
| Título de seção | 20 a 24px | 500 | -2% |
| Corpo | 16px | 450 | normal |
| Rótulo e chip | 13 a 14px | 500 | normal |
| Valor monetário | tabular-nums | 500 | normal |

## O que não foi adotado, e por quê

- **Retratos circulares com satélite e arcos orbitais.** São para cartões de serviço de marketing.
  Numa lista de lançamentos seriam decoração sem conteúdo por baixo.
- **Headline fantasma creme-sobre-creme.** Bonita numa página institucional, ruído numa tela que a
  pessoa abre todo dia para conferir saldo.
- **Laranja restrito a consentimento.** Essa regra existe porque a Mastercard tem fluxo de consentimento
  e precisa reservar a cor. O myBilling não tem, então o laranja fica livre como acento único.

## O que a reestilização não pode quebrar

Os testes prendem **semântica, não CSS** — nenhum seletor depende de classe. Precisam sobreviver:

- `role="region"` com os nomes `Total de Gastos`, `Saídas`, `Fixos`, `Cartão de Crédito`,
  `Gastos do Mês`, `Entradas e investimentos`, `Previsão das parcelas`
- `role="navigation"` com o nome `Navegação entre meses`
- `aria-labelledby="eixo-competencia"` e `aria-labelledby="eixo-caixa"`
- `role="status"`, `role="alert"`, `role="radio"`
- Rótulos de formulário, nomes de botão e de link, e o texto visível hoje asserido
- Ausência de `overflow-x: hidden`: esconder a barra faria a medição de 400px passar sem significar nada
