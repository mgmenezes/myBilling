import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FiltrosDeLancamentos } from "./filtros-de-lancamentos";

/**
 * Testes derivados de REDE-01 (ACs 5 e 6) e de LST-01 (ACs 1, 5, 6, 7 e 8).
 *
 * Este componente era o outro módulo da fatia sem arquivo de teste: o painel
 * inteiro de filtros podia sumir da página e a busca podia parar de chegar à
 * URL sem nada reclamar.
 *
 * O estado dos filtros vive na URL, então o que se afirma aqui é a **navegação
 * emitida**: o termo digitado e cada seletor precisam virar parâmetro. O dublê
 * de `next/navigation` segue o padrão de `navegacao-principal.test.tsx`.
 */

const { replace, estado } = vi.hoisted(() => ({
  replace: vi.fn(),
  estado: { parametros: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => estado.parametros,
}));

const CATEGORIA_X = "55555555-5555-4555-8555-555555555555";
const CONTA = "33333333-3333-4333-8333-333333333333";
const PESSOA_A = "11111111-1111-4111-8111-111111111111";

/* O select "Categoria" virou chips com o gasto do mês (LST-01). */
const CATEGORIAS = [{ id: CATEGORIA_X, nome: "Categoria X", gasto: 12000, cor: "rosa" }] as const;
const CHIP_X = "Categoria X · R$ 120,00";
const MEIOS = [{ id: CONTA, nome: "Conta Corrente" }];
const USUARIOS = [{ id: PESSOA_A, nome: "Pessoa A" }];

function montar(exibidos?: {
  readonly totalVisivel?: string;
  readonly quantidadeVisivel?: number;
}) {
  return render(
    <FiltrosDeLancamentos
      categorias={CATEGORIAS}
      meios={MEIOS}
      usuarios={USUARIOS}
      totalVisivel={exibidos?.totalVisivel ?? "R$ 120,00"}
      quantidadeVisivel={exibidos?.quantidadeVisivel ?? 2}
    />,
  );
}

/**
 * `fireEvent`, e não `userEvent`: o ponteiro simulado do segundo espera em
 * relógio real e trava contra os temporizadores falsos que o debounce exige.
 */
function preencher(campo: HTMLElement, valor: string): void {
  fireEvent.change(campo, { target: { value: valor } });
}

/** O debounce da busca espera 250ms antes de navegar. */
async function passarODebounce(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  replace.mockClear();
  estado.parametros = new URLSearchParams();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("a busca chega à URL (REDE-01, AC 5)", () => {
  it("digitar o termo escreve busca na URL", async () => {
    montar();

    preencher(screen.getByLabelText("Buscar por descrição"), "agua");
    await passarODebounce();

    expect(replace).toHaveBeenCalledWith("?busca=agua", { scroll: false });
  });

  it("apagar o termo remove busca da URL, e não a deixa em branco", async () => {
    estado.parametros = new URLSearchParams("busca=agua");
    montar();

    preencher(screen.getByLabelText("Buscar por descrição"), "");
    await passarODebounce();

    expect(replace).toHaveBeenCalledWith("?", { scroll: false });
  });

  it("preserva os filtros já na URL ao escrever a busca", async () => {
    estado.parametros = new URLSearchParams(`categoriaId=${CATEGORIA_X}`);
    montar();

    preencher(screen.getByLabelText("Buscar por descrição"), "agua");
    await passarODebounce();

    expect(replace).toHaveBeenCalledWith(`?categoriaId=${CATEGORIA_X}&busca=agua`, {
      scroll: false,
    });
  });

  it("parte do termo que já está na URL, e não do campo em branco", () => {
    estado.parametros = new URLSearchParams("busca=agua");
    montar();

    expect(screen.getByLabelText<HTMLInputElement>("Buscar por descrição").value).toBe("agua");
  });
});

describe("cada seletor escreve o próprio parâmetro na URL (REDE-01, AC 5)", () => {
  /* A categoria saiu do select e foi para o chip (LST-01, AC 1); a navegação
     esperada é a mesma. */
  it('"Categoria" escreve o parâmetro dele, pelo chip', () => {
    montar();

    fireEvent.click(screen.getByRole("button", { name: CHIP_X }));

    expect(replace).toHaveBeenCalledWith(`?categoriaId=${CATEGORIA_X}`, { scroll: false });
  });

  const casos = [
    { rotulo: "Meio de pagamento", escolha: CONTA, esperado: `?meioPagamentoId=${CONTA}` },
    { rotulo: "Pessoa", escolha: PESSOA_A, esperado: `?usuarioId=${PESSOA_A}` },
    { rotulo: "Situação", escolha: "VENCIDO", esperado: "?situacao=VENCIDO" },
  ];

  for (const caso of casos) {
    it(`"${caso.rotulo}" escreve o parâmetro dele`, () => {
      montar();

      preencher(screen.getByLabelText(caso.rotulo), caso.escolha);

      expect(replace).toHaveBeenCalledWith(caso.esperado, { scroll: false });
    });
  }

  it('voltar o seletor para "Todas" remove o parâmetro da URL', () => {
    estado.parametros = new URLSearchParams("situacao=PAGO");
    montar();

    preencher(screen.getByLabelText("Situação"), "");

    expect(replace).toHaveBeenCalledWith("?", { scroll: false });
  });

  it("oferece os três estados de situação, inclusive Vencido", () => {
    montar();

    const opcoes = [...screen.getByLabelText<HTMLSelectElement>("Situação").options].map(
      (o) => o.value,
    );
    expect(opcoes).toEqual(["", "PENDENTE", "PAGO", "VENCIDO"]);
  });
});

describe("os chips no lugar do select de categoria (LST-01)", () => {
  it('o select "Categoria" sai, e Meio, Pessoa e Situação ficam (AC 1)', () => {
    const { container: cartao } = montar();

    expect(within(cartao).queryByRole("combobox", { name: "Categoria" })).toBeNull();
    expect(within(cartao).getAllByRole("combobox")).toHaveLength(3);
    for (const rotulo of ["Meio de pagamento", "Pessoa", "Situação"]) {
      expect(within(cartao).getByRole("combobox", { name: rotulo })).toBeDefined();
    }
  });

  it("os chips de categoria estão no cartão, com o gasto recebido (AC 1)", () => {
    const { container: cartao } = montar();

    const chips = within(cartao).getByRole("list", { name: "Categoria" });
    expect(within(chips).getByRole("button", { name: CHIP_X })).toBeDefined();
  });

  /* A cor vem do total que a página manda: o cartão a entrega ao chip, e
     não a perde no caminho (COR-03, AC 4). */
  it("o chip inativo tem a cor do total recebido (COR-03, AC 4)", () => {
    const { container: cartao } = montar();

    const chips = within(cartao).getByRole("list", { name: "Categoria" });
    expect(within(chips).getByRole("button", { name: CHIP_X }).className.split(/\s+/)).toEqual(
      expect.arrayContaining(["bg-cat-rosa-fundo", "text-cat-rosa-texto"]),
    );
  });

  it("escolher um chip grava categoriaId e mantém busca, meio, pessoa e situação (AC 5)", () => {
    estado.parametros = new URLSearchParams(
      `busca=agua&meioPagamentoId=${CONTA}&usuarioId=${PESSOA_A}&situacao=PAGO`,
    );
    montar();

    fireEvent.click(screen.getByRole("button", { name: CHIP_X }));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(
      `?busca=agua&meioPagamentoId=${CONTA}&usuarioId=${PESSOA_A}&situacao=PAGO&categoriaId=${CATEGORIA_X}`,
      { scroll: false },
    );
  });

  it("tocar no chip ativo tira categoriaId e mantém o resto da URL (AC 6)", () => {
    estado.parametros = new URLSearchParams(`categoriaId=${CATEGORIA_X}&situacao=PAGO`);
    montar();

    fireEvent.click(screen.getByRole("button", { name: CHIP_X }));

    expect(replace).toHaveBeenCalledWith("?situacao=PAGO", { scroll: false });
  });

  it("o chip da categoria que está na URL é o pressionado (AC 7)", () => {
    estado.parametros = new URLSearchParams(`categoriaId=${CATEGORIA_X}`);
    montar();

    expect(screen.getByRole("button", { name: CHIP_X }).getAttribute("aria-pressed")).toBe("true");
  });

  it("sem categoria na URL, o chip não está pressionado (AC 7)", () => {
    montar();

    expect(screen.getByRole("button", { name: CHIP_X }).getAttribute("aria-pressed")).toBe("false");
  });

  /* Uma região só: duas anunciariam a mesma contagem duas vezes. */
  it("a contagem é uma frase numa região role=status, a única do cartão (AC 8)", () => {
    estado.parametros = new URLSearchParams(`categoriaId=${CATEGORIA_X}`);
    const { container: cartao } = montar({ quantidadeVisivel: 2, totalVisivel: "R$ 120,00" });

    const regioes = within(cartao).getAllByRole("status");
    expect(regioes).toHaveLength(1);
    expect(regioes[0]?.textContent).toBe("2 lançamentos com 1 filtro. Total R$ 120,00");
  });
});

describe("o total e a contagem exibidos são os recebidos (REDE-01, AC 6)", () => {
  it("imprime a quantidade e o total do que restou", () => {
    montar({ quantidadeVisivel: 3, totalVisivel: "R$ 45,67" });

    expect(screen.getByText(/3 lançamentos/).textContent).toContain("R$ 45,67");
  });

  it("usa o singular quando restou um só", () => {
    montar({ quantidadeVisivel: 1, totalVisivel: "R$ 10,00" });

    expect(screen.getByText(/^1 lançamento\./).textContent).toContain("R$ 10,00");
  });

  it("não imprime filtro ativo quando a URL não tem nenhum", () => {
    montar({ quantidadeVisivel: 2 });

    expect(screen.queryByText(/filtro/)).toBeNull();
  });

  it("anuncia quantos filtros estão ativos", () => {
    estado.parametros = new URLSearchParams(`categoriaId=${CATEGORIA_X}&situacao=PAGO`);
    montar({ quantidadeVisivel: 2 });

    expect(screen.getByText(/2 lançamentos com 2 filtros/)).toBeTruthy();
  });

  it("anuncia o filtro ativo no singular quando só há um", () => {
    estado.parametros = new URLSearchParams("situacao=PAGO");
    montar({ quantidadeVisivel: 2 });

    expect(screen.getByText(/2 lançamentos com 1 filtro\./)).toBeTruthy();
  });
});

describe("todo controle tem rótulo acessível associado", () => {
  it("cada campo é alcançável pelo próprio rótulo", () => {
    montar();

    for (const rotulo of [
      "Buscar por descrição",
      "Categoria",
      "Meio de pagamento",
      "Pessoa",
      "Situação",
    ]) {
      expect(screen.getByLabelText(rotulo).id).not.toBe("");
    }
  });

  it("o campo de busca é do tipo search, e não texto solto", () => {
    montar();

    expect(screen.getByLabelText("Buscar por descrição").getAttribute("type")).toBe("search");
  });
});

describe("limpar filtros devolve a lista inteira do mês", () => {
  it("o controle só aparece quando há filtro ativo", () => {
    montar();

    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull();
  });

  it("acionado, navega para a URL sem parâmetro nenhum", () => {
    estado.parametros = new URLSearchParams(`categoriaId=${CATEGORIA_X}&busca=agua`);
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(replace).toHaveBeenCalledWith("?", { scroll: false });
  });

  /* O vazio de filtro é justamente onde a saída precisa estar à vista: a
     lista não tem nada para mostrar, e o que tira a pessoa de lá é limpar. */
  it("continua oferecido quando o filtro não devolveu resultado (VAZIO-01, AC 2)", () => {
    estado.parametros = new URLSearchParams("busca=inexistente");
    montar({ quantidadeVisivel: 0, totalVisivel: "R$ 0,00" });

    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeDefined();
    expect(screen.getByText(/lançamentos com 1 filtro/)).toBeDefined();
  });
});
