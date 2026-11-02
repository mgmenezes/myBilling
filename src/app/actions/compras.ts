"use server";

import { revalidatePath } from "next/cache";
import { criarCompraParcelada } from "@/application/compras/criar-compra-parcelada/handler";
import { excluirCompraDestaEmDiante } from "@/application/compras/excluir-desta-em-diante/handler";
import { entradaCompraSchema } from "@/application/schemas/compra.schema";
import { entradaExclusaoDeCompraSchema } from "@/application/schemas/exclusao-de-compra.schema";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { criarRepositorios } from "@/infrastructure/container";
import { erroDeAction, mensagemDoErro, type ResultadoAction } from "@/lib/erros";

/**
 * Server Action de compras.
 *
 * Três coisas mandam neste arquivo:
 *
 * 1. **`requireSession()` é a primeira instrução.** O proxy já protege a rota,
 *    e mesmo assim a action resolve a sessão de novo (AUTH-02, AC 3). Um
 *    matcher mal escrito desliga o proxy sem quebrar nada visível — foi assim
 *    que frameworks deste tipo já expuseram rota protegida em produção.
 * 2. **O payload é revalidado no servidor** com o mesmo schema que o
 *    formulário usou (AUTH-02, AC 4). O cliente é sugestão, não autoridade.
 * 3. **Nada lança para o cliente.** Todo caminho sai no envelope
 *    `ResultadoAction`, e a falha não prevista vira `ERRO_INESPERADO` com um
 *    identificador de correlação. **Stack trace não chega ao navegador**
 *    (UI-02, AC 8).
 */

export interface ParcelaGravada {
  readonly numero: number;
  readonly valorCentavos: number;
  readonly competencia: string;
}

export interface CompraGravada {
  readonly compraId: string;
  readonly descricao: string;
  readonly valorTotalCentavos: number;
  readonly qtdParcelas: number;
  readonly parcelas: ReadonlyArray<ParcelaGravada>;
  /** `true` quando a chave de idempotência já tinha sido usada (PARC-05, AC 9). */
  readonly jaExistia: boolean;
}

export async function criarCompra(payload: unknown): Promise<ResultadoAction<CompraGravada>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaCompraSchema.safeParse(payload);
  if (!validado.success) {
    const campos: Record<string, string> = {};
    for (const issue of validado.error.issues) {
      const campo = issue.path.join(".");
      campos[campo] ??= issue.message;
    }
    return {
      ok: false,
      erro: { code: "VALIDACAO", mensagem: mensagemDoErro("VALIDACAO"), campos },
    };
  }

  try {
    const resultado = await criarCompraParcelada(criarRepositorios(), validado.data);
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }

    // A competência que o usuário está vendo e a de cada parcela gerada. Sem
    // isto, a parcela de abril só apareceria depois de um recarregamento
    // manual — exatamente a re-digitação que o app existe para eliminar.
    const afetadas = new Set<string>([validado.data.competenciaInicial]);
    for (const parcela of resultado.value.parcelas) {
      afetadas.add(parcela.competencia);
    }
    for (const competencia of afetadas) {
      revalidatePath(`/${competencia}`);
    }

    return {
      ok: true,
      data: {
        compraId: resultado.value.compraId,
        descricao: resultado.value.descricao,
        valorTotalCentavos: resultado.value.valorTotal,
        qtdParcelas: resultado.value.qtdParcelas,
        parcelas: resultado.value.parcelas.map((parcela) => ({
          numero: parcela.numero,
          valorCentavos: parcela.valor,
          competencia: parcela.competencia,
        })),
        jaExistia: resultado.value.jaExistia,
      },
    };
  } catch (erro) {
    const correlationId = crypto.randomUUID().slice(0, 8);
    // O detalhe fica aqui, no servidor, e só aqui.
    console.error(`[${correlationId}] falha ao criar compra parcelada`, erro);
    return erroDeAction(
      "ERRO_INESPERADO",
      `${mensagemDoErro("ERRO_INESPERADO")} Se continuar, informe o código ${correlationId}.`,
    );
  }
}

export interface CompraExcluidaDaParcela {
  /** Quantas saíram de fato nesta chamada, que é o número do toast (EXC-04 AC 4). */
  readonly parcelasExcluidas: number;
}

/**
 * Exclui a compra da parcela escolhida desta parcela em diante (EXC-03): saem
 * ela e as de número maior, menos as pagas. O payload é só `{ lancamentoId }`;
 * o alcance é recalculado no servidor sobre o que o banco tem agora.
 *
 * Revalida mesmo quando nada mudou (parcela já cancelada por outra aba): a tela
 * de quem clicou precisa refletir o estado real. As parcelas que saem podem
 * estar em qualquer mês do horizonte, então valem todas as competências da
 * Visão geral, de Lançamentos e de Simular, e a home, que mostra o ano.
 */
export async function excluirCompraDestaParcela(
  payload: unknown,
): Promise<ResultadoAction<CompraExcluidaDaParcela>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaExclusaoDeCompraSchema.safeParse(payload);
  if (!validado.success) {
    const campos: Record<string, string> = {};
    for (const issue of validado.error.issues) {
      campos[issue.path.join(".")] ??= issue.message;
    }
    return {
      ok: false,
      erro: { code: "VALIDACAO", mensagem: mensagemDoErro("VALIDACAO"), campos },
    };
  }

  try {
    const resultado = await excluirCompraDestaEmDiante(criarRepositorios(), {
      lancamentoId: validado.data.lancamentoId,
      /* O relógio é da borda. O caso de uso o recebe para ser determinístico. */
      agora: new Date().toISOString(),
    });
    if (!resultado.ok) {
      return erroDeAction(resultado.error.code);
    }

    revalidatePath("/[competencia]", "page");
    revalidatePath("/[competencia]/lancamentos", "page");
    revalidatePath("/[competencia]/simular", "page");
    revalidatePath("/");

    return { ok: true, data: { parcelasExcluidas: resultado.value.parcelasExcluidas } };
  } catch (erro) {
    const correlationId = crypto.randomUUID().slice(0, 8);
    // O detalhe fica aqui, no servidor, e só aqui.
    console.error(`[${correlationId}] falha ao excluir compra parcelada`, erro);
    return erroDeAction(
      "ERRO_INESPERADO",
      `${mensagemDoErro("ERRO_INESPERADO")} Se continuar, informe o código ${correlationId}.`,
    );
  }
}

/** Só erro de sessão vira envelope; qualquer outra falha segue para o `catch`. */
function apenasErroDeSessao(erro: unknown): ErroDeSessao {
  if (erro instanceof ErroDeSessao) {
    return erro;
  }
  throw erro;
}
