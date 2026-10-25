import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PreviaParaATela } from "@/app/actions/importacao";
import { PassoConferencia } from "./passo-conferencia";
import { previaDe } from "./previas-de-teste";

/**
 * Testes derivados de IMP-05 (AC 1 a 7 e 9) e IMP-08 (AC 8), sobre as prévias
 * que `planejarImportacao` monta das fixtures sintéticas (AD-009). Os valores
 * esperados são os do design, "Fixtures sintéticas".
 */

afterEach(cleanup);

function montar(
  previa: PreviaParaATela,
  { gravando = false, erro = null }: { gravando?: boolean; erro?: string | null } = {},
) {
  const aoImportar = vi.fn();
  render(
    <PassoConferencia previa={previa} gravando={gravando} erro={erro} aoImportar={aoImportar} />,
  );
  return aoImportar;
}

/** O bloco abrível da conferência cujo título é `titulo`. */
function bloco(titulo: string): HTMLDetailsElement {
  const detalhes = screen.getByText(titulo, { selector: "summary *" }).closest("details");
  if (!detalhes) {
    throw new Error(`bloco "${titulo}" não é abrível`);
  }
  return detalhes;
}

function resumo(titulo: string): HTMLElement {
  const elemento = bloco(titulo).querySelector("summary");
  if (!elemento) {
    throw new Error(`bloco "${titulo}" sem resumo`);
  }
  return elemento;
}

async function abrir(titulo: string): Promise<HTMLDetailsElement> {
  await userEvent.click(resumo(titulo));
  return bloco(titulo);
}

/** A linha da conferência de Saídas, que não abre: não tem linhas próprias. */
function saidas(): HTMLElement {
  const linha = screen.getByText("Saídas").closest("li");
  if (!linha) {
    throw new Error("conferência de Saídas fora da lista");
  }
  return linha;
}

function botaoImportar(): HTMLButtonElement {
  return screen.getByRole("button", { name: /^Importar/ }) as HTMLButtonElement;
}

describe("PassoConferencia — conferência por bloco (IMP-05, AC 1 a 3)", () => {
  it.each([
    ["Fixos", "4 linhas", "R$ 1.840,00", "R$ 1.840,00"],
    ["Cartão de Crédito", "6 linhas", "R$ 423,34", "R$ 423,34"],
    ["Gastos do Mês", "3 linhas", "R$ 124,50", "R$ 112,50"],
    ["Entradas", "3 linhas", "R$ 10.150,00", "R$ 10.150,00"],
  ])("outubro, %s: %s, soma lida %s e total da planilha %s", (titulo, linhas, lido, total) => {
    montar(previaDe("Outubro"));
    const texto = resumo(titulo).textContent;

    expect(texto).toContain(linhas);
    expect(texto).toContain(`Lido ${lido}`);
    expect(texto).toContain(`Planilha ${total}`);
  });

  it("marca Fixos, Cartão e Entradas como conferidos", () => {
    montar(previaDe("Outubro"));

    for (const titulo of ["Fixos", "Cartão de Crédito", "Entradas"]) {
      expect(resumo(titulo).textContent).toContain("Confere");
    }
  });

  it("marca Gastos do Mês como divergente, com R$ 12,00 de diferença", () => {
    montar(previaDe("Outubro"));

    expect(resumo("Gastos do Mês").textContent).toContain("Diverge em R$ 12,00");
    expect(resumo("Gastos do Mês").textContent).not.toContain("Confere");
  });

  it("bloco sem total legível na planilha é divergente", () => {
    const outubro = previaDe("Outubro");
    const semTotal: PreviaParaATela = {
      ...outubro,
      conferencia: {
        ...outubro.conferencia,
        blocos: {
          ...outubro.conferencia.blocos,
          FIXOS: {
            ...outubro.conferencia.blocos.FIXOS,
            totalDaPlanilha: null,
            confere: false,
            diferenca: null,
          },
        },
      },
    };
    montar(semTotal);

    expect(resumo("Fixos").textContent).toContain("Sem total na planilha");
    expect(resumo("Fixos").textContent).not.toContain("Confere");
  });
});

describe("PassoConferencia — conferência de Saídas (IMP-05, AC 4)", () => {
  it("outubro: as despesas lidas conferem com o Total de Saídas", () => {
    montar(previaDe("Outubro"));
    const texto = saidas().textContent;

    expect(texto).toContain("Lido R$ 2.387,84");
    expect(texto).toContain("Planilha R$ 2.387,84");
    expect(texto).toContain("Confere");
  });

  it("dezembro: Saídas diverge em R$ 40,00, a linha da Mesa", () => {
    montar(previaDe("Dezembro"));

    expect(saidas().textContent).toContain("Diverge em R$ 40,00");
    expect(saidas().textContent).not.toContain("Confere");
  });
});

describe("PassoConferencia — o destino de cada linha (IMP-05, AC 5)", () => {
  it("outubro: as linhas de Fixos são novas e as do Cartão, compras novas", async () => {
    montar(previaDe("Outubro"));

    const fixos = within(await abrir("Fixos"));
    expect(fixos.getAllByText("novo")).toHaveLength(4);
    const cartao = within(await abrir("Cartão de Crédito"));
    expect(cartao.getAllByText("compra nova")).toHaveLength(6);
  });

  it("abrir um bloco mostra as linhas dele", async () => {
    montar(previaDe("Novembro"));
    expect(bloco("Fixos").open).toBe(false);

    const fixos = await abrir("Fixos");

    expect(fixos.open).toBe(true);
  });

  it("novembro, Fixos: Internet com reajuste de R$ 100,00 para R$ 110,00", async () => {
    montar(previaDe("Novembro"));

    const fixos = within(await abrir("Fixos"));

    const internet = fixos.getByText("Internet").closest("li");
    expect(internet?.textContent).toContain(
      "reajuste a partir de Novembro de 2026: R$ 100,00 → R$ 110,00",
    );
    expect(fixos.getAllByText("já existe")).toHaveLength(2);
  });

  it("novembro, Cartão: Fone continua de outubro com valor novo", async () => {
    montar(previaDe("Novembro"));

    const cartao = within(await abrir("Cartão de Crédito"));

    const fone = cartao.getByText("Fone").closest("li");
    expect(fone?.textContent).toContain(
      "continua de Outubro de 2026, com valor novo: R$ 33,34 → R$ 33,33",
    );
    const sofa = cartao.getByText("Sofá").closest("li");
    expect(sofa?.textContent).toContain("continua de Outubro de 2026");
    expect(sofa?.textContent).not.toContain("valor novo");
  });

  it('novembro: "Deixa de valer a partir de Novembro de 2026: Academia"', () => {
    montar(previaDe("Novembro"));

    const lista = screen.getByRole("list", { name: "Deixa de valer a partir de Novembro de 2026" });
    expect(
      within(lista)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Academia"]);
  });

  it('dezembro: "Não aparece nesta aba: Óculos"', () => {
    montar(previaDe("Dezembro"));

    const lista = screen.getByRole("list", { name: "Não aparece nesta aba" });
    expect(
      within(lista)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Óculos"]);
  });

  it("outubro não tem o que deixe de valer nem o que não apareça", () => {
    montar(previaDe("Outubro"));

    expect(screen.queryByRole("list", { name: /Deixa de valer/ })).toBeNull();
    expect(screen.queryByRole("list", { name: "Não aparece nesta aba" })).toBeNull();
  });
});

describe("PassoConferencia — linhas não lidas (IMP-05, AC 6)", () => {
  function naoLidas(): string[] {
    return within(screen.getByRole("list", { name: "Linhas não lidas" }))
      .getAllByRole("listitem")
      .map((item) => item.textContent ?? "");
  }

  it("dezembro: bloco, nome e motivo de cada linha não lida", () => {
    montar(previaDe("Dezembro"));

    expect(naoLidas()).toEqual([
      "Fixos · Internet · sem valor",
      "Cartão de Crédito · Mesa · parcela fora do formato n/t",
      "Entradas · Bônus · valor não é dinheiro",
    ]);
  });

  it("valor zero e nome vazio também têm motivo em pt-BR", () => {
    const outubro = previaDe("Outubro");
    montar({
      ...outubro,
      naoLidas: [
        { bloco: "GASTOS", posicao: 3, nome: "Brinde", tipo: "Débito", motivo: "VALOR_ZERO" },
        { bloco: "GASTOS", posicao: 4, nome: "", tipo: "Débito", motivo: "NOME_VAZIO" },
      ],
    });

    expect(naoLidas()).toEqual(["Gastos do Mês · Brinde · valor zero", "Gastos do Mês · sem nome"]);
  });
});

describe("PassoConferencia — importar (IMP-05, AC 7 e 9)", () => {
  it('rotula o botão "Importar 16 lançamentos" em outubro', () => {
    montar(previaDe("Outubro"));

    expect(botaoImportar().textContent).toBe("Importar 16 lançamentos");
  });

  it("com divergência, o botão fica desabilitado até a confirmação", async () => {
    const aoImportar = montar(previaDe("Outubro"));
    expect(botaoImportar().disabled).toBe(true);

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Entendi a diferença, importar mesmo assim" }),
    );
    expect(botaoImportar().disabled).toBe(false);

    await userEvent.click(botaoImportar());
    expect(aoImportar).toHaveBeenCalledWith(true);
  });

  it("sem divergência, não pede confirmação e importa direto", async () => {
    const aoImportar = montar(previaDe("Novembro"));

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(botaoImportar().textContent).toBe("Importar 9 lançamentos");
    expect(botaoImportar().disabled).toBe(false);

    await userEvent.click(botaoImportar());
    expect(aoImportar).toHaveBeenCalledWith(false);
  });

  it("enquanto grava, o botão fica desabilitado", () => {
    montar(previaDe("Novembro"), { gravando: true });

    const botao = screen.getByRole("button", { name: "Importando…" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });
});

describe("PassoConferencia — recusa do servidor (IMP-08, AC 8)", () => {
  it("mostra a mensagem recebida dentro do passo", () => {
    montar(previaDe("Novembro"), {
      erro: "As abas entram em sequência. A próxima é Dezembro de 2026.",
    });

    expect(screen.getByRole("alert").textContent).toBe(
      "As abas entram em sequência. A próxima é Dezembro de 2026.",
    );
  });

  it("sem erro, não há alerta", () => {
    montar(previaDe("Novembro"));

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
