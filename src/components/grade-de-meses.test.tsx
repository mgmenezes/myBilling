import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { competenciasDoAno } from "@/application/ano/obter-visao-anual/handler";
import type { Competencia } from "@/domain";
import { GradeDeMeses } from "./grade-de-meses";

/**
 * Testes derivados de HOME-01 (ACs 2, 5).
 *
 * O que eles protegem é a promessa do launcher: **doze destinos reais**, com o
 * mês corrente distinguível sem depender de enxergar cor. Passado e futuro se
 * separam por traço da borda, e o corrente carrega `aria-current` — é o que faz
 * a marca existir também para quem não vê a barra azul.
 */

afterEach(cleanup);

const SETEMBRO = "2026-09" as Competencia;

function montar(ano: number, corrente: Competencia = SETEMBRO) {
  return render(
    <GradeDeMeses competencias={competenciasDoAno(ano)} competenciaCorrente={corrente} />,
  );
}

describe("a grade de meses", () => {
  it("oferece os doze meses do ano como links", () => {
    montar(2026);

    expect(screen.getAllByRole("link")).toHaveLength(12);
  });

  it("aponta cada mês para a rota da sua competência", () => {
    montar(2026);

    expect(screen.getByRole("link", { name: /janeiro/i }).getAttribute("href")).toBe("/2026-01");
    expect(screen.getByRole("link", { name: /dezembro/i }).getAttribute("href")).toBe("/2026-12");
  });

  it("nomeia os meses em português", () => {
    montar(2026);

    expect(screen.getByText("Março")).toBeTruthy();
    expect(screen.getByText("Agosto")).toBeTruthy();
  });

  it("marca o mês corrente por aria-current, não só por pintura", () => {
    montar(2026, SETEMBRO);

    const setembro = screen.getByRole("link", { name: /setembro/i });
    expect(setembro.getAttribute("aria-current")).toBe("date");
  });

  it("não marca mês nenhum quando o ano exibido não é o do mês corrente", () => {
    montar(2025, SETEMBRO);

    expect(screen.queryByRole("link", { current: "date" })).toBeNull();
  });

  it("distingue futuro de passado por traço da borda, e não por cor", () => {
    const { container } = montar(2026, SETEMBRO);
    const marco = container.querySelector('[href="/2026-03"]');
    const novembro = container.querySelector('[href="/2026-11"]');

    expect(marco?.className).toContain("border-line");
    expect(marco?.className).not.toContain("border-dashed");
    expect(novembro?.className).toContain("border-dashed");
  });

  it("trata o ano inteiro como futuro quando ele ainda não começou", () => {
    const { container } = montar(2027, SETEMBRO);

    expect(container.querySelectorAll(".border-dashed")).toHaveLength(12);
  });

  it("diz em texto que um mês ainda não chegou, para quem não vê a borda", () => {
    montar(2026, SETEMBRO);

    expect(screen.getByRole("link", { name: /novembro.*ainda não chegou/i })).toBeTruthy();
  });
});
