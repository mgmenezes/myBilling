import { describe, expect, it } from "vitest";
import type { Cents } from "../shared/money";
import { type OcorrenciaMaterializada, ocorrenciaProtegida } from "./ocorrencia-protegida";

/**
 * Derivado de FIXO-02 (ACs 3 e 4) e FIXO-03 (AC 3).
 *
 * Uma ocorrência já materializada não pode ser reescrita quando alguém tocou
 * nela. "Tocou" tem exatamente dois sinais, e os dois estão aqui.
 *
 * Errar isto tem consequência assimétrica: proteger demais deixa um valor
 * desatualizado na tela, o que a pessoa vê e corrige. Proteger de menos apaga
 * o valor real que ela digitou, o que ela **não** vê — e descobre ao conferir
 * o mês fechado contra a fatura.
 */

function ocorrencia(
  pagoEm: string | null,
  valor: number,
  valorPrevisto: number | null,
): OcorrenciaMaterializada {
  return { pagoEm, valor: valor as Cents, valorPrevisto: valorPrevisto as Cents | null };
}

describe("ocorrência protegida da materialização (FIXO-02, AC 3 e 4)", () => {
  it("paga é protegida, mesmo com valor igual ao previsto", () => {
    expect(ocorrenciaProtegida(ocorrencia("2026-03-10", 18000, 18000))).toBe(true);
  });

  it("paga é protegida também quando o valor foi confirmado", () => {
    expect(ocorrenciaProtegida(ocorrencia("2026-03-10", 19240, 18000))).toBe(true);
  });

  it("não paga com valor diferente do previsto é protegida", () => {
    expect(ocorrenciaProtegida(ocorrencia(null, 19240, 18000))).toBe(true);
  });

  it("não paga com valor igual ao previsto NÃO é protegida", () => {
    expect(ocorrenciaProtegida(ocorrencia(null, 18000, 18000))).toBe(false);
  });

  it("valor confirmado abaixo do previsto também protege", () => {
    expect(ocorrenciaProtegida(ocorrencia(null, 17510, 18000))).toBe(true);
  });

  it("sem previsto registrado, só o pagamento protege", () => {
    // Lançamento que não veio de recorrência não tem previsto. Ele nunca é
    // alvo da materialização, mas o predicado não pode quebrar com ele.
    expect(ocorrenciaProtegida(ocorrencia(null, 18000, null))).toBe(false);
    expect(ocorrenciaProtegida(ocorrencia("2026-03-10", 18000, null))).toBe(true);
  });

  it("valor zero confirmado sobre previsto positivo protege", () => {
    // Conta que veio zerada é confirmação legítima, não ausência de dado.
    expect(ocorrenciaProtegida(ocorrencia(null, 0, 18000))).toBe(true);
  });
});
