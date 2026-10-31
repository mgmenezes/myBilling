import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  criarCategoria,
  renomearCategoria,
  trocarCorDaCategoria,
} from "@/app/actions/categorias";
import { ProvedorDeAvisos } from "./avisos";
import { CadastroDeCategorias } from "./cadastro-de-categorias";
import type { ItemDeCategoria } from "./tabela-de-categorias";

/**
 * Derivado de CADCOL-01 (AC 6), CADCOL-04 (ACs 1, 14 e 15), CADCOL-05 (ACs 1
 * a 4 e 6), CADCOL-10 (ACs 2 e 4), CADCOL-11, do Edge Case do item que deixa
 * a lista e do Done-when da T14. Herda o teste 344 de
 * `lista-de-categorias.test.tsx`, com a regra nova: trocar de categoria e
 * fechar descartam o digitado (design, "Para onde vai cada teste").
 *
 * O endereço muda pelo `router.replace` do Next (L-058). O mock dele troca a
 * URL do jsdom, como o Next depois da resposta, para os testes lerem o
 * endereço que fica; o bloco da navegação pendente desliga isso.
 */

const { navegar, empurrar } = vi.hoisted(() => ({
  navegar: vi.fn((endereco: string, _opcoes?: { readonly scroll?: boolean }) =>
    window.history.replaceState(null, "", endereco),
  ),
  empurrar: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navegar, push: empurrar, refresh: vi.fn() }),
}));

const UM = "11111111-1111-4111-8111-111111111111";
const DOIS = "22222222-2222-4222-8222-222222222222";
const NOVA = "44444444-4444-4444-8444-444444444444";

const CATEGORIA_UM: ItemDeCategoria = {
  id: UM,
  nome: "Categoria Um",
  cor: null,
  fixos: 1,
  lancamentos: 2,
};
const CATEGORIA_DOIS: ItemDeCategoria = {
  id: DOIS,
  nome: "Categoria Dois",
  cor: "verde",
  fixos: 0,
  lancamentos: 0,
};
const CATEGORIA_NOVA: ItemDeCategoria = {
  id: NOVA,
  nome: "Categoria Nova",
  cor: null,
  fixos: 0,
  lancamentos: 0,
};

const ENDERECO = "/2026-03/cadastros/categorias";

beforeEach(() => {
  window.history.replaceState(null, "", `${ENDERECO}?outro=1`);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  navegar.mockClear();
  empurrar.mockReset();
});

interface Opcoes {
  readonly categorias?: ReadonlyArray<ItemDeCategoria>;
  readonly categoriaInicial?: string | null;
  readonly criar?: ReturnType<typeof vi.fn>;
  readonly renomear?: ReturnType<typeof vi.fn>;
}

function criouNova(flags = { jaExistia: false, reativada: false }) {
  return vi.fn(async () => ({
    ok: true as const,
    data: { id: NOVA, nome: "Categoria Nova", ...flags },
  }));
}

function montar(opcoes: Opcoes = {}) {
  const criar = opcoes.criar ?? criouNova();
  const renomear = opcoes.renomear ?? vi.fn();
  const tela = (atuais: Opcoes) => (
    <ProvedorDeAvisos>
      <CadastroDeCategorias
        competencia="2026-03"
        rotuloDaCompetencia="Março de 2026"
        nomeDoMes="Março"
        categorias={atuais.categorias ?? [CATEGORIA_DOIS, CATEGORIA_UM]}
        categoriaInicial={atuais.categoriaInicial ?? null}
        criarCategoria={criar as unknown as typeof criarCategoria}
        trocarCor={vi.fn() as unknown as typeof trocarCorDaCategoria}
        renomear={renomear as unknown as typeof renomearCategoria}
      />
    </ProvedorDeAvisos>
  );
  const utils = render(tela(opcoes));
  return {
    criar,
    renomear,
    usuario: userEvent.setup(),
    mudar: (novas: Opcoes) => utils.rerender(tela({ ...opcoes, ...novas })),
  };
}

function oPainel(): HTMLElement | null {
  return screen.queryByRole("complementary", { name: "Painel da categoria" });
}

function painel(): HTMLElement {
  const elemento = oPainel();
  if (elemento === null) {
    throw new Error("o painel não está aberto");
  }
  return elemento;
}

function tituloDoPainel(): HTMLElement {
  return within(painel()).getByRole("heading", { level: 2 });
}

function botaoDaLinha(nome: string): HTMLElement {
  return within(screen.getByRole("table", { name: "Categorias" })).getByRole("button", {
    name: nome,
  });
}

function botaoNova(): HTMLElement {
  return screen.getByRole("button", { name: "+ Nova categoria" });
}

function parametro(nome: string): string | null {
  return new URLSearchParams(window.location.search).get(nome);
}

/** `a` vem antes de `b` na ordem do documento. */
function antes(a: Node, b: Node): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe('"+ Nova categoria" ao lado do título (CADCOL-01, AC 6)', () => {
  it("fica no cabeçalho, junto do título, antes do painel e da tabela", async () => {
    const { usuario } = montar();
    const titulo = screen.getByRole("heading", { level: 1, name: "Cadastros" });
    expect(titulo.parentElement?.contains(botaoNova())).toBe(true);

    await usuario.click(botaoDaLinha("Categoria Um"));

    expect(antes(botaoNova(), painel())).toBe(true);
    expect(antes(botaoNova(), screen.getByRole("table", { name: "Categorias" }))).toBe(true);
  });

  it("a aba Categorias é a aberta", () => {
    montar();

    expect(
      within(screen.getByRole("navigation", { name: "Cadastros" }))
        .getByRole("link", { name: "Categorias" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });
});

describe("abrir uma categoria e o endereço (CADCOL-04, AC 1; CADCOL-11, AC 1; CADCOL-10, AC 2)", () => {
  it("a linha abre a categoria no painel, marca a linha e leva o foco ao título", async () => {
    const { usuario } = montar();

    await usuario.click(botaoDaLinha("Categoria Um"));

    expect(tituloDoPainel().textContent).toBe("Categoria Um");
    expect(botaoDaLinha("Categoria Um").getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(tituloDoPainel());
  });

  it("põe `?categoria=<id>` pelo router.replace, sem rolar, mantendo os outros, sem push", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { usuario } = montar();

    await usuario.click(botaoDaLinha("Categoria Um"));

    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(`?outro=1&categoria=${UM}`, { scroll: false });
    expect(empurrar).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("`categoriaInicial` da lista abre o painel nela, sem levar o foco (CADCOL-11, AC 2)", () => {
    montar({ categoriaInicial: DOIS });

    expect(tituloDoPainel().textContent).toBe("Categoria Dois");
    expect(document.activeElement).toBe(document.body);
  });

  it("`categoriaInicial` fora da lista deixa o painel fechado, sem erro (CADCOL-11, AC 3)", () => {
    montar({ categoriaInicial: "id-de-outra-coisa" });

    expect(oPainel()).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("table", { name: "Categorias" })).toBeTruthy();
  });
});

describe('"+ Nova categoria" (CADCOL-05, AC 1; CADCOL-11, AC 4)', () => {
  it("fecha a categoria aberta, mostra o formulário, tira `?categoria=` e leva o foco ao título", async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Categoria Um"));

    await usuario.click(botaoNova());

    expect(tituloDoPainel().textContent).toBe("Nova categoria");
    expect(within(painel()).getByRole("form", { name: "Nova categoria" })).toBeTruthy();
    expect(botaoDaLinha("Categoria Um").getAttribute("aria-expanded")).toBe("false");
    expect(botaoNova().getAttribute("aria-expanded")).toBe("true");
    expect(parametro("categoria")).toBeNull();
    expect(parametro("outro")).toBe("1");
    expect(document.activeElement).toBe(tituloDoPainel());
  });
});

describe("depois de criar (CADCOL-05, ACs 2 a 4; CADCOL-10, AC 2)", () => {
  it("com a categoria na lista, abre nela, põe o id no endereço, leva o foco ao título e avisa", async () => {
    const { criar, usuario } = montar({
      categorias: [CATEGORIA_DOIS, CATEGORIA_NOVA, CATEGORIA_UM],
    });
    await usuario.click(botaoNova());

    await usuario.type(within(painel()).getByRole("textbox", { name: "Nome" }), "Categoria Nova");
    await usuario.click(within(painel()).getByRole("button", { name: "Criar categoria" }));

    expect((await screen.findByRole("status")).textContent).toBe("Categoria criada.");
    expect(criar).toHaveBeenCalledWith({ nome: "Categoria Nova" });
    expect(tituloDoPainel().textContent).toBe("Categoria Nova");
    expect(parametro("categoria")).toBe(NOVA);
    /* O foco vai depois que a criada aparece no painel, num efeito: espera. */
    await waitFor(() => {
      expect(document.activeElement).toBe(tituloDoPainel());
    });
  });

  /* A resposta da action chega antes da lista nova: o Next resolve o pedido
     e só depois desenha a página relida. Entre os dois, a categoria criada
     ainda não está na tabela, e uma página relida de antes, como a de uma
     navegação pendente, pode chegar sem ela. O painel não pode fechar nem
     tirar o id do endereço. Quando a lista chega, o painel abre nela, com o
     foco no título. */
  it("com a lista nova chegando depois, espera por ela, sem fechar, e abre na criada com o foco no título", async () => {
    const { usuario, mudar } = montar({
      criar: criouNova({ jaExistia: true, reativada: true }),
    });
    await usuario.click(botaoNova());
    await usuario.type(within(painel()).getByRole("textbox", { name: "Nome" }), "Categoria Nova");
    await usuario.click(within(painel()).getByRole("button", { name: "Criar categoria" }));
    expect((await screen.findByRole("status")).textContent).toBe("Categoria reativada.");
    expect(parametro("categoria")).toBe(NOVA);

    mudar({ categorias: [CATEGORIA_DOIS, CATEGORIA_UM] });
    expect(parametro("categoria")).toBe(NOVA);

    mudar({ categorias: [CATEGORIA_DOIS, CATEGORIA_NOVA, CATEGORIA_UM] });

    await waitFor(() => {
      expect(tituloDoPainel().textContent).toBe("Categoria Nova");
    });
    expect(parametro("categoria")).toBe(NOVA);
    await waitFor(() => {
      expect(document.activeElement).toBe(tituloDoPainel());
    });
  });
});

describe("fechar e o foco de volta (CADCOL-10, AC 4; CADCOL-11, AC 4; CADCOL-04, AC 15)", () => {
  it('"Fechar" fecha, desmarca a linha, tira `?categoria=` e devolve o foco ao botão da linha', async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Categoria Um"));

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));

    expect(oPainel()).toBeNull();
    expect(botaoDaLinha("Categoria Um").getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(botaoDaLinha("Categoria Um"));
    expect(parametro("categoria")).toBeNull();
    expect(parametro("outro")).toBe("1");
  });

  it("`Escape` fecha e devolve o foco ao botão da linha", async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Categoria Dois"));

    await usuario.keyboard("{Escape}");

    expect(oPainel()).toBeNull();
    expect(document.activeElement).toBe(botaoDaLinha("Categoria Dois"));
    expect(parametro("categoria")).toBeNull();
  });

  it('fechar o formulário de criação pelo "Fechar" devolve o foco ao "+ Nova categoria"', async () => {
    const { usuario } = montar();
    await usuario.click(botaoNova());

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));

    expect(oPainel()).toBeNull();
    expect(document.activeElement).toBe(botaoNova());
  });

  it('"Cancelar" fecha sem criar e devolve o foco ao "+ Nova categoria" (CADCOL-05, AC 6)', async () => {
    const { criar, usuario } = montar();
    await usuario.click(botaoNova());

    await usuario.click(within(painel()).getByRole("button", { name: "Cancelar" }));

    expect(oPainel()).toBeNull();
    expect(criar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(botaoNova());
  });
});

describe("trocar com algo digitado descarta o digitado (CADCOL-04, AC 14)", () => {
  it("trocar de categoria descarta o nome digitado sem gravar, e reabrir mostra o gravado", async () => {
    const { renomear, usuario } = montar();
    await usuario.click(botaoDaLinha("Categoria Um"));
    await usuario.type(within(painel()).getByRole("textbox", { name: "Nome" }), " mais");

    await usuario.click(botaoDaLinha("Categoria Dois"));
    expect(tituloDoPainel().textContent).toBe("Categoria Dois");
    await usuario.click(botaoDaLinha("Categoria Um"));

    expect(within(painel()).getByRole<HTMLInputElement>("textbox", { name: "Nome" }).value).toBe(
      "Categoria Um",
    );
    expect(renomear).not.toHaveBeenCalled();
  });

  it('abrir o "+ Nova categoria" descarta o nome digitado sem gravar', async () => {
    const { renomear, usuario } = montar();
    await usuario.click(botaoDaLinha("Categoria Um"));
    await usuario.type(within(painel()).getByRole("textbox", { name: "Nome" }), " mais");

    await usuario.click(botaoNova());
    await usuario.click(botaoDaLinha("Categoria Um"));

    expect(within(painel()).getByRole<HTMLInputElement>("textbox", { name: "Nome" }).value).toBe(
      "Categoria Um",
    );
    expect(renomear).not.toHaveBeenCalled();
  });

  it('"Fechar" descarta o nome digitado sem gravar', async () => {
    const { renomear, usuario } = montar();
    await usuario.click(botaoDaLinha("Categoria Um"));
    await usuario.type(within(painel()).getByRole("textbox", { name: "Nome" }), " mais");

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));
    await usuario.click(botaoDaLinha("Categoria Um"));

    expect(within(painel()).getByRole<HTMLInputElement>("textbox", { name: "Nome" }).value).toBe(
      "Categoria Um",
    );
    expect(renomear).not.toHaveBeenCalled();
  });
});

describe("a categoria aberta que deixa a lista (Edge Cases)", () => {
  it("numa renderização nova sem ela, o painel volta ao vazio e o parâmetro sai", async () => {
    const { usuario, mudar } = montar();
    await usuario.click(botaoDaLinha("Categoria Um"));
    expect(parametro("categoria")).toBe(UM);

    mudar({ categorias: [CATEGORIA_DOIS] });

    await waitFor(() => {
      expect(oPainel()).toBeNull();
    });
    expect(parametro("categoria")).toBeNull();
    expect(parametro("outro")).toBe("1");
  });

  it("numa renderização nova que ainda a tem, o painel continua nela", async () => {
    const { usuario, mudar } = montar();
    await usuario.click(botaoDaLinha("Categoria Um"));

    mudar({ categorias: [CATEGORIA_DOIS, { ...CATEGORIA_UM, nome: "Categoria Dez" }] });

    expect(tituloDoPainel().textContent).toBe("Categoria Dez");
    expect(parametro("categoria")).toBe(UM);
  });
});

/**
 * Até a resposta do servidor, o `router.replace` do Next não muda a URL. Aqui
 * o mock também não a muda: o que conta é o último endereço pedido (L-058).
 */
describe("o endereço com a navegação pendente (CADCOL-11, ACs 1 e 4)", () => {
  beforeEach(() => {
    navegar.mockImplementation(() => undefined);
  });

  it("abrir e logo fechar pede o endereço sem `?categoria=`", async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Categoria Um"));

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));

    expect(navegar).toHaveBeenLastCalledWith("?outro=1", { scroll: false });
  });

  it("com Um aberta pela carga, fechar e logo reabrir pede o endereço com ela", async () => {
    window.history.replaceState(null, "", `${ENDERECO}?outro=1&categoria=${UM}`);
    const { usuario } = montar({ categoriaInicial: UM });

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));
    await usuario.click(botaoDaLinha("Categoria Um"));

    expect(tituloDoPainel().textContent).toBe("Categoria Um");
    expect(navegar).toHaveBeenLastCalledWith(`?outro=1&categoria=${UM}`, { scroll: false });
  });

  it('um `?categoria=` fora da lista, na carga, sai do endereço ao abrir o "+ Nova categoria"', async () => {
    window.history.replaceState(null, "", `${ENDERECO}?outro=1&categoria=id-de-outra-coisa`);
    const { usuario } = montar({ categoriaInicial: "id-de-outra-coisa" });

    await usuario.click(botaoNova());

    expect(navegar).toHaveBeenLastCalledWith("?outro=1", { scroll: false });
  });
});
