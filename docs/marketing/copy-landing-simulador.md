# Copy da landing para o lançamento do simulador

Copy completa da landing do myBilling para o momento em que o simulador "Dá pra comprar?" existir
(fatia `landing-simulador` do plano aprovado em 2026-11-01). Segue `posicionamento.md`; onde este
documento pede uma mudança no posicionamento ou numa spec, a mudança está marcada e é decisão do
dono.

Respostas do dono que mandam neste documento (2026-11-01):

- A copy é para o lançamento do simulador, não para a página de hoje.
- Ela vive aqui, em `docs/marketing`, e só vai para `site/index.html` na fatia `landing-simulador`.
- A história "feito por um casal para o próprio uso" **não** é usada como prova. A prova é o
  produto: o simulador rodando na página, com a mesma conta do app.
- A medição das hipóteses de teste fica no formulário da lista de espera. Nenhum rastreador.

Marcações usadas no texto:

- **[só com o simulador]**: a frase afirma que o simulador existe. Fica fora do ar até a fatia
  `simular` passar no Verifier e entrar na `main`.
- **(decisão do autor)**: escolha minha, que pode ser revista sem reabrir a conversa.
- **(decisão do dono)**: ponto em que a copy diverge do posicionamento ou de uma spec e precisa de
  uma palavra do dono antes de ir ao ar.

---

## Parte A: diagnóstico estratégico

### O produto

Um app web em que duas pessoas que dividem as contas da casa cadastram cada coisa uma vez só. O app
espalha as parcelas pelos meses, repete as contas fixas, separa o que já saiu do que ainda vai sair
e diz quanto vai sobrar em cada um dos próximos meses. Com o simulador, ele passa a responder a
pergunta que a pessoa faz na loja: dá pra comprar isso em dez vezes?

### O público e o que ele sabe

Casais que dividem as contas, em três estados: planilha, caderno e nada. Entre quem compra
parcelado, 52% não controlam as parcelas; dos que controlam, 22% usam caderno, 15% planilha e 11%
aplicativo (CNDL e SPC Brasil, 2025). A planilha é o antagonista que todo mundo entende, mas não é a
maioria.

Nível de consciência: a pessoa **sabe do problema** (a fatura surpreende, o mês fecha errado, a
conversa vira briga) e **não sabe que existe uma solução deste tipo**. Ela conhece aplicativos de
finanças como o Mobills e o Organizze, que mostram o passado e o saldo de hoje. Nunca viu uma
ferramenta que mostre o saldo de abril. A copy, portanto, não pode presumir que "simulador" signifique
algo. Ela precisa mostrar.

### A dor

Prática: toda decisão de compra é tomada pelo saldo de hoje, e o saldo de hoje não sabe das parcelas
e das contas fixas dos próximos meses. A parcela esquecida, a fatura contada duas vezes e o ano que
vira errado corrompem exatamente o número que a pessoa usa para decidir.

Emocional: a surpresa da fatura, a sensação de ter se enganado com o próprio controle, e a conversa
em casa que começa por "de onde você tirou esse número". 45% dos casais apontam o dinheiro como o
centro dos conflitos da relação (Serasa, 2026).

### A transformação

Antes: decide no escuro, com o saldo de hoje, e descobre o erro quando a fatura chega.
Depois: digita o valor e em quantas vezes, vê o que sobra em cada mês, e decide com o ano inteiro na
mão. As duas pessoas veem o mesmo número.

### O posicionamento

**A planilha sabe o que você digitou. O myBilling sabe o que vem.** Para dois, com uma aritmética que
não deixa errar. Onde ninguém está: os aplicativos olham para uma pessoa e vendem o extrato do banco;
a planilha e o caderno não sabem o futuro.

### O argumento central de venda

Antes de passar o cartão, veja quanto vai sobrar em cada um dos próximos meses. A conta é a mesma que
o app faz, e você testa na própria página, sem login. Essa é a frase que a página inteira sustenta.

### A oferta e a ação

Não há preço nem cadastro aberto. A conversão é **um e-mail na lista de espera**, pelo formulário do
Google, com uma pergunta: "Como você controla as contas da casa hoje?". O que a pessoa ganha ao entrar:
receber o simulador primeiro e saber do preço antes de ele existir.

### Prova disponível hoje

1. O simulador funcionando na página, sobre uma casa inventada, com a conta do app **[só com o simulador]**.
2. O rateio igual ao da fatura: R$ 1.000,00 em 3x vira 333,34, 333,33 e 333,33.
3. Capturas do app com dados de demonstração.
4. Três números de mercado com fonte e ano.
5. Garantias por construção: compra e fatura não se somam; o mês é contado em inteiros.

O que **não** existe e a página não finge ter: depoimentos, número de pessoas na lista, estudo de caso.
A Parte C diz o que obter.

---

## Parte B: copy completa da landing

Ordem das seções (decisão do autor; muda CAMP-02 AC 1 e VEM-02 AC 7, decisão do dono):

1. Hero
2. Dá pra comprar? (simulador) **[só com o simulador]**
3. Onde as contas da casa quebram
4. Caderno, planilha ou myBilling
5. Para dois
6. Traga a sua planilha ou comece do zero
7. O que os números dizem
8. Perguntas frequentes
9. O que vem a seguir
10. Rodapé com a chamada

### Seção 1: hero

**Três headlines, a estratégia de cada uma e a recomendação.**

| | Headline | Estratégia |
| --- | --- | --- |
| H1 | A planilha sabe o que você digitou. O myBilling sabe o que vem. | Contraste com o antagonista que todo mundo conhece. Posiciona em uma frase e vale para os três estados. Escolhida pelo dono em 2026-11-01. |
| H2 | Dá pra comprar em dez vezes? Veja quanto vai sobrar em cada mês antes de passar o cartão. | Resposta direta: abre pela pergunta que a pessoa faz e entrega o benefício na mesma frase. A mais específica das três. Só faz sentido com o simulador no ar. |
| H3 | Antes de parcelar, veja o que sobra em cada um dos próximos meses. | Benefício em imperativo, sem antagonista. Mais curta, menos memorável. |

**Recomendação:** manter a H1 como `<h1>`, porque é a frase que o dono escolheu e a que mais
diferencia, e levar a pergunta para o subtítulo, como o plano manda. A H2 é a primeira hipótese de
teste da Parte D: se a página for medida, é a variante com mais chance de ganhar da H1, porque é
concreta onde a H1 é inteligente.

**Headline**
A planilha sabe o que você digitou. O myBilling sabe o que vem.

**Subtítulo** **[só com o simulador]**
Digite o valor e em quantas vezes. O myBilling mostra quanto vai sobrar em cada um dos próximos
meses, antes de você passar o cartão, porque as parcelas e as contas fixas desses meses já estão
nele. Para dois, sem o mês fechar errado.

Subtítulo enquanto o simulador não existe (o de hoje, sem mudança): "Cadastre a compra parcelada e as
contas fixas uma vez. Cada mês seguinte já nasce com elas, e a Visão geral diz quanto vai sobrar em
cada um. Para dois, sem o mês fechar errado."

**Botão principal**
Entrar na lista de espera

**Microcopy sob o botão**
Pede o e-mail e uma pergunta: como você controla as contas hoje. Nada mais.

**Botão secundário** **[só com o simulador]**
Testar o simulador (rola até a seção "Dá pra comprar?")

Enquanto o simulador não existe: "Ver onde a planilha quebra", como hoje.

**Legenda da imagem**
A Visão geral do mês. Dados de demonstração, gerados pelo app.

### Seção 2: Dá pra comprar? **[só com o simulador]**

Esta seção é a prova da página. Ela vem logo depois do hero porque a pessoa precisa ver o app
responder antes de ler por que a resposta é confiável.

**Título**
Dá pra comprar?

**Introdução**
Esta é uma casa inventada: as entradas, as contas fixas e as compras parceladas dos próximos meses já
estão lançadas, como estariam no app. Experimente uma compra. A conta é a mesma que o app faz com as
suas.

**Campos**
- Valor da compra
- Em quantas vezes
- Primeira parcela em (mês, com o mês aberto como padrão)

**Resposta, quando cabe**
Cabe. Nenhum dos meses fica no vermelho.

**Resposta, quando não cabe**
Em {n}x, {meses} ficam no vermelho. Em {m}x cabe.

**Resposta, quando não cabe em número nenhum de parcelas**
Não cabe em número nenhum de parcelas dentro do que o app enxerga.

**Linha de um mês que já estava negativo antes da compra**
Já estava no vermelho antes desta compra.

**Tabela, uma linha por mês**
Mês | Parcela | Vai sobrar antes | Vai sobrar depois

**Rodapé da seção**
Dados inventados. No app, a resposta usa as suas parcelas e as suas contas fixas, e um clique lança
a compra.

**Chamada depois do veredito** (decisão do autor)
Quer essa resposta com as suas contas? Entrar na lista de espera

**Sem JavaScript**
A seção mostra o exemplo pronto: uma compra de R$ 1.000,00 em três vezes, com as parcelas de
333,34, 333,33 e 333,33 e o veredito, e a frase "Ligue o JavaScript para experimentar outra compra."

### Seção 3: Onde as contas da casa quebram

**Título**
Onde as contas da casa quebram

**Subtítulo**
Seis situações que todo casal reconhece. Em cada uma, o que a planilha e o caderno não sabem, e o
que o myBilling sabe.

**Bloco 1: Dá pra comprar?**
Você quer parcelar em dez vezes. Olha o saldo de hoje e decide. Mas as parcelas e as contas fixas dos
próximos meses já estão decididas, e o saldo de hoje não sabe disso.
No myBilling cada mês seguinte já nasce com o que foi decidido antes: as parcelas, as contas fixas, o
salário. A Visão geral diz quanto vai sobrar ou faltar em cada um dos próximos meses.

**Bloco 2: A parcela que você esqueceu**
Você comprou em dez vezes e precisa lembrar de anotar a parcela nos próximos nove meses. A que você
esquece some do saldo, e o saldo é o número que decide se dá para gastar.
No myBilling a compra é cadastrada uma vez. As parcelas vão para os meses certos sozinhas. Uma compra
de R$ 1.000,00 em três vezes vira 333,34, 333,33 e 333,33, como na fatura.

**Bloco 3: A fatura contada duas vezes**
Você anotou a compra no cartão. Quando a fatura veio, anotou o pagamento também. O gasto do mês está
dobrado e ninguém percebeu.
No myBilling compra no cartão e pagamento da fatura vivem em lugares separados que não se somam. A
dupla contagem não é improvável. É impossível.

**Bloco 4: O ano que vira errado**
A compra de novembro em seis vezes termina em abril do ano que vem. Na planilha, a aba de janeiro é
outra aba, outro ano, e a parcela cai no lugar errado.
No myBilling o mês é contado em inteiros, sem data que vira errado. Dezembro para janeiro é só mais
um mês.

**Bloco 5: A conta de luz que muda**
Toda conta fixa tem um valor previsto, e a de luz nunca é igual. Você chuta, e quando a conta chega
não tem onde corrigir sem apagar o que estava.
No myBilling a conta fixa é cadastrada uma vez com um valor previsto. Quando a conta chega, você
confirma o valor real, e a previsão continua visível ao lado. Reajustou? Vale a partir de um mês, sem
reescrever o passado.

**Bloco 6: Duas pessoas, duas versões do mês**
São duas pessoas gastando e um saldo só. Cada uma tem uma versão do mês na cabeça, e a conversa vira
briga antes de virar conta.
No myBilling há um caixa, um saldo, e cada lançamento diz quem gastou. As duas pessoas entram com a
própria conta Google e veem o mesmo número.

**Legenda da imagem**
Os lançamentos do mês, em blocos. Dados de demonstração, gerados pelo app.

### Seção 4: benefícios, de recurso a impacto

Esta tabela não vai para a página como tabela. Ela é a fonte das frases das seções 3, 5 e 8, e a
régua para conferir que cada recurso virou um benefício que a pessoa sente.

| Recurso | Benefício prático | Impacto na rotina |
| --- | --- | --- |
| Simulador "Dá pra comprar?" **[só com o simulador]** | Vê quanto sobra em cada mês antes de passar o cartão; se não cabe, sabe em quantas vezes caberia | Decide na loja, pelo celular, sem conta de cabeça e sem ligar para a outra pessoa para perguntar o saldo |
| Cada mês seguinte já nasce com as parcelas e as contas fixas | Nunca copia parcela de aba em aba | O saldo que você usa para decidir é verdadeiro, e não o que você lembrou de digitar |
| Compra e pagamento da fatura em lugares que não se somam | O gasto do mês nunca dobra | O mês fecha com o número certo sem ninguém precisar conferir |
| Conta fixa com valor previsto e valor real | A conta de luz muda sem apagar a previsão | No fim do ano dá para saber quanto errou e por quanto |
| Mês contado em inteiros | Dezembro para janeiro é só mais um mês | Nenhuma parcela cai no lugar errado na virada do ano |
| Um caixa, cada lançamento com dono | As duas pessoas veem o mesmo número, no mesmo instante | A conversa sobre dinheiro começa pela conta, não pela briga |
| Importação da planilha, aba por aba | O que você digitou por anos vira histórico | Começa sem recomeçar |
| Dinheiro guardado em centavos inteiros | Nenhum arredondamento silencioso | A soma da tela é a soma da fatura |

### Seção 5: Caderno, planilha ou myBilling

**Título**
Caderno, planilha ou myBilling

**Subtítulo**
Uma comparação honesta, com as linhas em que a planilha ganha.

| Situação | Caderno | Planilha | myBilling |
| --- | --- | --- | --- |
| **Onde o mês fecha errado** | | | |
| Dá pra comprar em dez vezes? **[só com o simulador]** | Conta de cabeça | Conta de cabeça, com a aba aberta | Digita o valor e vê cada mês |
| Quanto vai sobrar nos próximos meses | Não sabe | Só se você copiar tudo antes | Está na tela, mês a mês |
| Compra em dez vezes | Você anota nove vezes | Você copia em nove abas | Cadastra uma vez |
| Compra no cartão e pagamento da fatura | Depende de você lembrar | Depende de você lembrar | Não se somam, por construção |
| Dezembro para janeiro | Caderno novo | Aba nova, ano novo, erro novo | Só mais um mês |
| Conta fixa que muda de valor | Rabisca por cima | Apaga a previsão | Confirma o real, guarda a previsão |
| Duas pessoas, um saldo | Um caderno só, uma letra só | Funciona, se os dois abrirem | Cada lançamento diz quem gastou |
| **Onde o caderno e a planilha ganham** | | | |
| Anotar qualquer coisa, do jeito que quiser | Total | Total | Só o que o app conhece |
| Custo | Um caderno | Nenhum | Ainda não definido |
| Abre em qualquer lugar, sem internet | Se estiver na bolsa | Sim | Precisa de navegador e internet |

**Parágrafo de fechamento da seção** (decisão do autor)
Os aplicativos de finanças, como o Mobills e o Organizze, olham para uma pessoa e mostram o que o
banco já sabe: o que saiu. O myBilling olha para duas e mostra o que ainda vai sair. São perguntas
diferentes, e esta página é sobre a segunda.

### Seção 6: Para dois

**Título**
Para dois

**Texto**
Os aplicativos de finanças olham para uma pessoa. A casa tem duas. O myBilling foi feito para isso
desde a primeira linha.

**Um caixa**
O dinheiro é da casa. Não há "a minha parte" e "a sua parte" para somar depois.

**Dois donos**
Cada lançamento diz quem gastou. Não para cobrar, para saber.

**Um número**
Os dois entram com a própria conta Google e veem o mesmo saldo, no mesmo instante.

**Começa com um** (decisão do autor; responde a objeção "a outra pessoa não vai usar")
Uma pessoa cadastra, a outra só olha. Quando ela quiser lançar o que gastou, já tem lugar.

### Seção 7: Traga a sua planilha ou comece do zero

**Título**
Traga a sua planilha ou comece do zero

**Subtítulo**
Os dois caminhos levam ao mesmo lugar: um mês que fecha.

**Já tem planilha**
Ela entra aba por aba. O app lê o mês, confere contra os totais da própria planilha e não duplica o
que se repete de uma aba para a outra. O que você digitou por anos vira histórico, não trabalho
perdido.

**Nunca controlou nada**
Comece com três coisas: o salário, as contas fixas e o cartão. O resto o app vai perguntando quando
acontecer. O primeiro mês já fecha.

### Seção 8: O que os números dizem

**Título**
Não é só na sua casa

**Subtítulo**
Pesquisas repercutidas pela imprensa. Fonte e ano em cada uma.

- **58%** de quem usa cartão de crédito não controla o que gasta nele. 14% só sabem quanto devem
  quando a fatura fecha. CNDL e SPC Brasil, 2026.
- **61%** fizeram uma compra não planejada no mês anterior. 60 milhões carregam parcelas, quatro em
  média. CNDL e SPC Brasil, 2026.
- **47%** de quem compra parcelado não controla os gastos antes de comprar. Quem acompanha usa papel
  (20%), planilha (14%) ou aplicativo (10%). CNDL e SPC Brasil, 2026.
- **82%** das famílias brasileiras têm dívida. Em 85% delas, a dívida é no cartão de crédito. CNC,
  2026.
- **45%** de quem vive a dois apontam o dinheiro entre as principais causas de briga. Serasa com
  Opinion Box, 2026.

(Cinco números, numa seção só, por decisão do dono em 2026-11-01; a seção se chama "Não é só na sua
casa" na landing. Fontes conferidas em `posicionamento.md`.)

### Seção 9: as cinco objeções e como a página responde

As respostas vivem no FAQ (seção 10) e nas seções 5, 6 e 7. Aqui, a lista e a resposta curta.

| Objeção | Resposta | Onde |
| --- | --- | --- |
| "Minha planilha funciona." | Funciona, e a página diz isso em voz alta. Ela só não sabe o que vem. A planilha entra por importação, e nada do que você digitou se perde. | Comparativo, "Já tem planilha", FAQ |
| "Vou ter que digitar tudo de novo." | Não. Cada coisa é cadastrada uma vez; a compra parcelada, uma vez; a conta fixa, uma vez. Quem tem planilha importa; quem não tem começa com três coisas. | Blocos 2 e 5, seção 7, FAQ |
| "Não sincroniza com o banco, então não serve." | Não sincroniza, e a página diz com todas as letras. O extrato sabe o que já saiu. O myBilling sabe o que ainda vai sair. | Fechamento do comparativo, FAQ |
| "A outra pessoa não vai usar." | Uma pessoa começa. A outra só olha o mesmo número, e tem lugar para lançar quando quiser. | "Começa com um", FAQ |
| "Quanto custa? Vai ficar pago?" | Não tem preço definido. Quem está na lista fica sabendo antes de qualquer cobrança existir, e nada é cobrado por entrar na lista. | FAQ, rodapé |

Uma sexta, de confiança: "E os meus dados?" A resposta fica no que é verificável: entra com a conta
Google, sem senha guardada; o app não se conecta ao seu banco; a página não tem rastreador.

### Seção 10: Perguntas frequentes

**Título**
Perguntas frequentes

**O que é o myBilling?**
Um app web para duas pessoas que dividem as contas da casa. Você cadastra cada coisa uma vez, e o app
espalha as parcelas pelos meses, repete as contas fixas e diz quanto vai sobrar em cada um dos
próximos meses.

**Eu uso planilha e ela funciona. Por que trocar?**
Ela funciona, e é de graça e abre em qualquer lugar. O que ela não faz é saber o que vem: a parcela
de dezembro só aparece em fevereiro se você copiar. A sua planilha entra no myBilling aba por aba, e o
histórico fica.

**Ele se conecta ao meu banco?**
Não. O app não lê seu extrato nem sua fatura. Você lança o que gastou, e o app cuida do que vem
depois: as parcelas, as contas fixas, o saldo dos próximos meses.

**Como funciona o "Dá pra comprar?"** **[só com o simulador]**
Você informa o valor, o número de parcelas e o mês da primeira. O app mostra, mês a mês, quanto vai
sobrar antes e depois da compra. Se não cabe, diz em quais meses falta e em quantas vezes caberia. Se
decidir comprar, um clique lança a compra.

**A outra pessoa precisa usar?**
Não. Uma pessoa pode cadastrar tudo. As duas entram com a própria conta Google e veem o mesmo saldo.
Cada lançamento diz quem gastou, e a outra pessoa lança quando quiser.

**Funciona no celular?**
Sim, pelo navegador. Não tem aplicativo na loja.

**Ele diz quanto vem na fatura do cartão?**
Ainda não. Hoje ele diz quanto vai sobrar em cada mês. (decisão do dono: dizer aqui que a fatura é
o que vem a seguir, nos termos da seção 11)

**Quanto custa?**
Ainda não tem preço definido. Entrar na lista de espera não custa nada, e quem está na lista fica
sabendo do preço antes de qualquer cobrança existir.

**O que acontece quando eu deixo meu e-mail?**
Você entra na lista de espera. Quando o acesso abrir, você recebe um e-mail. Sem novidade, sem
e-mail. (decisão do autor: a segunda frase é uma promessa de comportamento e o dono precisa
confirmar que vai cumpri-la)

**E os meus dados?**
Você entra com a conta Google, então o app não guarda senha. Ele não se conecta ao seu banco. Esta
página não tem rastreador.

### Seção 11: O que vem a seguir

Esta seção existe hoje para o simulador. Quando o simulador sair, ela fica vazia ou passa a falar da
próxima coisa: a fatura.

**Título**
O que vem a seguir

**Texto** (decisão do dono: estender a exceção do posicionamento, hoje restrita ao simulador, para a
fatura, com as mesmas regras: "ainda não existe", "é o que estamos fazendo", sem data)
Quanto vem na fatura. O app já sabe o ciclo de cada cartão. O que falta é a tela que diz, para cada
parcela, em qual fatura ela cai. Ainda não existe, é o que estamos fazendo agora, e quem está na
lista de espera recebe primeiro.

Se o dono preferir não estender a exceção, a seção sai da página e o teste estrutural muda junto.

### Seção 12: oferta e chamada final

**Título**
Quer ser avisado quando abrir?

**O que está incluído ao entrar na lista** (decisão do autor; nova na página)
- Receber o acesso antes de quem não está na lista.
- Saber do preço antes de ele existir.
- Uma pergunta só, para o app ser feito para o seu jeito de controlar as contas.

**Botão**
Entrar na lista de espera

**Três alternativas de chamada, para o mesmo botão**

| | Texto | Por quê |
| --- | --- | --- |
| A | Entrar na lista de espera | Diz o que acontece. É a chamada do posicionamento e a recomendada. |
| B | Quero o simulador primeiro **[só com o simulador]** | Troca a ação pelo ganho. Mais forte na emoção, mais fraca na regra 10 do tom, que exige que o botão diga o que acontece. Vale como variante de teste, com a microcopy "Abre a lista de espera" embaixo. |
| C | Avisar quando abrir | Diz o que acontece e reduz o compromisso. Boa para quem está na dúvida; fraca para quem já quer. |

**Urgência e escassez:** nenhuma. Não há vaga limitada nem data, e inventar uma quebraria a página
inteira, que se vende pela honestidade. A única verdade que funciona como urgência é "quem está na
lista recebe primeiro", e ela já está no texto.

**Status, no rodapé** (decisão do dono: CAMP-02 AC 6 exige "usado hoje por um casal"; a frase abaixo
troca o casal pelo uso real, sem a história de origem)
O myBilling está em uso hoje, com contas de verdade, e está abrindo para mais casas. Não há preço
definido e não há cadastro aberto: a lista de espera é o único passo por enquanto.

---

## Parte C: recomendações de UX e CRO

### Ordem e peso das seções

1. **Hero**, com o botão principal e o botão secundário "Testar o simulador". A imagem do app fica
   abaixo do texto no celular, não antes.
2. **Dá pra comprar?** logo depois do hero **[só com o simulador]**. É a prova. No celular, os três
   campos e o veredito cabem na tela sem rolar; a tabela por mês vem abaixo. O veredito aparece
   antes da tabela, em uma frase, com a cor de "Vai sobrar" ou "Vai faltar" do app.
3. **Onde as contas da casa quebram**, como apoio: explica por que a resposta do simulador é
   confiável. Seis blocos em três colunas; uma coluna em 360 px.
4. **Comparativo**, com as linhas em que a planilha ganha visíveis, não escondidas. Em 360 px, cada
   linha vira um cartão com os três rótulos, para a tabela não rolar de lado.
5. **Para dois**, curto.
6. **Traga a sua planilha ou comece do zero**, porque trata a objeção de esforço na hora em que a
   pessoa já quer.
7. **Números**, três, com a fonte no mesmo elemento.
8. **Perguntas frequentes**, com `<details>` fechados, uma por objeção. Sem script.
9. **O que vem a seguir**, se o dono estender a exceção.
10. **Rodapé** com o botão e a linha de status.

### Onde a chamada aparece

Quatro vezes, sempre a mesma ação: no hero, logo depois do veredito do simulador, depois do FAQ e no
rodapé. A do veredito é a mais importante, porque é o momento em que a pessoa acabou de ver o app
responder. Nenhum botão flutuante: ele cobriria o veredito no celular.

### Elementos de credibilidade

- "A conta é a mesma que o app faz" na introdução do simulador, e "Dados inventados" no rodapé da
  seção. Os dois juntos: a conta é real, os números não são de ninguém.
- O exemplo de R$ 1.000,00 em 3x com as parcelas de 333,34, 333,33 e 333,33 "como na fatura", porque
  é conferível de cabeça.
- As capturas com a legenda "Dados de demonstração, gerados pelo app".
- A fonte e o ano em cada número.
- As linhas em que a planilha ganha. Admitir compra o resto.

### Evidências a obter, em ordem de valor

1. **Depoimentos reais** das primeiras pessoas da lista que usarem o app, com nome e cidade, e com
   autorização. Nunca inventados. Até existirem, a seção não existe.
2. **Um vídeo de trinta segundos** do simulador no celular, sem narração, com a casa inventada.
3. **O número de pessoas na lista**, só quando for grande o bastante para ajudar. Um número pequeno
   atrapalha.
4. **Uma página "Como o app calcula"**, com as regras em português: rateio, virada de ano, compra e
   fatura separadas. É a versão legível de "por construção".

### Celular

- Campos do simulador com `inputmode="numeric"`, rótulo acima do campo, alvo de toque de 44 px.
- O veredito em uma linha, antes da tabela; a tabela com quatro colunas em monoespaçada.
- O comparativo como cartões em 360 px.
- O FAQ fechado por padrão.
- Nenhuma seção com texto acima de quatro linhas em 360 px sem um subtítulo antes.
- Tudo continua dentro das regras de hoje: um script inline do tema, um script local do simulador,
  sem terceiros além da folha de fontes (CAMP-03 AC 5, revisto na fatia).

---

## Parte D: hipóteses de otimização

### Como medir sem rastreador

O formulário do Google é a única medição. Dois ajustes nele, feitos pelo dono:

1. Um campo curto "versão", preenchido pela URL do botão (`entry.<id>=A`), que a pessoa não vê como
   pergunta importante. Cada variante da página aponta para a URL com o seu valor.
2. Uma pergunta opcional, de texto livre: "O que te fez entrar na lista?". É a voz do público, e
   alimenta as próximas headlines.

Limite honesto: sem contagem de visitas, o que se mede é **quantas pessoas entraram na lista por
variante**, não a taxa de conversão. As variantes precisam rodar com a mesma divulgação, em janelas
alternadas de tempo iguais, para a comparação valer alguma coisa. Nenhuma hipótese abaixo vem com
estimativa de resultado.

### Hipóteses, por impacto e facilidade

| # | Hipótese | Variante A | Variante B | Impacto | Facilidade |
| --- | --- | --- | --- | --- | --- |
| 1 | A pergunta na headline converte mais que o contraste | H1 "A planilha sabe o que você digitou..." | H2 "Dá pra comprar em dez vezes? Veja quanto vai sobrar..." | Alto | Alta: troca uma linha |
| 2 | A chamada logo depois do veredito do simulador rende mais que só a do rodapé **[só com o simulador]** | Sem botão depois do veredito | Com "Quer essa resposta com as suas contas?" e o botão | Alto | Alta |
| 3 | O simulador antes de "Onde as contas quebram" converte mais que depois **[só com o simulador]** | Simulador na seção 2 | Simulador depois do comparativo | Alto | Média: muda a ordem e o teste estrutural |
| 4 | O texto do botão pelo ganho rende mais que pela ação | "Entrar na lista de espera" | "Quero o simulador primeiro" com a microcopy "Abre a lista de espera" | Médio | Alta |
| 5 | O botão secundário para o simulador rende mais que o do comparativo | "Testar o simulador" | "Ver onde a planilha quebra" | Médio | Alta |
| 6 | A seção "O que está incluído" aumenta as entradas | Rodapé só com o botão | Rodapé com os três itens | Médio | Alta |
| 7 | O FAQ aumenta as entradas de quem veio pela objeção do banco | Com FAQ | Sem FAQ | Baixo | Alta |
| 8 | A pergunta "Como você controla as contas hoje?" com a opção "outro app" revela um quarto estado da persona | Como hoje | Com um campo "qual?" | Baixo, mas informa as próximas peças | Alta |

Comece pela 1 e pela 2. As duas mudam uma linha cada e tocam no que mais pesa: a primeira frase que a
pessoa lê e o momento em que ela acabou de ver o app responder.

---

## Revisão pelos critérios de qualidade

| Critério | Como a copy atende |
| --- | --- |
| Clareza nos primeiros segundos | Headline, subtítulo com a cena e o simulador na segunda dobra |
| Relevância | Três estados da persona cobertos no comparativo, na seção 7 e no FAQ |
| Headline específica | H1 escolhida pelo dono; H2 como variante mais concreta |
| Diferenciação | "Sabe o que vem" e "para dois", contra planilha, caderno, Mobills e Organizze |
| Credibilidade | A demonstração com a conta do app; fontes nos números; as linhas em que a planilha ganha |
| Objeções | Cinco respondidas, mais a de dados, com lugar na página |
| Chamada | Uma ação, quatro lugares, botão que diz o que acontece |
| Celular | Simulador sem rolar, cartões no comparativo, FAQ fechado |
| Jornada | Promessa, prova, por quê, comparação, objeções, oferta |
| Sem promessa falsa | Nenhum item da lista "O que nunca prometer"; o simulador marcado até existir; a fatura só com a decisão do dono |

## Decisões que ficam com o dono

1. Estender a exceção "O que vem a seguir" para a fatura, ou tirar a seção quando o simulador sair.
2. Trocar "usado hoje por um casal" (CAMP-02 AC 6 e regra 8 do tom) pela linha de status sem a
   história de origem.
3. Confirmar a promessa "Sem novidade, sem e-mail" do FAQ.
4. Dizer ou não "doze meses" quando `horizonte-doze-meses` estiver na `main`. A regra de hoje proíbe o
   número; a copy acima usa "os próximos meses" e perde especificidade por isso.
5. A nova ordem das seções, que muda CAMP-02 AC 1 e VEM-02 AC 7.
