import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavegacaoPrincipal } from "./navegacao-principal";

/**
 * Testes derivados de ENTR-01 (AC 1), NAV-03 (AC 5), COR-04 (AC 1) e TRES-01
 * (ACs 3 e 4). A competência vem do segmento da rota, como no app: o menu
 * mora num layout acima de `[competencia]` e não a recebe por prop.
 */

let caminhoAtual = "/2026-03";
let parametros: Record<string, string> = { competencia: "2026-03" };
vi.mock("next/navigation", () => ({
  usePathname: () => caminhoAtual,
  useParams: () => parametros,
}));

afterEach(() => {
  cleanup();
  caminhoAtual = "/2026-03";
  parametros = { competencia: "2026-03" };
});

/** Abre a navegação como se a rota fosse a da competência dada. */
function abrir(competencia: string): void {
  parametros = { competencia };
  render(<NavegacaoPrincipal />);
}

describe("NavegacaoPrincipal — fora de uma competência (TRES-01, AC 4)", () => {
  it("na home do ano, sem competência na rota, não desenha item nenhum", () => {
    caminhoAtual = "/";
    parametros = {};
    render(<NavegacaoPrincipal />);

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryAllByRole("link")).toEqual([]);
  });

  it("com um segmento que não é competência, também não desenha nada", () => {
    caminhoAtual = "/2026-13";
    parametros = { competencia: "2026-13" };
    render(<NavegacaoPrincipal />);

    expect(screen.queryByRole("navigation")).toBeNull();
  });
});

describe("NavegacaoPrincipal — as áreas e seus nomes (ENTR-01, AC 1)", () => {
  it('nomeia a área de recorrências como "Todo mês", e não "Fixos"', () => {
    abrir("2026-03");

    expect(screen.getByRole("link", { name: /Todo mês/ })).toBeDefined();
    expect(screen.queryByRole("link", { name: /^Fixos$/ })).toBeNull();
  });

  it("lista exatamente as quatro áreas implementadas, nesta ordem (COR-04, AC 1)", () => {
    abrir("2026-03");

    const nomes = screen.getAllByRole("link").map((l) => l.textContent?.trim());
    expect(nomes).toEqual(["Visão geral", "Lançamentos", "Todo mês", "Cadastros"]);
  });

  it("mantém a rota /fixos: renomear a área não muda a URL nem quebra link salvo", () => {
    abrir("2026-03");

    expect(screen.getByRole("link", { name: /Todo mês/ }).getAttribute("href")).toBe(
      "/2026-03/fixos",
    );
  });

  it("leva cada área para a competência aberta", () => {
    abrir("2026-07");

    expect(screen.getByRole("link", { name: /Visão geral/ }).getAttribute("href")).toBe("/2026-07");
    expect(screen.getByRole("link", { name: /Lançamentos/ }).getAttribute("href")).toBe(
      "/2026-07/lancamentos",
    );
  });

  it("Cadastros leva direto à tela de Categorias do mês aberto (COR-04, AC 1)", () => {
    abrir("2026-07");

    expect(screen.getByRole("link", { name: "Cadastros" }).getAttribute("href")).toBe(
      "/2026-07/cadastros/categorias",
    );
  });
});

describe("NavegacaoPrincipal — qual área está ativa", () => {
  it("marca a visão geral quando o caminho é a competência sozinha", () => {
    abrir("2026-03");

    expect(screen.getByRole("link", { name: /Visão geral/ }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("marca Todo mês quando o caminho termina em /fixos", () => {
    caminhoAtual = "/2026-03/fixos";
    abrir("2026-03");

    expect(screen.getByRole("link", { name: /Todo mês/ }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      screen.getByRole("link", { name: /Visão geral/ }).getAttribute("aria-current"),
    ).toBeNull();
  });
});

describe("NavegacaoPrincipal — Cadastros ativo em toda a área (COR-04, AC 1)", () => {
  const AREAS = ["Visão geral", "Lançamentos", "Todo mês", "Cadastros"];

  function ativas(): ReadonlyArray<string> {
    return AREAS.filter(
      (nome) => screen.getByRole("link", { name: nome }).getAttribute("aria-current") === "page",
    );
  }

  it.each(["/2026-03/cadastros/categorias", "/2026-03/cadastros", "/2026-03/cadastros/outra-tela"])(
    "em %s, só Cadastros fica ativo",
    (caminho) => {
      caminhoAtual = caminho;
      abrir("2026-03");

      expect(ativas()).toEqual(["Cadastros"]);
    },
  );

  it.each([
    ["/2026-03", "Visão geral"],
    ["/2026-03/lancamentos", "Lançamentos"],
    ["/2026-03/fixos", "Todo mês"],
  ])("em %s, só %s fica ativo, como antes", (caminho, area) => {
    caminhoAtual = caminho;
    abrir("2026-03");

    expect(ativas()).toEqual([area]);
  });
});
