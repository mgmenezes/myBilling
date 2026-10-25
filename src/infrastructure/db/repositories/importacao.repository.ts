import { desc, sql } from "drizzle-orm";
import type { ImportacaoRegistrada, ImportacaoRepository } from "@/application/ports/repositories";
import type { Competencia, DecisaoDeEntrada, DecisoesDaImportacao } from "@/domain";
import type { Executor } from "../client";
import { compraParcelada, importacao, importacaoDecisao, movimento, recorrencia } from "../schema";
import { deCompetencia, paraCompetencia } from "./mapeadores";

/**
 * O registro da importação: que abas já entraram e o que a pessoa decidiu
 * sobre o que a planilha não diz (design, Decisão 5).
 *
 * Nada aqui se infere do razão. Uma recorrência criada à mão e uma criada pela
 * importação são idênticas, então "qual foi a última competência importada"
 * só se responde com a tabela `importacao`.
 */
export class ImportacaoRepositoryDrizzle implements ImportacaoRepository {
  constructor(private readonly db: Executor) {}

  async ultimaCompetenciaImportada(): Promise<Competencia | null> {
    const [linha] = await this.db
      .select({ competencia: importacao.competencia })
      .from(importacao)
      .orderBy(desc(importacao.competencia))
      .limit(1);
    return linha ? paraCompetencia(linha.competencia, "importacao.competencia") : null;
  }

  /**
   * Qualquer linha nas três tabelas conta, inclusive avulso cancelado: ele
   * continua em `movimento`, e importar por cima dele duplicaria o mês em
   * silêncio (IMP-02 AC 6).
   */
  async haLancamentoCompraOuRecorrencia(): Promise<boolean> {
    const resultado = await this.db.execute<{ ha: boolean }>(
      sql`SELECT EXISTS (SELECT 1 FROM ${movimento})
              OR EXISTS (SELECT 1 FROM ${compraParcelada})
              OR EXISTS (SELECT 1 FROM ${recorrencia}) AS ha`,
    );
    return resultado.rows[0]?.ha === true;
  }

  async decisoesLembradas(): Promise<DecisoesDaImportacao> {
    const linhas = await this.db.select().from(importacaoDecisao);
    const meios = new Map<string, string>();
    const entradas = new Map<string, DecisaoDeEntrada>();
    for (const linha of linhas) {
      // `classe` nula se e somente se a decisão é de meio, pelo CHECK
      // `importacao_decisao_classe_sse_entrada`.
      if (linha.classe === null) {
        meios.set(linha.nomeNormalizado, linha.meioPagamentoId);
      } else {
        entradas.set(linha.nomeNormalizado, {
          classe: linha.classe,
          contaId: linha.meioPagamentoId,
        });
      }
    }
    return { meios, entradas };
  }

  /**
   * A importação e as decisões juntas, numa transação: sobre a transação da
   * importação ela vira savepoint. As decisões entram por upsert em
   * `(tipo, nome_normalizado)`, então decidir de novo substitui (IMP-04 AC 4).
   * A mesma competência uma segunda vez viola `importacao_competencia_unique`
   * e lança (IMP-02 AC 7).
   */
  async registrar(registro: ImportacaoRegistrada, decisoes: DecisoesDaImportacao): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(importacao).values({
        competencia: deCompetencia(registro.competencia),
        nomeArquivo: registro.nomeArquivo,
        usuarioId: registro.usuarioId,
      });

      const linhas = [
        ...[...decisoes.meios].map(([nomeNormalizado, meioPagamentoId]) => ({
          tipo: "MEIO" as const,
          nomeNormalizado,
          meioPagamentoId,
          classe: null,
        })),
        ...[...decisoes.entradas].map(([nomeNormalizado, decisao]) => ({
          tipo: "ENTRADA" as const,
          nomeNormalizado,
          meioPagamentoId: decisao.contaId,
          classe: decisao.classe,
        })),
      ];
      if (linhas.length === 0) {
        return;
      }
      await tx
        .insert(importacaoDecisao)
        .values(linhas)
        .onConflictDoUpdate({
          target: [importacaoDecisao.tipo, importacaoDecisao.nomeNormalizado],
          set: {
            meioPagamentoId: sql`excluded.meio_pagamento_id`,
            classe: sql`excluded.classe`,
          },
        });
    });
  }
}
