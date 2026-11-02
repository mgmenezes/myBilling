import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MenuLateral } from "./menu-lateral";

/**
 * Testes derivados de TRES-01 (ACs 1, 3, 4 e 5). As consultas ficam presas ao
 * menu (L-018): o AC diz que o nome, o tema e o importar estão **nele**.
 *
 * O importar entra aqui como um botão qualquer, porque o menu só decide onde
 * ele fica. Que ele abre o diálogo de importação de verdade é provado no e2e
 * `e2e/visao-tres-colunas.spec.ts`, pela composição da página.
 */

let parametros: Record<string, string> = { competencia: "2026-03" };
vi.mock("next/navigation", () => ({
  usePathname: () => "/2026-03",
  useParams: () => parametros,
}));

afterEach(() => {
  cleanup();
  parametros = { competencia: "2026-03" };
});

function montar(): HTMLElement {
  render(
    <MenuLateral
      nomeDaPessoa="Pessoa A"
      importar={<button type="button">Importar planilha</button>}
    />,
  );
  return screen.getByRole("complementary", { name: "Menu do Jano" });
}

describe("o menu lateral (TRES-01)", () => {
  it("a marca leva para a home do ano (AC 1)", () => {
    const menu = montar();

    expect(within(menu).getByRole("link", { name: "Jano" }).getAttribute("href")).toBe("/");
  });

  it("a marca é o símbolo de dois arcos do Jano, sem nome acessível próprio (NOME-01, AC 1)", () => {
    const menu = montar();

    const marca = within(menu).getByRole("link", { name: "Jano" });
    const simbolo = marca.querySelector("svg[data-marca='jano']");
    expect(simbolo).not.toBeNull();
    expect(simbolo?.getAttribute("aria-hidden")).toBe("true");
    expect(simbolo?.querySelectorAll("path")).toHaveLength(2);
  });

  it("com um mês aberto, tem as áreas do Jano (AC 3)", () => {
    const menu = montar();

    const areas = within(menu).getByRole("navigation", { name: "Áreas do Jano" });
    /* Cinco desde o simulador (SIM-03, AC 1). */
    expect(within(areas).getAllByRole("link")).toHaveLength(5);
  });

  it("na home do ano, sem mês aberto, não tem as áreas, mas tem a marca e o pé (AC 4)", () => {
    parametros = {};
    const menu = montar();

    expect(within(menu).queryByRole("navigation")).toBeNull();
    expect(within(menu).getByRole("link", { name: "Jano" })).toBeDefined();
    expect(within(menu).getByText("Pessoa A")).toBeDefined();
  });

  it("o pé tem o nome de quem está logado, o tema e o importar (AC 5)", () => {
    const menu = montar();

    expect(within(menu).getByText("Pessoa A")).toBeDefined();
    expect(within(menu).getByRole("group", { name: "Tema da interface" })).toBeDefined();
    expect(within(menu).getByRole("button", { name: "Importar planilha" })).toBeDefined();
  });
});
