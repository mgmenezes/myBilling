"use client";

import { CheckIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { type FormEvent, useId, useOptimistic, useState, useTransition } from "react";
import type { renomearCategoria, trocarCorDaCategoria } from "@/app/actions/categorias";
import { nomeCategoriaSchema } from "@/application/schemas/categoria.schema";
import { CORES_DE_CATEGORIA, type CorDeCategoria, corAutomatica, corDaCategoria } from "@/domain";
import { useAvisos } from "./avisos";
import { TituloDoPainel } from "./coluna-de-cadastro";
import { CLASSES_DA_COR, NOME_DA_COR } from "./cor-de-categoria";
import { OndeAparece } from "./onde-aparece";
import type { ItemDeCategoria } from "./tabela-de-categorias";
import { Chip } from "./ui";

/**
 * A categoria aberta no painel: o nome, as onze cores e onde ela aparece
 * (CADCOL-04, ACs 2 a 12).
 *
 * É a lógica do cartão da antiga `ListaDeCategorias` (COR-04), que saiu com
 * esta tela, sem o cartão e sem o "Renomear": o campo "Nome" fica sempre aberto, com "Salvar", e fechar o
 * painel já descarta o que foi digitado (CADCOL-04, AC 2).
 *
 * **A cor grava ao escolher**, sem botão de salvar: onze radios num
 * `fieldset` "Cor de <nome>", as dez cores e "Automática", cada um com o nome
 * escrito por cima da pill tingida, porque a cor nunca vem sozinha. A
 * "Automática" diz a cor que o nome dá.
 *
 * **Estado otimista, só no painel.** A pill do título e a opção marcada mudam
 * na hora (CADCOL-04, AC 4); a pill da linha muda quando a lista nova chega,
 * na mesma resposta da action (AC 5). Quando a gravação termina, o painel
 * volta às props: depois do sucesso elas já são as novas; depois de uma
 * recusa, as de antes, e é assim que a cor ou o nome voltam sozinhos, com o
 * motivo escrito no painel e nenhum aviso (AC 8).
 *
 * **Renomear mantém a cor**, inclusive no otimista: o servidor grava o nome
 * novo com a cor em uso, e a pill não pisca na automática do nome novo.
 *
 * **Alvo de 44 × 44 em toda opção** (CADCOL-10, AC 7). O alvo é o `<label>`
 * inteiro; o radio de verdade fica em `sr-only`, e o anel de foco vem dele
 * pelo `peer`.
 */

/** O valor do radio "Automática": o radio não tem valor nulo. */
const AUTOMATICA = "automatica";

export function DetalheDaCategoria({
  categoria,
  competencia,
  rotuloDaCompetencia,
  trocarCor,
  renomear,
}: {
  readonly categoria: ItemDeCategoria;
  /** O mês aberto, `'YYYY-MM'`, para o link de Lançamentos. */
  readonly competencia: string;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
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
  const [rascunho, setRascunho] = useState(categoria.nome);
  const [erroDeNome, setErroDeNome] = useState("");

  const corEmUso = corDaCategoria(exibida);
  const automatica = corAutomatica(exibida.nome);
  const marcada = exibida.cor ?? AUTOMATICA;

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

  function salvarNome(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const validado = nomeCategoriaSchema.safeParse(rascunho);
    if (!validado.success) {
      setErroDeNome(validado.error.issues[0]?.message ?? "Informe o nome da categoria.");
      return;
    }
    const nome = validado.data;
    setErroDeNome("");
    /* O nome igual ao gravado não grava nem avisa (CADCOL-04, AC 9). */
    if (nome === categoria.nome) {
      return;
    }
    iniciar(async () => {
      /* A cor em uso fica, como o servidor vai gravar. */
      definirExibida({ nome, cor: corEmUso });
      const resposta = await renomear({ categoriaId: categoria.id, nome });
      if (!resposta.ok) {
        setErroDeNome(resposta.erro.campos?.nome ?? resposta.erro.mensagem);
        return;
      }
      setRascunho(nome);
      if (resposta.data.renomeada) {
        avisar("Categoria renomeada.");
      }
    });
  }

  return (
    <>
      <TituloDoPainel>
        <Chip cor={corEmUso}>{exibida.nome}</Chip>
      </TituloDoPainel>

      <form
        aria-label={`Renomear ${categoria.nome}`}
        onSubmit={salvarNome}
        noValidate
        className="flex flex-col gap-2"
      >
        <label htmlFor={`${id}-nome`} className="text-[14px] font-medium text-ink">
          Nome
        </label>
        <input
          id={`${id}-nome`}
          value={rascunho}
          onChange={(evento) => setRascunho(evento.target.value)}
          aria-invalid={erroDeNome === "" ? undefined : true}
          aria-describedby={erroDeNome === "" ? undefined : `${id}-erro-nome`}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink transition-colors duration-200 hover:border-line-strong aria-[invalid=true]:border-2 aria-[invalid=true]:border-negativo"
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
        <button
          type="submit"
          className="min-h-11 w-fit rounded-pill bg-primary px-5 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
        >
          Salvar
        </button>
      </form>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[14px] font-medium text-ink">Cor de {exibida.nome}</legend>
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
        {erroDeCor === "" ? null : (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-[14px] font-medium text-negativo"
          >
            <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
            {erroDeCor}
          </p>
        )}
      </fieldset>

      <OndeAparece
        genero="ela"
        fixos={categoria.fixos}
        lancamentos={categoria.lancamentos}
        rotuloDaCompetencia={rotuloDaCompetencia}
        href={`/${competencia}/lancamentos?categoriaId=${categoria.id}`}
      />
    </>
  );
}
