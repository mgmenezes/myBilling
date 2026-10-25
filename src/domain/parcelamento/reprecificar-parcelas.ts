import { type Cents, somar } from "../shared/money";
import { type DomainError, err, ok, type Result } from "../shared/result";

export interface ParcelaDaCompra {
  readonly numero: number;
  readonly valor: Cents;
}

export interface CompraParaReprecificar {
  readonly valorAmortizadoAnterior: Cents;
  /** Todas as parcelas gravadas da compra. */
  readonly parcelas: ReadonlyArray<ParcelaDaCompra>;
}

export interface Reprecificacao {
  /** Só as parcelas de número ≥ `aPartirDe`, já com o valor novo. */
  readonly parcelas: ReadonlyArray<ParcelaDaCompra>;
  /** Amortizado + soma de todas as parcelas, já com o valor novo. */
  readonly valorTotal: Cents;
}

/**
 * O valor que a aba mais nova traz para a parcela `aPartirDe` passa a valer
 * para ela e para as seguintes, como a fatura cobra (IMP-07 AC 10). As
 * anteriores não mudam, e o total da compra se ajusta para manter a
 * conservação: total = amortizado anterior + soma das parcelas.
 *
 * Não é `regenerarParcelas`, que redistribui um total fixo entre as pendentes:
 * aqui é o total que segue as parcelas.
 */
export function reprecificarAPartirDe(
  compra: CompraParaReprecificar,
  aPartirDe: number,
  valor: Cents,
): Result<Reprecificacao, DomainError> {
  if (!compra.parcelas.some((parcela) => parcela.numero === aPartirDe)) {
    return err({ code: "PARCELA_INICIAL_INVALIDA", detalhes: { aPartirDe } });
  }
  const parcelas = compra.parcelas
    .filter((parcela) => parcela.numero >= aPartirDe)
    .map((parcela) => ({ numero: parcela.numero, valor }));
  let valorTotal = compra.valorAmortizadoAnterior;
  for (const parcela of compra.parcelas) {
    valorTotal = somar(valorTotal, parcela.numero >= aPartirDe ? valor : parcela.valor);
  }
  return ok({ parcelas, valorTotal });
}
