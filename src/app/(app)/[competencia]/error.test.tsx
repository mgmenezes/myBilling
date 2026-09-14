import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErroDoMes from "./error";

/**
 * UI-02 AC 8: falha de leitura do mês apresenta estado de erro **com
 * identificador de correlação** e **sem stack trace no navegador**. As duas
 * metades valem o mesmo: mostrar o código sem esconder a mensagem técnica
 * seria vazamento, e esconder tudo deixaria o usuário sem o que informar.
 *
 * Valores de teste são arbitrários e não têm nada de real (AD-009).
 */

afterEach(cleanup);

const MENSAGEM_TECNICA = "connect ECONNREFUSED 127.0.0.1:5433";
const LINHA_DE_STACK = "at consultarVisaoMensal (src/application/mes/handler.ts:42:11)";

function erroDeLeitura(digest?: string): Error & { digest?: string } {
  const erro: Error & { digest?: string } = new Error(MENSAGEM_TECNICA);
  erro.stack = `Error: ${MENSAGEM_TECNICA}\n    ${LINHA_DE_STACK}`;
  if (digest !== undefined) erro.digest = digest;
  return erro;
}

describe("estado de erro do mês (UI-02, AC 8)", () => {
  it("apresenta o erro por um papel que interrompe o leitor de tela", () => {
    render(<ErroDoMes error={erroDeLeitura("abc123def")} reset={vi.fn()} />);

    expect(screen.getByRole("alert").textContent).toMatch(/não foi possível carregar/i);
  });

  it("mostra o identificador de correlação recebido do servidor", () => {
    render(<ErroDoMes error={erroDeLeitura("abc123def")} reset={vi.fn()} />);

    expect(screen.getByRole("alert").textContent).toContain("abc123def");
  });

  it("não expõe a mensagem técnica do erro nem nenhuma linha de stack", () => {
    render(<ErroDoMes error={erroDeLeitura("abc123def")} reset={vi.fn()} />);

    const naTela = screen.getByRole("alert").textContent ?? "";
    expect(naTela).not.toContain(MENSAGEM_TECNICA);
    expect(naTela).not.toContain(LINHA_DE_STACK);
    expect(naTela).not.toMatch(/\bat \S+ \(/);
    expect(screen.queryByText(new RegExp(MENSAGEM_TECNICA, "i"))).toBeNull();
  });

  it("degrada de forma legível quando o Next não fornece digest", () => {
    render(<ErroDoMes error={erroDeLeitura()} reset={vi.fn()} />);

    const naTela = screen.getByRole("alert").textContent ?? "";
    expect(naTela).not.toMatch(/undefined|null|NaN/);
    expect(naTela).toMatch(/sem-identificador/);
  });

  it("oferece a tentativa de novo, que chama o reset do Next", async () => {
    const reset = vi.fn();
    render(<ErroDoMes error={erroDeLeitura("abc123def")} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
