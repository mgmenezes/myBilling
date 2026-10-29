import type { BlocoDoMes } from "@/domain";

/**
 * Quais blocos da lista de Lançamentos a pessoa deixou recolhidos (LST-02).
 *
 * **Cookie, e não `localStorage`.** O servidor lê o cookie antes de
 * renderizar, então o bloco recolhido já chega fechado no HTML. Guardado só
 * no navegador, ele abriria e fecharia diante da pessoa a cada visita.
 *
 * Fica fora de `"use client"` de propósito: a página, que é de servidor, e o
 * botão de recolher, que é cliente, leem o cookie pela mesma função.
 *
 * O estado é do bloco, e não do mês nem do filtro: recolher Fixos em
 * fevereiro deixa Fixos recolhido em março também.
 */

export const COOKIE_BLOCOS_RECOLHIDOS = "blocos-recolhidos";

// SPEC_DEVIATION: a chave de "Gastos do Mês" é AVULSOS, e não GASTOS_DO_MES.
// Reason: o Design de tasks.md lista GASTOS_DO_MES e diz, na mesma frase, que
// as chaves são as de BlocoDoMes, que chama o bloco de AVULSOS. Seguir o tipo
// deixa a tabela usar `bloco.bloco` como chave, sem tabela de tradução.
export const CHAVES_DE_BLOCO = [
  "ENTRADAS",
  "FIXOS",
  "CARTAO",
  "AVULSOS",
] as const satisfies ReadonlyArray<"ENTRADAS" | BlocoDoMes>;

export type ChaveDeBloco = (typeof CHAVES_DE_BLOCO)[number];

function ehChaveDeBloco(texto: string): texto is ChaveDeBloco {
  return (CHAVES_DE_BLOCO as ReadonlyArray<string>).includes(texto);
}

/**
 * O valor do cookie, lista separada por vírgula, nas chaves que existem. O que
 * não é bloco fica de fora: um nome antigo ou digitado à mão não pode fechar
 * nada nem quebrar a página.
 */
export function lerBlocosRecolhidos(valor: string | undefined): ReadonlyArray<ChaveDeBloco> {
  if (valor === undefined) {
    return [];
  }
  return valor.split(",").filter(ehChaveDeBloco);
}
