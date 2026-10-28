"use client";

import { useId, useState } from "react";
import type { criarMeioDePagamento as criarMeioAction } from "@/app/actions/meios-de-pagamento";
import type { ClasseEntrada, Pendencias } from "@/domain";
import { CadastroDeMeioInline } from "../cadastro-de-meio-inline";
import type { OpcaoDeMeio } from "../form-lancamento-avulso";

/**
 * Passo 2 da importação: o que a planilha não diz (IMP-04).
 *
 * A coluna "Tipo" traz um nome, e o app precisa de um meio de pagamento: um
 * cartão tem dias de ciclo que a planilha não tem. E uma entrada não diz se se
 * repete todo mês nem em que conta cai. Cada pergunta aparece uma vez por
 * nome; o servidor lembra a resposta e não pergunta de novo nas abas
 * seguintes (AC 4 e 5).
 *
 * O que sai daqui são registros simples, pelas chaves normalizadas que vieram
 * nas pendências, porque é o que a prévia e a gravação recebem.
 */

export interface DecisoesDoPasso {
  readonly meios: Record<string, string>;
  readonly entradas: Record<string, { readonly classe: ClasseEntrada; readonly contaId: string }>;
}

export interface PassoPendenciasProps {
  readonly pendencias: Pendencias;
  readonly meios: ReadonlyArray<OpcaoDeMeio>;
  readonly criarMeioDePagamento: typeof criarMeioAction;
  readonly aoConcluir: (decisoes: DecisoesDoPasso) => void;
}

interface EscolhaDeEntrada {
  readonly classe: ClasseEntrada | null;
  readonly contaId: string;
}

const ROTULO_CLASSE = "text-[14px] font-medium text-ink";
const CONTROLE_CLASSE =
  "w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong";
const BOTAO_PRIMARIO =
  "inline-flex min-h-11 w-fit items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo";

const CLASSES: ReadonlyArray<readonly [ClasseEntrada, string]> = [
  ["FIXA", "Fixa, entra todo mês"],
  ["AVULSA", "Avulsa, só neste mês"],
];

/** "Débito, NuBank e Bradesco": a enumeração do pt-BR, com "e" antes do último. */
const LISTA = new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" });

function quantasLinhas(linhas: number): string {
  return linhas === 1 ? "1 linha" : `${linhas} linhas`;
}

/** "NuBank · cartão, fecha dia 25, vence dia 5": o nome sozinho não diz o que o meio é (AC 9). */
function rotuloDoMeio(meio: OpcaoDeMeio): string {
  return meio.detalhe === undefined ? meio.nome : `${meio.nome} · ${meio.detalhe}`;
}

export function PassoPendencias({
  pendencias,
  meios,
  criarMeioDePagamento,
  aoConcluir,
}: PassoPendenciasProps) {
  const id = useId();
  const [listaMeios, setListaMeios] = useState<ReadonlyArray<OpcaoDeMeio>>(meios);
  const [meioPorTipo, setMeioPorTipo] = useState<Record<string, string>>({});
  const [porEntrada, setPorEntrada] = useState<Record<string, EscolhaDeEntrada>>({});

  /* Receita só cai em meio sem fatura (AD-015). */
  const contas = listaMeios.filter((meio) => !meio.geraFatura);

  const decisoes = montarDecisoes();
  /*
   * O que falta, pelo nome. O botão desabilitado sozinho não diz por quê, e
   * numa aba real são seis "Tipo" e sete entradas: o que ficou para trás
   * costuma estar fora da tela.
   */
  const semMeio = pendencias.tiposSemMeio
    .filter(({ chave }) => !(chave in decisoes.meios))
    .map(({ nome }) => nome);
  const semClasse = pendencias.entradasSemClasse
    .filter(({ chave }) => porEntrada[chave]?.classe == null)
    .map(({ nome }) => nome);
  const semConta = pendencias.entradasSemClasse
    .filter(({ chave }) => (porEntrada[chave]?.contaId ?? "") === "")
    .map(({ nome }) => nome);
  const completo = semMeio.length === 0 && semClasse.length === 0 && semConta.length === 0;
  const idDoAviso = `${id}-falta`;

  function montarDecisoes(): DecisoesDoPasso {
    const decididosMeios: Record<string, string> = {};
    for (const { chave } of pendencias.tiposSemMeio) {
      const meio = meioPorTipo[chave];
      if (meio !== undefined && meio !== "") {
        decididosMeios[chave] = meio;
      }
    }
    const decididasEntradas: Record<string, { classe: ClasseEntrada; contaId: string }> = {};
    for (const { chave } of pendencias.entradasSemClasse) {
      const escolha = porEntrada[chave];
      if (escolha?.classe != null && escolha.contaId !== "") {
        decididasEntradas[chave] = { classe: escolha.classe, contaId: escolha.contaId };
      }
    }
    return { meios: decididosMeios, entradas: decididasEntradas };
  }

  function escolherEntrada(chave: string, mudanca: Partial<EscolhaDeEntrada>): void {
    setPorEntrada((atual) => ({
      ...atual,
      [chave]: { classe: null, contaId: "", ...atual[chave], ...mudanca },
    }));
  }

  function acrescentarMeio(meio: OpcaoDeMeio): void {
    setListaMeios((atual) => (atual.some(({ id }) => id === meio.id) ? atual : [...atual, meio]));
  }

  return (
    <div className="flex flex-col gap-6">
      {pendencias.tiposSemMeio.length === 0 ? null : (
        <section aria-labelledby={`${id}-meios`} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 id={`${id}-meios`} className="text-[17px] font-semibold">
              Meios de pagamento
            </h3>
            <p className="text-[14px] text-ink-muted">
              Ligue cada nome da coluna Tipo a um meio do app. A ligação vale para as próximas abas.
            </p>
          </div>

          {pendencias.tiposSemMeio.map((tipo, indice) => {
            const idDoControle = `${id}-tipo-${indice}`;
            return (
              <CadastroDeMeioInline
                key={tipo.chave}
                rotulo={`${tipo.nome} (${quantasLinhas(tipo.linhas)})`}
                idDoControle={idDoControle}
                nomeInicial={tipo.nome}
                rotuloDoAtalho="+ cadastrar"
                criarMeioDePagamento={criarMeioDePagamento}
                aoCriado={(criado, detalhe) => {
                  acrescentarMeio({ ...criado, detalhe });
                  setMeioPorTipo((atual) => ({ ...atual, [tipo.chave]: criado.id }));
                }}
              >
                <select
                  id={idDoControle}
                  className={CONTROLE_CLASSE}
                  value={meioPorTipo[tipo.chave] ?? ""}
                  onChange={(evento) =>
                    setMeioPorTipo((atual) => ({ ...atual, [tipo.chave]: evento.target.value }))
                  }
                >
                  <option value="">Escolha o meio</option>
                  {listaMeios.map((meio) => (
                    <option key={meio.id} value={meio.id}>
                      {rotuloDoMeio(meio)}
                    </option>
                  ))}
                </select>
              </CadastroDeMeioInline>
            );
          })}
        </section>
      )}

      {pendencias.entradasSemClasse.length === 0 ? null : (
        <section aria-labelledby={`${id}-entradas`} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 id={`${id}-entradas`} className="text-[17px] font-semibold">
              Entradas
            </h3>
            <p className="text-[14px] text-ink-muted">
              Diga se cada entrada se repete todo mês e em que conta o dinheiro cai.
            </p>
          </div>

          {pendencias.entradasSemClasse.map((item, indice) => {
            const escolha = porEntrada[item.chave];
            const idDaConta = `${id}-conta-${indice}`;
            return (
              <fieldset
                key={item.chave}
                className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
              >
                <legend className="px-1 text-[15px] font-semibold text-ink">{item.nome}</legend>
                <div className="flex flex-wrap gap-4">
                  {CLASSES.map(([classe, rotulo]) => (
                    <label key={classe} className="flex items-center gap-2 text-[15px] text-ink">
                      <input
                        type="radio"
                        name={`${id}-classe-${indice}`}
                        value={classe}
                        checked={escolha?.classe === classe}
                        onChange={() => escolherEntrada(item.chave, { classe })}
                      />
                      {rotulo}
                    </label>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  <label className={ROTULO_CLASSE} htmlFor={idDaConta}>
                    Cai em
                  </label>
                  <select
                    id={idDaConta}
                    className={CONTROLE_CLASSE}
                    value={escolha?.contaId ?? ""}
                    onChange={(evento) =>
                      escolherEntrada(item.chave, { contaId: evento.target.value })
                    }
                  >
                    <option value="">Escolha a conta</option>
                    {contas.map((meio) => (
                      <option key={meio.id} value={meio.id}>
                        {rotuloDoMeio(meio)}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>
            );
          })}
        </section>
      )}

      {completo ? null : (
        <div
          id={idDoAviso}
          role="status"
          className="flex flex-col gap-1 rounded-lg border border-line px-4 py-3 text-[14px] text-ink-muted"
        >
          <p className="font-semibold text-ink">Para continuar, falta:</p>
          <ul className="list-disc pl-5">
            {semMeio.length === 0 ? null : <li>{`escolher o meio de ${LISTA.format(semMeio)}`}</li>}
            {semClasse.length === 0 ? null : (
              <li>{`dizer se é fixa ou avulsa: ${LISTA.format(semClasse)}`}</li>
            )}
            {semConta.length === 0 ? null : (
              <li>{`escolher onde cai: ${LISTA.format(semConta)}`}</li>
            )}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={!completo}
        aria-describedby={completo ? undefined : idDoAviso}
        onClick={() => aoConcluir(decisoes)}
        className={BOTAO_PRIMARIO}
      >
        Continuar
      </button>
    </div>
  );
}
