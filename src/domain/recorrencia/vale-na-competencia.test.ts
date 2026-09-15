import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import { janelaMaterializacao, type PeriodoRecorrencia } from "./janela-materializacao";
import { valeNaCompetencia } from "./vale-na-competencia";

/** Testes derivados de FIXO-07 (AC 1 a 4). */

const c = (texto: string) => texto as Competencia;

const ATE_AGOSTO: PeriodoRecorrencia = { inicio: c("2026-07"), fim: c("2026-08") };
const SEM_FIM: PeriodoRecorrencia = { inicio: c("2026-07"), fim: null };
const COMECA_EM_NOVEMBRO: PeriodoRecorrencia = { inicio: c("2026-11"), fim: null };

describe("valeNaCompetencia — depois do fim (FIXO-07, AC 1)", () => {
  it("não vale no mês seguinte ao fim", () => {
    expect(valeNaCompetencia(ATE_AGOSTO, c("2026-09"))).toBe(false);
  });

  it("não vale meses depois do fim", () => {
    expect(valeNaCompetencia(ATE_AGOSTO, c("2027-03"))).toBe(false);
  });
});

describe("valeNaCompetencia — até o fim, inclusive (FIXO-07, AC 2)", () => {
  it("vale no próprio mês do fim", () => {
    expect(valeNaCompetencia(ATE_AGOSTO, c("2026-08"))).toBe(true);
  });

  it("vale nos meses entre o início e o fim", () => {
    expect(valeNaCompetencia(ATE_AGOSTO, c("2026-07"))).toBe(true);
  });

  it("sem fim, vale em qualquer mês", () => {
    expect(valeNaCompetencia(SEM_FIM, c("2030-12"))).toBe(true);
  });
});

/*
 * Assimetria deliberada: um fixo que começa em novembro, visto em setembro, é
 * compromisso recém-assumido que a pessoa precisa ver confirmado. Esconder
 * pareceria falha na gravação.
 */
describe("valeNaCompetencia — antes do início (FIXO-07, AC 3)", () => {
  it("continua aparecendo num mês anterior ao início", () => {
    expect(valeNaCompetencia(COMECA_EM_NOVEMBRO, c("2026-09"))).toBe(true);
  });

  it("aparece mesmo muito antes do início", () => {
    expect(valeNaCompetencia(COMECA_EM_NOVEMBRO, c("2020-01"))).toBe(true);
  });
});

/**
 * **Teste de concordância.** Onde esta função devolve `false`, a materialização
 * não pode produzir ocorrência — senão a lista esconderia um mês que ainda
 * recebe lançamento, e o número apareceria no total sem linha que o explicasse.
 *
 * A recíproca **não** vale, e é por isso que o teste é de uma direção só: antes
 * do início a função devolve `true` e a materialização não produz nada, que é
 * exatamente a assimetria do AC 3.
 */
describe("valeNaCompetencia — concordância com a materialização (FIXO-07, AC 4)", () => {
  const meses = [
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
    "2026-09",
    "2026-10",
    "2026-12",
    "2027-06",
  ].map(c);

  for (const periodo of [ATE_AGOSTO, SEM_FIM, COMECA_EM_NOVEMBRO]) {
    const rotulo = `${periodo.inicio} → ${periodo.fim ?? "sem fim"}`;

    it(`nenhum mês oculto recebe ocorrência — ${rotulo}`, () => {
      for (const mes of meses) {
        if (valeNaCompetencia(periodo, mes)) {
          continue;
        }
        expect(janelaMaterializacao(periodo, mes, mes)).toEqual([]);
      }
    });
  }

  it("o mês do fim é visível e materializável ao mesmo tempo", () => {
    expect(valeNaCompetencia(ATE_AGOSTO, c("2026-08"))).toBe(true);
    expect(janelaMaterializacao(ATE_AGOSTO, c("2026-08"), c("2026-08"))).toEqual([c("2026-08")]);
  });

  it("o mês seguinte ao fim não é nem visível nem materializável", () => {
    expect(valeNaCompetencia(ATE_AGOSTO, c("2026-09"))).toBe(false);
    expect(janelaMaterializacao(ATE_AGOSTO, c("2026-09"), c("2026-09"))).toEqual([]);
  });
});
