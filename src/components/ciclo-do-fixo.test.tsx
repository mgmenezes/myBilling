import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { encerrarRecorrencia, registrarNovaVigencia } from "@/app/actions/recorrencias";
import { CicloDoFixo } from "./ciclo-do-fixo";

/**
 * Derivado de FIXO-03, FIXO-06 e FIXCOL-05 (ACs 1 a 3, 6 e 7).
 *
 * Os oito testes de "mudar valor" e "encerrar" de `lista-de-fixos.test.tsx`
 * (linhas 225 a 310) passam aqui com as mesmas assertions. O que eles protegem
 * é a exigência da competência nos dois controles: "mudou o valor" e "cancelei"
 * não significam nada sem o mês a partir do qual valem.
 *
 * O hospedeiro faz o que o painel fará: desmonta o controle quando ele conclui
 * ou cancela, e mostra o que aconteceu.
 */

afterEach(cleanup);

const registrarOk: typeof registrarNovaVigencia = vi.fn(async () => ({
  ok: true as const,
  data: null,
}));
const encerrarOk: typeof encerrarRecorrencia = vi.fn(async () => ({
  ok: true as const,
  data: null,
}));

function Hospedeiro({
  modo,
  registrar,
  encerrar,
  aoConcluir,
  aoCancelar,
}: {
  readonly modo: "valor" | "encerrar";
  readonly registrar: typeof registrarNovaVigencia;
  readonly encerrar: typeof encerrarRecorrencia;
  readonly aoConcluir: () => void;
  readonly aoCancelar: () => void;
}) {
  const [aberto, setAberto] = useState(true);
  if (!aberto) {
    return <p>Controle fechado</p>;
  }
  return (
    <CicloDoFixo
      modo={modo}
      recorrenciaId="rec-1"
      competencia="2026-09"
      rotuloDaCompetencia="Setembro de 2026"
      registrarVigencia={registrar}
      encerrar={encerrar}
      aoConcluir={() => {
        aoConcluir();
        setAberto(false);
      }}
      aoCancelar={() => {
        aoCancelar();
        setAberto(false);
      }}
    />
  );
}

function montar(
  modo: "valor" | "encerrar",
  acoes: {
    registrar?: typeof registrarNovaVigencia;
    encerrar?: typeof encerrarRecorrencia;
  } = {},
) {
  const aoConcluir = vi.fn();
  const aoCancelar = vi.fn();
  render(
    <Hospedeiro
      modo={modo}
      registrar={acoes.registrar ?? registrarOk}
      encerrar={acoes.encerrar ?? encerrarOk}
      aoConcluir={aoConcluir}
      aoCancelar={aoCancelar}
    />,
  );
  return { usuario: userEvent.setup(), aoConcluir, aoCancelar };
}

describe("o título do controle", () => {
  it.each([
    ["valor", "Mudar o valor"],
    ["encerrar", "Encerrar"],
  ] as const)('no modo %s, o título é "%s"', (modo, titulo) => {
    montar(modo);

    expect(screen.getByRole("heading", { name: titulo })).toBeTruthy();
    expect(screen.getByRole("group", { name: titulo })).toBeTruthy();
  });
});

describe("mudar valor (FIXO-03; FIXCOL-05, ACs 1, 2, 6 e 7)", () => {
  it("pede a competência, pré-preenchida com o mês aberto", () => {
    montar("valor");

    const campo = screen.getByLabelText("Vale a partir de") as HTMLInputElement;
    expect(campo.value).toBe("2026-09");
    expect(screen.getByText(/Setembro de 2026/)).toBeTruthy();
  });

  it("envia o valor em centavos e a competência escolhida", async () => {
    const registrar = vi.fn(async () => ({ ok: true as const, data: null }));
    const { usuario } = montar("valor", { registrar: registrar as never });

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

  it("gravar com sucesso conclui o controle", async () => {
    const { usuario, aoConcluir, aoCancelar } = montar("valor");

    await usuario.type(screen.getByLabelText("Novo valor (R$)"), "60,00");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByText("Controle fechado")).toBeTruthy();
    expect(aoConcluir).toHaveBeenCalledTimes(1);
    expect(aoCancelar).not.toHaveBeenCalled();
  });

  it("texto que não é valor reprova antes de sair do navegador", async () => {
    const registrar = vi.fn();
    const { usuario, aoConcluir } = montar("valor", { registrar: registrar as never });

    await usuario.type(screen.getByLabelText("Novo valor (R$)"), "abc");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(registrar).not.toHaveBeenCalled();
    expect(aoConcluir).not.toHaveBeenCalled();
  });

  it("recusa do servidor aparece em alerta, e o controle continua aberto", async () => {
    const registrar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "RECORRENCIA_NAO_ENCONTRADA", mensagem: "Esse gasto fixo não existe mais." },
    }));
    const { usuario, aoConcluir } = montar("valor", { registrar: registrar as never });

    await usuario.type(screen.getByLabelText("Novo valor (R$)"), "60,00");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("não existe mais"),
    );
    expect(screen.getByLabelText("Novo valor (R$)")).toBeTruthy();
    expect(aoConcluir).not.toHaveBeenCalled();
  });

  it("cancelar fecha sem gravar", async () => {
    const registrar = vi.fn();
    const { usuario, aoCancelar } = montar("valor", { registrar: registrar as never });

    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Novo valor (R$)")).toBeNull();
    expect(registrar).not.toHaveBeenCalled();
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });
});

describe("encerrar (FIXO-06; FIXCOL-05, ACs 3, 6 e 7)", () => {
  it("avisa o que vai acontecer antes de confirmar", () => {
    montar("encerrar");

    expect(screen.getByText(/ainda não pagas deste mês em diante somem/)).toBeTruthy();
    expect(screen.getByText(/As já pagas ficam/)).toBeTruthy();
  });

  it("vem pré-preenchido com o mês aberto", () => {
    montar("encerrar");

    const campo = screen.getByLabelText("Encerrar a partir de") as HTMLInputElement;
    expect(campo.value).toBe("2026-09");
  });

  it("exige a competência a partir da qual encerra", async () => {
    const encerrar = vi.fn(async () => ({ ok: true as const, data: null }));
    const { usuario } = montar("encerrar", { encerrar: encerrar as never });

    await usuario.clear(screen.getByLabelText("Encerrar a partir de"));
    await usuario.type(screen.getByLabelText("Encerrar a partir de"), "2026-11");
    await usuario.click(screen.getByRole("button", { name: "Encerrar mesmo assim" }));

    await waitFor(() => {
      expect(encerrar).toHaveBeenCalledWith({ recorrenciaId: "rec-1", aPartirDe: "2026-11" });
    });
  });

  it("encerrar com sucesso conclui o controle", async () => {
    const { usuario, aoConcluir } = montar("encerrar");

    await usuario.click(screen.getByRole("button", { name: "Encerrar mesmo assim" }));

    expect(await screen.findByText("Controle fechado")).toBeTruthy();
    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });

  it("o botão de confirmação é diferente do que abriu, para não encerrar por inércia", () => {
    montar("encerrar");

    expect(screen.getByRole("button", { name: "Encerrar mesmo assim" })).toBeTruthy();
  });

  it("erro do servidor aparece em alerta", async () => {
    const encerrar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "RECORRENCIA_NAO_ENCONTRADA", mensagem: "Esse gasto fixo não existe mais." },
    }));
    const { usuario, aoConcluir } = montar("encerrar", { encerrar: encerrar as never });

    await usuario.click(screen.getByRole("button", { name: "Encerrar mesmo assim" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("não existe mais"),
    );
    expect(aoConcluir).not.toHaveBeenCalled();
  });

  it("cancelar fecha sem encerrar", async () => {
    const encerrar = vi.fn();
    const { usuario, aoCancelar } = montar("encerrar", { encerrar: encerrar as never });

    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Encerrar a partir de")).toBeNull();
    expect(encerrar).not.toHaveBeenCalled();
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });
});
