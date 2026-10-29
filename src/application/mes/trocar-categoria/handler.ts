import type {
  CadastroRepository,
  MovimentoRepository,
  RepositoriosTransacionais,
  Transacao,
} from "@/application/ports/repositories";
import {
  type AlcanceDaTroca,
  alcanceDaTroca,
  type CamposDaSerie,
  err,
  type Lancamento,
  ok,
  type Result,
} from "@/domain";

/**
 * Trocar a categoria de um gasto na própria linha da lista (TRC-03, TRC-05).
 *
 * O caso de uso não decide até onde a troca vai: `alcanceDaTroca` decide. Ele
 * carrega o lançamento, confere a categoria e grava numa transação só, para
 * que o fixo e as ocorrências dele, ou a compra e as parcelas, mudem juntos ou
 * não mudem (TRC-03 AC 6).
 *
 * Toda recusa acontece antes da transação. Uma exceção dentro dela sobe, e a
 * transação desfaz o que já tinha gravado.
 */

export type CodigoErroTrocaDeCategoria =
  | "LANCAMENTO_NAO_ENCONTRADO"
  | "CATEGORIA_NAO_ENCONTRADA"
  | "CATEGORIA_EM_RECEITA";

export interface DependenciasTrocaDeCategoria {
  readonly transacao: Transacao;
  readonly movimentos: MovimentoRepository;
  readonly cadastros: CadastroRepository;
}

export interface EntradaTrocaDeCategoria {
  readonly lancamentoId: string;
  /** `null` é "Sem categoria" (TRC-03 AC 5). */
  readonly categoriaId: string | null;
}

export interface TrocaDeCategoria {
  /** A interface escolhe o texto do aviso por ele (TRC-04 AC 1 a 3). */
  readonly alcance: AlcanceDaTroca;
  readonly categoriaId: string | null;
}

export async function trocarCategoria(
  deps: DependenciasTrocaDeCategoria,
  entrada: EntradaTrocaDeCategoria,
): Promise<Result<TrocaDeCategoria, { readonly code: CodigoErroTrocaDeCategoria }>> {
  const lancamento = await deps.movimentos.buscarPorId(entrada.lancamentoId);
  /* Cancelado não aparece em lista nenhuma: para a troca, ele não existe. */
  if (lancamento === null || lancamento.canceladoEm !== null) {
    return err({ code: "LANCAMENTO_NAO_ENCONTRADO" });
  }

  const alcance = alcanceDaTroca(lancamento);
  if (!alcance.ok) {
    return err({ code: "CATEGORIA_EM_RECEITA" });
  }

  if (entrada.categoriaId !== null) {
    const categoria = await deps.cadastros.buscarCategoria(entrada.categoriaId);
    if (categoria === null || categoria.arquivadaEm !== null) {
      return err({ code: "CATEGORIA_NAO_ENCONTRADA" });
    }
  }

  await deps.transacao.executar((repos) => gravar(repos, lancamento, entrada.categoriaId));
  return ok({ alcance: alcance.value, categoriaId: entrada.categoriaId });
}

/**
 * As três escritas, uma por alcance. Os ids são conferidos de novo só para o
 * tipo estreitar: `alcanceDaTroca` já decidiu, e decide pelos mesmos dois
 * vínculos, com o do fixo primeiro.
 */
async function gravar(
  repos: RepositoriosTransacionais,
  lancamento: Lancamento,
  categoriaId: string | null,
): Promise<void> {
  if (lancamento.recorrenciaId !== null) {
    await trocarNoFixo(repos, lancamento.recorrenciaId, categoriaId);
    return;
  }
  if (lancamento.compraId !== null) {
    await repos.compras.trocarCategoria(lancamento.compraId, categoriaId);
    return;
  }
  await repos.movimentos.trocarCategoria(lancamento.id, categoriaId);
}

/**
 * O mesmo par de escritas da edição do fixo, com os campos gravados e só a
 * categoria nova. `atualizarOcorrenciasDaSerie` não toca em valor, pagamento
 * nem cancelamento (EDF-02 AC 3), e com o dia igual a data de cada ocorrência
 * também não muda (TRC-03 AC 1).
 */
async function trocarNoFixo(
  repos: RepositoriosTransacionais,
  recorrenciaId: string,
  categoriaId: string | null,
): Promise<void> {
  const encontrada = await repos.recorrencias.buscarComVersoes(recorrenciaId);
  if (encontrada === null) {
    // A chave estrangeira de `movimento.recorrencia_id` impede este caso.
    throw new Error(`a ocorrência aponta para o fixo ${recorrenciaId}, que não existe`);
  }
  const { recorrencia } = encontrada;
  const serie: CamposDaSerie = {
    descricao: recorrencia.descricao,
    diaVencimento: recorrencia.diaVencimento,
    meioPagamentoId: recorrencia.meioPagamentoId,
    categoriaId,
    usuarioId: recorrencia.usuarioId,
  };
  await repos.recorrencias.atualizarSerie(recorrenciaId, serie);
  await repos.movimentos.atualizarOcorrenciasDaSerie(recorrenciaId, serie);
}
