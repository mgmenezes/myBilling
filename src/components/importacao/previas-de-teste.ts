import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PreviaParaATela } from "@/app/actions/importacao";
import {
  type Cents,
  type Competencia,
  type DecisaoDeEntrada,
  type EstadoParaImportacao,
  lerAba,
  lerCsv,
  planejarImportacao,
} from "@/domain";

/**
 * As prévias que os testes de componente da importação recebem, montadas pelo
 * mesmo `planejarImportacao` que a action usa, sobre as fixtures sintéticas
 * (AD-009). Só existe para teste: nenhum componente a importa.
 *
 * Montar a prévia à mão deixaria o teste afirmar o que o autor do teste
 * imaginou que a action devolve. Montá-la pelo domínio faz os textos da tela
 * serem conferidos contra os valores do design, que é o que a action entrega.
 *
 * O estado de novembro e de dezembro é o que outubro e novembro deixam no
 * banco (design, "Fixtures sintéticas"), com ids sintéticos.
 */

export type Mes = "Outubro" | "Novembro" | "Dezembro";

export const ID = {
  conta: "11111111-1111-4111-8111-111111111111",
  roxo: "22222222-2222-4222-8222-222222222222",
  verde: "33333333-3333-4333-8333-333333333333",
  azul: "44444444-4444-4444-8444-444444444444",
} as const;

export function conteudoDaFixture(mes: Mes): string {
  return readFileSync(
    join(__dirname, "../../domain/importacao/__fixtures__", `Planilha 2026 - ${mes}.csv`),
    "utf-8",
  );
}

function abaDe(mes: Mes) {
  const grade = lerCsv(conteudoDaFixture(mes));
  if (!grade.ok) {
    throw new Error(`fixture de ${mes} ilegível`);
  }
  const aba = lerAba(grade.value);
  if (!aba.ok) {
    throw new Error(`fixture de ${mes} sem os quatro blocos`);
  }
  return aba.value;
}

const c = (valor: number) => valor as Cents;

const MEIOS_DECIDIDOS: ReadonlyArray<readonly [string, string]> = [
  ["débito", ID.conta],
  ["cartão roxo", ID.roxo],
  ["cartão verde", ID.verde],
  ["cartão azul", ID.azul],
];

const ENTRADAS_DECIDIDAS: ReadonlyArray<readonly [string, DecisaoDeEntrada]> = [
  ["salário a", { classe: "FIXA", contaId: ID.conta }],
  ["salário b", { classe: "FIXA", contaId: ID.conta }],
  ["reembolso", { classe: "AVULSA", contaId: ID.conta }],
  ["presente", { classe: "AVULSA", contaId: ID.conta }],
];

function estadoDe(mes: Mes): EstadoParaImportacao {
  if (mes === "Outubro") {
    return {
      competencia: "2026-10" as Competencia,
      despesasFixasVigentes: [],
      receitasFixasVigentes: [],
      comprasEmCurso: [],
      categorias: [],
    };
  }
  if (mes === "Novembro") {
    return {
      competencia: "2026-11" as Competencia,
      despesasFixasVigentes: [
        { id: "r-aluguel", descricao: "Aluguel", meioPagamentoId: ID.conta, valorEmM: c(150000) },
        { id: "r-internet", descricao: "Internet", meioPagamentoId: ID.roxo, valorEmM: c(10000) },
        {
          id: "r-academia-d",
          descricao: "Academia",
          meioPagamentoId: ID.conta,
          valorEmM: c(12000),
        },
        { id: "r-academia-r", descricao: "Academia", meioPagamentoId: ID.roxo, valorEmM: c(12000) },
      ],
      receitasFixasVigentes: [
        {
          id: "r-salario-a",
          descricao: "Salário A",
          meioPagamentoId: ID.conta,
          valorEmM: c(600000),
        },
        {
          id: "r-salario-b",
          descricao: "Salário B",
          meioPagamentoId: ID.conta,
          valorEmM: c(400000),
        },
      ],
      comprasEmCurso: [
        compra("c-sofa", "Sofá", ID.roxo, 10, 8, 21000),
        compra("c-fone", "Fone", ID.roxo, 3, 2, 3334),
        compra("c-oculos", "Óculos", ID.conta, 5, 3, 8000),
        compra("c-livro-20", "Livro", ID.roxo, 2, 2, 2000),
        compra("c-livro-30", "Livro", ID.roxo, 2, 2, 3000),
      ],
      categorias: [],
    };
  }
  return {
    competencia: "2026-12" as Competencia,
    despesasFixasVigentes: [
      { id: "r-aluguel", descricao: "Aluguel", meioPagamentoId: ID.conta, valorEmM: c(150000) },
      { id: "r-internet", descricao: "Internet", meioPagamentoId: ID.roxo, valorEmM: c(11000) },
      { id: "r-academia-d", descricao: "Academia", meioPagamentoId: ID.conta, valorEmM: c(12000) },
      { id: "r-streaming", descricao: "Streaming", meioPagamentoId: ID.azul, valorEmM: c(3000) },
    ],
    receitasFixasVigentes: [
      { id: "r-salario-a", descricao: "Salário A", meioPagamentoId: ID.conta, valorEmM: c(600000) },
      { id: "r-salario-b", descricao: "Salário B", meioPagamentoId: ID.conta, valorEmM: c(420000) },
    ],
    comprasEmCurso: [
      compra("c-sofa", "Sofá", ID.roxo, 10, 9, 21000),
      compra("c-fone", "Fone", ID.roxo, 3, 3, 3333),
      compra("c-oculos", "Óculos", ID.conta, 5, 4, 8000),
      compra("c-tenis", "Tênis", ID.roxo, 2, 2, 15000),
    ],
    categorias: [],
  };
}

function compra(
  compraId: string,
  descricao: string,
  meioPagamentoId: string,
  qtdParcelas: number,
  numeroEmM: number,
  valorEmM: number,
) {
  return { compraId, descricao, meioPagamentoId, qtdParcelas, numeroEmM, valorEmM: c(valorEmM) };
}

/**
 * A prévia de um mês como a action a devolve. `comDecisoes: false` é a prévia
 * de quem ainda não passou pelo passo 2: em outubro, tudo pendente.
 */
export function previaDe(
  mes: Mes,
  opcoes: { readonly comDecisoes?: boolean; readonly competenciaEsperada?: string | null } = {},
): PreviaParaATela {
  const comDecisoes = opcoes.comDecisoes ?? true;
  const plano = planejarImportacao({
    aba: abaDe(mes),
    estado: estadoDe(mes),
    decisoes: comDecisoes
      ? { meios: new Map(MEIOS_DECIDIDOS), entradas: new Map(ENTRADAS_DECIDIDAS) }
      : { meios: new Map(), entradas: new Map() },
  });
  return {
    competencia: plano.competencia,
    competenciaEsperada: (opcoes.competenciaEsperada ?? null) as Competencia | null,
    conferencia: plano.conferencia,
    pendencias: plano.pendencias,
    linhas: plano.linhas,
    naoLidas: plano.naoLidas,
    deixamDeValer: plano.deixamDeValer,
    naoAparecem: plano.naoAparecem,
    quantidadeAImportar: plano.quantidadeAImportar,
  };
}
