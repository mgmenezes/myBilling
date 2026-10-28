import type {
  RecorrenciaComVersoes,
  RepositoriosTransacionais,
  Transacao,
} from "@/application/ports/repositories";
import {
  type Cents,
  type Competencia,
  err,
  type FixoAtual,
  type FixoEditado,
  type MudancaDoFim,
  ok,
  planejarEdicaoDoFixo,
  type Result,
  type VersaoRecorrencia,
  versaoVigente,
} from "@/domain";
import { encerrarRecorrencia } from "../encerrar/handler";
import { registrarVersao } from "../registrar-versao/handler";

/**
 * Salvar o formulário de edição de um fixo (EDF-02 a EDF-06).
 *
 * O caso de uso não decide o que a edição faz: `planejarEdicaoDoFixo` decide.
 * Ele carrega o fixo, confere as referências como o cadastro confere, pede o
 * plano e o executa numa transação só. A vigência nova passa por
 * `registrarVersao` e o encerramento por `encerrarRecorrencia`, para que
 * "Mudar valor" e "Encerrar" tenham o mesmo efeito pelos dois caminhos.
 *
 * Toda recusa acontece antes da primeira escrita. Depois dela, uma recusa de
 * caso de uso reaproveitado lança, e a transação desfaz tudo (EDF-06 AC 2).
 */

export type CodigoErroEdicaoFixo =
  | "RECORRENCIA_NAO_ENCONTRADA"
  | "MEIO_PAGAMENTO_NAO_ENCONTRADO"
  | "MEIO_PAGAMENTO_ARQUIVADO"
  | "CATEGORIA_NAO_ENCONTRADA"
  | "PERIODO_INVALIDO";

/** Em `PERIODO_INVALIDO`, qual dos dois meses caiu antes do início. */
export type CampoDoPeriodo = "competenciaFim" | "vigenteDesde";

// SPEC_DEVIATION: o erro ganha `campo`, que o design não previa.
// Reason: `PERIODO_INVALIDO` nasce de dois campos diferentes (EDF-03 AC 5 e
// EDF-04 AC 4), e sem ele a action não tem como endereçar a recusa ao campo
// certo do formulário.
export interface ErroEdicaoFixo {
  readonly code: CodigoErroEdicaoFixo;
  readonly campo?: CampoDoPeriodo;
}

export interface EntradaEditarFixo extends FixoEditado {
  readonly recorrenciaId: string;
  /** O mês que a pessoa está vendo: é o valor dele que o formulário mostrou. */
  readonly competenciaExibida: Competencia;
  /** Instante do encerramento, resolvido na borda (AD-002). */
  readonly agora: string;
}

export async function editarRecorrencia(
  transacao: Transacao,
  entrada: EntradaEditarFixo,
): Promise<Result<{ readonly mudou: boolean }, ErroEdicaoFixo>> {
  return transacao.executar(async (repos) => {
    const encontrada = await repos.recorrencias.buscarComVersoes(entrada.recorrenciaId);
    if (encontrada === null) {
      return err({ code: "RECORRENCIA_NAO_ENCONTRADA" });
    }

    const meio = await repos.cadastros.buscarMeioDePagamento(entrada.meioPagamentoId);
    if (meio === null) {
      return err({ code: "MEIO_PAGAMENTO_NAO_ENCONTRADO" });
    }
    if (meio.arquivadoEm !== null) {
      return err({ code: "MEIO_PAGAMENTO_ARQUIVADO" });
    }
    if (
      entrada.categoriaId !== null &&
      (await repos.cadastros.buscarCategoria(entrada.categoriaId)) === null
    ) {
      return err({ code: "CATEGORIA_NAO_ENCONTRADA" });
    }

    const plano = planejarEdicaoDoFixo(fixoAtual(encontrada, entrada.competenciaExibida), entrada);
    if (!plano.ok) {
      const campo =
        plano.error.detalhes?.campo === "vigenteDesde" ? "vigenteDesde" : "competenciaFim";
      return err({ code: "PERIODO_INVALIDO", campo });
    }

    const { serie, vigencia, fim } = plano.value;
    if (serie !== null) {
      await repos.recorrencias.atualizarSerie(entrada.recorrenciaId, serie);
      await repos.movimentos.atualizarOcorrenciasDaSerie(entrada.recorrenciaId, serie);
    }
    if (vigencia !== null) {
      exigir(
        "registrarVersao",
        await registrarVersao(repos, {
          recorrenciaId: entrada.recorrenciaId,
          vigenteDesde: vigencia.vigenteDesde,
          valor: vigencia.valor,
        }),
      );
    }
    if (fim !== null) {
      await mudarFim(repos, entrada.recorrenciaId, fim, entrada.agora);
    }

    return ok({ mudou: serie !== null || vigencia !== null || fim !== null });
  });
}

/**
 * O valor que o formulário mostra e com que a edição compara o digitado: o
 * vigente no mês exibido. Num fixo visto antes de começar, nenhuma vigência
 * alcança o mês, e vale a primeira, que é o valor com que ele vai começar.
 *
 * A página usa esta mesma função para preencher o campo. Se as duas
 * calculassem o número cada uma do seu jeito, salvar sem mexer em nada
 * registraria uma vigência (EDF-03 AC 3).
 */
export function valorNoMesExibido(
  versoes: ReadonlyArray<VersaoRecorrencia>,
  competenciaExibida: Competencia,
): Cents | null {
  return (versaoVigente(versoes, competenciaExibida) ?? versoes[0])?.valorPrevisto ?? null;
}

function fixoAtual(
  { recorrencia, versoes }: RecorrenciaComVersoes,
  competenciaExibida: Competencia,
): FixoAtual {
  const valor = valorNoMesExibido(versoes, competenciaExibida);
  if (valor === null) {
    // Recorrência sem versão não pode existir: `criar` grava as duas juntas.
    throw new Error(`recorrência ${recorrencia.id} sem vigência`);
  }
  return {
    descricao: recorrencia.descricao,
    diaVencimento: recorrencia.diaVencimento,
    meioPagamentoId: recorrencia.meioPagamentoId,
    categoriaId: recorrencia.categoriaId,
    usuarioId: recorrencia.usuarioId,
    competenciaInicio: recorrencia.competenciaInicio,
    competenciaFim: recorrencia.competenciaFim,
    valorNoMesExibido: valor,
  };
}

async function mudarFim(
  repos: RepositoriosTransacionais,
  recorrenciaId: string,
  fim: MudancaDoFim,
  agora: string,
): Promise<void> {
  if (fim.tipo === "ENCERRAR") {
    exigir(
      "encerrarRecorrencia",
      await encerrarRecorrencia(repos, { recorrenciaId, aPartirDe: fim.aPartirDe, agora }),
    );
    return;
  }
  if (fim.tipo === "REABRIR") {
    await repos.recorrencias.reabrir(recorrenciaId);
    return;
  }
  await repos.recorrencias.estenderFim(recorrenciaId, fim.competenciaFim);
}

/**
 * Uma recusa de caso de uso reaproveitado depois da primeira escrita não é
 * erro da edição: as referências já foram conferidas na mesma transação.
 * Lança, para a transação desfazer tudo, e a action responde com o erro
 * inesperado (EDF-06 AC 2 e 4).
 */
function exigir(operacao: string, resultado: Result<void, { readonly code: string }>): void {
  if (!resultado.ok) {
    throw new Error(`a edição não pôde gravar: ${operacao} devolveu ${resultado.error.code}`);
  }
}
