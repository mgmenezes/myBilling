import type {
  CadastroRepository,
  CompraRepository,
  MovimentoRepository,
} from "@/application/ports/repositories";
import { type BancoDeDados, db } from "./db/client";
import { CadastroRepositoryDrizzle } from "./db/repositories/cadastro.repository";
import { CompraRepositoryDrizzle } from "./db/repositories/compra.repository";
import { MovimentoRepositoryDrizzle } from "./db/repositories/movimento.repository";

/**
 * Composition root: o único lugar do sistema que conhece, ao mesmo tempo, a
 * port e a implementação concreta.
 *
 * São funções fábrica, e não um container de injeção de dependência. Para
 * três repositórios e um único ponto de montagem, um container adicionaria
 * registro, resolução e erro em runtime no lugar de erro de compilação —
 * custo sem contrapartida.
 *
 * `Repositorios` é declarado **em termos das ports**. É isso que faz o fake
 * em memória de T32 ser um substituto direto: quem recebe `Repositorios`
 * não consegue, nem por acidente, depender de nada do Drizzle.
 */
export interface Repositorios {
  readonly movimentos: MovimentoRepository;
  readonly compras: CompraRepository;
  readonly cadastros: CadastroRepository;
}

/** Monta os repositórios concretos sobre o banco. Sem argumento, usa o
 * cliente da aplicação, que lê a configuração validada de T4. */
export function criarRepositorios(banco: BancoDeDados = db()): Repositorios {
  return {
    movimentos: new MovimentoRepositoryDrizzle(banco),
    compras: new CompraRepositoryDrizzle(banco),
    cadastros: new CadastroRepositoryDrizzle(banco),
  };
}
