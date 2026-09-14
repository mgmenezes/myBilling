import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AlternadorDeTema, CHAVE_TEMA, SCRIPT_TEMA } from "./alternador-de-tema";

/**
 * O que estes testes protegem não é a aparência, é o contrato: **a ausência do
 * atributo `data-tema` significa "siga o sistema"**. É essa ausência que faz o
 * `color-scheme: light dark` do `:root` continuar valendo. Um alternador que
 * escrevesse `data-tema="sistema"` passaria numa revisão visual distraída e
 * congelaria todo mundo no tema claro.
 */

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-tema");
  localStorage.clear();
});

async function escolher(rotulo: string): Promise<void> {
  await userEvent.click(screen.getByRole("radio", { name: rotulo }));
}

describe("escolha de tema", () => {
  it("começa em 'sistema', sem atributo nenhum no documento", () => {
    render(<AlternadorDeTema />);

    expect(screen.getByRole("radio", { name: "Tema do sistema" })).toHaveProperty("checked", true);
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("escolher o tema escuro marca o documento e guarda a preferência", async () => {
    render(<AlternadorDeTema />);

    await escolher("Tema escuro");

    expect(document.documentElement.getAttribute("data-tema")).toBe("escuro");
    expect(localStorage.getItem(CHAVE_TEMA)).toBe("escuro");
  });

  it("escolher o tema claro sobrescreve a escolha anterior", async () => {
    render(<AlternadorDeTema />);

    await escolher("Tema escuro");
    await escolher("Tema claro");

    expect(document.documentElement.getAttribute("data-tema")).toBe("claro");
    expect(localStorage.getItem(CHAVE_TEMA)).toBe("claro");
  });

  it("voltar para 'sistema' remove o atributo e esquece a preferência", async () => {
    render(<AlternadorDeTema />);

    await escolher("Tema escuro");
    await escolher("Tema do sistema");

    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
    expect(localStorage.getItem(CHAVE_TEMA)).toBeNull();
  });

  it("monta já marcando a preferência guardada numa visita anterior", () => {
    localStorage.setItem(CHAVE_TEMA, "claro");

    render(<AlternadorDeTema />);

    expect(screen.getByRole("radio", { name: "Tema claro" })).toHaveProperty("checked", true);
    expect(document.documentElement.getAttribute("data-tema")).toBe("claro");
  });

  it("ignora valor inválido no armazenamento em vez de escrevê-lo no documento", () => {
    localStorage.setItem(CHAVE_TEMA, "roxo");

    render(<AlternadorDeTema />);

    expect(screen.getByRole("radio", { name: "Tema do sistema" })).toHaveProperty("checked", true);
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("os três estados são nomeados para quem usa leitor de tela", () => {
    render(<AlternadorDeTema />);

    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual([
      "sistema",
      "claro",
      "escuro",
    ]);
  });
});

/**
 * O script do `<head>` e o componente leem a mesma chave e aplicam a mesma
 * regra. Se divergirem, volta o lampejo de tema errado no carregamento — o
 * defeito exato que o script existe para evitar. Aqui ele é executado de
 * verdade, não inspecionado como texto.
 */
describe("script inline que roda antes da primeira pintura", () => {
  function rodar(): void {
    new Function(SCRIPT_TEMA)();
  }

  it("aplica a preferência guardada", () => {
    localStorage.setItem(CHAVE_TEMA, "escuro");

    rodar();

    expect(document.documentElement.getAttribute("data-tema")).toBe("escuro");
  });

  it("não escreve nada quando não há preferência guardada", () => {
    rodar();

    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("não escreve nada quando o valor guardado é inválido", () => {
    localStorage.setItem(CHAVE_TEMA, "sistema");

    rodar();

    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });
});
