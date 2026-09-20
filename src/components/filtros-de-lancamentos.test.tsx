import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FiltrosDeLancamentos } from "./filtros-de-lancamentos";

/**
 * Testes derivados de REDE-01 (ACs 5 e 6).
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

const CATEGORIAS = [{ id: CATEGORIA_X, nome: "Categoria X" }];
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
  const casos = [
    { rotulo: "Categoria", escolha: CATEGORIA_X, esperado: `?categoriaId=${CATEGORIA_X}` },
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
