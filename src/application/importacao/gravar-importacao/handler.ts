import { criarCompraParcelada } from "@/application/compras/criar-compra-parcelada/handler";
import type {
  RepositoriosDaImportacao,
  TransacaoDaImportacao,
} from "@/application/ports/repositories";
import { criarRecorrencia } from "@/application/recorrencias/criar-recorrencia/handler";
import { encerrarRecorrencia } from "@/application/recorrencias/encerrar/handler";
import { registrarVersao } from "@/application/recorrencias/registrar-versao/handler";
import {
  addMeses,
  type Competencia,
  err,
  type OperacoesDaImportacao,
  ok,
  type Result,
  reprecificarAPartirDe,
} from "@/domain";
import {
  type EntradaDaImportacao,
  type ErroImportacao,
  preverImportacao,
} from "../prever-importacao/handler";

/**
 * Gravar uma aba (design, Decisões 1 e 2): dentro da transação da importação,
 * depois da trava, o plano é **recalculado** pela mesma função da prévia, e
 * só então executado. O navegador nunca envia o plano (IMP-06 AC 6).
 *
 * Nenhuma regra de reajuste, encerramento ou parcela é reescrita aqui: o plano
 * é executado pelos casos de uso que já existem, com os repositórios da
 * transação, na ordem categorias → recorrências → reajustes → encerramentos →
 * compras → reprecificações → avulsos → registro. Ou tudo fica, ou nada fica
 * (IMP-06 AC 1 e 2).
 */

export interface EntradaGravarImportacao extends EntradaDaImportacao {
  readonly confirmouDivergencia: boolean;
  /** Quem está logado e importa: a pessoa de todos os lançamentos (IMP-03 AC 1). */
  readonly usuarioId: string;
  /** Instante do encerramento das recorrências, resolvido na borda (AD-002). */
  readonly agora: string;
}

export interface ResumoDaImportacao {
  readonly competencia: Competencia;
  readonly proxima: Competencia;
  /** Recorrências novas + compras novas + avulsos. */
  readonly criados: number;
  /** Reajustes + reprecificações. */
  readonly alterados: number;
  readonly encerrados: number;
}

/**
 * Leva um erro da importação para fora de `executar`. Lançar é o que faz a
 * transação desfazer tudo; o handler a captura e devolve como `err`.
 */
class ImportacaoAbortada extends Error {
  constructor(readonly erro: ErroImportacao) {
    super(erro.code);
    this.name = "ImportacaoAbortada";
  }
}

export async function gravarImportacao(
  transacao: TransacaoDaImportacao,
  entrada: EntradaGravarImportacao,
): Promise<Result<ResumoDaImportacao, ErroImportacao>> {
  try {
    return ok(await transacao.executar((repos) => gravarDentroDaTransacao(repos, entrada)));
  } catch (erro) {
    if (erro instanceof ImportacaoAbortada) {
      return err(erro.erro);
    }
    throw erro;
  }
}

async function gravarDentroDaTransacao(
  repos: RepositoriosDaImportacao,
  entrada: EntradaGravarImportacao,
): Promise<ResumoDaImportacao> {
  const previa = await preverImportacao(repos, entrada);
  if (!previa.ok) {
    throw new ImportacaoAbortada(previa.error);
  }
  const { plano } = previa.value;
  if (plano.operacoes === null) {
    throw new ImportacaoAbortada({ code: "IMPORTACAO_PENDENCIA_ABERTA" });
  }
  if (plano.conferencia.temDivergencia && !entrada.confirmouDivergencia) {
    throw new ImportacaoAbortada({ code: "IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA" });
  }

  const operacoes = plano.operacoes;
  const competencia = entrada.competencia;
  const dataEvento = `${competencia}-01`;
  const categoriaDe = await gravarCategorias(repos, operacoes.categorias);

  for (const nova of operacoes.recorrenciasNovas) {
    exigir(
      "criarRecorrencia",
      await criarRecorrencia(repos, {
        descricao: nova.descricao,
        natureza: nova.natureza,
        categoriaId: categoriaDe(nova.chaveCategoria),
        usuarioId: entrada.usuarioId,
        meioPagamentoId: nova.meioPagamentoId,
        competenciaInicio: competencia,
        competenciaFim: null,
        diaVencimento: 1,
        valorInicial: nova.valor,
      }),
    );
  }
  for (const reajuste of operacoes.reajustes) {
    exigir(
      "registrarVersao",
      await registrarVersao(repos, {
        recorrenciaId: reajuste.recorrenciaId,
        vigenteDesde: competencia,
        valor: reajuste.valor,
      }),
    );
  }
  for (const recorrenciaId of operacoes.encerramentos) {
    exigir(
      "encerrarRecorrencia",
      await encerrarRecorrencia(repos, {
        recorrenciaId,
        aPartirDe: competencia,
        agora: entrada.agora,
      }),
    );
  }

  for (const compra of operacoes.comprasNovas) {
    exigir(
      "criarCompraParcelada",
      await criarCompraParcelada(repos, {
        idempotencyKey: crypto.randomUUID(),
        descricao: compra.descricao,
        modo: "VALOR_PARCELA",
        valorCentavos: compra.valorParcela,
        qtdParcelas: compra.qtdParcelas,
        parcelaInicial: compra.parcelaInicial,
        competenciaInicial: competencia,
        politicaResiduo: "PRIMEIRAS",
        categoriaId: categoriaDe(compra.chaveCategoria),
        usuarioId: entrada.usuarioId,
        meioPagamentoId: compra.meioPagamentoId,
        dataEvento,
      }),
    );
  }
  for (const { compraId, aPartirDe, valor } of operacoes.reprecificacoes) {
    const compra = await repos.compras.buscarPorId(compraId);
    if (compra === null) {
      throw new Error(`a importação não encontrou a compra ${compraId} que o plano reconheceu`);
    }
    const reprecificada = exigir(
      "reprecificarAPartirDe",
      reprecificarAPartirDe(
        {
          valorAmortizadoAnterior: compra.valorAmortizadoAnterior,
          parcelas: compra.parcelas.map((p) => ({ numero: p.numeroParcela ?? 0, valor: p.valor })),
        },
        aPartirDe,
        valor,
      ),
    );
    await repos.compras.reprecificar(compraId, reprecificada.parcelas, reprecificada.valorTotal);
  }

  for (const avulso of operacoes.avulsos) {
    await repos.movimentos.criarAvulso({
      natureza: avulso.natureza,
      descricao: avulso.descricao,
      competencia,
      dataEvento,
      valor: avulso.valor,
      pagoEm: null,
      categoriaId: categoriaDe(avulso.chaveCategoria),
      usuarioId: entrada.usuarioId,
      meioPagamentoId: avulso.meioPagamentoId,
      origemDado: { fonte: "PLANILHA", chave: avulso.chaveDeOrigem },
    });
  }

  await repos.importacoes.registrar(
    { competencia, nomeArquivo: entrada.nomeArquivo, usuarioId: entrada.usuarioId },
    operacoes.decisoes,
  );

  return {
    competencia,
    proxima: addMeses(competencia, 1),
    criados:
      operacoes.recorrenciasNovas.length + operacoes.comprasNovas.length + operacoes.avulsos.length,
    alterados: operacoes.reajustes.length + operacoes.reprecificacoes.length,
    encerrados: operacoes.encerramentos.length,
  };
}

/**
 * Cria, reativa ou reaproveita cada categoria do plano e devolve quem
 * traduz a chave normalizada no id (IMP-03 AC 9 a 12).
 */
async function gravarCategorias(
  repos: RepositoriosDaImportacao,
  categorias: OperacoesDaImportacao["categorias"],
): Promise<(chave: string | null) => string | null> {
  const ids = new Map<string, string>();
  for (const { chave, grafia, acao, categoriaId } of categorias) {
    // `CRIAR` é a única ação sem categoria existente, e por isso sem id.
    if (categoriaId === null) {
      ids.set(
        chave,
        (await repos.cadastros.criarCategoria({ nome: grafia, arquivadaEm: null })).id,
      );
    } else if (acao === "REATIVAR") {
      ids.set(chave, (await repos.cadastros.reativarCategoria(categoriaId)).id);
    } else {
      ids.set(chave, categoriaId);
    }
  }
  return (chave) => (chave === null ? null : (ids.get(chave) ?? null));
}

/**
 * Uma recusa de caso de uso reaproveitado não é erro da importação: o plano
 * saiu do mesmo banco, então ela só acontece com dado que mudou por fora (um
 * meio arquivado depois de lembrado, por exemplo). Lança, para a transação
 * desfazer tudo, e a action responde com o erro inesperado (IMP-06 AC 2 e 5).
 */
function exigir<T>(operacao: string, resultado: Result<T, { readonly code: string }>): T {
  if (!resultado.ok) {
    throw new Error(`a importação não pôde gravar: ${operacao} devolveu ${resultado.error.code}`);
  }
  return resultado.value;
}
