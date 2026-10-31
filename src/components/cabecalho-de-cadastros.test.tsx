import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CabecalhoDeCadastros } from "./cabecalho-de-cadastros";

/**
 * Derivado de CADCOL-01 (ACs 1, 2, 3 e 6) e do Done-when da T10: o título da
 * área, a ação ao lado e as duas abas, que são links para as duas rotas no mês
 * aberto. O item "Cadastros" da navegação principal (ACs 4 e 5) é do e2e.
 */

afterEach(cleanup);

function montar(aba: "categorias" | "meios") {
  render(
    <CabecalhoDeCadastros
      competencia="2026-03"
      aba={aba}
      acao={
        <button type="button">{aba === "categorias" ? "+ Nova categoria" : "+ Novo meio"}</button>
      }
    />,
  );
}

function abas(): HTMLElement {
  return screen.getByRole("navigation", { name: "Cadastros" });
}

/** `a` vem antes de `b` na ordem do documento. */
function antes(a: Node, b: Node): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe("o título e as abas (CADCOL-01, ACs 1 e 2)", () => {
  it('o título é "Cadastros", e as abas vêm abaixo dele, na navegação "Cadastros"', () => {
    montar("categorias");

    const titulo = screen.getByRole("heading", { level: 1 });
    expect(titulo.textContent).toBe("Cadastros");
    expect(antes(titulo, abas())).toBe(true);
  });

  it("as abas levam às duas rotas, no mês aberto, nesta ordem", () => {
    montar("categorias");

    const links = within(abas()).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Categorias", "/2026-03/cadastros/categorias"],
      ["Meios de pagamento", "/2026-03/cadastros/meios-de-pagamento"],
    ]);
  });
});

describe("a aba aberta (CADCOL-01, AC 3)", () => {
  it.each([
    ["categorias", "Categorias", "Meios de pagamento"],
    ["meios", "Meios de pagamento", "Categorias"],
  ] as const)("na aba %s, só o link dela tem aria-current=page", (aba, aberta, outra) => {
    montar(aba);

    expect(within(abas()).getByRole("link", { name: aberta }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(within(abas()).getByRole("link", { name: outra }).hasAttribute("aria-current")).toBe(
      false,
    );
  });
});

describe("a ação ao lado do título (CADCOL-01, AC 6)", () => {
  it.each([
    ["categorias", "+ Nova categoria"],
    ["meios", "+ Novo meio"],
  ] as const)("na aba %s, a ação recebida fica junto do título, depois dele", (aba, rotulo) => {
    montar(aba);

    const titulo = screen.getByRole("heading", { level: 1 });
    const acao = screen.getByRole("button", { name: rotulo });
    expect(titulo.parentElement?.contains(acao)).toBe(true);
    expect(antes(titulo, acao)).toBe(true);
    expect(abas().contains(acao)).toBe(false);
  });
});
