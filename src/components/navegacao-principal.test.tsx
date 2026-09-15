import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavegacaoPrincipal } from "./navegacao-principal";

/** Testes derivados de ENTR-01 (AC 1) e NAV-03 (AC 5). */

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

  it("lista exatamente as três áreas implementadas, nesta ordem", () => {
    render(<NavegacaoPrincipal competencia="2026-03" />);

    const nomes = screen.getAllByRole("link").map((l) => l.textContent?.trim());
    expect(nomes).toEqual(["Visão geral", "Lançamentos", "Todo mês"]);
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
