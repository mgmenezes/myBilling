import { z } from "zod";

/**
 * O payload da troca de categoria na linha (TRC-05 AC 5). `categoriaId` nulo é
 * a opção "Sem categoria"; ausente é payload inválido, para que um seletor que
 * esqueceu o campo não apague a categoria de ninguém.
 *
 * Estrito: qualquer campo a mais é recusado. A troca só muda a categoria, e um
 * campo que o servidor ignorasse calado daria a impressão de que mudou outra
 * coisa.
 */
export const entradaTrocaDeCategoriaSchema = z.strictObject({
  lancamentoId: z.uuid("Lançamento inválido."),
  categoriaId: z.uuid("Categoria inválida.").nullable(),
});

export type EntradaTrocaDeCategoriaValidada = z.infer<typeof entradaTrocaDeCategoriaSchema>;
