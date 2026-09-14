"use server";

import { revalidatePath } from "next/cache";
import { confirmarValor } from "@/application/mes/confirmar-valor/handler";
import { marcarPagamento } from "@/application/mes/marcar-pagamento/handler";
import { type Cents, dataParaCompetencia } from "@/domain";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { criarRepositorios } from "@/infrastructure/container";
import { erroDeAction, mensagemDoErro, type ResultadoAction } from "@/lib/erros";

/**
 * Server Action de pagamento.
 *
 * Vale a mesma disciplina das outras: `requireSession()` na primeira instrução
 * mesmo havendo proxy, e **nada lança para o cliente**.
 *
 * **É aqui que o relógio entra.** O caso de uso recebe a data pronta porque
 * saber que dia é hoje depende de fuso, e fuso é decisão da borda (AD-002). O
 * fuso é explícito, nunca o da máquina.
 *
 * Marcar em outubro uma conta de setembro grava `pagoEm` de outubro, e isso
 * hoje não desloca número nenhum: tanto o eixo caixa quanto o rótulo "vencido"
 * decidem pela **competência**, não por esta data. Passa a importar quando
 * faturas existirem, e aí escolher a data vira item próprio.
 */

const FUSO = "America/Sao_Paulo";

export interface PagamentoGravado {
  readonly lancamentoId: string;
  readonly pagoEm: string | null;
}

export async function alternarPagamento(
  lancamentoId: string,
  pago: boolean,
): Promise<ResultadoAction<PagamentoGravado>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  if (typeof lancamentoId !== "string" || lancamentoId === "") {
    return erroDeAction("VALIDACAO");
  }

  try {
    const resultado = await marcarPagamento(criarRepositorios(), {
      lancamentoId,
      pagoEm: pago ? hoje() : null,
    });
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }

    /*
     * **Duas rotas, não uma.** Marcar pago muda "Ainda não pago" e o saldo no
     * painel, que é outra página. Revalidar só a lista deixaria o indicador
     * mentindo até o próximo carregamento — a divergência entre painel e lista
     * é exatamente o que o DASH-04 existe para impedir.
     */
    revalidatePath("/[competencia]/lancamentos", "page");
    revalidatePath("/[competencia]", "page");

    return { ok: true, data: { lancamentoId, pagoEm: resultado.value.pagoEm } };
  } catch (erro) {
    const correlationId = crypto.randomUUID();
    console.error(`[${correlationId}] falha ao alternar pagamento`, erro);
    return erroDeAction(
      "ERRO_INESPERADO",
      `${mensagemDoErro("ERRO_INESPERADO")} (ref. ${correlationId})`,
    );
  }
}

/**
 * A data de hoje em `'YYYY-MM-DD'`, no fuso da casa.
 *
 * Reusa `dataParaCompetencia` para o ano e o mês porque ela já resolve o fuso
 * sem objeto de data — o dia sai do mesmo `Intl`, pela mesma razão: às 21h de
 * 31/03 em São Paulo, o UTC já é 1º de abril, e usar o dia da máquina gravaria
 * o pagamento no dia seguinte.
 */
function hoje(): string {
  const agora = new Date().toISOString();
  const competencia = dataParaCompetencia(agora, FUSO);
  if (!competencia.ok) {
    throw new Error("não foi possível resolver a data corrente");
  }
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, day: "2-digit" }).formatToParts(
    new Date(agora),
  );
  const dia = partes.find((parte) => parte.type === "day")?.value;
  if (dia === undefined) {
    throw new Error("não foi possível resolver o dia corrente");
  }
  return `${competencia.value}-${dia}`;
}

/**
 * Confirmar quanto a conta realmente veio.
 *
 * Vive ao lado de `alternarPagamento` porque são o mesmo gesto para quem usa —
 * a conta chegou, com este valor, e foi paga — ainda que sejam fatos
 * diferentes para o sistema. Estando juntas, as duas revalidam as mesmas rotas
 * e a lista nunca discorda do painel.
 */
export async function confirmarValorDaOcorrencia(
  lancamentoId: string,
  valorCentavos: number,
): Promise<ResultadoAction<{ readonly valorCentavos: number }>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  try {
    const resultado = await confirmarValor(criarRepositorios(), {
      lancamentoId,
      valor: valorCentavos as Cents,
    });
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }

    revalidatePath("/[competencia]/lancamentos", "page");
    revalidatePath("/[competencia]", "page");

    return { ok: true, data: { valorCentavos: resultado.value.valor } };
  } catch (erro) {
    const correlationId = crypto.randomUUID();
    console.error(`[${correlationId}] falha ao confirmar valor`, erro);
    return erroDeAction(
      "ERRO_INESPERADO",
      `${mensagemDoErro("ERRO_INESPERADO")} (ref. ${correlationId})`,
    );
  }
}

function apenasErroDeSessao(erro: unknown): ErroDeSessao {
  if (erro instanceof ErroDeSessao) {
    return erro;
  }
  throw erro;
}
