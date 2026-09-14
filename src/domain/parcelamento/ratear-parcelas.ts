import type { Cents } from "../shared/money";
import { type DomainError, err, ok, type Result } from "../shared/result";
import type { PoliticaResiduo } from "../tipos";

/** Teto de parcelas aceito pelo produto (10 anos). */
export const MAX_PARCELAS = 120;

/**
 * Distribui `total` em `n` parcelas inteiras cuja soma é exatamente
 * `total` — `base * n + resto === total` é identidade da divisão
 * euclidiana, não aproximação.
 *
 * O resíduo vai um centavo por parcela, nas primeiras por padrão (AD-004),
 * porque é a prática dominante dos emissores brasileiros: o valor exibido
 * bate com a fatura real, que é o único critério que o usuário confere.
 */
export function ratearParcelas(
  total: Cents,
  n: number,
  politica: PoliticaResiduo,
): Result<readonly Cents[], DomainError> {
  if (!Number.isInteger(n) || n < 1 || n > MAX_PARCELAS) {
    return err({ code: "QTD_PARCELAS_INVALIDA", detalhes: { n } });
  }
  if (!Number.isInteger(total) || total < 1) {
    return err({ code: "VALOR_NAO_POSITIVO", detalhes: { total } });
  }
  if (n > total) {
    return err({ code: "PARCELA_INFERIOR_A_UM_CENTAVO", detalhes: { total, n } });
  }

  const base = Math.floor(total / n);
  const resto = total - base * n;
  const parcelas: Cents[] = [];
  for (let indice = 0; indice < n; indice += 1) {
    const recebeCentavo = politica === "PRIMEIRAS" ? indice < resto : indice >= n - resto;
    parcelas.push((recebeCentavo ? base + 1 : base) as Cents);
  }
  return ok(parcelas);
}
