import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Categoria } from "../tipos";
import { normalizarNome } from "./celula";
import { type Conferencia, conferirAba } from "./conferir-aba";
import type { AbaLida, Bloco, LinhaLida, LinhaNaoLida } from "./ler-aba";
import { type CompraEmCurso, type LinhaDeCompra, reconhecerCompras } from "./reconhecer-compras";
import {
  type DestinoDeRecorrencia,
  type LinhaDeRecorrencia,
  type RecorrenciaVigente,
  reconhecerRecorrencias,
} from "./reconhecer-recorrencias";

export type ClasseEntrada = "FIXA" | "AVULSA";

export interface DecisaoDeEntrada {
  readonly classe: ClasseEntrada;
  /** A conta em que o dinheiro cai: só meio sem fatura (AD-015). */
  readonly contaId: string;
}

export interface DecisoesDaImportacao {
  /** "Tipo" normalizado → meio de pagamento. */
  readonly meios: ReadonlyMap<string, string>;
  /** Nome normalizado da entrada → decisão. */
  readonly entradas: ReadonlyMap<string, DecisaoDeEntrada>;
}

export interface EstadoParaImportacao {
  readonly competencia: Competencia;
  /** Valem em M − 1, natureza DESPESA, com o valor que têm em M. */
  readonly despesasFixasVigentes: ReadonlyArray<RecorrenciaVigente>;
  /** Idem, natureza RECEITA. */
  readonly receitasFixasVigentes: ReadonlyArray<RecorrenciaVigente>;
  /** Têm parcela em M. */
  readonly comprasEmCurso: ReadonlyArray<CompraEmCurso>;
  /** Inclusive as arquivadas. */
  readonly categorias: ReadonlyArray<Categoria>;
}

export interface Pendencias {
  readonly tiposSemMeio: ReadonlyArray<{
    readonly chave: string;
    readonly nome: string;
    readonly linhas: number;
  }>;
  readonly entradasSemClasse: ReadonlyArray<{ readonly chave: string; readonly nome: string }>;
}

export type DestinoDaLinha =
  | "NOVO"
  | "JA_EXISTE"
  | "REAJUSTE"
  | "CONTINUA"
  | "CONTINUA_COM_NOVO_VALOR"
  | "COMPRA_NOVA";

export interface LinhaDaPrevia {
  readonly bloco: Bloco;
  readonly posicao: number;
  readonly nome: string;
  readonly valor: Cents;
  readonly destino: DestinoDaLinha;
  readonly valorAnterior: Cents | null;
}

type Natureza = "DESPESA" | "RECEITA";

export interface OperacoesDaImportacao {
  readonly categorias: ReadonlyArray<{
    readonly chave: string;
    readonly grafia: string;
    readonly acao: "CRIAR" | "REATIVAR" | "REAPROVEITAR";
    readonly categoriaId: string | null;
  }>;
  readonly recorrenciasNovas: ReadonlyArray<{
    readonly natureza: Natureza;
    readonly descricao: string;
    readonly valor: Cents;
    readonly meioPagamentoId: string;
    readonly chaveCategoria: string | null;
  }>;
  readonly reajustes: ReadonlyArray<{ readonly recorrenciaId: string; readonly valor: Cents }>;
  readonly encerramentos: ReadonlyArray<string>;
  readonly comprasNovas: ReadonlyArray<{
    readonly descricao: string;
    readonly meioPagamentoId: string;
    readonly chaveCategoria: string | null;
    readonly qtdParcelas: number;
    readonly parcelaInicial: number;
    readonly valorParcela: Cents;
  }>;
  readonly reprecificacoes: ReadonlyArray<{
    readonly compraId: string;
    readonly aPartirDe: number;
    readonly valor: Cents;
  }>;
  readonly avulsos: ReadonlyArray<{
    readonly natureza: Natureza;
    readonly descricao: string;
    readonly valor: Cents;
    readonly meioPagamentoId: string;
    readonly chaveCategoria: string | null;
    readonly chaveDeOrigem: string;
  }>;
  /** As usadas nesta aba, a gravar ou atualizar. */
  readonly decisoes: DecisoesDaImportacao;
}

export interface PlanoDeImportacao {
  readonly competencia: Competencia;
  readonly conferencia: Conferencia;
  readonly pendencias: Pendencias;
  readonly linhas: ReadonlyArray<LinhaDaPrevia>;
  readonly naoLidas: ReadonlyArray<LinhaNaoLida>;
  readonly deixamDeValer: ReadonlyArray<{
    readonly recorrenciaId: string;
    readonly descricao: string;
  }>;
  readonly naoAparecem: ReadonlyArray<{
    readonly compraId: string;
    readonly descricao: string;
    readonly numero: number;
  }>;
  /** Linhas com destino NOVO, REAJUSTE, CONTINUA_COM_NOVO_VALOR ou COMPRA_NOVA (IMP-05 AC 9). */
  readonly quantidadeAImportar: number;
  /** `null` enquanto houver pendência. */
  readonly operacoes: OperacoesDaImportacao | null;
}

/** Linha de fixo ou de entrada fixa, com o que o plano precisa para criá-la. */
interface RecorrenciaDaAba extends LinhaDeRecorrencia {
  /** O meio da recorrência criada: o do "Tipo" no fixo, a conta escolhida na entrada. */
  readonly meioDoPlano: string;
  readonly chaveCategoria: string | null;
}

interface CompraDaAba extends LinhaDeCompra {
  readonly chaveCategoria: string | null;
}

interface ComMeio<L extends LinhaLida> {
  readonly linha: L;
  readonly meioPagamentoId: string;
}

interface EntradaClassificada {
  readonly linha: LinhaLida;
  readonly decisao: DecisaoDeEntrada;
}

const DESTINOS_QUE_IMPORTAM: ReadonlySet<DestinoDaLinha> = new Set<DestinoDaLinha>([
  "NOVO",
  "REAJUSTE",
  "CONTINUA_COM_NOVO_VALOR",
  "COMPRA_NOVA",
]);

function chaveDaCategoria(texto: string): string | null {
  const chave = normalizarNome(texto);
  return chave === "" ? null : chave;
}

function porPosicao<T extends { readonly posicao: number }>(a: T, b: T): number {
  return a.posicao - b.posicao;
}

/**
 * Liga cada linha lida ao meio do seu "Tipo". O "Tipo" sem decisão vira
 * pendência, uma por nome normalizado, contando as linhas lidas que o usam.
 */
function ligarMeios<L extends LinhaLida>(
  linhas: ReadonlyArray<L>,
  meios: ReadonlyMap<string, string>,
  semMeio: Map<string, { chave: string; nome: string; linhas: number }>,
  usados: Map<string, string>,
): ComMeio<L>[] {
  const ligadas: ComMeio<L>[] = [];
  for (const linha of linhas) {
    const chave = normalizarNome(linha.tipo);
    const meio = meios.get(chave);
    if (meio === undefined) {
      const pendente = semMeio.get(chave);
      semMeio.set(chave, {
        chave,
        nome: pendente === undefined ? linha.tipo.trim() : pendente.nome,
        linhas: pendente === undefined ? 1 : pendente.linhas + 1,
      });
      continue;
    }
    usados.set(chave, meio);
    ligadas.push({ linha, meioPagamentoId: meio });
  }
  return ligadas;
}

function planejarCategorias(
  aba: AbaLida,
  existentes: ReadonlyArray<Categoria>,
): OperacoesDaImportacao["categorias"] {
  // A grafia que vale é a da primeira linha, e a tabela vem depois dos blocos
  // (IMP-03 AC 10 e 11). Linha não lida não cria categoria.
  const grafias = new Map<string, string>();
  for (const texto of [
    ...[...aba.fixos, ...aba.cartao, ...aba.gastos].map((linha) => linha.categoria),
    ...aba.categoriasDaTabela,
  ]) {
    const chave = chaveDaCategoria(texto);
    if (chave !== null && !grafias.has(chave)) {
      grafias.set(chave, texto.trim());
    }
  }
  return [...grafias].map(([chave, grafia]) => {
    const existente = existentes.find((categoria) => normalizarNome(categoria.nome) === chave);
    if (existente === undefined) {
      return { chave, grafia, acao: "CRIAR" as const, categoriaId: null };
    }
    const acao = existente.arquivadaEm === null ? "REAPROVEITAR" : "REATIVAR";
    return { chave, grafia, acao, categoriaId: existente.id };
  });
}

/**
 * O plano inteiro de uma aba: o que criar, reajustar, encerrar, reprecificar
 * e lançar, e o que mostrar na conferência. Função pura sobre a aba lida, o
 * estado do banco e as decisões; a aplicação só carrega o estado e executa.
 *
 * Com pendência, o plano traz só a conferência, as pendências e as não lidas:
 * sem o meio de cada "Tipo", nenhuma linha pode ser reconhecida.
 */
export function planejarImportacao(entrada: {
  readonly aba: AbaLida;
  readonly estado: EstadoParaImportacao;
  readonly decisoes: DecisoesDaImportacao;
}): PlanoDeImportacao {
  const { aba, estado, decisoes } = entrada;
  const competencia = estado.competencia;
  const conferencia = conferirAba(aba);

  // Pendências nascem só de linhas lidas (IMP-04 AC 1 e 3).
  const semMeio = new Map<string, { chave: string; nome: string; linhas: number }>();
  const meiosUsados = new Map<string, string>();
  const fixos = ligarMeios(aba.fixos, decisoes.meios, semMeio, meiosUsados);
  const cartao = ligarMeios(aba.cartao, decisoes.meios, semMeio, meiosUsados);
  const gastos = ligarMeios(aba.gastos, decisoes.meios, semMeio, meiosUsados);

  const semClasse = new Map<string, { chave: string; nome: string }>();
  const entradasUsadas = new Map<string, DecisaoDeEntrada>();
  const entradas: EntradaClassificada[] = [];
  for (const linha of aba.entradas) {
    const chave = normalizarNome(linha.nome);
    const decisao = decisoes.entradas.get(chave);
    if (decisao === undefined) {
      if (!semClasse.has(chave)) {
        semClasse.set(chave, { chave, nome: linha.nome.trim() });
      }
      continue;
    }
    entradasUsadas.set(chave, decisao);
    entradas.push({ linha, decisao });
  }

  const pendencias: Pendencias = {
    tiposSemMeio: [...semMeio.values()],
    entradasSemClasse: [...semClasse.values()],
  };
  if (pendencias.tiposSemMeio.length > 0 || pendencias.entradasSemClasse.length > 0) {
    return {
      competencia,
      conferencia,
      pendencias,
      linhas: [],
      naoLidas: aba.naoLidas,
      deixamDeValer: [],
      naoAparecem: [],
      quantidadeAImportar: 0,
      operacoes: null,
    };
  }

  const recorrenciasNovas: Array<OperacoesDaImportacao["recorrenciasNovas"][number]> = [];
  const reajustes: Array<OperacoesDaImportacao["reajustes"][number]> = [];
  const comprasNovas: Array<OperacoesDaImportacao["comprasNovas"][number]> = [];
  const reprecificacoes: Array<OperacoesDaImportacao["reprecificacoes"][number]> = [];
  const avulsos: Array<OperacoesDaImportacao["avulsos"][number]> = [];

  const previa = (
    bloco: Bloco,
    linha: { readonly posicao: number; readonly nome: string; readonly valor: Cents },
    destino: DestinoDaLinha,
    valorAnterior: Cents | null = null,
  ): LinhaDaPrevia => ({
    bloco,
    posicao: linha.posicao,
    nome: linha.nome,
    valor: linha.valor,
    destino,
    valorAnterior,
  });

  const aplicarRecorrencias = (
    bloco: "FIXOS" | "ENTRADAS",
    natureza: Natureza,
    destinos: ReadonlyArray<DestinoDeRecorrencia<RecorrenciaDaAba>>,
  ): LinhaDaPrevia[] => {
    const linhas: LinhaDaPrevia[] = [];
    for (const destino of destinos) {
      switch (destino.tipo) {
        case "NOVA":
          recorrenciasNovas.push({
            natureza,
            descricao: destino.linha.nome.trim(),
            valor: destino.linha.valor,
            meioPagamentoId: destino.linha.meioDoPlano,
            chaveCategoria: destino.linha.chaveCategoria,
          });
          linhas.push(previa(bloco, destino.linha, "NOVO"));
          break;
        case "INALTERADA":
          linhas.push(previa(bloco, destino.linha, "JA_EXISTE"));
          break;
        case "REAJUSTE":
          reajustes.push({ recorrenciaId: destino.recorrenciaId, valor: destino.para });
          linhas.push(previa(bloco, destino.linha, "REAJUSTE", destino.de));
          break;
        case "PRESENTE_SEM_VALOR":
          // Mantém o valor vigente e aparece entre as não lidas (IMP-07 AC 6).
          break;
      }
    }
    return linhas;
  };

  // Fixos: as linhas lidas e, para o "presente sem valor", as não lidas cujo
  // "Tipo" tem meio lembrado; sem meio, a não lida não reconhece nada.
  const recorrenciasDosFixos: RecorrenciaDaAba[] = fixos.map(({ linha, meioPagamentoId }) => ({
    bloco: "FIXOS",
    posicao: linha.posicao,
    nome: linha.nome,
    meioPagamentoId,
    valor: linha.valor,
    meioDoPlano: meioPagamentoId,
    chaveCategoria: chaveDaCategoria(linha.categoria),
  }));
  for (const linha of aba.naoLidas) {
    const meio = decisoes.meios.get(normalizarNome(linha.tipo));
    if (linha.bloco === "FIXOS" && meio !== undefined) {
      recorrenciasDosFixos.push({
        bloco: "FIXOS",
        posicao: linha.posicao,
        nome: linha.nome,
        meioPagamentoId: meio,
        valor: null,
        meioDoPlano: meio,
        chaveCategoria: null,
      });
    }
  }
  const despesas = reconhecerRecorrencias(
    recorrenciasDosFixos.sort(porPosicao),
    estado.despesasFixasVigentes,
  );

  // Entradas fixas: reconhecidas só pelo nome; a não lida entra quando o nome
  // já está classificado como fixo.
  const recorrenciasDasEntradas: RecorrenciaDaAba[] = entradas
    .filter(({ decisao }) => decisao.classe === "FIXA")
    .map(({ linha, decisao }) => ({
      bloco: "ENTRADAS",
      posicao: linha.posicao,
      nome: linha.nome,
      meioPagamentoId: null,
      valor: linha.valor,
      meioDoPlano: decisao.contaId,
      chaveCategoria: null,
    }));
  for (const linha of aba.naoLidas) {
    const decisao = decisoes.entradas.get(normalizarNome(linha.nome));
    if (linha.bloco === "ENTRADAS" && decisao?.classe === "FIXA") {
      recorrenciasDasEntradas.push({
        bloco: "ENTRADAS",
        posicao: linha.posicao,
        nome: linha.nome,
        meioPagamentoId: null,
        valor: null,
        meioDoPlano: decisao.contaId,
        chaveCategoria: null,
      });
    }
  }
  const receitas = reconhecerRecorrencias(
    recorrenciasDasEntradas.sort(porPosicao),
    estado.receitasFixasVigentes,
  );

  const linhasDosFixos = aplicarRecorrencias("FIXOS", "DESPESA", despesas.destinos);
  const linhasDasEntradasFixas = aplicarRecorrencias("ENTRADAS", "RECEITA", receitas.destinos);

  const compras = reconhecerCompras(
    cartao.map(
      ({ linha, meioPagamentoId }): CompraDaAba => ({
        posicao: linha.posicao,
        nome: linha.nome,
        meioPagamentoId,
        parcela: linha.parcela,
        valor: linha.valor,
        chaveCategoria: chaveDaCategoria(linha.categoria),
      }),
    ),
    estado.comprasEmCurso,
  );
  const linhasDoCartao: LinhaDaPrevia[] = [];
  for (const destino of compras.destinos) {
    switch (destino.tipo) {
      case "COMPRA_NOVA":
        comprasNovas.push({
          descricao: destino.linha.nome.trim(),
          meioPagamentoId: destino.linha.meioPagamentoId,
          chaveCategoria: destino.linha.chaveCategoria,
          qtdParcelas: destino.linha.parcela.total,
          parcelaInicial: destino.linha.parcela.numero,
          valorParcela: destino.linha.valor,
        });
        linhasDoCartao.push(previa("CARTAO", destino.linha, "COMPRA_NOVA"));
        break;
      case "CONTINUA":
        linhasDoCartao.push(previa("CARTAO", destino.linha, "CONTINUA"));
        break;
      case "CONTINUA_COM_NOVO_VALOR":
        reprecificacoes.push({
          compraId: destino.compraId,
          aPartirDe: destino.linha.parcela.numero,
          valor: destino.para,
        });
        linhasDoCartao.push(previa("CARTAO", destino.linha, "CONTINUA_COM_NOVO_VALOR", destino.de));
        break;
    }
  }

  const linhasDosGastos = gastos.map(({ linha, meioPagamentoId }) => {
    avulsos.push({
      natureza: "DESPESA",
      descricao: linha.nome.trim(),
      valor: linha.valor,
      meioPagamentoId,
      chaveCategoria: chaveDaCategoria(linha.categoria),
      chaveDeOrigem: `${competencia}|GASTOS|${linha.posicao}`,
    });
    return previa("GASTOS", linha, "NOVO");
  });

  const linhasDasEntradasAvulsas = entradas
    .filter(({ decisao }) => decisao.classe === "AVULSA")
    .map(({ linha, decisao }) => {
      avulsos.push({
        natureza: "RECEITA",
        descricao: linha.nome.trim(),
        valor: linha.valor,
        meioPagamentoId: decisao.contaId,
        chaveCategoria: null,
        chaveDeOrigem: `${competencia}|ENTRADAS|${linha.posicao}`,
      });
      return previa("ENTRADAS", linha, "NOVO");
    });

  const linhas = [
    ...linhasDosFixos,
    ...linhasDoCartao,
    ...linhasDosGastos,
    ...[...linhasDasEntradasFixas, ...linhasDasEntradasAvulsas].sort(porPosicao),
  ];
  const encerradas = [...despesas.encerrar, ...receitas.encerrar];

  return {
    competencia,
    conferencia,
    pendencias,
    linhas,
    naoLidas: aba.naoLidas,
    deixamDeValer: encerradas.map((vigente) => ({
      recorrenciaId: vigente.id,
      descricao: vigente.descricao,
    })),
    naoAparecem: compras.naoAparecem.map((compra) => ({
      compraId: compra.compraId,
      descricao: compra.descricao,
      numero: compra.numeroEmM,
    })),
    quantidadeAImportar: linhas.filter((linha) => DESTINOS_QUE_IMPORTAM.has(linha.destino)).length,
    operacoes: {
      categorias: planejarCategorias(aba, estado.categorias),
      recorrenciasNovas,
      reajustes,
      encerramentos: encerradas.map((vigente) => vigente.id),
      comprasNovas,
      reprecificacoes,
      avulsos,
      decisoes: { meios: meiosUsados, entradas: entradasUsadas },
    },
  };
}
