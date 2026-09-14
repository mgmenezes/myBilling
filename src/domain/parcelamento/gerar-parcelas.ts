import { addMeses } from "../shared/competencia";
import { type Cents, multiplicar, somar, ZERO_CENTS } from "../shared/money";
import { type DomainError, err, ok, type Result } from "../shared/result";
import type { EntradaCompra, Parcela, PlanoParcelamento } from "../tipos";
import { ratearParcelas } from "./ratear-parcelas";

/**
 * Gera o plano de parcelas de uma compra.
 *
 * `competenciaCompra` é sempre a competência da **parcela 1**, mesmo quando
 * a compra já está em andamento: `competencia[k] = competenciaCompra +
 * (k - 1) meses`. Numa compra 8/10 cuja parcela 8 cai em 2026-03, a entrada
 * traz 2025-08.
 *
 * Só as parcelas a partir de `parcelaInicial` são devolvidas. As anteriores
 * viram `valorAmortizadoAnterior` e não geram lançamento em competência
 * nenhuma — o app não inventa meses que não existiram nele (AD-005).
 */
export function gerarParcelas(entrada: EntradaCompra): Result<PlanoParcelamento, DomainError> {
  const valorTotal =
    entrada.modo === "TOTAL"
      ? entrada.valorEntrada
      : multiplicar(entrada.valorEntrada, entrada.qtdParcelas);

  const rateio = ratearParcelas(valorTotal, entrada.qtdParcelas, entrada.politicaResiduo);
  // Discriminante nativo: os guards isOk/isErr de T5 não estreitam o ramo
  // negativo (ver observação de fora de escopo no relatório).
  if (!rateio.ok) {
    return err(rateio.error);
  }

  const valores: readonly Cents[] = rateio.value;
  const parcelas: Parcela[] = valores
    .slice(entrada.parcelaInicial - 1)
    .map((valor, deslocamento) => ({
      numero: entrada.parcelaInicial + deslocamento,
      valor,
      competencia: addMeses(entrada.competenciaCompra, entrada.parcelaInicial - 1 + deslocamento),
    }));

  let valorAmortizadoAnterior: Cents = ZERO_CENTS;
  for (const valor of valores.slice(0, entrada.parcelaInicial - 1)) {
    valorAmortizadoAnterior = somar(valorAmortizadoAnterior, valor);
  }

  return ok({ valorTotal, parcelas, valorAmortizadoAnterior });
}
