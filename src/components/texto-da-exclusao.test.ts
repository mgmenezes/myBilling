import { describe, expect, it } from "vitest";
import type { ExclusaoDaParcela } from "@/application/mes/obter-visao-mensal/handler";
import { avisoDaExclusao, toastDaExclusao } from "./texto-da-exclusao";

/**
 * Testes derivados de EXC-02 (ACs 2 a 6), EXC-04 (AC 4) e EXC-05 (AC 5): os
 * textos do aviso dentro do menu e do toast depois de excluir. Compra em 4x de
 * R$ 10,00, de dezembro de 2026 a março de 2027.
 */

function plano(
  parcial: Partial<Extract<ExclusaoDaParcela, { tipo: "PLANO" }>> = {},
): ExclusaoDaParcela {
  return {
    tipo: "PLANO",
    parcelas: 3,
    primeira: "2027-01",
    ultima: "2027-03",
    totalCentavos: 3000,
    pagasQueFicam: 0,
    inteira: false,
    ...parcial,
  };
}

describe("o aviso da exclusão, pelo número de parcelas que saem (EXC-02, ACs 2 e 3)", () => {
  it("3 parcelas a partir da 2/4: o texto inteiro do Independent Test (ACs 2 e 4)", () => {
    expect(avisoDaExclusao("Compra A", plano())).toBe(
      "Excluir Compra A desta parcela em diante? Saem 3 parcelas, de Janeiro de 2027 a Março de 2027, somando R$ 30,00. As anteriores ficam.",
    );
  });

  it('2 parcelas ainda vão no plural: "Saem 2 parcelas" (AC 2; L-029)', () => {
    expect(
      avisoDaExclusao(
        "Compra A",
        plano({ parcelas: 2, primeira: "2027-02", ultima: "2027-03", totalCentavos: 2000 }),
      ),
    ).toBe(
      "Excluir Compra A desta parcela em diante? Saem 2 parcelas, de Fevereiro de 2027 a Março de 2027, somando R$ 20,00. As anteriores ficam.",
    );
  });

  it('1 parcela vai no singular, com o mês e o valor: "Sai 1 parcela, em <primeiro>, de <total>." (AC 3; L-029)', () => {
    expect(
      avisoDaExclusao(
        "Compra A",
        plano({ parcelas: 1, primeira: "2027-01", ultima: "2027-01", totalCentavos: 1000 }),
      ),
    ).toBe(
      "Excluir Compra A desta parcela em diante? Sai 1 parcela, em Janeiro de 2027, de R$ 10,00. As anteriores ficam.",
    );
  });
});

describe("o começo e o fim do aviso, pelo que fica antes (EXC-02, ACs 4 e 5)", () => {
  it('sem parcela vigente antes: começa com "Excluir a compra <descrição> inteira?" (AC 5)', () => {
    const texto = avisoDaExclusao(
      "Compra A",
      plano({ parcelas: 4, primeira: "2026-12", totalCentavos: 4000, inteira: true }),
    );

    expect(texto).toBe(
      "Excluir a compra Compra A inteira? Saem 4 parcelas, de Dezembro de 2026 a Março de 2027, somando R$ 40,00.",
    );
  });

  it('sem parcela vigente antes: não diz "As anteriores ficam." (AC 5; L-010)', () => {
    const texto = avisoDaExclusao("Compra A", plano({ inteira: true }));

    expect(texto).not.toContain("As anteriores ficam.");
    expect(texto).not.toContain("desta parcela em diante?");
  });
});

describe("as parcelas pagas que ficam (EXC-02, AC 6)", () => {
  it('1 paga: acrescenta "1 parcela já paga fica.", antes de "As anteriores ficam."', () => {
    expect(
      avisoDaExclusao("Compra A", plano({ parcelas: 2, totalCentavos: 2000, pagasQueFicam: 1 })),
    ).toBe(
      "Excluir Compra A desta parcela em diante? Saem 2 parcelas, de Janeiro de 2027 a Março de 2027, somando R$ 20,00. 1 parcela já paga fica. As anteriores ficam.",
    );
  });

  it('2 pagas: acrescenta "2 parcelas já pagas ficam."', () => {
    const texto = avisoDaExclusao(
      "Compra A",
      plano({
        parcelas: 1,
        primeira: "2027-01",
        ultima: "2027-01",
        totalCentavos: 1000,
        pagasQueFicam: 2,
      }),
    );

    expect(texto).toBe(
      "Excluir Compra A desta parcela em diante? Sai 1 parcela, em Janeiro de 2027, de R$ 10,00. 2 parcelas já pagas ficam. As anteriores ficam.",
    );
    expect(texto).not.toContain("1 parcela já paga fica.");
  });

  it("nenhuma paga: não fala de parcela paga", () => {
    const texto = avisoDaExclusao("Compra A", plano());

    expect(texto).not.toContain("já paga");
    expect(texto).not.toContain("já pagas");
  });
});

describe("nada a excluir (EXC-05, AC 5)", () => {
  it("todo o alcance pago: o aviso diz que não há o que excluir", () => {
    expect(avisoDaExclusao("Compra A", { tipo: "NADA" })).toBe(
      "Todas as parcelas desta em diante já foram pagas. Nada a excluir.",
    );
  });
});

describe("o toast depois de excluir (EXC-04, AC 4)", () => {
  it('1: "1 parcela excluída."', () => {
    expect(toastDaExclusao(1)).toBe("1 parcela excluída.");
  });

  it('2: "2 parcelas excluídas."', () => {
    expect(toastDaExclusao(2)).toBe("2 parcelas excluídas.");
  });
});
