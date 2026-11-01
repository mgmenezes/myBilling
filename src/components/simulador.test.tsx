import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarCategoria } from "@/app/actions/categorias";
import type { criarCompra } from "@/app/actions/compras";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import type { Cents, Competencia, SaldoDoMes } from "@/domain";
import { Simulador } from "./simulador";

/**
 * Testes derivados de SIM-02 (ACs 2, 3, 10 e 11) e SIM-04 (ACs 1, 2, 3 e 7).
 * Valores escolhidos pela conta (AD-009).
 */

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const MEIOS = [{ id: "22222222-2222-4222-8222-222222222222", nome: "Cartão Roxo" }];
const CATEGORIAS = [{ id: "33333333-3333-4333-8333-333333333333", nome: "Categoria Um" }];
const USUARIOS = [{ id: "11111111-1111-4111-8111-111111111111", nome: "Pessoa A" }];
const MARCO = "2026-03" as Competencia;

const COMPETENCIAS = [
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12",
  "2027-01",
  "2027-02",
  "2027-03",
];

/** R$ 700,00 sobrando em cada mês, menos maio, que já falta R$ 500,00. */
const HORIZONTE: SaldoDoMes[] = COMPETENCIAS.map((competencia) => ({
  competencia: competencia as Competencia,
  saldo: (competencia === "2026-05" ? -50000 : 70000) as Cents,
}));

afterEach(cleanup);

function montar(enviar: typeof criarCompra = vi.fn(), hoje = "2026-03-04") {
  render(
    <Simulador
      competencia={MARCO}
      hoje={hoje}
      horizonte={HORIZONTE}
      meios={MEIOS}
      categorias={CATEGORIAS}
      usuarios={USUARIOS}
      enviar={enviar}
      criarCategoria={vi.fn() as unknown as typeof criarCategoria}
      criarMeioDePagamento={vi.fn() as unknown as typeof criarMeioDePagamento}
    />,
  );
  return userEvent.setup();
}

async function digitar(
  usuario: ReturnType<typeof userEvent.setup>,
  valor: string,
  parcelas: string,
) {
  await usuario.clear(screen.getByLabelText(/^Valor (total|da parcela) \(R\$\)$/));
  await usuario.type(screen.getByLabelText(/^Valor (total|da parcela) \(R\$\)$/), valor);
  await usuario.clear(screen.getByLabelText("Quantidade de parcelas"));
  await usuario.type(screen.getByLabelText("Quantidade de parcelas"), parcelas);
}

function resposta() {
  return screen.getByRole("region", { name: "Resposta da simulação" });
}

describe("Simulador — os campos (SIM-02, AC 2)", () => {
  it("o mês da primeira parcela oferece as 13 competências de C a C + 12, com C selecionada", () => {
    montar();
    const seletor = screen.getByLabelText("Mês da primeira parcela") as HTMLSelectElement;

    expect([...seletor.options].map((o) => o.value)).toEqual(COMPETENCIAS);
    expect([...seletor.options].map((o) => o.textContent)).toEqual([
      "Março de 2026",
      "Abril de 2026",
      "Maio de 2026",
      "Junho de 2026",
      "Julho de 2026",
      "Agosto de 2026",
      "Setembro de 2026",
      "Outubro de 2026",
      "Novembro de 2026",
      "Dezembro de 2026",
      "Janeiro de 2027",
      "Fevereiro de 2027",
      "Março de 2027",
    ]);
    expect(seletor.value).toBe("2026-03");
  });
});

describe("Simulador — a resposta a cada tecla (SIM-02, ACs 3, 10 e 11)", () => {
  it("R$ 1.000,00 em 3x responde sem chamar a action: três linhas e cabe", async () => {
    const enviar = vi.fn();
    const usuario = montar(enviar);
    await digitar(usuario, "1.000,00", "3");

    expect(
      within(resposta()).getByText("Cabe. Maio já estava no vermelho antes desta compra."),
    ).toBeTruthy();
    expect(within(resposta()).getAllByRole("listitem")).toHaveLength(3);
    expect(
      within(resposta())
        .getAllByRole("definition")
        .map((d) => d.textContent),
    ).toEqual([
      "Vai sobrar R$ 700,00",
      "Vai sobrar R$ 366,66",
      "Vai sobrar R$ 700,00",
      "Vai sobrar R$ 366,67",
      "Vai faltar R$ 500,00",
      "Vai faltar R$ 833,33",
    ]);
    expect(enviar).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /calcular/i })).toBeNull();
  });

  it("a primeira parcela em maio desloca as linhas: maio, junho, julho", async () => {
    const usuario = montar();
    await digitar(usuario, "1.000,00", "3");
    await usuario.selectOptions(screen.getByLabelText("Mês da primeira parcela"), "2026-05");

    expect(
      within(resposta())
        .getAllByRole("listitem")
        .map((li) => li.textContent?.slice(0, 13)),
    ).toEqual(["Maio de 2026P", "Junho de 2026", "Julho de 2026"]);
  });

  it("no modo valor da parcela, o total é parcela × n e a busca usa esse total", async () => {
    const usuario = montar();
    await usuario.click(screen.getByRole("radio", { name: "Valor da parcela" }));
    await digitar(usuario, "1.000,00", "3");

    expect(
      within(resposta()).getByText("Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe."),
    ).toBeTruthy();
  });

  it('sem valor: "Informe o valor para ver a resposta." e nenhuma linha (AC 10)', () => {
    montar();

    expect(screen.getByText("Informe o valor para ver a resposta.")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Resposta da simulação" })).toBeNull();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("valor que não é reais vale o mesmo que vazio (AC 10)", async () => {
    const usuario = montar();
    await usuario.type(screen.getByLabelText("Valor total (R$)"), "abc");

    expect(screen.getByText("Informe o valor para ver a resposta.")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Resposta da simulação" })).toBeNull();
  });

  it("parcelas 0 e 121 mostram a mensagem do cadastro junto do campo; 1 e 120 não (AC 11, L-029)", async () => {
    const usuario = montar();
    const campo = () => screen.getByLabelText("Quantidade de parcelas");
    const MENSAGEM = "A quantidade de parcelas precisa estar entre 1 e 120.";

    await digitar(usuario, "1.000,00", "0");
    expect(campo().getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(campo().getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe(MENSAGEM);
    expect(screen.queryByRole("region", { name: "Resposta da simulação" })).toBeNull();

    await digitar(usuario, "1.000,00", "121");
    expect(
      document.getElementById(campo().getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe(MENSAGEM);

    await digitar(usuario, "1.000,00", "1");
    expect(screen.queryByText(MENSAGEM)).toBeNull();
    expect(within(resposta()).getAllByRole("listitem")).toHaveLength(1);

    await digitar(usuario, "1.000,00", "120");
    expect(screen.queryByText(MENSAGEM)).toBeNull();
    expect(within(resposta()).getAllByRole("listitem")).toHaveLength(13);
  });

  it("R$ 0,01 em 2x mostra a mensagem de valor pequeno demais junto do valor (AC 11)", async () => {
    const usuario = montar();
    await digitar(usuario, "0,01", "2");

    const campo = screen.getByLabelText("Valor total (R$)");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(campo.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "O valor é pequeno demais para esse número de parcelas.",
    );
    expect(screen.queryByRole("region", { name: "Resposta da simulação" })).toBeNull();
  });
});

describe("Simulador — Lançar esta compra (SIM-04, ACs 1, 2, 3 e 7)", () => {
  it("sem resposta não há botão; com resposta há (AC 1)", async () => {
    const usuario = montar();
    expect(screen.queryByRole("button", { name: "Lançar esta compra" })).toBeNull();

    await digitar(usuario, "1.000,00", "3");
    expect(screen.getByRole("button", { name: "Lançar esta compra" })).toBeTruthy();
  });

  it("antes do clique não existe formulário nem os campos de descrição, categoria, meio e pessoa (AC 7)", async () => {
    const usuario = montar();
    await digitar(usuario, "1.000,00", "3");

    expect(screen.queryByRole("form", { name: "Nova compra" })).toBeNull();
    expect(screen.queryByLabelText("Descrição")).toBeNull();
    expect(screen.queryByLabelText(/Categoria/)).toBeNull();
    expect(screen.queryByLabelText(/Meio de pagamento/)).toBeNull();
    expect(screen.queryByLabelText(/Quem comprou|Pessoa/)).toBeNull();
    expect(document.querySelector('input[name="idempotencyKey"]')).toBeNull();
  });

  it("o clique abre o cadastro preenchido com modo, valor, parcelas e o mês escolhido, com a data padrão dia 1 (AC 2)", async () => {
    const usuario = montar();
    await digitar(usuario, "1.000,00", "3");
    await usuario.selectOptions(screen.getByLabelText("Mês da primeira parcela"), "2026-05");
    await usuario.click(screen.getByRole("button", { name: "Lançar esta compra" }));

    const form = screen.getByRole("form", { name: "Nova compra" });
    expect((within(form).getByLabelText("Valor total (R$)") as HTMLInputElement).value).toBe(
      "1.000,00",
    );
    expect((within(form).getByLabelText("Quantidade de parcelas") as HTMLInputElement).value).toBe(
      "3",
    );
    expect((within(form).getByLabelText("Data da compra") as HTMLInputElement).value).toBe(
      "2026-05-01",
    );
    expect(
      within(within(form).getByRole("region", { name: "Previsão das parcelas" }))
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual([
      "1/3 Maio de 2026R$ 333,34",
      "2/3 Junho de 2026R$ 333,33",
      "3/3 Julho de 2026R$ 333,33",
      "Total da compraR$ 1.000,00",
    ]);
    expect(within(form).getByLabelText("Descrição")).toBeTruthy();
  });

  it("no mês corrente a data padrão é hoje", async () => {
    const usuario = montar(vi.fn(), "2026-03-04");
    await digitar(usuario, "1.000,00", "3");
    await usuario.click(screen.getByRole("button", { name: "Lançar esta compra" }));

    expect((screen.getByLabelText("Data da compra") as HTMLInputElement).value).toBe("2026-03-04");
  });

  it("no modo valor da parcela o formulário nasce nesse modo", async () => {
    const usuario = montar();
    await usuario.click(screen.getByRole("radio", { name: "Valor da parcela" }));
    await digitar(usuario, "60,00", "2");
    await usuario.click(screen.getByRole("button", { name: "Lançar esta compra" }));

    const form = screen.getByRole("form", { name: "Nova compra" });
    expect((within(form).getByLabelText("Valor da parcela (R$)") as HTMLInputElement).value).toBe(
      "60,00",
    );
  });

  it("a chave de idempotência existe assim que o formulário abre, antes de qualquer envio (AC 3)", async () => {
    const enviar = vi.fn();
    const usuario = montar(enviar);
    await digitar(usuario, "1.000,00", "3");
    await usuario.click(screen.getByRole("button", { name: "Lançar esta compra" }));

    const chave = document.querySelector('input[name="idempotencyKey"]') as HTMLInputElement;
    expect(chave.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(enviar).not.toHaveBeenCalled();
  });
});
