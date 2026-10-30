import Link from "next/link";
import type { LancamentoDoMes } from "@/application/mes/obter-visao-mensal/handler";
import type { CorDeCategoria } from "@/domain";
import { formatarData } from "@/lib/formatar";
import { Chip } from "./ui";
import { corDaNatureza, ValorDaNatureza } from "./valor-da-natureza";

/** O nome da categoria e a cor em uso; `null` é a neutra, a da arquivada (COR-02, AC 5). */
export interface CategoriaDaLinha {
  readonly nome: string;
  readonly cor: CorDeCategoria | null;
}

/**
 * Os últimos lançamentos do mês, na coluna de ação da Visão geral (TRES-05).
 *
 * Quem escolhe quais e em que ordem é `ultimosLancamentos`; aqui é só a
 * apresentação. Cada linha diz o que é, quando foi, em que categoria e quanto,
 * com o sinal e a cor da natureza da lista de Lançamentos (AC 3).
 *
 * **A pill segue a coluna Categoria da lista.** A entrada não tem categoria e
 * mostra "Receita"; o gasto sem categoria mostra "Sem categoria"; as duas na
 * neutra. A cor só aparece com o nome ao lado, nunca sozinha.
 *
 * As linhas não são links: o caminho para a lista inteira é "Ver todos", e um
 * link por linha repetiria o mesmo destino oito vezes.
 */
export function UltimosLancamentos({
  competencia,
  itens,
  categorias,
}: {
  readonly competencia: string;
  readonly itens: ReadonlyArray<LancamentoDoMes>;
  readonly categorias: ReadonlyMap<string, CategoriaDaLinha>;
}) {
  return (
    <section aria-labelledby="titulo-ultimos" className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-ultimos" className="text-[17px]">
          Últimos lançamentos
        </h2>
        <Link
          href={`/${competencia}/lancamentos`}
          className="inline-flex min-h-11 items-center rounded-pill px-2 text-[14px] font-semibold text-primary-texto hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {itens.length === 0 ? (
        <p className="py-3 text-[15px] text-ink-muted">Nenhum lançamento até hoje neste mês.</p>
      ) : (
        <ul>
          {itens.map(({ lancamento }) => {
            const categoria = pillDaLinha(lancamento.natureza, lancamento.categoriaId, categorias);
            return (
              <li
                key={lancamento.id}
                className="flex min-h-14 items-center gap-3 border-b border-line py-2 last:border-b-0"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px]">{lancamento.descricao}</span>
                  <span className="tabular text-[13px] text-ink-muted">
                    {formatarData(lancamento.dataEvento)}
                  </span>
                </span>
                {categoria.cor === null ? (
                  <Chip>{categoria.nome}</Chip>
                ) : (
                  <Chip cor={categoria.cor}>{categoria.nome}</Chip>
                )}
                <span
                  className={`tabular whitespace-nowrap text-[15px] ${corDaNatureza(lancamento.natureza)}`}
                >
                  <ValorDaNatureza natureza={lancamento.natureza} valor={lancamento.valor} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function pillDaLinha(
  natureza: LancamentoDoMes["lancamento"]["natureza"],
  categoriaId: string | null,
  categorias: ReadonlyMap<string, CategoriaDaLinha>,
): CategoriaDaLinha {
  if (natureza === "RECEITA") {
    return { nome: "Receita", cor: null };
  }
  if (categoriaId === null) {
    return { nome: "Sem categoria", cor: null };
  }
  return categorias.get(categoriaId) ?? { nome: "Categoria removida", cor: null };
}
