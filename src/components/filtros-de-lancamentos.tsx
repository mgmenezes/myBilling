"use client";

import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { useId } from "react";
import { ChipsDeCategoria, type TotalDeCategoria } from "./chips-de-categoria";
import { useFiltrosNaUrl } from "./filtros-na-url";
import type { OpcaoDeCadastro } from "./form-compra";

/**
 * Busca e filtros da lista de lançamentos.
 *
 * **O estado vive na URL, não em `useState`.** É isso que torna o filtro
 * compartilhável por link, faz ele sobreviver ao recarregar, e permite que um
 * indicador do painel abra a lista já filtrada. O `useState` aqui existe só
 * para o campo de busca não perder caractere enquanto o debounce roda.
 *
 * A busca espera 250ms antes de navegar: sem isso, cada tecla vira uma
 * navegação e o campo perde o foco no meio da digitação. A espera e a gravação
 * moram em `useFiltrosNaUrl`, que a barra compacta usa também.
 *
 * **A categoria é escolhida por chip, e não por select** (LST-01). O chip diz
 * quanto foi para cada categoria no mês, e o total vem pronto da página, o
 * mesmo de "Gastos por categoria" na Visão geral. Ele grava o mesmo
 * `categoriaId` que o select gravava, então os links que já levam à lista
 * filtrada continuam valendo.
 *
 * **A contagem fica numa região `role="status"`**, e só nela: é ela que diz a
 * quem não vê a lista que o filtro mudou o que está na tela (LST-01, AC 8).
 */

const CAMPO =
  "min-h-11 rounded-md border border-line bg-surface px-3.5 py-2 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong";

export function FiltrosDeLancamentos({
  categorias,
  meios,
  usuarios,
  totalVisivel,
  quantidadeVisivel,
}: {
  /** O gasto do mês por categoria, em ordem decrescente: os chips. */
  readonly categorias: ReadonlyArray<TotalDeCategoria>;
  readonly meios: ReadonlyArray<OpcaoDeCadastro>;
  readonly usuarios: ReadonlyArray<OpcaoDeCadastro>;
  readonly totalVisivel: string;
  readonly quantidadeVisivel: number;
}) {
  const { parametros, busca, setBusca, navegarCom, limparTudo } = useFiltrosNaUrl();
  const id = useId();

  const ativos = ["busca", "categoriaId", "meioPagamentoId", "usuarioId", "situacao", "natureza"]
    .map((chave) => parametros.get(chave))
    .filter((valor) => valor !== null && valor !== "").length;

  function seletor(
    chave: string,
    rotulo: string,
    opcoes: ReadonlyArray<{ readonly id: string; readonly nome: string }>,
  ) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[13px] text-ink-muted" htmlFor={`${id}-${chave}`}>
          {rotulo}
        </label>
        <select
          id={`${id}-${chave}`}
          className={CAMPO}
          value={parametros.get(chave) ?? ""}
          onChange={(evento) => navegarCom({ [chave]: evento.target.value })}
        >
          <option value="">Todas</option>
          {opcoes.map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.nome}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <search className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <label className="text-[13px] text-ink-muted" htmlFor={`${id}-busca`}>
          Buscar por descrição
        </label>
        <div className="relative">
          <MagnifyingGlassIcon
            size={17}
            weight="bold"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
          />
          <input
            id={`${id}-busca`}
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="mercado, gasolina, academia"
            className={`${CAMPO} w-full pl-10`}
          />
        </div>
      </div>

      <ChipsDeCategoria
        categorias={categorias}
        ativa={parametros.get("categoriaId")}
        aoEscolher={(categoriaId) => navegarCom({ categoriaId: categoriaId ?? "" })}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {seletor("meioPagamentoId", "Meio de pagamento", meios)}
        {seletor("usuarioId", "Pessoa", usuarios)}
        <div className="flex flex-col gap-1">
          <label className="text-[13px] text-ink-muted" htmlFor={`${id}-situacao`}>
            Situação
          </label>
          <select
            id={`${id}-situacao`}
            className={CAMPO}
            value={parametros.get("situacao") ?? ""}
            onChange={(evento) => navegarCom({ situacao: evento.target.value })}
          >
            <option value="">Todas</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="VENCIDO">Vencido</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p role="status" className="text-[14px] text-ink-muted">
          {quantidadeVisivel === 1 ? "1 lançamento" : `${quantidadeVisivel} lançamentos`}
          {ativos === 0 ? "" : ` com ${ativos === 1 ? "1 filtro" : `${ativos} filtros`}`}
          {". Total "}
          <span className="tabular text-ink">{totalVisivel}</span>
        </p>

        {ativos === 0 ? null : (
          <button
            type="button"
            onClick={limparTudo}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line px-4 text-[14px] text-ink transition-colors duration-200 hover:border-line-strong hover:bg-canvas"
          >
            <XIcon size={15} weight="bold" aria-hidden="true" />
            Limpar filtros
          </button>
        )}
      </div>
    </search>
  );
}
