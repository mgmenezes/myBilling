import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  criarRecorrencia,
  editarRecorrencia,
  encerrarRecorrencia,
  registrarNovaVigencia,
} from "@/app/actions/recorrencias";
import type { ContextoDoFormulario } from "./painel-do-fixo";
import type { ItemDeFixo } from "./tabela-de-fixos";
import { TodoMes } from "./todo-mes";

/**
 * Derivado de FIXCOL-03 (AC 1), FIXCOL-06 (ACs 1 e 2), FIXCOL-07 (ACs 3, 5 e 6,
 * na ordem do DOM; a medida é do e2e), FIXCOL-08 (ACs 2 e 4) e FIXCOL-09.
 *
 * O endereço é o do jsdom: o teste lê `window.location` depois de cada gesto,
 * e não só a chamada a `history`, porque o que importa é a URL que fica.
 */

const { refresh, navegar } = vi.hoisted(() => ({
  refresh: vi.fn(),
  /* O `router.replace` do Next troca o endereço sem entrada nova no histórico:
     aqui, pelo `replaceState` do jsdom, para os testes lerem a URL que fica. */
  navegar: vi.fn((endereco: string) => window.history.replaceState(null, "", endereco)),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace: navegar }) }));

const UUID_CONTA = "22222222-2222-4222-8222-222222222222";
const UUID_U = "11111111-1111-4111-8111-111111111111";

const FIXO_A: ItemDeFixo = {
  id: "rec-a",
  descricao: "Fixo A",
  natureza: "DESPESA",
  diaVencimento: 5,
  categoria: "Categoria Um",
  corDaCategoria: "roxo",
  meio: "Conta Corrente",
  pessoa: "Pessoa A",
  valorDoMes: "R$ 105,00",
  previstoDoMes: "R$ 100,00",
  confirmado: true,
  inicio: "Janeiro de 2026",
  comecaDepois: false,
  fim: null,
  encerrada: false,
  historico: [{ desde: "Janeiro de 2026", valor: "R$ 100,00", valeNoMes: true }],
  competenciaInicio: "2026-01",
  competenciaFim: null,
  meioPagamentoId: UUID_CONTA,
  categoriaId: null,
  usuarioId: UUID_U,
  valorNoMesCentavos: 10000,
};
const FIXO_B: ItemDeFixo = {
  ...FIXO_A,
  id: "rec-b",
  descricao: "Fixo B",
  diaVencimento: 10,
  valorDoMes: "R$ 50,00",
  previstoDoMes: "R$ 50,00",
  confirmado: false,
};
const ENTRADA_A: ItemDeFixo = {
  ...FIXO_A,
  id: "rec-e",
  descricao: "Entrada A",
  natureza: "RECEITA",
  categoria: "Receita",
  corDaCategoria: null,
  valorDoMes: "R$ 1.000,00",
  previstoDoMes: "R$ 1.000,00",
  confirmado: false,
};

const FORMULARIO: ContextoDoFormulario = {
  meios: [{ id: UUID_CONTA, nome: "Conta Corrente", geraFatura: false }],
  categorias: [],
  usuarios: [{ id: UUID_U, nome: "Pessoa A" }],
  criar: vi.fn() as unknown as typeof criarRecorrencia,
  editar: vi.fn() as unknown as typeof editarRecorrencia,
  criarCategoria: vi.fn(),
  criarMeioDePagamento: vi.fn(),
};

const ENDERECO = "/2026-03/fixos";

beforeEach(() => {
  window.history.replaceState(null, "", `${ENDERECO}?outro=1`);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  refresh.mockReset();
  navegar.mockClear();
});

interface Opcoes {
  readonly saidas?: ReadonlyArray<ItemDeFixo>;
  readonly fixoInicial?: string | null;
}

function tela(opcoes: Opcoes) {
  return (
    <TodoMes
      competencia="2026-03"
      rotuloDaCompetencia="Março de 2026"
      nomeDoMes="Março"
      entradas={[ENTRADA_A]}
      saidas={opcoes.saidas ?? [FIXO_A, FIXO_B]}
      totalEntradas="R$ 1.000,00"
      totalSaidas="R$ 155,00"
      fixoInicial={opcoes.fixoInicial ?? null}
      formulario={FORMULARIO}
      registrarVigencia={vi.fn() as unknown as typeof registrarNovaVigencia}
      encerrar={vi.fn() as unknown as typeof encerrarRecorrencia}
    />
  );
}

function montar(opcoes: Opcoes = {}) {
  const utils = render(tela(opcoes));
  return {
    ...utils,
    usuario: userEvent.setup(),
    mudar: (novas: Opcoes) => utils.rerender(tela({ ...opcoes, ...novas })),
  };
}

function oPainel(): HTMLElement | null {
  return screen.queryByRole("complementary", { name: "Painel do fixo" });
}

function tituloDoPainel(): HTMLElement {
  const painel = oPainel();
  if (painel === null) {
    throw new Error("o painel não está aberto");
  }
  return within(painel).getByRole("heading", { level: 2 });
}

/**
 * Nada aberto: o painel diz "Nenhum fixo aberto", e a coluna que o envolve só
 * aparece a partir de 1.536 px, por `hidden 2xl:block` (FIXCOL-07, ACs 3 e 6).
 * O jsdom não aplica o CSS: a medida dos dois lados de 1.536 px é do e2e.
 */
function nadaAberto(): boolean {
  const painel = oPainel();
  if (painel === null) {
    return false;
  }
  const coluna = painel.parentElement?.className.split(/\s+/) ?? [];
  return (
    tituloDoPainel().textContent === "Nenhum fixo aberto" &&
    coluna.includes("hidden") &&
    coluna.includes("2xl:block")
  );
}

/** A coluna do painel aparece em toda largura: nada a esconde. */
function colunaAVista(): boolean {
  const coluna = oPainel()?.parentElement?.className.split(/\s+/) ?? ["hidden"];
  return !coluna.includes("hidden");
}

function botaoDaLinha(descricao: string): HTMLElement {
  return screen.getByRole("button", { name: descricao });
}

function botaoNovo(): HTMLElement {
  return screen.getByRole("button", { name: "+ Novo fixo" });
}

/** O total do alto: a definição logo depois do termo. */
function total(termo: string): string | null | undefined {
  return screen.getByText(termo, { selector: "dt" }).nextElementSibling?.textContent;
}

/** `a` vem antes de `b` na ordem do documento. */
function antes(a: Node, b: Node): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe("o alto da tela (FIXCOL-06, AC 1; FIXCOL-03, AC 1)", () => {
  it('"Todo mês" e "+ Novo fixo" vêm antes dos totais e das seções', () => {
    montar();

    const totais = screen.getByText("Saídas fixas em Março de 2026", { selector: "dt" });
    const secoes = screen.getByRole("region", { name: "Entradas fixas" });
    for (const topo of [screen.getByRole("heading", { level: 1, name: "Todo mês" }), botaoNovo()]) {
      expect(antes(topo, totais)).toBe(true);
      expect(antes(topo, secoes)).toBe(true);
    }
  });

  it("os dois totais do mês, cada um com o seu valor", () => {
    montar();

    expect(total("Saídas fixas em Março de 2026")).toBe("R$ 155,00");
    expect(total("Entradas fixas em Março de 2026")).toBe("R$ 1.000,00");
  });
});

describe("o painel na ordem da tela (FIXCOL-07, ACs 5 e 6)", () => {
  it('sem nada aberto, o painel diz "Nenhum fixo aberto" e a coluna dele some abaixo de 1.536 px', () => {
    montar();

    expect(nadaAberto()).toBe(true);
  });

  it("com um fixo aberto, o painel fica entre os totais e as seções", async () => {
    const { usuario } = montar();

    await usuario.click(botaoDaLinha("Fixo B"));

    const painel = oPainel();
    expect(painel).not.toBeNull();
    expect(colunaAVista()).toBe(true);
    const totais = screen.getByText("Entradas fixas em Março de 2026", { selector: "dt" });
    expect(antes(totais, painel as HTMLElement)).toBe(true);
    expect(
      antes(painel as HTMLElement, screen.getByRole("region", { name: "Entradas fixas" })),
    ).toBe(true);
  });

  it("com o cadastro aberto, também", async () => {
    const { usuario } = montar();

    await usuario.click(botaoNovo());

    const painel = oPainel() as HTMLElement;
    expect(colunaAVista()).toBe(true);
    expect(
      antes(screen.getByText("Saídas fixas em Março de 2026", { selector: "dt" }), painel),
    ).toBe(true);
    expect(antes(painel, screen.getByRole("region", { name: "Saídas fixas" }))).toBe(true);
  });
});

describe("abrir um fixo e o endereço (FIXCOL-09, ACs 1 a 3; FIXCOL-08, AC 2)", () => {
  it("abrir a linha mostra o fixo no painel, marca a linha e leva o foco ao título", async () => {
    const { usuario } = montar();

    await usuario.click(botaoDaLinha("Fixo B"));

    expect(tituloDoPainel().textContent).toBe("Fixo B");
    expect(botaoDaLinha("Fixo B").getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(tituloDoPainel());
  });

  it("põe `?fixo=<id>` na URL por replaceState, mantém os outros parâmetros e não cria entrada", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    const entradasNoHistorico = window.history.length;
    const { usuario } = montar();

    await usuario.click(botaoDaLinha("Fixo B"));

    expect(replace).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe(ENDERECO);
    expect(new URLSearchParams(window.location.search).get("fixo")).toBe("rec-b");
    expect(new URLSearchParams(window.location.search).get("outro")).toBe("1");
    expect(window.history.length).toBe(entradasNoHistorico);
  });

  /* Trocar o `?fixo=` passa pelo roteador do Next, sem rolar: pelo
     `replaceState`, o Next guardava uma rolagem até o alto, que a próxima
     página relida executava, e a confirmação de salvar saía da janela
     (FIXCOL-05, AC 5; FIXCOL-06, AC 3). A rolagem se mede no e2e; aqui, a
     navegação que a evita. */
  it("abrir um fixo, que muda o `?fixo=`, troca o endereço pelo roteador do Next, sem rolar", async () => {
    const { usuario } = montar();

    await usuario.click(botaoDaLinha("Fixo B"));

    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith("?outro=1&fixo=rec-b", { scroll: false });
  });

  it("abrir o cadastro com o endereço já sem `?fixo=` não navega", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "+ Novo fixo" }));

    expect(window.location.search).toBe("?outro=1");
    expect(navegar).not.toHaveBeenCalled();
  });

  it("`fixoInicial` da lista abre o painel com ele, sem roubar o foco", () => {
    montar({ fixoInicial: "rec-e" });

    expect(tituloDoPainel().textContent).toBe("Entrada A");
    expect(document.activeElement).toBe(document.body);
  });

  it("`fixoInicial` que não está na lista deixa o painel fechado, sem erro", () => {
    montar({ fixoInicial: "rec-de-outro-mes" });

    expect(nadaAberto()).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("region", { name: "Saídas fixas" })).toBeTruthy();
  });
});

describe("o cadastro (FIXCOL-06, AC 2; FIXCOL-09, AC 4)", () => {
  it('"+ Novo fixo" fecha o fixo aberto, mostra o cadastro e tira `?fixo=`', async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Fixo B"));

    await usuario.click(botaoNovo());

    expect(tituloDoPainel().textContent).toBe("Novo gasto fixo ou entrada");
    expect(within(oPainel() as HTMLElement).getByRole("form")).toBeTruthy();
    expect(botaoDaLinha("Fixo B").getAttribute("aria-expanded")).toBe("false");
    expect(new URLSearchParams(window.location.search).has("fixo")).toBe(false);
    expect(new URLSearchParams(window.location.search).get("outro")).toBe("1");
    expect(document.activeElement).toBe(tituloDoPainel());
  });
});

describe("fechar e o foco de volta (FIXCOL-08, AC 4; FIXCOL-09, AC 4)", () => {
  it('"Fechar" tira `?fixo=` e devolve o foco ao botão da linha', async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Fixo B"));

    await usuario.click(screen.getByRole("button", { name: "Fechar" }));

    expect(nadaAberto()).toBe(true);
    expect(document.activeElement).toBe(botaoDaLinha("Fixo B"));
    expect(botaoDaLinha("Fixo B").getAttribute("aria-expanded")).toBe("false");
    expect(new URLSearchParams(window.location.search).has("fixo")).toBe(false);
    expect(new URLSearchParams(window.location.search).get("outro")).toBe("1");
  });

  it("`Escape` tira `?fixo=` e devolve o foco ao botão da linha", async () => {
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Fixo A"));

    await usuario.keyboard("{Escape}");

    expect(nadaAberto()).toBe(true);
    expect(document.activeElement).toBe(botaoDaLinha("Fixo A"));
    expect(new URLSearchParams(window.location.search).has("fixo")).toBe(false);
  });

  it('fechar o cadastro devolve o foco ao "+ Novo fixo"', async () => {
    const { usuario } = montar();
    await usuario.click(botaoNovo());

    await usuario.click(screen.getByRole("button", { name: "Fechar" }));

    expect(nadaAberto()).toBe(true);
    expect(document.activeElement).toBe(botaoNovo());
  });

  it('sem nenhum outro parâmetro, fechar deixa a URL sem "?"', async () => {
    window.history.replaceState(null, "", ENDERECO);
    const { usuario } = montar();
    await usuario.click(botaoDaLinha("Fixo B"));
    expect(window.location.search).toBe("?fixo=rec-b");

    await usuario.click(screen.getByRole("button", { name: "Fechar" }));

    expect(window.location.href.endsWith(ENDERECO)).toBe(true);
  });

  it('fechar um fixo que saiu da lista devolve o foco ao "+ Novo fixo"', async () => {
    const { usuario, mudar } = montar();
    await usuario.click(botaoDaLinha("Fixo B"));
    mudar({ saidas: [FIXO_A] });

    await usuario.click(screen.getByRole("button", { name: "Fechar" }));

    expect(nadaAberto()).toBe(true);
    expect(document.activeElement).toBe(botaoNovo());
  });
});
