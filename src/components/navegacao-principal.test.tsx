import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavegacaoPrincipal } from "./navegacao-principal";

/** Testes derivados de ENTR-01 (AC 1), NAV-03 (AC 5) e COR-04 (AC 1). */

let caminhoAtual = "/2026-03";
vi.mock("next/navigation", () => ({ usePathname: () => caminhoAtual }));

afterEach(() => {
  cleanup();
  caminhoAtual = "/2026-03";
});

describe("NavegacaoPrincipal — as áreas e seus nomes (ENTR-01, AC 1)", () => {
  it('nomeia a área de recorrências como "Todo mês", e não "Fixos"', () => {
    render(<NavegacaoPrincipal competencia="2026-03" />);

    expect(screen.getByRole("link", { name: /Todo mês/ })).toBeDefined();
    expect(screen.queryByRole("link", { name: /^Fixos$/ })).toBeNull();
  });

  it("lista exatamente as quatro áreas implementadas, nesta ordem (COR-04, AC 1)", () => {
    render(<NavegacaoPrincipal competencia="2026-03" />);

    const nomes = screen.getAllByRole("link").map((l) => l.textContent?.trim());
    expect(nomes).toEqual(["Visão geral", "Lançamentos", "Todo mês", "Cadastros"]);
  });

  it("mantém a rota /fixos: renomear a área não muda a URL nem quebra link salvo", () => {
    render(<NavegacaoPrincipal competencia="2026-03" />);

    expect(screen.getByRole("link", { name: /Todo mês/ }).getAttribute("href")).toBe(
      "/2026-03/fixos",
    );
  });

  it("leva cada área para a competência aberta", () => {
    render(<NavegacaoPrincipal competencia="2026-07" />);

    expect(screen.getByRole("link", { name: /Visão geral/ }).getAttribute("href")).toBe("/2026-07");
    expect(screen.getByRole("link", { name: /Lançamentos/ }).getAttribute("href")).toBe(
      "/2026-07/lancamentos",
    );
  });

  it("Cadastros leva direto à tela de Categorias do mês aberto (COR-04, AC 1)", () => {
    render(<NavegacaoPrincipal competencia="2026-07" />);

    expect(screen.getByRole("link", { name: "Cadastros" }).getAttribute("href")).toBe(
      "/2026-07/cadastros/categorias",
    );
  });
});

describe("NavegacaoPrincipal — qual área está ativa", () => {
  it("marca a visão geral quando o caminho é a competência sozinha", () => {
    render(<NavegacaoPrincipal competencia="2026-03" />);

    expect(screen.getByRole("link", { name: /Visão geral/ }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("marca Todo mês quando o caminho termina em /fixos", () => {
    caminhoAtual = "/2026-03/fixos";
    render(<NavegacaoPrincipal competencia="2026-03" />);

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
      render(<NavegacaoPrincipal competencia="2026-03" />);

      expect(ativas()).toEqual(["Cadastros"]);
    },
  );

  it.each([
    ["/2026-03", "Visão geral"],
    ["/2026-03/lancamentos", "Lançamentos"],
    ["/2026-03/fixos", "Todo mês"],
  ])("em %s, só %s fica ativo, como antes", (caminho, area) => {
    caminhoAtual = caminho;
    render(<NavegacaoPrincipal competencia="2026-03" />);

    expect(ativas()).toEqual([area]);
  });
});
