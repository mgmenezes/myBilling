import type { CompraRepository, MovimentoRepository } from "@/application/ports/repositories";
import { err, ok, planejarExclusaoDestaEmDiante, type Result } from "@/domain";

/**
 * Excluir uma compra parcelada desta parcela em diante (EXC-03).
 *
 * A exclusão é lógica, como a do avulso: cada parcela que sai recebe
 * `cancelado_em`, e toda soma e toda lista já ignoram cancelado. O que sai é
 * decidido de novo aqui, pela mesma função que montou o aviso na página, sobre
 * o que o banco tem agora: se outra aba mudou a compra entre a leitura e o
 * clique, vale esta leitura, e `parcelasExcluidas` diz quantas saíram de fato.
 *
 * `agora` entra como parâmetro, como em `cancelarLancamento`: a aplicação
 * conhece o relógio, o domínio não (AD-006).
 */

export type CodigoErroExclusao =
  | "LANCAMENTO_NAO_ENCONTRADO"
  | "LANCAMENTO_NAO_E_PARCELA"
  | "NADA_A_EXCLUIR";

export interface DependenciasExclusao {
  readonly movimentos: MovimentoRepository;
  readonly compras: CompraRepository;
}

export interface EntradaExclusao {
  /** A parcela escolhida: sai ela e as de número maior, menos as pagas. */
  readonly lancamentoId: string;
  /** Instante ISO da operação. Vem de fora para o teste ser determinístico. */
  readonly agora: string;
}

export interface CompraExcluida {
  /**
   * `false` quando a parcela já estava cancelada. Não é erro (EXC-03 AC 7): a
   * segunda exclusão chega de um clique duplo ou de duas abas.
   */
  readonly alterou: boolean;
  /** Quantas parcelas saíram nesta chamada: o número do toast (EXC-04 AC 4). */
  readonly parcelasExcluidas: number;
}

const NADA_MUDOU: CompraExcluida = { alterou: false, parcelasExcluidas: 0 };

export async function excluirCompraDestaEmDiante(
  deps: DependenciasExclusao,
  entrada: EntradaExclusao,
): Promise<Result<CompraExcluida, { readonly code: CodigoErroExclusao }>> {
  // `buscarPorId` devolve também o cancelado: é o que separa "já excluída" de "não existe".
  const lancamento = await deps.movimentos.buscarPorId(entrada.lancamentoId);
  if (lancamento === null) {
    return err({ code: "LANCAMENTO_NAO_ENCONTRADO" });
  }
  const { compraId, numeroParcela } = lancamento;
  if (compraId === null || numeroParcela === null) {
    return err({ code: "LANCAMENTO_NAO_E_PARCELA" });
  }
  if (lancamento.canceladoEm !== null) {
    return ok(NADA_MUDOU);
  }

  const compra = (await deps.compras.parcelasVigentes([compraId])).get(compraId);
  if (compra === undefined) {
    // A chave estrangeira de `movimento.compra_id` impede: é defeito, não recusa.
    throw new Error(`a parcela ${lancamento.id} aponta para a compra ${compraId}, que não existe`);
  }

  const plano = planejarExclusaoDestaEmDiante(compra, numeroParcela);
  if (!plano.ok) {
    // A parcela saiu das vigentes entre as duas leituras: outra aba a excluiu.
    return plano.error.code === "NADA_A_EXCLUIR" ? err({ code: "NADA_A_EXCLUIR" }) : ok(NADA_MUDOU);
  }

  await deps.compras.excluirParcelas(
    compraId,
    plano.value.numeros,
    plano.value.valorTotalNovo,
    entrada.agora,
  );
  return ok({ alterou: true, parcelasExcluidas: plano.value.numeros.length });
}
