import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";

/**
 * Uma ocorrência de recorrência numa competência. `valorPrevisto` é o que a
 * recorrência projeta; `valorReal` é o que o usuário confirma quando a conta
 * chega. Os dois convivem: confirmar não apaga a previsão.
 */
export interface OcorrenciaRecorrencia {
  readonly competencia: Competencia;
  readonly valorPrevisto: Cents;
  readonly valorReal: Cents | null;
}

export interface ValorEfetivo {
  readonly valorPrevisto: Cents;
  readonly valorEfetivo: Cents;
  /** Confirmada manualmente: a materialização não deve alterá-la (REC-01, AC 2). */
  readonly sobrescritaManualmente: boolean;
}

/**
 * Valor que vale para a ocorrência: o real quando confirmado, o previsto
 * enquanto não (REC-01, AC 1).
 *
 * A função é por ocorrência, e não por recorrência, exatamente para que
 * confirmar um mês não tenha como alcançar outro: não existe estado
 * compartilhado entre competências por onde o valor pudesse vazar.
 */
export function resolverValorEfetivo(valorPrevisto: Cents, valorReal: Cents | null): ValorEfetivo {
  return {
    valorPrevisto,
    valorEfetivo: valorReal ?? valorPrevisto,
    sobrescritaManualmente: valorReal !== null,
  };
}

/**
 * Confirma o valor real de **uma** competência. Devolve uma lista nova; as
 * demais ocorrências saem idênticas, pela mesma referência (REC-01, AC 1).
 */
export function confirmarValorReal(
  ocorrencias: readonly OcorrenciaRecorrencia[],
  competencia: Competencia,
  valorReal: Cents,
): readonly OcorrenciaRecorrencia[] {
  return ocorrencias.map((ocorrencia) =>
    ocorrencia.competencia === competencia ? { ...ocorrencia, valorReal } : ocorrencia,
  );
}
