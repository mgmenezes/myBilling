import { sql } from "drizzle-orm";
import type {
  RepositoriosDaImportacao,
  TransacaoDaImportacao,
} from "@/application/ports/repositories";
import type { BancoDeDados } from "./client";
import { CadastroRepositoryDrizzle } from "./repositories/cadastro.repository";
import { CompraRepositoryDrizzle } from "./repositories/compra.repository";
import { ImportacaoRepositoryDrizzle } from "./repositories/importacao.repository";
import { MovimentoRepositoryDrizzle } from "./repositories/movimento.repository";
import { RecorrenciaRepositoryDrizzle } from "./repositories/recorrencia.repository";

/**
 * A transação que atravessa repositórios (design, Decisão 1; IMP-06).
 *
 * Abre uma transação, toma a trava da importação e entrega à operação os cinco
 * repositórios construídos sobre o mesmo `tx`. Qualquer exceção desfaz tudo o
 * que eles gravaram: os `transaction` internos de cada repositório viram
 * savepoint e caem junto.
 *
 * `pg_advisory_xact_lock(hashtext('importacao'))` serializa importações: a
 * segunda espera a primeira terminar, e só então lê o registro e o estado.
 * Sem a trava, as duas leriam o banco antes de qualquer commit, e a ordem das
 * abas não teria como recusar a repetida (IMP-02 AC 7). A trava se solta
 * sozinha no fim da transação, com commit ou rollback.
 *
 * Recebe o banco, e não um `Executor`: ela é a dona da transação, e abri-la
 * dentro de outra a reduziria a savepoint.
 */
export class TransacaoDaImportacaoDrizzle implements TransacaoDaImportacao {
  constructor(private readonly banco: BancoDeDados) {}

  executar<T>(operacao: (repos: RepositoriosDaImportacao) => Promise<T>): Promise<T> {
    return this.banco.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('importacao'))`);
      return operacao({
        compras: new CompraRepositoryDrizzle(tx),
        movimentos: new MovimentoRepositoryDrizzle(tx),
        recorrencias: new RecorrenciaRepositoryDrizzle(tx),
        cadastros: new CadastroRepositoryDrizzle(tx),
        importacoes: new ImportacaoRepositoryDrizzle(tx),
      });
    });
  }
}
