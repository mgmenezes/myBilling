# Importar a planilha — Design

**Spec**: `.specs/features/importar-planilha/spec.md` · **Contexto**: `context.md` (layout do arquivo,
peculiaridades e decisões do dono — não repetidos aqui).

---

## O que já existe, e por isso não é construído aqui

| Peça | Onde | Uso nesta fatia |
| --- | --- | --- |
| `parseBRL` | `src/domain/shared/money.ts:49` | Converte o valor da célula depois de tirar `R$` e espaços |
| `criarCompetencia`, `addMeses`, `compararCompetencias` | `src/domain/shared/competencia.ts` | Competência da aba, M − 1, ordem |
| `valeNaCompetencia`, `versaoVigente` | `src/domain/recorrencia/` | Quais recorrências valem em M − 1 e com que valor em M |
| `criarRecorrencia` | `src/application/recorrencias/criar-recorrencia/handler.ts:47` | Fixo e entrada fixa novos |
| `registrarVersao` | `src/application/recorrencias/registrar-versao/handler.ts:38` | Reajuste (atualiza também as ocorrências já materializadas e não protegidas) |
| `encerrarRecorrencia` | `src/application/recorrencias/encerrar/handler.ts:38` | "Deixa de valer" (apaga as ocorrências não pagas a partir de M) |
| `criarCompraParcelada` + `planoDaCompra` | `src/application/compras/` | Compra nova em andamento, modo `VALOR_PARCELA`, `parcelaInicial = n` |
| `MovimentoRepository.listarPorCompetencia` + `CompraRepository.totaisDeParcelas` | ports | Compras com parcela em M e a quantidade total de cada uma |
| `buscarCategoriaPorNome`, `reativarCategoria`, `criarCategoria` | `CadastroRepositoryDrizzle` (só na classe concreta) | Sobem para a port, para a aplicação usar |
| `CadastroInline` e os campos de meio | `src/components/cadastro-inline.tsx`, `form-lancamento-avulso.tsx` | Cadastrar meio no passo 2 |
| Envelope de action, `requireSession`, `erroDeAction` | `src/app/actions/compras.ts`, `src/lib/erros.ts` | Mesma forma nas duas actions novas |
| `movimento.origem_dado` / `origem_hash` + índice parcial único | `schema.ts:270-281` | Primeira escrita de verdade nessas colunas |

---

## Decisão 1 — uma transação que atravessa repositórios

Hoje cada repositório abre a própria transação, e `registrarVersao` e `encerrarRecorrencia` fazem
duas escritas soltas cada. Uma importação são dezenas de escritas que precisam ser tudo ou nada
(IMP-06), e reimplementar reajuste e encerramento dentro de um repositório novo criaria uma segunda
verdade sobre o que eles fazem com as ocorrências.

A saída é deixar os repositórios aceitarem uma transação:

- `src/infrastructure/db/client.ts` ganha `export type Executor = PgDatabase<NodePgQueryResultHKT,
  typeof schema>`. `NodePgDatabase` e `NodePgTransaction` estendem ambos `PgDatabase`, então o
  banco e a transação satisfazem o mesmo tipo.
- Os construtores dos repositórios Drizzle passam a receber `Executor` em vez de `BancoDeDados`.
  Nenhum comportamento muda. Os dois `db.transaction` internos (`salvarComParcelas`,
  `RecorrenciaRepositoryDrizzle.criar`) viram *savepoints* quando chamados sobre uma transação — é o
  que o Drizzle faz com `tx.transaction`.
- Uma port nova, `TransacaoDaImportacao`, executa uma operação com repositórios construídos sobre a
  mesma transação. A implementação Drizzle abre a transação, toma
  `pg_advisory_xact_lock(hashtext('importacao'))` — que serializa importações concorrentes, IMP-02
  AC 7 — e entrega os repositórios. Qualquer exceção desfaz tudo.

Assim a importação chama `criarRecorrencia`, `registrarVersao`, `encerrarRecorrencia` e
`criarCompraParcelada` **como estão**, só que com repositórios da transação.

## Decisão 2 — prévia e gravação calculam o mesmo plano, no servidor

Reconhecer depende do banco (recorrências, compras, decisões lembradas), então a prévia é uma
Server Action, `previaDaPlanilha` (caso de uso `preverImportacao`), que não escreve nada. A
gravação, `importarPlanilha` (caso de uso `gravarImportacao`), recebe o **mesmo** payload mais a
confirmação de divergência, e recalcula o plano dentro da transação, depois
de tomar a trava (IMP-06 AC 6). O navegador nunca envia o plano; envia o texto do arquivo, a
competência e as decisões.

O navegador também lê o arquivo com as mesmas funções puras do domínio, só para o passo 1 responder
na hora ("4 blocos encontrados", pré-seleção do mês). Isso não substitui a leitura do servidor.

## Decisão 3 — toda a leitura e todo o reconhecimento são puros

Em `src/domain/importacao/`, sem `async`, sem exceção, com `Result` e 100% de branches (AD-006). O
plano inteiro — o que criar, reajustar, encerrar, reprecificar — sai de uma função pura sobre
(aba lida, estado do banco, decisões). A aplicação só carrega o estado, chama a função e executa as
operações.

## Decisão 4 — reprecificar parcela é operação nova, não `regenerarParcelas`

`regenerarParcelas` redistribui o saldo entre as parcelas pendentes. A spec pede outra coisa
(IMP-07 AC 10): o valor da aba vale para a parcela `n` e as seguintes, e o total passa a ser
amortizado + soma das parcelas. Função pura nova em `src/domain/parcelamento/reprecificar-parcelas.ts`
e método novo `CompraRepository.reprecificar`, que atualiza as parcelas e o total na mesma
transação.

## Decisão 5 — o registro da importação é tabela, não inferência

"Qual foi a última competência importada" e "o que já foi decidido" não são inferíveis do razão:
uma recorrência criada à mão e uma criada pela importação são idênticas. Migration `0003`:

```sql
CREATE TYPE tipo_decisao_importacao AS ENUM ('MEIO', 'ENTRADA');
CREATE TYPE classe_entrada AS ENUM ('FIXA', 'AVULSA');

CREATE TABLE importacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL UNIQUE,              -- dia 1, como em todo o schema
  nome_arquivo text NOT NULL,
  usuario_id uuid NOT NULL REFERENCES usuario(id),
  importada_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT importacao_competencia_dia_1 CHECK (extract(day from competencia) = 1)
);

CREATE TABLE importacao_decisao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_decisao_importacao NOT NULL,
  nome_normalizado text NOT NULL,
  meio_pagamento_id uuid NOT NULL REFERENCES meio_pagamento(id),
  classe classe_entrada,
  CONSTRAINT importacao_decisao_unica UNIQUE (tipo, nome_normalizado),
  CONSTRAINT importacao_decisao_classe_sse_entrada CHECK ((tipo = 'ENTRADA') = (classe IS NOT NULL))
);
```

O SQL acima descreve o resultado; ele nasce de `schema.ts` por `pnpm db:generate` e é revisado à
mão. `limpar.ts` ganha as duas tabelas no início da lista. O script de limpeza do dono (IMP-09) vive
em `src/infrastructure/db/sql/limpar-para-importar.sql` e é provado por teste de integração que o
executa.

---

## Fluxo

```
Navegador                         Server Action                  Domínio (puro)
─────────                         ─────────────                  ──────────────
arquivo ─► lerCsv + lerAba ─► passo 1 (blocos, mês pré-selecionado)
continuar ───────────────────► previaDaPlanilha ─► requireSession, Zod
                                   │  ordem / banco vazio (ImportacaoRepository)
                                   │  carregarEstado(M) ──────────► planejarImportacao
                                   ◄────────────── prévia (pendências, conferência, linhas)
passo 2 (se houver pendência) ─► previaDaPlanilha de novo, com as decisões
passo 3 (conferência) ─ importar ─► importarPlanilha ─► TransacaoDaImportacao.executar
                                       trava · ordem · banco vazio · carregarEstado · planejar
                                       pendência? ─► IMPORTACAO_PENDENCIA_ABERTA (rollback)
                                       divergência sem confirmação? ─► …_NAO_CONFIRMADA
                                       categorias → recorrências → reajustes → encerramentos
                                       → compras → reprecificações → avulsos → registro
                                   ◄── resumo; revalidatePath das rotas da competência
```

---

## Interfaces

Os nomes abaixo são contrato entre tasks. Corpos ficam com quem implementa.

### `src/domain/importacao/csv.ts`

```ts
export type Grade = ReadonlyArray<ReadonlyArray<string>>;
/** RFC 4180: vírgula, aspas duplas, `""` dentro de aspas, CRLF ou LF; remove BOM inicial. */
export function lerCsv(texto: string): Result<Grade, DomainError>; // aspas não fechadas → PLANILHA_ARQUIVO_INVALIDO
```

### `src/domain/importacao/celula.ts`

```ts
export type MotivoNaoLida = "VALOR_VAZIO" | "VALOR_ZERO" | "VALOR_INVALIDO" | "PARCELA_INVALIDA" | "NOME_VAZIO";
export interface ParcelaDaLinha { readonly numero: number; readonly total: number }
export function normalizarNome(texto: string): string;            // trim, \s+ → " ", toLocaleLowerCase("pt-BR")
export function valorDaCelula(texto: string): Result<Cents, MotivoNaoLida>;     // remove "R$", espaço e U+00A0; "" → VALOR_VAZIO; só zeros → VALOR_ZERO; resto recusado por parseBRL → VALOR_INVALIDO
export function parcelaDaCelula(texto: string): Result<ParcelaDaLinha, MotivoNaoLida>; // /^\s*(\d+)\/(\d+)\s*$/, 1 ≤ n ≤ t ≤ MAX_PARCELAS
```

### `src/domain/importacao/ler-aba.ts`

```ts
export type Bloco = "FIXOS" | "CARTAO" | "GASTOS" | "ENTRADAS";
export interface LinhaLida {
  readonly bloco: Bloco; readonly posicao: number;  // 0-based dentro do bloco, contando só linhas não vazias
  readonly nome: string; readonly tipo: string; readonly categoria: string; // como na célula, sem trim
  readonly valor: Cents;
}
export interface LinhaDeCartao extends LinhaLida { readonly bloco: "CARTAO"; readonly parcela: ParcelaDaLinha }
export interface LinhaNaoLida {
  readonly bloco: Bloco; readonly posicao: number;
  readonly nome: string; readonly tipo: string; readonly motivo: MotivoNaoLida;
}
export interface AbaLida {
  readonly fixos: ReadonlyArray<LinhaLida>;
  readonly cartao: ReadonlyArray<LinhaDeCartao>;
  readonly gastos: ReadonlyArray<LinhaLida>;
  readonly entradas: ReadonlyArray<LinhaLida>;        // tipo e categoria vazios
  readonly naoLidas: ReadonlyArray<LinhaNaoLida>;
  readonly totais: Readonly<Record<Bloco | "SAIDAS", Cents | null>>;
  readonly categoriasDaTabela: ReadonlyArray<string>;
}
export const TITULOS: Readonly<Record<Bloco, string>>; // "Fixos", "Cartão de Crédito", "Gastos do Mês", "Entradas"
export function lerAba(grade: Grade): Result<AbaLida, DomainError>;
// PLANILHA_ARQUIVO_INVALIDO quando nenhuma linha tem mais de uma coluna;
// PLANILHA_BLOCO_AUSENTE com detalhes { bloco: <título> } na ordem de TITULOS.
```

### `src/domain/importacao/competencia-do-arquivo.ts` e `src/domain/shared/competencia.ts`

```ts
export interface MesEAnoDoArquivo { readonly mes: number | null; readonly ano: number | null }
export function competenciaDoNomeDoArquivo(nomeArquivo: string): MesEAnoDoArquivo;
// em shared/competencia.ts:
export function competenciaDeAnoEMes(ano: number, mes: number): Result<Competencia, DomainError>; // COMPETENCIA_INVALIDA fora de 1..12 ou de 4 dígitos
```

### `src/domain/importacao/conferir-aba.ts`

```ts
export interface ConferenciaDeBloco {
  readonly linhas: number;
  readonly somaLida: Cents;                  // ZERO_CENTS quando não há linha
  readonly totalDaPlanilha: Cents | null;
  readonly confere: boolean;                 // totalDaPlanilha !== null && totalDaPlanilha === somaLida
  readonly diferenca: number | null;         // totalDaPlanilha − somaLida, em centavos; null sem total
}
export interface Conferencia {
  readonly blocos: Readonly<Record<Bloco, ConferenciaDeBloco>>;
  readonly saidas: ConferenciaDeBloco;       // FIXOS + CARTAO + GASTOS contra totais.SAIDAS
  readonly temDivergencia: boolean;
}
export function conferirAba(aba: AbaLida): Conferencia;
```

### `src/domain/parcelamento/reprecificar-parcelas.ts`

```ts
export interface ParcelaDaCompra { readonly numero: number; readonly valor: Cents }
export interface CompraParaReprecificar {
  readonly valorAmortizadoAnterior: Cents;
  readonly parcelas: ReadonlyArray<ParcelaDaCompra>;   // todas as gravadas
}
export interface Reprecificacao {
  readonly parcelas: ReadonlyArray<ParcelaDaCompra>;   // só as de número ≥ aPartirDe, com o valor novo
  readonly valorTotal: Cents;                          // amortizado + soma de todas, já com o valor novo
}
export function reprecificarAPartirDe(
  compra: CompraParaReprecificar, aPartirDe: number, valor: Cents,
): Result<Reprecificacao, DomainError>;                // PARCELA_INICIAL_INVALIDA se aPartirDe não é parcela gravada
```

### `src/domain/importacao/reconhecer-recorrencias.ts`

```ts
export interface RecorrenciaVigente {
  readonly id: string; readonly descricao: string;
  readonly meioPagamentoId: string; readonly valorEmM: Cents;
}
export interface LinhaDeRecorrencia {
  readonly bloco: "FIXOS" | "ENTRADAS"; readonly posicao: number; readonly nome: string;
  readonly meioPagamentoId: string | null;   // null em entrada: reconhece só pelo nome
  readonly valor: Cents | null;              // null = valor ilegível (linha não lida)
}
export type DestinoDeRecorrencia =
  | { readonly tipo: "NOVA"; readonly linha: LinhaDeRecorrencia }
  | { readonly tipo: "INALTERADA"; readonly linha: LinhaDeRecorrencia; readonly recorrenciaId: string }
  | { readonly tipo: "REAJUSTE"; readonly linha: LinhaDeRecorrencia; readonly recorrenciaId: string; readonly de: Cents; readonly para: Cents }
  | { readonly tipo: "PRESENTE_SEM_VALOR"; readonly linha: LinhaDeRecorrencia; readonly recorrenciaId: string };
export interface RecorrenciasReconhecidas {
  readonly destinos: ReadonlyArray<DestinoDeRecorrencia>;   // linha com valor null e sem par não entra
  readonly encerrar: ReadonlyArray<RecorrenciaVigente>;
}
export function reconhecerRecorrencias(
  linhas: ReadonlyArray<LinhaDeRecorrencia>, vigentes: ReadonlyArray<RecorrenciaVigente>,
): RecorrenciasReconhecidas;
// Chave: normalizarNome(nome) + meioPagamentoId (ou só o nome, quando meioPagamentoId é null).
// Pareamento por chave, na ordem das linhas e na ordem de `vigentes` (IMP-07 AC 12).
// Entrada sem decisão e com valor ilegível não gera pendência: só aparece entre as não lidas.
```

### `src/domain/importacao/reconhecer-compras.ts`

```ts
export const TOLERANCIA_DE_RECONHECIMENTO = 100; // centavos
export interface CompraEmCurso {
  readonly compraId: string; readonly descricao: string; readonly meioPagamentoId: string;
  readonly qtdParcelas: number; readonly numeroEmM: number; readonly valorEmM: Cents;
}
export interface LinhaDeCompra {
  readonly posicao: number; readonly nome: string; readonly meioPagamentoId: string;
  readonly parcela: ParcelaDaLinha; readonly valor: Cents;
}
export type DestinoDeCompra =
  | { readonly tipo: "COMPRA_NOVA"; readonly linha: LinhaDeCompra }
  | { readonly tipo: "CONTINUA"; readonly linha: LinhaDeCompra; readonly compraId: string }
  | { readonly tipo: "CONTINUA_COM_NOVO_VALOR"; readonly linha: LinhaDeCompra; readonly compraId: string; readonly de: Cents; readonly para: Cents };
export interface ComprasReconhecidas {
  readonly destinos: ReadonlyArray<DestinoDeCompra>;
  readonly naoAparecem: ReadonlyArray<CompraEmCurso>;
}
export function reconhecerCompras(
  linhas: ReadonlyArray<LinhaDeCompra>, emCurso: ReadonlyArray<CompraEmCurso>,
): ComprasReconhecidas;
// Linhas em ordem; candidatas ainda não usadas com mesmo nome normalizado, meio, qtdParcelas = t,
// numeroEmM = n e |valor − valorEmM| ≤ TOLERANCIA; vence a de menor diferença, empate pela ordem de emCurso.
```

### `src/domain/importacao/planejar-importacao.ts`

```ts
export type ClasseEntrada = "FIXA" | "AVULSA";
export interface DecisaoDeEntrada { readonly classe: ClasseEntrada; readonly contaId: string }
export interface DecisoesDaImportacao {
  readonly meios: ReadonlyMap<string, string>;                 // tipo normalizado → meioPagamentoId
  readonly entradas: ReadonlyMap<string, DecisaoDeEntrada>;    // nome normalizado → decisão
}
export interface EstadoParaImportacao {
  readonly competencia: Competencia;
  readonly despesasFixasVigentes: ReadonlyArray<RecorrenciaVigente>;   // valem em M − 1, natureza DESPESA
  readonly receitasFixasVigentes: ReadonlyArray<RecorrenciaVigente>;   // idem, RECEITA
  readonly comprasEmCurso: ReadonlyArray<CompraEmCurso>;               // têm parcela em M
  readonly categorias: ReadonlyArray<Categoria>;                        // inclusive arquivadas
}
export interface Pendencias {
  readonly tiposSemMeio: ReadonlyArray<{ readonly chave: string; readonly nome: string; readonly linhas: number }>;
  readonly entradasSemClasse: ReadonlyArray<{ readonly chave: string; readonly nome: string }>;
}
export type DestinoDaLinha = "NOVO" | "JA_EXISTE" | "REAJUSTE" | "CONTINUA" | "CONTINUA_COM_NOVO_VALOR" | "COMPRA_NOVA";
export interface LinhaDaPrevia {
  readonly bloco: Bloco; readonly posicao: number; readonly nome: string;
  readonly valor: Cents; readonly destino: DestinoDaLinha; readonly valorAnterior: Cents | null;
}
export interface OperacoesDaImportacao {
  readonly categorias: ReadonlyArray<{ readonly chave: string; readonly grafia: string; readonly acao: "CRIAR" | "REATIVAR" | "REAPROVEITAR"; readonly categoriaId: string | null }>;
  readonly recorrenciasNovas: ReadonlyArray<{ readonly natureza: "DESPESA" | "RECEITA"; readonly descricao: string; readonly valor: Cents; readonly meioPagamentoId: string; readonly chaveCategoria: string | null }>;
  readonly reajustes: ReadonlyArray<{ readonly recorrenciaId: string; readonly valor: Cents }>;
  readonly encerramentos: ReadonlyArray<string>;
  readonly comprasNovas: ReadonlyArray<{ readonly descricao: string; readonly meioPagamentoId: string; readonly chaveCategoria: string | null; readonly qtdParcelas: number; readonly parcelaInicial: number; readonly valorParcela: Cents }>;
  readonly reprecificacoes: ReadonlyArray<{ readonly compraId: string; readonly aPartirDe: number; readonly valor: Cents }>;
  readonly avulsos: ReadonlyArray<{ readonly natureza: "DESPESA" | "RECEITA"; readonly descricao: string; readonly valor: Cents; readonly meioPagamentoId: string; readonly chaveCategoria: string | null; readonly chaveDeOrigem: string }>;
  readonly decisoes: DecisoesDaImportacao;   // as usadas nesta aba, a gravar/atualizar
}
export interface PlanoDeImportacao {
  readonly competencia: Competencia;
  readonly conferencia: Conferencia;
  readonly pendencias: Pendencias;
  readonly linhas: ReadonlyArray<LinhaDaPrevia>;
  readonly naoLidas: ReadonlyArray<LinhaNaoLida>;
  readonly deixamDeValer: ReadonlyArray<{ readonly recorrenciaId: string; readonly descricao: string }>;
  readonly naoAparecem: ReadonlyArray<{ readonly compraId: string; readonly descricao: string; readonly numero: number }>;
  readonly quantidadeAImportar: number;          // linhas com destino NOVO, REAJUSTE, CONTINUA_COM_NOVO_VALOR ou COMPRA_NOVA
  readonly operacoes: OperacoesDaImportacao | null; // null enquanto houver pendência
}
export function planejarImportacao(entrada: {
  readonly aba: AbaLida; readonly estado: EstadoParaImportacao; readonly decisoes: DecisoesDaImportacao;
}): PlanoDeImportacao;
// chaveDeOrigem = `${competencia}|${bloco}|${posicao}` (IMP-03 AC 8).
// Pendências nascem só de linhas lidas; `linhas` conta as linhas lidas que usam o "Tipo".
// Linha não lida de Fixos usa a ligação de "Tipo" lembrada, se houver, para o reconhecimento
// "presente sem valor"; sem ligação, ela não reconhece nada e não gera pendência.
// Ordem de grafia de categoria: Fixos, Cartão de Crédito, Gastos do Mês, depois a tabela (IMP-03 AC 10-11).
```

### Ports — `src/application/ports/repositories.ts`

```ts
// CadastroRepository ganha (já implementados na classe concreta, exceto o último):
buscarCategoriaPorNome(nome: string): Promise<Categoria | null>;
criarCategoria(nova: { readonly nome: string; readonly arquivadaEm: null }): Promise<Categoria>;
reativarCategoria(id: string): Promise<Categoria>;
listarTodasAsCategorias(): Promise<ReadonlyArray<Categoria>>;   // inclusive arquivadas

// CompraRepository ganha:
buscarPorId(compraId: string): Promise<CompraPersistida | null>;
reprecificar(compraId: string, parcelas: ReadonlyArray<ParcelaDaCompra>, valorTotal: Cents): Promise<void>;

// EntradaLancamentoAvulso ganha, opcional:
readonly origemDado?: { readonly fonte: "PLANILHA"; readonly chave: string };

// Novas:
export interface ImportacaoRegistrada { readonly competencia: Competencia; readonly nomeArquivo: string; readonly usuarioId: string }
export interface ImportacaoRepository {
  ultimaCompetenciaImportada(): Promise<Competencia | null>;
  haLancamentoCompraOuRecorrencia(): Promise<boolean>;
  decisoesLembradas(): Promise<DecisoesDaImportacao>;
  registrar(importacao: ImportacaoRegistrada, decisoes: DecisoesDaImportacao): Promise<void>; // decisões por upsert em (tipo, nome_normalizado)
}
export interface RepositoriosDaImportacao {
  readonly compras: CompraRepository; readonly movimentos: MovimentoRepository;
  readonly recorrencias: RecorrenciaRepository; readonly cadastros: CadastroRepository;
  readonly importacoes: ImportacaoRepository;
}
export interface TransacaoDaImportacao {
  executar<T>(operacao: (repos: RepositoriosDaImportacao) => Promise<T>): Promise<T>;
}
```

`src/application/ports/fakes.ts` ganha `FakeImportacaoRepository`, `FakeTransacaoDaImportacao`
(executa a operação sobre os fakes, sem rollback — rollback é prova de integração) e os métodos
novos nos fakes existentes.

### Aplicação — `src/application/importacao/`

```ts
// carregar-estado.ts
export async function carregarEstadoParaImportacao(
  repos: Pick<RepositoriosDaImportacao, "compras" | "movimentos" | "recorrencias" | "cadastros">,
  competencia: Competencia,
): Promise<EstadoParaImportacao>;

// prever-importacao/handler.ts
export type CodigoErroImportacao =
  | "PLANILHA_ARQUIVO_INVALIDO" | "PLANILHA_BLOCO_AUSENTE" | "IMPORTACAO_FORA_DE_ORDEM"
  | "IMPORTACAO_BANCO_NAO_VAZIO" | "IMPORTACAO_PENDENCIA_ABERTA" | "IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA";
export interface ErroImportacao { readonly code: CodigoErroImportacao; readonly detalhes?: Record<string, unknown> }
export interface EntradaDaImportacao {
  readonly nomeArquivo: string; readonly conteudo: string;
  readonly competencia: Competencia; readonly decisoes: DecisoesDaImportacao;
}
export interface PreviaDaImportacao { readonly plano: PlanoDeImportacao; readonly competenciaEsperada: Competencia | null }
export async function preverImportacao(
  repos: RepositoriosDaImportacao, entrada: EntradaDaImportacao,
): Promise<Result<PreviaDaImportacao, ErroImportacao>>;

// gravar-importacao/handler.ts
export interface EntradaGravarImportacao extends EntradaDaImportacao {
  readonly confirmouDivergencia: boolean; readonly usuarioId: string; readonly agora: string;
}
export interface ResumoDaImportacao {
  readonly competencia: Competencia; readonly proxima: Competencia;
  readonly criados: number; readonly alterados: number; readonly encerrados: number;
}
export async function gravarImportacao(
  transacao: TransacaoDaImportacao, entrada: EntradaGravarImportacao,
): Promise<Result<ResumoDaImportacao, ErroImportacao>>;
```

`criados` = recorrências novas + compras novas + avulsos; `alterados` = reajustes + reprecificações;
`encerrados` = encerramentos. A guarda de ordem e de banco vazio é a mesma função privada nos dois
handlers (`verificarOrdem`). Erro de domínio dentro da transação vira uma exceção privada
(`ImportacaoAbortada`) que o handler captura fora de `executar` e devolve como `err`.

### Schema — `src/application/schemas/importacao.schema.ts`

```ts
export const MAX_CONTEUDO_PLANILHA = 1_048_576;
export const entradaPreviaImportacaoSchema: z.ZodObject<…>; // nomeArquivo (1..255, termina em .csv), conteudo (1..MAX), competencia, decisoes { meios: Record<string, uuid>, entradas: Record<string, { classe, contaId: uuid }> }
export const entradaGravacaoImportacaoSchema; // o anterior + confirmouDivergencia: boolean
```

### Actions — `src/app/actions/importacao.ts`

```ts
export async function previaDaPlanilha(payload: unknown): Promise<ResultadoAction<PreviaParaATela>>;
export async function importarPlanilha(payload: unknown): Promise<ResultadoAction<ResumoDaImportacao>>;
```

`PreviaParaATela` é a prévia sem `operacoes` e sem `Map` (registros simples), para atravessar a
fronteira do cliente. Mensagens novas em `src/lib/erros.ts`:

| Código | Mensagem |
| --- | --- |
| `PLANILHA_ARQUIVO_INVALIDO` | Este arquivo não parece uma aba da planilha exportada em CSV. No Google Sheets: Arquivo → Fazer download → Valores separados por vírgula (.csv). |
| `PLANILHA_BLOCO_AUSENTE` | O arquivo não tem o bloco “{bloco}”. Exporte a aba de um mês da planilha. |
| `IMPORTACAO_FORA_DE_ORDEM` | As abas entram em sequência. A próxima é {competência por extenso}. |
| `IMPORTACAO_BANCO_NAO_VAZIO` | Já existem lançamentos no app. Rode o script de limpeza antes da primeira importação. |
| `IMPORTACAO_PENDENCIA_ABERTA` | Ainda há meio de pagamento ou entrada sem decisão. |
| `IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA` | Há totais que não batem. Confirme que entendeu a diferença antes de importar. |

As chaves `{…}` são compostas na action a partir de `detalhes`. Sucesso revalida
`/${competencia}`, `/${competencia}/lancamentos` e `/${competencia}/fixos`.

### Interface — `src/components/importacao/`

| Componente | Responsabilidade |
| --- | --- |
| `dialogo-importacao.tsx` | Botão "Importar planilha" e o `<dialog>`; guarda o passo atual e o que cada passo produziu; pula o passo 2 sem pendência |
| `passo-arquivo.tsx` | Arrastar e soltar + seletor `.csv`, leitura local com `lerCsv`/`lerAba`, seletores de mês e ano, avisos do passo 1 |
| `passo-pendencias.tsx` | Um seletor de meio por "Tipo" (com `CadastroDeMeioInline`), fixa/avulsa e "cai em" por entrada |
| `passo-conferencia.tsx` | Conferência por bloco e de Saídas, blocos abríveis com destino por linha, não lidas, confirmação de divergência, botão "Importar N lançamentos" |
| `resultado-importacao.tsx` | Contagens, link para a competência, "Próximo: …" |
| `../cadastro-de-meio-inline.tsx` | Extraído de `form-lancamento-avulso.tsx` (movido, não copiado), com `nomeInicial` opcional |

As actions entram por props, como `criarMeioDePagamento` já entra em `FormLancamentoAvulso`. A
página `src/app/(app)/[competencia]/page.tsx` passa nome de quem está logado, competência
esperada, meios disponíveis e as três actions.

**Restrição registrada:** `BotaoAbrirCadastro` clica no primeiro `button[aria-haspopup="dialog"]`
da página. Ele só existe em Lançamentos, e o botão de importar só na Visão geral. Levar a
importação para Lançamentos exige antes restringir aquele seletor.

---

## Fixtures sintéticas

Três arquivos em `src/domain/importacao/__fixtures__/` — `Planilha 2026 - Outubro.csv`,
`Planilha 2026 - Novembro.csv`, `Planilha 2026 - Dezembro.csv` — no **layout exato** do
`context.md` (colunas C a I, K a O, Q e R, T a W), com A1 contendo `X` e uma linha residual sem nome e
sem valor com "Tipo" `Débito` no Gastos do Mês. Valores escolhidos por propriedade, não por realismo
(AD-009). Testes de domínio leem os arquivos com `node:fs` (permitido em teste de domínio pelo
`biome.json`); o e2e os entrega ao seletor de arquivo pelo caminho.

**Outubro (2026-10)** — banco vazio, só o cadastro base (Pessoa A, Cartão Roxo, Conta Corrente,
Categoria Um).

| Bloco | Nome | Parc. | Tipo | Categoria | Valor | Esperado |
| --- | --- | --- | --- | --- | --- | --- |
| Fixos | Aluguel | | Débito | Moradia | R$ 1.500,00 | NOVO |
| Fixos | Internet | | Cartão Roxo | Assinaturas | R$ 100,00 | NOVO |
| Fixos | Academia | | Débito | Saúde | R$ 120,00 | NOVO |
| Fixos | Academia | | Cartão Roxo | Saúde | R$ 120,00 | NOVO (homônimo em outro meio) |
| Fixos | "Seguro (casa, carro)" | | Débito | Seguros | *(vazio)* | não lida `VALOR_VAZIO` |
| Cartão | Sofá | 7/10 | Cartão Roxo | Casa | R$ 210,00 | COMPRA_NOVA |
| Cartão | Fone | 1/3 | Cartão Roxo | Eletrônicos | R$ 33,34 | COMPRA_NOVA |
| Cartão | Curso | 3/3 | Cartão Verde | Estudo | R$ 50,00 | COMPRA_NOVA |
| Cartão | Óculos | 2/5 | Débito | Saúde | R$ 80,00 | COMPRA_NOVA (parcelado em conta) |
| Cartão | Livro | 1/2 | Cartão Roxo | Estudo | R$ 20,00 | COMPRA_NOVA |
| Cartão | Livro | 1/2 | Cartão Roxo | Estudo | R$ 30,00 | COMPRA_NOVA |
| Gastos | Feira | 19/09 | Débito | Mercado | R$ 87,40 | NOVO |
| Gastos | Farmácia | | Cartão Roxo | Saúde | R$ 25,10 | NOVO |
| Gastos | Padaria | | Cartão Roxo | MERCADO | R$ 12,00 | NOVO (categoria "Mercado") |
| Entradas | Salário A | | | | R$ 6.000,00 | NOVO, decidida FIXA em Conta Corrente |
| Entradas | Salário B | | | | R$ 4.000,00 | NOVO, decidida FIXA em Conta Corrente |
| Entradas | Reembolso | | | | R$ 150,00 | NOVO, decidida AVULSA em Conta Corrente |

Totais da planilha: Fixos R$ 1.840,00 ✓ · Cartão R$ 423,34 ✓ · **Gastos R$ 112,50 ✗ (lido 124,50,
diferença −12,00: o total cobre só as duas primeiras linhas)** · Entradas R$ 10.150,00 ✓ ·
**Saídas R$ 2.387,84 ✓**. Tabela de categorias: Moradia, Assinaturas, Saúde, *(linha vazia)*, Casa,
Eletrônicos, Estudo, Mercado, Lazer — "Lazer" não aparece em linha nenhuma. Pendências: "Tipo"
`Débito`, `Cartão Roxo`, `Cartão Verde`; entradas Salário A, Salário B, Reembolso.
`quantidadeAImportar` = 16.

**Novembro (2026-11)**

| Bloco | Nome | Parc. | Tipo | Categoria | Valor | Esperado |
| --- | --- | --- | --- | --- | --- | --- |
| Fixos | Aluguel | | Débito | Moradia | R$ 1.500,00 | JA_EXISTE |
| Fixos | Internet | | Cartão Roxo | Assinaturas | R$ 110,00 | REAJUSTE 100,00 → 110,00 |
| Fixos | Academia | | Débito | Saúde | R$ 120,00 | JA_EXISTE |
| Fixos | Streaming | | Cartão Azul | Assinaturas | R$ 30,00 | NOVO |
| Cartão | Sofá | 8/10 | Cartão Roxo | Casa | R$ 210,00 | CONTINUA |
| Cartão | Fone | 2/3 | Cartão Roxo | Eletrônicos | R$ 33,33 | CONTINUA_COM_NOVO_VALOR 33,34 → 33,33 |
| Cartão | Óculos | 3/5 | Débito | Saúde | R$ 80,00 | CONTINUA |
| Cartão | Livro | 2/2 | Cartão Roxo | Estudo | R$ 30,02 | CONTINUA_COM_NOVO_VALOR 30,00 → 30,02 (a de 30,00) |
| Cartão | Livro | 2/2 | Cartão Roxo | Estudo | R$ 20,00 | CONTINUA (a de 20,00) |
| Cartão | Tênis | 1/2 | Cartão Roxo | Vestuário | R$ 150,00 | COMPRA_NOVA |
| Gastos | Mercado do mês | | Débito | Mercado | R$ 300,00 | NOVO |
| Gastos | Cinema | | Cartão Roxo | Lazer | R$ 45,00 | NOVO |
| Entradas | Salário A | | | | R$ 6.000,00 | JA_EXISTE |
| Entradas | Salário B | | | | R$ 4.200,00 | REAJUSTE 4.000,00 → 4.200,00 |
| Entradas | Presente | | | | R$ 200,00 | NOVO, decidida AVULSA em Conta Corrente |

Deixa de valer: Academia / Cartão Roxo. Totais: Fixos R$ 1.760,00 ✓ · Cartão R$ 523,35 ✓ · Gastos
R$ 345,00 ✓ · Entradas R$ 10.400,00 ✓ · Saídas R$ 2.628,35 ✓ — **nenhuma divergência**. Pendências:
só `Cartão Azul` e Presente. `quantidadeAImportar` = 9.

**Dezembro (2026-12)**

| Bloco | Nome | Parc. | Tipo | Categoria | Valor | Esperado |
| --- | --- | --- | --- | --- | --- | --- |
| Fixos | Aluguel | | Débito | Moradia | R$ 1.500,00 | JA_EXISTE |
| Fixos | Internet | | Cartão Roxo | Assinaturas | *(vazio)* | presente, mantém 110,00; não lida `VALOR_VAZIO` |
| Fixos | Academia | | Débito | Saúde | R$ 120,00 | JA_EXISTE |
| Fixos | Streaming | | Cartão Azul | Assinaturas | R$ 30,00 | JA_EXISTE |
| Cartão | Sofá | 9/10 | Cartão Roxo | Casa | R$ 210,00 | CONTINUA |
| Cartão | Fone | 3/3 | Cartão Roxo | Eletrônicos | R$ 33,33 | CONTINUA |
| Cartão | Tênis | 2/2 | Cartão Roxo | Vestuário | R$ 150,00 | CONTINUA |
| Cartão | Mesa | 12/10 | Cartão Roxo | Casa | R$ 40,00 | não lida `PARCELA_INVALIDA` |
| Gastos | Ceia | | Débito | Mercado | R$ 400,00 | NOVO |
| Entradas | Salário A | | | | R$ 6.000,00 | JA_EXISTE |
| Entradas | Bônus | | | | `200*` | não lida `VALOR_INVALIDO` |
| Entradas | Presente | | | | R$ 100,00 | NOVO, AVULSA lembrada — sem pendência |

Deixa de valer: Salário B. Não aparece nesta aba: Óculos (parcela 4). Totais: Fixos R$ 1.650,00 ✓ ·
**Cartão R$ 433,33 ✗ (lido 393,33, diferença +40,00: a linha da Mesa)** · Gastos R$ 400,00 ✓ ·
Entradas R$ 6.100,00 ✓ · **Saídas R$ 2.483,33 ✗ (lido 2.443,33)**. Pendências: nenhuma.
`quantidadeAImportar` = 2.

**Estado final esperado depois das três**, sobre o qual o teste de integração do IMP-07 assere:

- 7 recorrências: Aluguel (1 vigência), Internet (vigências 2026-10 = 10000 e 2026-11 = 11000),
  Academia/Débito, Academia/Cartão Roxo (`competencia_fim` 2026-10), Streaming (desde 2026-11),
  Salário A, Salário B (vigências 400000 e 420000, `competencia_fim` 2026-11).
- 7 compras: Sofá (parcelas 7–10, amortizado 126000, total 210000), Fone (3334 + 3333 + 3333,
  total 10000), Curso (só a 3, amortizado 10000, total 15000), Óculos (2–5, meio Conta Corrente,
  amortizado 8000, total 40000), Livro de 20 (total 4000), Livro de 30 (3000 + 3002, total 6002),
  Tênis (total 30000). Nenhuma "Mesa".
- 9 avulsos com `origem_dado = 'PLANILHA'`: 3 + 1 receita em outubro, 2 + 1 em novembro, 1 + 1 em
  dezembro.
- 3 linhas em `importacao`; decisões: 4 meios (`débito`, `cartão roxo`, `cartão verde`,
  `cartão azul`) e 4 entradas (`salário a` e `salário b` FIXA, `reembolso` e `presente` AVULSA).

---

## Limitações conhecidas

- O meio cadastrado no passo 2 é gravado na hora, fora da transação; uma importação abandonada
  deixa o meio criado. Inofensivo, e coerente com o padrão de `CadastroInline`.
- Lançamento manual entre importações está fora do desenho (Out of Scope da spec).
- Os campos de meio continuam duplicados em `form-compra.tsx` e `form-recorrencia.tsx`; esta fatia
  move o de `form-lancamento-avulso.tsx` para um componente e não toca os outros dois.
