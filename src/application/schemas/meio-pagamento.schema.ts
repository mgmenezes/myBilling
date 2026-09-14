import { z } from "zod";
import { criarNomeSchema } from "./nome";

/**
 * Schema de entrada da criação de meio de pagamento, **compartilhado entre
 * cliente e servidor** (AUTH-02, AC 4).
 *
 * Ele é uma **união discriminada pelo tipo**, e não um objeto com campos
 * opcionais, porque é exatamente essa a forma da regra no banco. Lá existem
 * dois `CHECK` bicondicionais: `gera_fatura` é verdadeiro **se e somente se**
 * o tipo é cartão, e os dias de ciclo estão preenchidos **se e somente se**
 * gera fatura. Com campos opcionais, um payload com `tipo: 'ROTULO'` e um dia
 * de fechamento passaria daqui e só morreria na constraint do Postgres — erro
 * genérico, no lugar errado, sem campo a que se endereçar.
 *
 * A mesma forma também é a do domínio (`Cartao` e `MeioSemFatura`): a
 * exigência dos dias é do tipo, não de uma validação em runtime.
 */

/** 40 caracteres: o nome aparece dentro de um `<select>` estreito. */
export const MAX_NOME_MEIO = 40;

const nome = criarNomeSchema(MAX_NOME_MEIO, "Informe o nome do meio de pagamento.");

/**
 * Dia do ciclo. O limite é 31 e não o último dia do mês: o domínio já resolve
 * "dia 31 em fevereiro" usando o último dia daquele mês (CART-02, AC 3), então
 * 31 é um valor legítimo de configuração, não um erro de digitação.
 */
const diaDoCiclo = (campo: string) =>
  z
    .int(`Informe o dia de ${campo}.`)
    .min(1, `O dia de ${campo} vai de 1 a 31.`)
    .max(31, `O dia de ${campo} vai de 1 a 31.`);

export const entradaMeioPagamentoSchema = z.discriminatedUnion("tipo", [
  z.object({
    nome,
    tipo: z.literal("CARTAO_CREDITO"),
    diaFechamento: diaDoCiclo("fechamento"),
    diaVencimento: diaDoCiclo("vencimento"),
  }),
  z.object({ nome, tipo: z.literal("CONTA_CORRENTE") }),
  z.object({ nome, tipo: z.literal("ROTULO") }),
]);

export type EntradaMeioPagamentoValidada = z.infer<typeof entradaMeioPagamentoSchema>;

/** Os rótulos em pt-BR dos tipos, na ordem em que o formulário os oferece. */
export const TIPOS_DE_MEIO = [
  { valor: "CARTAO_CREDITO", rotulo: "Cartão de crédito" },
  { valor: "CONTA_CORRENTE", rotulo: "Conta corrente" },
  { valor: "ROTULO", rotulo: "Rótulo" },
] as const satisfies ReadonlyArray<{ valor: EntradaMeioPagamentoValidada["tipo"]; rotulo: string }>;
