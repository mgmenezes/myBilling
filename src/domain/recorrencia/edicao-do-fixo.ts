import { addMeses, type Competencia, compararCompetencias } from "../shared/competencia";
import type { Cents } from "../shared/money";
import { type DomainError, err, ok, type Result } from "../shared/result";

/**
 * O que salvar o formulário de edição de um fixo faz, decidido sem I/O.
 *
 * A edição tem três alcances diferentes, e a regra os separa para que nenhum
 * vaze para o outro:
 *
 * - **A série** (descrição, dia, meio, categoria e pessoa) vale para o fixo
 *   inteiro, meses passados inclusive (EDF-02 AC 1). Corrigir a categoria de
 *   um fixo importado tem que corrigir outubro também.
 * - **O valor** vale a partir de um mês, como em "Mudar valor" (EDF-03): o que
 *   foi planejado antes continua sendo informação.
 * - **O fim** encerra, reabre ou estende o fixo (EDF-04).
 *
 * Natureza e início não estão aqui de propósito: não são editáveis (EDF-05).
 */

/** Os cinco campos que a edição grava no fixo e em todas as ocorrências. */
export interface CamposDaSerie {
  readonly descricao: string;
  readonly diaVencimento: number;
  readonly meioPagamentoId: string;
  readonly categoriaId: string | null;
  readonly usuarioId: string;
}

export interface FixoAtual extends CamposDaSerie {
  readonly competenciaInicio: Competencia;
  /** Último mês em que vale; `null` = sem fim. */
  readonly competenciaFim: Competencia | null;
  /** O valor que o formulário mostrou: o vigente no mês que a pessoa está vendo. */
  readonly valorNoMesExibido: Cents;
}

export interface FixoEditado extends CamposDaSerie {
  /** Último mês em que vale; `null` = sem fim. */
  readonly competenciaFim: Competencia | null;
  readonly valor: Cents;
  /** Só conta quando o valor muda: é o "Vale a partir de" do formulário. */
  readonly vigenteDesde: Competencia;
}

export type MudancaDoFim =
  | { readonly tipo: "ENCERRAR"; readonly aPartirDe: Competencia }
  | { readonly tipo: "REABRIR" }
  | { readonly tipo: "ESTENDER"; readonly competenciaFim: Competencia };

export interface PlanoDeEdicao {
  /** `null` quando nenhum dos cinco campos mudou. */
  readonly serie: CamposDaSerie | null;
  /** `null` quando o valor é o mesmo do mês exibido. */
  readonly vigencia: { readonly vigenteDesde: Competencia; readonly valor: Cents } | null;
  /** `null` quando o fim pedido é o fim atual. */
  readonly fim: MudancaDoFim | null;
}

const CAMPOS_DA_SERIE: ReadonlyArray<keyof CamposDaSerie> = [
  "descricao",
  "diaVencimento",
  "meioPagamentoId",
  "categoriaId",
  "usuarioId",
];

/**
 * Devolve o plano da edição, ou `PERIODO_INVALIDO` quando o fim ou a vigência
 * nova cai antes do início do fixo. `detalhes.campo` diz qual dos dois, para a
 * recusa chegar ao campo certo do formulário.
 *
 * A vigência só é conferida quando o valor muda: o "Vale a partir de" só existe
 * nesse caso (EDF-03 AC 1), e recusar um mês que o formulário nem mostrou
 * impediria editar a descrição de um fixo visto antes de começar.
 */
export function planejarEdicaoDoFixo(
  atual: FixoAtual,
  editado: FixoEditado,
): Result<PlanoDeEdicao, DomainError> {
  if (
    editado.competenciaFim !== null &&
    compararCompetencias(editado.competenciaFim, atual.competenciaInicio) < 0
  ) {
    return err({ code: "PERIODO_INVALIDO", detalhes: { campo: "competenciaFim" } });
  }

  const valorMudou = editado.valor !== atual.valorNoMesExibido;
  if (valorMudou && compararCompetencias(editado.vigenteDesde, atual.competenciaInicio) < 0) {
    return err({ code: "PERIODO_INVALIDO", detalhes: { campo: "vigenteDesde" } });
  }

  const serieMudou = CAMPOS_DA_SERIE.some((campo) => atual[campo] !== editado[campo]);
  return ok({
    serie: serieMudou
      ? {
          descricao: editado.descricao,
          diaVencimento: editado.diaVencimento,
          meioPagamentoId: editado.meioPagamentoId,
          categoriaId: editado.categoriaId,
          usuarioId: editado.usuarioId,
        }
      : null,
    vigencia: valorMudou ? { vigenteDesde: editado.vigenteDesde, valor: editado.valor } : null,
    fim: mudancaDoFim(atual.competenciaFim, editado.competenciaFim),
  });
}

/**
 * O fim atual contra o pedido, ambos "último mês em que vale". Encurtar passa
 * pelo encerramento, que apaga as ocorrências não pagas depois do fim novo;
 * estender só move o fim, e a materialização cria os meses que faltam.
 */
function mudancaDoFim(atual: Competencia | null, pedido: Competencia | null): MudancaDoFim | null {
  if (pedido === null) {
    return atual === null ? null : { tipo: "REABRIR" };
  }
  if (atual === null || compararCompetencias(pedido, atual) < 0) {
    return { tipo: "ENCERRAR", aPartirDe: addMeses(pedido, 1) };
  }
  if (compararCompetencias(pedido, atual) > 0) {
    return { tipo: "ESTENDER", competenciaFim: pedido };
  }
  return null;
}
