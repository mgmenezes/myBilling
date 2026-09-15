import {
  type Categoria,
  type Cents,
  type Competencia,
  compararCompetencias,
  type DomainError,
  err,
  type Lancamento,
  type MeioPagamento,
  ocorrenciaProtegida,
  ok,
  type Recorrencia,
  type Result,
  somar,
  ZERO_CENTS,
} from "@/domain";
import type {
  CadastroRepository,
  CompraPersistida,
  CompraRepository,
  EntradaCriarRecorrencia,
  EntradaLancamentoAvulso,
  EntradaSalvarCompra,
  MovimentoRepository,
  OcorrenciaParaMaterializar,
  RecorrenciaComVersoes,
  RecorrenciaRepository,
  Usuario,
} from "./repositories";

/**
 * Implementações em memória das três ports, para que os casos de uso sejam
 * testáveis sem banco. **Nenhum import de `@/infrastructure`**: se estes
 * fakes precisassem de infraestrutura, a fronteira já teria vazado.
 *
 * Os fakes reproduzem as restrições do schema que mudam comportamento
 * observável: unicidade de `(compra, número de parcela)`, unicidade da
 * chave de idempotência e o assert de conservação. Uma violação de
 * unicidade **lança**, do mesmo jeito que o Postgres lança — quem consome
 * a port vê o mesmo formato de falha com fake e com banco real.
 */

export interface EstadoEmMemoria {
  readonly compras: Map<string, CompraPersistida>;
  readonly movimentos: Map<string, Lancamento>;
  readonly usuarios: Usuario[];
  readonly meiosDePagamento: MeioPagamento[];
  readonly categorias: Categoria[];
  readonly recorrencias: Map<string, RecorrenciaComVersoes>;
}

export function criarEstadoEmMemoria(): EstadoEmMemoria {
  return {
    compras: new Map(),
    movimentos: new Map(),
    usuarios: [],
    meiosDePagamento: [],
    categorias: [],
    recorrencias: new Map(),
  };
}

export class ViolacaoDeUnicidade extends Error {
  constructor(public readonly restricao: string) {
    super(`violação de unicidade: ${restricao}`);
    this.name = "ViolacaoDeUnicidade";
  }
}

function somarParcelas(parcelas: ReadonlyArray<{ readonly valor: Cents }>): Cents {
  return parcelas.reduce<Cents>((total, p) => somar(total, p.valor), ZERO_CENTS);
}

export class FakeCompraRepository implements CompraRepository {
  private sequencia = 0;

  constructor(private readonly estado: EstadoEmMemoria) {}

  async buscarPorIdempotencyKey(idempotencyKey: string): Promise<CompraPersistida | null> {
    for (const compra of this.estado.compras.values()) {
      if (compra.idempotencyKey === idempotencyKey) {
        return compra;
      }
    }
    return null;
  }

  async totaisDeParcelas(compraIds: ReadonlyArray<string>): Promise<ReadonlyMap<string, number>> {
    const totais = new Map<string, number>();
    for (const id of compraIds) {
      const compra = this.estado.compras.get(id);
      if (compra) {
        totais.set(id, compra.qtdParcelas);
      }
    }
    return totais;
  }

  async salvarComParcelas(
    entrada: EntradaSalvarCompra,
  ): Promise<Result<CompraPersistida, DomainError>> {
    const existente = await this.buscarPorIdempotencyKey(entrada.idempotencyKey);
    if (existente) {
      return ok(existente);
    }

    const { plano, dados } = entrada;
    const soma = somar(somarParcelas(plano.parcelas), plano.valorAmortizadoAnterior);
    if (soma !== plano.valorTotal) {
      return err<DomainError>({
        code: "CONSERVACAO_VIOLADA",
        detalhes: { soma, valorTotal: plano.valorTotal },
      });
    }

    this.sequencia += 1;
    const compraId = `compra-${this.sequencia}`;

    const parcelas: Lancamento[] = [];
    for (const parcela of plano.parcelas) {
      const chave = `${compraId}#${parcela.numero}`;
      if (this.estado.movimentos.has(chave)) {
        throw new ViolacaoDeUnicidade("movimento_compra_parcela_uq");
      }
      const lancamento: Lancamento = {
        id: chave,
        natureza: "DESPESA",
        origem: "PARCELA",
        descricao: dados.descricao,
        competencia: parcela.competencia,
        dataEvento: dados.dataEvento,
        valor: parcela.valor,
        valorPrevisto: null,
        pagoEm: null,
        categoriaId: dados.categoriaId,
        usuarioId: dados.usuarioId,
        meioPagamentoId: dados.meioPagamentoId,
        compraId,
        numeroParcela: parcela.numero,
        recorrenciaId: null,
        canceladoEm: null,
      };
      this.estado.movimentos.set(chave, lancamento);
      parcelas.push(lancamento);
    }

    const compra: CompraPersistida = {
      id: compraId,
      idempotencyKey: entrada.idempotencyKey,
      valorTotal: plano.valorTotal,
      qtdParcelas: dados.qtdParcelas,
      parcelaInicial: dados.parcelaInicial,
      valorAmortizadoAnterior: plano.valorAmortizadoAnterior,
      parcelas,
    };
    this.estado.compras.set(compraId, compra);
    return ok(compra);
  }
}

export class FakeMovimentoRepository implements MovimentoRepository {
  constructor(private readonly estado: EstadoEmMemoria) {}

  private proximoAvulso = 1;

  /** Id sequencial e legível: o teste que falha aponta para `avulso-2`, não
   *  para um uuid que não diz nada. */
  async criarAvulso(entrada: EntradaLancamentoAvulso): Promise<Lancamento> {
    const lancamento: Lancamento = {
      id: `avulso-${this.proximoAvulso++}`,
      natureza: entrada.natureza,
      origem: "AVULSO",
      descricao: entrada.descricao,
      competencia: entrada.competencia,
      dataEvento: entrada.dataEvento,
      valor: entrada.valor,
      valorPrevisto: null,
      pagoEm: entrada.pagoEm,
      categoriaId: entrada.categoriaId,
      usuarioId: entrada.usuarioId,
      meioPagamentoId: entrada.meioPagamentoId,
      compraId: null,
      numeroParcela: null,
      recorrenciaId: null,
      canceladoEm: null,
    };
    this.estado.movimentos.set(lancamento.id, lancamento);
    return lancamento;
  }

  async listarPorCompetencia(competencia: Competencia): Promise<ReadonlyArray<Lancamento>> {
    return [...this.estado.movimentos.values()].filter(
      (m) => m.competencia === competencia && m.canceladoEm === null,
    );
  }

  async buscarPorId(id: string): Promise<Lancamento | null> {
    return this.estado.movimentos.get(id) ?? null;
  }

  /** Mesmas três condições do `WHERE` do Drizzle. */
  async cancelar(id: string, canceladoEm: string): Promise<boolean> {
    const atual = this.estado.movimentos.get(id);
    if (atual?.origem !== "AVULSO" || atual.canceladoEm !== null) {
      return false;
    }
    this.estado.movimentos.set(id, { ...atual, canceladoEm });
    return true;
  }

  /** Cancelado não se marca como pago, igual ao `WHERE` do Drizzle (AVUL-04). */
  async marcarPagamento(id: string, pagoEm: string | null): Promise<void> {
    const atual = this.estado.movimentos.get(id);
    if (!atual || atual.canceladoEm !== null) {
      return;
    }
    this.estado.movimentos.set(id, { ...atual, pagoEm });
  }

  /**
   * Reproduz a restrição `(recorrencia, competência)` do banco, que é o que
   * torna a materialização idempotente. Um fake que aceitasse a segunda
   * ocorrência deixaria o caso de uso passar no teste e duplicar em produção.
   */
  async materializarOcorrencias(
    ocorrencias: ReadonlyArray<OcorrenciaParaMaterializar>,
  ): Promise<number> {
    let criadas = 0;
    for (const o of ocorrencias) {
      const jaExiste = [...this.estado.movimentos.values()].some(
        (m) => m.recorrenciaId === o.recorrenciaId && m.competencia === o.competencia,
      );
      if (jaExiste) {
        continue;
      }
      const id = `mov-rec-${this.estado.movimentos.size + 1}`;
      this.estado.movimentos.set(id, {
        id,
        natureza: o.natureza,
        origem: "RECORRENCIA",
        descricao: o.descricao,
        competencia: o.competencia,
        dataEvento: o.dataEvento,
        valor: o.valorPrevisto,
        valorPrevisto: o.valorPrevisto,
        pagoEm: null,
        categoriaId: o.categoriaId,
        usuarioId: o.usuarioId,
        meioPagamentoId: o.meioPagamentoId,
        compraId: null,
        numeroParcela: null,
        recorrenciaId: o.recorrenciaId,
        canceladoEm: null,
      });
      criadas += 1;
    }
    return criadas;
  }

  /**
   * Aqui o filtro é a **própria** `ocorrenciaProtegida`, e não uma tradução
   * dela. O repositório real usa `WHERE`, e é o teste de concordância que
   * prende os dois à mesma definição.
   */
  async atualizarPrevistoNaoProtegido(
    recorrenciaId: string,
    desde: Competencia,
    valorPrevisto: Cents,
  ): Promise<void> {
    for (const [id, atual] of this.estado.movimentos) {
      if (atual.recorrenciaId !== recorrenciaId) {
        continue;
      }
      if (compararCompetencias(atual.competencia, desde) < 0) {
        continue;
      }
      if (ocorrenciaProtegida(atual)) {
        continue;
      }
      this.estado.movimentos.set(id, { ...atual, valor: valorPrevisto, valorPrevisto });
    }
  }

  async confirmarValorReal(id: string, valor: Cents): Promise<void> {
    const atual = this.estado.movimentos.get(id);
    if (!atual) {
      return;
    }
    this.estado.movimentos.set(id, { ...atual, valor });
  }

  async removerNaoPagasDaRecorrencia(recorrenciaId: string, desde: Competencia): Promise<void> {
    for (const [id, atual] of this.estado.movimentos) {
      if (atual.recorrenciaId !== recorrenciaId || atual.pagoEm !== null) {
        continue;
      }
      if (compararCompetencias(atual.competencia, desde) >= 0) {
        this.estado.movimentos.delete(id);
      }
    }
  }
}

export class FakeCadastroRepository implements CadastroRepository {
  constructor(private readonly estado: EstadoEmMemoria) {}

  async listarUsuarios(): Promise<ReadonlyArray<Usuario>> {
    return [...this.estado.usuarios];
  }

  async listarMeiosDePagamentoDisponiveis(): Promise<ReadonlyArray<MeioPagamento>> {
    return this.estado.meiosDePagamento.filter((m) => m.arquivadoEm === null);
  }

  async buscarMeioDePagamento(id: string): Promise<MeioPagamento | null> {
    return this.estado.meiosDePagamento.find((m) => m.id === id) ?? null;
  }

  async listarCategoriasDisponiveis(): Promise<ReadonlyArray<Categoria>> {
    return this.estado.categorias.filter((c) => c.arquivadaEm === null);
  }

  async buscarCategoria(id: string): Promise<Categoria | null> {
    return this.estado.categorias.find((c) => c.id === id) ?? null;
  }

  /** Sem filtro de arquivado, igual ao Drizzle (BLOCO-01, AC 6). */
  async idsDeMeiosComFatura(): Promise<ReadonlySet<string>> {
    return new Set(
      this.estado.meiosDePagamento.filter((m) => m.tipo === "CARTAO_CREDITO").map((m) => m.id),
    );
  }
}

export interface Fakes {
  readonly estado: EstadoEmMemoria;
  readonly compras: FakeCompraRepository;
  readonly movimentos: FakeMovimentoRepository;
  readonly cadastros: FakeCadastroRepository;
}

export function criarFakes(estado: EstadoEmMemoria = criarEstadoEmMemoria()): Fakes {
  return {
    estado,
    compras: new FakeCompraRepository(estado),
    movimentos: new FakeMovimentoRepository(estado),
    cadastros: new FakeCadastroRepository(estado),
  };
}

/**
 * Recorrência em memória.
 *
 * Ele existe para os casos de uso rodarem sem banco, e só vale enquanto se
 * comportar como o Drizzle nos pontos que eles observam: versões ordenadas,
 * vigência repetida substituindo, e encerrar sem apagar. Os mesmos três pontos
 * são asserados contra Postgres real no teste de integração do repositório —
 * é esse par que impede este fake de virar uma ficção conveniente.
 */
export class FakeRecorrenciaRepository implements RecorrenciaRepository {
  private proximoId = 1;

  constructor(private readonly estado: EstadoEmMemoria) {}

  async listarComVersoes(): Promise<ReadonlyArray<RecorrenciaComVersoes>> {
    return [...this.estado.recorrencias.values()];
  }

  async criar(entrada: EntradaCriarRecorrencia): Promise<Recorrencia> {
    const recorrencia: Recorrencia = {
      ...entrada.dados,
      id: `rec-${this.proximoId++}`,
      encerradaEm: null,
    };
    this.estado.recorrencias.set(recorrencia.id, {
      recorrencia,
      versoes: [
        { vigenteDesde: entrada.dados.competenciaInicio, valorPrevisto: entrada.valorInicial },
      ],
    });
    return recorrencia;
  }

  async registrarVersao(
    recorrenciaId: string,
    vigenteDesde: Competencia,
    valorPrevisto: Cents,
  ): Promise<void> {
    const atual = this.estado.recorrencias.get(recorrenciaId);
    if (!atual) {
      return;
    }
    const semAVigencia = atual.versoes.filter((v) => v.vigenteDesde !== vigenteDesde);
    this.estado.recorrencias.set(recorrenciaId, {
      ...atual,
      versoes: [...semAVigencia, { vigenteDesde, valorPrevisto }].sort((a, b) =>
        compararCompetencias(a.vigenteDesde, b.vigenteDesde),
      ),
    });
  }

  async encerrar(
    recorrenciaId: string,
    competenciaFim: Competencia,
    encerradaEm: string,
  ): Promise<void> {
    const atual = this.estado.recorrencias.get(recorrenciaId);
    if (!atual) {
      return;
    }
    this.estado.recorrencias.set(recorrenciaId, {
      ...atual,
      recorrencia: { ...atual.recorrencia, competenciaFim, encerradaEm },
    });
  }
}
