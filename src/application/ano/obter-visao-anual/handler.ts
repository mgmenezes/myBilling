import type { CadastroRepository, MovimentoRepository } from "@/application/ports/repositories";
import {
  type Cents,
  type Competencia,
  criarCompetencia,
  resumoMensal,
  somar,
  type TotaisPorBloco,
  ZERO_CENTS,
} from "@/domain";

/**
 * O acumulado do ano nos três blocos, para a home.
 *
 * **Doze leituras em paralelo, e não uma consulta agregada.** A port lê uma
 * competência por vez, e o precedente de varrer janela fixa assim já existe em
 * `obterVisaoMensal` (AD-008). A diferença é que lá o laço é sequencial: aqui
 * as doze saem juntas, porque nenhuma depende do resultado da outra e a home
 * existe para a pessoa sair dela em menos de um segundo.
 *
 * O SQL agregado é a troca a fazer quando o ano ficar lento — e é onde o teste
 * de concordância entre o SQL e a função pura entra. Trocar agora seria pagar
 * esse teste antes de existir o problema que ele protege.
 *
 * **Quem soma é `resumoMensal`, uma vez por competência.** Reimplementar a
 * soma aqui criaria uma segunda definição de "despesa somável do mês", e o
 * número da home passaria a poder divergir do número do painel. `resumoMensal`
 * já aplica cancelado, natureza e competência, e já reparte os blocos pela
 * cascata de `blocoDoLancamento`.
 */

export interface DependenciasVisaoAnual {
  readonly movimentos: MovimentoRepository;
  /** Só para saber quais meios geram fatura: é o que separa Cartão de Avulsos. */
  readonly cadastros: CadastroRepository;
}

export interface VisaoAnual {
  readonly ano: number;
  readonly competencias: ReadonlyArray<Competencia>;
  readonly totais: TotaisPorBloco;
  readonly totalGastos: Cents;
}

/** Janeiro a dezembro do ano pedido, já validadas pelo construtor do domínio. */
export function competenciasDoAno(ano: number): ReadonlyArray<Competencia> {
  return Array.from({ length: 12 }, (_, indice) => {
    const mes = String(indice + 1).padStart(2, "0");
    const resultado = criarCompetencia(`${ano}-${mes}`);
    if (!resultado.ok) {
      throw new Error(`ano fora da faixa de competência: ${ano}`);
    }
    return resultado.value;
  });
}

export async function obterVisaoAnual(
  deps: DependenciasVisaoAnual,
  ano: number,
): Promise<VisaoAnual> {
  const competencias = competenciasDoAno(ano);

  /*
   * O par competência-lançamentos é montado na origem, e não zipado por índice
   * depois. Indexar dois arranjos em paralelo sob `noUncheckedIndexedAccess`
   * obrigaria a um `?? []` que nenhum teste consegue alcançar — e ramo
   * inalcançável é buraco permanente na cobertura, não defesa.
   */
  const [cartoes, meses] = await Promise.all([
    deps.cadastros.idsDeMeiosComFatura(),
    Promise.all(
      competencias.map(async (competencia) => ({
        competencia,
        lancamentos: await deps.movimentos.listarPorCompetencia(competencia),
      })),
    ),
  ]);

  let fixos = ZERO_CENTS;
  let cartao = ZERO_CENTS;
  let avulsos = ZERO_CENTS;
  let totalGastos = ZERO_CENTS;

  for (const { competencia, lancamentos } of meses) {
    const { competenciaView } = resumoMensal(lancamentos, competencia, cartoes);
    fixos = somar(fixos, competenciaView.fixos);
    cartao = somar(cartao, competenciaView.cartao);
    avulsos = somar(avulsos, competenciaView.avulsos);
    totalGastos = somar(totalGastos, competenciaView.totalGastos);
  }

  return { ano, competencias, totais: { fixos, cartao, avulsos }, totalGastos };
}
