# Roadmap

O que existe hoje, o que falta, e por quê. Escrito a partir de auditoria do código, não da
documentação: várias coisas descritas como prontas não tinham caminho até a tela.

## Pronto

| Área | Estado |
| --- | --- |
| Núcleo financeiro | Rateio, competência, ciclo de fatura, agregação, orçamento, projeção. 100% de branches |
| Compra parcelada | Domínio, repositório transacional, caso de uso, action e formulário |
| Autenticação | Google OAuth com allowlist, provider de teste isolado por duas condições |
| Visão geral | Quatro indicadores, alternador Planejamento e Movimentações, gráfico de categorias |
| Lançamentos | Lista com busca, filtro por categoria, meio, pessoa e situação, total do filtro |

## Lacuna conhecida: o que o domínio calcula e nenhuma tela usa

Estas funções estão escritas e testadas, sem nenhum chamador em produção. Não são código morto por
descuido: são a metade de baixo de recursos cuja metade de cima ainda não existe.

| Função | Espera por |
| --- | --- |
| `avaliarOrcamento` | Repositório de `orcamento_categoria` e tela de limites |
| `regenerarParcelas` | Caso de uso de edição de compra com escopo de série |
| `resolverCicloFatura` | Repositório de `fatura` e área de Cartões |
| `resolverValorEfetivo` | Subsistema de recorrências |

E quatro tabelas existem no banco sem nenhum repositório que as leia ou escreva:
`orcamento_categoria`, `pagamento_fatura`, `recorrencia`, `recorrencia_versao`.

## Fatia 2: escrita e orçamento

1. **Marcar pago e desfazer.** O método já existe em `MovimentoRepository`; faltam caso de uso e
   action. É o menor item da lista e o de maior efeito: sem ele o eixo Movimentações fica sempre
   zerado, porque nada nunca é registrado como pago.
2. **Criar despesa à vista e receita.** Um método de repositório, um caso de uso, uma action.
   Enquanto não existir, o mês nunca fecha: só compras parceladas entram no app.
3. **Excluir despesa avulsa e receita.** Parcela isolada continua não excluível: removê-la quebraria
   a conservação da soma da compra, que é invariante do domínio.
4. **Orçamento por categoria.** Repositório de limites, tela para defini-los, e o alerta de estouro
   passa a aparecer no gráfico que já está pronto para recebê-lo.

## Fatia 3: cartões e séries

5. **Série histórica.** `listarPorCompetencia` lê um mês só. O gráfico de evolução mensal precisa de
   uma consulta agregada por competência, com teste de concordância entre o SQL e a função pura.
6. **Faturas.** Repositório de `fatura` e `pagamento_fatura`, área de Cartões, e o eixo caixa passa a
   somar pagamento de fatura. Hoje ele soma apenas lançamentos da própria competência já pagos, o
   que o torna parcial.
7. **Editar e excluir compra com escopo.** Esta ocorrência, as futuras, ou a série inteira.
   `regenerarParcelas` já sabe preservar as parcelas pagas e redistribuir as pendentes.

## Fatia 4: recorrências

8. **Recorrência com versionamento por vigência.** Adiada de propósito. Uma versão simples, de valor
   fixo, pareceria funcionar e erraria no caso que mais importa: a conta de energia, cujo valor muda
   todo mês. Fazer certo exige `recorrencia_versao`, materialização em janela rolante e semântica de
   "esta e as futuras".

## Fora do roadmap

- **Importador da planilha.** O exportador precisa definir o formato antes.
- **Integração bancária, Open Finance e IA.** Descartados por decisão do usuário.
