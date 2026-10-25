import { readFileSync } from "node:fs";
import { join } from "node:path";
import { criarCompraParcelada } from "@/application/compras/criar-compra-parcelada/handler";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import { materializarRecorrencias } from "@/application/recorrencias/materializar/handler";
import type {
  Cartao,
  Cents,
  Competencia,
  DecisaoDeEntrada,
  DecisoesDaImportacao,
  Natureza,
} from "@/domain";

/**
 * Cenário dos testes da importação sobre os fakes: Pessoa A, os quatro meios
 * que as fixtures usam e a "Categoria Um" do cadastro base. Nomes genéricos e
 * valores das fixtures sintéticas (AD-009).
 */

export type Mes = "Outubro" | "Novembro" | "Dezembro";

export const PESSOA_A = "pessoa-a";
export const CONTA = "meio-conta-corrente";
export const ROXO = "meio-cartao-roxo";
export const VERDE = "meio-cartao-verde";
export const AZUL = "meio-cartao-azul";

export const c = (texto: string) => texto as Competencia;

function cartao(id: string, nome: string): Cartao {
  return {
    id,
    nome,
    tipo: "CARTAO_CREDITO",
    arquivadoEm: null,
    diaFechamento: 25,
    diaVencimento: 5,
    fechamentoVaiParaFaturaSeguinte: true,
  };
}

export function criarCenario(): Fakes {
  const fakes = criarFakes();
  fakes.estado.usuarios.push({ id: PESSOA_A, nome: "Pessoa A", email: "pessoa-a@example.com" });
  fakes.estado.meiosDePagamento.push(
    { id: CONTA, nome: "Conta Corrente", tipo: "CONTA_CORRENTE", arquivadoEm: null },
    cartao(ROXO, "Cartão Roxo"),
    cartao(VERDE, "Cartão Verde"),
    cartao(AZUL, "Cartão Azul"),
  );
  fakes.estado.categorias.push({ id: "categoria-um", nome: "Categoria Um", arquivadaEm: null });
  return fakes;
}

export function conteudoDaFixture(mes: Mes): string {
  return readFileSync(
    join(__dirname, "../../../domain/importacao/__fixtures__", `Planilha 2026 - ${mes}.csv`),
    "utf-8",
  );
}

export function decisoes(
  meios: Record<string, string>,
  entradas: Record<string, DecisaoDeEntrada>,
): DecisoesDaImportacao {
  return { meios: new Map(Object.entries(meios)), entradas: new Map(Object.entries(entradas)) };
}

export const SEM_DECISOES = decisoes({}, {});

/** As decisões que a aba de outubro pede: três "Tipo" e três entradas. */
export const DECISOES_DE_OUTUBRO = decisoes(
  { débito: CONTA, "cartão roxo": ROXO, "cartão verde": VERDE },
  {
    "salário a": { classe: "FIXA", contaId: CONTA },
    "salário b": { classe: "FIXA", contaId: CONTA },
    reembolso: { classe: "AVULSA", contaId: CONTA },
  },
);

/** As duas que novembro pede depois de outubro; o resto é lembrado. */
export const DECISOES_NOVAS_DE_NOVEMBRO = decisoes(
  { "cartão azul": AZUL },
  { presente: { classe: "AVULSA", contaId: CONTA } },
);

/**
 * O que a importação de outubro deixa no banco, montado à mão com os casos de
 * uso que já existem: as seis recorrências, as seis compras, o registro com as
 * decisões e as ocorrências que a abertura do mês materializa.
 */
export async function semearOutubroAMao(fakes: Fakes): Promise<void> {
  const recorrencias: ReadonlyArray<[string, Natureza, string, number]> = [
    ["Aluguel", "DESPESA", CONTA, 150000],
    ["Internet", "DESPESA", ROXO, 10000],
    ["Academia", "DESPESA", CONTA, 12000],
    ["Academia", "DESPESA", ROXO, 12000],
    ["Salário A", "RECEITA", CONTA, 600000],
    ["Salário B", "RECEITA", CONTA, 400000],
  ];
  for (const [descricao, natureza, meioPagamentoId, valor] of recorrencias) {
    await fakes.recorrencias.criar({
      dados: {
        descricao,
        natureza,
        categoriaId: null,
        usuarioId: PESSOA_A,
        meioPagamentoId,
        competenciaInicio: c("2026-10"),
        competenciaFim: null,
        diaVencimento: 1,
      },
      valorInicial: valor as Cents,
    });
  }

  const compras: ReadonlyArray<[string, string, number, number, number]> = [
    ["Sofá", ROXO, 10, 7, 21000],
    ["Fone", ROXO, 3, 1, 3334],
    ["Curso", VERDE, 3, 3, 5000],
    ["Óculos", CONTA, 5, 2, 8000],
    ["Livro", ROXO, 2, 1, 2000],
    ["Livro", ROXO, 2, 1, 3000],
  ];
  for (const [descricao, meioPagamentoId, qtdParcelas, parcelaInicial, valor] of compras) {
    const criada = await criarCompraParcelada(fakes, {
      idempotencyKey: crypto.randomUUID(),
      descricao,
      modo: "VALOR_PARCELA",
      valorCentavos: valor,
      qtdParcelas,
      parcelaInicial,
      competenciaInicial: "2026-10",
      politicaResiduo: "PRIMEIRAS",
      categoriaId: null,
      usuarioId: PESSOA_A,
      meioPagamentoId,
      dataEvento: "2026-10-01",
    });
    if (!criada.ok) {
      throw new Error(`fixture inválida: ${criada.error.code}`);
    }
  }

  await fakes.importacoes.registrar(
    { competencia: c("2026-10"), nomeArquivo: "Planilha 2026 - Outubro.csv", usuarioId: PESSOA_A },
    DECISOES_DE_OUTUBRO,
  );
  await materializarRecorrencias(fakes, c("2026-10"), 3);
}
