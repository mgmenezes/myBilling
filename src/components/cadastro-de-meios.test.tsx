import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { criarMeioDePagamento, editarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { ProvedorDeAvisos } from "./avisos";
import { CadastroDeMeios } from "./cadastro-de-meios";
import type { ItemDeMeio } from "./tabela-de-meios";

/**
 * Derivado de CADCOL-01 (AC 6), CADCOL-07 (ACs 1 e 15), CADCOL-08 (ACs 1, 4 e
 * 6), CADCOL-10 (ACs 2 e 4), CADCOL-11, do Edge Case do item que deixa a
 * lista e do Done-when da T19. É a forma de `cadastro-de-categorias.test.tsx`.
 *
 * O endereço muda pelo `router.replace` do Next (L-058). O mock dele troca a
 * URL do jsdom, como o Next depois da resposta, para os testes lerem o
 * endereço que fica; o bloco da navegação pendente desliga isso.
 *
 * Nomes genéricos (AD-009).
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

const CARTAO = "11111111-1111-4111-8111-111111111111";
const CONTA = "22222222-2222-4222-8222-222222222222";
const NOVO = "55555555-5555-4555-8555-555555555555";

const CARTAO_ROXO: ItemDeMeio = {
  id: CARTAO,
  nome: "Cartão Roxo",
  tipo: "CARTAO_CREDITO",
  diaFechamento: 25,
  diaVencimento: 5,
  fixos: 0,
  lancamentos: 1,
};
const CONTA_CORRENTE: ItemDeMeio = {
  id: CONTA,
  nome: "Conta Corrente",
  tipo: "CONTA_CORRENTE",
  diaFechamento: null,
  diaVencimento: null,
  fixos: 2,
  lancamentos: 2,
};
const CARTAO_NOVO: ItemDeMeio = {
  id: NOVO,
  nome: "Cartão Novo",
  tipo: "CARTAO_CREDITO",
  diaFechamento: 3,
  diaVencimento: 10,
  fixos: 0,
  lancamentos: 0,
};

const ENDERECO = "/2026-03/cadastros/meios-de-pagamento";

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
  readonly meios?: ReadonlyArray<ItemDeMeio>;
  readonly meioInicial?: string | null;
  readonly criar?: ReturnType<typeof vi.fn>;
  readonly editar?: ReturnType<typeof vi.fn>;
}

function criouNovo() {
  return vi.fn(async () => ({
    ok: true as const,
    data: { id: NOVO, nome: "Cartão Novo", geraFatura: true },
  }));
}

function montar(opcoes: Opcoes = {}) {
  const criar = opcoes.criar ?? criouNovo();
  const editar = opcoes.editar ?? vi.fn();
  const tela = (atuais: Opcoes) => (
    <ProvedorDeAvisos>
      <CadastroDeMeios
        competencia="2026-03"
        rotuloDaCompetencia="Março de 2026"
        nomeDoMes="Março"
        meios={atuais.meios ?? [CARTAO_ROXO, CONTA_CORRENTE]}
        meioInicial={atuais.meioInicial ?? null}
        criarMeioDePagamento={criar as unknown as typeof criarMeioDePagamento}
        editar={editar as unknown as typeof editarMeioDePagamento}
      />
    </ProvedorDeAvisos>
  );
  const utils = render(tela(opcoes));
  return {
    criar,
    editar,
    usuario: userEvent.setup(),
    mudar: (novas: Opcoes) => utils.rerender(tela({ ...opcoes, ...novas })),
  };
}

function oPainel(): HTMLElement | null {
  return screen.queryByRole("complementary", { name: "Painel do meio de pagamento" });
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
  return within(screen.getByRole("table", { name: "Meios de pagamento" })).getByRole("button", {
    name: nome,
  });
}

function botaoNovo(): HTMLElement {
  return screen.getByRole("button", { name: "+ Novo meio" });
}

function campoNome(): HTMLInputElement {
  return within(painel()).getByRole<HTMLInputElement>("textbox", { name: "Nome" });
}

function parametro(nome: string): string | null {
  return new URLSearchParams(window.location.search).get(nome);
}

/** `a` vem antes de `b` na ordem do documento. */
function antes(a: Node, b: Node): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

async function criarCartaoNovo(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(botaoNovo());
  const form = within(painel()).getByRole("form", { name: "Novo meio de pagamento" });
  await usuario.type(within(form).getByRole("textbox", { name: "Nome" }), "Cartão Novo");
  await usuario.type(within(form).getByRole("textbox", { name: "Dia de fechamento" }), "3");
  await usuario.type(within(form).getByRole("textbox", { name: "Dia de vencimento" }), "10");
  await usuario.click(within(form).getByRole("button", { name: "Criar meio" }));
}

describe('"+ Novo meio" ao lado do título (CADCOL-01, AC 6)', () => {
  it("fica no cabeçalho, junto do título, antes do painel e da tabela", async () => {
    const { usuario } = montar();
    const titulo = screen.getByRole("heading", { level: 1, name: "Cadastros" });
    expect(titulo.parentElement?.contains(botaoNovo())).toBe(true);

    await usuario.click(botaoDaLinha("Cartão Roxo"));

    expect(antes(botaoNovo(), painel())).toBe(true);
    expect(antes(botaoNovo(), screen.getByRole("table", { name: "Meios de pagamento" }))).toBe(
      true,
    );
  });

  it("a aba Meios de pagamento é a aberta", () => {
    montar();

    const abas = within(screen.getByRole("navigation", { name: "Cadastros" }));
    expect(
      abas.getByRole("link", { name: "Meios de pagamento" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(abas.getByRole("link", { name: "Categorias" }).getAttribute("aria-current")).toBeNull();
  });
});

/* Os textos do vazio; a coluna em que ele aparece, a partir de 1.536 px, se
   mede no navegador (T21). */
describe("sem nada aberto (CADCOL-09, AC 3, os textos)", () => {
  it('o vazio diz "Nenhum meio aberto" e a dica, sem painel', () => {
    montar();

    expect(oPainel()).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Nenhum meio aberto" })).toBeTruthy();
    expect(
      screen.getByText(
        "Escolha um meio na lista para renomear, corrigir os dias do cartão e ver onde ele aparece.",
      ),
    ).toBeTruthy();
  });
});

describe("abrir um meio e o endereço (CADCOL-07, ACs 1 e 15; CADCOL-11, ACs 1 a 3; CADCOL-10, AC 2)", () => {
  it("a linha abre o meio no painel, marca a linha e leva o foco ao título", async () => {
    const { usuario } = montar();

    await usuario.click(botaoDaLinha("Cartão Roxo"));

    expect(tituloDoPainel().textContent).toBe("Cartão Roxo");
    expect(within(painel()).getByRole("form", { name: "Editar Cartão Roxo" })).toBeTruthy();
    expect(botaoDaLinha("Cartão Roxo").getAttribute("aria-expanded")).toBe("true");
    expect(botaoDaLinha("Conta Corrente").getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(tituloDoPainel());
  });

  it("põe `?meio=<id>` pelo router.replace, sem rolar, mantendo os outros, sem push", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { usuario } = montar();

    await usuario.click(botaoDaLinha("Cartão Roxo"));

    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(`?outro=1&meio=${CARTAO}`, { scroll: false });
    expect(empurrar).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("`meioInicial` da lista abre o painel nele, sem levar o foco (CADCOL-11, AC 2)", () => {
    montar({ meioInicial: CONTA });

    expect(tituloDoPainel().textContent).toBe("Conta Corrente");
    expect(document.activeElement).toBe(document.body);
  });

  it("`meioInicial` fora da lista deixa o painel fechado, sem erro (CADCOL-11, AC 3)", () => {
    montar({ meioInicial: "id-de-outra-coisa" });

    expect(oPainel()).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("table", { name: "Meios de pagamento" })).toBeTruthy();
  });
});

describe('"+ Novo meio" (CADCOL-08, AC 1; CADCOL-11, AC 4)', () => {
  it("fecha o meio aberto, mostra o formulário, tira `?meio=` e leva o foco ao título", async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Cartão Roxo"));

    await usuario.click(botaoNovo());

    expect(tituloDoPainel().textContent).toBe("Novo meio de pagamento");
    expect(within(painel()).getByRole("form", { name: "Novo meio de pagamento" })).toBeTruthy();
    expect(botaoDaLinha("Cartão Roxo").getAttribute("aria-expanded")).toBe("false");
    expect(botaoNovo().getAttribute("aria-expanded")).toBe("true");
    expect(botaoNovo().getAttribute("aria-controls")).toBe("painel-do-meio");
    expect(parametro("meio")).toBeNull();
    expect(parametro("outro")).toBe("1");
    expect(document.activeElement).toBe(tituloDoPainel());
  });
});

describe("depois de criar (CADCOL-08, AC 4; CADCOL-10, AC 2)", () => {
  it("com o meio na lista, abre nele, põe o id no endereço, leva o foco ao título e avisa", async () => {
    const { criar, usuario } = montar({ meios: [CARTAO_NOVO, CARTAO_ROXO, CONTA_CORRENTE] });

    await criarCartaoNovo(usuario);

    expect((await screen.findByRole("status")).textContent).toBe("Meio de pagamento criado.");
    expect(criar).toHaveBeenCalledWith({
      nome: "Cartão Novo",
      tipo: "CARTAO_CREDITO",
      diaFechamento: 3,
      diaVencimento: 10,
    });
    expect(tituloDoPainel().textContent).toBe("Cartão Novo");
    expect(parametro("meio")).toBe(NOVO);
    /* O foco vai depois que o criado aparece no painel, num efeito: espera. */
    await waitFor(() => {
      expect(document.activeElement).toBe(tituloDoPainel());
    });
  });

  /* A resposta da action chega antes da lista nova: o Next resolve o pedido
     e só depois desenha a página relida. Entre os dois, o meio criado ainda
     não está na tabela, e uma página relida de antes pode chegar sem ele. O
     painel não pode fechar nem tirar o id do endereço. Quando a lista chega,
     o painel abre nele, com o foco no título. */
  it("com a lista nova chegando depois, espera por ela, sem fechar, e abre no criado com o foco no título", async () => {
    const { usuario, mudar } = montar();
    await criarCartaoNovo(usuario);
    expect((await screen.findByRole("status")).textContent).toBe("Meio de pagamento criado.");
    expect(parametro("meio")).toBe(NOVO);

    mudar({ meios: [CARTAO_ROXO, CONTA_CORRENTE] });
    expect(parametro("meio")).toBe(NOVO);

    mudar({ meios: [CARTAO_NOVO, CARTAO_ROXO, CONTA_CORRENTE] });

    await waitFor(() => {
      expect(tituloDoPainel().textContent).toBe("Cartão Novo");
    });
    expect(parametro("meio")).toBe(NOVO);
    await waitFor(() => {
      expect(document.activeElement).toBe(tituloDoPainel());
    });
  });
});

describe("fechar e o foco de volta (CADCOL-10, AC 4; CADCOL-11, AC 4; CADCOL-07, AC 15)", () => {
  it('"Fechar" fecha, desmarca a linha, tira `?meio=` e devolve o foco ao botão da linha', async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Cartão Roxo"));

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));

    expect(oPainel()).toBeNull();
    expect(botaoDaLinha("Cartão Roxo").getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(botaoDaLinha("Cartão Roxo"));
    expect(parametro("meio")).toBeNull();
    expect(parametro("outro")).toBe("1");
  });

  it("`Escape` fecha e devolve o foco ao botão da linha", async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Conta Corrente"));

    await usuario.keyboard("{Escape}");

    expect(oPainel()).toBeNull();
    expect(document.activeElement).toBe(botaoDaLinha("Conta Corrente"));
    expect(parametro("meio")).toBeNull();
  });

  it('fechar o formulário de criação pelo "Fechar" devolve o foco ao "+ Novo meio"', async () => {
    const { usuario } = montar();
    await usuario.click(botaoNovo());

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));

    expect(oPainel()).toBeNull();
    expect(document.activeElement).toBe(botaoNovo());
  });

  it('"Cancelar" fecha sem criar e devolve o foco ao "+ Novo meio" (CADCOL-08, AC 6)', async () => {
    const { criar, usuario } = montar();
    await usuario.click(botaoNovo());

    await usuario.click(within(painel()).getByRole("button", { name: "Cancelar" }));

    expect(oPainel()).toBeNull();
    expect(criar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(botaoNovo());
  });
});

describe("trocar com algo digitado descarta o digitado (CADCOL-07, AC 15)", () => {
  it("trocar de meio descarta o nome digitado sem gravar, e reabrir mostra o gravado", async () => {
    const { editar, usuario } = montar();
    await usuario.click(botaoDaLinha("Cartão Roxo"));
    await usuario.type(campoNome(), " mais");

    await usuario.click(botaoDaLinha("Conta Corrente"));
    expect(tituloDoPainel().textContent).toBe("Conta Corrente");
    await usuario.click(botaoDaLinha("Cartão Roxo"));

    expect(campoNome().value).toBe("Cartão Roxo");
    expect(editar).not.toHaveBeenCalled();
  });

  it('abrir o "+ Novo meio" descarta o nome digitado sem gravar', async () => {
    const { editar, usuario } = montar();
    await usuario.click(botaoDaLinha("Cartão Roxo"));
    await usuario.type(campoNome(), " mais");

    await usuario.click(botaoNovo());
    await usuario.click(botaoDaLinha("Cartão Roxo"));

    expect(campoNome().value).toBe("Cartão Roxo");
    expect(editar).not.toHaveBeenCalled();
  });

  it('"Fechar" descarta o nome digitado sem gravar', async () => {
    const { editar, usuario } = montar();
    await usuario.click(botaoDaLinha("Cartão Roxo"));
    await usuario.type(campoNome(), " mais");

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));
    await usuario.click(botaoDaLinha("Cartão Roxo"));

    expect(campoNome().value).toBe("Cartão Roxo");
    expect(editar).not.toHaveBeenCalled();
  });
});

describe("o meio aberto que deixa a lista (Edge Cases)", () => {
  it("numa renderização nova sem ele, o painel volta ao vazio e o parâmetro sai", async () => {
    const { usuario, mudar } = montar();
    await usuario.click(botaoDaLinha("Cartão Roxo"));
    expect(parametro("meio")).toBe(CARTAO);

    mudar({ meios: [CONTA_CORRENTE] });

    await waitFor(() => {
      expect(oPainel()).toBeNull();
    });
    expect(parametro("meio")).toBeNull();
    expect(parametro("outro")).toBe("1");
  });

  it("numa renderização nova que ainda o tem, o painel continua nele, com o nome novo", async () => {
    const { usuario, mudar } = montar();
    await usuario.click(botaoDaLinha("Cartão Roxo"));

    mudar({ meios: [{ ...CARTAO_ROXO, nome: "Cartão Lilás" }, CONTA_CORRENTE] });

    expect(tituloDoPainel().textContent).toBe("Cartão Lilás");
    expect(parametro("meio")).toBe(CARTAO);
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

  it("abrir e logo fechar pede o endereço sem `?meio=`", async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Cartão Roxo"));

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));

    expect(navegar).toHaveBeenLastCalledWith("?outro=1", { scroll: false });
  });

  it("com Cartão Roxo aberto pela carga, fechar e logo reabrir pede o endereço com ele", async () => {
    window.history.replaceState(null, "", `${ENDERECO}?outro=1&meio=${CARTAO}`);
    const { usuario } = montar({ meioInicial: CARTAO });

    await usuario.click(within(painel()).getByRole("button", { name: "Fechar" }));
    await usuario.click(botaoDaLinha("Cartão Roxo"));

    expect(tituloDoPainel().textContent).toBe("Cartão Roxo");
    expect(navegar).toHaveBeenLastCalledWith(`?outro=1&meio=${CARTAO}`, { scroll: false });
  });

  it('um `?meio=` fora da lista, na carga, sai do endereço ao abrir o "+ Novo meio"', async () => {
    window.history.replaceState(null, "", `${ENDERECO}?outro=1&meio=id-de-outra-coisa`);
    const { usuario } = montar({ meioInicial: "id-de-outra-coisa" });

    await usuario.click(botaoNovo());

    expect(navegar).toHaveBeenLastCalledWith("?outro=1", { scroll: false });
  });
});
