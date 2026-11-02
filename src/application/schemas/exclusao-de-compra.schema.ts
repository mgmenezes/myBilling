import { z } from "zod";

/**
 * O payload da exclusão de compra desta parcela em diante (EXC-05 AC 2): só o
 * id da parcela escolhida. O alcance, o total e o instante saem do servidor,
 * nunca do cliente.
 *
 * Estrito: qualquer campo a mais é recusado, para que um cliente não pense que
 * escolheu o alcance mandando números de parcela que o servidor ignoraria.
 */
export const entradaExclusaoDeCompraSchema = z.strictObject({
  lancamentoId: z.uuid("Lançamento inválido."),
});

export type EntradaExclusaoDeCompraValidada = z.infer<typeof entradaExclusaoDeCompraSchema>;
