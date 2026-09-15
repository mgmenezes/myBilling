import type { Cents } from "../shared/money";
import type { BlocoDoMes } from "./bloco-do-lancamento";
import { CEM_PORCENTO, type Porcentagem, percentual } from "./resumo-por-categoria";

/**
 * A composição das despesas entre os três blocos do mês.
 *
 * **A ordem é a regra, não apresentação.** Fixos, Cartão, Avulsos é a escala do
 * mais comprometido ao mais discricionário: fixo foi decidido meses atrás,
 * cartão já foi gasto e vai cair na fatura, avulso foi escolha deste mês. É
 * essa ordem que permite a barra usar **uma cor em três passos** em vez de três
 * matizes — a pergunta é de grau, não de identidade, e três matizes seriam o
 * arco-íris que a identidade do app recusa.
 *
 * Esta função não classifica nada: ela recebe os três totais que
 * `resumoMensal` já somou por `blocoDoLancamento`. Reclassificar aqui criaria a
 * segunda cascata que `bloco-do-lancamento.ts` existe para impedir.
 *
 * **Os percentuais fecham em 100%.** Sem isso a barra empilhada sobra ou falta
 * pixel na ponta, e a soma impressa ao lado contradiz o desenho. A sobra do
 * arredondamento vai para o maior bloco, onde é proporcionalmente menor — é a
 * mesma regra de `resumoPorCategoria`, pelo mesmo motivo.
 */

export interface TotaisPorBloco {
  readonly fixos: Cents;
  readonly cartao: Cents;
  readonly avulsos: Cents;
}

export interface FatiaDeComposicao {
  readonly bloco: BlocoDoMes;
  readonly total: Cents;
  readonly percentual: Porcentagem;
}

type TresFatias = readonly [FatiaDeComposicao, FatiaDeComposicao, FatiaDeComposicao];

export function composicaoDeBlocos(totais: TotaisPorBloco): TresFatias {
  const total = (totais.fixos + totais.cartao + totais.avulsos) as Cents;

  const fatias: TresFatias = [
    { bloco: "FIXOS", total: totais.fixos, percentual: percentual(totais.fixos, total) },
    { bloco: "CARTAO", total: totais.cartao, percentual: percentual(totais.cartao, total) },
    { bloco: "AVULSOS", total: totais.avulsos, percentual: percentual(totais.avulsos, total) },
  ];

  if (total === 0) {
    return fatias;
  }

  const sobra = (CEM_PORCENTO -
    (fatias[0].percentual + fatias[1].percentual + fatias[2].percentual)) as Porcentagem;
  return ajustar(fatias, indiceDoMaior(fatias), sobra);
}

/**
 * A tupla é indexada por literal, e não percorrida, porque `for` sobre ela
 * devolveria `T | undefined` sob `noUncheckedIndexedAccess` — e o ramo que
 * trata esse `undefined` seria impossível de alcançar num arranjo de três
 * posições. Ramo inalcançável não é defensivo: é buraco permanente na
 * cobertura de branches que o domínio exige fechar.
 */
function indiceDoMaior(fatias: TresFatias): 0 | 1 | 2 {
  if (fatias[1].total > fatias[0].total && fatias[1].total >= fatias[2].total) {
    return 1;
  }
  if (fatias[2].total > fatias[0].total && fatias[2].total > fatias[1].total) {
    return 2;
  }
  return 0;
}

function ajustar(fatias: TresFatias, alvo: 0 | 1 | 2, sobra: Porcentagem): TresFatias {
  const somado = (fatia: FatiaDeComposicao): FatiaDeComposicao => ({
    ...fatia,
    percentual: (fatia.percentual + sobra) as Porcentagem,
  });
  if (alvo === 0) {
    return [somado(fatias[0]), fatias[1], fatias[2]];
  }
  if (alvo === 1) {
    return [fatias[0], somado(fatias[1]), fatias[2]];
  }
  return [fatias[0], fatias[1], somado(fatias[2])];
}
