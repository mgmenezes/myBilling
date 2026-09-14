import type { MovimentoRepository, RecorrenciaRepository } from "@/application/ports/repositories";
import { addMeses, type Competencia, err, ok, type Result } from "@/domain";
import type { CodigoErroVersao } from "../registrar-versao/handler";

/**
 * Encerrar uma recorrência a partir de uma competência.
 *
 * **Aqui mora o off-by-one da fatia.** O banco guarda `competencia_fim` como a
 * **última competência em que a recorrência ainda vale**; a pessoa diz a partir
 * de qual mês ela para. Encerrar a partir de maio grava fim em abril.
 *
 * A tradução vive neste ponto único de propósito. Espalhada — uma conversão na
 * action, outra no formulário — ela viraria duas verdades, e a segunda estaria
 * errada por um mês em algum caminho que ninguém testou.
 *
 * Duas escritas, nesta ordem:
 *
 * 1. O fim é gravado, o que faz `janelaMaterializacao` parar de produzir a
 *    competência encerrada em diante. Sem isso, a próxima abertura de mês
 *    recriaria tudo que a segunda escrita acabou de apagar.
 * 2. As ocorrências não pagas dali em diante são removidas. As pagas ficam:
 *    cancelar a internet não pode apagar o que já foi pago por ela (AD-003).
 */

export interface DependenciasEncerrar {
  readonly recorrencias: RecorrenciaRepository;
  readonly movimentos: MovimentoRepository;
}

export interface EntradaEncerrar {
  readonly recorrenciaId: string;
  /** A competência **a partir da qual** a recorrência deixa de valer. */
  readonly aPartirDe: Competencia;
  /** Instante do encerramento, resolvido na borda (AD-002). */
  readonly agora: string;
}

export async function encerrarRecorrencia(
  deps: DependenciasEncerrar,
  entrada: EntradaEncerrar,
): Promise<Result<void, { readonly code: CodigoErroVersao }>> {
  const todas = await deps.recorrencias.listarComVersoes();
  if (!todas.some((r) => r.recorrencia.id === entrada.recorrenciaId)) {
    return err({ code: "RECORRENCIA_NAO_ENCONTRADA" });
  }

  const ultimaValida = addMeses(entrada.aPartirDe, -1);
  await deps.recorrencias.encerrar(entrada.recorrenciaId, ultimaValida, entrada.agora);
  await deps.movimentos.removerNaoPagasDaRecorrencia(entrada.recorrenciaId, entrada.aPartirDe);

  return ok(undefined);
}
