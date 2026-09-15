import type { Lancamento } from "../tipos";

/**
 * Em qual bloco da lista do mês uma despesa aparece.
 *
 * **Existe em um único lugar de propósito**, pela mesma razão que
 * `filtrarLancamentos` existe: o indicador "Cartão" do painel leva para a lista,
 * e a soma do que aparece lá precisa bater com o número que foi clicado. Duas
 * implementações desta cascata divergiriam no primeiro ajuste, e o painel
 * passaria a prometer um total que a lista não confirma.
 *
 * **A ordem dos ramos é a regra, não um detalhe.** Recorrência vem primeiro:
 * uma conta fixa paga no cartão continua sendo um fixo, porque é o bloco que
 * administra o ciclo de vida dela. Só depois vem o meio de pagamento, e é ele —
 * não a origem — que decide o que é "Cartão de Crédito". "Vai cair na fatura" é
 * o que a planilha queria dizer com esse bloco, e é o que a fatia de Faturas vai
 * consumir. Inverter os dois primeiros ramos leva todo fixo no cartão para o
 * bloco errado.
 *
 * `cartoes` inclui **meios arquivados**. Ler só os disponíveis faria arquivar um
 * cartão reclassificar o passado: parcelas antigas sairiam deste bloco e
 * mudariam dois indicadores de meses já fechados.
 *
 * Recebe um `ReadonlySet` em vez do meio de pagamento inteiro porque a única
 * pergunta é de pertinência, e a resposta para a lista toda é uma consulta só.
 */
export type BlocoDoMes = "FIXOS" | "CARTAO" | "AVULSOS";

export function blocoDoLancamento(
  lancamento: Lancamento,
  cartoes: ReadonlySet<string>,
): BlocoDoMes {
  if (lancamento.origem === "RECORRENCIA") {
    return "FIXOS";
  }
  if (cartoes.has(lancamento.meioPagamentoId)) {
    return "CARTAO";
  }
  return "AVULSOS";
}
