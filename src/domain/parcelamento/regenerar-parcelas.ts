import { addMeses, type Competencia } from "../shared/competencia";
import { type Cents, somar, subtrair, ZERO_CENTS } from "../shared/money";
import { type DomainError, err, ok, type Result } from "../shared/result";
import type { Parcela, PoliticaResiduo } from "../tipos";
import { MAX_PARCELAS, ratearParcelas } from "./ratear-parcelas";

export interface CompraExistente {
  readonly valorTotal: Cents;
  readonly qtdParcelas: number;
  readonly competenciaCompra: Competencia;
  readonly parcelaInicial: number;
  readonly politicaResiduo: PoliticaResiduo;
  readonly valorAmortizadoAnterior: Cents;
}

export interface AlteracoesCompra {
  readonly novoValorTotal?: Cents;
  readonly novaQtdParcelas?: number;
}

export interface ParcelaPaga {
  readonly numero: number;
  readonly valor: Cents;
}

export interface PlanoRegeneracao {
  readonly valorTotal: Cents;
  /** Pagas e pendentes, em ordem de número. */
  readonly parcelas: ReadonlyArray<Parcela>;
  /** Parcelas que deixaram de existir; passam a dever zero. */
  readonly canceladas: ReadonlyArray<Parcela>;
  readonly valorAmortizadoAnterior: Cents;
}

/**
 * Redistribui apenas o remanescente entre as parcelas não pagas.
 *
 * Parcela paga é fato consumado: seu valor não muda. O que sobra do total,
 * descontado o amortizado anterior e o já pago, é rateado pela mesma
 * função de T13 — a política de resíduo existe em um único lugar (AD-004).
 */
export function regenerarParcelas(
  compra: CompraExistente,
  alteracoes: AlteracoesCompra,
  parcelasPagas: readonly ParcelaPaga[],
): Result<PlanoRegeneracao, DomainError> {
  const qtdParcelas = alteracoes.novaQtdParcelas ?? compra.qtdParcelas;
  const valorTotal = alteracoes.novoValorTotal ?? compra.valorTotal;

  if (qtdParcelas < 1 || qtdParcelas > MAX_PARCELAS) {
    return err({ code: "QTD_PARCELAS_INVALIDA", detalhes: { qtdParcelas } });
  }

  let somaPaga: Cents = ZERO_CENTS;
  for (const paga of parcelasPagas) {
    if (paga.numero > qtdParcelas) {
      // Cancelar uma parcela já paga apagaria dinheiro que saiu da conta.
      return err({
        code: "QTD_PARCELAS_INVALIDA",
        detalhes: { qtdParcelas, parcelaPagaForaDoNovoPlano: paga.numero },
      });
    }
    somaPaga = somar(somaPaga, paga.valor);
  }

  const remanescente = subtrair(subtrair(valorTotal, compra.valorAmortizadoAnterior), somaPaga);
  if (remanescente < 1) {
    return err({ code: "VALOR_NAO_POSITIVO", detalhes: { remanescente } });
  }

  const numerosPagos = new Set(parcelasPagas.map((paga) => paga.numero));
  const numerosPendentes: number[] = [];
  for (let numero = compra.parcelaInicial; numero <= qtdParcelas; numero += 1) {
    if (!numerosPagos.has(numero)) {
      numerosPendentes.push(numero);
    }
  }

  const rateio = ratearParcelas(remanescente, numerosPendentes.length, compra.politicaResiduo);
  if (!rateio.ok) {
    return err(rateio.error);
  }
  const valores = rateio.value;

  const competenciaDe = (numero: number): Competencia =>
    addMeses(compra.competenciaCompra, numero - 1);

  const parcelas: Parcela[] = [
    ...parcelasPagas.map((paga) => ({
      numero: paga.numero,
      valor: paga.valor,
      competencia: competenciaDe(paga.numero),
    })),
    ...numerosPendentes.map((numero, indice) => ({
      numero,
      // O rateio tem exatamente `numerosPendentes.length` posições.
      valor: valores[indice] as Cents,
      competencia: competenciaDe(numero),
    })),
  ].sort((a, b) => a.numero - b.numero);

  const canceladas: Parcela[] = [];
  for (
    let numero = Math.max(qtdParcelas + 1, compra.parcelaInicial);
    numero <= compra.qtdParcelas;
    numero += 1
  ) {
    canceladas.push({ numero, valor: ZERO_CENTS, competencia: competenciaDe(numero) });
  }

  return ok({
    valorTotal,
    parcelas,
    canceladas,
    valorAmortizadoAnterior: compra.valorAmortizadoAnterior,
  });
}
