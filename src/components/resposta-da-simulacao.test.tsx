import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Cents, Competencia, LinhaDaSimulacao, Simulacao } from "@/domain";
import { RespostaDaSimulacao, textoDoVeredito } from "./resposta-da-simulacao";

/**
 * Testes derivados de SIM-02 (ACs 3, 5, 6, 7, 8 e 9). As frases são as do
 * dono, literais. Valores escolhidos pela conta (AD-009).
 */

const MARCO = "2026-03";

function linha(
  competencia: string,
  saldoAntes: number,
  parcela: number,
  sobrescrever: Partial<LinhaDaSimulacao> = {},
): LinhaDaSimulacao {
  return {
    competencia: competencia as Competencia,
    parcela: parcela as Cents,
    saldoAntes: saldoAntes as Cents,
    saldoDepois: (saldoAntes - parcela) as Cents,
    jaFaltava: saldoAntes < 0,
    ...sobrescrever,
  };
}

function simulacao(linhas: LinhaDaSimulacao[], sobrescrever: Partial<Simulacao> = {}): Simulacao {
  return {
    linhas,
    cabe: linhas.every((l) => l.jaFaltava || l.saldoDepois >= 0),
    enxergaAte: "2027-03" as Competencia,
    parcelasForaDoHorizonte: 0,
    ...sobrescrever,
  };
}

function renderizar(
  sim: Simulacao,
  extra: { qtdParcelas?: number; menorQueCabe?: number | null } = {},
) {
  render(
    <RespostaDaSimulacao
      simulacao={sim}
      qtdParcelas={extra.qtdParcelas ?? sim.linhas.length}
      menorQueCabe={extra.menorQueCabe ?? null}
      competenciaAberta={MARCO}
    />,
  );
  return screen.getByRole("region", { name: "Resposta da simulação" });
}

afterEach(cleanup);

describe("RespostaDaSimulacao — uma linha por mês (SIM-02, AC 3)", () => {
  it("cada linha traz o mês, a parcela, o antes e o depois com as palavras de Próximos meses", () => {
    const regiao = renderizar(
      simulacao([linha("2026-03", 70000, 33334), linha("2026-04", 70000, 33333)]),
    );
    const itens = within(regiao).getAllByRole("listitem");

    expect(itens).toHaveLength(2);
    const primeira = itens[0] as HTMLElement;
    expect(within(primeira).getByText("Março de 2026")).toBeTruthy();
    expect(within(primeira).getByText("R$ 333,34")).toBeTruthy();
    expect(
      within(primeira)
        .getAllByRole("term")
        .map((t) => t.textContent),
    ).toEqual(["Antes", "Depois"]);
    expect(
      within(primeira)
        .getAllByRole("definition")
        .map((d) => d.textContent),
    ).toEqual(["Vai sobrar R$ 700,00", "Vai sobrar R$ 366,66"]);
  });

  it("antes positivo em verde, depois negativo em vermelho, zero sem cor", () => {
    const regiao = renderizar(
      simulacao([linha("2026-03", 70000, 100000), linha("2026-04", 70000, 70000)]),
    );
    const [marco, abril] = within(regiao).getAllByRole("listitem") as HTMLElement[];

    const valoresDeMarco = within(marco as HTMLElement).getAllByText(/^R\$/);
    expect(valoresDeMarco.map((v) => v.textContent)).toEqual([
      "R$ 1.000,00",
      "R$ 700,00",
      "R$ 300,00",
    ]);
    expect(valoresDeMarco[1]?.className).toContain("text-positivo");
    expect(valoresDeMarco[2]?.className).toContain("text-negativo");
    expect(within(marco as HTMLElement).getAllByRole("definition")[1]?.textContent).toBe(
      "Vai faltar R$ 300,00",
    );

    const zero = within(abril as HTMLElement).getAllByRole("definition")[1] as HTMLElement;
    expect(zero.textContent).toBe("Vai sobrar R$ 0,00");
    const valorZero = within(zero).getByText("R$ 0,00");
    expect(valorZero.className).not.toContain("text-positivo");
    expect(valorZero.className).not.toContain("text-negativo");
  });

  it("a linha de um mês que já faltava diz que já estava no vermelho (AC 6)", () => {
    const regiao = renderizar(
      simulacao([linha("2026-03", 70000, 33334), linha("2026-04", -50000, 33333)]),
    );
    const [marco, abril] = within(regiao).getAllByRole("listitem") as HTMLElement[];

    expect(within(abril as HTMLElement).getByText(/já estava no vermelho/)).toBeTruthy();
    expect(within(marco as HTMLElement).queryByText(/já estava no vermelho/)).toBeNull();
  });
});

describe("RespostaDaSimulacao — o veredito (SIM-02, ACs 5 a 9)", () => {
  it('cabe sem mês no vermelho: "Cabe. Nenhum mês fica no vermelho." (AC 5)', () => {
    const regiao = renderizar(simulacao([linha("2026-03", 70000, 33334)]));

    expect(within(regiao).getByText("Cabe. Nenhum mês fica no vermelho.")).toBeTruthy();
  });

  it("cabe com um mês que já faltava (AC 6)", () => {
    const regiao = renderizar(
      simulacao([linha("2026-04", 70000, 33334), linha("2026-05", -50000, 33333)]),
    );

    expect(
      within(regiao).getByText("Cabe. Maio já estava no vermelho antes desta compra."),
    ).toBeTruthy();
  });

  it("cabe com dois meses que já faltavam: plural", () => {
    const texto = textoDoVeredito({
      simulacao: simulacao([linha("2026-04", -1, 1), linha("2026-05", -1, 1)]),
      qtdParcelas: 2,
      menorQueCabe: 2,
      competenciaAberta: MARCO,
    });

    expect(texto).toBe("Cabe. Abril e maio já estavam no vermelho antes desta compra.");
  });

  it('não cabe em 3x, cabe em 5x: "Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe." (AC 7)', () => {
    const regiao = renderizar(
      simulacao([
        linha("2026-03", 70000, 100000),
        linha("2026-04", 70000, 100000),
        linha("2026-05", -50000, 100000),
      ]),
      { qtdParcelas: 3, menorQueCabe: 5 },
    );

    expect(
      within(regiao).getByText("Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe."),
    ).toBeTruthy();
  });

  it("um mês só no vermelho: singular", () => {
    const texto = textoDoVeredito({
      simulacao: simulacao([linha("2026-03", 70000, 33334), linha("2026-04", 1, 33333)]),
      qtdParcelas: 2,
      menorQueCabe: 4,
      competenciaAberta: MARCO,
    });

    expect(texto).toBe("Em 2x não cabe: abril fica no vermelho. Em 4x cabe.");
  });

  it("três meses no vermelho: vírgula e 'e'; mês de outro ano sai com 'de <ano>'", () => {
    const texto = textoDoVeredito({
      simulacao: simulacao([
        linha("2026-11", 1, 25000),
        linha("2026-12", 1, 25000),
        linha("2027-01", 1, 25000),
        linha("2027-02", 70000, 25000),
      ]),
      qtdParcelas: 4,
      menorQueCabe: 7,
      competenciaAberta: "2026-11",
    });

    expect(texto).toBe(
      "Em 4x não cabe: novembro, dezembro e janeiro de 2027 ficam no vermelho. Em 7x cabe.",
    );
  });

  it('nenhum parcelamento cabe: "Não cabe em nenhum parcelamento até 120x." (AC 8)', () => {
    const regiao = renderizar(simulacao([linha("2026-03", 0, 100000)]), {
      qtdParcelas: 1,
      menorQueCabe: null,
    });

    expect(
      within(regiao).getByText(
        "Em 1x não cabe: março fica no vermelho. Não cabe em nenhum parcelamento até 120x.",
      ),
    ).toBeTruthy();
  });

  it('"Enxergo até Março de 2027." aparece se e só se há parcelas fora do horizonte (AC 9)', () => {
    const regiao = renderizar(
      simulacao([linha("2026-03", 70000, 10000)], { parcelasForaDoHorizonte: 11 }),
    );
    expect(within(regiao).getByText("Enxergo até Março de 2027.")).toBeTruthy();
    cleanup();

    const sem = renderizar(simulacao([linha("2026-03", 70000, 10000)]));
    expect(within(sem).queryByText(/Enxergo até/)).toBeNull();
  });
});
