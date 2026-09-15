# Lançamento avulso e entradas — Design

**Spec**: `.specs/features/lancamento-avulso/spec.md`

## O que já existe, e por isso não é construído aqui

A auditoria do código encontrou a metade de baixo pronta. Registrar o que **não** precisa de
trabalho é parte do design, porque impede que alguém a reconstrua:

| Peça | Estado |
| --- | --- |
| `Origem = "AVULSO"` | Em `src/domain/tipos.ts` e no enum `origem` do banco |
| Disciplina do avulso | `movimento_parcela_sse_compra` e `movimento_recorrencia_sse_vinculo` já impedem que um avulso carregue vínculo por acidente |
| `avulsos` e `entradas` no painel | `resumoMensal` já os calcula |
| Exclusão lógica | `cancelado_em` existe e `vigente()` já o respeita em toda soma |
| Índice de deduplicação | `movimento_origem_dado_hash_uq` já exclui linha manual pelo `WHERE` |

## Decisão 1 — a classificação em blocos é uma função só

O risco desta fatia não é gravar uma linha: é **painel e lista discordarem**. O indicador "Cartão"
leva para a lista filtrada, e a soma do que aparece lá precisa bater com o número que foi clicado.
Hoje os dois usam `origem = 'PARCELA'`; com a cascata, passam a usar uma regra com três ramos.
Duas implementações dessa regra divergem no primeiro ajuste.

```
blocoDoLancamento(lancamento, cartoes) -> "FIXOS" | "CARTAO" | "AVULSOS"

  origem === "RECORRENCIA"          -> FIXOS
  cartoes.has(meioPagamentoId)      -> CARTAO
  senão                             -> AVULSOS
```

Pura, sem `Date`, sem async, sem exceção. `cartoes` é `ReadonlySet<string>` — estrutura da
linguagem, não tipo de infraestrutura, então o domínio continua obedecendo AD-006.

**Dois chamadores desde o primeiro commit**, que é a regra de dívida do projeto: `resumoMensal`
(para `fixos`, `cartao` e `avulsos`) e `obterVisaoMensal` (para carimbar cada `LancamentoDoMes`).
A tabela **nunca** recebe o `Set`: ela lê `item.bloco`, já decidido. Classificar diferente do
painel deixa de ser improvável e passa a ser impossível de escrever.

**Teste de concordância obrigatório**: para a mesma lista e o mesmo conjunto de cartões,
`competenciaView.cartao` é igual à soma dos itens cujo `bloco` é `"CARTAO"`. O mesmo para `fixos`
e `avulsos`.

## Decisão 2 — o conjunto de cartões inclui arquivados

`listarMeiosDePagamentoDisponiveis()` exclui arquivados, e usá-lo aqui faria arquivar um cartão
**reclassificar o passado**: parcelas antigas sairiam do bloco Cartão e apareceriam em Gastos do
Mês, mudando dois indicadores de meses já fechados. A port ganha um método próprio:

```ts
idsDeMeiosComFatura(): Promise<ReadonlySet<string>>   // WHERE gera_fatura = true, sem filtrar arquivado
```

## Decisão 3 — exclusão é lógica, e só alcança o avulso

`cancelamentoPermitido(lancamento): Result<void, DomainError>` aceita apenas `origem = 'AVULSO'`.
Parcela isolada quebraria a conservação da soma da compra; ocorrência de recorrência renasceria na
materialização seguinte.

A regra existe em dois lugares por necessidade — a função pura e o `WHERE` do `UPDATE` —, e é o
mesmo par que `ocorrenciaProtegida` já formou. Vale o mesmo contrato: **teste de concordância**
confrontando a função contra o `WHERE`, sem o qual a função vira dívida.

O `UPDATE` é `SET cancelado_em = now() WHERE id = $1 AND origem = 'AVULSO' AND cancelado_em IS NULL`.
Zero linhas afetadas por já estar cancelado é **sucesso**, não erro (AVUL-03 AC 4): a segunda
exclusão do mesmo id chega de um clique duplo ou de duas abas, e falhar ali só produziria um erro
que não corresponde a nenhum problema.

## Decisão 4 — a migration que faltava

`movimento.valor_centavos` não tem `CHECK` de positividade, enquanto `recorrencia_versao`,
`orcamento_categoria` e `pagamento_fatura` têm o deles. É o mesmo raciocínio da migration `0001`:
enquanto o banco aceitar valor não positivo no razão, o teste de que a aplicação o recusa é
infalsificável — ele passaria com a validação removida.

```sql
ALTER TABLE "movimento" ADD CONSTRAINT "movimento_valor_positivo" CHECK ("valor_centavos" > 0);
```

## Decisão 5 — o padrão de "já pago" vem do meio

Dinheiro em conta corrente se move no ato do gesto; compra no cartão só sai na fatura. O
formulário marca "já saiu da conta" por padrão quando o meio escolhido **não** gera fatura, e
desmarca quando gera. A data de pagamento é a própria data do evento — pedir uma segunda data para
o mesmo instante seria campo que só existe para ser repetido.

É padrão, não regra: a caixa continua editável, e o selo-botão de pago segue funcionando na linha.

## Fluxo

```
FormLancamentoAvulso (cliente)
  │ valida com lancamento-avulso.schema.ts
  ▼
criarLancamentoAvulso (Server Action)
  │ requireSession() na primeira instrução
  │ revalida com o MESMO schema
  ▼
criarLancamentoAvulso (caso de uso)  ──► MovimentoRepository.criarAvulso
  │                                          INSERT único, origem = 'AVULSO'
  ▼
revalidatePath("/[competencia]") e ("/[competencia]/lancamentos")
```

Leitura:

```
obterVisaoMensal
  ├── movimentos.listarPorCompetencia
  ├── cadastros.idsDeMeiosComFatura ──┐
  ├── resumoMensal(lançamentos, comp, cartoes)   ──► indicadores
  └── lançamentos.map(bloco: blocoDoLancamento(l, cartoes))  ──► TabelaLancamentos
```

## Componentes

| Arquivo | Papel |
| --- | --- |
| `src/domain/mes/bloco-do-lancamento.ts` | A cascata. Função pura, dois chamadores |
| `src/domain/mes/cancelamento-permitido.ts` | Quem pode ser cancelado. Função pura, confrontada com o `WHERE` |
| `src/application/schemas/lancamento-avulso.schema.ts` | Zod compartilhado cliente/servidor; só importa `zod` e `@/domain` |
| `src/application/mes/criar-lancamento-avulso/handler.ts` | Caso de uso de criação |
| `src/application/mes/cancelar-lancamento/handler.ts` | Caso de uso de cancelamento |
| `src/app/actions/lancamentos.ts` | As duas actions, no envelope `ResultadoAction` |
| `src/components/form-lancamento-avulso.tsx` | Formulário, com `CadastroInline` para categoria e meio |
| `src/components/botao-excluir.tsx` | Ilha cliente de confirmação em dois toques |
| `drizzle/0002_movimento_valor_positivo.sql` | O `CHECK` que faltava |

## Interface

A página de Lançamentos ganha um **alternador "Avulso ┊ Parcelado"** acima da área de formulário,
em vez de dois formulários empilhados. Empilhar obrigaria a pessoa a rolar por um formulário que
ela não quer para alcançar o que quer.

Na lista, **"Entradas" sobe para o topo e passa a aparecer sempre**, com o texto de ausência quando
vazio — a mesma regra dos blocos de despesa, que existe para que a ausência seja legível como
ausência e não como esquecimento. O nome perde "e investimentos", porque investimento não tem porta
de entrada em nenhum formulário do app.

A área que administra recorrências passa a se chamar **"Todo mês"**. O comentário em
`navegacao-principal.tsx` que exigia que área e bloco tivessem o mesmo nome é substituído pela
razão nova: a área administra receita recorrente, cuja ocorrência aparece em "Entradas" e nunca no
bloco "Fixos" — os dois já eram coisas diferentes, e o salário é o caso que revela isso.

## Limitação conhecida

Pix de amigo devolvendo a parte dele de uma conta entra como **receita**, e infla tanto as entradas
quanto os gastos do mês. Estorno correto exige vincular a devolução à despesa original, relação que
não existe no banco. Registrado aqui para ser encontrado, não descoberto.
