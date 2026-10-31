import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { renomearCategoria, trocarCorDaCategoria } from "@/app/actions/categorias";
import { ProvedorDeAvisos } from "./avisos";
import { DetalheDaCategoria } from "./detalhe-da-categoria";
import type { ItemDeCategoria } from "./tabela-de-categorias";

/**
 * Derivado de CADCOL-04 (ACs 2 a 4 e 6 a 12) e do Done-when da T12. Herda de
 * `lista-de-categorias.test.tsx` os testes 169 a 323 e 359 a 440 (design,
 * "Para onde vai cada teste"): as mesmas assertions, dentro do painel. O
 * campo "Nome" agora já vem aberto e continua aberto depois de salvar
 * (CADCOL-04, ACs 2 e 6). O "Cancelar" (344) vai para a T14.
 *
 * O painel grava ao escolher a cor, sem botão de salvar. O que se prende aqui
 * é o que a pessoa vê antes, durante e depois da gravação: a pill do título na
 * cor em uso, as onze opções, o pedido enviado, o aviso e a volta ao valor
 * anterior quando o servidor recusa.
 *
 * As cores automáticas: "Categoria Um" é ciano, "Categoria Dois" é rosa e
 * "Categoria Dez" é vermelho. Nomes genéricos (AD-009).
 */

const UM = "11111111-1111-4111-8111-111111111111";
const DOIS = "22222222-2222-4222-8222-222222222222";

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
    const { categoriaId, cor } = payload as { categoriaId: string; cor: string | null };
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
  categoria = CATEGORIA_UM,
  trocarCor = trocouCor(),
  renomear = renomeou(),
}: {
  readonly categoria?: ItemDeCategoria;
  readonly trocarCor?: ReturnType<typeof vi.fn>;
  readonly renomear?: ReturnType<typeof vi.fn>;
} = {}) {
  render(
    <ProvedorDeAvisos>
      <div data-testid="painel">
        <DetalheDaCategoria
          categoria={categoria}
          competencia="2026-03"
          rotuloDaCompetencia="Março de 2026"
          trocarCor={trocarCor as unknown as typeof trocarCorDaCategoria}
          renomear={renomear as unknown as typeof renomearCategoria}
        />
      </div>
    </ProvedorDeAvisos>,
  );
  return { trocarCor, renomear, usuario: userEvent.setup() };
}

function painel(): HTMLElement {
  return screen.getByTestId("painel");
}

/** A pill do título do painel. */
function pill(): HTMLElement {
  const elemento = within(painel()).getByRole("heading", { level: 2 }).firstElementChild;
  if (!(elemento instanceof HTMLElement)) {
    throw new Error("o título do painel não tem a pill da categoria");
  }
  return elemento;
}

function grupoDeCor(nome: string): HTMLElement {
  return within(painel()).getByRole("group", { name: `Cor de ${nome}` });
}

function radio(nomeDaCategoria: string, opcao: string): HTMLInputElement {
  return within(grupoDeCor(nomeDaCategoria)).getByRole<HTMLInputElement>("radio", { name: opcao });
}

function formulario(nome = "Categoria Um"): HTMLElement {
  return within(painel()).getByRole("form", { name: `Renomear ${nome}` });
}

function campoNome(): HTMLInputElement {
  return within(formulario()).getByRole<HTMLInputElement>("textbox", { name: "Nome" });
}

function salvar(): HTMLElement {
  return within(formulario()).getByRole("button", { name: "Salvar" });
}

describe("o título (CADCOL-04, AC 1)", () => {
  it("é um h2 com a pill da categoria, na cor em uso", () => {
    montar({ categoria: CATEGORIA_DOIS });

    expect(pill().textContent).toBe("Categoria Dois");
    expect(pill().className).toContain("bg-cat-verde-fundo text-cat-verde-texto");
  });
});

describe("renomear, sempre aberto (CADCOL-04, AC 2)", () => {
  it('o formulário "Renomear Categoria Um" tem o campo "Nome" com o nome gravado e "Salvar"', () => {
    montar();

    expect(campoNome().value).toBe("Categoria Um");
    expect(salvar()).toBeTruthy();
  });
});

describe("as onze opções de cor (CADCOL-04, AC 3)", () => {
  it("o grupo se chama Cor de <nome> e tem as dez cores e a Automática, com o nome escrito", () => {
    montar();

    const opcoes = within(grupoDeCor("Categoria Um"))
      .getAllByRole("radio")
      .map((opcao) => opcao.closest("label")?.textContent);
    expect(opcoes).toEqual([...NOMES_DAS_CORES, "Automática (Ciano)"]);
  });

  it("cada opção é a pill tingida da própria cor, com o nome por cima", () => {
    montar();

    expect(radio("Categoria Um", "Verde-água").closest("label")?.innerHTML).toContain(
      "bg-cat-verde-agua-fundo text-cat-verde-agua-texto",
    );
    expect(radio("Categoria Um", "Âmbar").closest("label")?.innerHTML).toContain(
      "bg-cat-ambar-fundo text-cat-ambar-texto",
    );
    expect(radio("Categoria Um", "Automática (Ciano)").closest("label")?.innerHTML).toContain(
      "bg-cat-ciano-fundo text-cat-ciano-texto",
    );
  });

  it("a cor escolhida vem marcada", () => {
    montar({ categoria: CATEGORIA_DOIS });

    const marcadas = within(grupoDeCor("Categoria Dois"))
      .getAllByRole<HTMLInputElement>("radio")
      .filter((opcao) => opcao.checked);
    expect(marcadas.map((opcao) => opcao.closest("label")?.textContent)).toEqual(["Verde"]);
  });

  it("sem cor escolhida, a Automática vem marcada, com a cor que ela dá", () => {
    montar();

    expect(radio("Categoria Um", "Automática (Ciano)").checked).toBe(true);
    expect(radio("Categoria Um", "Ciano").checked).toBe(false);
  });

  it("com cor escolhida, a Automática diz a cor do nome, e não a escolhida", () => {
    montar({ categoria: CATEGORIA_DOIS });

    expect(radio("Categoria Dois", "Automática (Rosa)").checked).toBe(false);
  });
});

describe("escolher uma cor grava sem outro clique (CADCOL-04, AC 4)", () => {
  it("manda a cor escolhida, uma vez, e avisa Cor trocada.", async () => {
    const { trocarCor, usuario } = montar();

    await usuario.click(radio("Categoria Um", "Roxo"));

    expect((await screen.findByRole("status")).textContent).toBe("Cor trocada.");
    expect(trocarCor).toHaveBeenCalledTimes(1);
    expect(trocarCor).toHaveBeenCalledWith({ categoriaId: UM, cor: "roxo" });
  });

  it("Automática manda null", async () => {
    const { trocarCor, usuario } = montar({ categoria: CATEGORIA_DOIS });

    await usuario.click(radio("Categoria Dois", "Automática (Rosa)"));

    await waitFor(() => {
      expect(trocarCor).toHaveBeenCalledTimes(1);
    });
    expect(trocarCor).toHaveBeenCalledWith({ categoriaId: DOIS, cor: null });
  });

  it("pinta a pill do título e marca a opção na hora, antes de o servidor responder", async () => {
    const { acao, liberar } = pendente();
    const { usuario } = montar({ trocarCor: acao });

    await usuario.click(radio("Categoria Um", "Roxo"));

    /* `finally`: a gravação pendente não pode segurar a transição dos testes
       seguintes, que o React 19 entrelaça. */
    try {
      await waitFor(() => {
        expect(pill().className).toContain("bg-cat-roxo-fundo text-cat-roxo-texto");
      });
      expect(radio("Categoria Um", "Roxo").checked).toBe(true);
      expect(screen.queryByRole("status")).toBeNull();
    } finally {
      liberar();
    }
  });

  it("Automática pinta a pill do título com a cor do nome na hora", async () => {
    const { acao, liberar } = pendente();
    const { usuario } = montar({ categoria: CATEGORIA_DOIS, trocarCor: acao });

    await usuario.click(radio("Categoria Dois", "Automática (Rosa)"));

    try {
      await waitFor(() => {
        expect(pill().className).toContain("bg-cat-rosa-fundo text-cat-rosa-texto");
      });
    } finally {
      liberar();
    }
  });
});

describe("a troca de cor recusada (CADCOL-04, AC 8)", () => {
  it("volta à cor anterior, diz o motivo no painel e não avisa", async () => {
    const { usuario } = montar({
      trocarCor: recusou({
        code: "ERRO_INESPERADO",
        mensagem: "Não foi possível concluir a operação. Tente de novo.",
      }),
    });

    await usuario.click(radio("Categoria Um", "Roxo"));

    expect((await within(painel()).findByRole("alert")).textContent).toBe(
      "Não foi possível concluir a operação. Tente de novo.",
    );
    await waitFor(() => {
      expect(pill().className).toContain("bg-cat-ciano-fundo");
    });
    expect(radio("Categoria Um", "Automática (Ciano)").checked).toBe(true);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("salvar o nome (CADCOL-04, AC 6)", () => {
  it("manda o nome novo, avisa Categoria renomeada. e o campo continua aberto, com ele", async () => {
    const { renomear, usuario } = montar();

    await usuario.clear(campoNome());
    await usuario.type(campoNome(), "Categoria Dez");
    await usuario.click(salvar());

    expect((await screen.findByRole("status")).textContent).toBe("Categoria renomeada.");
    expect(renomear).toHaveBeenCalledTimes(1);
    expect(renomear).toHaveBeenCalledWith({ categoriaId: UM, nome: "Categoria Dez" });
    expect(campoNome().value).toBe("Categoria Dez");
  });

  it("enquanto grava, a pill do título mostra o nome novo na cor de antes", async () => {
    const { acao, liberar } = pendente();
    const { usuario } = montar({ renomear: acao });

    await usuario.clear(campoNome());
    await usuario.type(campoNome(), "Categoria Dez{Enter}");

    try {
      await waitFor(() => {
        expect(pill().textContent).toBe("Categoria Dez");
      });
      /* "Categoria Dez" seria vermelho pela automática: a cor fica a de antes. */
      expect(pill().className).toContain("bg-cat-ciano-fundo text-cat-ciano-texto");
    } finally {
      liberar();
    }
  });
});

describe("renomear recusado (CADCOL-04, ACs 7 e 8)", () => {
  it("o nome de outra categoria volta o nome e diz o motivo junto do campo, sem avisar", async () => {
    const mensagem = "Já existe outra categoria com esse nome.";
    const { usuario } = montar({
      renomear: recusou({ code: "CATEGORIA_JA_EXISTE", mensagem, campos: { nome: mensagem } }),
    });
    const campo = campoNome();

    await usuario.clear(campo);
    await usuario.type(campo, "Categoria Dois{Enter}");

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(mensagem);
    await waitFor(() => {
      expect(pill().textContent).toBe("Categoria Um");
    });
    expect(campo.value).toBe("Categoria Dois");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(campo.getAttribute("aria-describedby")).toBe(within(formulario()).getByRole("alert").id);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("falha sem campo mostra a mensagem geral no formulário do painel", async () => {
    const { usuario } = montar({
      renomear: recusou({ code: "ERRO_INESPERADO", mensagem: "Não foi possível concluir." }),
    });

    await usuario.type(campoNome(), " Dez{Enter}");

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(
      "Não foi possível concluir.",
    );
  });

  it("nome vazio não chega ao servidor, e diz por quê", async () => {
    const { renomear, usuario } = montar();

    await usuario.clear(campoNome());
    await usuario.click(salvar());

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(
      "Informe o nome da categoria.",
    );
    expect(renomear).not.toHaveBeenCalled();
  });

  it("nome com 61 caracteres não chega ao servidor, e diz o limite", async () => {
    const { renomear, usuario } = montar();

    await usuario.clear(campoNome());
    await usuario.type(campoNome(), "a".repeat(61));
    await usuario.click(salvar());

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(
      "O nome pode ter no máximo 60 caracteres.",
    );
    expect(renomear).not.toHaveBeenCalled();
  });

  it("nome com 60 caracteres chega ao servidor", async () => {
    const { renomear, usuario } = montar();

    await usuario.clear(campoNome());
    await usuario.type(campoNome(), "a".repeat(60));
    await usuario.click(salvar());

    await waitFor(() => {
      expect(renomear).toHaveBeenCalledWith({ categoriaId: UM, nome: "a".repeat(60) });
    });
  });
});

describe("o nome igual ao gravado (CADCOL-04, ACs 9 e 10)", () => {
  it("não grava e não avisa, mesmo com espaço sobrando", async () => {
    const { renomear, usuario } = montar();

    await usuario.clear(campoNome());
    await usuario.type(campoNome(), "  Categoria   Um {Enter}");

    expect(renomear).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
    expect(within(formulario()).queryByRole("alert")).toBeNull();
  });

  it("mudar só a caixa é renomear: grava e avisa", async () => {
    const { renomear, usuario } = montar();

    await usuario.clear(campoNome());
    await usuario.type(campoNome(), "categoria um{Enter}");

    expect((await screen.findByRole("status")).textContent).toBe("Categoria renomeada.");
    expect(renomear).toHaveBeenCalledTimes(1);
    expect(renomear).toHaveBeenCalledWith({ categoriaId: UM, nome: "categoria um" });
  });

  it("se o servidor diz que nada mudou, não avisa", async () => {
    const { renomear, usuario } = montar({ renomear: renomeou(false) });

    await usuario.type(campoNome(), "x{Enter}");

    await waitFor(() => {
      expect(renomear).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("onde ela aparece (CADCOL-04, ACs 11 e 12)", () => {
  it("mostra as contagens da linha e leva a Lançamentos do mês filtrado pela categoria", () => {
    montar();

    const secao = within(painel()).getByRole("region", { name: "Onde ela aparece" });
    expect(
      within(secao).getByText("Fixos em Março de 2026", { selector: "dt" }).nextElementSibling
        ?.textContent,
    ).toBe("1");
    expect(
      within(secao).getByText("Lançamentos em Março de 2026", { selector: "dt" }).nextElementSibling
        ?.textContent,
    ).toBe("2");
    expect(
      within(secao).getByRole("link", { name: "Ver em Lançamentos" }).getAttribute("href"),
    ).toBe(`/2026-03/lancamentos?categoriaId=${UM}`);
  });
});
