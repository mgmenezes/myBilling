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
| Lançamentos | Lista com busca, filtro por categoria, meio, pessoa e situação, total do filtro, pílula de categoria |
| Cadastros | Categoria e meio de pagamento criados **dentro do formulário**, pelo `CadastroInline`. Valem para todo mês, porque nenhum dos dois tem competência |
| Identidade | Derivada do `DESIGN.md`, com contraste medido; tema claro, escuro ou do sistema |
| Dados de desenvolvimento | Seed ancorado no relógio (dois meses atrás a três à frente) e idempotente |
| Marcar pago | O selo de situação **é** o botão que alterna, com estado otimista. Marcar move o indicador do painel, não só a lista |
| Gastos fixos e receita recorrente | Área **"Todo mês"**: cadastrar uma vez e aparecer em todo mês, reajustar a partir de um mês sem reescrever o passado, confirmar o valor real quando a conta chega, e encerrar preservando o que foi pago |
| Lançamento avulso e receita à vista | Despesa que não é parcelada nem fixa, e o dinheiro que entra fora do salário. Exclusão lógica em dois toques, só no avulso. Cadastro num `<dialog>` aberto pelo topo, com abas Avulso ┊ Parcelado |
| Blocos por meio de pagamento | "Cartão de Crédito" passou a significar "vai cair na fatura", e não "veio de compra parcelada" (AD-012). Painel e lista usam a mesma função, com teste de concordância |
| Entradas visíveis | O bloco subiu para o topo e aparece sempre, mesmo vazio. Com receita marcada, os formulários trocam o vocabulário e não oferecem cartão como destino (AD-015) |

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

- **A tabela espalha as colunas por igual.** Com 1440px de largura, descrição e valor ficam em
  pontas opostas. A pílula de categoria reduziu o sintoma ao ocupar o vão; a correção é deixar a
  descrição absorver a folga.
- **Renomear e arquivar cadastro** não têm tela. Nascem na área "Cadastros", junto do orçamento.

## Fora do roadmap

- **Estorno e reembolso.** Pix de amigo devolvendo a parte dele de uma conta entra hoje como
  receita, e infla os dois lados do mês. Tratar direito exige vincular a devolução à despesa
  original, relação que não existe no banco. Registrado como limitação conhecida na spec de
  `lancamento-avulso`, não como descuido.
- **Remover o campo de destino da receita.** O formulário hoje pede em qual conta o dinheiro cai, e
  isso é informação real — é o que vai permitir conciliar. Se um dia se decidir que receita não tem
  destino, é migration: `movimento.meio_pagamento_id` é `NOT NULL`.
- **Importador da planilha.** O exportador precisa definir o formato antes.
- **Integração bancária, Open Finance e IA.** Descartados por decisão do usuário.
