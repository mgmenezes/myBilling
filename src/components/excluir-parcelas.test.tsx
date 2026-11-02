import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { excluirCompraDestaParcela } from "@/app/actions/compras";
import type { ExclusaoDaParcela } from "@/application/mes/obter-visao-mensal/handler";
import { ProvedorDeAvisos } from "./avisos";
import { ExcluirParcelas } from "./excluir-parcelas";

/**
 * Testes derivados de EXC-02 (ACs 1, 7 a 10), EXC-04 (AC 4) e EXC-05 (ACs 5
 * e 7): o conteúdo do menu "⋯" de uma parcela. Compra em 4x de R$ 10,00, de
 * dezembro de 2026 a março de 2027, excluída a partir da 2/4.
 */

afterEach(cleanup);

type Acao = typeof excluirCompraDestaParcela;

const PLANO: ExclusaoDaParcela = {
  tipo: "PLANO",
  parcelas: 3,
  primeira: "2027-01",
  ultima: "2027-03",
  totalCentavos: 3000,
  pagasQueFicam: 0,
  inteira: false,
};

const TEXTO_DO_PLANO =
  "Excluir Compra A desta parcela em diante? Saem 3 parcelas, de Janeiro de 2027 a Março de 2027, somando R$ 30,00. As anteriores ficam.";

function excluiu(parcelasExcluidas: number) {
  return vi.fn(async () => ({ ok: true as const, data: { parcelasExcluidas } }));
}

function recusou() {
  return vi.fn(async () => ({
    ok: false as const,
    erro: { code: "LANCAMENTO_NAO_ENCONTRADO", mensagem: "Esse lançamento não existe mais." },
  }));
}

function montar({
  exclusao = PLANO,
  acao = excluiu(3),
}: {
  readonly exclusao?: ExclusaoDaParcela;
  readonly acao?: ReturnType<typeof vi.fn>;
} = {}) {
  const fechar = vi.fn();
  render(
    <ProvedorDeAvisos>
      <ExcluirParcelas
        lancamentoId="lanc-2"
        descricao="Compra A"
        exclusao={exclusao}
        excluir={acao as unknown as Acao}
        fechar={fechar}
      />
    </ProvedorDeAvisos>,
  );
  return { acao, fechar };
}

function botaoExcluir(): HTMLElement {
  return screen.getByRole("button", { name: "Excluir, Compra A" });
}

function botaoConfirmar(): HTMLElement {
  return screen.getByRole("button", { name: "Excluir desta em diante" });
}

describe('antes do primeiro toque: só "Excluir" (EXC-02, AC 1)', () => {
  it('mostra "Excluir" e nenhum aviso', () => {
    montar();

    expect(botaoExcluir()).toBeDefined();
    expect(screen.queryByText(TEXTO_DO_PLANO)).toBeNull();
    expect(screen.queryByRole("button", { name: "Excluir desta em diante" })).toBeNull();
  });

  it('tocar "Excluir" mostra o aviso e não chama a action', async () => {
    const { acao } = montar();

    await userEvent.click(botaoExcluir());

    expect(screen.getByText(TEXTO_DO_PLANO)).toBeDefined();
    expect(acao).not.toHaveBeenCalled();
  });
});

describe("o aviso (EXC-02, AC 7)", () => {
  it('tem "Excluir desta em diante" e "Cancelar"', async () => {
    montar();

    await userEvent.click(botaoExcluir());

    expect(botaoConfirmar()).toBeDefined();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDefined();
  });

  /* Sem `userEvent`: no Safari o toque não dá foco ao botão (L-046). */
  it('o foco vai para "Cancelar", também quando o toque não deu foco a nada', () => {
    montar();

    fireEvent.click(botaoExcluir());

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));
  });

  it("o aviso descreve o botão que recebe o foco, para o leitor de tela lê-lo", async () => {
    montar();

    await userEvent.click(botaoExcluir());

    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    expect(cancelar.getAttribute("aria-describedby")).not.toBeNull();
    expect(
      document.getElementById(cancelar.getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe(TEXTO_DO_PLANO);
  });
});

describe("confirmar (EXC-02, ACs 8 e 10)", () => {
  it('"Excluir desta em diante" chama a action uma vez com { lancamentoId } (AC 8)', async () => {
    const { acao } = montar();
    await userEvent.click(botaoExcluir());

    await userEvent.click(botaoConfirmar());

    expect(acao).toHaveBeenCalledTimes(1);
    expect(acao).toHaveBeenCalledWith({ lancamentoId: "lanc-2" });
  });

  it("enquanto grava, o botão fica desabilitado (AC 10)", async () => {
    let responder: (valor: unknown) => void = () => {};
    const acao = vi.fn(
      () =>
        new Promise((resolver) => {
          responder = resolver;
        }),
    );
    montar({ acao });
    await userEvent.click(botaoExcluir());

    await userEvent.click(botaoConfirmar());

    expect((botaoConfirmar() as HTMLButtonElement).disabled).toBe(true);
    responder({ ok: true, data: { parcelasExcluidas: 3 } });
    expect(await screen.findByRole("status")).toBeDefined();
    expect((botaoConfirmar() as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("desistir (EXC-02, AC 9)", () => {
  it('"Cancelar" chama `fechar` sem chamar a action', async () => {
    const { acao, fechar } = montar();
    await userEvent.click(botaoExcluir());

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(fechar).toHaveBeenCalledTimes(1);
    expect(acao).not.toHaveBeenCalled();
  });
});

describe("o resultado (EXC-04, AC 4; EXC-05, AC 7)", () => {
  it('sucesso: o toast diz quantas saíram de fato, pela resposta ("2 parcelas excluídas.")', async () => {
    /* O aviso falava em 3; o servidor excluiu 2. Vale o que o servidor gravou. */
    montar({ acao: excluiu(2) });
    await userEvent.click(botaoExcluir());

    await userEvent.click(botaoConfirmar());

    expect((await screen.findByRole("status")).textContent).toBe("2 parcelas excluídas.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it('sucesso com 1: "1 parcela excluída."', async () => {
    montar({ acao: excluiu(1) });
    await userEvent.click(botaoExcluir());

    await userEvent.click(botaoConfirmar());

    expect((await screen.findByRole("status")).textContent).toBe("1 parcela excluída.");
  });

  it("recusa: a mensagem em role=alert, sem toast (EXC-05, AC 7)", async () => {
    montar({ acao: recusou() });
    await userEvent.click(botaoExcluir());

    await userEvent.click(botaoConfirmar());

    expect((await screen.findByRole("alert")).textContent).toBe("Esse lançamento não existe mais.");
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("nada a excluir (EXC-05, AC 5)", () => {
  it('o aviso diz que não há o que excluir, sem "Excluir desta em diante"', async () => {
    montar({ exclusao: { tipo: "NADA" } });

    await userEvent.click(botaoExcluir());

    expect(
      screen.getByText("Todas as parcelas desta em diante já foram pagas. Nada a excluir."),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Excluir desta em diante" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDefined();
  });
});

describe("área de toque (EXC-01, AC 5; TOQUE-01)", () => {
  it('"Excluir", "Excluir desta em diante" e "Cancelar" declaram o alvo mínimo de 44 × 44', async () => {
    montar();
    for (const classe of ["min-h-11", "min-w-11"]) {
      expect(botaoExcluir().className).toContain(classe);
    }

    await userEvent.click(botaoExcluir());

    for (const classe of ["min-h-11", "min-w-11"]) {
      expect(botaoConfirmar().className).toContain(classe);
      expect(screen.getByRole("button", { name: "Cancelar" }).className).toContain(classe);
    }
  });
});
