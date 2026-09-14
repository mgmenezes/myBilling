"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useId, useRef, useState, useTransition } from "react";
import type { ResultadoAction } from "@/lib/erros";

/**
 * Criar um cadastro sem sair do formulário que precisava dele.
 *
 * É o padrão de "percebi que falta, crio aqui, continuo de onde estava" —
 * usado hoje por categoria e por meio de pagamento, e pronto para pessoa. Ele
 * existe porque a alternativa era duplicar, por cadastro, o mesmo par de
 * rótulo e atalho, o mesmo bloco que abre, o mesmo estado de gravação e erro e
 * a mesma interceptação de `Enter`. Duas cópias divergem; a terceira é
 * garantida.
 *
 * **O atalho fica fora do seletor, e não como uma opção dentro dele.** Num
 * `<select>` nativo, escolher uma opção que não é um valor obriga a devolver o
 * controle ao valor anterior na mão, e a lista fecha antes de a pessoa
 * entender o que aconteceu. Aqui o seletor continua sendo só um seletor, e a
 * ação fica visível sem precisar abrir a lista — que é como ela é encontrada.
 *
 * O componente não conhece cadastro nenhum: recebe os campos como `children` e
 * a gravação como função. Quem sabe o que é uma categoria é quem o usa.
 */

const ROTULO_CLASSE = "text-[14px] font-medium text-ink";

export interface CadastroInlineProps<T> {
  /** O rótulo do campo que este cadastro alimenta, por exemplo "Categoria". */
  readonly rotulo: string;
  /** O `id` do controle que o rótulo endereça. */
  readonly idDoControle: string;
  /** O texto do atalho. Existe como prop por concordância: "+ nova categoria",
   *  "+ novo meio de pagamento". Um texto fixo erraria o gênero em metade dos
   *  cadastros, e errar concordância no próprio idioma da interface é o tipo
   *  de detalhe que faz o app parecer traduzido. */
  readonly rotuloDoAtalho: string;
  /** Nome do grupo para leitor de tela: "Nova categoria". Não aparece na tela —
   *  quem aparece são os rótulos dos campos, renderizados por `campos`. */
  readonly descricaoDoGrupo: string;
  /** Texto de apoio abaixo dos campos. Some quando não faz falta. */
  readonly ajuda?: ReactNode;
  /** O seletor em si, renderizado abaixo do rótulo. */
  readonly children: ReactNode;
  /** Os campos do formulário de criação. Recebe o `id` base para compor os seus. */
  readonly campos: (id: string) => ReactNode;
  /** Monta o payload a partir do estado dos campos. `null` cancela o envio. */
  readonly aoCriar: () => Promise<ResultadoAction<T>>;
  /** Chamado com o resultado bem-sucedido. É quem seleciona o item criado. */
  readonly aoCriado: (criado: T) => void;
  /** Validação local antes de chamar o servidor. Devolve a mensagem, ou `null`. */
  readonly validar: () => string | null;
  /** Limpa os campos ao abrir e ao fechar. */
  readonly aoLimpar: () => void;
}

export function CadastroInline<T>({
  rotulo,
  idDoControle,
  rotuloDoAtalho,
  descricaoDoGrupo,
  ajuda,
  children,
  campos,
  aoCriar,
  aoCriado,
  validar,
  aoLimpar,
}: CadastroInlineProps<T>) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [gravando, iniciar] = useTransition();
  const bloco = useRef<HTMLFieldSetElement>(null);

  /*
   * Foco movido na transição, e não por `autoFocus`.
   *
   * `autoFocus` rouba o foco quando o elemento entra na página, o que numa
   * carga inicial joga a pessoa para o meio do formulário sem ela ter pedido —
   * é por isso que o linter o proíbe. Aqui o bloco só nasce depois de um
   * clique explícito, e não mover o foco obrigaria a procurar com o mouse o
   * campo que se acabou de abrir.
   */
  useEffect(() => {
    if (aberto) {
      bloco.current?.querySelector("input")?.focus();
    }
  }, [aberto]);

  function abrir() {
    aoLimpar();
    setErro("");
    setAberto(true);
  }

  function fechar() {
    aoLimpar();
    setErro("");
    setAberto(false);
  }

  function submeter() {
    const invalido = validar();
    if (invalido !== null) {
      setErro(invalido);
      return;
    }

    setErro("");
    iniciar(async () => {
      const resposta = await aoCriar();
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      aoCriado(resposta.data);
      fechar();
    });
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label className={ROTULO_CLASSE} htmlFor={idDoControle}>
          {rotulo}
        </label>
        {aberto ? null : (
          <button
            type="button"
            onClick={abrir}
            className="min-h-6 text-[13px] font-semibold text-primary-texto hover:underline"
          >
            {rotuloDoAtalho}
          </button>
        )}
      </div>

      {children}

      {aberto ? (
        /*
         * `<fieldset>`, e não `<div>`: é o elemento nativo para um conjunto de
         * controles relacionados, e é o que permite ouvir o `Enter` aqui sem
         * inventar interatividade num elemento estático.
         *
         * `Enter` em qualquer campo daqui criaria o cadastro **e** submeteria o
         * formulário que envolve tudo isso, porque o bloco vive dentro do
         * `<form>`. Interceptar no contêiner é o que faz o atalho óbvio não
         * gravar uma compra pela metade.
         */
        <fieldset
          ref={bloco}
          className="mt-2 flex flex-col gap-2 rounded-lg bg-surface-soft p-3"
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              submeter();
            }
          }}
        >
          {/* O grupo precisa de nome para leitor de tela; na tela quem orienta
              são os rótulos dos campos, que já estão logo abaixo. */}
          <legend className="sr-only">{descricaoDoGrupo}</legend>
          {campos(id)}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submeter}
              disabled={gravando}
              className="min-h-11 rounded-pill bg-primary px-5 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo"
            >
              {gravando ? "Criando…" : "Criar"}
            </button>
            <button
              type="button"
              onClick={fechar}
              className="min-h-11 rounded-pill px-4 text-[15px] font-semibold text-ink-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>

          {ajuda === undefined ? null : <p className="text-[13px] text-ink-muted">{ajuda}</p>}

          {erro === "" ? null : (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-[14px] font-medium text-negativo"
            >
              <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
              {erro}
            </p>
          )}
        </fieldset>
      ) : null}
    </div>
  );
}
