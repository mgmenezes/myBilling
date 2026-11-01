import type { MovimentoRepository } from "@/application/ports/repositories";
import {
  addMeses,
  type Competencia,
  projetarProximosMeses,
  type SaldoDoMes,
  saldoPrevistoDaCompetencia,
} from "@/domain";
import { MESES_DE_PROJECAO } from "../obter-visao-mensal/handler";

/**
 * O horizonte do simulador: o saldo previsto do mês aberto e dos doze
 * seguintes, de C a C + 12 (SIM-02, AC 4; SIM-05, AC 5).
 *
 * Cada saldo sai de `saldoPrevistoDaCompetencia`, a mesma função do card
 * "Saldo previsto" e de "Próximos meses": o "antes" que o simulador mostra
 * para abril é o número que abril mostra ao ser aberto. A janela seguinte é
 * lida numa consulta, como na visão mensal (HORIZ-03).
 *
 * Não materializa: a página o faz antes de chamar aqui, como as demais.
 */

export interface DependenciasHorizonteDeSaldos {
  readonly movimentos: MovimentoRepository;
}

export async function obterHorizonteDeSaldos(
  deps: DependenciasHorizonteDeSaldos,
  competencia: Competencia,
): Promise<ReadonlyArray<SaldoDoMes>> {
  const doMes = await deps.movimentos.listarPorCompetencia(competencia);
  const seguintes = await deps.movimentos.listarEntre(
    addMeses(competencia, 1),
    addMeses(competencia, MESES_DE_PROJECAO),
  );
  const futuro = projetarProximosMeses([...doMes, ...seguintes], competencia, MESES_DE_PROJECAO);
  return [
    { competencia, saldo: saldoPrevistoDaCompetencia(doMes, competencia) },
    ...futuro.map(({ competencia: mes, saldo }) => ({ competencia: mes, saldo })),
  ];
}
