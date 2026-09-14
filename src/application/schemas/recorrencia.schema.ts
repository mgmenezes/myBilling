import { z } from "zod";
import { criarCents, criarCompetencia } from "@/domain";
import { criarNomeSchema } from "./nome";

/**
 * Schema de entrada da recorrência, **compartilhado entre cliente e servidor**
 * (AUTH-02, AC 4). O formulário valida com ele antes de enviar e a Server
 * Action revalida com ele depois de receber.
 *
 * Ele valida **formato**: tipo, faixa e forma. A regra financeira continua no
 * domínio — o período impossível (fim antes do início) é decidido pelo caso de
 * uso, porque depende de comparar dois campos entre si e a mensagem precisa
 * chegar endereçada ao campo certo.
 */

/** 60 caracteres, como categoria: os dois aparecem na mesma coluna da lista. */
export const MAX_NOME_RECORRENCIA = 60;

const competencia = z
  .string()
  .refine((texto) => criarCompetencia(texto).ok, "Informe o mês no formato AAAA-MM.");

/**
 * Dia de vencimento. O limite é 31 e não o último dia do mês porque o mês ainda
 * não existe quando o cadastro acontece: `diaEfetivo` reduz na materialização,
 * competência a competência (FIXO-01, AC 5).
 */
const diaVencimento = z
  .int("Informe o dia de vencimento.")
  .min(1, "O dia de vencimento vai de 1 a 31.")
  .max(31, "O dia de vencimento vai de 1 a 31.");

const valorCentavos = z
  .number("Informe o valor.")
  .refine((valor) => criarCents(valor).ok, "O valor precisa ser maior que zero.");

export const entradaRecorrenciaSchema = z.object({
  descricao: criarNomeSchema(MAX_NOME_RECORRENCIA, "Descreva o gasto fixo."),
  natureza: z.enum(["DESPESA", "RECEITA"], "Escolha entre despesa e receita."),
  valorCentavos,
  diaVencimento,
  competenciaInicio: competencia,
  /** `null` = sem fim. `undefined` não é aceito: a ausência precisa ser explícita. */
  competenciaFim: competencia.nullable(),
  categoriaId: z.uuid("Categoria inválida.").nullable(),
  usuarioId: z.uuid("Escolha de quem é o gasto fixo."),
  meioPagamentoId: z.uuid("Escolha o meio de pagamento."),
});

export type EntradaRecorrenciaValidada = z.infer<typeof entradaRecorrenciaSchema>;

/** Registrar um valor novo a partir de um mês. */
export const entradaVigenciaSchema = z.object({
  recorrenciaId: z.uuid("Gasto fixo inválido."),
  vigenteDesde: competencia,
  valorCentavos,
});

/** Encerrar a partir de um mês. */
export const entradaEncerramentoSchema = z.object({
  recorrenciaId: z.uuid("Gasto fixo inválido."),
  aPartirDe: competencia,
});
