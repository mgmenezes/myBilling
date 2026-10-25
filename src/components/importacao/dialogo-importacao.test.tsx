import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { importarPlanilha, PreviaParaATela, previaDaPlanilha } from "@/app/actions/importacao";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import type { Competencia } from "@/domain";
import { DialogoImportacao } from "./dialogo-importacao";
import { conteudoDaFixture, ID, previaDe } from "./previas-de-teste";

/**
 * Testes derivados de IMP-08 (AC 2, 6 e 8), IMP-04 (AC 6) e IMP-02 (AC 4 e 5),
 * com as actions entrando por props como dublês e as prévias montadas pelo
 * domínio sobre as fixtures sintéticas (AD-009).
 */

/*
 * O jsdom não implementa `showModal`/`close`. Os dublês reproduzem o contrato
 * observável do elemento, como em `dialogo-de-cadastro.test.tsx`.
 */
const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
  this.open = true;
});
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  cleanup();
  showModal.mockClear();
});

const MEIOS = [
  { id: ID.conta, nome: "Conta Corrente", geraFatura: false },
  { id: ID.roxo, nome: "Cartão Roxo", geraFatura: true },
  { id: ID.verde, nome: "Cartão Verde", geraFatura: true },
];

type Previa = typeof previaDaPlanilha;
type Importar = typeof importarPlanilha;

function previaOk(...previas: PreviaParaATela[]): Previa {
  const fila = [...previas];
  return vi.fn(async () => {
    const proxima = fila.shift();
    if (!proxima) {
      throw new Error("prévia pedida mais vezes que o teste previu");
    }
    return { ok: true as const, data: proxima };
  }) as unknown as Previa;
}

function recusa(code: string, mensagem: string) {
  return vi.fn(async () => ({ ok: false as const, erro: { code, mensagem } }));
}

const RESPOSTA_DE_OUTUBRO = {
  ok: true as const,
  data: {
    competencia: "2026-10" as Competencia,
    proxima: "2026-11" as Competencia,
    criados: 16,
    alterados: 0,
    encerrados: 0,
  },
};

const resumoDeOutubro = vi.fn(async () => RESPOSTA_DE_OUTUBRO) as unknown as Importar;

function montar({
  previa,
  importar = resumoDeOutubro,
  competenciaEsperada = null,
}: {
  previa: Previa;
  importar?: Importar;
  competenciaEsperada?: string | null;
}) {
  render(
    <DialogoImportacao
      nomeDaPessoa="Pessoa A"
      competenciaEsperada={competenciaEsperada as Competencia | null}
      meios={MEIOS}
      previaDaPlanilha={previa}
      importarPlanilha={importar}
      criarMeioDePagamento={vi.fn() as unknown as typeof criarMeioDePagamento}
    />,
  );
}

function dialogo(): HTMLDialogElement {
  const elemento = document.querySelector("dialog");
  if (!elemento) {
    throw new Error("nenhum <dialog> renderizado");
  }
  return elemento;
}

async function abrir(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Importar planilha" }));
}

/** Passo 1 inteiro: solta a fixture e continua com o mês que o nome traz. */
async function escolherArquivo(mes: "Outubro" | "Novembro" | "Dezembro"): Promise<void> {
  fireEvent.drop(screen.getByRole("region", { name: "Área para soltar o arquivo" }), {
    dataTransfer: {
      files: [new File([conteudoDaFixture(mes)], `Planilha 2026 - ${mes}.csv`)],
    },
  });
  await screen.findByText("4 blocos encontrados");
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
}

async function decidirOutubro(): Promise<void> {
  await userEvent.selectOptions(await screen.findByLabelText("Débito (4 linhas)"), ID.conta);
  await userEvent.selectOptions(screen.getByLabelText("Cartão Roxo (8 linhas)"), ID.roxo);
  await userEvent.selectOptions(screen.getByLabelText("Cartão Verde (1 linha)"), ID.verde);
  for (const [nome, classe] of [
    ["Salário A", /^Fixa/],
    ["Salário B", /^Fixa/],
    ["Reembolso", /^Avulsa/],
  ] as const) {
    const grupo = within(screen.getByRole("group", { name: nome }));
    await userEvent.click(grupo.getByRole("radio", { name: classe }));
    await userEvent.selectOptions(grupo.getByLabelText("Cai em"), ID.conta);
  }
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
}

const DECISOES_DE_OUTUBRO = {
  meios: { débito: ID.conta, "cartão roxo": ID.roxo, "cartão verde": ID.verde },
  entradas: {
    "salário a": { classe: "FIXA", contaId: ID.conta },
    "salário b": { classe: "FIXA", contaId: ID.conta },
    reembolso: { classe: "AVULSA", contaId: ID.conta },
  },
};

describe("DialogoImportacao — abrir (IMP-08, AC 2)", () => {
  it('o botão "Importar planilha" abre um <dialog> nativo pelo showModal', async () => {
    montar({ previa: previaOk() });
    expect(dialogo().open).toBe(false);

    await abrir();

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialogo().open).toBe(true);
    expect(screen.getByRole("heading", { name: "Importar planilha" })).toBeDefined();
  });

  it("começa no passo do arquivo", async () => {
    montar({ previa: previaOk() });

    await abrir();

    expect(screen.getByText("Tudo entra em nome de Pessoa A")).toBeDefined();
  });
});

describe("DialogoImportacao — o passo 2 só quando há o que decidir (IMP-04, AC 6)", () => {
  it("prévia sem pendências vai do passo 1 direto à conferência", async () => {
    const previa = previaOk(previaDe("Dezembro"));
    montar({ previa, competenciaEsperada: "2026-12" });
    await abrir();

    await escolherArquivo("Dezembro");

    expect(await screen.findByText("Conferência de Dezembro de 2026")).toBeDefined();
    expect(screen.queryByText("Meios de pagamento")).toBeNull();
    expect(screen.queryByText("Entradas", { selector: "h3" })).toBeNull();
    expect(previa).toHaveBeenCalledTimes(1);
    expect(previa).toHaveBeenCalledWith({
      nomeArquivo: "Planilha 2026 - Dezembro.csv",
      conteudo: conteudoDaFixture("Dezembro"),
      competencia: "2026-12",
      decisoes: { meios: {}, entradas: {} },
    });
  });

  it("com pendências, mostra o passo 2 e, ao concluir, pede a prévia de novo com as decisões", async () => {
    const previa = previaOk(previaDe("Outubro", { comDecisoes: false }), previaDe("Outubro"));
    montar({ previa });
    await abrir();

    await escolherArquivo("Outubro");
    expect(await screen.findByText("Meios de pagamento")).toBeDefined();
    expect(screen.queryByText(/^Conferência de/)).toBeNull();

    await decidirOutubro();

    expect(await screen.findByText("Conferência de Outubro de 2026")).toBeDefined();
    expect(previa).toHaveBeenCalledTimes(2);
    expect(previa).toHaveBeenLastCalledWith({
      nomeArquivo: "Planilha 2026 - Outubro.csv",
      conteudo: conteudoDaFixture("Outubro"),
      competencia: "2026-10",
      decisoes: DECISOES_DE_OUTUBRO,
    });
    expect(screen.getByRole("button", { name: "Importar 16 lançamentos" })).toBeDefined();
  });
});

describe("DialogoImportacao — ler a prévia não é gravar (IMP-05 AC 9, IMP-08 AC 9)", () => {
  it("a conferência nasce rotulada 'Importar 16 lançamentos', sem 'Importando…' nem o aviso de leitura", async () => {
    const previa = previaOk(previaDe("Outubro", { comDecisoes: false }), previaDe("Outubro"));
    montar({ previa });
    // O observador vê cada commit do React antes do seguinte: um rótulo que
    // aparece só entre dois commits é pego aqui, e não por sorte de tempo.
    let viuImportando = false;
    let viuLeituraNaConferencia = false;
    const observador = new MutationObserver(() => {
      const texto = document.body.textContent ?? "";
      if (texto.includes("Importando…")) {
        viuImportando = true;
      }
      if (texto.includes("Lendo a aba no servidor…") && texto.includes("Conferência de")) {
        viuLeituraNaConferencia = true;
      }
    });
    observador.observe(document.body, { childList: true, subtree: true, characterData: true });
    try {
      await abrir();
      await escolherArquivo("Outubro");
      expect(await screen.findByText("Meios de pagamento")).toBeDefined();
      await decidirOutubro();
      expect(await screen.findByRole("button", { name: "Importar 16 lançamentos" })).toBeDefined();
    } finally {
      observador.disconnect();
    }
    expect(viuImportando).toBe(false);
    expect(viuLeituraNaConferencia).toBe(false);
  });
});

describe("DialogoImportacao — recusa da prévia (IMP-02, AC 5)", () => {
  it("mostra a mensagem que nomeia o mês esperado e continua no passo do arquivo", async () => {
    const previa = recusa(
      "IMPORTACAO_FORA_DE_ORDEM",
      "As abas entram em sequência. A próxima é Novembro de 2026.",
    ) as unknown as Previa;
    montar({ previa, competenciaEsperada: "2026-11" });
    await abrir();

    await escolherArquivo("Dezembro");

    expect((await screen.findByRole("alert")).textContent).toBe(
      "As abas entram em sequência. A próxima é Novembro de 2026.",
    );
    expect(screen.getByText("Tudo entra em nome de Pessoa A")).toBeDefined();
    expect(dialogo().open).toBe(true);
  });
});

describe("DialogoImportacao — gravar (IMP-08, AC 6 e 8)", () => {
  async function chegarNaConferenciaDeOutubro(): Promise<void> {
    await abrir();
    await escolherArquivo("Outubro");
    await decidirOutubro();
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Entendi a diferença, importar mesmo assim" }),
    );
  }

  it("grava com o arquivo, as decisões e a confirmação da divergência", async () => {
    const importar = vi.fn(resumoDeOutubro) as unknown as Importar;
    montar({
      previa: previaOk(previaDe("Outubro", { comDecisoes: false }), previaDe("Outubro")),
      importar,
    });
    await chegarNaConferenciaDeOutubro();

    await userEvent.click(screen.getByRole("button", { name: "Importar 16 lançamentos" }));

    expect(importar).toHaveBeenCalledWith({
      nomeArquivo: "Planilha 2026 - Outubro.csv",
      conteudo: conteudoDaFixture("Outubro"),
      competencia: "2026-10",
      decisoes: DECISOES_DE_OUTUBRO,
      confirmouDivergencia: true,
    });
  });

  it('enquanto grava, o botão fica desabilitado e diz "Importando…" (AC 10)', async () => {
    let concluir: (resposta: unknown) => void = () => undefined;
    const importar = vi.fn(
      () =>
        new Promise((resolve) => {
          concluir = resolve;
        }),
    ) as unknown as Importar;
    montar({
      previa: previaOk(previaDe("Outubro", { comDecisoes: false }), previaDe("Outubro")),
      importar,
    });
    await chegarNaConferenciaDeOutubro();

    await userEvent.click(screen.getByRole("button", { name: "Importar 16 lançamentos" }));

    const botao = await screen.findByRole("button", { name: "Importando…" });
    expect(botao.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      concluir(RESPOSTA_DE_OUTUBRO);
    });
    expect(await screen.findByText("16 criados")).toBeDefined();
  });

  it('sucesso mostra "16 criados", o link para o mês importado e o próximo', async () => {
    montar({
      previa: previaOk(previaDe("Outubro", { comDecisoes: false }), previaDe("Outubro")),
    });
    await chegarNaConferenciaDeOutubro();

    await userEvent.click(screen.getByRole("button", { name: "Importar 16 lançamentos" }));

    expect(await screen.findByText("16 criados")).toBeDefined();
    expect(screen.getByText("0 alterados")).toBeDefined();
    expect(screen.getByText("0 encerrados")).toBeDefined();
    expect(screen.getByRole("link", { name: "Abrir Outubro de 2026" }).getAttribute("href")).toBe(
      "/2026-10",
    );
    expect(screen.getByText("Próximo: Novembro de 2026")).toBeDefined();
  });

  it("mostra as contagens que recebeu", async () => {
    const importar = vi.fn(async () => ({
      ok: true as const,
      data: {
        competencia: "2026-11" as Competencia,
        proxima: "2026-12" as Competencia,
        criados: 5,
        alterados: 4,
        encerrados: 1,
      },
    })) as unknown as Importar;
    montar({ previa: previaOk(previaDe("Novembro")), importar, competenciaEsperada: "2026-11" });
    await abrir();
    await escolherArquivo("Novembro");

    await userEvent.click(await screen.findByRole("button", { name: "Importar 9 lançamentos" }));

    expect(await screen.findByText("5 criados")).toBeDefined();
    expect(screen.getByText("4 alterados")).toBeDefined();
    expect(screen.getByText("1 encerrado")).toBeDefined();
    expect(screen.getByRole("link", { name: "Abrir Novembro de 2026" }).getAttribute("href")).toBe(
      "/2026-11",
    );
    expect(screen.getByText("Próximo: Dezembro de 2026")).toBeDefined();
  });

  it("recusa do servidor mantém o diálogo aberto, com a mensagem", async () => {
    const importar = recusa(
      "IMPORTACAO_FORA_DE_ORDEM",
      "As abas entram em sequência. A próxima é Novembro de 2026.",
    ) as unknown as Importar;
    montar({
      previa: previaOk(previaDe("Outubro", { comDecisoes: false }), previaDe("Outubro")),
      importar,
    });
    await chegarNaConferenciaDeOutubro();

    await userEvent.click(screen.getByRole("button", { name: "Importar 16 lançamentos" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "As abas entram em sequência. A próxima é Novembro de 2026.",
    );
    expect(dialogo().open).toBe(true);
    expect(screen.getByText("Conferência de Outubro de 2026")).toBeDefined();
  });
});

describe("DialogoImportacao — a aba seguinte (IMP-02, AC 4)", () => {
  it("depois de gravar, recomeça no passo do arquivo esperando o mês seguinte", async () => {
    montar({
      previa: previaOk(previaDe("Outubro", { comDecisoes: false }), previaDe("Outubro")),
    });
    await abrir();
    await escolherArquivo("Outubro");
    await decidirOutubro();
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Entendi a diferença, importar mesmo assim" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Importar 16 lançamentos" }));
    await screen.findByText("16 criados");

    await userEvent.click(screen.getByRole("button", { name: "Importar a próxima aba" }));

    expect(screen.getByText("Próximo mês esperado: Novembro de 2026")).toBeDefined();
    expect(screen.getByRole("region", { name: "Área para soltar o arquivo" })).toBeDefined();
  });
});
