import { describe, expect, it } from "vitest";
import {
  criarEstadoEmMemoria,
  type EstadoEmMemoria,
  FakeCadastroRepository,
  FakeRecorrenciaRepository,
} from "@/application/ports/fakes";
import type { Cents, Competencia } from "@/domain";
import { criarRecorrencia } from "./handler";

/**
 * Derivado de FIXO-01, AC 1.
 *
 * O caso de uso existe para duas coisas que o repositório não faz: **resolver
 * as referências** antes de gravar, e **recusar um período impossível**. Sem a
 * primeira, um meio de pagamento arquivado receberia recorrência nova e ela
 * geraria ocorrência todo mês num cartão que não existe mais.
 */

const c = (t: string) => t as Competencia;

function montar(opcoes: { arquivado?: boolean } = {}) {
  const estado: EstadoEmMemoria = criarEstadoEmMemoria();
  estado.meiosDePagamento.push({
    id: "m1",
    nome: "Conta Corrente",
    tipo: "CONTA_CORRENTE",
    arquivadoEm: opcoes.arquivado === true ? "2026-01-01T12:00:00.000Z" : null,
  });
  return {
    estado,
    deps: {
      recorrencias: new FakeRecorrenciaRepository(estado),
      cadastros: new FakeCadastroRepository(estado),
    },
  };
}

function entrada(overrides: Record<string, unknown> = {}) {
  return {
    descricao: "Conta fixa A",
    natureza: "DESPESA" as const,
    categoriaId: null,
    usuarioId: "u1",
    meioPagamentoId: "m1",
    competenciaInicio: c("2026-03"),
    competenciaFim: null,
    diaVencimento: 10,
    valorInicial: 18000 as Cents,
    ...overrides,
  };
}

describe("criar recorrência (FIXO-01, AC 1)", () => {
  it("grava a recorrência e a versão inicial numa chamada", async () => {
    const { deps } = montar();

    const resultado = await criarRecorrencia(deps, entrada());

    expect(resultado.ok).toBe(true);
    const [criada] = await deps.recorrencias.listarComVersoes();
    expect(criada?.recorrencia.descricao).toBe("Conta fixa A");
    expect(criada?.versoes).toEqual([{ vigenteDesde: "2026-03", valorPrevisto: 18000 }]);
  });

  it("a versão inicial vale a partir da competência de início, não de hoje", async () => {
    const { deps } = montar();

    await criarRecorrencia(deps, entrada({ competenciaInicio: c("2027-08") }));

    const [criada] = await deps.recorrencias.listarComVersoes();
    expect(criada?.versoes[0]?.vigenteDesde).toBe("2027-08");
  });

  it("meio de pagamento inexistente é recusado", async () => {
    const { deps } = montar();

    const resultado = await criarRecorrencia(deps, entrada({ meioPagamentoId: "fantasma" }));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("MEIO_PAGAMENTO_NAO_ENCONTRADO");
  });

  it("meio de pagamento arquivado é recusado", async () => {
    const { deps } = montar({ arquivado: true });

    const resultado = await criarRecorrencia(deps, entrada());

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("MEIO_PAGAMENTO_ARQUIVADO");
  });

  it("recusa antes de gravar: nada fica no repositório", async () => {
    const { deps } = montar({ arquivado: true });

    await criarRecorrencia(deps, entrada());

    expect(await deps.recorrencias.listarComVersoes()).toEqual([]);
  });

  it("competência de fim anterior à de início é recusada", async () => {
    const { deps } = montar();

    const resultado = await criarRecorrencia(
      deps,
      entrada({ competenciaInicio: c("2026-06"), competenciaFim: c("2026-04") }),
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("PERIODO_INVALIDO");
  });

  it("fim igual ao início é aceito: recorrência de um mês só", async () => {
    const { deps } = montar();

    const resultado = await criarRecorrencia(
      deps,
      entrada({ competenciaInicio: c("2026-06"), competenciaFim: c("2026-06") }),
    );

    expect(resultado.ok).toBe(true);
  });

  it("receita é aceita com a mesma validação", async () => {
    const { deps } = montar();

    const resultado = await criarRecorrencia(
      deps,
      entrada({ natureza: "RECEITA", descricao: "Entrada recorrente A" }),
    );

    expect(resultado.ok).toBe(true);
    const [criada] = await deps.recorrencias.listarComVersoes();
    expect(criada?.recorrencia.natureza).toBe("RECEITA");
  });
});
