import type { CadastroRepository, RecorrenciaRepository } from "@/application/ports/repositories";
import {
  type Cents,
  type Competencia,
  compararCompetencias,
  err,
  type Natureza,
  ok,
  type Recorrencia,
  type Result,
} from "@/domain";

/**
 * Cadastrar um gasto fixo ou uma receita recorrente.
 *
 * O caso de uso existe para duas coisas que o repositório não faz: **resolver
 * as referências** antes de gravar, e **recusar um período impossível**.
 *
 * A primeira importa mais do que parece. Um meio de pagamento arquivado que
 * recebesse recorrência nova geraria ocorrência todo mês num cartão que não
 * existe mais — e como a materialização roda sozinha na abertura do mês,
 * ninguém veria o erro acontecendo, só o resultado dele meses depois.
 */

export type CodigoErroRecorrencia =
  | "MEIO_PAGAMENTO_NAO_ENCONTRADO"
  | "MEIO_PAGAMENTO_ARQUIVADO"
  | "PERIODO_INVALIDO";

export interface DependenciasCriarRecorrencia {
  readonly recorrencias: RecorrenciaRepository;
  readonly cadastros: CadastroRepository;
}

export interface EntradaCriarRecorrenciaUso {
  readonly descricao: string;
  readonly natureza: Natureza;
  readonly categoriaId: string | null;
  readonly usuarioId: string;
  readonly meioPagamentoId: string;
  readonly competenciaInicio: Competencia;
  readonly competenciaFim: Competencia | null;
  readonly diaVencimento: number;
  readonly valorInicial: Cents;
}

export async function criarRecorrencia(
  deps: DependenciasCriarRecorrencia,
  entrada: EntradaCriarRecorrenciaUso,
): Promise<Result<Recorrencia, { readonly code: CodigoErroRecorrencia }>> {
  /*
   * Fim **igual** ao início é válido: recorrência de um mês só é um caso
   * legítimo, não um engano. Só o fim estritamente anterior é impossível.
   */
  if (
    entrada.competenciaFim !== null &&
    compararCompetencias(entrada.competenciaFim, entrada.competenciaInicio) < 0
  ) {
    return err({ code: "PERIODO_INVALIDO" });
  }

  const meio = await deps.cadastros.buscarMeioDePagamento(entrada.meioPagamentoId);
  if (meio === null) {
    return err({ code: "MEIO_PAGAMENTO_NAO_ENCONTRADO" });
  }
  if (meio.arquivadoEm !== null) {
    return err({ code: "MEIO_PAGAMENTO_ARQUIVADO" });
  }

  const criada = await deps.recorrencias.criar({
    dados: {
      descricao: entrada.descricao,
      natureza: entrada.natureza,
      categoriaId: entrada.categoriaId,
      usuarioId: entrada.usuarioId,
      meioPagamentoId: entrada.meioPagamentoId,
      competenciaInicio: entrada.competenciaInicio,
      competenciaFim: entrada.competenciaFim,
      diaVencimento: entrada.diaVencimento,
    },
    valorInicial: entrada.valorInicial,
  });
  return ok(criada);
}
