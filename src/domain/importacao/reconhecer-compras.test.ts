import { describe, expect, it } from "vitest";
import type { Cents } from "../shared/money";
import {
  type CompraEmCurso,
  type LinhaDeCompra,
  reconhecerCompras,
  TOLERANCIA_DE_RECONHECIMENTO,
} from "./reconhecer-compras";

const CONTA = "meio-conta-corrente";
const ROXO = "meio-cartao-roxo";

function emCurso(
  compraId: string,
  descricao: string,
  sobrescrever: Partial<Omit<CompraEmCurso, "compraId" | "descricao">> = {},
): CompraEmCurso {
  return {
    compraId,
    descricao,
    meioPagamentoId: ROXO,
    qtdParcelas: 2,
    numeroEmM: 2,
    valorEmM: 3000 as Cents,
    ...sobrescrever,
  };
}

function linha(
  posicao: number,
  nome: string,
  numero: number,
  total: number,
  valor: number,
  meio: string = ROXO,
): LinhaDeCompra {
  return {
    posicao,
    nome,
    meioPagamentoId: meio,
    parcela: { numero, total },
    valor: valor as Cents,
  };
}

describe("reconhecerCompras — compras parceladas pela sequência (IMP-07)", () => {
  it("Sofá 8/10 continua a compra que tem a parcela 8 em M (AC 7)", () => {
    const sofa = linha(0, "Sofá", 8, 10, 21000);
    const compra = emCurso("compra-sofa", "Sofá", {
      qtdParcelas: 10,
      numeroEmM: 8,
      valorEmM: 21000 as Cents,
    });

    expect(reconhecerCompras([sofa], [compra])).toEqual({
      destinos: [{ tipo: "CONTINUA", linha: sofa, compraId: "compra-sofa" }],
      naoAparecem: [],
    });
  });

  it("Fone 2/3 de 3333 contra parcela de 3334 continua com valor novo", () => {
    const fone = linha(1, "Fone", 2, 3, 3333);
    const compra = emCurso("compra-fone", "Fone", { qtdParcelas: 3, valorEmM: 3334 as Cents });

    expect(reconhecerCompras([fone], [compra]).destinos).toEqual([
      {
        tipo: "CONTINUA_COM_NOVO_VALOR",
        linha: fone,
        compraId: "compra-fone",
        de: 3334,
        para: 3333,
      },
    ]);
  });

  it("tolera até 100 centavos de diferença e não reconhece com 101 (AC 8)", () => {
    const compra = emCurso("compra-livro", "Livro", { valorEmM: 3000 as Cents });

    expect(TOLERANCIA_DE_RECONHECIMENTO).toBe(100);
    expect(reconhecerCompras([linha(0, "Livro", 2, 2, 3100)], [compra]).destinos[0]).toMatchObject({
      tipo: "CONTINUA_COM_NOVO_VALOR",
      compraId: "compra-livro",
    });
    expect(reconhecerCompras([linha(0, "Livro", 2, 2, 3101)], [compra])).toEqual({
      destinos: [{ tipo: "COMPRA_NOVA", linha: linha(0, "Livro", 2, 2, 3101) }],
      naoAparecem: [compra],
    });
  });

  it("os dois Livros de novembro ficam cada um com a sua compra (AC 9)", () => {
    const livroDe30 = linha(3, "Livro", 2, 2, 3002);
    const livroDe20 = linha(4, "Livro", 2, 2, 2000);
    const compras = [
      emCurso("compra-livro-20", "Livro", { valorEmM: 2000 as Cents }),
      emCurso("compra-livro-30", "Livro", { valorEmM: 3000 as Cents }),
    ];

    expect(reconhecerCompras([livroDe30, livroDe20], compras)).toEqual({
      destinos: [
        {
          tipo: "CONTINUA_COM_NOVO_VALOR",
          linha: livroDe30,
          compraId: "compra-livro-30",
          de: 3000,
          para: 3002,
        },
        { tipo: "CONTINUA", linha: livroDe20, compraId: "compra-livro-20" },
      ],
      naoAparecem: [],
    });
  });

  it("havendo duas candidatas, fica com a de valor mais próximo (AC 9)", () => {
    const compras = [
      emCurso("compra-a", "Livro", { valorEmM: 3000 as Cents }),
      emCurso("compra-b", "Livro", { valorEmM: 3050 as Cents }),
    ];

    expect(reconhecerCompras([linha(0, "Livro", 2, 2, 3040)], compras).destinos[0]).toMatchObject({
      compraId: "compra-b",
    });
  });

  it("no empate de distância, fica com a primeira compra recebida", () => {
    const compras = [
      emCurso("compra-a", "Livro", { valorEmM: 3000 as Cents }),
      emCurso("compra-b", "Livro", { valorEmM: 3020 as Cents }),
    ];

    expect(reconhecerCompras([linha(0, "Livro", 2, 2, 3010)], compras).destinos[0]).toMatchObject({
      compraId: "compra-a",
    });
  });

  it("uma compra é reconhecida por no máximo uma linha (AC 9)", () => {
    const primeira = linha(0, "Livro", 2, 2, 3000);
    const segunda = linha(1, "Livro", 2, 2, 3001);

    expect(
      reconhecerCompras([primeira, segunda], [emCurso("compra-livro", "Livro")]).destinos,
    ).toEqual([
      { tipo: "CONTINUA", linha: primeira, compraId: "compra-livro" },
      { tipo: "COMPRA_NOVA", linha: segunda },
    ]);
  });

  it.each([
    ["numeroEmM diferente de n", linha(0, "Sofá", 9, 10, 21000)],
    ["qtdParcelas diferente de t", linha(0, "Sofá", 8, 12, 21000)],
    ["meio diferente", linha(0, "Sofá", 8, 10, 21000, CONTA)],
  ])("%s é COMPRA_NOVA", (_rotulo, sofa) => {
    const compra = emCurso("compra-sofa", "Sofá", {
      qtdParcelas: 10,
      numeroEmM: 8,
      valorEmM: 21000 as Cents,
    });

    expect(reconhecerCompras([sofa], [compra]).destinos).toEqual([
      { tipo: "COMPRA_NOVA", linha: sofa },
    ]);
  });

  it("dezembro: o Óculos, sem linha na aba, não aparece (AC 11)", () => {
    const oculos = emCurso("compra-oculos", "Óculos", {
      meioPagamentoId: CONTA,
      qtdParcelas: 5,
      numeroEmM: 4,
      valorEmM: 8000 as Cents,
    });
    const compras = [
      emCurso("compra-sofa", "Sofá", { qtdParcelas: 10, numeroEmM: 9, valorEmM: 21000 as Cents }),
      emCurso("compra-fone", "Fone", { qtdParcelas: 3, numeroEmM: 3, valorEmM: 3333 as Cents }),
      oculos,
      emCurso("compra-tenis", "Tênis", { valorEmM: 15000 as Cents }),
    ];
    const linhas = [
      linha(0, "Sofá", 9, 10, 21000),
      linha(1, "Fone", 3, 3, 3333),
      linha(2, "Tênis", 2, 2, 15000),
    ];

    const reconhecidas = reconhecerCompras(linhas, compras);

    expect(reconhecidas.destinos.map((destino) => destino.tipo)).toEqual([
      "CONTINUA",
      "CONTINUA",
      "CONTINUA",
    ]);
    expect(reconhecidas.naoAparecem).toEqual([oculos]);
  });
});
