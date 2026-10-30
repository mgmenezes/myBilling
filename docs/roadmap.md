# Roadmap

O que existe hoje, o que falta, e por quê. Escrito a partir de **auditoria do código**, não da
documentação: várias coisas descritas como prontas não tinham caminho até a tela.

> Última auditoria: 2026-09-14. **A fatia 1 saiu do roadmap: foi entregue.** Lançamento avulso,
> receita à vista e exclusão estão na tela, e a decisão de modelo que vinha anotada junto — os
> blocos agrupando por `origem` — foi resolvida com ela, não depois (AD-012). Orçamento e faturas
> passam a ser a fatia 1.

## Pronto

| Área | Estado |
| --- | --- |
| Núcleo financeiro | Rateio, competência, ciclo de fatura, agregação, orçamento, projeção. 100% de branches |
| Compra parcelada | Domínio, repositório transacional, caso de uso, action e formulário. Com 1 parcela, é a compra avulsa no cartão |
| Autenticação | Google OAuth com allowlist, provider de teste isolado por duas condições |
| Visão geral | Quatro indicadores, alternador Planejamento e Movimentações, gráfico de categorias, régua de comprometimento futuro |
| Lançamentos | Lista com busca, filtro por categoria, meio, pessoa e situação, total do filtro, categoria trocável na linha |
| Cadastros | Categoria e meio de pagamento criados **dentro do formulário**, pelo `CadastroInline`. Valem para todo mês, porque nenhum dos dois tem competência. A área **Cadastros**, quarto item da navegação, abre a tela de **Categorias**, que troca a cor e renomeia |
| Identidade | Derivada do `DESIGN.md`, com contraste medido; tema claro, escuro ou do sistema |
| Dados de desenvolvimento | Seed ancorado no relógio (dois meses atrás a três à frente) e idempotente |
| Marcar pago | O selo de situação **é** o botão que alterna, com estado otimista. Marcar move o indicador do painel, não só a lista |
| Gastos fixos e receita recorrente | Área **"Todo mês"**: cadastrar uma vez e aparecer em todo mês, reajustar a partir de um mês sem reescrever o passado, confirmar o valor real quando a conta chega, e encerrar preservando o que foi pago |
| Lançamento avulso e receita à vista | Despesa que não é parcelada nem fixa, e o dinheiro que entra fora do salário. Exclusão lógica em dois toques, só no avulso. Cadastro num `<dialog>` aberto pelo topo, com abas Avulso ┊ Parcelado |
| Blocos por meio de pagamento | "Cartão de Crédito" passou a significar "vai cair na fatura", e não "veio de compra parcelada" (AD-012). Painel e lista usam a mesma função, com teste de concordância |
| Entradas visíveis | O bloco subiu para o topo e aparece sempre, mesmo vazio. Com receita marcada, os formulários trocam o vocabulário e não oferecem cartão como destino (AD-015) |
| Importar a planilha | As abas mensais exportadas em CSV entram pela Visão geral, em sequência: arquivo e mês, o que a planilha não diz, conferência contra os totais da própria planilha, e gravação tudo ou nada. A aba seguinte reconhece os fixos e as compras da anterior em vez de duplicar. Roteiro de uso em `docs/importacao.md`; spec, design e tasks em `.specs/features/importar-planilha/` |
| Editar gasto fixo e entrada fixa | Na área "Todo mês", "Editar" em cada cartão abre o formulário do cadastro com o que está gravado. Descrição, categoria, meio, pessoa e dia valem para todos os meses do fixo, inclusive os passados, sem mexer em pagamento marcado nem em valor confirmado. O valor muda a partir de um mês, e "Termina em" encerra ou reabre. Natureza e início ficam travados. Tudo numa transação. Spec e tasks em `.specs/features/editar-fixos/` |
| Trocar a categoria na lista | Em Lançamentos, a categoria de todo gasto, investimento inclusive, troca num seletor na própria linha, sem formulário e sem confirmação. O alcance é o do lançamento: um fixo troca em todos os meses, inclusive os passados, uma compra em todas as parcelas, e um gasto do mês só nele, sem mexer em valor, data nem pagamento. Um toast diz até onde a troca foi; uma recusa volta o seletor e diz o motivo na linha. Toda entrada aparece como "Receita". Spec e tasks em `.specs/features/trocar-categoria/` |
| Lista de Lançamentos enxuta | No cartão de filtros, um chip por categoria com o gasto do mês, o mesmo número de "Gastos por categoria", no lugar do select; "Sem categoria" é um chip também, e além de seis um "+N categorias" revela o resto. Cada bloco recolhe pelo cabeçalho, que diz quantos, quanto e quantos a pagar, e o bloco recolhido continua recolhido na próxima visita, já fechado no HTML do servidor. Ao rolar, uma barra fixa no topo traz a busca, os filtros ativos removíveis e "Filtros". Cada barra do gráfico da Visão geral abre a lista filtrada pela categoria. No Cartão, a parcela é a segunda linha da descrição, e a tabela cabe na coluna de conteúdo em 1024, 1280 e 1440 px. Spec e tasks em `.specs/features/lista-enxuta/` |
| Cor por categoria | Cada categoria tem uma cor de uma paleta fechada de dez, sempre com o nome impresso ao lado: a pill de "Todo mês", o seletor da linha e os chips inativos de Lançamentos, e as barras de "Gastos por categoria". A cor se escolhe na tela de Categorias, em Cadastros, com um toque e sem botão de salvar; quem não escolhe fica com uma automática, tirada do nome. Renomear na mesma tela mantém a cor. "Sem categoria" e a categoria removida continuam neutras. Contraste medido nos dois temas: texto ≥ 4,5:1 e barra ≥ 3:1 contra o trilho e o fundo do gráfico (AD-018, `docs/design.md`, "Cor por categoria"). Spec e tasks em `.specs/features/cor-por-categoria/` |

## Lacuna conhecida: escrito, testado, e sem nenhum chamador

Não é código morto por descuido: é a **metade de baixo** de recursos cuja metade de cima ainda não
existe. Toda vez que uma destas ganhar tela, o trabalho é menor do que parece.

| Peça | Camada | Espera por |
| --- | --- | --- |
| `avaliarOrcamento` | Domínio | Repositório de `orcamento_categoria` e tela de limites |
| `regenerarParcelas` | Domínio | Caso de uso de edição de compra com escopo de série |
| `resolverCicloFatura` | Domínio | Repositório de `fatura` e área de Cartões |

Duas tabelas existem no banco sem nenhum repositório que as leia ou escreva:
`orcamento_categoria` e `pagamento_fatura`. `recorrencia` e `recorrencia_versao` saíram desta lista
com a fatia de recorrências.

As duas funções que a fatia de lançamento avulso acrescentou ao domínio —
`blocoDoLancamento` e `cancelamentoPermitido` — **nasceram com chamador**, cada uma com teste de
concordância: a primeira contra o total que o painel exibe, a segunda contra o `WHERE` do `UPDATE`.

`confirmarValorReal` do domínio continua sem chamador: `resolverValorEfetivo` ganhou o dele na
leitura da lista, mas a confirmação em lote que a outra modela não tem tela — e fabricar um chamador
para ela seria a encenação que esta fatia recusou três vezes.

## Fatia seguinte: editar avulso, entrada avulsa e compra parcelada

Pedido do dono em 2026-10-24: editar o que já foi lançado, **incluindo trocar a categoria**. O gasto
fixo e a entrada fixa saíram primeiro, na fatia `editar-fixos`. Falta o resto: avulso, entrada
avulsa e compra parcelada. Trocar a categoria já não espera por ela: saiu na fatia
`trocar-categoria`, na própria linha da lista, para todo gasto. Absorve o item 3 da fatia abaixo
(editar e excluir compra com escopo).
Ganha peso com a importação: as entradas chegam sem categoria, porque a planilha não tem essa
coluna, e um erro pontual depois de importar passa a ter conserto sem recomeçar. A análise desses
tipos está em rascunho em `.specs/features/editar-lancamentos/context.md`.

## Fatia 1: orçamento e cartões

1. **Orçamento por categoria.** Repositório de limites e tela para defini-los. O alerta de estouro
   já está implementado no gráfico, esperando o dado.
2. **Faturas.** Repositório de `fatura` e `pagamento_fatura`, área de Cartões, e o eixo caixa passa
   a somar pagamento de fatura. Hoje ele soma apenas lançamentos da própria competência já pagos, o
   que o torna parcial por escopo. **O bloco "Cartão de Crédito" já reúne o que vai na fatura**
   (AD-012), então esta fatia herda a classificação pronta.
3. **Editar e excluir compra com escopo.** Esta ocorrência, as futuras, ou a série inteira.
   `regenerarParcelas` já sabe preservar as parcelas pagas e redistribuir as pendentes.

## Fatia 2: comparação no tempo

4. **Série histórica.** `listarPorCompetencia` lê um mês só. O gráfico de evolução mensal precisa de
   uma consulta agregada por competência, com teste de concordância entre o SQL e a função pura.

## Dívida de interface

- **A descrição ainda não absorve a folga da tabela.** O item dizia que a tabela espalhava as
  colunas por igual. A lista enxuta (LST-05) atacou o sintoma mais grave, que era o oposto: no
  Cartão as colunas não cabiam, e a tabela passava da margem. A coluna Parcela saiu, a parcela virou
  a segunda linha da descrição e o seletor de categoria ganhou largura fixa a partir de `md`. Medido
  pelo e2e, a tabela do Cartão tem a largura da coluna de conteúdo, 736 px em 1024, 1280 e 1440 px,
  porque o app tem no máximo 64rem. O que sobra é a distribuição: a folga ainda vai para Situação, e
  a descrição fica com cerca de 133 px, de modo que "2/4 · (faltam 2 depois desta)" ocupa duas
  linhas, e não mais uma palavra por linha. A correção continua sendo deixar a descrição absorver a
  folga.
- **Arquivar cadastro, e renomear meio de pagamento,** não têm tela. Renomear categoria já tem: é a
  tela de Categorias, na área "Cadastros", que também troca a cor. O resto nasce na mesma área,
  junto do orçamento. Quando arquivar existir, a edição de fixo precisa oferecer como selecionados o
  meio e a categoria arquivados que o fixo usa; hoje ela abre sem eles (decisão do dono em
  2026-10-29).

## Fora do roadmap

- **Estorno e reembolso.** Pix de amigo devolvendo a parte dele de uma conta entra hoje como
  receita, e infla os dois lados do mês. Tratar direito exige vincular a devolução à despesa
  original, relação que não existe no banco. Registrado como limitação conhecida na spec de
  `lancamento-avulso`, não como descuido.
- **Remover o campo de destino da receita.** O formulário hoje pede em qual conta o dinheiro cai, e
  isso é informação real — é o que vai permitir conciliar. Se um dia se decidir que receita não tem
  destino, é migration: `movimento.meio_pagamento_id` é `NOT NULL`.
- **Integração bancária, Open Finance e IA.** Descartados por decisão do usuário.
