import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { cancelarLancamento } from "@/app/actions/lancamentos";
import { BotaoExcluir } from "./botao-excluir";

/** Testes derivados de AVUL-03 (AC 7) e do Done-when de T17. */

afterEach(cleanup);

function excluirOk() {
  return vi.fn(async () => ({
    ok: true as const,
    data: { id: "l-1", competencia: "2026-03", alterou: true },
  })) as unknown as typeof cancelarLancamento;
}

function excluirRecusado() {
  return vi.fn(async () => ({
    ok: false as const,
    erro: {
      code: "LANCAMENTO_NAO_CANCELAVEL",
      mensagem: "Só lançamento avulso pode ser excluído.",
    },
  })) as unknown as typeof cancelarLancamento;
}

function montar(excluir: typeof cancelarLancamento = excluirOk()) {
  render(<BotaoExcluir lancamentoId="l-1" descricao="Almoço" excluir={excluir} />);
  return excluir;
}

describe("BotaoExcluir — dois toques (AVUL-03, AC 7)", () => {
  it("o primeiro toque pede confirmação e não exclui", async () => {
    const excluir = montar();

    await userEvent.click(screen.getByRole("button"));

    expect(excluir).not.toHaveBeenCalled();
    expect(screen.getByRole("button").textContent).toContain("Confirmar?");
  });

  it("o segundo toque chama a action com o id do lançamento", async () => {
    const excluir = montar();

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));

    expect(excluir).toHaveBeenCalledWith("l-1");
    expect(excluir).toHaveBeenCalledTimes(1);
  });

  it("começa em Excluir, e não armado", () => {
    montar();

    expect(screen.getByRole("button").textContent).toContain("Excluir");
  });
});

describe("BotaoExcluir — desistir", () => {
  it("Escape desarma sem excluir", async () => {
    const excluir = montar();
    await userEvent.click(screen.getByRole("button"));

    await userEvent.keyboard("{Escape}");

    expect(excluir).not.toHaveBeenCalled();
    expect(screen.getByRole("button").textContent).toContain("Excluir");
  });

  /* Uma linha armada enquanto a pessoa foi olhar outra coisa é armadilha. */
  it("perder o foco desarma", async () => {
    render(
      <>
        <BotaoExcluir lancamentoId="l-1" descricao="Almoço" excluir={excluirOk()} />
        <button type="button">Outro lugar</button>
      </>,
    );
    const alvo = screen.getByRole("button", { name: /Excluir/ });
    await userEvent.click(alvo);
    expect(alvo.textContent).toContain("Confirmar?");

    await userEvent.click(screen.getByRole("button", { name: "Outro lugar" }));

    expect(alvo.textContent).toContain("Excluir");
  });
});

describe("BotaoExcluir — o estado não depende só de cor", () => {
  it("o texto visível muda de Excluir para Confirmar?", async () => {
    montar();

    expect(screen.getByRole("button").textContent).toContain("Excluir");

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button").textContent).toContain("Confirmar?");
  });

  it("o nome acessível carrega a descrição, para distinguir um botão dos outros", () => {
    montar();

    expect(screen.getByRole("button", { name: "Excluir, Almoço" })).toBeDefined();
  });

  it("o nome acessível do estado armado diz o que vai acontecer", async () => {
    montar();

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button", { name: "Confirmar?, excluir Almoço" })).toBeDefined();
  });
});

describe("BotaoExcluir — recusa do servidor", () => {
  it("mostra a mensagem e volta ao estado desarmado", async () => {
    montar(excluirRecusado());

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));

    expect((await screen.findByRole("alert")).textContent).toContain("avulso");
    expect(screen.getByRole("button").textContent).toContain("Excluir");
  });
});

describe("área de toque do botão de excluir (TOQUE-01, AC 2)", () => {
  /* Mesma razão do `BotaoPago`: a medida é declarada aqui e medida no e2e. */
  it("o botão de excluir declara o alvo mínimo de 44 × 44", () => {
    montar();

    const botao = screen.getByRole("button");

    expect(botao.className).toContain("min-h-11");
    expect(botao.className).toContain("min-w-11");
  });

  it("a pílula continua com largura de conteúdo, e não estica a linha", () => {
    montar();

    const botao = screen.getByRole("button");

    expect(botao.className).toContain("w-fit");
    expect(botao.textContent).toContain("Excluir");
  });
});
