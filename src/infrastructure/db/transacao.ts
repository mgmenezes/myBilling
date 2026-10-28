import type { RepositoriosTransacionais, Transacao } from "@/application/ports/repositories";
import type { BancoDeDados, Executor } from "./client";
import { CadastroRepositoryDrizzle } from "./repositories/cadastro.repository";
import { CompraRepositoryDrizzle } from "./repositories/compra.repository";
import { MovimentoRepositoryDrizzle } from "./repositories/movimento.repository";
import { RecorrenciaRepositoryDrizzle } from "./repositories/recorrencia.repository";

/**
 * A transação que atravessa repositórios, sem trava (EDF-06 AC 1 e 2).
 *
 * Abre uma transação e entrega à operação os quatro repositórios construídos
 * sobre o mesmo `tx`. Qualquer exceção desfaz tudo o que eles gravaram: os
 * `transaction` internos de cada repositório viram savepoint e caem junto.
 *
 * Recebe o banco, e não um `Executor`: ela é a dona da transação, e abri-la
 * dentro de outra a reduziria a savepoint.
 */
export class TransacaoDrizzle implements Transacao {
  constructor(private readonly banco: BancoDeDados) {}

  executar<T>(operacao: (repos: RepositoriosTransacionais) => Promise<T>): Promise<T> {
    return this.executarComTx(operacao);
  }

  /**
   * Como `executar`, mas entrega também o `tx`. É por aqui que outra transação
   * compõe esta: a da importação toma a trava e monta o repositório que só ela
   * usa, sobre a mesma transação.
   */
  executarComTx<T>(
    operacao: (repos: RepositoriosTransacionais, tx: Executor) => Promise<T>,
  ): Promise<T> {
    return this.banco.transaction((tx) =>
      operacao(
        {
          compras: new CompraRepositoryDrizzle(tx),
          movimentos: new MovimentoRepositoryDrizzle(tx),
          recorrencias: new RecorrenciaRepositoryDrizzle(tx),
          cadastros: new CadastroRepositoryDrizzle(tx),
        },
        tx,
      ),
    );
  }
}
