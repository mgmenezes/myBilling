# Posicionamento do myBilling

Documento de referência para toda peça de divulgação: página, post, e-mail, conversa. Quem
escrever qualquer texto sobre o produto parte daqui, e não do que lembra do app. Quando este
documento e uma peça discordarem, a peça está errada.

Fonte das garantias: `.specs/STATE.md` (decisões AD-001 a AD-022) e as specs em `.specs/features/`.
Fonte do que **não** existe: `docs/roadmap.md`. Spec desta fatia:
`.specs/features/campanha-lista-de-espera/spec.md` (CAMP-01).

## O produto em uma frase

**A planilha sabe o que você digitou. O myBilling sabe o que vem.**

É um app web em que duas pessoas que dividem as despesas cadastram cada coisa uma vez só, e o app
faz o resto: espalha as parcelas pelos meses, repete as contas fixas, diz quanto vai sobrar em cada
um dos próximos meses, separa o que já saiu do que ainda vai sair, e não deixa somar a mesma coisa
duas vezes.

A frase anterior, "As contas da casa, para dois, sem o mês fechar errado", continua verdadeira e
pode aparecer como apoio. Deixou de ser a manchete em 2026-11-01 (seção "A tese").

## Para quem

Casais que dividem as contas da casa. Casal aqui é qualquer dupla com caixa em comum: cônjuges,
namorados morando juntos, irmãos dividindo apartamento. O produto não pergunta a relação; pergunta
quem gastou.

A pessoa chega em um de três estados, e a peça precisa saber com qual está falando.

| Estado | A dor, em uma frase | A ponte para o produto, em uma frase |
| --- | --- | --- |
| **Planilha** | Toda compra parcelada tem que ser redigitada em cada aba futura, e a que você esquece corrompe o saldo que você usa para decidir se pode gastar. | Cadastre a compra uma vez; as parcelas aparecem sozinhas nos meses certos, e a sua planilha antiga entra por importação. |
| **Caderno** | O caderno sabe o que você anotou, mas não sabe o que ainda vai cair: em fevereiro ele não lembra da parcela de dezembro. | O app lembra por você: todo mês já nasce com o que foi decidido antes, e cada linha diz de onde veio. |
| **Nada** | O mês acaba e ninguém sabe para onde o dinheiro foi, então a conversa vira briga em vez de conta. | Comece com três coisas: o salário, as contas fixas e o cartão. O resto o app vai perguntando quando acontecer. |

## A tese

**O app sabe o que vem.**

A planilha sabe o que você digitou. O caderno sabe o que você anotou. O aplicativo do banco sabe o
saldo de hoje. Nenhum deles sabe quanto vai sobrar em abril, porque nenhum deles tem as parcelas e as
contas fixas de abril. O myBilling tem: cada mês seguinte já nasce com o que foi decidido antes, e a
Visão geral diz quanto vai sobrar ou faltar nos próximos meses.

A cena que vende é a pessoa decidindo se dá para comprar. Hoje ela decide pelo saldo de hoje, e o
saldo de hoje não sabe das parcelas que vêm. É essa pergunta que toda peça abre.

**A garantia antiga vira apoio.** "A planilha e o caderno deixam você errar; o myBilling não deixa"
continua verdadeira: a parcela nunca é esquecida, a fatura nunca conta duas vezes, o ano nunca vira
errado. Ela é o motivo pelo qual a resposta sobre o futuro é confiável. Mas ninguém vê um erro que
não aconteceu, então ela não abre a peça; ela sustenta a peça.

Não vendemos "mais bonito" nem "automático". O que vendemos tem decisão de engenharia por trás e
teste que a protege (AD-002, AD-003, AD-004, AD-023), e é verificável no código.

O que **não** é a tese: não somos contra planilha. A planilha é flexível, custa zero e abre em
qualquer lugar. A peça admite isso em voz alta, porque é verdade e porque admitir compra
credibilidade para o resto.

## As seis cenas, e o que o app garante

Estas são as seis cenas que toda peça pode usar. A primeira é a que abre. Cada garantia aponta para
a decisão ou spec que a sustenta. Garantia sem fonte aqui não existe no produto.

| Cena (como a pessoa vive) | Garantia (o que o app faz) | Onde está provado |
| --- | --- | --- |
| Você quer saber se dá para comprar em dez vezes. Olha o saldo de hoje e decide. Mas as parcelas e as contas fixas dos próximos meses já estão decididas, e o saldo de hoje não sabe disso. | Cada mês seguinte já nasce com o que foi decidido antes: as parcelas, as contas fixas, o salário. A Visão geral diz quanto vai sobrar ou faltar em cada um dos próximos meses. Não dizer quantos meses: o número muda com o horizonte (AD-023). | `saldo-futuro/spec.md` (SALDO-03), `recorrencias/spec.md` (FIXO-01), AD-002, AD-023 |
| Você comprou em dez vezes e precisa lembrar de anotar a parcela nos próximos nove meses. Esqueceu uma, o saldo mente. | A compra é cadastrada uma vez. As parcelas vão para os meses certos sozinhas, inclusive quando o ano vira. Se a compra já estava no meio (parcela 8 de 10), entra do ponto em que está, sem inventar meses passados. | AD-002, AD-004, AD-005; `mvp-gestao-financeira/spec.md` |
| Você anotou a compra no cartão e, quando a fatura veio, anotou o pagamento também. Agora o gasto do mês está dobrado. | Pagamento de fatura e compra no cartão vivem em lugares separados que não se somam. A dupla contagem não é improvável: é impossível de escrever no sistema. | AD-003 |
| Você mistura o que já pagou com o que ainda vai pagar e nunca sabe se o número da tela é o que falta ou o que gastou. | Dois eixos, nunca juntos na mesma tela: **Planejamento** (o que o mês comprometeu) e **Movimentações** (o que de fato saiu). Um alternador troca entre eles. | MOV-03 em `painel-e-lancamentos/spec.md`; AD-017 |
| A conta de luz muda todo mês. Você chuta um valor, e quando a conta chega não tem onde corrigir sem apagar o que estava. | A conta fixa é cadastrada uma vez com um valor previsto. Quando a conta chega, você confirma o valor real, e a previsão continua visível ao lado. Reajustou? Vale a partir de um mês, sem reescrever o passado. | `recorrencias/spec.md` (FIXO-01 a 06) |
| São duas pessoas gastando e um saldo só. Cada um tem uma versão do mês na cabeça. | Um caixa, um saldo, e cada lançamento diz quem gastou. As duas pessoas entram com a própria conta Google e veem o mesmo número. | AD-007 |

Outras garantias que podem aparecer como apoio, nunca como manchete:

- Dinheiro é guardado em centavos inteiros: nenhum arredondamento silencioso (AD-001).
- Categoria criada uma vez vale para todo mês, sem copiar nada (`lancamento-avulso/spec.md`).
- Importação da planilha antiga, aba por aba, conferindo contra os totais da própria planilha e sem
  duplicar o que se repete entre abas (`importar-planilha/spec.md`).
- Tema claro e escuro; funciona no celular pelo navegador.
- Histórico nunca é alterado em silêncio: o que o app não sabe, ele não finge saber (AD-005).

## O que nunca prometer

Nada desta lista existe hoje. Alguns itens estão no roadmap; outros foram descartados. Prometer
qualquer um deles é mentir. Dizer que o app **não** faz ("não sincroniza com banco") é permitido e
às vezes é a frase mais honesta da peça.

| Nunca dizer | Por quê |
| --- | --- |
| Sincronização bancária, Open Finance, "importa do seu banco" | Não existe e não está planejado. É o produto do Mobills e do Organizze, não o nosso. |
| App nativo, "baixe na loja", notificação no celular | É web responsivo. Notificações estão fora do MVP. |
| Orçamento por categoria, "defina um limite e seja avisado" | A regra existe no domínio, mas não tem tela nem chamador. Roadmap. |
| Área de cartões, controle de fatura, "veja quanto vai vir na fatura" | `pagamento_fatura` não tem tela. Roadmap, fatia 1. |
| Editar uma compra ou um gasto avulso depois de cadastrado | Só gasto fixo e entrada fixa têm edição. O resto é rascunho em `editar-lancamentos/context.md`. |
| "Os dois editam ao mesmo tempo sem conflito" | A última gravação vale (`editar-fixos/spec.md`). Não há proteção contra edição simultânea. |
| Preço, "grátis", "sem mensalidade", plano | Não há preço definido. A rodada é lista de espera. |
| "Disponível agora", "crie sua conta" | O acesso é por lista de e-mails. A página convida para a lista de espera, e só. |
| Comparação mês a mês, gráficos de evolução | Roadmap. |
| Acerto de contas entre as duas pessoas ("quem deve a quem") | Fora do MVP, por decisão. |
| O simulador "Dá pra comprar?" como coisa que existe ("simule", "veja antes de passar o cartão", "o app responde") | Está sendo construído (fatia `simular`). Só pode aparecer como "o que vem a seguir", nas palavras da seção abaixo. |
| "Em qual fatura cai cada parcela" | Depende da fatia de Faturas, que vem depois do simulador. |
| Quantos meses à frente o app enxerga, em número ("três meses", "doze meses") | O número muda com o horizonte (AD-023) e a peça ficaria velha. Dizer "os próximos meses". |

Também proibido, em qualquer peça: qualquer valor em reais, nome, descrição ou captura de tela que
venha do uso real da família (AD-009). Capturas vêm do seed (`pnpm db:seed`), que usa "Pessoa A",
"Cartão Roxo", "Compra parcelada A". Valores em texto só os de fixture da spec do MVP: R$ 1.000,00
em 3x virando R$ 333,34, R$ 333,33 e R$ 333,33.

## O que vem a seguir

Exceção explícita à regra acima, decidida pelo dono em 2026-11-01: a landing e os posts podem citar o
simulador **"Dá pra comprar?"** como a próxima coisa que a lista de espera vai receber. Só assim:

- Dizer que **ainda não existe** e que **é o que estamos fazendo**. Nunca "já", "disponível",
  "simule agora".
- Dizer o que ele vai fazer em até duas frases: a pessoa informa o valor e o número de parcelas, e o
  app mostra quanto sobra em cada mês antes de ela passar o cartão; se não cabe, diz em quantas vezes
  caberia.
- Dizer que quem está na lista de espera recebe primeiro.
- Nenhuma data e nenhum prazo. "Em breve" fica só no botão da lista, que é outro assunto.

## Números de mercado

Use no máximo três por peça, sempre com fonte e ano na mesma frase. São matérias que repercutem
pesquisas, não os relatórios originais: antes de uma peça paga, conferir o relatório.

| Número | Fonte e ano | Para que serve |
| --- | --- | --- |
| 45% dos casais apontam o dinheiro como o centro dos conflitos da relação | Serasa, 2026 (via Band, 12/06/2026) | Abrir a conversa sobre "para dois" |
| Entre quem compra parcelado, 52% não controlam as parcelas; dos que controlam, 22% usam caderno, 15% planilha e 11% aplicativo | CNDL e SPC Brasil com Offerwise, janeiro de 2025 (via Monitor Mercantil, 26/03/2025) | Mostrar que a planilha não é a maioria e que o caderno existe |
| 58% dos casais dizem ter alguma organização financeira em conjunto | Serasa com Opinion Box, 1.120 entrevistados (via Fast Company Brasil, 12/06/2025) | Dizer que quatro em dez não têm nada, sem culpar |

Descartado: o levantamento SPC/CNDL de 2017 (39% brigam por dinheiro). Tem quase dez anos.

## Concorrência, em uma linha cada

- **Mobills, Organizze**: freemium, foco no indivíduo, vendem sincronização bancária e gráfico.
  Compartilhar com outra pessoa é recurso secundário. Não falam de parcela nem de dupla contagem.
- **Planilha do Google**: flexível, de graça, em qualquer dispositivo. Exige digitar o mesmo dado em
  vários lugares, e cada digitação é uma chance de erro.
- **Caderno**: imediato e sem tela. Não sabe o futuro.

Onde ninguém está: **para dois, com aritmética que não deixa errar.**

## Tom de voz

Regras que dá para conferir, não adjetivos.

1. Nenhum ponto de exclamação.
2. Nenhum emoji.
3. Português de casa: "conta de luz", "a fatura veio", "quem gastou". Nunca "gestão", "otimizar",
   "solução", "experiência".
4. Frases curtas, uma ideia por frase. Se precisar de "e" duas vezes, são duas frases.
5. Cena antes de garantia: primeiro a situação que a pessoa reconhece, depois o que o app faz.
6. Número sempre com fonte e ano na mesma frase.
7. Admitir o que a planilha faz melhor quando o assunto for comparação.
8. Dizer o que o produto é hoje: feito por um casal para o próprio uso, abrindo para mais casas.
9. Nunca a segunda pessoa do plural artificial ("vocês dois podem..."). Falar com uma pessoa, que
   vai mostrar para a outra.
10. Botão diz o que acontece: "Entrar na lista de espera". Nunca "Saiba mais", "Começar agora".

## Chamada para ação

Uma só, repetida no topo e no fim: **Entrar na lista de espera.** Abre o formulário do Google, que
pede e-mail e uma pergunta: "Como você controla as contas da casa hoje?" (planilha, caderno, nada,
outro app). A resposta diz para qual estado da persona escrever depois.
