import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { renomearCategoria, trocarCorDaCategoria } from "@/app/actions/categorias";
import type { CorDeCategoria } from "@/domain";
import { ProvedorDeAvisos } from "./avisos";
import { ListaDeCategorias } from "./lista-de-categorias";

/**
 * Testes derivados de COR-04 (ACs 2 a 8), do Edge Case da lista vazia e do
 * nome igual ao atual, e do Done-when de T10.
 *
 * A lista grava ao escolher, sem botão de salvar. O que se prende aqui é o que
 * a pessoa vê em cada linha antes, durante e depois da gravação: a pill na cor
 * em uso, as onze opções com o nome da cor escrito, o pedido enviado, o aviso,
 * e a volta ao valor anterior quando o servidor recusa. Toda consulta é
 * restrita à linha da categoria (L-018).
 *
 * As cores automáticas: "Categoria Um" é ciano, "Categoria Dois" é rosa e
 * "Categoria Dez" é vermelho. Nomes genéricos (AD-009).
 */

const UM = "11111111-1111-4111-8111-111111111111";
const DOIS = "22222222-2222-4222-8222-222222222222";

interface Item {
  readonly id: string;
  readonly nome: string;
  readonly cor: CorDeCategoria | null;
}

/* Fora de ordem alfabética de propósito: a lista mostra a ordem recebida,
   que a página já entrega em ordem alfabética. */
const CATEGORIAS: ReadonlyArray<Item> = [
  { id: DOIS, nome: "Categoria Dois", cor: "verde" },
  { id: UM, nome: "Categoria Um", cor: null },
];

const NOMES_DAS_CORES = [
  "Vermelho",
  "Laranja",
  "Âmbar",
  "Verde",
  "Verde-água",
  "Ciano",
  "Azul",
  "Roxo",
  "Rosa",
  "Marrom",
];

type Recusa = {
  ok: false;
  erro: { code: string; mensagem: string; campos?: Record<string, string> };
};

function trocouCor() {
  return vi.fn(async (payload: unknown) => {
    const { categoriaId, cor } = payload as { categoriaId: string; cor: CorDeCategoria | null };
    return { ok: true as const, data: { id: categoriaId, nome: "qualquer", cor } };
  });
}

function renomeou(renomeada = true) {
  return vi.fn(async (payload: unknown) => {
    const { categoriaId, nome } = payload as { categoriaId: string; nome: string };
    return { ok: true as const, data: { id: categoriaId, nome, cor: "ciano", renomeada } };
  });
}

function recusou(erro: Recusa["erro"]) {
  return vi.fn(async (): Promise<Recusa> => ({ ok: false, erro }));
}

/** Uma gravação que só termina quando o teste manda. */
function pendente() {
  let liberar: () => void = () => {};
  const acao = vi.fn(
    (payload: unknown) =>
      new Promise((resolve) => {
        liberar = () => resolve({ ok: true, data: { ...(payload as object), renomeada: true } });
      }),
  );
  return { acao, liberar: () => liberar() };
}

afterEach(cleanup);

function montar({
  categorias = CATEGORIAS,
  trocarCor = trocouCor(),
  renomear = renomeou(),
}: {
  readonly categorias?: ReadonlyArray<Item>;
  readonly trocarCor?: ReturnType<typeof vi.fn>;
  readonly renomear?: ReturnType<typeof vi.fn>;
} = {}) {
  render(
    <ProvedorDeAvisos>
      <ListaDeCategorias
        categorias={categorias}
        trocarCor={trocarCor as unknown as typeof trocarCorDaCategoria}
        renomear={renomear as unknown as typeof renomearCategoria}
      />
    </ProvedorDeAvisos>,
  );
  return { trocarCor, renomear, usuario: userEvent.setup() };
}

function linhas(): HTMLElement[] {
  return within(screen.getByRole("list", { name: "Categorias" })).getAllByRole("listitem");
}

/**
 * A linha de uma categoria, pela posição em que ela foi entregue. Pela
 * posição, e não pelo nome, porque o nome muda no meio dos testes de renomear.
 */
function linhaDe(id: string, categorias: ReadonlyArray<Item> = CATEGORIAS): HTMLElement {
  const linha = linhas()[categorias.findIndex((categoria) => categoria.id === id)];
  if (linha === undefined) {
    throw new Error(`linha da categoria ${id} não está na tela`);
  }
  return linha;
}

/** A pill do nome: o título da linha é a própria pill. */
function pill(linha: HTMLElement): HTMLElement {
  const elemento = within(linha).getByRole("heading").firstElementChild;
  if (!(elemento instanceof HTMLElement)) {
    throw new Error("o título da linha não tem a pill da categoria");
  }
  return elemento;
}

function grupoDeCor(linha: HTMLElement, nome: string): HTMLElement {
  return within(linha).getByRole("group", { name: `Cor de ${nome}` });
}

function radio(linha: HTMLElement, nomeDaLinha: string, opcao: string): HTMLInputElement {
  return within(grupoDeCor(linha, nomeDaLinha)).getByRole<HTMLInputElement>("radio", {
    name: opcao,
  });
}

describe("uma linha por categoria, com a pill na cor em uso (COR-04, AC 2)", () => {
  it("mostra as categorias na ordem recebida", () => {
    montar();

    expect(linhas().map((linha) => pill(linha).textContent)).toEqual([
      "Categoria Dois",
      "Categoria Um",
    ]);
  });

  it("a cor escolhida pinta a pill", () => {
    montar();

    expect(pill(linhaDe(DOIS)).className).toContain("bg-cat-verde-fundo text-cat-verde-texto");
  });

  it("sem cor escolhida, a pill tem a cor automática do nome", () => {
    montar();

    expect(pill(linhaDe(UM)).className).toContain("bg-cat-ciano-fundo text-cat-ciano-texto");
  });
});

describe("as onze opções de cor (COR-04, AC 3)", () => {
  it("o grupo se chama Cor de <nome> e tem as dez cores e a Automática, com o nome escrito", () => {
    montar();

    const opcoes = within(grupoDeCor(linhaDe(UM), "Categoria Um"))
      .getAllByRole("radio")
      .map((opcao) => opcao.closest("label")?.textContent);
    expect(opcoes).toEqual([...NOMES_DAS_CORES, "Automática (Ciano)"]);
  });

  it("cada opção é a pill tingida da própria cor, com o nome por cima", () => {
    montar();

    const linha = linhaDe(UM);
    expect(radio(linha, "Categoria Um", "Verde-água").closest("label")?.innerHTML).toContain(
      "bg-cat-verde-agua-fundo text-cat-verde-agua-texto",
    );
    expect(radio(linha, "Categoria Um", "Âmbar").closest("label")?.innerHTML).toContain(
      "bg-cat-ambar-fundo text-cat-ambar-texto",
    );
    expect(
      radio(linha, "Categoria Um", "Automática (Ciano)").closest("label")?.innerHTML,
    ).toContain("bg-cat-ciano-fundo text-cat-ciano-texto");
  });

  it("a cor escolhida vem marcada", () => {
    montar();

    const marcadas = within(grupoDeCor(linhaDe(DOIS), "Categoria Dois"))
      .getAllByRole<HTMLInputElement>("radio")
      .filter((opcao) => opcao.checked);
    expect(marcadas.map((opcao) => opcao.closest("label")?.textContent)).toEqual(["Verde"]);
  });

  it("sem cor escolhida, a Automática vem marcada, com a cor que ela dá", () => {
    montar();

    expect(radio(linhaDe(UM), "Categoria Um", "Automática (Ciano)").checked).toBe(true);
    expect(radio(linhaDe(UM), "Categoria Um", "Ciano").checked).toBe(false);
  });

  it("com cor escolhida, a Automática diz a cor do nome, e não a escolhida", () => {
    montar();

    expect(radio(linhaDe(DOIS), "Categoria Dois", "Automática (Rosa)").checked).toBe(false);
  });
});

describe("escolher uma cor grava sem outro clique (COR-04, ACs 4 e 5)", () => {
  it("manda a cor escolhida, uma vez, e avisa Cor trocada.", async () => {
    const { trocarCor, usuario } = montar();

    await usuario.click(radio(linhaDe(UM), "Categoria Um", "Roxo"));

    expect((await screen.findByRole("status")).textContent).toBe("Cor trocada.");
    expect(trocarCor).toHaveBeenCalledTimes(1);
    expect(trocarCor).toHaveBeenCalledWith({ categoriaId: UM, cor: "roxo" });
  });

  it("Automática manda null", async () => {
    const { trocarCor, usuario } = montar();

    await usuario.click(radio(linhaDe(DOIS), "Categoria Dois", "Automática (Rosa)"));

    await waitFor(() => {
      expect(trocarCor).toHaveBeenCalledTimes(1);
    });
    expect(trocarCor).toHaveBeenCalledWith({ categoriaId: DOIS, cor: null });
  });

  it("pinta a pill e marca a opção na hora, antes de o servidor responder", async () => {
    const { acao, liberar } = pendente();
    const { usuario } = montar({ trocarCor: acao });

    await usuario.click(radio(linhaDe(UM), "Categoria Um", "Roxo"));

    /* `finally`: a gravação pendente não pode segurar a transição dos testes
       seguintes, que o React 19 entrelaça. */
    try {
      await waitFor(() => {
        expect(pill(linhaDe(UM)).className).toContain("bg-cat-roxo-fundo text-cat-roxo-texto");
      });
      expect(radio(linhaDe(UM), "Categoria Um", "Roxo").checked).toBe(true);
      expect(screen.queryByRole("status")).toBeNull();
    } finally {
      liberar();
    }
  });

  it("Automática pinta a pill com a cor do nome na hora", async () => {
    const { acao, liberar } = pendente();
    const { usuario } = montar({ trocarCor: acao });

    await usuario.click(radio(linhaDe(DOIS), "Categoria Dois", "Automática (Rosa)"));

    try {
      await waitFor(() => {
        expect(pill(linhaDe(DOIS)).className).toContain("bg-cat-rosa-fundo text-cat-rosa-texto");
      });
    } finally {
      liberar();
    }
  });
});

describe("a troca de cor recusada (COR-04, AC 8)", () => {
  it("volta à cor anterior, diz o motivo na linha e não avisa", async () => {
    const { usuario } = montar({
      trocarCor: recusou({
        code: "ERRO_INESPERADO",
        mensagem: "Não foi possível concluir a operação. Tente de novo.",
      }),
    });

    await usuario.click(radio(linhaDe(UM), "Categoria Um", "Roxo"));

    expect((await within(linhaDe(UM)).findByRole("alert")).textContent).toBe(
      "Não foi possível concluir a operação. Tente de novo.",
    );
    await waitFor(() => {
      expect(pill(linhaDe(UM)).className).toContain("bg-cat-ciano-fundo");
    });
    expect(radio(linhaDe(UM), "Categoria Um", "Automática (Ciano)").checked).toBe(true);
    expect(within(linhaDe(DOIS)).queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("renomear (COR-04, AC 6)", () => {
  it("Renomear abre o campo com o nome atual", async () => {
    const { usuario } = montar();

    await usuario.click(within(linhaDe(UM)).getByRole("button", { name: "Renomear" }));

    expect(
      within(linhaDe(UM)).getByRole<HTMLInputElement>("textbox", { name: "Novo nome" }).value,
    ).toBe("Categoria Um");
  });

  it("salvar manda o nome novo, avisa Categoria renomeada. e fecha o campo", async () => {
    const { renomear, usuario } = montar();
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    const campo = within(linha).getByRole("textbox", { name: "Novo nome" });
    await usuario.clear(campo);
    await usuario.type(campo, "Categoria Dez");
    await usuario.click(within(linha).getByRole("button", { name: "Salvar" }));

    expect((await screen.findByRole("status")).textContent).toBe("Categoria renomeada.");
    expect(renomear).toHaveBeenCalledTimes(1);
    expect(renomear).toHaveBeenCalledWith({ categoriaId: UM, nome: "Categoria Dez" });
    expect(within(linhaDe(UM)).queryByRole("textbox", { name: "Novo nome" })).toBeNull();
  });

  it("enquanto grava, a pill mostra o nome novo na cor de antes", async () => {
    const { acao, liberar } = pendente();
    const { usuario } = montar({ renomear: acao });
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    const campo = within(linha).getByRole("textbox", { name: "Novo nome" });
    await usuario.clear(campo);
    await usuario.type(campo, "Categoria Dez{Enter}");

    try {
      await waitFor(() => {
        expect(pill(linhaDe(UM)).textContent).toBe("Categoria Dez");
      });
      /* "Categoria Dez" seria vermelho pela automática: a cor fica a de antes. */
      expect(pill(linhaDe(UM)).className).toContain("bg-cat-ciano-fundo text-cat-ciano-texto");
    } finally {
      liberar();
    }
  });

  it("Cancelar fecha o campo sem gravar", async () => {
    const { renomear, usuario } = montar();
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    await usuario.type(within(linha).getByRole("textbox", { name: "Novo nome" }), " mais");
    await usuario.click(within(linha).getByRole("button", { name: "Cancelar" }));

    expect(within(linha).queryByRole("textbox", { name: "Novo nome" })).toBeNull();
    expect(renomear).not.toHaveBeenCalled();
    expect(pill(linha).textContent).toBe("Categoria Um");
  });
});

describe("renomear recusado (COR-04, ACs 7 e 8)", () => {
  it("o nome de outra categoria volta o nome e diz o motivo junto do campo, sem avisar", async () => {
    const mensagem = "Já existe outra categoria com esse nome.";
    const { usuario } = montar({
      renomear: recusou({ code: "CATEGORIA_JA_EXISTE", mensagem, campos: { nome: mensagem } }),
    });
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    const campo = within(linha).getByRole<HTMLInputElement>("textbox", { name: "Novo nome" });
    await usuario.clear(campo);
    await usuario.type(campo, "Categoria Dois{Enter}");

    const formulario = within(linha).getByRole("form", { name: "Renomear Categoria Um" });
    expect((await within(formulario).findByRole("alert")).textContent).toBe(mensagem);
    await waitFor(() => {
      expect(pill(linhaDe(UM)).textContent).toBe("Categoria Um");
    });
    expect(campo.value).toBe("Categoria Dois");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(campo.getAttribute("aria-describedby")).toBe(within(formulario).getByRole("alert").id);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("falha sem campo mostra a mensagem geral na linha", async () => {
    const { usuario } = montar({
      renomear: recusou({ code: "ERRO_INESPERADO", mensagem: "Não foi possível concluir." }),
    });
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    await usuario.type(within(linha).getByRole("textbox", { name: "Novo nome" }), " Dez{Enter}");

    expect((await within(linha).findByRole("alert")).textContent).toBe(
      "Não foi possível concluir.",
    );
  });

  it("nome vazio não chega ao servidor, e diz por quê", async () => {
    const { renomear, usuario } = montar();
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    await usuario.clear(within(linha).getByRole("textbox", { name: "Novo nome" }));
    await usuario.click(within(linha).getByRole("button", { name: "Salvar" }));

    expect((await within(linha).findByRole("alert")).textContent).toBe(
      "Informe o nome da categoria.",
    );
    expect(renomear).not.toHaveBeenCalled();
  });
});

describe("o nome igual ao atual (Edge Case)", () => {
  it("fecha o campo sem gravar e sem avisar, mesmo com espaço sobrando", async () => {
    const { renomear, usuario } = montar();
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    const campo = within(linha).getByRole("textbox", { name: "Novo nome" });
    await usuario.clear(campo);
    await usuario.type(campo, "  Categoria   Um {Enter}");

    expect(within(linha).queryByRole("textbox", { name: "Novo nome" })).toBeNull();
    expect(renomear).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("mudar só a caixa é renomear: grava e avisa", async () => {
    const { renomear, usuario } = montar();
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    const campo = within(linha).getByRole("textbox", { name: "Novo nome" });
    await usuario.clear(campo);
    await usuario.type(campo, "categoria um{Enter}");

    expect((await screen.findByRole("status")).textContent).toBe("Categoria renomeada.");
    expect(renomear).toHaveBeenCalledTimes(1);
    expect(renomear).toHaveBeenCalledWith({ categoriaId: UM, nome: "categoria um" });
  });

  it("se o servidor diz que nada mudou, fecha o campo e não avisa", async () => {
    const { usuario } = montar({ renomear: renomeou(false) });
    const linha = linhaDe(UM);

    await usuario.click(within(linha).getByRole("button", { name: "Renomear" }));
    await usuario.type(within(linha).getByRole("textbox", { name: "Novo nome" }), "x{Enter}");

    await waitFor(() => {
      expect(within(linha).queryByRole("textbox", { name: "Novo nome" })).toBeNull();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("sem categoria nenhuma (Edge Case)", () => {
  it("diz que não há categorias e como criar uma, pelo formulário de lançamento", () => {
    montar({ categorias: [] });

    expect(screen.queryByRole("list", { name: "Categorias" })).toBeNull();
    expect(screen.getByText(/Nenhuma categoria ainda\./).textContent).toMatch(
      /formulário de lançamento/,
    );
  });
});
