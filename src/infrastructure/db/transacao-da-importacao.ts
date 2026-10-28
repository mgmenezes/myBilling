import { sql } from "drizzle-orm";
import type {
  RepositoriosDaImportacao,
  TransacaoDaImportacao,
} from "@/application/ports/repositories";
import type { BancoDeDados } from "./client";
import { ImportacaoRepositoryDrizzle } from "./repositories/importacao.repository";
import { TransacaoDrizzle } from "./transacao";

/**
 * A transação que atravessa repositórios (design, Decisão 1; IMP-06).
 *
 * Compõe a transação genérica: dentro dela, toma a trava da importação e
 * acrescenta aos quatro repositórios o da importação, sobre o mesmo `tx`.
 * Qualquer exceção desfaz tudo o que os cinco gravaram.
 *
 * `pg_advisory_xact_lock(hashtext('importacao'))` serializa importações: a
 * segunda espera a primeira terminar, e só então lê o registro e o estado.
 * Sem a trava, as duas leriam o banco antes de qualquer commit, e a ordem das
 * abas não teria como recusar a repetida (IMP-02 AC 7). A trava se solta
 * sozinha no fim da transação, com commit ou rollback.
 */
export class TransacaoDaImportacaoDrizzle implements TransacaoDaImportacao {
  private readonly transacao: TransacaoDrizzle;

  constructor(banco: BancoDeDados) {
    this.transacao = new TransacaoDrizzle(banco);
  }

  executar<T>(operacao: (repos: RepositoriosDaImportacao) => Promise<T>): Promise<T> {
    return this.transacao.executarComTx(async (repos, tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('importacao'))`);
      return operacao({ ...repos, importacoes: new ImportacaoRepositoryDrizzle(tx) });
    });
  }
}
