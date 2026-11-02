import { MAX_PARCELAS, type Simulacao } from "@/domain";
import { formatarCompetencia, nomeDoMes } from "@/lib/formatar";

/**
 * As frases de "Dá pra comprar?" (SIM-02, ACs 3 e 5 a 9), sem React.
 *
 * O veredito são frases do dono, literais. Ele culpa a compra só pelo mês que
 * ela derruba: o mês que já faltava aparece na linha como "já estava no
 * vermelho" e, quando é o único vermelho, a frase diz que cabe e que ele já
 * estava assim antes. "Enxergo até" sai em frase própria quando a compra passa
 * do horizonte, porque é outra informação: não é sobre caber, é sobre até onde
 * o app viu.
 *
 * Vive fora do componente porque a landing roda a mesma resposta (JANO-03):
 * o pacote `site/simulador.js` importa daqui, e uma frase só não diverge.
 */

export interface EntradaDoVeredito {
  readonly simulacao: Simulacao;
  /** O número de parcelas pedido: o `n` do "Em 10x não cabe". */
  readonly qtdParcelas: number;
  /** O menor parcelamento que cabe, ou `null` quando nenhum cabe. */
  readonly menorQueCabe: number | null;
  /** O mês aberto: os meses de outro ano saem com "de <ano>". */
  readonly competenciaAberta: string;
}

/** "abril", ou "janeiro de 2027" quando o ano não é o do mês aberto. */
function mesNoVeredito(competencia: string, competenciaAberta: string): string {
  const nome = nomeDoMes(competencia).toLowerCase();
  return competencia.slice(0, 4) === competenciaAberta.slice(0, 4)
    ? nome
    : `${nome} de ${competencia.slice(0, 4)}`;
}

/** "abril", "abril e maio", "março, abril e maio". */
function listarMeses(meses: ReadonlyArray<string>): string {
  if (meses.length <= 1) {
    return meses.join("");
  }
  return `${meses.slice(0, -1).join(", ")} e ${meses[meses.length - 1]}`;
}

function iniciarComMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function textoDoVeredito({
  simulacao,
  qtdParcelas,
  menorQueCabe,
  competenciaAberta,
}: EntradaDoVeredito): string {
  const nome = (competencia: string) => mesNoVeredito(competencia, competenciaAberta);
  if (simulacao.cabe) {
    const jaFaltavam = simulacao.linhas.filter((linha) => linha.jaFaltava);
    if (jaFaltavam.length === 0) {
      return "Cabe. Nenhum mês fica no vermelho.";
    }
    const verbo = jaFaltavam.length === 1 ? "estava" : "estavam";
    const meses = listarMeses(jaFaltavam.map((linha) => nome(linha.competencia)));
    return `Cabe. ${iniciarComMaiuscula(meses)} já ${verbo} no vermelho antes desta compra.`;
  }
  const derrubados = simulacao.linhas.filter((linha) => !linha.jaFaltava && linha.saldoDepois < 0);
  const verbo = derrubados.length === 1 ? "fica" : "ficam";
  const meses = listarMeses(derrubados.map((linha) => nome(linha.competencia)));
  const saida =
    menorQueCabe === null
      ? `Não cabe em nenhum parcelamento até ${MAX_PARCELAS}x.`
      : `Em ${menorQueCabe}x cabe.`;
  return `Em ${qtdParcelas}x não cabe: ${meses} ${verbo} no vermelho. ${saida}`;
}

/** "Enxergo até Outubro de 2027.", ou `null` quando toda parcela está no horizonte. */
export function textoEnxergaAte(simulacao: Simulacao): string | null {
  return simulacao.parcelasForaDoHorizonte > 0
    ? `Enxergo até ${formatarCompetencia(simulacao.enxergaAte)}.`
    : null;
}
