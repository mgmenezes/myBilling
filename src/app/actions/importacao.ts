"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import {
  gravarImportacao,
  type ResumoDaImportacao,
} from "@/application/importacao/gravar-importacao/handler";
import {
  type EntradaDaImportacao,
  type ErroImportacao,
  preverImportacao,
} from "@/application/importacao/prever-importacao/handler";
import type { RepositoriosDaImportacao } from "@/application/ports/repositories";
import {
  type EntradaPreviaImportacaoValidada,
  entradaGravacaoImportacaoSchema,
  entradaPreviaImportacaoSchema,
} from "@/application/schemas/importacao.schema";
import type { Competencia, PlanoDeImportacao } from "@/domain";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { ImportacaoRepositoryDrizzle } from "@/infrastructure/db/repositories/importacao.repository";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { TransacaoDaImportacaoDrizzle } from "@/infrastructure/db/transacao-da-importacao";
import { erroDeAction, mensagemDoErro, type ResultadoAction } from "@/lib/erros";
import { formatarCompetencia } from "@/lib/formatar";

/**
 * Server Actions da importação da planilha (design, Decisão 2).
 *
 * A mesma disciplina de `compras.ts`: `requireSession()` na primeira
 * instrução (IMP-06 AC 4), o payload revalidado no servidor (AC 6), e nada
 * lança para o cliente. A falha não prevista vira `ERRO_INESPERADO` com um
 * identificador de correlação, sem stack trace (AC 5).
 *
 * As duas recebem o **mesmo** payload: o texto do arquivo, a competência
 * confirmada e as decisões do passo 2. O plano é recalculado no servidor nas
 * duas; a gravação faz isso dentro da transação, depois da trava.
 */

/**
 * A prévia como o cliente a recebe: o plano sem `operacoes`, que é o que a
 * gravação recalcula e nunca sai do servidor, e sem `Map`, que não atravessa
 * a fronteira. Todos os campos são registros e listas simples.
 */
export interface PreviaParaATela extends Omit<PlanoDeImportacao, "operacoes"> {
  /** A seguinte à última importada; `null` antes da primeira importação. */
  readonly competenciaEsperada: Competencia | null;
}

export async function previaDaPlanilha(
  payload: unknown,
): Promise<ResultadoAction<PreviaParaATela>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaPreviaImportacaoSchema.safeParse(payload);
  if (!validado.success) {
    return erroDeValidacao(validado.error);
  }

  try {
    const resultado = await preverImportacao(repositorios(), paraEntrada(validado.data));
    if (!resultado.ok) {
      return erroDaImportacao(resultado.error);
    }
    const { plano, competenciaEsperada } = resultado.value;
    return {
      ok: true,
      data: {
        competencia: plano.competencia,
        competenciaEsperada,
        conferencia: plano.conferencia,
        pendencias: plano.pendencias,
        linhas: plano.linhas,
        naoLidas: plano.naoLidas,
        deixamDeValer: plano.deixamDeValer,
        naoAparecem: plano.naoAparecem,
        quantidadeAImportar: plano.quantidadeAImportar,
      },
    };
  } catch (erro) {
    return erroInesperado("falha ao montar a prévia da planilha", erro);
  }
}

export async function importarPlanilha(
  payload: unknown,
): Promise<ResultadoAction<ResumoDaImportacao>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaGravacaoImportacaoSchema.safeParse(payload);
  if (!validado.success) {
    return erroDeValidacao(validado.error);
  }

  try {
    const resultado = await gravarImportacao(new TransacaoDaImportacaoDrizzle(db()), {
      ...paraEntrada(validado.data),
      confirmouDivergencia: validado.data.confirmouDivergencia,
      usuarioId: sessao.id,
      /* O instante é resolvido aqui, na borda: o caso de uso não conhece
         relógio (AD-002). */
      agora: new Date().toISOString(),
    });
    if (!resultado.ok) {
      return erroDaImportacao(resultado.error);
    }

    // Painel, lista e "Todo mês" da competência importada mostram o conteúdo
    // sem recarga manual (IMP-06 AC 3).
    const competencia = resultado.value.competencia;
    revalidatePath(`/${competencia}`);
    revalidatePath(`/${competencia}/lancamentos`);
    revalidatePath(`/${competencia}/fixos`);

    return { ok: true, data: resultado.value };
  } catch (erro) {
    return erroInesperado("falha ao gravar a importação da planilha", erro);
  }
}

/** Os cinco repositórios sobre o banco, sem transação: a prévia só lê. */
function repositorios(): RepositoriosDaImportacao {
  const banco = db();
  return {
    ...criarRepositorios(banco),
    recorrencias: new RecorrenciaRepositoryDrizzle(banco),
    importacoes: new ImportacaoRepositoryDrizzle(banco),
  };
}

/** As decisões chegam como registros, que é o que atravessa a rede; o caso de uso usa `Map`. */
function paraEntrada(dados: EntradaPreviaImportacaoValidada): EntradaDaImportacao {
  return {
    nomeArquivo: dados.nomeArquivo,
    conteudo: dados.conteudo,
    competencia: dados.competencia as Competencia,
    decisoes: {
      meios: new Map(Object.entries(dados.decisoes.meios)),
      entradas: new Map(Object.entries(dados.decisoes.entradas)),
    },
  };
}

/** As chaves `{…}` das mensagens são compostas aqui, a partir de `detalhes`. */
function erroDaImportacao(erro: ErroImportacao): ResultadoAction<never> {
  const mensagem = mensagemDoErro(erro.code);
  switch (erro.code) {
    case "PLANILHA_BLOCO_AUSENTE":
      return erroDeAction(erro.code, mensagem.replace("{bloco}", String(erro.detalhes?.bloco)));
    case "IMPORTACAO_FORA_DE_ORDEM":
      return erroDeAction(
        erro.code,
        mensagem.replace("{competencia}", formatarCompetencia(String(erro.detalhes?.esperada))),
      );
    default:
      return erroDeAction(erro.code);
  }
}

function erroDeValidacao(erro: ZodError): ResultadoAction<never> {
  const campos: Record<string, string> = {};
  for (const issue of erro.issues) {
    campos[issue.path.join(".")] ??= issue.message;
  }
  return { ok: false, erro: { code: "VALIDACAO", mensagem: mensagemDoErro("VALIDACAO"), campos } };
}

function erroInesperado(contexto: string, erro: unknown): ResultadoAction<never> {
  const correlationId = crypto.randomUUID().slice(0, 8);
  // O detalhe fica aqui, no servidor, e só aqui.
  console.error(`[${correlationId}] ${contexto}`, erro);
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
