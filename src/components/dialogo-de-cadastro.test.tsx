import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { DialogoDeCadastro, useFecharDialogo } from "./dialogo-de-cadastro";

/** Testes derivados de AVUL-05 (AC 2 a 5 e 7). */

/*
 * O jsdom não implementa `showModal`/`close` do `<dialog>`. Os dublês abaixo
 * reproduzem o contrato observável do elemento: o atributo `open` e o evento
 * `close`. O que eles **não** simulam — armadilha de foco, inércia e devolução
 * do foco — é justamente o que o navegador entrega e o motivo de usar o nativo:
 * testá-lo aqui seria testar o dublê. Isso é coberto pelo e2e.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(cleanup);

function ConteudoQueFecha() {
  const fechar = useFecharDialogo();
  return (
    <button type="button" onClick={fechar}>
      Gravar
    </button>
  );
}

function montar(conteudo: React.ReactNode = <input aria-label="Descrição" />) {
  render(
    <DialogoDeCadastro rotuloDoBotao="+ Novo lançamento" titulo="Novo lançamento">
      {conteudo}
    </DialogoDeCadastro>,
  );
}

function elementoDoDialogo(): HTMLDialogElement {
  const dialogo = document.querySelector("dialog");
  if (!dialogo) {
    throw new Error("nenhum <dialog> renderizado");
  }
  return dialogo;
}

describe("DialogoDeCadastro — abrir (AVUL-05, AC 2)", () => {
  it("começa fechado", () => {
    montar();

    expect(elementoDoDialogo().open).toBe(false);
  });

  it("o botão abre o diálogo", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "+ Novo lançamento" }));

    expect(elementoDoDialogo().open).toBe(true);
  });

  it("o botão declara que abre um diálogo e se ele está aberto", async () => {
    montar();
    const botao = screen.getByRole("button", { name: "+ Novo lançamento" });

    expect(botao.getAttribute("aria-haspopup")).toBe("dialog");
    expect(botao.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(botao);

    expect(botao.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("DialogoDeCadastro — fechar", () => {
  it("o botão de fechar fecha", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "+ Novo lançamento" }));

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(elementoDoDialogo().open).toBe(false);
  });

  it("clicar no backdrop fecha, e clicar no conteúdo não", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "+ Novo lançamento" }));

    await userEvent.click(screen.getByLabelText("Descrição"));
    expect(elementoDoDialogo().open).toBe(true);

    await userEvent.click(elementoDoDialogo());
    expect(elementoDoDialogo().open).toBe(false);
  });

  /* O `<dialog>` fecha no `Escape` sem passar pelo nosso código. Sem ouvir o
     evento `close`, o React continuaria achando que está aberto. */
  it("acompanha o fechamento vindo do próprio elemento — AC 4", async () => {
    montar();
    const botao = screen.getByRole("button", { name: "+ Novo lançamento" });
    await userEvent.click(botao);

    /* `act` porque o fechamento vem do elemento, fora de um evento do React. */
    act(() => elementoDoDialogo().close());

    expect(botao.getAttribute("aria-expanded")).toBe("false");
  });

  it("o conteúdo pode se fechar pelo contexto, que é como gravar fecha — AC 5", async () => {
    montar(<ConteudoQueFecha />);
    await userEvent.click(screen.getByRole("button", { name: "+ Novo lançamento" }));

    await userEvent.click(screen.getByRole("button", { name: "Gravar" }));

    expect(elementoDoDialogo().open).toBe(false);
  });
});

describe("DialogoDeCadastro — o que foi digitado fica (AVUL-05, AC 7)", () => {
  it("não desmonta o conteúdo ao fechar", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "+ Novo lançamento" }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await userEvent.click(screen.getByRole("button", { name: "+ Novo lançamento" }));

    expect((screen.getByLabelText("Descrição") as HTMLInputElement).value).toBe("Almoço");
  });
});

describe("DialogoDeCadastro — nome acessível", () => {
  it("o diálogo é nomeado pelo próprio título", async () => {
    montar();
    /* Aberto: `<dialog>` fechado não renderiza, e o título não estaria na
       árvore de acessibilidade para ser encontrado. */
    await userEvent.click(screen.getByRole("button", { name: "+ Novo lançamento" }));

    const titulo = screen.getByRole("heading", { name: "Novo lançamento" });
    expect(elementoDoDialogo().getAttribute("aria-labelledby")).toBe(titulo.id);
  });
});

describe("useFecharDialogo — fora de um diálogo", () => {
  it("devolve um no-op, para o mesmo formulário servir numa página comum", async () => {
    render(<ConteudoQueFecha />);

    await userEvent.click(screen.getByRole("button", { name: "Gravar" }));

    expect(screen.getByRole("button", { name: "Gravar" })).toBeDefined();
  });
});
