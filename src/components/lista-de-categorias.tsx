"use client";

import { CheckIcon, WarningCircleIcon } from "@phosphor-icons/react";
import {
  type FormEvent,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import type { renomearCategoria, trocarCorDaCategoria } from "@/app/actions/categorias";
import { nomeCategoriaSchema } from "@/application/schemas/categoria.schema";
import { CORES_DE_CATEGORIA, type CorDeCategoria, corAutomatica, corDaCategoria } from "@/domain";
import { useAvisos } from "./avisos";
import { CLASSES_DA_COR } from "./cor-de-categoria";
import { Chip } from "./ui";

/**
 * As categorias com a cor de cada uma, onde a pessoa troca a cor e renomeia
 * (COR-04).
 *
 * **A cor grava ao escolher**, sem botão de salvar, como o seletor de
 * categoria da linha: escolher a cor anterior de novo desfaz a troca. São onze
 * radios num `fieldset` com `legend` "Cor de <nome>": as dez cores e
 * "Automática", cada um com o nome da cor escrito por cima da pill tingida,
 * porque a cor nunca vem sozinha (`docs/design.md`, "Cor por categoria"). A
 * "Automática" diz qual cor ela dá, que é a do nome da categoria.
 *
 * **Estado otimista**, pelo mesmo motivo do `SeletorDeCategoria`: a resposta é
 * uma revalidação de quatro rotas, e sem ele a pill continuaria na cor antiga
 * até a lista chegar. Quando a gravação termina, a linha volta às props. Depois
 * do sucesso elas já são as novas; depois de uma recusa continuam as
 * anteriores, e é assim que a cor ou o nome voltam sozinhos, com o motivo
 * escrito na linha e nenhum toast (COR-04, AC 8).
 *
 * **Renomear mantém a cor**, inclusive no otimista. O servidor grava o nome
 * novo com a cor que estava em uso; se a pill recalculasse a automática pelo
 * nome novo, ela piscaria em outra cor até a resposta chegar.
 *
 * **Alvo de 44 × 44 em toda opção** (COR-04, AC 10). O alvo é o `<label>`
 * inteiro; a pill desenhada dentro dele é menor, para as onze caberem em duas
 * linhas no computador. O radio de verdade fica em `sr-only`, e o anel de foco
 * vem dele pelo `peer`, como no alternador de tema.
 */

/** O nome de cada cor, como a pessoa lê. O do banco não tem acento. */
const NOME_DA_COR: Readonly<Record<CorDeCategoria, string>> = {
  vermelho: "Vermelho",
  laranja: "Laranja",
  ambar: "Âmbar",
  verde: "Verde",
  "verde-agua": "Verde-água",
  ciano: "Ciano",
  azul: "Azul",
  roxo: "Roxo",
  rosa: "Rosa",
  marrom: "Marrom",
};

/** O valor do radio "Automática": o radio não tem valor nulo. */
const AUTOMATICA = "automatica";

export interface ItemDeCategoria {
  readonly id: string;
  readonly nome: string;
  /** A escolhida, ou `null` quando a categoria está na automática. */
  readonly cor: CorDeCategoria | null;
}

export interface ListaDeCategoriasProps {
  /** Na ordem em que devem aparecer: a página entrega em ordem alfabética. */
  readonly categorias: ReadonlyArray<ItemDeCategoria>;
  readonly trocarCor: typeof trocarCorDaCategoria;
  readonly renomear: typeof renomearCategoria;
}

export function ListaDeCategorias({ categorias, trocarCor, renomear }: ListaDeCategoriasProps) {
  if (categorias.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-[15px] text-ink-muted">
        Nenhuma categoria ainda. Crie a primeira pelo formulário de lançamento: em Lançamentos, “+
        Novo lançamento”, e no campo Categoria, “+ nova”.
      </p>
    );
  }

  return (
    <ul aria-label="Categorias" className="flex flex-col gap-3">
      {categorias.map((categoria) => (
        <LinhaDeCategoria
          key={categoria.id}
          categoria={categoria}
          trocarCor={trocarCor}
          renomear={renomear}
        />
      ))}
    </ul>
  );
}

function LinhaDeCategoria({
  categoria,
  trocarCor,
  renomear,
}: {
  readonly categoria: ItemDeCategoria;
  readonly trocarCor: typeof trocarCorDaCategoria;
  readonly renomear: typeof renomearCategoria;
}) {
  const id = useId();
  const { avisar } = useAvisos();
  const [, iniciar] = useTransition();
  const [exibida, definirExibida] = useOptimistic<{
    readonly nome: string;
    readonly cor: CorDeCategoria | null;
  }>({ nome: categoria.nome, cor: categoria.cor });
  const [erroDeCor, setErroDeCor] = useState("");
  const [renomeando, setRenomeando] = useState(false);
  const [rascunho, setRascunho] = useState(categoria.nome);
  const [erroDeNome, setErroDeNome] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const botaoRenomear = useRef<HTMLButtonElement>(null);
  const abriuAgora = useRef(false);

  const corEmUso = corDaCategoria(exibida);
  const automatica = corAutomatica(exibida.nome);
  const marcada = exibida.cor ?? AUTOMATICA;

  /* O foco vai para o campo quando ele abre, e volta ao botão quando fecha. */
  useEffect(() => {
    if (renomeando) {
      abriuAgora.current = true;
      campo.current?.focus();
    } else if (abriuAgora.current) {
      abriuAgora.current = false;
      botaoRenomear.current?.focus();
    }
  }, [renomeando]);

  function escolherCor(valor: string) {
    const cor = valor === AUTOMATICA ? null : (valor as CorDeCategoria);
    setErroDeCor("");
    iniciar(async () => {
      definirExibida({ nome: exibida.nome, cor });
      const resposta = await trocarCor({ categoriaId: categoria.id, cor });
      if (!resposta.ok) {
        setErroDeCor(resposta.erro.campos?.cor ?? resposta.erro.mensagem);
        return;
      }
      avisar("Cor trocada.");
    });
  }

  function abrirRenomear() {
    setRascunho(categoria.nome);
    setErroDeNome("");
    setRenomeando(true);
  }

  function fecharRenomear() {
    setErroDeNome("");
    setRenomeando(false);
  }

  function salvarNome(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const validado = nomeCategoriaSchema.safeParse(rascunho);
    if (!validado.success) {
      setErroDeNome(validado.error.issues[0]?.message ?? "Informe o nome da categoria.");
      return;
    }
    const nome = validado.data;
    /* O nome igual ao atual não grava nem avisa (Edge Case). */
    if (nome === categoria.nome) {
      fecharRenomear();
      return;
    }
    setErroDeNome("");
    iniciar(async () => {
      /* A cor em uso fica, como o servidor vai gravar. */
      definirExibida({ nome, cor: corEmUso });
      const resposta = await renomear({ categoriaId: categoria.id, nome });
      if (!resposta.ok) {
        setErroDeNome(resposta.erro.campos?.nome ?? resposta.erro.mensagem);
        return;
      }
      fecharRenomear();
      if (resposta.data.renomeada) {
        avisar("Categoria renomeada.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="min-w-0 text-[16px] leading-none">
          <Chip cor={corEmUso}>{exibida.nome}</Chip>
        </h2>
        {renomeando ? null : (
          <button
            ref={botaoRenomear}
            type="button"
            onClick={abrirRenomear}
            className="min-h-11 rounded-pill bg-surface-strong px-4 text-[14px] font-semibold text-ink transition-colors duration-200 hover:bg-line"
          >
            Renomear
          </button>
        )}
      </div>

      {renomeando ? (
        <form
          aria-label={`Renomear ${categoria.nome}`}
          onSubmit={salvarNome}
          noValidate
          className="flex flex-col gap-2 rounded-lg bg-surface-soft p-3"
        >
          <label htmlFor={`${id}-nome`} className="text-[14px] font-medium text-ink">
            Novo nome
          </label>
          <input
            ref={campo}
            id={`${id}-nome`}
            value={rascunho}
            onChange={(evento) => setRascunho(evento.target.value)}
            aria-invalid={erroDeNome === "" ? undefined : true}
            aria-describedby={erroDeNome === "" ? undefined : `${id}-erro-nome`}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink transition-colors duration-200 hover:border-line-strong"
          />
          {erroDeNome === "" ? null : (
            <p
              id={`${id}-erro-nome`}
              role="alert"
              className="flex items-center gap-1.5 text-[14px] font-medium text-negativo"
            >
              <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
              {erroDeNome}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-pill bg-primary px-5 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={fecharRenomear}
              className="min-h-11 rounded-pill px-4 text-[15px] font-semibold text-ink-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] text-ink-muted">Cor de {exibida.nome}</legend>
        <div className="flex flex-wrap gap-x-1">
          {[...CORES_DE_CATEGORIA, AUTOMATICA].map((valor) => {
            const cor = valor === AUTOMATICA ? automatica : (valor as CorDeCategoria);
            const rotulo =
              valor === AUTOMATICA
                ? `Automática (${NOME_DA_COR[automatica]})`
                : NOME_DA_COR[valor as CorDeCategoria];
            const escolhida = marcada === valor;
            return (
              <label key={valor} className="inline-flex min-h-11 min-w-11 items-center">
                <input
                  type="radio"
                  name={`${id}-cor`}
                  value={valor}
                  checked={escolhida}
                  onChange={() => escolherCor(valor)}
                  className="peer sr-only"
                />
                <span
                  className={`inline-flex items-center gap-1 rounded-pill px-3 py-1.5 text-[13px] ring-offset-2 ring-offset-surface peer-checked:font-semibold peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-primary ${CLASSES_DA_COR[cor].pill}`}
                >
                  {escolhida ? <CheckIcon size={13} weight="bold" aria-hidden="true" /> : null}
                  {rotulo}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {erroDeCor === "" ? null : (
        <p role="alert" className="flex items-center gap-1.5 text-[14px] font-medium text-negativo">
          <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
          {erroDeCor}
        </p>
      )}
    </li>
  );
}
