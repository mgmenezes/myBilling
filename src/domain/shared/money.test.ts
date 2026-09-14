import { describe, expect, it } from "vitest";
import { type Cents, criarCents, multiplicar, somar, subtrair, ZERO_CENTS } from "./money";
import { isErr, isOk } from "./result";

/** Atalho para testes: só aceita valores que o construtor valida. */
function cents(valor: number): Cents {
  const resultado = criarCents(valor);
  if (!isOk(resultado)) {
    throw new Error(`fixture inválida: ${valor}`);
  }
  return resultado.value;
}

describe("criarCents (AD-001)", () => {
  it("aceita inteiro positivo e devolve o mesmo número em centavos", () => {
    const resultado = criarCents(123456);

    expect(resultado).toEqual({ ok: true, value: 123456 });
  });

  it("aceita exatamente 1 centavo, o menor valor válido", () => {
    const resultado = criarCents(1);

    expect(resultado).toEqual({ ok: true, value: 1 });
  });

  it.each([10.5, 0.1, -3.2, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejeita %p por não ser inteiro, com VALOR_NAO_POSITIVO",
    (valor) => {
      const resultado = criarCents(valor);

      expect(isErr(resultado)).toBe(true);
      expect(isErr(resultado) && resultado.error.code).toBe("VALOR_NAO_POSITIVO");
    },
  );

  it.each([0, -1, -1000])(
    "rejeita %p por ser menor que 1 centavo, com VALOR_NAO_POSITIVO (PARC-05, AC 7)",
    (valor) => {
      const resultado = criarCents(valor);

      expect(isErr(resultado)).toBe(true);
      expect(isErr(resultado) && resultado.error.code).toBe("VALOR_NAO_POSITIVO");
    },
  );
});

describe("marca de tipo de Cents", () => {
  it("não aceita number cru onde Cents é exigido, sem passar pelo construtor", () => {
    // @ts-expect-error number cru não é Cents: a marca só é criada por criarCents (AD-001).
    const semConstrutor: Cents = 100;
    // Se `number` fosse atribuível a `Cents`, o tipo abaixo seria `true` e o
    // typecheck rejeitaria o valor `false` — a assertion é de compilação.
    const numberEhAtribuivelACents: number extends Cents ? true : false = false;

    expect(semConstrutor).toBe(100);
    expect(numberEhAtribuivelACents).toBe(false);
  });
});

describe("operações aritméticas em centavos", () => {
  it("somar devolve a soma inteira dos dois valores", () => {
    expect(somar(cents(33334), cents(33333))).toBe(66667);
  });

  it("subtrair devolve a diferença inteira e o neutro quando os valores são iguais", () => {
    expect(subtrair(cents(100001), cents(14285))).toBe(85716);
    expect(subtrair(cents(5), cents(5))).toBe(ZERO_CENTS);
  });

  it("multiplicar devolve o produto inteiro por uma quantidade", () => {
    expect(multiplicar(cents(7790), 10)).toBe(77900);
  });
});
