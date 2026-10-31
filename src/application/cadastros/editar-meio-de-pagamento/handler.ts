import type { EdicaoDeMeioRepository } from "@/application/ports/repositories";
import {
  type CicloDoCartao,
  err,
  type MeioPagamento,
  mudancasDoMeio,
  ok,
  type Result,
} from "@/domain";

/**
 * Renomear um meio de pagamento e corrigir os dias do cartão (CADCOL-07).
 *
 * O caso de uso não decide o que mudou: `mudancasDoMeio` decide, e confere o
 * ciclo contra o tipo. Ele recusa o meio que não existe mais, confere o nome
 * entre os ativos e grava num `UPDATE` só.
 *
 * - **Arquivado é inexistente.** A aba lista só ativos e arquivar não tem tela;
 *   é o mesmo tratamento de `trocarCategoria` para a categoria arquivada (AC 12).
 * - **Nada mudou não grava** e não consulta o nome (AC 9).
 * - **O nome é único entre os ativos, sem distinguir caixa.** Achar o próprio
 *   id é a mudança só de caixa, e grava (AC 8). O arquivado não é achado, e o
 *   nome dele fica livre (AC 7). O banco não tem `UNIQUE` no nome: dois renomes
 *   simultâneos para o mesmo nome podem passar, como já é na criação (AD-007).
 */

export type CodigoErroEdicaoDeMeio =
  | "MEIO_PAGAMENTO_NAO_ENCONTRADO"
  | "MEIO_PAGAMENTO_JA_EXISTE"
  | "CICLO_NAO_CORRESPONDE_AO_TIPO";

export interface DependenciasEdicaoDeMeio {
  readonly meios: EdicaoDeMeioRepository;
}

export interface EntradaEdicaoDeMeio {
  readonly meioPagamentoId: string;
  /** Já normalizado pelo schema (`nome.ts`). */
  readonly nome: string;
  /** Só no cartão; `null` na conta e no rótulo. */
  readonly ciclo: CicloDoCartao | null;
}

export interface MeioEditado {
  readonly meio: MeioPagamento;
  /** `false` quando nada mudou: nada foi gravado, e não há o que avisar. */
  readonly alterado: boolean;
}

export async function editarMeioDePagamento(
  deps: DependenciasEdicaoDeMeio,
  entrada: EntradaEdicaoDeMeio,
): Promise<Result<MeioEditado, { readonly code: CodigoErroEdicaoDeMeio }>> {
  const meio = await deps.meios.buscarMeioDePagamento(entrada.meioPagamentoId);
  if (meio === null || meio.arquivadoEm !== null) {
    return err({ code: "MEIO_PAGAMENTO_NAO_ENCONTRADO" });
  }

  const mudancas = mudancasDoMeio(meio, { nome: entrada.nome, ciclo: entrada.ciclo });
  if (!mudancas.ok) {
    return err({ code: "CICLO_NAO_CORRESPONDE_AO_TIPO" });
  }
  if (mudancas.value === null) {
    return ok({ meio, alterado: false });
  }

  if (mudancas.value.nome !== undefined) {
    const homonimo = await deps.meios.buscarMeioDePagamentoAtivoPorNome(mudancas.value.nome);
    if (homonimo !== null && homonimo.id !== meio.id) {
      return err({ code: "MEIO_PAGAMENTO_JA_EXISTE" });
    }
  }

  const gravado = await deps.meios.atualizarMeioDePagamento(meio.id, mudancas.value);
  return ok({ meio: gravado, alterado: true });
}
