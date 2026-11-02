import { planoDaCompra } from "@/application/compras/plano-da-compra";
import { apresentarSaldo } from "@/components/apresentar-saldo";
import { TEXTO_SEM_VALOR, textoDoVeredito, textoEnxergaAte } from "@/components/texto-do-veredito";
import {
  addMeses,
  type Cents,
  type Competencia,
  dataParaCompetencia,
  menorParcelamentoQueCabe,
  parseBRL,
  type SaldoDoMes,
  simularCompra,
} from "@/domain";
import { mensagemDoErro } from "@/lib/erros";
import { formatarCompetencia, nomeDoMes } from "@/lib/formatar";
import { SALDOS_DA_CASA } from "./casa-inventada";

/**
 * O simulador "Dá pra comprar?" da landing (JANO-02, JANO-03).
 *
 * **A conta é a do app, não uma cópia.** Este arquivo é a entrada do pacote
 * `site/simulador.js` (`pnpm site:construir`): a resposta sai de
 * `planoDaCompra`, `simularCompra` e `menorParcelamentoQueCabe`, e as frases de
 * `texto-do-veredito.ts`, na mesma sequência do componente `Simulador`
 * (`src/components/simulador.tsx`). Só a casa é outra: inventada, de doze
 * meses a partir do mês corrente.
 *
 * O relógio entra num lugar só, `competenciaCorrente`, pelo `dataParaCompetencia`
 * do domínio com o fuso explícito (AGENTS.md, regra 3).
 */

export { SALDOS_DA_CASA };

export const FUSO = "America/Sao_Paulo";

/** O maior saldo da casa: a régua das barras do gráfico. */
const MAIOR_SALDO = Math.max(...SALDOS_DA_CASA);
const ALTURA_DAS_BARRAS = 120;
const ALTURA_MAXIMA_DO_QUE_FALTA = 30;
const ALTURA_MINIMA_DO_QUE_FALTA = 8;

export interface Coluna {
  readonly competencia: Competencia;
  /** "nov", "dez", "jan": o nome do mês em três letras. */
  readonly mes: string;
  readonly antes: number;
  readonly parcela: number;
  readonly depois: number;
  /** O mês fica no vermelho depois da compra. */
  readonly vermelho: boolean;
}

export type Resposta =
  | { readonly tipo: "SEM_VALOR"; readonly mensagem: string }
  | { readonly tipo: "ERRO"; readonly mensagem: string }
  | {
      readonly tipo: "RESPOSTA";
      readonly cabe: boolean;
      readonly menorQueCabe: number | null;
      readonly veredito: string;
      readonly enxergaAte: string | null;
      /** "Março de 2027: vai faltar R$ 25,00." para cada mês no vermelho. */
      readonly detalhe: string;
      readonly parcelas: ReadonlyArray<number>;
      readonly colunas: ReadonlyArray<Coluna>;
    };

/** A competência de agora no fuso da casa. */
export function competenciaCorrente(agoraISO: string): Competencia {
  const competencia = dataParaCompetencia(agoraISO, FUSO);
  if (!competencia.ok) {
    throw new Error("não foi possível resolver o mês corrente");
  }
  return competencia.value;
}

/** Os doze meses da casa, a partir de `inicio`. */
export function horizonteDaCasa(inicio: Competencia): SaldoDoMes[] {
  return SALDOS_DA_CASA.map((saldo, indice) => ({
    competencia: addMeses(inicio, indice),
    saldo: saldo as Cents,
  }));
}

function inteiro(texto: string): number {
  const valor = Number.parseInt(texto, 10);
  return Number.isNaN(valor) ? Number.NaN : valor;
}

function mesCurto(competencia: Competencia): string {
  return nomeDoMes(competencia).slice(0, 3).toLowerCase();
}

export function responder({
  valor,
  vezes,
  horizonte,
}: {
  readonly valor: string;
  readonly vezes: string;
  readonly horizonte: ReadonlyArray<SaldoDoMes>;
}): Resposta {
  const primeiro = horizonte[0];
  if (primeiro === undefined) {
    return { tipo: "ERRO", mensagem: mensagemDoErro("HORIZONTE_INVALIDO") };
  }
  const inicio = primeiro.competencia;
  const valorEmCentavos = parseBRL(valor);
  if (!valorEmCentavos.ok) {
    return { tipo: "SEM_VALOR", mensagem: TEXTO_SEM_VALOR };
  }
  const qtdParcelas = inteiro(vezes);
  const plano = planoDaCompra({
    modo: "TOTAL",
    valorCentavos: valorEmCentavos.value,
    qtdParcelas,
    parcelaInicial: 1,
    competenciaInicial: inicio,
    politicaResiduo: "PRIMEIRAS",
  });
  if (!plano.ok) {
    return { tipo: "ERRO", mensagem: mensagemDoErro(plano.error.code) };
  }
  const simulacao = simularCompra(horizonte, plano.value.plano);
  if (!simulacao.ok) {
    return { tipo: "ERRO", mensagem: mensagemDoErro(simulacao.error.code) };
  }
  const menorQueCabe = simulacao.value.cabe
    ? null
    : menorParcelamentoQueCabe(horizonte, {
        valorTotal: plano.value.plano.valorTotal,
        competenciaPrimeiraParcela: inicio,
        politicaResiduo: "PRIMEIRAS",
      });

  const parcelaPorMes = new Map(
    simulacao.value.linhas.map((linha) => [linha.competencia, linha.parcela]),
  );
  const colunas = horizonte.map((mes): Coluna => {
    const parcela = parcelaPorMes.get(mes.competencia) ?? 0;
    const depois = mes.saldo - parcela;
    return {
      competencia: mes.competencia,
      mes: mesCurto(mes.competencia),
      antes: mes.saldo,
      parcela,
      depois,
      vermelho: depois < 0,
    };
  });
  const detalhe = colunas
    .filter((coluna) => coluna.vermelho)
    .map((coluna) => {
      const saldo = apresentarSaldo(coluna.depois as Cents);
      return `${formatarCompetencia(coluna.competencia)}: ${saldo.rotulo.toLowerCase()} ${saldo.valor}.`;
    })
    .join(" ");

  return {
    tipo: "RESPOSTA",
    cabe: simulacao.value.cabe,
    menorQueCabe,
    veredito: textoDoVeredito({
      simulacao: simulacao.value,
      qtdParcelas,
      menorQueCabe,
      competenciaAberta: inicio,
    }),
    enxergaAte: textoEnxergaAte(simulacao.value),
    detalhe,
    parcelas: plano.value.plano.parcelas.map((parcela) => parcela.valor),
    colunas,
  };
}

function altura(centavos: number): number {
  return Math.max(0, Math.round((centavos / MAIOR_SALDO) * ALTURA_DAS_BARRAS));
}

function alturaDoQueFalta(centavos: number): number {
  if (centavos >= 0) {
    return 0;
  }
  const proporcional = Math.round((-centavos / MAIOR_SALDO) * ALTURA_DAS_BARRAS * 3);
  return Math.min(ALTURA_MAXIMA_DO_QUE_FALTA, Math.max(ALTURA_MINIMA_DO_QUE_FALTA, proporcional));
}

function elemento(documento: Document, tag: string, classe: string): HTMLElement {
  const el = documento.createElement(tag);
  el.className = classe;
  return el;
}

function desenharColunas(
  documento: Document,
  grafico: HTMLElement,
  colunas: ReadonlyArray<Coluna>,
): void {
  grafico.replaceChildren(
    ...colunas.map((coluna) => {
      const raiz = elemento(
        documento,
        "div",
        coluna.vermelho ? "coluna coluna-vermelha" : "coluna",
      );
      const cima = elemento(documento, "div", "coluna-cima");
      const antes = elemento(documento, "div", "barra-antes");
      antes.style.height = `${altura(coluna.antes)}px`;
      const depois = elemento(documento, "div", "barra-depois");
      depois.style.height = `${altura(coluna.depois)}px`;
      cima.append(antes, depois);
      const linha = elemento(documento, "div", "coluna-linha");
      const baixo = elemento(documento, "div", "coluna-baixo");
      const falta = elemento(documento, "div", "barra-falta");
      falta.style.height = `${alturaDoQueFalta(coluna.depois)}px`;
      baixo.append(falta);
      const mes = elemento(documento, "span", "coluna-mes");
      mes.textContent = coluna.mes;
      raiz.append(cima, linha, baixo, mes);
      return raiz;
    }),
  );
}

/** Liga o card `#simulador` da página. Sem o card, não faz nada. */
export function iniciar(documento: Document, agoraISO: string): void {
  const raiz = documento.querySelector<HTMLElement>("[data-simulador]");
  const exemplo = documento.querySelector<HTMLElement>("[data-simulador-exemplo]");
  const campoValor = documento.querySelector<HTMLInputElement>("#simulador-valor");
  const campoVezes = documento.querySelector<HTMLInputElement>("#simulador-vezes");
  const veredito = documento.querySelector<HTMLElement>("#simulador-veredito");
  const detalhe = documento.querySelector<HTMLElement>("#simulador-detalhe");
  const grafico = documento.querySelector<HTMLElement>("#simulador-grafico");
  if (!raiz || !campoValor || !campoVezes || !veredito || !detalhe || !grafico) {
    return;
  }
  const horizonte = horizonteDaCasa(competenciaCorrente(agoraISO));

  function atualizar(): void {
    if (!campoValor || !campoVezes || !veredito || !detalhe || !grafico) {
      return;
    }
    const resposta = responder({ valor: campoValor.value, vezes: campoVezes.value, horizonte });
    if (resposta.tipo !== "RESPOSTA") {
      veredito.textContent = resposta.mensagem;
      veredito.dataset.estado = "aviso";
      detalhe.textContent = "";
      grafico.replaceChildren();
      grafico.setAttribute("aria-label", resposta.mensagem);
      return;
    }
    veredito.textContent = resposta.veredito;
    veredito.dataset.estado = resposta.cabe ? "cabe" : "nao-cabe";
    detalhe.textContent = [resposta.detalhe, resposta.enxergaAte ?? ""].join(" ").trim();
    desenharColunas(documento, grafico, resposta.colunas);
    grafico.setAttribute(
      "aria-label",
      `Quanto sobra em cada um dos próximos doze meses depois da compra. ${resposta.veredito}`,
    );
  }

  campoValor.addEventListener("input", atualizar);
  campoVezes.addEventListener("input", atualizar);
  raiz.hidden = false;
  if (exemplo) {
    exemplo.hidden = true;
  }
  atualizar();
}

if (typeof document !== "undefined") {
  iniciar(document, new Date().toISOString());
}
