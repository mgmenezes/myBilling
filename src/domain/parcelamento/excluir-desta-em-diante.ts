import type { Competencia } from "../shared/competencia";
import { type Cents, somar, ZERO_CENTS } from "../shared/money";
import { err, ok, type Result } from "../shared/result";

export interface ParcelaVigente {
  readonly numero: number;
  readonly competencia: Competencia;
  readonly valor: Cents;
  readonly paga: boolean;
}

export interface CompraVigente {
  readonly valorAmortizadoAnterior: Cents;
  /** Só as parcelas não canceladas. */
  readonly parcelas: ReadonlyArray<ParcelaVigente>;
}

export interface PlanoDeExclusao {
  /** As parcelas que saem, em ordem de número. */
  readonly numeros: ReadonlyArray<number>;
  readonly primeira: Competencia;
  readonly ultima: Competencia;
  /** Soma dos valores gravados das que saem. */
  readonly total: Cents;
  /** Parcelas pagas de número ≥ `aPartirDe`: ficam, com o mesmo pagamento. */
  readonly pagasQueFicam: number;
  /** Nenhuma parcela vigente de número menor que `aPartirDe`. */
  readonly inteira: boolean;
  /** Amortizado anterior + soma das parcelas que ficam (AD-005). */
  readonly valorTotalNovo: Cents;
}

export type ErroDaExclusao =
  | { readonly code: "PARCELA_INICIAL_INVALIDA" }
  | { readonly code: "NADA_A_EXCLUIR"; readonly pagasQueFicam: number };

/**
 * Excluir "desta parcela em diante" (EXC-03): sai toda parcela vigente de
 * número ≥ `aPartirDe` que não está paga. As de número menor e as pagas
 * ficam, e o total da compra passa a ser o amortizado anterior mais a soma das
 * que ficaram, para a conservação continuar fechando.
 *
 * A mesma função monta o aviso na página e decide a escrita no servidor: o
 * aviso e a gravação não têm como divergir de regra.
 */
export function planejarExclusaoDestaEmDiante(
  compra: CompraVigente,
  aPartirDe: number,
): Result<PlanoDeExclusao, ErroDaExclusao> {
  if (!compra.parcelas.some((parcela) => parcela.numero === aPartirDe)) {
    return err({ code: "PARCELA_INICIAL_INVALIDA" });
  }
  const emOrdem = [...compra.parcelas].sort((a, b) => a.numero - b.numero);
  const alcance = emOrdem.filter((parcela) => parcela.numero >= aPartirDe);
  const saem = alcance.filter((parcela) => !parcela.paga);
  const pagasQueFicam = alcance.length - saem.length;
  const primeira = saem[0];
  const ultima = saem[saem.length - 1];
  if (primeira === undefined || ultima === undefined) {
    return err({ code: "NADA_A_EXCLUIR", pagasQueFicam });
  }
  const ficam = emOrdem.filter((parcela) => parcela.numero < aPartirDe || parcela.paga);
  return ok({
    numeros: saem.map((parcela) => parcela.numero),
    primeira: primeira.competencia,
    ultima: ultima.competencia,
    total: saem.reduce((soma, parcela) => somar(soma, parcela.valor), ZERO_CENTS),
    pagasQueFicam,
    inteira: !emOrdem.some((parcela) => parcela.numero < aPartirDe),
    valorTotalNovo: ficam.reduce(
      (soma, parcela) => somar(soma, parcela.valor),
      compra.valorAmortizadoAnterior,
    ),
  });
}

/** Parcelas vigentes de número maior que `numero`: o "faltam" da linha (EXC-04 AC 5). */
export function restantesDepois(parcelas: ReadonlyArray<ParcelaVigente>, numero: number): number {
  return parcelas.filter((parcela) => parcela.numero > numero).length;
}
