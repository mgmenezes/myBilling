import type {
  CadastroRepository,
  CompraRepository,
  MovimentoRepository,
} from "@/application/ports/repositories";
import {
  addMeses,
  type Competencia,
  type ComprometimentoFuturo,
  type Lancamento,
  projetarProximosMeses,
  type ResumoDoMes,
  resumoMensal,
} from "@/domain";

/**
 * A leitura do mês.
 *
 * Ela devolve **três objetos separados** e nada que os misture: o eixo
 * competência, o eixo caixa e o comprometimento futuro (MOV-03, AC 3). Os
 * dois eixos divergem de verdade — uma fatura paga em março contém compras de
 * fevereiro — e a divergência é informação, não defeito. Somá-los aqui exigiria
 * atravessar a fronteira de objeto, que é o que faz o erro aparecer em revisão.
 *
 * Nenhum total é calculado neste arquivo: `resumoMensal` e
 * `projetarProximosMeses` são do domínio. Aqui só se decide o que ler.
 *
 * **Alcance do eixo caixa nesta fase.** As Saídas somam os lançamentos *desta*
 * competência que já foram pagos. A fórmula completa do design inclui também o
 * pagamento de fatura, que vive em `pagamento_fatura` e não tem repositório
 * nesta feature (a tela de marcar pago e a de conciliação estão fora do MVP).
 * O eixo caixa é, portanto, parcial por escopo — e é por isso que a tela o
 * rotula como caixa em vez de apresentá-lo como o total do mês.
 */

/** Janela fechada da projeção: recorrência sem fim não pode gerar sem limite. */
export const MESES_DE_PROJECAO = 3;

export interface DependenciasVisaoMensal {
  readonly movimentos: MovimentoRepository;
  readonly compras: CompraRepository;
  /** Só para saber quais meios geram fatura: é o que separa o bloco do cartão
   *  dos gastos do mês, e o painel e a lista precisam da mesma resposta. */
  readonly cadastros: CadastroRepository;
}

/** `8/10` e quantas ainda faltam depois desta (PARC-08, AC 7). */
export interface IdentificacaoDeParcela {
  readonly numero: number;
  readonly total: number;
  readonly restantes: number;
}

export interface LancamentoDoMes {
  readonly lancamento: Lancamento;
  /** `null` em tudo que não é parcela de compra parcelada. */
  readonly parcela: IdentificacaoDeParcela | null;
}

export interface VisaoMensal {
  readonly competencia: Competencia;
  readonly competenciaView: ResumoDoMes["competenciaView"];
  readonly caixaView: ResumoDoMes["caixaView"];
  readonly futuro: ReadonlyArray<ComprometimentoFuturo>;
  readonly lancamentos: ReadonlyArray<LancamentoDoMes>;
}

export async function obterVisaoMensal(
  deps: DependenciasVisaoMensal,
  competencia: Competencia,
): Promise<VisaoMensal> {
  const doMes = await deps.movimentos.listarPorCompetencia(competencia);

  // A projeção precisa enxergar as competências seguintes, e a port lê uma
  // competência por vez. A janela é fechada, então o número de consultas é
  // constante (AD-008).
  const seguintes: Lancamento[] = [];
  for (let k = 1; k <= MESES_DE_PROJECAO; k += 1) {
    seguintes.push(...(await deps.movimentos.listarPorCompetencia(addMeses(competencia, k))));
  }

  /* Uma consulta por carregamento de página, não uma por lançamento: a
     pergunta é de pertinência e o conjunto inteiro cabe na memória. */
  const cartoes = await deps.cadastros.idsDeMeiosComFatura();

  const resumo = resumoMensal(doMes, competencia, cartoes);
  const futuro = projetarProximosMeses([...doMes, ...seguintes], competencia, MESES_DE_PROJECAO);

  const compraIds = [
    ...new Set(doMes.map((l) => l.compraId).filter((id): id is string => id !== null)),
  ];
  const totais = await deps.compras.totaisDeParcelas(compraIds);

  return {
    competencia,
    competenciaView: resumo.competenciaView,
    caixaView: resumo.caixaView,
    futuro,
    lancamentos: doMes.map((lancamento) => ({
      lancamento,
      parcela: identificarParcela(lancamento, totais),
    })),
  };
}

function identificarParcela(
  lancamento: Lancamento,
  totais: ReadonlyMap<string, number>,
): IdentificacaoDeParcela | null {
  if (lancamento.compraId === null || lancamento.numeroParcela === null) {
    return null;
  }
  const total = totais.get(lancamento.compraId);
  if (total === undefined) {
    return null;
  }
  return {
    numero: lancamento.numeroParcela,
    total,
    restantes: total - lancamento.numeroParcela,
  };
}
