import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { encerrarRecorrencia, registrarNovaVigencia } from "@/app/actions/recorrencias";
import { type ItemFixo, ListaDeFixos } from "./lista-de-fixos";

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

afterEach(cleanup);

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
};

function montar(
  itens: ReadonlyArray<ItemFixo> = [ITEM],
  acoes: { registrar?: typeof registrarNovaVigencia; encerrar?: typeof encerrarRecorrencia } = {},
) {
  const utils = render(
    <ListaDeFixos
      competencia="2026-09"
      rotuloDaCompetencia="Setembro de 2026"
      itens={itens}
      registrarVigencia={acoes.registrar ?? registrarOk}
      encerrar={acoes.encerrar ?? encerrarOk}
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
