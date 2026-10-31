import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useParametroNaUrl } from "./parametro-na-url";

/**
 * Derivado de CADCOL-11 (ACs 1 e 4) e de L-058: o parâmetro vai ao endereço
 * pelo `router.replace` do Next, sem rolar e sem entrada no histórico, e a
 * comparação é com o último valor pedido.
 *
 * Aqui o `replace` do mock **não** muda a URL, como o do Next nos ~100 ms até
 * a resposta: a barra continua com o endereço de antes. O "sem entrada nova"
 * no navegador está no e2e, pelo `history.length`.
 */

const { trocar, empurrar } = vi.hoisted(() => ({
  trocar: vi.fn(),
  empurrar: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: trocar, push: empurrar }),
}));

const CAMINHO = "/2026-03/cadastros/categorias";

beforeEach(() => {
  window.history.replaceState(null, "", `${CAMINHO}?outro=1`);
});

afterEach(() => {
  trocar.mockReset();
  empurrar.mockReset();
});

function montar(inicial: string | null) {
  return renderHook(() => useParametroNaUrl("categoria", inicial)).result.current;
}

describe("useParametroNaUrl (CADCOL-11, ACs 1 e 4)", () => {
  it("põe o parâmetro pelo router.replace, sem rolar, mantendo os outros, sem push", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const mudar = montar(null);

    mudar("a");

    expect(trocar).toHaveBeenCalledTimes(1);
    expect(trocar).toHaveBeenCalledWith("?outro=1&categoria=a", { scroll: false });
    expect(empurrar).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it("tira o parâmetro, mantendo os outros", () => {
    window.history.replaceState(null, "", `${CAMINHO}?outro=1&categoria=a`);
    const mudar = montar("a");

    mudar(null);

    expect(trocar).toHaveBeenCalledWith("?outro=1", { scroll: false });
  });

  it("sem nenhum outro parâmetro, tirar deixa o caminho sem '?'", () => {
    window.history.replaceState(null, "", `${CAMINHO}?categoria=a`);
    const mudar = montar("a");

    mudar(null);

    expect(trocar).toHaveBeenCalledWith(CAMINHO, { scroll: false });
  });

  it("pedir o valor que já está no endereço da carga não navega", () => {
    window.history.replaceState(null, "", `${CAMINHO}?outro=1&categoria=a`);
    const mudar = montar("a");

    mudar("a");

    expect(trocar).not.toHaveBeenCalled();
  });
});

describe("a comparação com o último valor pedido (L-058)", () => {
  it("pôr e logo tirar pede o endereço sem o parâmetro, com a barra ainda sem ele", () => {
    const mudar = montar(null);

    mudar("a");
    mudar(null);

    expect(trocar).toHaveBeenCalledTimes(2);
    expect(trocar).toHaveBeenLastCalledWith("?outro=1", { scroll: false });
  });

  it("tirar e logo repor o da carga pede o endereço com ele, com a barra ainda com ele", () => {
    window.history.replaceState(null, "", `${CAMINHO}?outro=1&categoria=a`);
    const mudar = montar("a");

    mudar(null);
    mudar("a");

    expect(trocar).toHaveBeenCalledTimes(2);
    expect(trocar).toHaveBeenLastCalledWith("?outro=1&categoria=a", { scroll: false });
  });

  it("um valor da carga fora da lista sai ao pedir null", () => {
    window.history.replaceState(null, "", `${CAMINHO}?outro=1&categoria=de-outro-lugar`);
    const mudar = montar("de-outro-lugar");

    mudar(null);

    expect(trocar).toHaveBeenCalledWith("?outro=1", { scroll: false });
  });
});
