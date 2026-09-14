import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Competencia } from "@/domain";
import { SeletorCompetencia } from "./seletor-competencia";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...resto }: { href: string; children: ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  push.mockReset();
});

function montar(competencia: string) {
  return render(<SeletorCompetencia competencia={competencia as Competencia} />);
}

describe("navegação entre meses (UI-01, AC 2)", () => {
  it("avançar de 2026-12 leva a 2027-01", () => {
    montar("2026-12");
    expect(screen.getByRole("link", { name: /Próximo mês/ })).toHaveProperty(
      "href",
      expect.stringContaining("/2027-01"),
    );
  });

  it("retroceder de 2026-01 leva a 2025-12", () => {
    montar("2026-01");
    expect(screen.getByRole("link", { name: /Mês anterior/ })).toHaveProperty(
      "href",
      expect.stringContaining("/2025-12"),
    );
  });

  it("selecionar outro mês navega para a competência daquele mês", async () => {
    montar("2026-12");
    await userEvent.selectOptions(screen.getByLabelText("Mês"), "03");
    expect(push).toHaveBeenCalledWith("/2026-03");
  });

  it("selecionar outro ano preserva o mês e atravessa a virada de ano", async () => {
    montar("2026-12");
    await userEvent.selectOptions(screen.getByLabelText("Ano"), "2028");
    expect(push).toHaveBeenCalledWith("/2028-12");
  });
});

describe("rótulo do mês em português", () => {
  it("exibe o nome do mês e o ano da competência corrente", () => {
    montar("2026-12");
    expect(screen.getByText("Dezembro de 2026")).toBeDefined();
  });

  it("oferece os doze meses com nome em português", () => {
    montar("2026-12");
    const opcoes = Array.from(
      screen.getByLabelText("Mês").querySelectorAll("option"),
      (opcao) => opcao.textContent,
    );
    expect(opcoes).toEqual([
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ]);
  });
});

describe("acessibilidade dos controles", () => {
  it("cada controle tem rótulo acessível", () => {
    montar("2026-12");
    expect(screen.getByRole("link", { name: "Mês anterior: Novembro de 2026" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Próximo mês: Janeiro de 2027" })).toBeDefined();
    expect(screen.getByLabelText("Mês")).toBeDefined();
    expect(screen.getByLabelText("Ano")).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Navegação entre meses" })).toBeDefined();
  });

  it("o teclado alcança os quatro controles na ordem visual", async () => {
    montar("2026-12");
    const esperados = [
      screen.getByRole("link", { name: /Mês anterior/ }),
      screen.getByLabelText("Mês"),
      screen.getByLabelText("Ano"),
      screen.getByRole("link", { name: /Próximo mês/ }),
    ];
    for (const controle of esperados) {
      await userEvent.tab();
      expect(document.activeElement).toBe(controle);
    }
  });

  it("selecionar o mês pelo teclado navega igual ao mouse", async () => {
    montar("2026-12");
    const seletorDeMes = screen.getByLabelText("Mês");
    seletorDeMes.focus();
    await userEvent.selectOptions(seletorDeMes, "01");
    expect(push).toHaveBeenCalledWith("/2026-01");
  });
});
