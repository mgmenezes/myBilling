import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarCategoria } from "@/app/actions/categorias";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import type { criarRecorrencia, editarRecorrencia } from "@/app/actions/recorrencias";
import { type FixoEmEdicao, FormRecorrencia } from "./form-recorrencia";

/**
 * Derivado de FIXO-01.
 *
 * O que estes testes protegem, além da validação, é o **texto que explica o
 * valor**. Quem digita 180 numa conta de luz precisa saber que está informando
 * uma previsão, não mentindo ao app — senão evita cadastrar por achar que vai
 * registrar um número errado todo mês.
 */

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const UUID_M = "22222222-2222-4222-8222-222222222222";
const UUID_U = "11111111-1111-4111-8111-111111111111";
const UUID_CARTAO = "44444444-4444-4444-8444-444444444444";

const criarOk: typeof criarRecorrencia = vi.fn(async () => ({
  ok: true as const,
  data: { id: "rec-1", descricao: "Conta de luz" },
}));
const categoriaOk: typeof criarCategoria = vi.fn(async () => ({
  ok: true as const,
  data: { id: "cat-1", nome: "Moradia", jaExistia: false, reativada: false },
}));
const meioOk: typeof criarMeioDePagamento = vi.fn(async () => ({
  ok: true as const,
  data: { id: "m2", nome: "Conta Nova", geraFatura: false },
}));

afterEach(() => {
  cleanup();
  refresh.mockReset();
});

function montar(criar: typeof criarRecorrencia = criarOk) {
  const utils = render(
    <FormRecorrencia
      competencia="2026-09"
      meios={[
        { id: UUID_M, nome: "Conta Corrente", geraFatura: false },
        { id: UUID_CARTAO, nome: "Cartão Azul", geraFatura: true },
      ]}
      categorias={[{ id: "33333333-3333-4333-8333-333333333333", nome: "Moradia" }]}
      usuarios={[{ id: UUID_U, nome: "Pessoa A" }]}
      criar={criar}
      criarCategoria={categoriaOk}
      criarMeioDePagamento={meioOk}
    />,
  );
  return { ...utils, usuario: userEvent.setup() };
}

describe("formulário de gasto fixo", () => {
  it("oferece despesa e receita", () => {
    montar();

    expect(screen.getByLabelText("Uma conta a pagar")).toBeTruthy();
    expect(screen.getByLabelText("Um dinheiro que entra")).toBeTruthy();
  });

  it("explica que o valor é previsão, não valor final", () => {
    montar();

    expect(screen.getByText(/É a previsão/)).toBeTruthy();
    expect(screen.getByText(/confirma o valor real na lista do mês/)).toBeTruthy();
  });

  it("começa no mês aberto e o fim vem vazio", () => {
    montar();

    expect((screen.getByLabelText("Começa em") as HTMLInputElement).value).toBe("2026-09");
    expect((screen.getByLabelText("Termina em (opcional)") as HTMLInputElement).value).toBe("");
  });

  it("descrição vazia reprova antes de sair do navegador", async () => {
    const criar = vi.fn();
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(criar).not.toHaveBeenCalled();
  });

  it("valor que não é número reprova com mensagem de valor", async () => {
    const criar = vi.fn();
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "abc");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("maior que zero"),
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("dia de vencimento fora de 1 a 31 reprova", async () => {
    const criar = vi.fn();
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.clear(screen.getByLabelText("Dia de vencimento"));
    await usuario.type(screen.getByLabelText("Dia de vencimento"), "45");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("1 a 31"),
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("envia o payload completo e confirma", async () => {
    const criar = vi.fn(async () => ({
      ok: true as const,
      data: { id: "rec-1", descricao: "Conta de luz" },
    }));
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    await waitFor(() => {
      expect(criar).toHaveBeenCalledWith(
        expect.objectContaining({
          descricao: "Conta de luz",
          natureza: "DESPESA",
          valorCentavos: 18000,
          diaVencimento: 10,
          competenciaInicio: "2026-09",
          competenciaFim: null,
        }),
      );
    });
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      expect.stringContaining("passa a aparecer em todo mês"),
    );
  });

  it("depois de cadastrar, limpa a descrição para o próximo", async () => {
    const { usuario } = montar();

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    await waitFor(() => {
      expect((screen.getByLabelText("Descrição") as HTMLInputElement).value).toBe("");
    });
  });

  it("erro do servidor endereçado a campo aparece nele", async () => {
    const criar = vi.fn(async () => ({
      ok: false as const,
      erro: {
        code: "PERIODO_INVALIDO",
        mensagem: "O mês de fim não pode ser anterior ao de início.",
        campos: { competenciaFim: "O mês de fim não pode ser anterior ao de início." },
      },
    }));
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("não pode ser anterior"),
    );
  });

  it("dá para cadastrar categoria sem sair do formulário", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));

    expect(screen.getByLabelText("Nome da nova categoria")).toBeTruthy();
  });

  it("dá para cadastrar meio de pagamento sem sair do formulário", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "+ novo" }));

    expect(screen.getByLabelText("Nome do novo meio de pagamento")).toBeTruthy();
  });
});

/**
 * O que a tela mostrava antes: título "Novo gasto fixo", botão "Cadastrar gasto
 * fixo", campo "Meio de pagamento" com "Cartão Azul" selecionado e "Dia de
 * vencimento" — tudo isso com "Um dinheiro que entra" marcado. O formulário
 * contradizia a escolha de quem o preenchia.
 */
describe("FormRecorrencia — a língua da receita (ENTR-03)", () => {
  async function marcarReceita(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.click(screen.getByRole("radio", { name: "Um dinheiro que entra" }));
  }

  /*
   * O título dinâmico saiu com o T29: quem envolve o formulário já titula,
   * hoje o painel do fixo (AD-021), e dois títulos anunciariam duas vezes. O
   * sinal de qual dos dois é ficou no rádio e no botão de envio.
   */
  it("troca o botão de envio para entrada — AC 3", async () => {
    const usuario = userEvent.setup();
    montar();

    expect(screen.getByRole("button", { name: "Cadastrar gasto fixo" })).toBeTruthy();

    await marcarReceita(usuario);

    expect(screen.getByRole("button", { name: "Cadastrar entrada" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cadastrar gasto fixo" })).toBeNull();
  });

  it("não tem título próprio: quem titula é o painel que o envolve", () => {
    montar();

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("form", { name: "Gasto fixo ou entrada" })).toBeTruthy();
  });

  it('chama o campo de "Onde o dinheiro cai" — AC 1', async () => {
    const usuario = userEvent.setup();
    montar();

    expect(screen.getByLabelText("Meio de pagamento")).toBeTruthy();

    await marcarReceita(usuario);

    expect(screen.getByLabelText("Onde o dinheiro cai")).toBeTruthy();
    expect(screen.queryByLabelText("Meio de pagamento")).toBeNull();
  });

  it("não oferece cartão de crédito como destino de receita — AC 2", async () => {
    const usuario = userEvent.setup();
    montar();

    expect(screen.getByRole("option", { name: "Cartão Azul" })).toBeTruthy();

    await marcarReceita(usuario);

    expect(screen.queryByRole("option", { name: "Cartão Azul" })).toBeNull();
    expect(screen.getByRole("option", { name: "Conta Corrente" })).toBeTruthy();
  });

  it("chama o dia de o dia em que o dinheiro costuma cair — AC 4", async () => {
    const usuario = userEvent.setup();
    montar();

    expect(screen.getByLabelText("Dia de vencimento")).toBeTruthy();

    await marcarReceita(usuario);

    expect(screen.getByLabelText("Dia que costuma cair")).toBeTruthy();
  });

  /* Filtrar a exibição não bastaria: a seleção continuaria no cartão. */
  it("tira a seleção do cartão ao marcar receita — AC 5", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.selectOptions(screen.getByLabelText("Meio de pagamento"), UUID_CARTAO);

    await marcarReceita(usuario);

    expect((screen.getByLabelText("Onde o dinheiro cai") as HTMLSelectElement).value).toBe(UUID_M);
  });

  it("devolve tudo ao estado de despesa quando a pessoa volta atrás — AC 6", async () => {
    const usuario = userEvent.setup();
    montar();
    await marcarReceita(usuario);

    await usuario.click(screen.getByRole("radio", { name: "Uma conta a pagar" }));

    expect(screen.getByRole("button", { name: "Cadastrar gasto fixo" })).toBeTruthy();
    expect(screen.getByLabelText("Meio de pagamento")).toBeTruthy();
    expect(screen.getByLabelText("Dia de vencimento")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Cartão Azul" })).toBeTruthy();
  });
});

/**
 * Derivado de EDF-01, EDF-03 e EDF-05: o mesmo formulário, aberto com o que
 * está gravado.
 *
 * O fixo de teste foge de todo valor padrão do cadastro — segunda pessoa,
 * terceiro meio, dia 31, fim preenchido —, para que um campo que viesse com o
 * padrão em vez do gravado reprove. O valor tem milhar, porque é o formato que
 * a comparação com o vigente mais facilmente erraria.
 */
describe("FormRecorrencia — em edição", () => {
  const UUID_REC = "55555555-5555-4555-8555-555555555555";
  const UUID_CAT = "33333333-3333-4333-8333-333333333333";
  const UUID_U2 = "66666666-6666-4666-8666-666666666666";
  const UUID_POUPANCA = "77777777-7777-4777-8777-777777777777";
  const TRAVADO = "Para mudar, encerre este e cadastre de novo.";

  const FIXO: FixoEmEdicao = {
    recorrenciaId: UUID_REC,
    descricao: "Conta de luz",
    natureza: "DESPESA",
    valorCentavos: 123456,
    diaVencimento: 31,
    competenciaInicio: "2026-03",
    competenciaFim: "2026-12",
    meioPagamentoId: UUID_POUPANCA,
    categoriaId: UUID_CAT,
    usuarioId: UUID_U2,
  };

  const salvou: typeof editarRecorrencia = vi.fn(async () => ({
    ok: true as const,
    data: { mudou: true },
  }));

  function montarEdicao(fixo: FixoEmEdicao = FIXO, editar: typeof editarRecorrencia = salvou) {
    render(
      <FormRecorrencia
        competencia="2026-09"
        meios={[
          { id: UUID_M, nome: "Conta Corrente", geraFatura: false },
          { id: UUID_CARTAO, nome: "Cartão Azul", geraFatura: true },
          { id: UUID_POUPANCA, nome: "Conta Poupança", geraFatura: false },
        ]}
        categorias={[{ id: UUID_CAT, nome: "Moradia" }]}
        usuarios={[
          { id: UUID_U, nome: "Pessoa A" },
          { id: UUID_U2, nome: "Pessoa B" },
        ]}
        edicao={{ fixo, editar }}
        criarCategoria={categoriaOk}
        criarMeioDePagamento={meioOk}
      />,
    );
    return userEvent.setup();
  }

  function valorDe(rotulo: string | RegExp): string {
    return (screen.getByLabelText(rotulo) as HTMLInputElement | HTMLSelectElement).value;
  }

  /** O texto dos elementos que `aria-describedby` aponta. */
  function descricaoAcessivel(elemento: HTMLElement): string {
    return (elemento.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
  }

  const PAYLOAD_SEM_MUDANCA = {
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
  };

  it("vem com os nove campos preenchidos com o que está gravado — EDF-01 AC 3", () => {
    montarEdicao();

    expect(valorDe("Descrição")).toBe("Conta de luz");
    expect(
      (screen.getByRole("radio", { name: "Uma conta a pagar" }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(valorDe(/De quanto costuma ser/)).toBe("1.234,56");
    expect(valorDe("Dia de vencimento")).toBe("31");
    expect(valorDe("Começa em")).toBe("2026-03");
    expect(valorDe("Termina em (opcional)")).toBe("2026-12");
    expect(valorDe("Meio de pagamento")).toBe(UUID_POUPANCA);
    expect(valorDe("Categoria")).toBe(UUID_CAT);
    expect(valorDe("De quem é")).toBe(UUID_U2);
  });

  it('o botão diz "Salvar alterações" — EDF-01 AC 4', () => {
    montarEdicao();

    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cadastrar gasto fixo" })).toBeNull();
  });

  it('"O que é" e "Começa em" vêm travados, com o motivo ao lado — EDF-05 AC 1', () => {
    montarEdicao();

    for (const rotulo of ["Uma conta a pagar", "Um dinheiro que entra"]) {
      expect((screen.getByRole("radio", { name: rotulo }) as HTMLInputElement).disabled).toBe(true);
    }
    expect((screen.getByLabelText("Começa em") as HTMLInputElement).disabled).toBe(true);
    expect(descricaoAcessivel(screen.getByRole("group", { name: "O que é" }))).toBe(TRAVADO);
    expect(descricaoAcessivel(screen.getByLabelText("Começa em"))).toBe(TRAVADO);
  });

  it('"Vale a partir de" só aparece quando o valor difere do vigente, com o mês exibido — EDF-03 AC 1', async () => {
    const usuario = montarEdicao();
    expect(screen.queryByLabelText("Vale a partir de")).toBeNull();

    await usuario.clear(screen.getByLabelText(/De quanto costuma ser/));
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "1.300,00");

    expect(valorDe("Vale a partir de")).toBe("2026-09");

    /* O mesmo número escrito de outro jeito não é valor novo. */
    await usuario.clear(screen.getByLabelText(/De quanto costuma ser/));
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "1234,56");

    expect(screen.queryByLabelText("Vale a partir de")).toBeNull();
  });

  it("salvar sem mexer envia só os campos editáveis, com o valor vigente — EDF-05 AC 2, EDF-03 AC 3", async () => {
    const editar = vi.fn(async () => ({ ok: true as const, data: { mudou: false } }));
    const usuario = montarEdicao(FIXO, editar as never);

    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(editar).toHaveBeenCalledWith(PAYLOAD_SEM_MUDANCA);
    });
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Nada mudou: já estava tudo assim.",
    );
  });

  it("salvar uma mudança confirma no formulário e mantém os campos — EDF-06 AC 6", async () => {
    const usuario = montarEdicao();

    await usuario.clear(screen.getByLabelText("Descrição"));
    await usuario.type(screen.getByLabelText("Descrição"), "Conta de energia");
    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("status")).toHaveProperty("textContent", "Alterações salvas.");
    expect(salvou).toHaveBeenLastCalledWith({
      ...PAYLOAD_SEM_MUDANCA,
      descricao: "Conta de energia",
    });
    expect(valorDe("Descrição")).toBe("Conta de energia");
    expect(refresh).toHaveBeenCalled();
  });

  it('valor novo vai com o mês escolhido em "Vale a partir de" — EDF-03 AC 2', async () => {
    const editar = vi.fn(async () => ({ ok: true as const, data: { mudou: true } }));
    const usuario = montarEdicao(FIXO, editar as never);

    await usuario.clear(screen.getByLabelText(/De quanto costuma ser/));
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "1.300,00");
    await usuario.clear(screen.getByLabelText("Vale a partir de"));
    await usuario.type(screen.getByLabelText("Vale a partir de"), "2026-11");
    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(editar).toHaveBeenCalledWith({
        ...PAYLOAD_SEM_MUDANCA,
        valorCentavos: 130000,
        vigenteDesde: "2026-11",
      });
    });
  });

  it('esvaziar "Termina em" envia o fim nulo, que reabre — EDF-04 AC 2', async () => {
    const editar = vi.fn(async () => ({ ok: true as const, data: { mudou: true } }));
    const usuario = montarEdicao(FIXO, editar as never);

    await usuario.clear(screen.getByLabelText("Termina em (opcional)"));
    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(editar).toHaveBeenCalledWith({ ...PAYLOAD_SEM_MUDANCA, competenciaFim: null });
    });
  });

  it("descrição vazia reprova antes de sair do navegador, como no cadastro — EDF-05 AC 3", async () => {
    const editar = vi.fn();
    const usuario = montarEdicao(FIXO, editar as never);

    await usuario.clear(screen.getByLabelText("Descrição"));
    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Descreva o gasto fixo"),
    );
    expect(editar).not.toHaveBeenCalled();
  });

  it('a recusa da vigência antes do início aparece em "Vale a partir de" — EDF-03 AC 5', async () => {
    const mensagem = "O valor novo não pode valer antes do mês de início.";
    const editar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "PERIODO_INVALIDO", mensagem, campos: { vigenteDesde: mensagem } },
    }));
    const usuario = montarEdicao(FIXO, editar as never);

    await usuario.clear(screen.getByLabelText(/De quanto costuma ser/));
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "1.300,00");
    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", mensagem);
    expect(screen.getByLabelText("Vale a partir de").getAttribute("aria-invalid")).toBe("true");
  });

  it.each([
    [
      "MEIO_PAGAMENTO_NAO_ENCONTRADO",
      "meioPagamentoId",
      "Meio de pagamento",
      "Escolha um meio de pagamento válido.",
    ],
    ["CATEGORIA_NAO_ENCONTRADA", "categoriaId", "Categoria", "Escolha uma categoria válida."],
  ])("a recusa %s aparece no campo dela — EDF-05 AC 3", async (code, campo, rotulo, mensagem) => {
    const editar = vi.fn(async () => ({
      ok: false as const,
      erro: { code, mensagem, campos: { [campo]: mensagem } },
    }));
    const usuario = montarEdicao(FIXO, editar as never);

    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", mensagem);
    expect(screen.getByLabelText(rotulo).getAttribute("aria-invalid")).toBe("true");
  });

  it("uma entrada abre com o vocabulário de receita — EDF-01 AC 5", () => {
    montarEdicao({ ...FIXO, natureza: "RECEITA", descricao: "Salário" });

    expect(
      (screen.getByRole("radio", { name: "Um dinheiro que entra" }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(valorDe("Onde o dinheiro cai")).toBe(UUID_POUPANCA);
    expect(screen.getByLabelText("Dia que costuma cair")).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Cartão Azul" })).toBeNull();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeTruthy();
  });
});
