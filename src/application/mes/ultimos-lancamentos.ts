import type { LancamentoDoMes } from "./obter-visao-mensal/handler";

/**
 * Os lançamentos mais recentes do mês, para a coluna de ação da Visão geral
 * (TRES-05).
 *
 * **Pela data, e não pelo cadastro.** O movimento não guarda quando foi
 * criado, e o dono preferiu a data a uma coluna nova com migração.
 *
 * **Só o que já aconteceu.** Um fixo materializado com vencimento no dia 30
 * tomaria o topo da lista o mês inteiro, antes de existir de fato. Com o corte
 * em hoje, o gasto lançado agora, que nasce com a data de hoje, aparece em
 * cima. A comparação é de texto `'YYYY-MM-DD'`, sem objeto de data (AD-002).
 *
 * O repositório já tira os cancelados da lista do mês. A regra é repetida aqui
 * porque é desta função, e não de quem a chama.
 */

export const LIMITE_DE_ULTIMOS = 8;

export function ultimosLancamentos(
  itens: ReadonlyArray<LancamentoDoMes>,
  hoje: string,
): LancamentoDoMes[] {
  return itens
    .filter(({ lancamento }) => lancamento.canceladoEm === null && lancamento.dataEvento <= hoje)
    .sort(
      (a, b) =>
        b.lancamento.dataEvento.localeCompare(a.lancamento.dataEvento) ||
        a.lancamento.descricao.localeCompare(b.lancamento.descricao, "pt-BR"),
    )
    .slice(0, LIMITE_DE_ULTIMOS);
}
