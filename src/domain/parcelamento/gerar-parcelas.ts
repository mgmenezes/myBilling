import { addMeses } from "../shared/competencia";
import { type Cents, multiplicar, somar, ZERO_CENTS } from "../shared/money";
import { type DomainError, err, ok, type Result } from "../shared/result";
import type { EntradaCompra, Parcela, PlanoParcelamento } from "../tipos";
import { MAX_PARCELAS, ratearParcelas } from "./ratear-parcelas";

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
  // Rejeição antes de qualquer cálculo: nenhuma parcela é construída para
  // depois ser descartada.
  if (entrada.qtdParcelas < 1 || entrada.qtdParcelas > MAX_PARCELAS) {
    return err({ code: "QTD_PARCELAS_INVALIDA", detalhes: { qtdParcelas: entrada.qtdParcelas } });
  }
  if (entrada.parcelaInicial < 1 || entrada.parcelaInicial > entrada.qtdParcelas) {
    return err({
      code: "PARCELA_INICIAL_INVALIDA",
      detalhes: { parcelaInicial: entrada.parcelaInicial, qtdParcelas: entrada.qtdParcelas },
    });
  }
  if (entrada.valorEntrada < 1) {
    return err({ code: "VALOR_NAO_POSITIVO", detalhes: { valorEntrada: entrada.valorEntrada } });
  }

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
