import type { MovimentoRepository, RecorrenciaRepository } from "@/application/ports/repositories";
import { type Cents, type Competencia, err, ok, type Result } from "@/domain";

/**
 * Registrar que o valor de uma recorrência mudou, a partir de uma competência.
 *
 * É a operação que atrasou esta fatia duas vezes, e a razão é a pergunta que
 * ela responde: **quando a conta de luz muda de valor, o passado muda junto?**
 * Não. O que foi planejado em março continua sendo informação depois de o valor
 * mudar em outubro, e é por isso que existe versionamento em vez de um campo de
 * valor na recorrência.
 *
 * São duas escritas, nesta ordem:
 *
 * 1. A versão nova entra no histórico, sem apagar as anteriores.
 * 2. As ocorrências já materializadas da vigência em diante passam a valer o
 *    valor novo — **menos as protegidas**, que são as pagas e as que já têm
 *    valor confirmado. Quem digitou quanto a conta veio não pode ter isso
 *    sobrescrito por um reajuste registrado depois.
 *
 * A ordem importa: propagar antes de gravar a versão deixaria, numa falha entre
 * as duas, ocorrências com um valor que nenhuma versão justifica.
 */

export type CodigoErroVersao = "RECORRENCIA_NAO_ENCONTRADA" | "VALOR_NAO_POSITIVO";

export interface DependenciasRegistrarVersao {
  readonly recorrencias: RecorrenciaRepository;
  readonly movimentos: MovimentoRepository;
}

export interface EntradaRegistrarVersao {
  readonly recorrenciaId: string;
  readonly vigenteDesde: Competencia;
  readonly valor: Cents;
}

export async function registrarVersao(
  deps: DependenciasRegistrarVersao,
  entrada: EntradaRegistrarVersao,
): Promise<Result<void, { readonly code: CodigoErroVersao }>> {
  if (entrada.valor <= 0) {
    return err({ code: "VALOR_NAO_POSITIVO" });
  }

  /*
   * A verificação de existência é o que o repositório não faz: `registrarVersao`
   * nele é silencioso para id inexistente, e sem esta guarda a interface
   * confirmaria um reajuste que não aconteceu.
   */
  const todas = await deps.recorrencias.listarComVersoes();
  const existe = todas.some((r) => r.recorrencia.id === entrada.recorrenciaId);
  if (!existe) {
    return err({ code: "RECORRENCIA_NAO_ENCONTRADA" });
  }

  await deps.recorrencias.registrarVersao(
    entrada.recorrenciaId,
    entrada.vigenteDesde,
    entrada.valor,
  );
  await deps.movimentos.atualizarPrevistoNaoProtegido(
    entrada.recorrenciaId,
    entrada.vigenteDesde,
    entrada.valor,
  );

  return ok(undefined);
}
