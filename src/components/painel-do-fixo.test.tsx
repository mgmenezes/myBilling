import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  criarRecorrencia,
  editarRecorrencia,
  encerrarRecorrencia,
  registrarNovaVigencia,
} from "@/app/actions/recorrencias";
import { type Aberto, type ContextoDoFormulario, PainelDoFixo } from "./painel-do-fixo";
import type { ItemDeFixo } from "./tabela-de-fixos";

/**
 * Derivado de FIXCOL-04 (ACs 1, 8 e 9), FIXCOL-05 (ACs 1 a 8), FIXCOL-06 (ACs
 * 2 e 3), FIXCOL-07 (AC 3, o texto) e FIXCOL-08 (ACs 2 e 3).
 *
 * Herda de `lista-de-fixos.test.tsx` o "cada linha abre o seu controle" (326),
 * agora "trocar de fixo descarta o digitado", e os testes da edição (392, 410,
 * 435 e 451), agora no painel e não num `<dialog>`.
 *
 * O fixo editável foge dos padrões do cadastro (segunda pessoa, terceiro meio,
 * dia 31, fim preenchido, valor com milhar): um campo que o painel deixasse de
 * passar ao formulário viria com o padrão e reprovaria no payload.
 */

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  refresh.mockReset();
});

const UUID_CONTA = "22222222-2222-4222-8222-222222222222";
const UUID_CARTAO = "44444444-4444-4444-8444-444444444444";
const UUID_POUPANCA = "77777777-7777-4777-8777-777777777777";
const UUID_CAT = "33333333-3333-4333-8333-333333333333";
const UUID_U = "11111111-1111-4111-8111-111111111111";
const UUID_U2 = "66666666-6666-4666-8666-666666666666";
const UUID_B = "55555555-5555-4555-8555-555555555555";
const UUID_E = "88888888-8888-4888-8888-888888888888";
const UUID_A = "99999999-9999-4999-8999-999999999999";

const FIXO_B: ItemDeFixo = {
  id: UUID_B,
  descricao: "Fixo B",
  natureza: "DESPESA",
  diaVencimento: 31,
  categoria: "Categoria Um",
  corDaCategoria: "roxo",
  meio: "Conta Poupança",
  pessoa: "Pessoa B",
  valorDoMes: "R$ 1.234,56",
  previstoDoMes: "R$ 1.234,56",
  confirmado: false,
  inicio: "Janeiro de 2026",
  comecaDepois: false,
  fim: "Dezembro de 2026",
  encerrada: false,
  historico: [{ desde: "Janeiro de 2026", valor: "R$ 1.234,56", valeNoMes: true }],
  competenciaInicio: "2026-01",
  competenciaFim: "2026-12",
  meioPagamentoId: UUID_POUPANCA,
  categoriaId: UUID_CAT,
  usuarioId: UUID_U2,
  valorNoMesCentavos: 123456,
};
const ENTRADA_A: ItemDeFixo = {
  ...FIXO_B,
  id: UUID_E,
  descricao: "Entrada A",
  natureza: "RECEITA",
  diaVencimento: 5,
  categoria: "Receita",
  corDaCategoria: null,
  meio: "Conta Corrente",
  meioPagamentoId: UUID_CONTA,
  categoriaId: null,
  fim: null,
  competenciaFim: null,
};
/* Confirmado em R$ 105,00 sobre a previsão de R$ 100,00 do mês. */
const FIXO_A: ItemDeFixo = {
  ...FIXO_B,
  id: UUID_A,
  descricao: "Fixo A",
  diaVencimento: 5,
  valorDoMes: "R$ 105,00",
  previstoDoMes: "R$ 100,00",
  confirmado: true,
  valorNoMesCentavos: 10000,
};
const ITENS = [ENTRADA_A, FIXO_A, FIXO_B];

const criarOk: typeof criarRecorrencia = vi.fn(async () => ({
  ok: true as const,
  data: { id: "rec-novo", descricao: "Fixo E" },
}));
const editarOk: typeof editarRecorrencia = vi.fn(async () => ({
  ok: true as const,
  data: { mudou: true },
}));
const registrarOk: typeof registrarNovaVigencia = vi.fn(async () => ({
  ok: true as const,
  data: null,
}));
const encerrarOk: typeof encerrarRecorrencia = vi.fn(async () => ({
  ok: true as const,
  data: null,
}));

function formulario(acoes: {
  criar?: typeof criarRecorrencia;
  editar?: typeof editarRecorrencia;
}): ContextoDoFormulario {
  return {
    meios: [
      { id: UUID_CONTA, nome: "Conta Corrente", geraFatura: false },
      { id: UUID_CARTAO, nome: "Cartão Roxo", geraFatura: true },
      { id: UUID_POUPANCA, nome: "Conta Poupança", geraFatura: false },
    ],
    categorias: [{ id: UUID_CAT, nome: "Categoria Um" }],
    usuarios: [
      { id: UUID_U, nome: "Pessoa A" },
      { id: UUID_U2, nome: "Pessoa B" },
    ],
    criar: acoes.criar ?? criarOk,
    editar: acoes.editar ?? editarOk,
    criarCategoria: vi.fn(),
    criarMeioDePagamento: vi.fn(),
  };
}

interface Opcoes {
  readonly aberto?: Aberto;
  readonly itens?: ReadonlyArray<ItemDeFixo>;
  readonly focarTitulo?: number;
  readonly aoFechar?: () => void;
  readonly criar?: typeof criarRecorrencia;
  readonly editar?: typeof editarRecorrencia;
  readonly registrar?: typeof registrarNovaVigencia;
  readonly encerrar?: typeof encerrarRecorrencia;
}

function painel(opcoes: Opcoes) {
  return (
    <PainelDoFixo
      aberto={opcoes.aberto ?? { tipo: "fixo", id: UUID_B, descricao: "Fixo B" }}
      itens={opcoes.itens ?? ITENS}
      focarTitulo={opcoes.focarTitulo ?? 0}
      aoFechar={opcoes.aoFechar ?? vi.fn()}
      competencia="2026-03"
      rotuloDaCompetencia="Março de 2026"
      nomeDoMes="Março"
      formulario={formulario(opcoes)}
      registrarVigencia={opcoes.registrar ?? registrarOk}
      encerrar={opcoes.encerrar ?? encerrarOk}
    />
  );
}

function montar(opcoes: Opcoes = {}) {
  const utils = render(painel(opcoes));
  return {
    ...utils,
    usuario: userEvent.setup(),
    mudar: (novas: Opcoes) => utils.rerender(painel({ ...opcoes, ...novas })),
  };
}

function oPainel(): HTMLElement {
  return screen.getByRole("complementary", { name: "Painel do fixo" });
}

function titulo(): HTMLElement {
  return within(oPainel()).getByRole("heading", { level: 2 });
}

/** O detalhe está à vista: a lista de vigências e a ação do dia a dia. */
function noDetalhe(): boolean {
  return (
    within(oPainel()).queryByRole("region", { name: "Valor ao longo dos meses" }) !== null &&
    within(oPainel()).queryByRole("button", { name: "Editar" }) !== null
  );
}

describe("o painel e o nome dele", () => {
  it('é um complementar "Painel do fixo", com o id que as linhas apontam', () => {
    montar();

    expect(oPainel().id).toBe("painel-do-fixo");
  });
});

describe("nada aberto (FIXCOL-07, AC 3)", () => {
  it('mostra "Nenhum fixo aberto" e a dica, sem "Fechar"', () => {
    montar({ aberto: { tipo: "nada" } });

    expect(titulo().textContent).toBe("Nenhum fixo aberto");
    expect(
      within(oPainel()).getByText(
        "Escolha um fixo na lista para ver o valor ao longo dos meses e para mudar o valor, editar ou encerrar.",
      ),
    ).toBeTruthy();
    expect(within(oPainel()).queryByRole("button", { name: "Fechar" })).toBeNull();
  });
});

describe("o cadastro (FIXCOL-06, ACs 2 e 3)", () => {
  it('mostra o formulário sob "Novo gasto fixo ou entrada", sem diálogo', () => {
    montar({ aberto: { tipo: "novo" } });

    expect(titulo().textContent).toBe("Novo gasto fixo ou entrada");
    expect(within(oPainel()).getByRole("form", { name: "Gasto fixo ou entrada" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cadastrar mantém o formulário, com a confirmação e os campos limpos", async () => {
    const { usuario } = montar({ aberto: { tipo: "novo" } });
    const form = within(oPainel()).getByRole("form", { name: "Gasto fixo ou entrada" });

    await usuario.type(within(form).getByLabelText("Descrição"), "Fixo E");
    await usuario.type(within(form).getByLabelText(/De quanto costuma ser/), "70,00");
    await usuario.click(within(form).getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await within(oPainel()).findByRole("status")).toHaveProperty(
      "textContent",
      "Fixo E passa a aparecer em todo mês.",
    );
    expect((within(form).getByLabelText("Descrição") as HTMLInputElement).value).toBe("");
    expect(within(oPainel()).getByRole("form", { name: "Gasto fixo ou entrada" })).toBe(form);
  });
});

describe("o fixo aberto (FIXCOL-04, ACs 1, 8 e 9)", () => {
  it('a descrição no título e "Saída fixa · vence dia 31" abaixo dele', () => {
    montar();

    expect(titulo().textContent).toBe("Fixo B");
    expect(within(oPainel()).getByText("Saída fixa · vence dia 31")).toBeTruthy();
    expect(noDetalhe()).toBe(true);
  });

  it('na entrada, "Entrada fixa · cai dia 5"', () => {
    montar({ aberto: { tipo: "fixo", id: UUID_E, descricao: "Entrada A" } });

    expect(titulo().textContent).toBe("Entrada A");
    expect(within(oPainel()).getByText("Entrada fixa · cai dia 5")).toBeTruthy();
  });

  it('"Fechar" chama o fechamento', async () => {
    const aoFechar = vi.fn();
    const { usuario } = montar({ aoFechar });

    await usuario.click(within(oPainel()).getByRole("button", { name: "Fechar" }));

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it("trocar de fixo com o valor digitado volta ao detalhe do novo, sem o digitado", async () => {
    const { usuario, mudar } = montar();
    await usuario.click(within(oPainel()).getByRole("button", { name: "Mudar valor" }));
    await usuario.type(within(oPainel()).getByLabelText("Novo valor (R$)"), "999,00");

    mudar({ aberto: { tipo: "fixo", id: UUID_A, descricao: "Fixo A" } });

    expect(titulo().textContent).toBe("Fixo A");
    expect(noDetalhe()).toBe(true);
    expect(within(oPainel()).queryByLabelText("Novo valor (R$)")).toBeNull();
    await usuario.click(within(oPainel()).getByRole("button", { name: "Mudar valor" }));
    expect((within(oPainel()).getByLabelText("Novo valor (R$)") as HTMLInputElement).value).toBe(
      "",
    );
  });
});

describe("mudar o valor e encerrar no painel (FIXCOL-05, ACs 1 a 3 e 6)", () => {
  it('"Mudar valor" abre o controle de valor, com o mês aberto', async () => {
    const { usuario } = montar();

    await usuario.click(within(oPainel()).getByRole("button", { name: "Mudar valor" }));

    expect(within(oPainel()).getByRole("heading", { name: "Mudar o valor" })).toBeTruthy();
    expect((within(oPainel()).getByLabelText("Vale a partir de") as HTMLInputElement).value).toBe(
      "2026-03",
    );
    expect(titulo().textContent).toBe("Fixo B");
  });

  it('"Encerrar" abre o controle de encerramento, com o aviso', async () => {
    const { usuario } = montar();

    await usuario.click(within(oPainel()).getByRole("button", { name: "Encerrar" }));

    expect(within(oPainel()).getByRole("group", { name: "Encerrar" })).toBeTruthy();
    expect(within(oPainel()).getByText(/ainda não pagas deste mês em diante somem/)).toBeTruthy();
    expect(
      (within(oPainel()).getByLabelText("Encerrar a partir de") as HTMLInputElement).value,
    ).toBe("2026-03");
  });

  it("registrar o valor novo volta ao detalhe", async () => {
    const registrar = vi.fn(async () => ({ ok: true as const, data: null }));
    const { usuario } = montar({ registrar: registrar as never });

    await usuario.click(within(oPainel()).getByRole("button", { name: "Mudar valor" }));
    await usuario.type(within(oPainel()).getByLabelText("Novo valor (R$)"), "60,00");
    await usuario.click(within(oPainel()).getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(noDetalhe()).toBe(true));
    expect(registrar).toHaveBeenCalledWith({
      recorrenciaId: UUID_B,
      vigenteDesde: "2026-03",
      valorCentavos: 6000,
    });
  });

  it('"Cancelar" em "Mudar o valor" volta ao detalhe', async () => {
    const { usuario } = montar();

    await usuario.click(within(oPainel()).getByRole("button", { name: "Mudar valor" }));
    await usuario.click(within(oPainel()).getByRole("button", { name: "Cancelar" }));

    expect(noDetalhe()).toBe(true);
  });

  it('"Cancelar" em "Encerrar" volta ao detalhe', async () => {
    const { usuario } = montar();

    await usuario.click(within(oPainel()).getByRole("button", { name: "Encerrar" }));
    await usuario.click(within(oPainel()).getByRole("button", { name: "Cancelar" }));

    expect(noDetalhe()).toBe(true);
  });

  it("encerrar com sucesso volta ao detalhe, se o fixo continua no mês", async () => {
    const { usuario } = montar();

    await usuario.click(within(oPainel()).getByRole("button", { name: "Encerrar" }));
    await usuario.click(within(oPainel()).getByRole("button", { name: "Encerrar mesmo assim" }));

    await waitFor(() => expect(noDetalhe()).toBe(true));
  });
});

describe("editar no painel (FIXCOL-05, ACs 4 a 6)", () => {
  it.each([
    [UUID_B, "Fixo B", "Editar gasto fixo"],
    [UUID_E, "Entrada A", "Editar entrada"],
  ] as const)(
    'o formulário do fixo %s abre na região "%s", sem diálogo',
    async (id, descricao, nome) => {
      const { usuario } = montar({ aberto: { tipo: "fixo", id, descricao } });

      await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));

      const regiao = within(oPainel()).getByRole("region", { name: nome });
      expect(within(regiao).getByRole("form", { name: "Gasto fixo ou entrada" })).toBeTruthy();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(titulo().textContent).toBe(descricao);
    },
  );

  it("o formulário abre com o fixo e salva com os ids dele", async () => {
    const editar = vi.fn(async () => ({ ok: true as const, data: { mudou: false } }));
    const { usuario } = montar({ editar: editar as never });

    await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));
    const regiao = within(oPainel()).getByRole("region", { name: "Editar gasto fixo" });
    expect((within(regiao).getByLabelText("Começa em") as HTMLInputElement).value).toBe("2026-01");
    await usuario.click(within(regiao).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(editar).toHaveBeenCalledWith({
        recorrenciaId: UUID_B,
        descricao: "Fixo B",
        valorCentavos: 123456,
        diaVencimento: 31,
        competenciaFim: "2026-12",
        categoriaId: UUID_CAT,
        usuarioId: UUID_U2,
        meioPagamentoId: UUID_POUPANCA,
        vigenteDesde: "2026-03",
        competenciaExibida: "2026-03",
      });
    });
  });

  it("o valor da edição é a previsão do mês, e não o confirmado", async () => {
    const { usuario } = montar({ aberto: { tipo: "fixo", id: UUID_A, descricao: "Fixo A" } });

    await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));

    const regiao = within(oPainel()).getByRole("region", { name: "Editar gasto fixo" });
    expect((within(regiao).getByLabelText(/De quanto costuma ser/) as HTMLInputElement).value).toBe(
      "100,00",
    );
  });

  it.each([
    [true, "Alterações salvas."],
    [false, "Nada mudou: já estava tudo assim."],
  ] as const)("salvar com mudou=%s mostra “%s” e o formulário fica", async (mudou, texto) => {
    const editar = vi.fn(async () => ({ ok: true as const, data: { mudou } }));
    const { usuario } = montar({ editar: editar as never });

    await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));
    const regiao = within(oPainel()).getByRole("region", { name: "Editar gasto fixo" });
    await usuario.click(within(regiao).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(regiao).findByRole("status")).toHaveProperty("textContent", texto);
    expect(within(oPainel()).getByRole("region", { name: "Editar gasto fixo" })).toBe(regiao);
  });

  it('"Voltar" mostra o detalhe, e reabrir a edição mostra o gravado, não o digitado', async () => {
    const { usuario } = montar();
    await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));
    const descricao = () =>
      within(within(oPainel()).getByRole("region", { name: "Editar gasto fixo" })).getByLabelText(
        "Descrição",
      ) as HTMLInputElement;
    await usuario.clear(descricao());
    await usuario.type(descricao(), "Rascunho");

    await usuario.click(within(oPainel()).getByRole("button", { name: "Voltar" }));

    expect(noDetalhe()).toBe(true);
    await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));
    expect(descricao().value).toBe("Fixo B");
  });

  it("fechar e reabrir o fixo também descarta o digitado", async () => {
    const { usuario, mudar } = montar();
    await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));
    await usuario.type(within(oPainel()).getByLabelText("Descrição"), " rascunho");

    mudar({ aberto: { tipo: "nada" } });
    mudar({ aberto: { tipo: "fixo", id: UUID_B, descricao: "Fixo B" } });

    expect(noDetalhe()).toBe(true);
    await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));
    expect((within(oPainel()).getByLabelText("Descrição") as HTMLInputElement).value).toBe(
      "Fixo B",
    );
  });
});

describe("o fixo que sai do mês (FIXCOL-05, AC 8)", () => {
  it('diz que "Fixo B não aparece mais em Março de 2026.", com "Fechar", no lugar do detalhe', async () => {
    const aoFechar = vi.fn();
    const { usuario } = montar({ itens: [ENTRADA_A, FIXO_A], aoFechar });

    expect(titulo().textContent).toBe("Fixo B");
    expect(within(oPainel()).getByText("Fixo B não aparece mais em Março de 2026.")).toBeTruthy();
    expect(within(oPainel()).queryByRole("button", { name: "Mudar valor" })).toBeNull();
    expect(within(oPainel()).queryByRole("button", { name: "Editar" })).toBeNull();
    await usuario.click(within(oPainel()).getByRole("button", { name: "Fechar" }));
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it("encerrar a partir do mês aberto, com a lista relida sem ele, mostra o aviso", async () => {
    const { usuario, mudar } = montar();
    await usuario.click(within(oPainel()).getByRole("button", { name: "Encerrar" }));
    await usuario.click(within(oPainel()).getByRole("button", { name: "Encerrar mesmo assim" }));
    await waitFor(() => expect(noDetalhe()).toBe(true));

    mudar({ itens: [ENTRADA_A, FIXO_A] });

    expect(within(oPainel()).getByText("Fixo B não aparece mais em Março de 2026.")).toBeTruthy();
  });
});

describe("teclado e foco (FIXCOL-04, AC 8; FIXCOL-08, ACs 2 e 3)", () => {
  it("`Escape` com o foco num campo do painel fecha", async () => {
    const aoFechar = vi.fn();
    const { usuario } = montar({ aoFechar });
    await usuario.click(within(oPainel()).getByRole("button", { name: "Mudar valor" }));
    await usuario.click(within(oPainel()).getByLabelText("Novo valor (R$)"));

    await usuario.keyboard("{Escape}");

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it("`Escape` no cadastro também fecha", async () => {
    const aoFechar = vi.fn();
    const { usuario } = montar({ aberto: { tipo: "novo" }, aoFechar });
    await usuario.click(within(oPainel()).getByLabelText("Descrição"));

    await usuario.keyboard("{Escape}");

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it("mudar `focarTitulo` leva o foco ao título do painel", () => {
    const { mudar } = montar({ focarTitulo: 0 });
    expect(document.activeElement).not.toBe(titulo());

    mudar({ aberto: { tipo: "fixo", id: UUID_A, descricao: "Fixo A" }, focarTitulo: 1 });

    expect(document.activeElement).toBe(titulo());
    expect(titulo().textContent).toBe("Fixo A");
  });

  it("montar o painel como a carga da página com `?fixo=`, sem pedido de foco, não leva o foco", () => {
    montar({ focarTitulo: 0 });

    expect(document.activeElement).toBe(document.body);
  });

  it("montar o painel com um pedido de foco, como abrir com o painel fechado, leva o foco", () => {
    montar({ aberto: { tipo: "novo" }, focarTitulo: 3 });

    expect(document.activeElement).toBe(titulo());
    expect(titulo().getAttribute("tabindex")).toBe("-1");
  });
});

/**
 * O botão que troca o modo some com o modo, e o foco cairia no `body`: quem
 * usa teclado teria de recomeçar do alto da página. O foco vai ao título do
 * que aparece, como a abertura já faz com o título do painel (FIXCOL-08, AC 2;
 * nota da T8 em `tasks.md`).
 */
describe("o foco ao trocar de modo (FIXCOL-08)", () => {
  it.each([
    ["Mudar valor", "Mudar o valor"],
    ["Encerrar", "Encerrar"],
    ["Editar", "Editar gasto fixo"],
  ] as const)('"%s" leva o foco ao título "%s"', async (acao, nome) => {
    const { usuario } = montar();

    await usuario.click(within(oPainel()).getByRole("button", { name: acao }));

    const tituloDoModo = within(oPainel()).getByRole("heading", { level: 3, name: nome });
    expect(document.activeElement).toBe(tituloDoModo);
    expect(tituloDoModo.getAttribute("tabindex")).toBe("-1");
  });

  it.each([
    ["Mudar valor", "Cancelar"],
    ["Encerrar", "Cancelar"],
    ["Editar", "Voltar"],
  ] as const)(
    '"%s" e depois "%s" levam o foco de volta ao título do painel',
    async (acao, volta) => {
      const { usuario } = montar();
      await usuario.click(within(oPainel()).getByRole("button", { name: acao }));

      await usuario.click(within(oPainel()).getByRole("button", { name: volta }));

      expect(noDetalhe()).toBe(true);
      expect(document.activeElement).toBe(titulo());
    },
  );

  it("registrar o valor novo volta ao detalhe com o foco no título do painel", async () => {
    const { usuario } = montar();
    await usuario.click(within(oPainel()).getByRole("button", { name: "Mudar valor" }));
    await usuario.type(within(oPainel()).getByLabelText("Novo valor (R$)"), "60,00");

    await usuario.click(within(oPainel()).getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(noDetalhe()).toBe(true));
    expect(document.activeElement).toBe(titulo());
  });
});

/**
 * O botão de envio se desabilita enquanto grava ("Gravando…"), e o Chrome
 * tira o foco dele para o `body`, com um `focusout` sem destino. Fora do
 * painel, o `Escape` deixaria de fechá-lo (FIXCOL-08, AC 3). O jsdom não
 * reproduz a troca de foco: o teste dispara o `focusout` que o navegador
 * dispara. A prova no navegador é a de `editar-fixo.spec.ts`.
 */
describe("o foco que o botão desabilitado perderia (FIXCOL-08, AC 3)", () => {
  it('salvar a edição, com o botão em "Gravando…", leva o foco ao título do painel', async () => {
    const editar = vi.fn(() => new Promise<never>(() => {}));
    const { usuario } = montar({ editar: editar as never });
    await usuario.click(within(oPainel()).getByRole("button", { name: "Editar" }));
    await usuario.click(within(oPainel()).getByRole("button", { name: "Salvar alterações" }));
    const gravando = within(oPainel()).getByRole("button", {
      name: "Gravando…",
    }) as HTMLButtonElement;
    expect(gravando.disabled).toBe(true);

    fireEvent.blur(gravando, { relatedTarget: null });

    expect(document.activeElement).toBe(titulo());
  });

  it("perder o foco para fora sem nada desabilitado, como clicar fora, não o traz de volta", async () => {
    const { usuario } = montar();
    await usuario.click(within(oPainel()).getByRole("button", { name: "Mudar valor" }));
    const campo = within(oPainel()).getByLabelText("Novo valor (R$)");
    campo.focus();

    campo.blur();

    expect(document.activeElement).toBe(document.body);
  });
});
