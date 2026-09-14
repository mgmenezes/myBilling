"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import type { criarCompra } from "@/app/actions/compras";
import { planoDaCompra } from "@/application/compras/plano-da-compra";
import { entradaCompraSchema } from "@/application/schemas/compra.schema";
import { parseBRL } from "@/domain";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";

/**
 * Cadastro da compra parcelada: o formulário que resolve a dor central.
 *
 * Duas propriedades mandam aqui:
 *
 * 1. **O preview usa a mesma função que persiste.** `planoDaCompra` é a função
 *    que a Server Action chama para gravar. O centavo residual que aparece na
 *    tela é o mesmo que vai para o banco — preview e gravação não têm como
 *    divergir, porque não são dois cálculos (PARC-01, PARC-04, PARC-06).
 * 2. **A chave de idempotência nasce ao abrir o formulário**, não ao submeter
 *    (PARC-05, AC 9). Gerar no submit não protegeria contra o duplo-clique,
 *    que é o caso real. Depois de gravar, o formulário troca de chave: a
 *    próxima compra é outra compra.
 *
 * Nenhum valor monetário é manipulado como decimal: o texto digitado vira
 * centavos por `parseBRL`, do domínio (AD-001).
 */

export interface OpcaoDeCadastro {
  readonly id: string;
  readonly nome: string;
}

export interface FormCompraProps {
  /** Competência da parcela inicial: o mês que o usuário está vendo. */
  readonly competencia: string;
  readonly meios: ReadonlyArray<OpcaoDeCadastro>;
  readonly categorias: ReadonlyArray<OpcaoDeCadastro>;
  readonly usuarios: ReadonlyArray<OpcaoDeCadastro>;
  /** A Server Action de T49. Recebida por prop para o componente não conhecer
   * infraestrutura nenhuma. */
  readonly enviar: typeof criarCompra;
}

type Campos = Record<string, string>;

interface Confirmacao {
  readonly descricao: string;
  readonly qtdParcelas: number;
}

const ROTULO_CLASSE = "text-sm font-medium text-zinc-900 dark:text-zinc-50";
const CONTROLE_CLASSE =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const ERRO_CLASSE = "text-sm text-red-700 dark:text-red-400";

function inteiro(texto: string): number {
  const valor = Number.parseInt(texto, 10);
  return Number.isNaN(valor) ? Number.NaN : valor;
}

export function FormCompra({ competencia, meios, categorias, usuarios, enviar }: FormCompraProps) {
  const router = useRouter();
  const id = useId();
  const [pendente, iniciarEnvio] = useTransition();

  // Gerada **ao abrir**, não ao submeter (PARC-05, AC 9).
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const [descricao, setDescricao] = useState("");
  const [modo, setModo] = useState<"TOTAL" | "VALOR_PARCELA">("TOTAL");
  const [valor, setValor] = useState("");
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const [parcelaInicial, setParcelaInicial] = useState("1");
  const [dataEvento, setDataEvento] = useState(`${competencia}-01`);
  const [categoriaId, setCategoriaId] = useState("");
  const [usuarioId, setUsuarioId] = useState(usuarios[0]?.id ?? "");
  const [meioPagamentoId, setMeioPagamentoId] = useState(meios[0]?.id ?? "");

  const [campos, setCampos] = useState<Campos>({});
  const [erroGeral, setErroGeral] = useState("");
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const valorEmCentavos = parseBRL(valor);

  /** Recalculado a cada tecla pela função que grava. */
  const previa = useMemo(() => {
    if (!valorEmCentavos.ok) {
      return null;
    }
    const montado = planoDaCompra({
      modo,
      valorCentavos: valorEmCentavos.value,
      qtdParcelas: inteiro(qtdParcelas),
      parcelaInicial: inteiro(parcelaInicial),
      competenciaInicial: competencia,
      politicaResiduo: "PRIMEIRAS",
    });
    return montado.ok ? montado.value.plano : null;
  }, [valorEmCentavos, modo, qtdParcelas, parcelaInicial, competencia]);

  function enviarFormulario(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroGeral("");
    setConfirmacao(null);

    const payload = {
      idempotencyKey,
      descricao,
      modo,
      // Texto que não é um valor em reais entra como zero: o schema o rejeita
      // com a mesma mensagem de "valor não positivo" (PARC-05, AC 7), em vez
      // de um `NaN` que produziria erro de tipo em vez de erro de campo.
      valorCentavos: valorEmCentavos.ok ? valorEmCentavos.value : 0,
      qtdParcelas: inteiro(qtdParcelas),
      parcelaInicial: inteiro(parcelaInicial),
      competenciaInicial: competencia,
      politicaResiduo: "PRIMEIRAS" as const,
      categoriaId: categoriaId === "" ? null : categoriaId,
      usuarioId,
      meioPagamentoId,
      dataEvento,
    };

    // O cliente valida para dar retorno imediato; o servidor revalida de novo,
    // porque quem manda é o servidor (AUTH-02, AC 4).
    const local = entradaCompraSchema.safeParse(payload);
    if (!local.success) {
      const encontrados: Campos = {};
      for (const issue of local.error.issues) {
        const campo = issue.path.join(".");
        encontrados[campo] ??= issue.message;
      }
      setCampos(encontrados);
      return;
    }
    setCampos({});

    iniciarEnvio(async () => {
      const resposta = await enviar(payload);
      if (!resposta.ok) {
        setCampos(resposta.erro.campos ?? {});
        setErroGeral(resposta.erro.campos ? "" : resposta.erro.mensagem);
        return;
      }
      setConfirmacao({
        descricao: resposta.data.descricao,
        qtdParcelas: resposta.data.parcelas.length,
      });
      setDescricao("");
      setValor("");
      // Compra gravada, chave queimada: a próxima compra precisa da sua.
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    });
  }

  function erroDe(campo: string) {
    const mensagem = campos[campo];
    if (!mensagem) {
      return { props: {}, no: null };
    }
    return {
      props: { "aria-invalid": true, "aria-describedby": `${id}-${campo}-erro` },
      no: (
        <p id={`${id}-${campo}-erro`} className={ERRO_CLASSE}>
          {mensagem}
        </p>
      ),
    };
  }

  const erroValor = erroDe("valorCentavos");
  const erroQtd = erroDe("qtdParcelas");
  const erroInicial = erroDe("parcelaInicial");
  const erroDescricao = erroDe("descricao");
  const erroMeio = erroDe("meioPagamentoId");

  return (
    <form
      onSubmit={enviarFormulario}
      aria-labelledby={`${id}-titulo`}
      className="flex w-full flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 id={`${id}-titulo`} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Nova compra parcelada
      </h2>

      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="flex flex-col gap-1">
        <label className={ROTULO_CLASSE} htmlFor={`${id}-descricao`}>
          Descrição
        </label>
        <input
          id={`${id}-descricao`}
          className={CONTROLE_CLASSE}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          {...erroDescricao.props}
        />
        {erroDescricao.no}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={ROTULO_CLASSE}>O valor informado é</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-50">
            <input
              type="radio"
              name="modo"
              value="TOTAL"
              checked={modo === "TOTAL"}
              onChange={() => setModo("TOTAL")}
            />
            Valor total
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-50">
            <input
              type="radio"
              name="modo"
              value="VALOR_PARCELA"
              checked={modo === "VALOR_PARCELA"}
              onChange={() => setModo("VALOR_PARCELA")}
            />
            Valor da parcela
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label className={ROTULO_CLASSE} htmlFor={`${id}-valor`}>
          {modo === "TOTAL" ? "Valor total (R$)" : "Valor da parcela (R$)"}
        </label>
        <input
          id={`${id}-valor`}
          className={CONTROLE_CLASSE}
          inputMode="decimal"
          placeholder="1.000,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          {...erroValor.props}
        />
        {erroValor.no}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO_CLASSE} htmlFor={`${id}-qtd`}>
            Quantidade de parcelas
          </label>
          <input
            id={`${id}-qtd`}
            className={CONTROLE_CLASSE}
            type="number"
            min={1}
            max={120}
            value={qtdParcelas}
            onChange={(e) => setQtdParcelas(e.target.value)}
            {...erroQtd.props}
          />
          {erroQtd.no}
        </div>
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO_CLASSE} htmlFor={`${id}-inicial`}>
            Já estou na parcela
          </label>
          <input
            id={`${id}-inicial`}
            className={CONTROLE_CLASSE}
            type="number"
            min={1}
            value={parcelaInicial}
            onChange={(e) => setParcelaInicial(e.target.value)}
            {...erroInicial.props}
          />
          {erroInicial.no}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO_CLASSE} htmlFor={`${id}-meio`}>
            Meio de pagamento
          </label>
          <select
            id={`${id}-meio`}
            className={CONTROLE_CLASSE}
            value={meioPagamentoId}
            onChange={(e) => setMeioPagamentoId(e.target.value)}
            {...erroMeio.props}
          >
            {meios.map((meio) => (
              <option key={meio.id} value={meio.id}>
                {meio.nome}
              </option>
            ))}
          </select>
          {erroMeio.no}
        </div>
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO_CLASSE} htmlFor={`${id}-categoria`}>
            Categoria
          </label>
          <select
            id={`${id}-categoria`}
            className={CONTROLE_CLASSE}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO_CLASSE} htmlFor={`${id}-usuario`}>
            De quem é a compra
          </label>
          <select
            id={`${id}-usuario`}
            className={CONTROLE_CLASSE}
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
          >
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO_CLASSE} htmlFor={`${id}-data`}>
            Data da compra
          </label>
          <input
            id={`${id}-data`}
            className={CONTROLE_CLASSE}
            type="date"
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
          />
        </div>
      </div>

      <section aria-label="Previsão das parcelas" className="flex flex-col gap-2">
        <h3 className={ROTULO_CLASSE}>Parcelas que serão criadas</h3>
        {previa === null ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Informe o valor e a quantidade de parcelas para ver a previsão.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {previa.parcelas.map((parcela) => (
              <li
                key={parcela.numero}
                className="flex flex-wrap justify-between gap-2 text-sm text-zinc-900 dark:text-zinc-50"
              >
                <span>
                  {parcela.numero}/{inteiro(qtdParcelas)} {formatarCompetencia(parcela.competencia)}
                </span>
                <span className="font-medium">{formatarBRL(parcela.valor)}</span>
              </li>
            ))}
            <li className="flex flex-wrap justify-between gap-2 border-t border-zinc-200 pt-1 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
              <span>Total da compra</span>
              <span className="font-medium">{formatarBRL(previa.valorTotal)}</span>
            </li>
          </ul>
        )}
      </section>

      {erroGeral === "" ? null : (
        <p role="alert" className={ERRO_CLASSE}>
          {erroGeral}
        </p>
      )}

      {confirmacao === null ? null : (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {confirmacao.descricao} gravada em {confirmacao.qtdParcelas} parcela
          {confirmacao.qtdParcelas === 1 ? "" : "s"}.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        aria-busy={pendente}
        className="rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {pendente ? "Gravando…" : "Cadastrar compra"}
      </button>
    </form>
  );
}
