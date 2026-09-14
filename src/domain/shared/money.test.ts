import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Cents,
  criarCents,
  multiplicar,
  parseBRL,
  somar,
  subtrair,
  ZERO_CENTS,
} from "./money";
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

describe("parseBRL", () => {
  it('converte "1.234,56" em 123456 centavos', () => {
    expect(parseBRL("1.234,56")).toEqual({ ok: true, value: 123456 });
  });

  it('converte "0,05" em 5 centavos', () => {
    expect(parseBRL("0,05")).toEqual({ ok: true, value: 5 });
  });

  it('converte "1234,5" em 123450 centavos, completando a casa decimal ausente', () => {
    expect(parseBRL("1234,5")).toEqual({ ok: true, value: 123450 });
  });

  it("converte valor sem parte decimal, com separador de milhar, em centavos", () => {
    expect(parseBRL("1.234")).toEqual({ ok: true, value: 123400 });
  });

  it.each(["abc", "1,234", "", "1.23,45", "12,", "R$ 10,00"])(
    "rejeita a entrada malformada %p com VALOR_NAO_POSITIVO",
    (entrada) => {
      const resultado = parseBRL(entrada);

      expect(isErr(resultado)).toBe(true);
      expect(isErr(resultado) && resultado.error.code).toBe("VALOR_NAO_POSITIVO");
    },
  );

  it("não passa por aritmética de ponto flutuante intermediária", () => {
    // 19.99 * 100 === 1998.9999999999998 em IEEE-754: uma implementação via
    // parseFloat devolveria 1998 aqui.
    expect(parseBRL("19,99")).toEqual({ ok: true, value: 1999 });
    expect(parseBRL("81.234.567,89")).toEqual({ ok: true, value: 8123456789 });

    const fonte = readFileSync(join(__dirname, "money.ts"), "utf-8");
    for (const proibido of ["parseFloat", "toFixed", "* 100", "/ 100", "Math.round", "Number("]) {
      expect(fonte).not.toContain(proibido);
    }
  });
});
