import type { ExclusaoDaParcela } from "@/application/mes/obter-visao-mensal/handler";
import { mensagemDoErro } from "@/lib/erros";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";

/**
 * Os textos de excluir uma compra desta parcela em diante, sem React: o aviso
 * lido dentro do menu antes de confirmar (EXC-02, ACs 2 a 6; EXC-05, AC 5) e o
 * toast depois de excluir (EXC-04, AC 4).
 *
 * O aviso de "nada a excluir" é a mesma frase da recusa do servidor
 * (`NADA_A_EXCLUIR`): a tela e a action não podem dizer coisas diferentes.
 */
export function avisoDaExclusao(descricao: string, exclusao: ExclusaoDaParcela): string {
  if (exclusao.tipo === "NADA") {
    return mensagemDoErro("NADA_A_EXCLUIR");
  }
  const inicio = exclusao.inteira
    ? `Excluir a compra ${descricao} inteira?`
    : `Excluir ${descricao} desta parcela em diante?`;
  const total = formatarBRL(exclusao.totalCentavos);
  const saem =
    exclusao.parcelas === 1
      ? `Sai 1 parcela, em ${formatarCompetencia(exclusao.primeira)}, de ${total}.`
      : `Saem ${exclusao.parcelas} parcelas, de ${formatarCompetencia(exclusao.primeira)} a ${formatarCompetencia(exclusao.ultima)}, somando ${total}.`;
  const partes = [inicio, saem];
  if (exclusao.pagasQueFicam === 1) {
    partes.push("1 parcela já paga fica.");
  } else if (exclusao.pagasQueFicam > 1) {
    partes.push(`${exclusao.pagasQueFicam} parcelas já pagas ficam.`);
  }
  if (!exclusao.inteira) {
    partes.push("As anteriores ficam.");
  }
  return partes.join(" ");
}

/** "1 parcela excluída." ou "<k> parcelas excluídas.". */
export function toastDaExclusao(parcelasExcluidas: number): string {
  return parcelasExcluidas === 1
    ? "1 parcela excluída."
    : `${parcelasExcluidas} parcelas excluídas.`;
}
