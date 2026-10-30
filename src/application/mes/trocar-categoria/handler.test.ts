import { describe, expect, it, vi } from "vitest";
import {
  criarFakes,
  type EstadoEmMemoria,
  type Fakes,
  FakeTransacao,
} from "@/application/ports/fakes";
import type { RepositoriosTransacionais, Transacao } from "@/application/ports/repositories";
import { type Cents, type Competencia, gerarParcelas } from "@/domain";
import { materializarRecorrencias } from "../../recorrencias/materializar/handler";
import { trocarCategoria } from "./handler";

/**
 * Derivado de TRC-03 (o alcance da troca) e TRC-05 AC 2 a 4 (as recusas).
 *
 * O cenário tem um fixo de outubro a dezembro com outubro pago, uma compra de
 * quatro parcelas e dois gastos do mês com a mesma descrição. Valores por
 * propriedade (AD-009).
 */

const c = (t: string) => t as Competencia;
const ARQUIVADA_EM = "2026-09-01T12:00:00.000Z";

function fotografia(estado: EstadoEmMemoria) {
  return structuredClone({
    recorrencias: [...estado.recorrencias.entries()],
    movimentos: [...estado.movimentos.entries()],
    compras: [...estado.compras.entries()],
  });
}

function deps(fakes: Fakes, transacao: Transacao = new FakeTransacao(fakes)) {
  return { transacao, movimentos: fakes.movimentos, cadastros: fakes.cadastros };
}

async function criarFixo(
  fakes: Fakes,
  dados: { natureza?: "DESPESA" | "RECEITA"; competenciaFim?: Competencia | null } = {},
) {
  const fixo = await fakes.recorrencias.criar({
    dados: {
      descricao: dados.natureza === "RECEITA" ? "Entrada fixa A" : "Conta fixa A",
      natureza: dados.natureza ?? "DESPESA",
      categoriaId: "cat-1",
      usuarioId: "pessoa-a",
      meioPagamentoId: "conta",
      competenciaInicio: c("2026-10"),
      competenciaFim: dados.competenciaFim === undefined ? c("2026-12") : dados.competenciaFim,
      diaVencimento: 10,
    },
    valorInicial: 10000 as Cents,
  });
  return fixo.id;
}

async function cenario() {
  const fakes = criarFakes();
  fakes.estado.meiosDePagamento.push({
    id: "conta",
    nome: "Conta Corrente",
    tipo: "CONTA_CORRENTE",
    arquivadoEm: null,
  });
  fakes.estado.categorias.push(
    { id: "cat-1", nome: "Categoria Um", arquivadaEm: null, cor: null },
    { id: "cat-2", nome: "Categoria Dois", arquivadaEm: null, cor: null },
    { id: "cat-arquivada", nome: "Categoria Três", arquivadaEm: ARQUIVADA_EM, cor: null },
  );

  const recorrenciaId = await criarFixo(fakes);
  await materializarRecorrencias(fakes, c("2026-10"), 3);
  const ocorrencia = (competencia: string) =>
    [...fakes.estado.movimentos.values()].find(
      (m) => m.recorrenciaId === recorrenciaId && m.competencia === competencia,
    )?.id ?? "";
  await fakes.movimentos.marcarPagamento(ocorrencia("2026-10"), "2026-10-10");

  const plano = gerarParcelas({
    modo: "TOTAL",
    valorEntrada: 40000 as Cents,
    qtdParcelas: 4,
    competenciaCompra: c("2026-10"),
    parcelaInicial: 1,
    politicaResiduo: "PRIMEIRAS",
  });
  if (!plano.ok) {
    throw new Error("fixture inválida");
  }
  const compra = await fakes.compras.salvarComParcelas({
    idempotencyKey: "chave-compra",
    dados: {
      descricao: "Compra em quatro",
      modo: "TOTAL",
      politicaResiduo: "PRIMEIRAS",
      competenciaCompra: c("2026-10"),
      qtdParcelas: 4,
      parcelaInicial: 1,
      categoriaId: "cat-1",
      usuarioId: "pessoa-a",
      meioPagamentoId: "conta",
      dataEvento: "2026-10-05",
    },
    plano: plano.value,
  });
  if (!compra.ok) {
    throw new Error("fixture inválida");
  }

  const gasto = {
    natureza: "DESPESA" as const,
    descricao: "Gasto do mês",
    competencia: c("2026-11"),
    dataEvento: "2026-11-15",
    valor: 5000 as Cents,
    pagoEm: null,
    categoriaId: "cat-1",
    usuarioId: "pessoa-a",
    meioPagamentoId: "conta",
  };
  const escolhido = await fakes.movimentos.criarAvulso(gasto);
  const vizinho = await fakes.movimentos.criarAvulso(gasto);

  return {
    fakes,
    recorrenciaId,
    ocorrencia,
    compraId: compra.value.id,
    gastoId: escolhido.id,
    vizinhoId: vizinho.id,
  };
}

function doFixo(fakes: Fakes, recorrenciaId: string) {
  return [...fakes.estado.movimentos.values()]
    .filter((m) => m.recorrenciaId === recorrenciaId)
    .sort((a, b) => a.competencia.localeCompare(b.competencia));
}

function daCompra(fakes: Fakes, compraId: string) {
  return [...fakes.estado.movimentos.values()]
    .filter((m) => m.compraId === compraId)
    .sort((a, b) => (a.numeroParcela ?? 0) - (b.numeroParcela ?? 0));
}

describe("ocorrência de fixo troca o fixo inteiro (TRC-03 AC 1 e 2)", () => {
  it("o fixo e as ocorrências de outubro a dezembro ficam com a categoria nova, e outubro continua pago", async () => {
    const { fakes, recorrenciaId, ocorrencia } = await cenario();
    const fixoAntes = structuredClone(fakes.estado.recorrencias.get(recorrenciaId));
    const ocorrenciasAntes = doFixo(fakes, recorrenciaId);

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: ocorrencia("2026-11"),
      categoriaId: "cat-2",
    });

    expect(resultado).toEqual({ ok: true, value: { alcance: "FIXO", categoriaId: "cat-2" } });
    expect(ocorrenciasAntes.map((m) => m.competencia)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(doFixo(fakes, recorrenciaId)).toEqual(
      ocorrenciasAntes.map((m) => ({ ...m, categoriaId: "cat-2" })),
    );
    expect(doFixo(fakes, recorrenciaId)[0]?.pagoEm).toBe("2026-10-10");
    expect(fakes.estado.recorrencias.get(recorrenciaId)).toEqual({
      recorrencia: { ...fixoAntes?.recorrencia, categoriaId: "cat-2" },
      versoes: fixoAntes?.versoes,
    });
  });

  it("a ocorrência que o fixo materializa depois da troca nasce com a categoria nova", async () => {
    const { fakes } = await cenario();
    const semFim = await criarFixo(fakes, { competenciaFim: null });
    await materializarRecorrencias(fakes, c("2026-10"), 1);
    const outubro = doFixo(fakes, semFim)[0]?.id ?? "";

    await trocarCategoria(deps(fakes), { lancamentoId: outubro, categoriaId: "cat-2" });
    await materializarRecorrencias(fakes, c("2027-02"), 0);

    const fevereiro = doFixo(fakes, semFim).find((m) => m.competencia === "2027-02");
    expect(fevereiro?.categoriaId).toBe("cat-2");
  });
});

describe("parcela de compra troca a compra inteira (TRC-03 AC 3)", () => {
  it("parcela 2 de 4: as quatro parcelas e a compra trocam, sem mudar valor, número nem data", async () => {
    const { fakes, compraId } = await cenario();
    const antes = daCompra(fakes, compraId);
    const segunda = antes.find((p) => p.numeroParcela === 2)?.id ?? "";

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: segunda,
      categoriaId: "cat-2",
    });

    expect(resultado).toEqual({ ok: true, value: { alcance: "COMPRA", categoriaId: "cat-2" } });
    expect(antes.map((p) => p.numeroParcela)).toEqual([1, 2, 3, 4]);
    expect(daCompra(fakes, compraId)).toEqual(antes.map((p) => ({ ...p, categoriaId: "cat-2" })));
    expect((await fakes.compras.buscarPorId(compraId))?.parcelas.map((p) => p.categoriaId)).toEqual(
      ["cat-2", "cat-2", "cat-2", "cat-2"],
    );
  });
});

describe("gasto do mês troca só ele (TRC-03 AC 4)", () => {
  it("o vizinho de mesma descrição no mesmo mês fica como estava", async () => {
    const { fakes, gastoId, vizinhoId } = await cenario();
    const antes = fotografia(fakes.estado);
    const gasto = fakes.estado.movimentos.get(gastoId);

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: gastoId,
      categoriaId: "cat-2",
    });

    expect(resultado).toEqual({
      ok: true,
      value: { alcance: "LANCAMENTO", categoriaId: "cat-2" },
    });
    expect(fakes.estado.movimentos.get(vizinhoId)?.categoriaId).toBe("cat-1");
    const depois = fotografia(fakes.estado);
    expect({
      ...depois,
      movimentos: depois.movimentos.filter(([id]) => id !== gastoId),
    }).toEqual({ ...antes, movimentos: antes.movimentos.filter(([id]) => id !== gastoId) });
    expect(fakes.estado.movimentos.get(gastoId)).toEqual({ ...gasto, categoriaId: "cat-2" });
  });
});

describe("Sem categoria grava a ausência com o mesmo alcance (TRC-03 AC 5)", () => {
  it("no fixo: o fixo e todas as ocorrências ficam sem categoria", async () => {
    const { fakes, recorrenciaId, ocorrencia } = await cenario();

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: ocorrencia("2026-12"),
      categoriaId: null,
    });

    expect(resultado).toEqual({ ok: true, value: { alcance: "FIXO", categoriaId: null } });
    expect(doFixo(fakes, recorrenciaId).map((m) => m.categoriaId)).toEqual([null, null, null]);
    expect(fakes.estado.recorrencias.get(recorrenciaId)?.recorrencia.categoriaId).toBeNull();
  });

  it("na compra: todas as parcelas ficam sem categoria", async () => {
    const { fakes, compraId } = await cenario();

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: `${compraId}#4`,
      categoriaId: null,
    });

    expect(resultado).toEqual({ ok: true, value: { alcance: "COMPRA", categoriaId: null } });
    expect(daCompra(fakes, compraId).map((p) => p.categoriaId)).toEqual([null, null, null, null]);
  });

  it("no gasto do mês: só ele fica sem categoria", async () => {
    const { fakes, gastoId, vizinhoId } = await cenario();

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: gastoId,
      categoriaId: null,
    });

    expect(resultado).toEqual({ ok: true, value: { alcance: "LANCAMENTO", categoriaId: null } });
    expect(fakes.estado.movimentos.get(gastoId)?.categoriaId).toBeNull();
    expect(fakes.estado.movimentos.get(vizinhoId)?.categoriaId).toBe("cat-1");
  });
});

describe("recusas antes de gravar (TRC-05 AC 2 a 4)", () => {
  it("lançamento inexistente é LANCAMENTO_NAO_ENCONTRADO, e nada é gravado", async () => {
    const { fakes } = await cenario();
    const antes = fotografia(fakes.estado);

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: "fantasma",
      categoriaId: "cat-2",
    });

    expect(resultado).toEqual({ ok: false, error: { code: "LANCAMENTO_NAO_ENCONTRADO" } });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });

  it("lançamento cancelado é LANCAMENTO_NAO_ENCONTRADO, e nada é gravado", async () => {
    const { fakes, gastoId } = await cenario();
    await fakes.movimentos.cancelar(gastoId, "2026-11-16T12:00:00.000Z");
    const antes = fotografia(fakes.estado);

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: gastoId,
      categoriaId: "cat-2",
    });

    expect(resultado).toEqual({ ok: false, error: { code: "LANCAMENTO_NAO_ENCONTRADO" } });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });

  it.each([
    ["inexistente", "fantasma"],
    ["arquivada", "cat-arquivada"],
  ])("categoria %s é CATEGORIA_NAO_ENCONTRADA, e nada é gravado", async (_, categoriaId) => {
    const { fakes, ocorrencia } = await cenario();
    const antes = fotografia(fakes.estado);

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: ocorrencia("2026-11"),
      categoriaId,
    });

    expect(resultado).toEqual({ ok: false, error: { code: "CATEGORIA_NAO_ENCONTRADA" } });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });

  it("entrada avulsa é CATEGORIA_EM_RECEITA, e nada é gravado", async () => {
    const { fakes } = await cenario();
    const entrada = await fakes.movimentos.criarAvulso({
      natureza: "RECEITA",
      descricao: "Entrada do mês",
      competencia: c("2026-11"),
      dataEvento: "2026-11-05",
      valor: 20000 as Cents,
      pagoEm: null,
      categoriaId: null,
      usuarioId: "pessoa-a",
      meioPagamentoId: "conta",
    });
    const antes = fotografia(fakes.estado);

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: entrada.id,
      categoriaId: "cat-2",
    });

    expect(resultado).toEqual({ ok: false, error: { code: "CATEGORIA_EM_RECEITA" } });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });

  it("ocorrência de entrada fixa é CATEGORIA_EM_RECEITA, e nada é gravado", async () => {
    const { fakes } = await cenario();
    const entradaFixa = await criarFixo(fakes, { natureza: "RECEITA" });
    await materializarRecorrencias(fakes, c("2026-10"), 0);
    const outubro = doFixo(fakes, entradaFixa)[0]?.id ?? "";
    const antes = fotografia(fakes.estado);

    const resultado = await trocarCategoria(deps(fakes), {
      lancamentoId: outubro,
      categoriaId: "cat-2",
    });

    expect(resultado).toEqual({ ok: false, error: { code: "CATEGORIA_EM_RECEITA" } });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });
});

/**
 * A transação dos fakes não desfaz nada: desfazer é prova de integração. Esta
 * desfaz, para o teste dizer se as escritas da troca estão todas dentro dela e
 * se a exceção sobe em vez de virar um `Result`.
 */
class TransacaoQueDesfaz implements Transacao {
  constructor(
    private readonly estado: EstadoEmMemoria,
    private readonly repos: RepositoriosTransacionais,
  ) {}

  async executar<T>(operacao: (repos: RepositoriosTransacionais) => Promise<T>): Promise<T> {
    const antes = fotografia(this.estado);
    try {
      return await operacao(this.repos);
    } catch (erro) {
      restaurar(this.estado.recorrencias, antes.recorrencias);
      restaurar(this.estado.movimentos, antes.movimentos);
      restaurar(this.estado.compras, antes.compras);
      throw erro;
    }
  }
}

function restaurar<V>(mapa: Map<string, V>, entradas: ReadonlyArray<[string, V]>): void {
  mapa.clear();
  for (const [chave, valor] of entradas) {
    mapa.set(chave, valor);
  }
}

describe("tudo ou nada (TRC-03 AC 6)", () => {
  it("falha nas ocorrências depois de gravar o fixo: a exceção sobe e o fixo fica com a categoria antiga", async () => {
    const { fakes, recorrenciaId, ocorrencia } = await cenario();
    const antes = fotografia(fakes.estado);
    const serie = vi.spyOn(fakes.recorrencias, "atualizarSerie");
    vi.spyOn(fakes.movimentos, "atualizarOcorrenciasDaSerie").mockRejectedValueOnce(
      new Error("falha injetada"),
    );

    const execucao = trocarCategoria(deps(fakes, new TransacaoQueDesfaz(fakes.estado, fakes)), {
      lancamentoId: ocorrencia("2026-11"),
      categoriaId: "cat-2",
    });

    await expect(execucao).rejects.toThrow("falha injetada");
    expect(serie).toHaveBeenCalledOnce();
    expect(fakes.estado.recorrencias.get(recorrenciaId)?.recorrencia.categoriaId).toBe("cat-1");
    expect(fotografia(fakes.estado)).toEqual(antes);
  });

  it("ocorrência que aponta para um fixo que não existe é dado corrompido: lança sem gravar", async () => {
    const { fakes, recorrenciaId, ocorrencia } = await cenario();
    fakes.estado.recorrencias.delete(recorrenciaId);
    const antes = fotografia(fakes.estado);

    const execucao = trocarCategoria(deps(fakes), {
      lancamentoId: ocorrencia("2026-11"),
      categoriaId: "cat-2",
    });

    await expect(execucao).rejects.toThrow("não existe");
    expect(fotografia(fakes.estado)).toEqual(antes);
  });
});
