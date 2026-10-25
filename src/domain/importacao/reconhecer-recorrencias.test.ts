import { describe, expect, it } from "vitest";
import type { Cents } from "../shared/money";
import {
  type LinhaDeRecorrencia,
  type RecorrenciaVigente,
  reconhecerRecorrencias,
} from "./reconhecer-recorrencias";

const CONTA = "meio-conta-corrente";
const ROXO = "meio-cartao-roxo";
const AZUL = "meio-cartao-azul";

function vigente(id: string, descricao: string, meio: string, valor: number): RecorrenciaVigente {
  return { id, descricao, meioPagamentoId: meio, valorEmM: valor as Cents };
}

function fixo(posicao: number, nome: string, meio: string, valor: number | null) {
  return {
    bloco: "FIXOS",
    posicao,
    nome,
    meioPagamentoId: meio,
    valor: valor as Cents | null,
  } satisfies LinhaDeRecorrencia;
}

describe("reconhecerRecorrencias — fixos e receitas fixas de M − 1 (IMP-07)", () => {
  it("mesmo nome normalizado, mesmo meio e mesmo valor é INALTERADA (AC 1 e 3)", () => {
    const aluguel = fixo(0, "ALUGUEL", CONTA, 150000);

    expect(
      reconhecerRecorrencias([aluguel], [vigente("rec-aluguel", "Aluguel", CONTA, 150000)]),
    ).toEqual({
      destinos: [{ tipo: "INALTERADA", linha: aluguel, recorrenciaId: "rec-aluguel" }],
      encerrar: [],
    });
  });

  it("valor diferente é REAJUSTE de 10000 para 11000 (AC 4)", () => {
    const internet = fixo(1, "Internet", ROXO, 11000);

    expect(
      reconhecerRecorrencias([internet], [vigente("rec-internet", "Internet", ROXO, 10000)])
        .destinos,
    ).toEqual([
      { tipo: "REAJUSTE", linha: internet, recorrenciaId: "rec-internet", de: 10000, para: 11000 },
    ]);
  });

  it("novembro: Academia no Cartão Roxo, sem linha, vai para encerrar (AC 5)", () => {
    const vigentes = [
      vigente("rec-aluguel", "Aluguel", CONTA, 150000),
      vigente("rec-internet", "Internet", ROXO, 10000),
      vigente("rec-academia-conta", "Academia", CONTA, 12000),
      vigente("rec-academia-roxo", "Academia", ROXO, 12000),
    ];
    const linhas = [
      fixo(0, "Aluguel", CONTA, 150000),
      fixo(1, "Internet", ROXO, 11000),
      fixo(2, "Academia", CONTA, 12000),
      fixo(3, "Streaming", AZUL, 3000),
    ];

    const reconhecidas = reconhecerRecorrencias(linhas, vigentes);

    expect(reconhecidas.destinos.map((destino) => destino.tipo)).toEqual([
      "INALTERADA",
      "REAJUSTE",
      "INALTERADA",
      "NOVA",
    ]);
    expect(reconhecidas.encerrar).toEqual([vigente("rec-academia-roxo", "Academia", ROXO, 12000)]);
  });

  it("linha reconhecida sem valor fica PRESENTE_SEM_VALOR e não encerra a vigente (AC 6)", () => {
    const internet = fixo(1, "Internet", ROXO, null);

    expect(
      reconhecerRecorrencias([internet], [vigente("rec-internet", "Internet", ROXO, 11000)]),
    ).toEqual({
      destinos: [{ tipo: "PRESENTE_SEM_VALOR", linha: internet, recorrenciaId: "rec-internet" }],
      encerrar: [],
    });
  });

  it("linha sem valor e sem par não vira destino nem muda o que se encerra", () => {
    const vigentes = [vigente("rec-aluguel", "Aluguel", CONTA, 150000)];

    expect(reconhecerRecorrencias([fixo(0, "Seguro", CONTA, null)], vigentes)).toEqual({
      destinos: [],
      encerrar: vigentes,
    });
  });

  it("o mesmo nome em outro meio é NOVA, ao lado da reconhecida", () => {
    const academiaConta = fixo(2, "Academia", CONTA, 12000);
    const academiaRoxo = fixo(3, "Academia", ROXO, 12000);

    expect(
      reconhecerRecorrencias(
        [academiaConta, academiaRoxo],
        [vigente("rec-academia-conta", "Academia", CONTA, 12000)],
      ).destinos,
    ).toEqual([
      { tipo: "INALTERADA", linha: academiaConta, recorrenciaId: "rec-academia-conta" },
      { tipo: "NOVA", linha: academiaRoxo },
    ]);
  });

  it("entrada sem meio é reconhecida só pelo nome (AC 2)", () => {
    const salario = {
      bloco: "ENTRADAS",
      posicao: 0,
      nome: "Salário A",
      meioPagamentoId: null,
      valor: 600000 as Cents,
    } satisfies LinhaDeRecorrencia;

    expect(
      reconhecerRecorrencias([salario], [vigente("rec-salario-a", "Salário A", CONTA, 600000)]),
    ).toEqual({
      destinos: [{ tipo: "INALTERADA", linha: salario, recorrenciaId: "rec-salario-a" }],
      encerrar: [],
    });
  });

  it("duas linhas com a chave de uma vigente: a primeira pareia, a segunda é NOVA (AC 12)", () => {
    const primeira = fixo(0, "Academia", CONTA, 12000);
    const segunda = fixo(1, "Academia", CONTA, 12000);

    expect(
      reconhecerRecorrencias(
        [primeira, segunda],
        [vigente("rec-academia", "Academia", CONTA, 12000)],
      ).destinos,
    ).toEqual([
      { tipo: "INALTERADA", linha: primeira, recorrenciaId: "rec-academia" },
      { tipo: "NOVA", linha: segunda },
    ]);
  });

  it.each([["Internet "], ["internet"]])("%p reconhece a vigente Internet", (nome) => {
    const linha = fixo(1, nome, ROXO, 10000);

    expect(
      reconhecerRecorrencias([linha], [vigente("rec-internet", "Internet", ROXO, 10000)]).destinos,
    ).toEqual([{ tipo: "INALTERADA", linha, recorrenciaId: "rec-internet" }]);
  });
});
