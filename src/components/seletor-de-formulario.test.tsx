import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SeletorDeFormulario } from "./seletor-de-formulario";

/** Testes derivados do Done-when de T16. */

afterEach(cleanup);

function montar() {
  render(
    <SeletorDeFormulario
      rotuloDoGrupo="Tipo de lançamento a cadastrar"
      abas={[
        {
          id: "avulso",
          rotulo: "Avulso",
          conteudo: (
            <label>
              Descrição do avulso
              <input />
            </label>
          ),
        },
        {
          id: "parcelado",
          rotulo: "Parcelado",
          conteudo: (
            <label>
              Descrição da compra
              <input />
            </label>
          ),
        },
      ]}
    />,
  );
}

/**
 * O painel resolvido pelo `aria-controls` da aba, e não pelo nome acessível: um
 * elemento com `hidden` sai da árvore de acessibilidade e o nome deixa de ser
 * computável. A ligação entre aba e painel é o que importa afirmar aqui.
 */
function painelDe(nome: string): HTMLElement {
  const aba = screen.getByRole("tab", { name: nome });
  const id = aba.getAttribute("aria-controls") ?? "";
  const painel = document.getElementById(id);
  if (!painel) {
    throw new Error(`aba "${nome}" não aponta para nenhum painel`);
  }
  return painel;
}

describe("SeletorDeFormulario — qual aba está ativa", () => {
  it("começa na primeira aba, que é o gesto mais frequente", () => {
    montar();

    expect(screen.getByRole("tab", { name: "Avulso" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Parcelado" }).getAttribute("aria-selected")).toBe(
      "false",
    );
  });

  it("mostra só o painel da aba ativa", () => {
    montar();

    expect(painelDe("Avulso").hidden).toBe(false);
    expect(painelDe("Parcelado").hidden).toBe(true);
  });

  it("troca de painel ao clicar na outra aba", async () => {
    montar();

    await userEvent.click(screen.getByRole("tab", { name: "Parcelado" }));

    expect(painelDe("Parcelado").hidden).toBe(false);
    expect(painelDe("Avulso").hidden).toBe(true);
  });
});

describe("SeletorDeFormulario — o que foi digitado fica", () => {
  /*
   * O caso real: a pessoa começa a lançar um gasto avulso, percebe que foi
   * parcelado, troca de aba e volta. Desmontar o painel inativo apagaria tudo.
   */
  it("preserva o conteúdo digitado na aba que saiu de vista", async () => {
    montar();
    const campoAvulso = screen.getByLabelText("Descrição do avulso") as HTMLInputElement;
    await userEvent.type(campoAvulso, "Almoço");

    await userEvent.click(screen.getByRole("tab", { name: "Parcelado" }));
    await userEvent.click(screen.getByRole("tab", { name: "Avulso" }));

    expect((screen.getByLabelText("Descrição do avulso") as HTMLInputElement).value).toBe("Almoço");
  });

  it("mantém os dois painéis no DOM, e não só o ativo", () => {
    montar();

    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(2);
  });
});

describe("SeletorDeFormulario — teclado e rótulo acessível", () => {
  it("nomeia o grupo de abas", () => {
    montar();

    expect(screen.getByRole("tablist", { name: "Tipo de lançamento a cadastrar" })).toBeDefined();
  });

  it("anda para a direita com a seta, e dá a volta na última", async () => {
    montar();
    screen.getByRole("tab", { name: "Avulso" }).focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Parcelado" }).getAttribute("aria-selected")).toBe(
      "true",
    );

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Avulso" }).getAttribute("aria-selected")).toBe("true");
  });

  it("anda para a esquerda com a seta", async () => {
    montar();
    screen.getByRole("tab", { name: "Avulso" }).focus();

    await userEvent.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Parcelado" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  /* `Tab` precisa levar ao formulário, não à próxima aba. */
  it("deixa só a aba ativa no fluxo de tabulação", async () => {
    montar();

    expect(screen.getByRole("tab", { name: "Avulso" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("tab", { name: "Parcelado" }).getAttribute("tabindex")).toBe("-1");

    await userEvent.click(screen.getByRole("tab", { name: "Parcelado" }));

    expect(screen.getByRole("tab", { name: "Parcelado" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("tab", { name: "Avulso" }).getAttribute("tabindex")).toBe("-1");
  });

  it("liga cada aba ao painel que ela controla", () => {
    montar();

    const aba = screen.getByRole("tab", { name: "Avulso" });
    expect(painelDe("Avulso").getAttribute("role")).toBe("tabpanel");
    expect(painelDe("Avulso").getAttribute("aria-labelledby")).toBe(aba.id);
  });
});
