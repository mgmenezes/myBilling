import {
  type Categoria,
  type Cents,
  type Competencia,
  type DomainError,
  err,
  type Lancamento,
  type MeioPagamento,
  ok,
  type Result,
  somar,
  ZERO_CENTS,
} from "@/domain";
import type {
  CadastroRepository,
  CompraPersistida,
  CompraRepository,
  EntradaSalvarCompra,
  MovimentoRepository,
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
}

export function criarEstadoEmMemoria(): EstadoEmMemoria {
  return {
    compras: new Map(),
    movimentos: new Map(),
    usuarios: [],
    meiosDePagamento: [],
    categorias: [],
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

  async listarPorCompetencia(competencia: Competencia): Promise<ReadonlyArray<Lancamento>> {
    return [...this.estado.movimentos.values()].filter(
      (m) => m.competencia === competencia && m.canceladoEm === null,
    );
  }

  async buscarPorId(id: string): Promise<Lancamento | null> {
    return this.estado.movimentos.get(id) ?? null;
  }

  async marcarPagamento(id: string, pagoEm: string | null): Promise<void> {
    const atual = this.estado.movimentos.get(id);
    if (!atual) {
      return;
    }
    this.estado.movimentos.set(id, { ...atual, pagoEm });
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
