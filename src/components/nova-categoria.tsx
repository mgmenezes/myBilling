"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { type FormEvent, useId, useState, useTransition } from "react";
import type { criarCategoria as criarCategoriaAction } from "@/app/actions/categorias";
import { nomeCategoriaSchema } from "@/application/schemas/categoria.schema";
import { TituloDoPainel } from "./coluna-de-cadastro";

/**
 * Criar uma categoria pelo painel de Cadastros (CADCOL-05).
 *
 * As regras são as de hoje, da action `criarCategoria`: o nome de uma ativa,
 * em qualquer caixa, reaproveita a existente, e o de uma arquivada a reativa.
 * O formulário só diz o que aconteceu, pelo texto do aviso que entrega à aba
 * junto com o id; é a aba que avisa e abre a categoria no painel (ACs 2 a 4).
 *
 * **A regra do nome também roda no navegador** (L-041): vazio ou com mais de
 * 60 caracteres não chega ao servidor, e a mensagem fica junto do campo
 * (AC 5). O campo não tem `maxLength`: cortado pelo navegador, o nome longo
 * iria ao servidor sem a pessoa saber.
 */

export function NovaCategoria({
  criarCategoria,
  aoCriada,
  aoCancelar,
}: {
  readonly criarCategoria: typeof criarCategoriaAction;
  /** O id da categoria e o aviso: "Categoria criada.", "Essa categoria já existia." ou "Categoria reativada.". */
  readonly aoCriada: (id: string, aviso: string) => void;
  readonly aoCancelar: () => void;
}) {
  const id = useId();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [, iniciar] = useTransition();

  function criar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const validado = nomeCategoriaSchema.safeParse(nome);
    if (!validado.success) {
      setErro(validado.error.issues[0]?.message ?? "Informe o nome da categoria.");
      return;
    }
    setErro("");
    iniciar(async () => {
      const resposta = await criarCategoria({ nome: validado.data });
      if (!resposta.ok) {
        setErro(resposta.erro.campos?.nome ?? resposta.erro.mensagem);
        return;
      }
      const { reativada, jaExistia } = resposta.data;
      aoCriada(
        resposta.data.id,
        reativada
          ? "Categoria reativada."
          : jaExistia
            ? "Essa categoria já existia."
            : "Categoria criada.",
      );
    });
  }

  return (
    <>
      <TituloDoPainel>Nova categoria</TituloDoPainel>
      <form aria-label="Nova categoria" onSubmit={criar} noValidate className="flex flex-col gap-2">
        <label htmlFor={`${id}-nome`} className="text-[14px] font-medium text-ink">
          Nome
        </label>
        <input
          id={`${id}-nome`}
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          aria-invalid={erro === "" ? undefined : true}
          aria-describedby={erro === "" ? undefined : `${id}-erro`}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink transition-colors duration-200 hover:border-line-strong aria-[invalid=true]:border-2 aria-[invalid=true]:border-negativo"
        />
        {erro === "" ? null : (
          <p
            id={`${id}-erro`}
            role="alert"
            className="flex items-center gap-1.5 text-[14px] font-medium text-negativo"
          >
            <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
            {erro}
          </p>
        )}
        <p className="text-[13px] text-ink-muted">
          Começa na cor automática, tirada do nome. Depois de criar, ela abre aqui para você trocar
          a cor.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="min-h-11 rounded-pill bg-primary px-5 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
          >
            Criar categoria
          </button>
          <button
            type="button"
            onClick={aoCancelar}
            className="min-h-11 rounded-pill px-4 text-[15px] font-semibold text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}
