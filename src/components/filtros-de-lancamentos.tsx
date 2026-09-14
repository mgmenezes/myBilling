"use client";

import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
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
 * navegação e o campo perde o foco no meio da digitação.
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
  readonly categorias: ReadonlyArray<OpcaoDeCadastro>;
  readonly meios: ReadonlyArray<OpcaoDeCadastro>;
  readonly usuarios: ReadonlyArray<OpcaoDeCadastro>;
  readonly totalVisivel: string;
  readonly quantidadeVisivel: number;
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const id = useId();

  const buscaNaUrl = parametros.get("busca") ?? "";
  const [busca, setBusca] = useState(buscaNaUrl);

  function navegarCom(mudancas: Record<string, string>) {
    const proximos = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === "") {
        proximos.delete(chave);
      } else {
        proximos.set(chave, valor);
      }
    }
    const query = proximos.toString();
    router.replace(query === "" ? "?" : `?${query}`, { scroll: false });
  }

  // Debounce: navegar a cada tecla tiraria o foco do campo no meio da palavra.
  useEffect(() => {
    if (busca === buscaNaUrl) {
      return;
    }
    const temporizador = setTimeout(() => {
      const proximos = new URLSearchParams(parametros.toString());
      if (busca === "") {
        proximos.delete("busca");
      } else {
        proximos.set("busca", busca);
      }
      const query = proximos.toString();
      router.replace(query === "" ? "?" : `?${query}`, { scroll: false });
    }, 250);
    return () => clearTimeout(temporizador);
  }, [busca, buscaNaUrl, parametros, router]);

  const ativos = ["busca", "categoriaId", "meioPagamentoId", "usuarioId", "situacao", "natureza"]
    .map((chave) => parametros.get(chave))
    .filter((valor) => valor !== null && valor !== "").length;

  function limparTudo() {
    setBusca("");
    router.replace("?", { scroll: false });
  }

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {seletor("categoriaId", "Categoria", categorias)}
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
        <p aria-live="polite" className="text-[14px] text-ink-muted">
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
