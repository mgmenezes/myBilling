"use server";

import { revalidatePath } from "next/cache";
import { criarCompraParcelada } from "@/application/compras/criar-compra-parcelada/handler";
import { entradaCompraSchema } from "@/application/schemas/compra.schema";
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

/** Só erro de sessão vira envelope; qualquer outra falha segue para o `catch`. */
function apenasErroDeSessao(erro: unknown): ErroDeSessao {
  if (erro instanceof ErroDeSessao) {
    return erro;
  }
  throw erro;
}
