import type { MovimentoRepository } from "@/application/ports/repositories";
import {
  type Competencia,
  cancelamentoPermitido,
  err,
  type Lancamento,
  ok,
  type Result,
} from "@/domain";

/**
 * Excluir um lançamento avulso.
 *
 * A exclusão é lógica: `cancelado_em` recebe o instante e a linha fica. Toda
 * soma do mês já ignora cancelado, então nada precisa ser recalculado.
 *
 * O caso de uso consulta antes de cancelar por uma razão específica: o
 * repositório devolve só `true` ou `false`, e `false` cobre três situações que
 * a pessoa precisa distinguir na tela — o lançamento não existe, a origem não é
 * cancelável, ou ele já estava cancelado. Sem a consulta, "parcela não pode ser
 * excluída" viraria a mesma mensagem genérica de "não encontrado".
 *
 * A **competência afetada** sai no resultado porque é o que a action revalida.
 * Ela vem do lançamento lido, e não de um parâmetro: quem exclui pode estar
 * vendo março e excluindo algo de abril, e revalidar a competência errada
 * deixaria o total antigo na tela.
 *
 * `agora` entra como parâmetro. A aplicação conhece o relógio, o domínio não
 * (AD-006), e receber o instante em vez de chamar `Date.now()` aqui torna o
 * caso de uso determinístico no teste.
 */

export type CodigoErroCancelamento = "LANCAMENTO_NAO_ENCONTRADO" | "LANCAMENTO_NAO_CANCELAVEL";

export interface DependenciasCancelar {
  readonly movimentos: MovimentoRepository;
}

export interface EntradaCancelar {
  readonly lancamentoId: string;
  /** Instante ISO da operação. Vem de fora para o teste ser determinístico. */
  readonly agora: string;
}

export interface LancamentoCancelado {
  readonly id: string;
  /** O que a action precisa revalidar. */
  readonly competencia: Competencia;
  /**
   * `false` quando ele já estava cancelado. Não é erro (AVUL-03, AC 4): a
   * segunda exclusão chega de um clique duplo ou de duas abas, e falhar ali
   * produziria um erro que não corresponde a nenhum problema.
   */
  readonly alterou: boolean;
}

export async function cancelarLancamento(
  deps: DependenciasCancelar,
  entrada: EntradaCancelar,
): Promise<Result<LancamentoCancelado, { readonly code: CodigoErroCancelamento }>> {
  const lancamento: Lancamento | null = await deps.movimentos.buscarPorId(entrada.lancamentoId);
  if (lancamento === null) {
    return err({ code: "LANCAMENTO_NAO_ENCONTRADO" });
  }

  const permitido = cancelamentoPermitido(lancamento);
  if (!permitido.ok) {
    return err({ code: permitido.error.code });
  }

  const alterou = await deps.movimentos.cancelar(entrada.lancamentoId, entrada.agora);
  return ok({ id: lancamento.id, competencia: lancamento.competencia, alterou });
}
