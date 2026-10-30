"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import type {
  importarPlanilha as importarPlanilhaAction,
  PreviaParaATela,
  previaDaPlanilha as previaDaPlanilhaAction,
} from "@/app/actions/importacao";
import type { criarMeioDePagamento as criarMeioAction } from "@/app/actions/meios-de-pagamento";
import type { ResumoDaImportacao } from "@/application/importacao/gravar-importacao/handler";
import type { Competencia } from "@/domain";
import { DialogoDeCadastro } from "../dialogo-de-cadastro";
import type { OpcaoDeMeio } from "../form-lancamento-avulso";
import { type ArquivoEscolhido, PassoArquivo } from "./passo-arquivo";
import { PassoConferencia } from "./passo-conferencia";
import { type DecisoesDoPasso, PassoPendencias } from "./passo-pendencias";
import { ResultadoImportacao } from "./resultado-importacao";

/**
 * A importação de uma aba, num diálogo aberto pela Visão geral (IMP-08).
 *
 * Passo a passo, e o passo 2 só aparece quando há o que decidir (IMP-04,
 * AC 6): arquivo e mês, o que precisa de você, conferência, resultado. O
 * diálogo guarda o que cada passo produziu e é quem fala com o servidor; os
 * passos só mostram e devolvem.
 *
 * **A prévia é pedida de novo depois do passo 2.** Com pendência aberta o
 * servidor não planeja as linhas: devolve só as pendências. Com as decisões,
 * devolve a conferência e o destino de cada linha. A gravação manda o mesmo
 * arquivo e as mesmas decisões, e o servidor recalcula tudo (IMP-06, AC 6).
 *
 * O `<dialog>` é o de `DialogoDeCadastro`: nativo, por `showModal`, com o
 * conteúdo montado ao fechar. Fechar no meio e reabrir volta ao mesmo passo.
 */

export interface DialogoImportacaoProps {
  readonly nomeDaPessoa: string;
  readonly competenciaEsperada: Competencia | null;
  readonly meios: ReadonlyArray<OpcaoDeMeio>;
  readonly previaDaPlanilha: typeof previaDaPlanilhaAction;
  readonly importarPlanilha: typeof importarPlanilhaAction;
  readonly criarMeioDePagamento: typeof criarMeioAction;
}

type Passo =
  | { readonly nome: "ARQUIVO" }
  | { readonly nome: "PENDENCIAS"; readonly previa: PreviaParaATela }
  | { readonly nome: "CONFERENCIA"; readonly previa: PreviaParaATela }
  | { readonly nome: "RESULTADO"; readonly resumo: ResumoDaImportacao };

const SEM_DECISOES: DecisoesDoPasso = { meios: {}, entradas: {} };

const ROTULOS_DOS_PASSOS = ["Arquivo e mês", "O que precisa de você", "Conferência"] as const;

function temPendencia(previa: PreviaParaATela): boolean {
  return (
    previa.pendencias.tiposSemMeio.length > 0 || previa.pendencias.entradasSemClasse.length > 0
  );
}

export function DialogoImportacao({
  nomeDaPessoa,
  competenciaEsperada,
  meios,
  previaDaPlanilha,
  importarPlanilha,
  criarMeioDePagamento,
}: DialogoImportacaoProps) {
  const [passo, setPasso] = useState<Passo>({ nome: "ARQUIVO" });
  const [arquivo, setArquivo] = useState<ArquivoEscolhido | null>(null);
  const [decisoes, setDecisoes] = useState<DecisoesDoPasso>(SEM_DECISOES);
  const [erro, setErro] = useState("");
  /*
   * Depois de gravar, a aba esperada é a que o servidor acabou de dizer. A
   * página também a recalcula, mas só quando a rota aberta é a do mês
   * importado; importar a partir de outro mês não a revalidaria.
   */
  const [esperadaDepoisDeGravar, setEsperadaDepoisDeGravar] = useState<Competencia | null>(null);
  /*
   * Ler e gravar são transições separadas. Com uma só, a conferência nascia
   * dentro da transição da leitura, ainda pendente, e o botão dizia
   * "Importando…" antes de qualquer gravação começar.
   */
  const [lendo, iniciarLeitura] = useTransition();
  const [gravando, iniciarGravacao] = useTransition();

  function pedirPrevia(escolhido: ArquivoEscolhido, comDecisoes: DecisoesDoPasso): void {
    setErro("");
    iniciarLeitura(async () => {
      const resposta = await previaDaPlanilha({ ...escolhido, decisoes: comDecisoes });
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      setPasso(
        temPendencia(resposta.data)
          ? { nome: "PENDENCIAS", previa: resposta.data }
          : { nome: "CONFERENCIA", previa: resposta.data },
      );
    });
  }

  function gravar(confirmouDivergencia: boolean): void {
    if (arquivo === null) {
      return;
    }
    setErro("");
    iniciarGravacao(async () => {
      const resposta = await importarPlanilha({ ...arquivo, decisoes, confirmouDivergencia });
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      setEsperadaDepoisDeGravar(resposta.data.proxima);
      setPasso({ nome: "RESULTADO", resumo: resposta.data });
    });
  }

  function recomecar(): void {
    setPasso({ nome: "ARQUIVO" });
    setArquivo(null);
    setDecisoes(SEM_DECISOES);
    setErro("");
  }

  const indiceDoPasso =
    passo.nome === "ARQUIVO"
      ? 0
      : passo.nome === "PENDENCIAS"
        ? 1
        : passo.nome === "CONFERENCIA"
          ? 2
          : null;

  return (
    <DialogoDeCadastro
      rotuloDoBotao="Importar planilha"
      titulo="Importar planilha"
      variante="discreto"
    >
      <div className="flex flex-col gap-5">
        {indiceDoPasso === null ? null : (
          <ol aria-label="Passos da importação" className="flex flex-wrap gap-x-4 gap-y-1">
            {ROTULOS_DOS_PASSOS.map((rotulo, indice) => (
              <li
                key={rotulo}
                aria-current={indice === indiceDoPasso ? "step" : undefined}
                className={`text-[13px] ${
                  indice === indiceDoPasso ? "font-semibold text-ink" : "text-ink-soft"
                }`}
              >
                {`${indice + 1}. ${rotulo}`}
              </li>
            ))}
          </ol>
        )}

        {passo.nome === "ARQUIVO" ? (
          <PassoArquivo
            nomeDaPessoa={nomeDaPessoa}
            competenciaEsperada={esperadaDepoisDeGravar ?? competenciaEsperada}
            aoContinuar={(escolhido) => {
              setArquivo(escolhido);
              setDecisoes(SEM_DECISOES);
              pedirPrevia(escolhido, SEM_DECISOES);
            }}
          />
        ) : null}

        {passo.nome === "PENDENCIAS" ? (
          <PassoPendencias
            pendencias={passo.previa.pendencias}
            meios={meios}
            criarMeioDePagamento={criarMeioDePagamento}
            aoConcluir={(decididas) => {
              setDecisoes(decididas);
              if (arquivo !== null) {
                pedirPrevia(arquivo, decididas);
              }
            }}
          />
        ) : null}

        {passo.nome === "CONFERENCIA" ? (
          <PassoConferencia
            previa={passo.previa}
            gravando={gravando}
            erro={erro === "" ? null : erro}
            aoImportar={gravar}
          />
        ) : null}

        {passo.nome === "RESULTADO" ? (
          <ResultadoImportacao resumo={passo.resumo} aoImportarOutra={recomecar} />
        ) : null}

        {passo.nome !== "CONFERENCIA" && lendo ? (
          <p role="status" className="text-[14px] text-ink-muted">
            Lendo a aba no servidor…
          </p>
        ) : null}

        {passo.nome !== "CONFERENCIA" && erro !== "" ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-negativo px-4 py-3 text-[14px] font-medium text-negativo"
          >
            <WarningCircleIcon
              size={18}
              weight="fill"
              aria-hidden="true"
              className="mt-px shrink-0"
            />
            {erro}
          </p>
        ) : null}

        {passo.nome === "PENDENCIAS" || passo.nome === "CONFERENCIA" ? (
          <button
            type="button"
            onClick={recomecar}
            className="min-h-11 w-fit rounded-pill px-4 text-[15px] font-semibold text-ink-muted hover:text-ink"
          >
            Escolher outro arquivo
          </button>
        ) : null}
      </div>
    </DialogoDeCadastro>
  );
}
