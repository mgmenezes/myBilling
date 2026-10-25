import { describe, expect, it } from "vitest";
import type { Cents } from "../shared/money";
import {
  type CompraParaReprecificar,
  type ParcelaDaCompra,
  type Reprecificacao,
  reprecificarAPartirDe,
} from "./reprecificar-parcelas";

function parcelas(de: number, ate: number, valor: number): ParcelaDaCompra[] {
  const lista: ParcelaDaCompra[] = [];
  for (let numero = de; numero <= ate; numero += 1) {
    lista.push({ numero, valor: valor as Cents });
  }
  return lista;
}

function compra(amortizado: number, gravadas: ParcelaDaCompra[]): CompraParaReprecificar {
  return { valorAmortizadoAnterior: amortizado as Cents, parcelas: gravadas };
}

function reprecificada(
  alvo: CompraParaReprecificar,
  aPartirDe: number,
  valor: number,
): Reprecificacao {
  const resultado = reprecificarAPartirDe(alvo, aPartirDe, valor as Cents);
  if (!resultado.ok) {
    throw new Error(`esperava reprecificação válida: ${JSON.stringify(resultado.error)}`);
  }
  return resultado.value;
}

/** total = amortizado + parcelas devolvidas + parcelas que não mudaram. */
function conserva(alvo: CompraParaReprecificar, aPartirDe: number, plano: Reprecificacao): boolean {
  const naoAlteradas = alvo.parcelas.filter((parcela) => parcela.numero < aPartirDe);
  const soma = [...naoAlteradas, ...plano.parcelas].reduce((total, p) => total + p.valor, 0);
  return alvo.valorAmortizadoAnterior + soma === plano.valorTotal;
}

describe("reprecificarAPartirDe — o valor da aba vale da parcela n em diante (IMP-07 AC 10)", () => {
  it("Fone: parcelas 1 a 3 de 3334, a partir da 2 com 3333, total 10000", () => {
    const fone = compra(0, parcelas(1, 3, 3334));
    const plano = reprecificada(fone, 2, 3333);

    expect(plano).toEqual({
      parcelas: [
        { numero: 2, valor: 3333 },
        { numero: 3, valor: 3333 },
      ],
      valorTotal: 10000,
    });
    expect(conserva(fone, 2, plano)).toBe(true);
  });

  it("Livro de 30: parcelas 1 e 2 de 3000, a partir da 2 com 3002, total 6002", () => {
    const livro = compra(0, parcelas(1, 2, 3000));
    const plano = reprecificada(livro, 2, 3002);

    expect(plano).toEqual({ parcelas: [{ numero: 2, valor: 3002 }], valorTotal: 6002 });
    expect(conserva(livro, 2, plano)).toBe(true);
  });

  it("compra em andamento: o amortizado entra no total e as parcelas 7 e 8 ficam como estão", () => {
    const sofa = compra(126000, parcelas(7, 10, 21000));
    const plano = reprecificada(sofa, 9, 21100);

    expect(plano).toEqual({
      parcelas: [
        { numero: 9, valor: 21100 },
        { numero: 10, valor: 21100 },
      ],
      valorTotal: 126000 + 21000 + 21000 + 21100 + 21100,
    });
    expect(conserva(sofa, 9, plano)).toBe(true);
  });

  it("recusa com PARCELA_INICIAL_INVALIDA a parcela que não está gravada", () => {
    const resultado = reprecificarAPartirDe(
      compra(126000, parcelas(7, 10, 21000)),
      6,
      21100 as Cents,
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("PARCELA_INICIAL_INVALIDA");
  });
});
