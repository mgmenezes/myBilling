import { describe, expect, it } from "vitest";
import {
  criarFakes,
  type EstadoEmMemoria,
  type Fakes,
  FakeTransacao,
} from "@/application/ports/fakes";
import { blocoDoLancamento, type Cents, type Competencia } from "@/domain";
import { materializarRecorrencias } from "../materializar/handler";
import { type EntradaEditarFixo, editarRecorrencia } from "./handler";

/**
 * Derivado de EDF-02 a EDF-06: salvar o formulário de edição de um fixo.
 *
 * O cenário é um fixo de R$ 100,00 que começa em outubro de 2026, com as
 * ocorrências de outubro a janeiro já materializadas, editado por quem está
 * vendo novembro. Valores por propriedade (AD-009).
 */

const c = (t: string) => t as Competencia;
const AGORA = "2026-11-05T12:00:00.000Z";
const ANTES = "2026-10-20T12:00:00.000Z";

async function cenario(inicio = "2026-10") {
  const fakes = criarFakes();
  fakes.estado.meiosDePagamento.push(
    { id: "conta", nome: "Conta Corrente", tipo: "CONTA_CORRENTE", arquivadoEm: null },
    {
      id: "cartao",
      nome: "Cartão Roxo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: null,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: false,
    },
    { id: "arquivado", nome: "Cartão Azul", tipo: "ROTULO", arquivadoEm: ANTES },
  );
  fakes.estado.categorias.push(
    { id: "cat-1", nome: "Categoria Um", arquivadaEm: null, cor: null },
    { id: "cat-2", nome: "Categoria Dois", arquivadaEm: null, cor: null },
  );
  const criada = await fakes.recorrencias.criar({
    dados: {
      descricao: "Conta fixa A",
      natureza: "DESPESA",
      categoriaId: "cat-1",
      usuarioId: "pessoa-a",
      meioPagamentoId: "conta",
      competenciaInicio: c(inicio),
      competenciaFim: null,
      diaVencimento: 10,
    },
    valorInicial: 10000 as Cents,
  });
  await materializarRecorrencias(fakes, c("2026-10"), 3);
  return { fakes, recorrenciaId: criada.id, transacao: new FakeTransacao(fakes) };
}

/** O formulário aberto em novembro e salvo sem mexer em nada. */
function semMudanca(recorrenciaId: string): EntradaEditarFixo {
  return {
    recorrenciaId,
    descricao: "Conta fixa A",
    diaVencimento: 10,
    meioPagamentoId: "conta",
    categoriaId: "cat-1",
    usuarioId: "pessoa-a",
    competenciaFim: null,
    valor: 10000 as Cents,
    vigenteDesde: c("2026-11"),
    competenciaExibida: c("2026-11"),
    agora: AGORA,
  };
}

function fotografia(estado: EstadoEmMemoria) {
  return structuredClone({
    recorrencias: [...estado.recorrencias.entries()],
    movimentos: [...estado.movimentos.entries()],
  });
}

function ocorrencias(fakes: Fakes, recorrenciaId: string) {
  return [...fakes.estado.movimentos.values()]
    .filter((m) => m.recorrenciaId === recorrenciaId)
    .sort((a, b) => a.competencia.localeCompare(b.competencia));
}

function idDe(fakes: Fakes, recorrenciaId: string, competencia: string): string {
  return ocorrencias(fakes, recorrenciaId).find((m) => m.competencia === competencia)?.id ?? "";
}

async function registro(fakes: Fakes, recorrenciaId: string) {
  return fakes.recorrencias.buscarComVersoes(recorrenciaId);
}

describe("recusas antes de gravar (EDF-06 AC 5, EDF-05 AC 3)", () => {
  it("fixo inexistente é RECORRENCIA_NAO_ENCONTRADA", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    const antes = fotografia(fakes.estado);

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      recorrenciaId: "fantasma",
    });

    expect(resultado).toEqual({ ok: false, error: { code: "RECORRENCIA_NAO_ENCONTRADA" } });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });

  it.each([
    ["meio inexistente", { meioPagamentoId: "fantasma" }, "MEIO_PAGAMENTO_NAO_ENCONTRADO"],
    ["meio arquivado", { meioPagamentoId: "arquivado" }, "MEIO_PAGAMENTO_ARQUIVADO"],
    ["categoria inexistente", { categoriaId: "fantasma" }, "CATEGORIA_NAO_ENCONTRADA"],
  ] as const)(
    "%s é recusado com o código do cadastro, e nada é gravado",
    async (_, mudanca, code) => {
      const { fakes, recorrenciaId, transacao } = await cenario();
      const antes = fotografia(fakes.estado);

      const resultado = await editarRecorrencia(transacao, {
        ...semMudanca(recorrenciaId),
        descricao: "Conta fixa B",
        valor: 11000 as Cents,
        competenciaFim: c("2026-11"),
        ...mudanca,
      });

      expect(resultado).toEqual({ ok: false, error: { code } });
      expect(fotografia(fakes.estado)).toEqual(antes);
    },
  );

  it("fim antes do início é PERIODO_INVALIDO no campo do fim, e nada é gravado (EDF-04 AC 4)", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    const antes = fotografia(fakes.estado);

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      descricao: "Conta fixa B",
      competenciaFim: c("2026-09"),
    });

    expect(resultado).toEqual({
      ok: false,
      error: { code: "PERIODO_INVALIDO", campo: "competenciaFim" },
    });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });

  it("vigência antes do início é PERIODO_INVALIDO no campo da vigência, e nada é gravado (EDF-03 AC 5)", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    const antes = fotografia(fakes.estado);

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      descricao: "Conta fixa B",
      valor: 11000 as Cents,
      vigenteDesde: c("2026-09"),
    });

    expect(resultado).toEqual({
      ok: false,
      error: { code: "PERIODO_INVALIDO", campo: "vigenteDesde" },
    });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });
});

describe("salvar sem mudar nada (Review Focus 1; EDF-02 AC 4, EDF-03 AC 3)", () => {
  it("devolve mudou: false e não escreve nada", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    const antes = fotografia(fakes.estado);

    const resultado = await editarRecorrencia(transacao, semMudanca(recorrenciaId));

    expect(resultado).toEqual({ ok: true, value: { mudou: false } });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });

  it("visto antes de começar, compara com o valor da primeira vigência", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario("2026-12");
    const antes = fotografia(fakes.estado);

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      competenciaExibida: c("2026-10"),
      vigenteDesde: c("2026-10"),
    });

    expect(resultado).toEqual({ ok: true, value: { mudou: false } });
    expect(fotografia(fakes.estado)).toEqual(antes);
  });
});

describe("a série vale para o fixo inteiro (EDF-02 AC 1 a 3)", () => {
  it("grava os cinco campos no fixo e em todas as ocorrências, outubro inclusive", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    await fakes.movimentos.marcarPagamento(idDe(fakes, recorrenciaId, "2026-10"), "2026-10-10");
    await fakes.movimentos.confirmarValorReal(
      idDe(fakes, recorrenciaId, "2026-11"),
      10750 as Cents,
    );
    const versoesAntes = (await registro(fakes, recorrenciaId))?.versoes;

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: "cartao",
      categoriaId: "cat-2",
      usuarioId: "pessoa-b",
    });

    expect(resultado).toEqual({ ok: true, value: { mudou: true } });
    const depois = await registro(fakes, recorrenciaId);
    expect(depois?.recorrencia).toMatchObject({
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: "cartao",
      categoriaId: "cat-2",
      usuarioId: "pessoa-b",
      competenciaInicio: "2026-10",
      competenciaFim: null,
      encerradaEm: null,
    });
    expect(depois?.versoes).toEqual(versoesAntes);
    expect(
      ocorrencias(fakes, recorrenciaId).map((m) => [
        m.competencia,
        m.descricao,
        m.dataEvento,
        m.meioPagamentoId,
        m.categoriaId,
        m.usuarioId,
        m.valor,
        m.pagoEm,
      ]),
    ).toEqual([
      ["2026-10", "Conta fixa B", "2026-10-31", "cartao", "cat-2", "pessoa-b", 10000, "2026-10-10"],
      ["2026-11", "Conta fixa B", "2026-11-30", "cartao", "cat-2", "pessoa-b", 10750, null],
      ["2026-12", "Conta fixa B", "2026-12-31", "cartao", "cat-2", "pessoa-b", 10000, null],
      ["2027-01", "Conta fixa B", "2027-01-31", "cartao", "cat-2", "pessoa-b", 10000, null],
    ]);
  });

  it("categoria pode passar a ser nenhuma", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      categoriaId: null,
    });

    expect(resultado).toEqual({ ok: true, value: { mudou: true } });
    expect((await registro(fakes, recorrenciaId))?.recorrencia.categoriaId).toBeNull();
    expect(ocorrencias(fakes, recorrenciaId).map((m) => m.categoriaId)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });
});

describe("o meio novo não tira o fixo do bloco Fixos (EDF-02 AC 5, AD-012)", () => {
  it("trocar a conta por um cartão deixa todas as ocorrências em Fixos, já com o cartão", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();

    await editarRecorrencia(transacao, { ...semMudanca(recorrenciaId), meioPagamentoId: "cartao" });

    const cartoes = await fakes.cadastros.idsDeMeiosComFatura();
    expect(cartoes.has("cartao")).toBe(true);
    expect(
      ocorrencias(fakes, recorrenciaId).map((m) => [
        m.competencia,
        m.meioPagamentoId,
        blocoDoLancamento(m, cartoes),
      ]),
    ).toEqual([
      ["2026-10", "cartao", "FIXOS"],
      ["2026-11", "cartao", "FIXOS"],
      ["2026-12", "cartao", "FIXOS"],
      ["2027-01", "cartao", "FIXOS"],
    ]);
  });
});

describe("o valor muda a partir do mês escolhido (EDF-03 AC 2 e 4)", () => {
  it("registra a vigência e propaga dali em diante, sem tocar no anterior nem no pago", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    await fakes.movimentos.marcarPagamento(idDe(fakes, recorrenciaId, "2026-12"), "2026-12-10");

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      valor: 11000 as Cents,
    });

    expect(resultado).toEqual({ ok: true, value: { mudou: true } });
    expect((await registro(fakes, recorrenciaId))?.versoes).toEqual([
      { vigenteDesde: "2026-10", valorPrevisto: 10000 },
      { vigenteDesde: "2026-11", valorPrevisto: 11000 },
    ]);
    expect(
      ocorrencias(fakes, recorrenciaId).map((m) => [m.competencia, m.valor, m.descricao]),
    ).toEqual([
      ["2026-10", 10000, "Conta fixa A"],
      ["2026-11", 11000, "Conta fixa A"],
      ["2026-12", 10000, "Conta fixa A"],
      ["2027-01", 11000, "Conta fixa A"],
    ]);
  });
});

describe('o fim, pelo "Termina em" (EDF-04 AC 1 a 3)', () => {
  it("encerrar com M grava M como último mês e apaga as não pagas depois, mantendo a paga (Review Focus 3)", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    await fakes.movimentos.marcarPagamento(idDe(fakes, recorrenciaId, "2027-01"), "2027-01-10");

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      competenciaFim: c("2026-11"),
    });

    expect(resultado).toEqual({ ok: true, value: { mudou: true } });
    expect((await registro(fakes, recorrenciaId))?.recorrencia).toMatchObject({
      competenciaFim: "2026-11",
      encerradaEm: AGORA,
    });
    expect(ocorrencias(fakes, recorrenciaId).map((m) => [m.competencia, m.pagoEm])).toEqual([
      ["2026-10", null],
      ["2026-11", null],
      ["2027-01", "2027-01-10"],
    ]);
  });

  it("esvaziar num fixo encerrado reabre, e os meses seguintes voltam na próxima abertura", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    await fakes.recorrencias.encerrar(recorrenciaId, c("2026-11"), ANTES);
    await fakes.movimentos.removerNaoPagasDaRecorrencia(recorrenciaId, c("2026-12"));

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      competenciaFim: null,
    });
    await materializarRecorrencias(fakes, c("2026-11"), 3);

    expect(resultado).toEqual({ ok: true, value: { mudou: true } });
    expect((await registro(fakes, recorrenciaId))?.recorrencia).toMatchObject({
      competenciaFim: null,
      encerradaEm: null,
    });
    expect(ocorrencias(fakes, recorrenciaId).map((m) => m.competencia)).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("um fim depois do atual estende, e os meses entre os dois passam a ter ocorrência", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    await fakes.recorrencias.encerrar(recorrenciaId, c("2026-11"), ANTES);
    await fakes.movimentos.removerNaoPagasDaRecorrencia(recorrenciaId, c("2026-12"));

    const resultado = await editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      competenciaFim: c("2027-01"),
    });
    await materializarRecorrencias(fakes, c("2026-11"), 3);

    expect(resultado).toEqual({ ok: true, value: { mudou: true } });
    expect((await registro(fakes, recorrenciaId))?.recorrencia).toMatchObject({
      competenciaFim: "2027-01",
      encerradaEm: ANTES,
    });
    expect(ocorrencias(fakes, recorrenciaId).map((m) => m.competencia)).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
  });
});

describe("falha no meio da gravação (EDF-06 AC 2 e 4)", () => {
  it("uma recusa de caso de uso depois da primeira escrita lança, para a transação desfazer", async () => {
    const { recorrenciaId, transacao } = await cenario();

    const execucao = editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      descricao: "Conta fixa B",
      valor: 0 as Cents,
    });

    await expect(execucao).rejects.toThrow("registrarVersao devolveu VALOR_NAO_POSITIVO");
  });

  it("fixo sem nenhuma vigência é dado corrompido: lança antes de gravar", async () => {
    const { fakes, recorrenciaId, transacao } = await cenario();
    const atual = fakes.estado.recorrencias.get(recorrenciaId);
    if (!atual) {
      throw new Error("fixture inválida");
    }
    fakes.estado.recorrencias.set(recorrenciaId, { ...atual, versoes: [] });
    const antes = fotografia(fakes.estado);

    const execucao = editarRecorrencia(transacao, {
      ...semMudanca(recorrenciaId),
      descricao: "Conta fixa B",
    });

    await expect(execucao).rejects.toThrow("sem vigência");
    expect(fotografia(fakes.estado)).toEqual(antes);
  });
});
