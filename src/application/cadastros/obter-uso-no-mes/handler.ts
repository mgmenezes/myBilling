import type { MovimentoRepository, RecorrenciaRepository } from "@/application/ports/repositories";
import {
  MESES_DE_PROJECAO,
  materializarRecorrencias,
} from "@/application/recorrencias/materializar/handler";
import { type Competencia, type UsoNoMes, usoNoMes } from "@/domain";

/**
 * O uso de cada categoria e de cada meio no mês aberto (CADCOL-03).
 *
 * **Materializa antes de contar**, com a mesma chamada e a mesma janela de
 * Lançamentos. Sem isso, abrir Cadastros primeiro num mês nunca aberto contaria
 * zero para a ocorrência de cada fixo, e Lançamentos mostraria mais linhas um
 * clique depois (L-001). A leitura vem depois da materialização, e não em
 * paralelo com ela: em paralelo, ela poderia ler o mês antes das ocorrências.
 *
 * Nenhuma regra mora aqui: quem conta é `usoNoMes`, no domínio.
 */

export interface DependenciasUsoNoMes {
  readonly recorrencias: RecorrenciaRepository;
  readonly movimentos: MovimentoRepository;
}

export async function obterUsoNoMes(
  deps: DependenciasUsoNoMes,
  competencia: Competencia,
): Promise<UsoNoMes> {
  await materializarRecorrencias(deps, competencia, MESES_DE_PROJECAO);
  const [todas, lancamentos] = await Promise.all([
    deps.recorrencias.listarComVersoes(),
    deps.movimentos.listarPorCompetencia(competencia),
  ]);
  return usoNoMes(
    todas.map(({ recorrencia }) => recorrencia),
    lancamentos,
    competencia,
  );
}
