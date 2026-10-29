import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { trocarCategoria } from "@/app/actions/lancamentos";
import type { AlcanceDaTroca } from "@/domain";
import { ProvedorDeAvisos } from "./avisos";
import { SeletorDeCategoria } from "./seletor-de-categoria";

/**
 * Testes derivados de TRC-02 (ACs 1 a 5), TRC-04 (ACs 1 a 3), TRC-05 (AC 1) e
 * do Done-when de T7.
 *
 * O seletor grava ao escolher, sem botão de salvar. O que se prende aqui é o
 * que a pessoa vê antes, durante e depois da gravação: as opções, o pedido
 * enviado, o seletor travado enquanto grava, o alcance no toast e a volta à
 * categoria anterior quando o servidor recusa. Nomes genéricos (AD-009).
 */

const CATEGORIA_UM = "11111111-1111-4111-8111-111111111111";
const CATEGORIA_DOIS = "22222222-2222-4222-8222-222222222222";
const ARQUIVADA = "33333333-3333-4333-8333-333333333333";

/* Fora de ordem alfabética de propósito ("Um" depois de "Dois" no alfabeto):
   ordenar por nome inverteria as duas, e a ordem tem de ser a recebida. */
const CATEGORIAS = [
  { id: CATEGORIA_UM, nome: "Categoria Um" },
  { id: CATEGORIA_DOIS, nome: "Categoria Dois" },
];

type Acao = typeof trocarCategoria;

function gravou(alcance: AlcanceDaTroca) {
  return vi.fn(async (payload: unknown) => {
    const { lancamentoId, categoriaId } = payload as {
      lancamentoId: string;
      categoriaId: string | null;
    };
    return { ok: true as const, data: { lancamentoId, alcance, categoriaId } };
  });
}

function recusou(mensagem: string) {
  return vi.fn(async () => ({
    ok: false as const,
    erro: { code: "CATEGORIA_NAO_ENCONTRADA", mensagem },
  }));
}

afterEach(cleanup);

function montar({
  categoriaId = CATEGORIA_UM,
  nomeDaGravada,
  acao = gravou("LANCAMENTO"),
}: {
  readonly categoriaId?: string | null;
  readonly nomeDaGravada?: string;
  readonly acao?: ReturnType<typeof vi.fn>;
} = {}) {
  render(
    <ProvedorDeAvisos>
      <SeletorDeCategoria
        lancamentoId="lanc-1"
        descricao="Mercado"
        categoriaId={categoriaId}
        categorias={CATEGORIAS}
        nomeDaGravada={nomeDaGravada}
        trocarCategoria={acao as unknown as Acao}
      />
    </ProvedorDeAvisos>,
  );
  return { acao, usuario: userEvent.setup() };
}

function seletor(): HTMLSelectElement {
  return screen.getByRole<HTMLSelectElement>("combobox", { name: "Categoria de Mercado" });
}

function opcoes(): ReadonlyArray<string | null> {
  return within(seletor())
    .getAllByRole("option")
    .map((opcao) => opcao.textContent);
}

function selecionada(): string | null | undefined {
  return seletor().selectedOptions[0]?.textContent;
}

describe("as opções do seletor (TRC-02, ACs 1 e 5)", () => {
  it("o nome acessível é Categoria de <descrição>", () => {
    montar();

    expect(screen.getByRole("combobox", { name: "Categoria de Mercado" })).toBeTruthy();
  });

  it("Sem categoria primeiro, depois as categorias na ordem recebida", () => {
    montar();

    expect(opcoes()).toEqual(["Sem categoria", "Categoria Um", "Categoria Dois"]);
  });

  it("a categoria gravada aparece selecionada", () => {
    montar({ categoriaId: CATEGORIA_UM });

    expect(seletor().value).toBe(CATEGORIA_UM);
    expect(selecionada()).toBe("Categoria Um");
  });

  it("sem categoria gravada, Sem categoria aparece selecionada", () => {
    montar({ categoriaId: null });

    expect(seletor().value).toBe("");
    expect(selecionada()).toBe("Sem categoria");
  });
});

describe("categoria gravada fora da lista (TRC-02, AC 3)", () => {
  it("vira uma opção a mais, selecionada, com o nome recebido", () => {
    montar({ categoriaId: ARQUIVADA, nomeDaGravada: "Categoria Arquivada" });

    expect(opcoes()).toEqual([
      "Sem categoria",
      "Categoria Um",
      "Categoria Dois",
      "Categoria Arquivada",
    ]);
    expect(seletor().value).toBe(ARQUIVADA);
    expect(selecionada()).toBe("Categoria Arquivada");
  });

  it("sem nome conhecido, a opção a mais diz Categoria removida", () => {
    montar({ categoriaId: ARQUIVADA });

    expect(opcoes()).toEqual([
      "Sem categoria",
      "Categoria Um",
      "Categoria Dois",
      "Categoria removida",
    ]);
    expect(selecionada()).toBe("Categoria removida");
  });

  it("a gravada que está na lista não ganha opção a mais, mesmo com nome recebido", () => {
    montar({ categoriaId: CATEGORIA_UM, nomeDaGravada: "Categoria Um" });

    expect(opcoes()).toEqual(["Sem categoria", "Categoria Um", "Categoria Dois"]);
  });
});

describe("escolher grava sem outro clique (TRC-02, AC 2)", () => {
  it("escolher uma categoria chama a action uma vez com o lançamento e a categoria", async () => {
    const { acao, usuario } = montar({ categoriaId: CATEGORIA_UM });

    await usuario.selectOptions(seletor(), "Categoria Dois");

    await waitFor(() => {
      expect(acao).toHaveBeenCalledTimes(1);
    });
    expect(acao).toHaveBeenCalledWith({ lancamentoId: "lanc-1", categoriaId: CATEGORIA_DOIS });
  });

  it("escolher Sem categoria manda null", async () => {
    const { acao, usuario } = montar({ categoriaId: CATEGORIA_UM });

    await usuario.selectOptions(seletor(), "Sem categoria");

    await waitFor(() => {
      expect(acao).toHaveBeenCalledTimes(1);
    });
    expect(acao).toHaveBeenCalledWith({ lancamentoId: "lanc-1", categoriaId: null });
  });
});

describe("enquanto grava (TRC-02, AC 4)", () => {
  it("o seletor fica desabilitado durante a gravação, e só durante ela", async () => {
    let liberar: () => void = () => {};
    const acao = vi.fn(
      () =>
        new Promise((resolve) => {
          liberar = () =>
            resolve({
              ok: true,
              data: { lancamentoId: "lanc-1", alcance: "LANCAMENTO", categoriaId: CATEGORIA_DOIS },
            });
        }),
    );
    const { usuario } = montar({ acao });
    expect(seletor().disabled).toBe(false);

    await usuario.selectOptions(seletor(), "Categoria Dois");

    /*
     * `finally`, porque o React 19 entrelaça as transições assíncronas
     * pendentes: uma gravação que nunca termina, deixada por esta assertion
     * falhando, seguraria a transição dos testes seguintes e os derrubaria
     * junto, escondendo qual critério quebrou.
     */
    try {
      await waitFor(() => {
        expect(seletor().disabled).toBe(true);
      });
    } finally {
      liberar();
    }

    await waitFor(() => {
      expect(seletor().disabled).toBe(false);
    });
  });
});

describe("o toast diz até onde a troca foi (TRC-04, ACs 1 a 3)", () => {
  const casos: ReadonlyArray<{ alcance: AlcanceDaTroca; texto: string; ac: string }> = [
    { alcance: "FIXO", texto: "Categoria trocada em todos os meses deste fixo.", ac: "AC 1" },
    {
      alcance: "COMPRA",
      texto: "Categoria trocada em todas as parcelas desta compra.",
      ac: "AC 2",
    },
    { alcance: "LANCAMENTO", texto: "Categoria trocada.", ac: "AC 3" },
  ];

  for (const caso of casos) {
    it(`troca com alcance ${caso.alcance} avisa "${caso.texto}" (${caso.ac})`, async () => {
      const { usuario } = montar({ acao: gravou(caso.alcance) });

      await usuario.selectOptions(seletor(), "Categoria Dois");

      expect((await screen.findByRole("status")).textContent).toBe(caso.texto);
    });
  }
});

describe("o servidor recusa (TRC-05, AC 1)", () => {
  it("volta à categoria anterior, diz o motivo na linha e não avisa", async () => {
    const { acao, usuario } = montar({
      categoriaId: CATEGORIA_UM,
      acao: recusou("Escolha uma categoria válida."),
    });

    await usuario.selectOptions(seletor(), "Categoria Dois");

    expect((await screen.findByRole("alert")).textContent).toBe("Escolha uma categoria válida.");
    expect(acao).toHaveBeenCalledTimes(1);
    /* A mensagem é atualização comum e pode chegar antes do fim da transição,
       que é quando o valor otimista volta: a volta é esperada, não lida já. */
    await waitFor(() => {
      expect(seletor().value).toBe(CATEGORIA_UM);
    });
    expect(selecionada()).toBe("Categoria Um");
    expect(seletor().disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

/**
 * Testes derivados de LST-05 (ACs 4 e 5) e do Done-when de T6. O seletor era
 * tão largo quanto a opção mais longa, e era ele que empurrava a tabela do
 * Cartão para fora da margem. Agora tem largura fixa no computador, corta o
 * nome com reticências e guarda o nome inteiro no `title`.
 */
describe("o seletor dentro da margem (LST-05)", () => {
  const LONGA = "44444444-4444-4444-8444-444444444444";
  const NOME_LONGO = "Categoria de nome comprido que não cabe na coluna";

  function classes(): ReadonlyArray<string> {
    return seletor().className.split(" ");
  }

  it("o title tem o nome inteiro da categoria escolhida (AC 5)", () => {
    montar({ categoriaId: LONGA, nomeDaGravada: NOME_LONGO });

    expect(seletor().title).toBe(NOME_LONGO);
  });

  it("o title diz Sem categoria quando não há categoria, e a da lista quando há (AC 5)", () => {
    montar({ categoriaId: null });
    expect(seletor().title).toBe("Sem categoria");
    cleanup();

    montar({ categoriaId: CATEGORIA_UM });
    expect(seletor().title).toBe("Categoria Um");
  });

  it("o title acompanha a escolha enquanto ela grava, e não só a categoria recebida (AC 5)", async () => {
    const nuncaResponde = vi.fn(() => new Promise(() => {}));
    const { usuario } = montar({ categoriaId: CATEGORIA_UM, acao: nuncaResponde });

    await usuario.selectOptions(seletor(), "Categoria Dois");

    expect(seletor().title).toBe("Categoria Dois");
  });

  it("tem largura fixa a partir de md e corta o nome longo com reticências (AC 5)", () => {
    montar();

    expect(classes()).toEqual(expect.arrayContaining(["md:w-44", "truncate"]));
  });

  it("abaixo de md acompanha a largura do cartão, e o nome longo não alarga a tabela (UI-03)", () => {
    montar({ categoriaId: LONGA, nomeDaGravada: NOME_LONGO });

    /* Sem largura própria, o select mede a opção mais longa, e em 400 px essa
       medida passava a tabela da tela. A medição é do e2e; aqui, a regra. */
    expect(classes()).toEqual(expect.arrayContaining(["w-full", "max-w-full", "md:w-44"]));
  });

  it("tem 36 px de altura sob ponteiro fino e 44 px no toque (AC 4)", () => {
    montar();

    expect(classes()).toEqual(expect.arrayContaining(["min-h-11", "pointer-fine:min-h-9"]));
  });
});
