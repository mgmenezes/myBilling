"use client";

import { MAX_NOME_MEIO, TIPOS_DE_MEIO } from "@/application/schemas/meio-pagamento.schema";

/**
 * Os campos de um meio de pagamento: o nome, o tipo e, só no cartão, os dois
 * dias do ciclo (CADCOL-07, ACs 2 a 4; CADCOL-08, ACs 1 e 2).
 *
 * Saíram de `CadastroDeMeioInline`, movidos e não copiados, para o painel de
 * Cadastros criar e editar meio com os mesmos campos do cadastro inline. Sem
 * eles, o painel seria a terceira cópia; os campos de `form-compra.tsx` e
 * `form-recorrencia.tsx` continuam duplicados, como já estava registrado.
 *
 * **Controlado.** Quem usa guarda os valores, em texto, como a pessoa digitou,
 * e decide o que validar e enviar. Cada mudança chega em `aoMudar` só com o
 * campo que mudou.
 *
 * **O tipo, na edição, é texto.** Com `tipos` igual a `null`, não há seletor
 * nem radio de tipo: trocar conta por cartão mudaria `gera_fatura` e
 * reclassificaria os lançamentos já feitos (CADCOL-07, AC 4). A frase diz o
 * que fazer para trocar.
 */

export type TipoDeMeio = (typeof TIPOS_DE_MEIO)[number]["valor"];

export interface ValoresDoMeio {
  readonly nome: string;
  readonly tipo: TipoDeMeio;
  /** Em texto, como digitado; só vale no cartão. */
  readonly diaFechamento: string;
  readonly diaVencimento: string;
}

const ROTULO_CLASSE = "text-[14px] font-medium text-ink";
const CONTROLE_CLASSE =
  "w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong " +
  "aria-[invalid=true]:border-negativo aria-[invalid=true]:border-2";

export function CamposDoMeio({
  idBase,
  valores,
  aoMudar,
  rotuloDoNome,
  tipos,
  diasPelaLargura = false,
}: {
  /** Base dos `id` dos campos. */
  readonly idBase: string;
  readonly valores: ValoresDoMeio;
  readonly aoMudar: (parcial: Partial<ValoresDoMeio>) => void;
  /** "Nome do novo meio de pagamento" no inline; "Nome" no painel. */
  readonly rotuloDoNome: string;
  /** Os tipos que o seletor oferece, na ordem do app; `null` na edição, que mostra o tipo em texto. */
  readonly tipos: ReadonlyArray<TipoDeMeio> | null;
  /** Os dois dias ficam lado a lado pela largura do contêiner (`@md`, 448 px),
   *  e não pela da janela (`sm`). Só vale dentro de um `@container` (FPC-01). */
  readonly diasPelaLargura?: boolean;
}) {
  const rotuloDoTipo = TIPOS_DE_MEIO.find((opcao) => opcao.valor === valores.tipo)?.rotulo;

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className={ROTULO_CLASSE} htmlFor={`${idBase}-nome-meio`}>
          {rotuloDoNome}
        </label>
        <input
          id={`${idBase}-nome-meio`}
          className={CONTROLE_CLASSE}
          value={valores.nome}
          onChange={(e) => aoMudar({ nome: e.target.value })}
          maxLength={MAX_NOME_MEIO}
        />
      </div>
      {tipos === null ? (
        <div className="flex flex-col gap-1">
          <p className={ROTULO_CLASSE}>Tipo</p>
          <p className="text-[15px] text-ink">{rotuloDoTipo}</p>
          <p className="text-[13px] text-ink-muted">
            O tipo não muda. Para trocar, cadastre outro meio.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className={ROTULO_CLASSE} htmlFor={`${idBase}-tipo-meio`}>
            Tipo
          </label>
          <select
            id={`${idBase}-tipo-meio`}
            className={CONTROLE_CLASSE}
            value={valores.tipo}
            onChange={(e) => aoMudar({ tipo: e.target.value as TipoDeMeio })}
          >
            {TIPOS_DE_MEIO.filter((opcao) => tipos.includes(opcao.valor)).map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>
      )}
      {valores.tipo === "CARTAO_CREDITO" ? (
        <div className={`flex flex-col gap-2 ${diasPelaLargura ? "@md:flex-row" : "sm:flex-row"}`}>
          <div className="flex w-full flex-col gap-1">
            <label className={ROTULO_CLASSE} htmlFor={`${idBase}-fechamento`}>
              Dia de fechamento
            </label>
            <input
              id={`${idBase}-fechamento`}
              className={CONTROLE_CLASSE}
              inputMode="numeric"
              value={valores.diaFechamento}
              onChange={(e) => aoMudar({ diaFechamento: e.target.value })}
              placeholder="25"
            />
          </div>
          <div className="flex w-full flex-col gap-1">
            <label className={ROTULO_CLASSE} htmlFor={`${idBase}-vencimento`}>
              Dia de vencimento
            </label>
            <input
              id={`${idBase}-vencimento`}
              className={CONTROLE_CLASSE}
              inputMode="numeric"
              value={valores.diaVencimento}
              onChange={(e) => aoMudar({ diaVencimento: e.target.value })}
              placeholder="5"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
