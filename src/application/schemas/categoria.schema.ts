import { z } from "zod";
import { criarNomeSchema } from "./nome";

/**
 * Schema de entrada da criação de categoria, **compartilhado entre cliente e
 * servidor** (AUTH-02, AC 4). O formulário valida com ele antes de enviar e a
 * Server Action revalida com ele depois de receber — mesmo arquivo, mesmas
 * regras, nenhuma chance de divergirem.
 *
 * Por isso este arquivo só importa `zod`: nada de infraestrutura, nada de
 * `next/*`, nada de módulo do Node.
 */

/** 60 caracteres cabem em qualquer rótulo da interface sem quebrar layout. */
export const MAX_NOME_CATEGORIA = 60;

export const nomeCategoriaSchema = criarNomeSchema(
  MAX_NOME_CATEGORIA,
  "Informe o nome da categoria.",
);

export const entradaCategoriaSchema = z.object({
  nome: nomeCategoriaSchema,
});

export type EntradaCategoriaValidada = z.infer<typeof entradaCategoriaSchema>;
