import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColunaDeCadastro, TituloDoPainel } from "./coluna-de-cadastro";

/**
 * Derivado de CADCOL-04 (AC 15), CADCOL-09 (ACs 3, 5 e 6, na ordem do DOM e
 * nos textos), CADCOL-10 (ACs 2 e 3), CADCOL-11 (AC 2) e do Done-when da T9.
 *
 * O jsdom não aplica o CSS: a coluna escondida abaixo de 1.536 px e a medida
 * dos dois lados do limiar são do e2e (T15 e T21). Aqui, a ordem do DOM, o
 * que existe com e sem item aberto, o `Escape`, o "Fechar" e o foco.
 */

afterEach(cleanup);

const VAZIO = {
  titulo: "Nenhuma categoria aberta",
  texto: "Escolha uma categoria na lista para trocar a cor, renomear e ver onde ela aparece.",
};

function Conteudo({ salvarDesabilitado = false }: { readonly salvarDesabilitado?: boolean }) {
  return (
    <form aria-label="Renomear Categoria Um">
      <TituloDoPainel>Categoria Um</TituloDoPainel>
      <label>
        Nome
        <input defaultValue="Categoria Um" />
      </label>
      <button type="submit" disabled={salvarDesabilitado}>
        Salvar
      </button>
    </form>
  );
}

interface Props {
  readonly aberto?: ReactNode | null;
  readonly focarTitulo?: number;
}

function montar(inicial: Props = {}) {
  const aoFechar = vi.fn();
  const tela = ({ aberto = null, focarTitulo = 0 }: Props) => (
    <ColunaDeCadastro
      cabecalho={<h1>Cadastros</h1>}
      lista={
        <table aria-label="Categorias">
          <tbody>
            <tr>
              <td>
                <button type="button">Categoria Um</button>
              </td>
            </tr>
          </tbody>
        </table>
      }
      idDoPainel="painel-da-categoria"
      rotuloDoPainel="Painel da categoria"
      aberto={aberto}
      vazio={VAZIO}
      focarTitulo={focarTitulo}
      aoFechar={aoFechar}
    />
  );
  const utils = render(tela(inicial));
  return {
    aoFechar,
    usuario: userEvent.setup(),
    mudar: (props: Props) => utils.rerender(tela(props)),
  };
}

function oPainel(): HTMLElement | null {
  return screen.queryByRole("complementary", { name: "Painel da categoria" });
}

function tituloDoPainel(): HTMLElement {
  const painel = oPainel();
  if (painel === null) {
    throw new Error("o painel não está aberto");
  }
  return within(painel).getByRole("heading", { level: 2 });
}

/** A coluna que envolve o painel, ou o vazio. */
function classesDaColuna(elemento: HTMLElement): string[] {
  return elemento.parentElement?.className.split(/\s+/) ?? [];
}

/** `a` vem antes de `b` na ordem do documento. */
function antes(a: Node, b: Node): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe("nada aberto (CADCOL-09, ACs 3 e 6)", () => {
  it("não há painel", () => {
    montar();

    expect(oPainel()).toBeNull();
  });

  it("o título e a dica do vazio estão no DOM, numa coluna que só aparece a partir de 1.536 px", () => {
    montar();

    const titulo = screen.getByRole("heading", { name: VAZIO.titulo });
    const bloco = titulo.parentElement as HTMLElement;
    expect(within(bloco).getByText(VAZIO.texto)).toBeTruthy();
    expect(classesDaColuna(bloco)).toContain("hidden");
    expect(classesDaColuna(bloco)).toContain("2xl:block");
  });
});

describe("algo aberto (CADCOL-04, AC 15; CADCOL-09, AC 5)", () => {
  it("o painel é um aside com o id e o nome recebidos, com o conteúdo recebido", () => {
    montar({ aberto: <Conteudo /> });

    const painel = oPainel() as HTMLElement;
    expect(painel.tagName).toBe("ASIDE");
    expect(painel.id).toBe("painel-da-categoria");
    expect(within(painel).getByRole("form", { name: "Renomear Categoria Um" })).toBeTruthy();
    expect(screen.queryByText(VAZIO.titulo)).toBeNull();
  });

  it("a coluna do painel aparece em toda largura", () => {
    montar({ aberto: <Conteudo /> });

    expect(classesDaColuna(oPainel() as HTMLElement)).not.toContain("hidden");
  });

  it("na ordem do DOM: o cabeçalho, o painel e a lista", () => {
    montar({ aberto: <Conteudo /> });

    const cabecalho = screen.getByRole("heading", { level: 1, name: "Cadastros" });
    const painel = oPainel() as HTMLElement;
    const lista = screen.getByRole("table", { name: "Categorias" });
    expect(antes(cabecalho, painel)).toBe(true);
    expect(antes(painel, lista)).toBe(true);
  });

  it('"Fechar", dentro do painel, chama aoFechar uma vez', async () => {
    const { aoFechar, usuario } = montar({ aberto: <Conteudo /> });

    await usuario.click(within(oPainel() as HTMLElement).getByRole("button", { name: "Fechar" }));

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});

describe("TituloDoPainel", () => {
  it("é um h2 que recebe foco só por programa", () => {
    montar({ aberto: <Conteudo /> });

    expect(tituloDoPainel().tagName).toBe("H2");
    expect(tituloDoPainel().textContent).toBe("Categoria Um");
    expect(tituloDoPainel().getAttribute("tabindex")).toBe("-1");
  });
});

describe("Escape (CADCOL-10, AC 3)", () => {
  it("com o foco num campo do painel, fecha", async () => {
    const { aoFechar, usuario } = montar({ aberto: <Conteudo /> });
    await usuario.click(within(oPainel() as HTMLElement).getByRole("textbox", { name: "Nome" }));

    await usuario.keyboard("{Escape}");

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it("com o foco fora do painel, não fecha", async () => {
    const { aoFechar, usuario } = montar({ aberto: <Conteudo /> });
    screen.getByRole("button", { name: "Categoria Um" }).focus();

    await usuario.keyboard("{Escape}");

    expect(aoFechar).not.toHaveBeenCalled();
  });
});

describe("o foco no título (CADCOL-10, AC 2; CADCOL-11, AC 2)", () => {
  it("abrir pela pessoa, com o painel nascendo junto com o pedido, leva o foco ao título", () => {
    const { mudar } = montar();

    mudar({ aberto: <Conteudo />, focarTitulo: 1 });

    expect(document.activeElement).toBe(tituloDoPainel());
  });

  it("um pedido novo com o painel já aberto também leva o foco ao título", () => {
    const { mudar } = montar({ aberto: <Conteudo />, focarTitulo: 1 });
    screen.getByRole("button", { name: "Categoria Um" }).focus();

    mudar({ aberto: <Conteudo />, focarTitulo: 2 });

    expect(document.activeElement).toBe(tituloDoPainel());
  });

  it("montar já aberto, vindo do endereço, não leva o foco", () => {
    montar({ aberto: <Conteudo />, focarTitulo: 0 });

    expect(document.activeElement).toBe(document.body);
  });
});

/**
 * O botão de envio que se desabilita enquanto grava perde o foco para o
 * `body`, com um `focusout` sem destino, e o `Escape` deixaria de alcançar o
 * painel. O jsdom não reproduz a troca de foco: o teste dispara o `focusout`
 * que o navegador dispara, como em Todo mês. O título recebe o foco sem rolar,
 * para a confirmação ou o alerta junto do botão continuarem à vista.
 */
describe("o foco que o botão desabilitado perderia (CADCOL-10, AC 3)", () => {
  it("o botão desabilitado que perde o foco sem destino o passa ao título, sem rolar", () => {
    montar({ aberto: <Conteudo salvarDesabilitado /> });
    const salvar = within(oPainel() as HTMLElement).getByRole("button", { name: "Salvar" });
    const focar = vi.spyOn(tituloDoPainel(), "focus");

    fireEvent.blur(salvar, { relatedTarget: null });

    expect(document.activeElement).toBe(tituloDoPainel());
    expect(focar).toHaveBeenCalledWith({ preventScroll: true });
  });

  /* A guarda só age no botão desabilitado: o habilitado que perde o foco
     para fora é a pessoa saindo (L-056). */
  it("o botão habilitado que perde o foco sem destino continua com ele", () => {
    montar({ aberto: <Conteudo /> });
    const salvar = within(oPainel() as HTMLElement).getByRole("button", { name: "Salvar" });
    salvar.focus();

    fireEvent.blur(salvar, { relatedTarget: null });

    expect(document.activeElement).toBe(salvar);
  });

  it("o campo que perde o foco para fora não o leva ao título", () => {
    montar({ aberto: <Conteudo /> });
    const campo = within(oPainel() as HTMLElement).getByRole("textbox", { name: "Nome" });
    campo.focus();

    campo.blur();

    expect(document.activeElement).toBe(document.body);
  });
});
