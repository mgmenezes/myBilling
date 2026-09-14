# Roadmap

O que existe hoje, o que falta, e por quê. Escrito a partir de **auditoria do código**, não da
documentação: várias coisas descritas como prontas não tinham caminho até a tela.

> Última auditoria: 2026-09-14, sobre a branch `ajustes-visuais-e-cadastros`. A ordem das fatias
> mudou nesta revisão — recorrência subiu na frente de lançamento avulso, e a justificativa está
> registrada na própria fatia.

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

## Lacuna conhecida: escrito, testado, e sem nenhum chamador

Não é código morto por descuido: é a **metade de baixo** de recursos cuja metade de cima ainda não
existe. Toda vez que uma destas ganhar tela, o trabalho é menor do que parece.

| Peça | Camada | Espera por |
| --- | --- | --- |
| `marcarPagamento` | **Repositório** (Drizzle **e** fake) | Caso de uso, action e um controle na lista |
| `avaliarOrcamento` | Domínio | Repositório de `orcamento_categoria` e tela de limites |
| `regenerarParcelas` | Domínio | Caso de uso de edição de compra com escopo de série |
| `resolverCicloFatura` | Domínio | Repositório de `fatura` e área de Cartões |
| `resolverValorEfetivo`, `confirmarValorReal` | Domínio | Repositório de `recorrencia` (ver fatia 2) |

Quatro tabelas existem no banco sem nenhum repositório que as leia ou escreva:
`orcamento_categoria`, `pagamento_fatura`, `recorrencia`, `recorrencia_versao`.

## Fatia 1: marcar pago

1. **Marcar pago e desfazer.** O menor item da lista e o de maior efeito. `marcarPagamento` já está
   implementado nos dois repositórios, com zero chamadores — faltam caso de uso, action e o
   controle na lista. Sem ele o eixo **Movimentações é decorativo**: ele só mostra o que o seed
   marcou, e nada que o usuário faça no app muda "Recebido" ou "Saiu da conta".

## Fatia 2: recorrências

> **Esta fatia subiu.** Ela era a última, adiada com o argumento de que "fazer certo exige
> `recorrencia_versao`, materialização em janela rolante e semântica de 'esta e as futuras'".
> A auditoria mostrou que **duas dessas três já estão feitas**, migradas e com constraint no banco.
> O texto anterior foi escrito quando o trabalho pesado estava à frente; hoje ele está atrás.

2. **Recorrência com versionamento por vigência.** É o gasto fixo: água, luz, internet. Hoje eles
   não têm caminho nenhum — e o bloco **"Fixos"** da lista, que filtra por `origem = 'RECORRENCIA'`,
   promete um lugar que nunca recebe conteúdo.

   O que **já existe** e não precisa ser decidido de novo:

   - `recorrencia` e `recorrencia_versao` criadas, com `vigente_desde` + `valor_previsto_centavos` e
     índice único por `(recorrencia, vigência)` — o versionamento está modelado
   - `movimento.recorrencia_id`, `movimento.valor_previsto_centavos`, o `CHECK` bicondicional, e o
     índice único `movimento_recorrencia_competencia_uq`. **Esse índice torna a materialização
     idempotente de graça**: dá para rodá-la a cada abertura de mês sem duplicar nada e sem job de
     fundo
   - `resolverValorEfetivo` e `confirmarValorReal`, testados: previsto convive com real, e confirmar
     um mês não alcança outro

   O que falta: repositório das duas tabelas, caso de uso de materialização, action e formulário.

   **Por que junto da fatia 1.** Confirmar o valor real de uma conta quando ela chega e marcar essa
   conta como paga são o **mesmo gesto** para quem usa. Feitos separados, viram dois controles na
   mesma linha da lista; feitos juntos, viram um.

## Fatia 3: fechar o mês

3. **Criar despesa avulsa e receita.** Enquanto não existir, o mês nunca fecha: só compra parcelada
   e recorrência entram no app. Hoje o contorno é cadastrar compra com 1 parcela, o que funciona
   para o cartão e não para receita.

   **Decisão de modelo pendente, a resolver junto e não depois:** os blocos da lista agrupam por
   `origem`, não por meio de pagamento. "Cartão de Crédito" quer dizer "veio de compra parcelada" e
   "Gastos do Mês" quer dizer "é avulso" — então uma despesa avulsa **no cartão** cai no segundo
   bloco, que provavelmente não é o que o usuário espera.

4. **Excluir despesa avulsa e receita.** Parcela isolada continua não excluível: removê-la quebraria
   a conservação da soma da compra, que é invariante do domínio.

## Fatia 4: orçamento e cartões

5. **Orçamento por categoria.** Repositório de limites e tela para defini-los. O alerta de estouro
   já está implementado no gráfico, esperando o dado.
6. **Faturas.** Repositório de `fatura` e `pagamento_fatura`, área de Cartões, e o eixo caixa passa
   a somar pagamento de fatura. Hoje ele soma apenas lançamentos da própria competência já pagos, o
   que o torna parcial por escopo.
7. **Editar e excluir compra com escopo.** Esta ocorrência, as futuras, ou a série inteira.
   `regenerarParcelas` já sabe preservar as parcelas pagas e redistribuir as pendentes.

## Fatia 5: comparação no tempo

8. **Série histórica.** `listarPorCompetencia` lê um mês só. O gráfico de evolução mensal precisa de
   uma consulta agregada por competência, com teste de concordância entre o SQL e a função pura.

## Dívida de interface

- **A tabela espalha as colunas por igual.** Com 1440px de largura, descrição e valor ficam em
  pontas opostas. A pílula de categoria reduziu o sintoma ao ocupar o vão; a correção é deixar a
  descrição absorver a folga.
- **Renomear e arquivar cadastro** não têm tela. Nascem na área "Cadastros", junto do orçamento.

## Fora do roadmap

- **Importador da planilha.** O exportador precisa definir o formato antes.
- **Integração bancária, Open Finance e IA.** Descartados por decisão do usuário.
