import { describe, expect, it } from "vitest";
import { lerCsv } from "./csv";

describe("lerCsv — grade de células pela RFC 4180 (IMP-01)", () => {
  it.each([
    ["CRLF", "a,b\r\nc,d"],
    ["LF", "a,b\nc,d"],
  ])("separa linhas terminadas em %s e colunas por vírgula", (_rotulo, texto) => {
    expect(lerCsv(texto)).toEqual({
      ok: true,
      value: [
        ["a", "b"],
        ["c", "d"],
      ],
    });
  });

  it("lê inteiro o campo entre aspas que contém vírgula", () => {
    expect(lerCsv('"Seguro (casa, carro)",x')).toEqual({
      ok: true,
      value: [["Seguro (casa, carro)", "x"]],
    });
  });

  it("converte aspas duplicadas dentro de aspas em uma aspa só", () => {
    expect(lerCsv('"a ""b"""')).toEqual({ ok: true, value: [['a "b"']] });
  });

  it("remove a marca de ordem de bytes do início da primeira célula (AC 2)", () => {
    expect(lerCsv("﻿Fixos,x\nc,d")).toEqual({
      ok: true,
      value: [
        ["Fixos", "x"],
        ["c", "d"],
      ],
    });
  });

  it("preserva as células vazias, inclusive a última da linha", () => {
    expect(lerCsv(",,x,")).toEqual({ ok: true, value: [["", "", "x", ""]] });
  });

  it("recusa aspas que não fecham com PLANILHA_ARQUIVO_INVALIDO", () => {
    const resultado = lerCsv('a,"Seguro (casa, carro)\nc,d');

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("PLANILHA_ARQUIVO_INVALIDO");
  });

  it("não transforma o fim de linha depois da última linha em uma linha extra", () => {
    expect(lerCsv("a,b\r\nc,d\r\n")).toEqual({
      ok: true,
      value: [
        ["a", "b"],
        ["c", "d"],
      ],
    });
  });
});
