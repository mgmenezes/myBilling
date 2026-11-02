import type {
  CadastroRepository,
  CompraRepository,
  CompraVigenteComQtd,
  MovimentoRepository,
} from "@/application/ports/repositories";
import {
  addMeses,
  type BlocoDoMes,
  blocoDoLancamento,
  type Competencia,
  type CompraVigente,
  type ComprometimentoFuturo,
  type Lancamento,
  planejarExclusaoDestaEmDiante,
  projetarProximosMeses,
  type ResumoDoMes,
  restantesDepois,
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

/**
 * Janela fechada da projeção e da materialização: recorrência sem fim não pode
 * gerar sem limite. Doze meses porque é até onde o simulador de compra precisa
 * enxergar (HORIZ-01); a Visão geral exibe só as primeiras linhas, por uma
 * constante própria dela (HORIZ-02).
 */
export const MESES_DE_PROJECAO = 12;

export interface DependenciasVisaoMensal {
  readonly movimentos: MovimentoRepository;
  readonly compras: CompraRepository;
  /** Só para saber quais meios geram fatura: é o que separa o bloco do cartão
   *  dos gastos do mês, e o painel e a lista precisam da mesma resposta. */
  readonly cadastros: CadastroRepository;
}

/**
 * O que sai se a pessoa excluir desta parcela em diante, calculado na carga da
 * página pela mesma função que o servidor usa para gravar (EXC-02). `NADA`
 * quando todo o alcance já foi pago (EXC-05 AC 5).
 */
export type ExclusaoDaParcela =
  | { readonly tipo: "NADA" }
  | {
      readonly tipo: "PLANO";
      /** Quantas saem: o `<k>` do aviso. */
      readonly parcelas: number;
      /** Competência `'YYYY-MM'` da primeira e da última que saem. */
      readonly primeira: string;
      readonly ultima: string;
      /** Soma dos valores gravados das que saem. */
      readonly totalCentavos: number;
      /** Pagas de número ≥ a escolhida, que ficam: o `<p>` do aviso. */
      readonly pagasQueFicam: number;
      /** Nenhuma parcela vigente antes da escolhida: "Excluir a compra ... inteira?". */
      readonly inteira: boolean;
    };

/**
 * `8/10`, quantas parcelas não canceladas faltam depois desta (PARC-08, AC 7;
 * EXC-04 AC 5) e o aviso de exclusão dela.
 */
export interface IdentificacaoDeParcela {
  readonly numero: number;
  readonly total: number;
  readonly restantes: number;
  readonly exclusao: ExclusaoDaParcela;
}

export interface LancamentoDoMes {
  readonly lancamento: Lancamento;
  /** `null` em tudo que não é parcela de compra parcelada. */
  readonly parcela: IdentificacaoDeParcela | null;
  /**
   * Em qual bloco da lista a linha aparece. Decidido **aqui**, pela mesma
   * função que `resumoMensal` usa, e não na tela.
   *
   * É o que torna a divergência entre painel e lista impossível de escrever, em
   * vez de apenas improvável: a tabela nunca recebe o conjunto de cartões, logo
   * não tem como classificar diferente. Receita e investimento também recebem
   * bloco, mas nenhum total de despesa os soma.
   */
  readonly bloco: BlocoDoMes;
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

  // A projeção precisa enxergar as competências seguintes. A janela inteira
  // sai numa consulta (HORIZ-03, AC 4): um laço de `listarPorCompetencia`
  // seria uma ida ao banco por mês da janela a cada abertura de página.
  const seguintes = await deps.movimentos.listarEntre(
    addMeses(competencia, 1),
    addMeses(competencia, MESES_DE_PROJECAO),
  );

  /* Uma consulta por carregamento de página, não uma por lançamento: a
     pergunta é de pertinência e o conjunto inteiro cabe na memória. */
  const cartoes = await deps.cadastros.idsDeMeiosComFatura();

  const resumo = resumoMensal(doMes, competencia, cartoes);
  const futuro = projetarProximosMeses([...doMes, ...seguintes], competencia, MESES_DE_PROJECAO);

  const compraIds = [
    ...new Set(doMes.map((l) => l.compraId).filter((id): id is string => id !== null)),
  ];
  const vigentes = await deps.compras.parcelasVigentes(compraIds);

  return {
    competencia,
    competenciaView: resumo.competenciaView,
    caixaView: resumo.caixaView,
    futuro,
    lancamentos: doMes.map((lancamento) => ({
      lancamento,
      parcela: identificarParcela(lancamento, vigentes),
      bloco: blocoDoLancamento(lancamento, cartoes),
    })),
  };
}

function identificarParcela(
  lancamento: Lancamento,
  vigentes: ReadonlyMap<string, CompraVigenteComQtd>,
): IdentificacaoDeParcela | null {
  if (lancamento.compraId === null || lancamento.numeroParcela === null) {
    return null;
  }
  const compra = vigentes.get(lancamento.compraId);
  if (compra === undefined) {
    return null;
  }
  return {
    numero: lancamento.numeroParcela,
    total: compra.qtdParcelas,
    restantes: restantesDepois(compra.parcelas, lancamento.numeroParcela),
    exclusao: exclusaoDaParcela(compra, lancamento.numeroParcela),
  };
}

/**
 * A recusa do domínio vira `NADA`. `PARCELA_INICIAL_INVALIDA` não chega aqui:
 * a parcela veio da lista de não canceladas do mês, e a mesma leitura a traz
 * entre as vigentes.
 */
function exclusaoDaParcela(compra: CompraVigente, numero: number): ExclusaoDaParcela {
  const plano = planejarExclusaoDestaEmDiante(compra, numero);
  if (!plano.ok) {
    return { tipo: "NADA" };
  }
  return {
    tipo: "PLANO",
    parcelas: plano.value.numeros.length,
    primeira: plano.value.primeira,
    ultima: plano.value.ultima,
    totalCentavos: plano.value.total,
    pagasQueFicam: plano.value.pagasQueFicam,
    inteira: plano.value.inteira,
  };
}
