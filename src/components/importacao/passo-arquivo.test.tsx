import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Competencia } from "@/domain";
import { PassoArquivo } from "./passo-arquivo";

/**
 * Testes derivados de IMP-01 (AC 1 e 3), IMP-02 (AC 1 a 4) e IMP-08 (AC 3 a 5
 * e 7), sobre a fixture sintética de outubro (AD-009).
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const OUTUBRO = readFileSync(
  join(__dirname, "../../domain/importacao/__fixtures__/Planilha 2026 - Outubro.csv"),
  "utf-8",
);

function arquivo(conteudo: string, nome: string): File {
  return new File([conteudo], nome, { type: "text/csv" });
}

function montar(competenciaEsperada: string | null = null) {
  const aoContinuar = vi.fn();
  render(
    <PassoArquivo
      nomeDaPessoa="Pessoa A"
      competenciaEsperada={competenciaEsperada as Competencia | null}
      aoContinuar={aoContinuar}
    />,
  );
  return aoContinuar;
}

function soltar(file: File): void {
  fireEvent.drop(screen.getByRole("region", { name: "Área para soltar o arquivo" }), {
    dataTransfer: { files: [file] },
  });
}

function mes(): HTMLSelectElement {
  return screen.getByLabelText("Mês") as HTMLSelectElement;
}

function ano(): HTMLSelectElement {
  return screen.getByLabelText("Ano") as HTMLSelectElement;
}

function continuar(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement;
}

describe("PassoArquivo — arrastar e soltar (IMP-08, AC 3 e 4; IMP-02, AC 1)", () => {
  it('mostra o nome do arquivo e "4 blocos encontrados", e seleciona Outubro e 2026', async () => {
    montar();

    soltar(arquivo(OUTUBRO, "Planilha 2026 - Outubro.csv"));

    expect(await screen.findByText("Planilha 2026 - Outubro.csv")).toBeDefined();
    expect(screen.getByText("4 blocos encontrados")).toBeDefined();
    expect(mes().value).toBe("10");
    expect(ano().value).toBe("2026");
  });

  it("entrega o nome, o conteúdo e a competência ao continuar", async () => {
    const aoContinuar = montar();
    soltar(arquivo(OUTUBRO, "Planilha 2026 - Outubro.csv"));
    await screen.findByText("4 blocos encontrados");

    await userEvent.click(continuar());

    expect(aoContinuar).toHaveBeenCalledWith({
      nomeArquivo: "Planilha 2026 - Outubro.csv",
      conteudo: OUTUBRO,
      competencia: "2026-10",
    });
  });
});

describe("PassoArquivo — pelo teclado (IMP-08, AC 7)", () => {
  it("Enter no botão aciona o seletor, e o arquivo escolhido tem o mesmo efeito", async () => {
    montar();
    const seletor = screen.getByLabelText("Arquivo .csv da aba") as HTMLInputElement;
    const abrirSeletor = vi.spyOn(seletor, "click");

    screen.getByRole("button", { name: "Escolher arquivo" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(abrirSeletor).toHaveBeenCalledTimes(1);

    await userEvent.upload(seletor, arquivo(OUTUBRO, "Planilha 2026 - Outubro.csv"));

    expect(await screen.findByText("Planilha 2026 - Outubro.csv")).toBeDefined();
    expect(screen.getByText("4 blocos encontrados")).toBeDefined();
    expect(mes().value).toBe("10");
    expect(ano().value).toBe("2026");
  });

  it("espaço no botão aciona o seletor, e o arquivo escolhido tem o mesmo efeito", async () => {
    montar();
    const seletor = screen.getByLabelText("Arquivo .csv da aba") as HTMLInputElement;
    const abrirSeletor = vi.spyOn(seletor, "click");

    screen.getByRole("button", { name: "Escolher arquivo" }).focus();
    await userEvent.keyboard(" ");
    expect(abrirSeletor).toHaveBeenCalledTimes(1);

    await userEvent.upload(seletor, arquivo(OUTUBRO, "Planilha 2026 - Outubro.csv"));

    expect(await screen.findByText("Planilha 2026 - Outubro.csv")).toBeDefined();
    expect(screen.getByText("4 blocos encontrados")).toBeDefined();
    expect(mes().value).toBe("10");
    expect(ano().value).toBe("2026");
  });

  it("o seletor aceita só .csv", () => {
    montar();

    expect(screen.getByLabelText("Arquivo .csv da aba").getAttribute("accept")).toBe(".csv");
  });
});

describe("PassoArquivo — o que o passo diz (IMP-02, AC 3 e 4; IMP-08, AC 5)", () => {
  it('exibe "Outubro de 2026" com o aviso de conferir o ano', async () => {
    montar();

    soltar(arquivo(OUTUBRO, "Planilha 2026 - Outubro.csv"));

    expect(await screen.findByText("Outubro de 2026")).toBeDefined();
    expect(screen.getByText("Confira o ano antes de continuar")).toBeDefined();
  });

  it("acompanha a troca de ano por extenso", async () => {
    montar();
    soltar(arquivo(OUTUBRO, "Planilha 2026 - Outubro.csv"));
    await screen.findByText("Outubro de 2026");

    await userEvent.selectOptions(ano(), "2027");

    expect(screen.getByText("Outubro de 2027")).toBeDefined();
  });

  it("diz em nome de quem tudo entra", () => {
    montar();

    expect(screen.getByText("Tudo entra em nome de Pessoa A")).toBeDefined();
  });

  it('com importação anterior, exibe "Próximo mês esperado: Novembro de 2026"', () => {
    montar("2026-11");

    expect(screen.getByText("Próximo mês esperado: Novembro de 2026")).toBeDefined();
  });

  it("antes da primeira importação, não fala em mês esperado", () => {
    montar(null);

    expect(screen.queryByText(/Próximo mês esperado/)).toBeNull();
  });
});

describe("PassoArquivo — mês ou ano que o nome não diz (IMP-02, AC 2)", () => {
  it("outubro.csv: ano sem seleção e Continuar desabilitado até escolher", async () => {
    /* Sem ano no nome nem importação anterior, os anos oferecidos partem do
       ano corrente; o relógio fica fixo para o teste não depender do dia. */
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
    const aoContinuar = montar();
    soltar(arquivo(OUTUBRO, "outubro.csv"));
    await screen.findByText("4 blocos encontrados");

    expect(ano().value).toBe("");
    expect(continuar().disabled).toBe(true);

    await userEvent.selectOptions(ano(), "2026");

    expect(continuar().disabled).toBe(false);
    await userEvent.click(continuar());
    expect(aoContinuar).toHaveBeenCalledWith(expect.objectContaining({ competencia: "2026-10" }));
  });

  it("Continuar começa desabilitado, sem arquivo", () => {
    montar();

    expect(continuar().disabled).toBe(true);
  });
});

describe("PassoArquivo — arquivo recusado (IMP-01, AC 1 e 3)", () => {
  const ARQUIVO_INVALIDO =
    "Este arquivo não parece uma aba da planilha exportada em CSV. No Google Sheets: Arquivo → Fazer download → Valores separados por vírgula (.csv).";

  it(".xlsx: mensagem de arquivo inválido, e nada de blocos", async () => {
    montar();

    soltar(arquivo(OUTUBRO, "Planilha 2026 - Outubro.xlsx"));

    expect((await screen.findByRole("alert")).textContent).toBe(ARQUIVO_INVALIDO);
    expect(screen.queryByText("4 blocos encontrados")).toBeNull();
    expect(continuar().disabled).toBe(true);
  });

  it("acima de 1 MB: mensagem de arquivo inválido, e nada de blocos", async () => {
    montar();

    soltar(arquivo("a".repeat(1_048_577), "Planilha 2026 - Outubro.csv"));

    expect((await screen.findByRole("alert")).textContent).toBe(ARQUIVO_INVALIDO);
    expect(screen.queryByText("4 blocos encontrados")).toBeNull();
    expect(continuar().disabled).toBe(true);
  });

  it("sem o bloco Entradas: a mensagem nomeia “Entradas”", async () => {
    montar();
    const semEntradas = OUTUBRO.replace(",Entradas,", ",Outra coisa,");

    soltar(arquivo(semEntradas, "Planilha 2026 - Outubro.csv"));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "O arquivo não tem o bloco “Entradas”. Exporte a aba de um mês da planilha.",
    );
    expect(continuar().disabled).toBe(true);
  });
});
