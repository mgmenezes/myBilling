"use server";

import { revalidatePath } from "next/cache";
import { criarRecorrencia as criarRecorrenciaUso } from "@/application/recorrencias/criar-recorrencia/handler";
import { encerrarRecorrencia as encerrarUso } from "@/application/recorrencias/encerrar/handler";
import { registrarVersao as registrarVersaoUso } from "@/application/recorrencias/registrar-versao/handler";
import {
  entradaEncerramentoSchema,
  entradaRecorrenciaSchema,
  entradaVigenciaSchema,
} from "@/application/schemas/recorrencia.schema";
import type { Cents, Competencia } from "@/domain";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { erroDeAction, mensagemDoErro, type ResultadoAction } from "@/lib/erros";

/**
 * Server Actions de recorrência.
 *
 * Mesma disciplina das outras: `requireSession()` na primeira instrução mesmo
 * havendo proxy, payload revalidado no servidor com o mesmo schema do
 * formulário, e nada lança para o cliente.
 *
 * **Três rotas são revalidadas, não uma.** Criar, reajustar ou encerrar um
 * gasto fixo muda a área que os administra, a lista de lançamentos do mês e os
 * indicadores do painel. Revalidar só a primeira deixaria as outras duas
 * mentindo até o próximo carregamento — a divergência entre painel e lista é o
 * que `DASH-04` existe para impedir.
 */

const FUSO = "America/Sao_Paulo";

export interface RecorrenciaGravada {
  readonly id: string;
  readonly descricao: string;
}

function repositorios() {
  /*
   * A port `RecorrenciaRepository` não está no container, que declara as três
   * do MVP. A classe concreta é montada aqui, como em `categorias.ts` — subir
   * a quarta port ao container daria a todo caso de uso de mês um acesso que
   * nenhum deles usa.
   */
  return { ...criarRepositorios(), recorrencias: new RecorrenciaRepositoryDrizzle(db()) };
}

function erroDeValidacao(mensagem: string, campo: string): ResultadoAction<never> {
  return { ok: false, erro: { code: "VALIDACAO", mensagem, campos: { [campo]: mensagem } } };
}

export async function criarRecorrencia(
  payload: unknown,
): Promise<ResultadoAction<RecorrenciaGravada>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaRecorrenciaSchema.safeParse(payload);
  if (!validado.success) {
    const issue = validado.error.issues[0];
    return erroDeValidacao(
      issue?.message ?? mensagemDoErro("VALIDACAO"),
      issue?.path.join(".") ?? "descricao",
    );
  }

  return executar<RecorrenciaGravada>(async () => {
    const d = validado.data;
    const resultado = await criarRecorrenciaUso(repositorios(), {
      descricao: d.descricao,
      natureza: d.natureza,
      categoriaId: d.categoriaId,
      usuarioId: d.usuarioId,
      meioPagamentoId: d.meioPagamentoId,
      competenciaInicio: d.competenciaInicio as Competencia,
      competenciaFim: d.competenciaFim as Competencia | null,
      diaVencimento: d.diaVencimento,
      valorInicial: d.valorCentavos as Cents,
    });
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }
    return {
      ok: true as const,
      data: { id: resultado.value.id, descricao: resultado.value.descricao },
    };
  });
}

export async function registrarNovaVigencia(payload: unknown): Promise<ResultadoAction<null>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaVigenciaSchema.safeParse(payload);
  if (!validado.success) {
    const issue = validado.error.issues[0];
    return erroDeValidacao(
      issue?.message ?? mensagemDoErro("VALIDACAO"),
      issue?.path.join(".") ?? "valorCentavos",
    );
  }

  return executar<null>(async () => {
    const resultado = await registrarVersaoUso(repositorios(), {
      recorrenciaId: validado.data.recorrenciaId,
      vigenteDesde: validado.data.vigenteDesde as Competencia,
      valor: validado.data.valorCentavos as Cents,
    });
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }
    return { ok: true as const, data: null };
  });
}

export async function encerrarRecorrencia(payload: unknown): Promise<ResultadoAction<null>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaEncerramentoSchema.safeParse(payload);
  if (!validado.success) {
    const issue = validado.error.issues[0];
    return erroDeValidacao(
      issue?.message ?? mensagemDoErro("VALIDACAO"),
      issue?.path.join(".") ?? "aPartirDe",
    );
  }

  return executar<null>(async () => {
    const resultado = await encerrarUso(repositorios(), {
      recorrenciaId: validado.data.recorrenciaId,
      aPartirDe: validado.data.aPartirDe as Competencia,
      /* O instante é resolvido aqui, na borda: o caso de uso não conhece
         relógio nem fuso (AD-002). */
      agora: new Date().toLocaleString("sv-SE", { timeZone: FUSO }).replace(" ", "T"),
    });
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }
    return { ok: true as const, data: null };
  });
}

/**
 * O invólucro comum: revalida as três rotas no sucesso e converte falha não
 * prevista em `ERRO_INESPERADO` com identificador de correlação. Stack trace
 * não atravessa (UI-02, AC 8).
 */
async function executar<T>(
  operacao: () => Promise<ResultadoAction<T>>,
): Promise<ResultadoAction<T>> {
  try {
    const resultado = await operacao();
    if (resultado.ok) {
      revalidatePath("/[competencia]/fixos", "page");
      revalidatePath("/[competencia]/lancamentos", "page");
      revalidatePath("/[competencia]", "page");
    }
    return resultado;
  } catch (erro) {
    const correlationId = crypto.randomUUID();
    console.error(`[${correlationId}] falha em recorrência`, erro);
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
