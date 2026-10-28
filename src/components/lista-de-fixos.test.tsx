import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  editarRecorrencia,
  encerrarRecorrencia,
  registrarNovaVigencia,
} from "@/app/actions/recorrencias";
import { type ContextoDaEdicao, type ItemFixo, ListaDeFixos } from "./lista-de-fixos";

/**
 * Derivado de FIXO-03 e FIXO-06.
 *
 * O que estes testes protegem é a exigência da competência nos dois controles.
 * "Mudou o valor" e "cancelei" não significam nada sem o mês a partir do qual
 * valem, e um botão que assumisse "a partir de agora" acertaria quase sempre e
 * erraria em silêncio justamente quando a pessoa registra algo do passado.
 */

const registrarOk: typeof registrarNovaVigencia = vi.fn(async () => ({
  ok: true as const,
  data: null,
}));
const encerrarOk: typeof encerrarRecorrencia = vi.fn(async () => ({
  ok: true as const,
  data: null,
}));

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

/*
 * O jsdom não implementa `showModal`/`close` do `<dialog>`. Os dublês
 * reproduzem o contrato observável, o atributo `open` e o evento `close`, como
 * em `dialogo-de-cadastro.test.tsx`.
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

const UUID_CONTA = "22222222-2222-4222-8222-222222222222";
const UUID_CARTAO = "44444444-4444-4444-8444-444444444444";
const UUID_POUPANCA = "77777777-7777-4777-8777-777777777777";
const UUID_CAT = "33333333-3333-4333-8333-333333333333";
const UUID_U = "11111111-1111-4111-8111-111111111111";
const UUID_U2 = "66666666-6666-4666-8666-666666666666";

const editarOk: typeof editarRecorrencia = vi.fn(async () => ({
  ok: true as const,
  data: { mudou: true },
}));

const EDICAO: ContextoDaEdicao = {
  meios: [
    { id: UUID_CONTA, nome: "Conta Corrente", geraFatura: false },
    { id: UUID_CARTAO, nome: "Cartão Roxo", geraFatura: true },
    { id: UUID_POUPANCA, nome: "Conta Poupança", geraFatura: false },
  ],
  categorias: [{ id: UUID_CAT, nome: "Moradia" }],
  usuarios: [
    { id: UUID_U, nome: "Pessoa A" },
    { id: UUID_U2, nome: "Pessoa B" },
  ],
  editar: editarOk,
  criarCategoria: vi.fn(),
  criarMeioDePagamento: vi.fn(),
};

const ITEM: ItemFixo = {
  id: "rec-1",
  descricao: "Conta de luz",
  natureza: "DESPESA",
  valorVigente: "R$ 180,00",
  diaVencimento: 20,
  categoria: "Moradia",
  meio: "Conta Corrente",
  inicio: "Março de 2026",
  fim: null,
  encerrada: false,
  competenciaInicio: "2026-03",
  competenciaFim: null,
  meioPagamentoId: UUID_CONTA,
  categoriaId: UUID_CAT,
  usuarioId: UUID_U,
  valorNoMesCentavos: 18000,
};

function montar(
  itens: ReadonlyArray<ItemFixo> = [ITEM],
  acoes: {
    registrar?: typeof registrarNovaVigencia;
    encerrar?: typeof encerrarRecorrencia;
    editar?: typeof editarRecorrencia;
  } = {},
) {
  const utils = render(
    <ListaDeFixos
      competencia="2026-09"
      rotuloDaCompetencia="Setembro de 2026"
      itens={itens}
      registrarVigencia={acoes.registrar ?? registrarOk}
      encerrar={acoes.encerrar ?? encerrarOk}
      edicao={{ ...EDICAO, editar: acoes.editar ?? editarOk }}
    />,
  );
  return { ...utils, usuario: userEvent.setup() };
}

describe("lista de gastos fixos", () => {
  it("sem nenhum, explica o que fazer em vez de mostrar tabela vazia", () => {
    montar([]);

    expect(screen.getByText(/Nenhum gasto fixo cadastrado ainda/)).toBeTruthy();
  });

  it("mostra o valor vigente e o dia de vencimento", () => {
    montar();

    expect(screen.getByText("R$ 180,00")).toBeTruthy();
    expect(screen.getByText(/Vence dia 20/)).toBeTruthy();
  });

  it("competência anterior a toda vigência mostra travessão, não zero", () => {
    montar([{ ...ITEM, valorVigente: null }]);

    expect(screen.getByText("—")).toBeTruthy();
  });

  it("encerrada aparece marcada, e sem os controles", () => {
    montar([{ ...ITEM, encerrada: true }]);

    expect(screen.getByText("Encerrado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mudar valor" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Encerrar" })).toBeNull();
  });

  it("receita é distinguida por selo, não só por cor", () => {
    montar([{ ...ITEM, natureza: "RECEITA", descricao: "Salário" }]);

    expect(screen.getByText("Receita")).toBeTruthy();
  });
});

describe("mudar valor", () => {
  it("pede a competência, pré-preenchida com o mês aberto", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "Mudar valor" }));

    const campo = screen.getByLabelText("Vale a partir de") as HTMLInputElement;
    expect(campo.value).toBe("2026-09");
    expect(screen.getByText(/Setembro de 2026/)).toBeTruthy();
  });

  it("envia o valor em centavos e a competência escolhida", async () => {
    const registrar = vi.fn(async () => ({ ok: true as const, data: null }));
    const { usuario } = montar([ITEM], { registrar: registrar as never });

    await usuario.click(screen.getByRole("button", { name: "Mudar valor" }));
    await usuario.type(screen.getByLabelText("Novo valor (R$)"), "240,00");
    await usuario.clear(screen.getByLabelText("Vale a partir de"));
    await usuario.type(screen.getByLabelText("Vale a partir de"), "2026-10");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => {
      expect(registrar).toHaveBeenCalledWith({
        recorrenciaId: "rec-1",
        vigenteDesde: "2026-10",
        valorCentavos: 24000,
      });
    });
  });

  it("texto que não é valor reprova antes de sair do navegador", async () => {
    const registrar = vi.fn();
    const { usuario } = montar([ITEM], { registrar: registrar as never });

    await usuario.click(screen.getByRole("button", { name: "Mudar valor" }));
    await usuario.type(screen.getByLabelText("Novo valor (R$)"), "abc");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(registrar).not.toHaveBeenCalled();
  });

  it("cancelar fecha sem gravar", async () => {
    const registrar = vi.fn();
    const { usuario } = montar([ITEM], { registrar: registrar as never });

    await usuario.click(screen.getByRole("button", { name: "Mudar valor" }));
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Novo valor (R$)")).toBeNull();
    expect(registrar).not.toHaveBeenCalled();
  });
});

describe("encerrar", () => {
  it("avisa o que vai acontecer antes de confirmar", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "Encerrar" }));

    expect(screen.getByText(/ainda não pagas deste mês em diante somem/)).toBeTruthy();
    expect(screen.getByText(/As já pagas ficam/)).toBeTruthy();
  });

  it("exige a competência a partir da qual encerra", async () => {
    const encerrar = vi.fn(async () => ({ ok: true as const, data: null }));
    const { usuario } = montar([ITEM], { encerrar: encerrar as never });

    await usuario.click(screen.getByRole("button", { name: "Encerrar" }));
    await usuario.clear(screen.getByLabelText("Encerrar a partir de"));
    await usuario.type(screen.getByLabelText("Encerrar a partir de"), "2026-11");
    await usuario.click(screen.getByRole("button", { name: "Encerrar mesmo assim" }));

    await waitFor(() => {
      expect(encerrar).toHaveBeenCalledWith({ recorrenciaId: "rec-1", aPartirDe: "2026-11" });
    });
  });

  it("o botão de confirmação é diferente do que abriu, para não encerrar por inércia", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "Encerrar" }));

    expect(screen.getByRole("button", { name: "Encerrar mesmo assim" })).toBeTruthy();
  });

  it("erro do servidor aparece em alerta", async () => {
    const encerrar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "RECORRENCIA_NAO_ENCONTRADA", mensagem: "Esse gasto fixo não existe mais." },
    }));
    const { usuario } = montar([ITEM], { encerrar: encerrar as never });

    await usuario.click(screen.getByRole("button", { name: "Encerrar" }));
    await usuario.click(screen.getByRole("button", { name: "Encerrar mesmo assim" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("não existe mais"),
    );
  });

  it("cada linha abre o seu próprio controle, sem afetar as outras", async () => {
    const { usuario } = montar([ITEM, { ...ITEM, id: "rec-2", descricao: "Internet" }]);

    const linhaDaLuz = screen.getByText("Conta de luz").closest("li");
    await usuario.click(
      within(linhaDaLuz as HTMLElement).getByRole("button", { name: "Mudar valor" }),
    );

    const linhaDaInternet = screen.getByText("Internet").closest("li");
    expect(within(linhaDaInternet as HTMLElement).queryByLabelText("Novo valor (R$)")).toBeNull();
  });
});

/**
 * Derivado de EDF-01 AC 1 a 3 e EDF-06 AC 6.
 *
 * O fixo editável foge dos padrões do cadastro (segunda pessoa, terceiro meio,
 * dia 31, fim preenchido, valor com milhar): um campo que a lista deixasse de
 * passar ao formulário viria com o padrão e reprovaria no payload.
 */
describe("editar", () => {
  const UUID_REC = "55555555-5555-4555-8555-555555555555";
  const UUID_REC_2 = "88888888-8888-4888-8888-888888888888";

  const EDITAVEL: ItemFixo = {
    ...ITEM,
    id: UUID_REC,
    valorVigente: "R$ 1.234,56",
    valorNoMesCentavos: 123456,
    diaVencimento: 31,
    fim: "Dezembro de 2026",
    competenciaFim: "2026-12",
    meioPagamentoId: UUID_POUPANCA,
    usuarioId: UUID_U2,
  };
  const OUTRO: ItemFixo = { ...ITEM, id: UUID_REC_2, descricao: "Internet" };

  function linhaDe(descricao: string): HTMLElement {
    return screen.getByText(descricao).closest("li") as HTMLElement;
  }

  function dialogoAberto(): HTMLDialogElement {
    const dialogo = screen.getByRole("dialog") as HTMLDialogElement;
    expect(dialogo.open).toBe(true);
    return dialogo;
  }

  it('cada cartão mostra "Editar" ao lado de "Mudar valor" e "Encerrar" — AC 1', () => {
    montar([EDITAVEL, OUTRO]);

    for (const descricao of ["Conta de luz", "Internet"]) {
      const botoes = within(linhaDe(descricao)).getAllByRole("button");
      expect(botoes.map((botao) => botao.textContent)).toEqual([
        "Editar",
        "Mudar valor",
        "Encerrar",
      ]);
    }
  });

  it('um fixo encerrado continua com "Editar", que é por onde ele reabre — AC 1', () => {
    montar([{ ...EDITAVEL, encerrada: true }]);

    expect(within(linhaDe("Conta de luz")).getByRole("button", { name: "Editar" })).toBeTruthy();
  });

  it.each([
    ["DESPESA", "Editar gasto fixo"],
    ["RECEITA", "Editar entrada"],
  ] as const)(
    "abre o formulário num diálogo com o título de %s — AC 2",
    async (natureza, titulo) => {
      const { usuario } = montar([{ ...EDITAVEL, natureza }]);

      await usuario.click(screen.getByRole("button", { name: "Editar" }));

      const dialogo = dialogoAberto();
      expect(dialogo.getAttribute("aria-labelledby")).toBe(
        within(dialogo).getByRole("heading", { name: titulo }).id,
      );
      expect(within(dialogo).getByRole("form", { name: "Gasto fixo ou entrada" })).toBeTruthy();
    },
  );

  it("o formulário abre com o fixo do cartão e salva com os ids dele — AC 3", async () => {
    const editar = vi.fn(async () => ({ ok: true as const, data: { mudou: false } }));
    const { usuario } = montar([EDITAVEL, OUTRO], { editar: editar as never });

    await usuario.click(within(linhaDe("Conta de luz")).getByRole("button", { name: "Editar" }));
    const dialogo = dialogoAberto();
    expect((within(dialogo).getByLabelText("Começa em") as HTMLInputElement).value).toBe("2026-03");
    await usuario.click(within(dialogo).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(editar).toHaveBeenCalledWith({
        recorrenciaId: UUID_REC,
        descricao: "Conta de luz",
        valorCentavos: 123456,
        diaVencimento: 31,
        competenciaFim: "2026-12",
        categoriaId: UUID_CAT,
        usuarioId: UUID_U2,
        meioPagamentoId: UUID_POUPANCA,
        vigenteDesde: "2026-09",
        competenciaExibida: "2026-09",
      });
    });
  });

  it("salvar mostra a confirmação dentro do diálogo, sem fechá-lo — EDF-06 AC 6", async () => {
    const { usuario } = montar([EDITAVEL]);

    await usuario.click(screen.getByRole("button", { name: "Editar" }));
    const dialogo = dialogoAberto();
    await usuario.clear(within(dialogo).getByLabelText("Descrição"));
    await usuario.type(within(dialogo).getByLabelText("Descrição"), "Conta de energia");
    await usuario.click(within(dialogo).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(dialogo).findByRole("status")).toHaveProperty(
      "textContent",
      "Alterações salvas.",
    );
    expect(dialogo.open).toBe(true);
  });

  it("reabrir depois de fechar mostra o que está gravado, não o que ficou digitado — AC 3", async () => {
    const { usuario } = montar([EDITAVEL]);
    await usuario.click(screen.getByRole("button", { name: "Editar" }));
    await usuario.clear(within(dialogoAberto()).getByLabelText("Descrição"));
    await usuario.type(within(dialogoAberto()).getByLabelText("Descrição"), "Rascunho");

    await usuario.click(within(dialogoAberto()).getByRole("button", { name: "Fechar" }));
    await usuario.click(screen.getByRole("button", { name: "Editar" }));

    expect((within(dialogoAberto()).getByLabelText("Descrição") as HTMLInputElement).value).toBe(
      "Conta de luz",
    );
  });
});
