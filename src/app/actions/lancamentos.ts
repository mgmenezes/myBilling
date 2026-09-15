"use server";

import { revalidatePath } from "next/cache";
import { cancelarLancamento as cancelarUso } from "@/application/mes/cancelar-lancamento/handler";
import { criarLancamentoAvulso as criarAvulso } from "@/application/mes/criar-lancamento-avulso/handler";
import { entradaLancamentoAvulsoSchema } from "@/application/schemas/lancamento-avulso.schema";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { criarRepositorios } from "@/infrastructure/container";
import { erroDeAction, mensagemDoErro, type ResultadoAction } from "@/lib/erros";

/**
 * Server Actions do lançamento avulso.
 *
 * Mesma forma de `compras.ts`, e as três regras valem igual: `requireSession()`
 * é a primeira instrução mesmo havendo proxy, o payload é revalidado no servidor
 * com o **mesmo** schema que o formulário usou, e nada lança para o cliente —
 * falha não prevista vira `ERRO_INESPERADO` com identificador de correlação, e
 * stack trace não chega ao navegador.
 */

export interface LancamentoGravado {
  readonly id: string;
  readonly descricao: string;
  readonly valorCentavos: number;
  readonly competencia: string;
  readonly natureza: "DESPESA" | "RECEITA";
  readonly pago: boolean;
}

export async function criarLancamentoAvulso(
  payload: unknown,
): Promise<ResultadoAction<LancamentoGravado>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaLancamentoAvulsoSchema.safeParse(payload);
  if (!validado.success) {
    return erroDeValidacao(validado.error.issues);
  }

  try {
    const resultado = await criarAvulso(criarRepositorios(), validado.data);
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }

    /* A competência informada pode não ser a que a pessoa está vendo: quem abre
       março e lança algo de abril precisa que abril também seja revalidado. */
    revalidarMes(validado.data.competencia);

    return {
      ok: true,
      data: {
        id: resultado.value.id,
        descricao: resultado.value.descricao,
        valorCentavos: resultado.value.valor,
        competencia: resultado.value.competencia,
        natureza: resultado.value.natureza === "RECEITA" ? "RECEITA" : "DESPESA",
        pago: resultado.value.pagoEm !== null,
      },
    };
  } catch (erro) {
    return falhaInesperada("criar lançamento avulso", erro);
  }
}

export interface LancamentoExcluido {
  readonly id: string;
  readonly competencia: string;
  /** `false` quando ele já estava cancelado. Não é erro (AVUL-03, AC 4). */
  readonly alterou: boolean;
}

export async function cancelarLancamento(
  lancamentoId: unknown,
): Promise<ResultadoAction<LancamentoExcluido>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  if (typeof lancamentoId !== "string" || lancamentoId === "") {
    return {
      ok: false,
      erro: {
        code: "VALIDACAO",
        mensagem: mensagemDoErro("VALIDACAO"),
        campos: { lancamentoId: "Lançamento inválido." },
      },
    };
  }

  try {
    const resultado = await cancelarUso(criarRepositorios(), {
      lancamentoId,
      /* O relógio é da borda. O caso de uso o recebe para ser determinístico. */
      agora: new Date().toISOString(),
    });
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }

    /* Revalida mesmo quando nada mudou: a tela de quem clicou duas vezes
       precisa refletir o estado real, e o custo é uma releitura. */
    revalidarMes(resultado.value.competencia);

    return { ok: true, data: resultado.value };
  } catch (erro) {
    return falhaInesperada("cancelar lançamento", erro);
  }
}

/** Painel e lista leem o mesmo mês: revalidar um só deixaria o outro mentindo. */
function revalidarMes(competencia: string): void {
  revalidatePath(`/${competencia}`);
  revalidatePath(`/${competencia}/lancamentos`);
}

function erroDeValidacao(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): ResultadoAction<never> {
  const campos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = issue.path.join(".");
    campos[campo] ??= issue.message;
  }
  return {
    ok: false,
    erro: { code: "VALIDACAO", mensagem: mensagemDoErro("VALIDACAO"), campos },
  };
}

function falhaInesperada(operacao: string, erro: unknown): ResultadoAction<never> {
  const correlationId = crypto.randomUUID().slice(0, 8);
  // O detalhe fica aqui, no servidor, e só aqui.
  console.error(`[${correlationId}] falha ao ${operacao}`, erro);
  return erroDeAction(
    "ERRO_INESPERADO",
    `${mensagemDoErro("ERRO_INESPERADO")} Se continuar, informe o código ${correlationId}.`,
  );
}

/** Só erro de sessão vira envelope; qualquer outra falha segue para o `catch`. */
function apenasErroDeSessao(erro: unknown): ErroDeSessao {
  if (erro instanceof ErroDeSessao) {
    return erro;
  }
  throw erro;
}
