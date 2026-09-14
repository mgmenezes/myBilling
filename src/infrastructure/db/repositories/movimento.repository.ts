import { and, asc, eq, isNull } from "drizzle-orm";
import type { MovimentoRepository } from "@/application/ports/repositories";
import type { Competencia, Lancamento } from "@/domain";
import type { BancoDeDados } from "../client";
import { movimento } from "../schema";
import { deCompetencia, paraLancamento } from "./mapeadores";

/**
 * Leitura e marcação de pagamento sobre o razão (AD-003). A consulta por
 * competência filtra os cancelados no próprio SQL: um lançamento cancelado
 * que chegasse à camada de aplicação já seria um total errado esperando
 * acontecer.
 */
export class MovimentoRepositoryDrizzle implements MovimentoRepository {
  constructor(private readonly db: BancoDeDados) {}

  async listarPorCompetencia(competencia: Competencia): Promise<ReadonlyArray<Lancamento>> {
    const linhas = await this.db
      .select()
      .from(movimento)
      .where(
        and(eq(movimento.competencia, deCompetencia(competencia)), isNull(movimento.canceladoEm)),
      )
      .orderBy(asc(movimento.dataEvento), asc(movimento.id));
    return linhas.map(paraLancamento);
  }

  async buscarPorId(id: string): Promise<Lancamento | null> {
    const linhas = await this.db.select().from(movimento).where(eq(movimento.id, id)).limit(1);
    const linha = linhas[0];
    return linha ? paraLancamento(linha) : null;
  }

  async marcarPagamento(id: string, pagoEm: string | null): Promise<void> {
    await this.db.update(movimento).set({ pagoEm }).where(eq(movimento.id, id));
  }
}
