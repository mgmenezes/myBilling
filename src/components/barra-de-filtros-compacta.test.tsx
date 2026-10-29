import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarraDeFiltrosCompacta } from "./barra-de-filtros-compacta";
import { FiltrosDeLancamentos } from "./filtros-de-lancamentos";

/**
 * Testes derivados de LST-03 (ACs 1 a 7).
 *
 * O `IntersectionObserver` é um dublê: o jsdom não calcula layout, então quem
 * diz se o cartão está na tela é o teste, chamando o callback que a barra
 * registrou. O estado dos filtros vive na URL, e o dublê de `next/navigation`
 * segue o de `filtros-de-lancamentos.test.tsx`. Relógio falso para o
 * debounce, e por isso `fireEvent` em vez de `userEvent`, pelo mesmo motivo
 * registrado lá.
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

class IntersectionObserverFalso {
  static instancias: IntersectionObserverFalso[] = [];
  readonly observados: Element[] = [];
  constructor(readonly callback: IntersectionObserverCallback) {
    IntersectionObserverFalso.instancias.push(this);
  }
  observe(alvo: Element): void {
    this.observados.push(alvo);
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** O cartão sai da tela (`false`) ou volta a ela (`true`). */
function cartaoNaTela(visivel: boolean): void {
  act(() => {
    for (const observador of IntersectionObserverFalso.instancias) {
      for (const alvo of observador.observados) {
        observador.callback(
          [{ isIntersecting: visivel, target: alvo } as unknown as IntersectionObserverEntry],
          observador as unknown as IntersectionObserver,
        );
      }
    }
  });
}

const ATIVOS = [
  { chave: "categoriaId", rotulo: "Casa" },
  { chave: "situacao", rotulo: "Pendente" },
  { chave: "usuarioId", rotulo: "Pessoa A" },
];

/** Um cartão de filtros mínimo, com o id que a barra observa. */
function montar(ativos: ReadonlyArray<{ chave: string; rotulo: string }> = ATIVOS) {
  return render(
    <>
      <div id="cartao-teste">
        <input aria-label="Primeiro campo do cartão" />
        <select aria-label="Segundo campo do cartão" />
      </div>
      <BarraDeFiltrosCompacta alvo="cartao-teste" ativos={ativos} />
    </>,
  );
}

/* `<search>` ainda não tem papel no aria-query do Testing Library; a barra é
   achada pelo nome acessível que ela declara. */
const barra = () => screen.getByLabelText("Busca e filtros ativos");
const barraAusente = () => screen.queryByLabelText("Busca e filtros ativos");

async function passar(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  replace.mockClear();
  estado.parametros = new URLSearchParams();
  IntersectionObserverFalso.instancias = [];
  vi.stubGlobal("IntersectionObserver", IntersectionObserverFalso);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a barra aparece só com o cartão fora da tela (LST-03, ACs 1 e 2)", () => {
  it("observa o cartão de filtros pelo id recebido", () => {
    montar();

    expect(IntersectionObserverFalso.instancias[0]?.observados).toEqual([
      document.getElementById("cartao-teste"),
    ]);
  });

  it("com o cartão na tela, a barra não aparece", () => {
    montar();
    cartaoNaTela(true);

    expect(barraAusente()).toBeNull();
    expect(screen.queryByRole("button", { name: "Filtros" })).toBeNull();
  });

  it("com o cartão fora da tela, mostra a busca, os filtros ativos e Filtros", () => {
    montar();
    cartaoNaTela(false);

    expect(within(barra()).getByRole("searchbox", { name: "Buscar por descrição" })).toBeDefined();
    expect(within(barra()).getByRole("button", { name: "Tirar o filtro Casa" })).toBeDefined();
    expect(within(barra()).getByRole("button", { name: "Filtros" })).toBeDefined();
  });

  it("fica fixa no topo", () => {
    montar();
    cartaoNaTela(false);

    expect(barra().className.split(/\s+/)).toEqual(expect.arrayContaining(["fixed", "top-0"]));
  });

  it("quando o cartão volta à tela, a barra some", () => {
    montar();
    cartaoNaTela(false);
    cartaoNaTela(true);

    expect(barraAusente()).toBeNull();
  });
});

describe("a busca da barra é a mesma da URL (LST-03, AC 3)", () => {
  it("digitar grava busca na URL depois de 250 ms, e não antes", async () => {
    montar([]);
    cartaoNaTela(false);

    fireEvent.change(within(barra()).getByRole("searchbox"), { target: { value: "agua" } });
    await passar(249);
    expect(replace).not.toHaveBeenCalled();

    await passar(1);
    expect(replace).toHaveBeenCalledWith("?busca=agua", { scroll: false });
  });

  it("mantém os outros parâmetros ao gravar a busca", async () => {
    estado.parametros = new URLSearchParams(`categoriaId=${CATEGORIA_X}`);
    montar([]);
    cartaoNaTela(false);

    fireEvent.change(within(barra()).getByRole("searchbox"), { target: { value: "agua" } });
    await passar(300);

    expect(replace).toHaveBeenCalledWith(`?categoriaId=${CATEGORIA_X}&busca=agua`, {
      scroll: false,
    });
  });

  it("parte do termo que já está na URL", () => {
    estado.parametros = new URLSearchParams("busca=agua");
    montar([]);
    cartaoNaTela(false);

    expect(within(barra()).getByRole<HTMLInputElement>("searchbox").value).toBe("agua");
  });

  /* Cartão e barra mostram a mesma URL. Sem isso, o cartão, que ficou com o
     campo vazio, regravaria a busca vazia 250 ms depois de a barra gravar a
     dela, e o filtro digitado sumiria sozinho. */
  it("o cartão de filtros segue a busca digitada na barra, e não a desfaz", async () => {
    const { rerender } = render(<Pagina />);
    cartaoNaTela(false);

    fireEvent.change(within(barra()).getByRole("searchbox"), { target: { value: "agua" } });
    await passar(300);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("?busca=agua", { scroll: false });

    estado.parametros = new URLSearchParams("busca=agua");
    rerender(<Pagina />);
    await passar(300);

    expect(replace).toHaveBeenCalledTimes(1);
    const cartao = document.getElementById("cartao-de-filtros") as HTMLElement;
    expect(within(cartao).getByRole<HTMLInputElement>("searchbox").value).toBe("agua");
  });
});

/** O cartão de verdade e a barra, como a página os monta. */
function Pagina() {
  return (
    <>
      <div id="cartao-de-filtros">
        <FiltrosDeLancamentos
          categorias={[]}
          meios={[]}
          usuarios={[]}
          totalVisivel="R$ 0,00"
          quantidadeVisivel={0}
        />
      </div>
      <BarraDeFiltrosCompacta alvo="cartao-de-filtros" ativos={[]} />
    </>
  );
}

describe("cada filtro ativo sai pelo próprio × (LST-03, AC 4)", () => {
  it('o filtro é um botão "Casa ×" chamado "Tirar o filtro Casa"', () => {
    montar();
    cartaoNaTela(false);

    const casa = within(barra()).getByRole("button", { name: "Tirar o filtro Casa" });
    expect(casa.textContent).toBe("Casa ×");
  });

  it("acionado, tira só aquele parâmetro da URL", () => {
    estado.parametros = new URLSearchParams(`categoriaId=${CATEGORIA_X}&situacao=PENDENTE`);
    montar();
    cartaoNaTela(false);

    fireEvent.click(within(barra()).getByRole("button", { name: "Tirar o filtro Casa" }));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("?situacao=PENDENTE", { scroll: false });
  });

  it("o último filtro tirado deixa a URL sem parâmetro", () => {
    estado.parametros = new URLSearchParams("situacao=PENDENTE");
    montar([{ chave: "situacao", rotulo: "Pendente" }]);
    cartaoNaTela(false);

    fireEvent.click(within(barra()).getByRole("button", { name: "Tirar o filtro Pendente" }));

    expect(replace).toHaveBeenCalledWith("?", { scroll: false });
  });
});

describe('"Filtros" leva ao cartão (LST-03, AC 5)', () => {
  it("rola até o cartão e põe o foco no primeiro controle dele", () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    montar();
    cartaoNaTela(false);

    fireEvent.click(within(barra()).getByRole("button", { name: "Filtros" }));

    expect(rolar).toHaveBeenCalledTimes(1);
    expect(rolar.mock.contexts[0]).toBe(document.getElementById("cartao-teste"));
    expect(document.activeElement).toBe(screen.getByLabelText("Primeiro campo do cartão"));
  });
});

describe("o topo da rolagem reserva a altura da barra (LST-03, AC 6)", () => {
  const css = readFileSync(join(import.meta.dirname, "..", "app", "globals.css"), "utf8");

  it("globals.css declara a altura da barra e a usa no scroll-padding-top do html", () => {
    expect(css).toMatch(/--altura-da-barra-de-filtros:\s*[\d.]+rem;/);
    expect(css).toMatch(
      /html\s*\{[^}]*scroll-padding-top:\s*var\(--altura-da-barra-de-filtros\);[^}]*\}/,
    );
  });

  it("a barra tem exatamente essa altura", () => {
    montar();
    cartaoNaTela(false);

    expect(barra().className.split(/\s+/)).toContain("h-(--altura-da-barra-de-filtros)");
  });
});

describe("em 400 px, no máximo dois filtros e +N (LST-03, AC 7)", () => {
  /* O jsdom não aplica CSS: o que se prende aqui são as classes que escondem
     a partir do terceiro filtro abaixo de `sm`. A medição em 400 px é do e2e. */
  const classes = (elemento: Element | null | undefined) => elemento?.className.split(/\s+/) ?? [];

  it("com 3 filtros, os 2 primeiros sempre aparecem, o terceiro só a partir de sm, e +1 só abaixo", () => {
    montar();
    cartaoNaTela(false);

    const filtro = (nome: string) =>
      within(barra())
        .getByRole("button", { name: `Tirar o filtro ${nome}` })
        .closest("li");
    expect(classes(filtro("Casa"))).not.toContain("hidden");
    expect(classes(filtro("Pendente"))).not.toContain("hidden");
    expect(classes(filtro("Pessoa A"))).toEqual(expect.arrayContaining(["hidden", "sm:flex"]));

    const mais = within(barra()).getByText("+1").closest("li");
    expect(classes(mais)).toContain("sm:hidden");
  });

  it("com 2 filtros, não há +N", () => {
    montar(ATIVOS.slice(0, 2));
    cartaoNaTela(false);

    expect(within(barra()).queryByText(/^\+\d/)).toBeNull();
  });

  it("o rótulo longo encolhe dentro do botão, sem empurrar a barra para o lado", () => {
    montar();
    cartaoNaTela(false);

    const casa = within(barra()).getByRole("button", { name: "Tirar o filtro Casa" });
    expect(classes(casa)).toContain("min-w-0");
    expect(classes(within(casa).getByText("Casa"))).toContain("truncate");
  });
});
