import type { RepositoriosDaImportacao } from "@/application/ports/repositories";
import {
  addMeses,
  type Competencia,
  type CompraEmCurso,
  type EstadoParaImportacao,
  type Lancamento,
  type Natureza,
  type RecorrenciaVigente,
  valeNaCompetencia,
  versaoVigente,
} from "@/domain";

/**
 * O que o plano de uma aba M precisa saber do banco (design,
 * `EstadoParaImportacao`). Só lê.
 *
 * - **Recorrências que valem em M − 1**: as que gerariam ocorrência no mês
 *   anterior, ou seja, não terminaram antes dele (`valeNaCompetencia`) e já têm
 *   versão nele (`versaoVigente`). O valor que acompanha é o de **M**, porque é
 *   contra ele que a linha da aba decide entre "já existe" e "reajuste"
 *   (IMP-07 AC 3 e 4).
 * - **Compras com parcela em M**: as parcelas não canceladas de M, com o total
 *   de parcelas de cada compra (AC 7 e 11).
 * - **Todas as categorias**, inclusive arquivadas: a arquivada é reativada em
 *   vez de duplicada (IMP-03 AC 9).
 */
export async function carregarEstadoParaImportacao(
  repos: Pick<RepositoriosDaImportacao, "compras" | "movimentos" | "recorrencias" | "cadastros">,
  competencia: Competencia,
): Promise<EstadoParaImportacao> {
  const anterior = addMeses(competencia, -1);

  const vigentes: Array<{ readonly natureza: Natureza; readonly vigente: RecorrenciaVigente }> = [];
  for (const { recorrencia, versoes } of await repos.recorrencias.listarComVersoes()) {
    const emAnterior = versaoVigente(versoes, anterior);
    const periodo = { inicio: recorrencia.competenciaInicio, fim: recorrencia.competenciaFim };
    if (emAnterior === null || !valeNaCompetencia(periodo, anterior)) {
      continue;
    }
    // A versão de M nunca é anterior à de M − 1; o fallback só satisfaz o tipo.
    const emM = versaoVigente(versoes, competencia) ?? emAnterior;
    vigentes.push({
      natureza: recorrencia.natureza,
      vigente: {
        id: recorrencia.id,
        descricao: recorrencia.descricao,
        meioPagamentoId: recorrencia.meioPagamentoId,
        valorEmM: emM.valorPrevisto,
      },
    });
  }
  const daNatureza = (natureza: Natureza) =>
    vigentes.filter((v) => v.natureza === natureza).map((v) => v.vigente);

  const parcelas = (await repos.movimentos.listarPorCompetencia(competencia)).filter(
    (lancamento): lancamento is Lancamento & { readonly compraId: string } =>
      lancamento.compraId !== null,
  );
  const totais = await repos.compras.totaisDeParcelas(parcelas.map((p) => p.compraId));
  const comprasEmCurso: CompraEmCurso[] = parcelas.map((parcela) => ({
    compraId: parcela.compraId,
    descricao: parcela.descricao,
    meioPagamentoId: parcela.meioPagamentoId,
    // `qtd_parcelas` e `numero_parcela` são `not null` em toda parcela, por
    // `CHECK` no banco; o zero é só o piso do tipo, como em `criarCompraParcelada`.
    qtdParcelas: totais.get(parcela.compraId) ?? 0,
    numeroEmM: parcela.numeroParcela ?? 0,
    valorEmM: parcela.valor,
  }));

  return {
    competencia,
    despesasFixasVigentes: daNatureza("DESPESA"),
    receitasFixasVigentes: daNatureza("RECEITA"),
    comprasEmCurso,
    categorias: await repos.cadastros.listarTodasAsCategorias(),
  };
}
