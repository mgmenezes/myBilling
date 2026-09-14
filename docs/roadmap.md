# Roadmap

O que existe hoje, o que falta, e por quê. Escrito a partir de **auditoria do código**, não da
documentação: várias coisas descritas como prontas não tinham caminho até a tela.

> Última auditoria: 2026-09-14, sobre a branch `ajustes-visuais-e-cadastros`. **Marcar pago e
> recorrências saíram do roadmap: foram entregues.** Lançamento avulso passou a ser a fatia 1.

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
| Gastos fixos e receita recorrente | Área "Fixos": cadastrar uma vez e aparecer em todo mês, reajustar a partir de um mês sem reescrever o passado, confirmar o valor real quando a conta chega, e encerrar preservando o que foi pago |

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

`confirmarValorReal` do domínio continua sem chamador: `resolverValorEfetivo` ganhou o dele na
leitura da lista, mas a confirmação em lote que a outra modela não tem tela — e fabricar um chamador
para ela seria a encenação que esta fatia recusou três vezes.

## Fatia 1: fechar o mês

1. **Criar despesa avulsa e receita.** Enquanto não existir, o mês nunca fecha: só compra parcelada
   e recorrência entram no app. Hoje o contorno é cadastrar compra com 1 parcela, o que funciona
   para o cartão e não para receita.

   **Decisão de modelo pendente, a resolver junto e não depois:** os blocos da lista agrupam por
   `origem`, não por meio de pagamento. "Cartão de Crédito" quer dizer "veio de compra parcelada" e
   "Gastos do Mês" quer dizer "é avulso" — então uma despesa avulsa **no cartão** cai no segundo
   bloco, que provavelmente não é o que o usuário espera.

2. **Excluir despesa avulsa e receita.** Parcela isolada continua não excluível: removê-la quebraria
   a conservação da soma da compra, que é invariante do domínio.

## Fatia 2: orçamento e cartões

3. **Orçamento por categoria.** Repositório de limites e tela para defini-los. O alerta de estouro
   já está implementado no gráfico, esperando o dado.
4. **Faturas.** Repositório de `fatura` e `pagamento_fatura`, área de Cartões, e o eixo caixa passa
   a somar pagamento de fatura. Hoje ele soma apenas lançamentos da própria competência já pagos, o
   que o torna parcial por escopo.
5. **Editar e excluir compra com escopo.** Esta ocorrência, as futuras, ou a série inteira.
   `regenerarParcelas` já sabe preservar as parcelas pagas e redistribuir as pendentes.

## Fatia 3: comparação no tempo

6. **Série histórica.** `listarPorCompetencia` lê um mês só. O gráfico de evolução mensal precisa de
   uma consulta agregada por competência, com teste de concordância entre o SQL e a função pura.

## Dívida de interface

- **A tabela espalha as colunas por igual.** Com 1440px de largura, descrição e valor ficam em
  pontas opostas. A pílula de categoria reduziu o sintoma ao ocupar o vão; a correção é deixar a
  descrição absorver a folga.
- **Renomear e arquivar cadastro** não têm tela. Nascem na área "Cadastros", junto do orçamento.

## Fora do roadmap

- **Importador da planilha.** O exportador precisa definir o formato antes.
- **Integração bancária, Open Finance e IA.** Descartados por decisão do usuário.
