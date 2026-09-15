"use client";

import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import type { criarCategoria as criarCategoriaAction } from "@/app/actions/categorias";
import type { criarCompra } from "@/app/actions/compras";
import type { criarMeioDePagamento as criarMeioAction } from "@/app/actions/meios-de-pagamento";
import { planoDaCompra } from "@/application/compras/plano-da-compra";
import { entradaCategoriaSchema, MAX_NOME_CATEGORIA } from "@/application/schemas/categoria.schema";
import { entradaCompraSchema } from "@/application/schemas/compra.schema";
import {
  entradaMeioPagamentoSchema,
  MAX_NOME_MEIO,
  TIPOS_DE_MEIO,
} from "@/application/schemas/meio-pagamento.schema";
import { parseBRL } from "@/domain";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";
import { CadastroInline } from "./cadastro-inline";
import { useFecharDialogo } from "./dialogo-de-cadastro";

/**
 * Cadastro de compra: o formulário que resolve a dor central.
 *
 * Ele se chama "Nova compra", e não "Nova compra parcelada", porque atende os
 * dois casos com o mesmo campo: em `1` parcela é a compra avulsa no cartão, em
 * `n` é o parcelamento que a planilha obrigava a redigitar mês a mês. Chamá-lo
 * de parcelado escondia metade do que ele faz — quem queria lançar uma compra
 * única não reconhecia o formulário como sendo para ela.
 *
 * Duas propriedades mandam aqui:
 *
 * 1. **O preview usa a mesma função que persiste.** `planoDaCompra` é a função
 *    que a Server Action chama para gravar. O centavo residual que aparece na
 *    tela é o mesmo que vai para o banco. Preview e gravação não têm como
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
  /** Mesma razão: a criação de cadastro chega por prop, não por import. */
  readonly criarCategoria: typeof criarCategoriaAction;
  readonly criarMeioDePagamento: typeof criarMeioAction;
}

type Campos = Record<string, string>;

interface Confirmacao {
  readonly descricao: string;
  readonly qtdParcelas: number;
}

const ROTULO_CLASSE = "text-[14px] font-medium text-ink";
const CONTROLE_CLASSE =
  "w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong " +
  "aria-[invalid=true]:border-negativo aria-[invalid=true]:border-2";
/*
 * Erro na semântica negativa do sistema, que é cor de **texto** — e nunca
 * sozinha: a borda do campo engrossa e um ícone acompanha, para quem não
 * separa matiz continuar vendo qual campo falhou.
 */
const ERRO_CLASSE = "flex items-center gap-1.5 text-[14px] font-medium text-negativo";

function inteiro(texto: string): number {
  const valor = Number.parseInt(texto, 10);
  return Number.isNaN(valor) ? Number.NaN : valor;
}

export function FormCompra({
  competencia,
  meios,
  categorias,
  usuarios,
  enviar,
  criarCategoria,
  criarMeioDePagamento,
}: FormCompraProps) {
  const router = useRouter();
  const id = useId();
  const [pendente, iniciarEnvio] = useTransition();
  const fecharDialogo = useFecharDialogo();
  const reduzir = useReducedMotion();

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

  /*
   * As listas de cadastro são semeadas pelas props do servidor e crescem
   * localmente quando um item novo é criado. O `revalidatePath` da action traz
   * a lista nova do servidor logo depois, mas o estado local é o que permite
   * **selecionar o item no mesmo instante**, sem esperar o round-trip e sem
   * que nada do formulário já preenchido se perca.
   */
  const [listaCategorias, setListaCategorias] = useState(categorias);
  const [nomeCategoria, setNomeCategoria] = useState("");

  const [listaMeios, setListaMeios] = useState(meios);
  const [nomeMeio, setNomeMeio] = useState("");
  const [tipoMeio, setTipoMeio] =
    useState<(typeof TIPOS_DE_MEIO)[number]["valor"]>("CARTAO_CREDITO");
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");

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

  /**
   * O payload da categoria, ou o erro de validação. O mesmo schema do
   * servidor, para os dois nunca divergirem (AUTH-02, AC 4).
   */
  function payloadDeCategoria() {
    return entradaCategoriaSchema.safeParse({ nome: nomeCategoria });
  }

  /**
   * O payload do meio de pagamento. Os dias só entram quando o tipo é cartão:
   * enviá-los para conta ou rótulo violaria o `CHECK` bicondicional do banco,
   * e o schema é uma união discriminada justamente por isso.
   */
  function payloadDeMeio() {
    return entradaMeioPagamentoSchema.safeParse(
      tipoMeio === "CARTAO_CREDITO"
        ? {
            nome: nomeMeio,
            tipo: tipoMeio,
            diaFechamento: inteiro(diaFechamento),
            diaVencimento: inteiro(diaVencimento),
          }
        : { nome: nomeMeio, tipo: tipoMeio },
    );
  }

  function primeiroErro(resultado: {
    success: boolean;
    error?: { issues: { message: string }[] };
  }) {
    return resultado.success ? null : (resultado.error?.issues[0]?.message ?? "Dado inválido.");
  }

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
      /* Fecha o diálogo, se houver um em volta. Fora dele é no-op. */
      fecharDialogo();
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
          <WarningCircleIcon
            size={16}
            weight="fill"
            aria-hidden="true"
            className="shrink-0 text-negativo"
          />
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
      /* Sem `<h2>` próprio: o diálogo já titula e a aba já distingue. O nome
         acessível permanece "Nova compra", que é como a tela o identifica. */
      aria-label="Nova compra"
      className="flex w-full flex-col gap-5"
    >
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
          <label className="flex items-center gap-2 text-[15px] text-ink">
            <input
              type="radio"
              name="modo"
              value="TOTAL"
              checked={modo === "TOTAL"}
              onChange={() => setModo("TOTAL")}
            />
            Valor total
          </label>
          <label className="flex items-center gap-2 text-[15px] text-ink">
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
        <CadastroInline
          rotulo="Meio de pagamento"
          idDoControle={`${id}-meio`}
          rotuloDoAtalho="+ novo"
          descricaoDoGrupo="Novo meio de pagamento"
          validar={() => primeiroErro(payloadDeMeio())}
          aoCriar={async () => {
            const validado = payloadDeMeio();
            if (!validado.success) {
              throw new Error("payload inválido chegou ao envio");
            }
            return criarMeioDePagamento(validado.data);
          }}
          aoCriado={(criado) => {
            setListaMeios((atual) =>
              atual.some((m) => m.id === criado.id) ? atual : [...atual, criado],
            );
            setMeioPagamentoId(criado.id);
          }}
          aoLimpar={() => {
            setNomeMeio("");
            setTipoMeio("CARTAO_CREDITO");
            setDiaFechamento("");
            setDiaVencimento("");
          }}
          ajuda={
            tipoMeio === "ROTULO"
              ? "Rótulo não é meio de pagamento: é uma etiqueta para separar um gasto específico, sem ciclo e sem fatura."
              : "Ele passa a valer para todos os meses, inclusive os que ainda não chegaram."
          }
          campos={(idCadastro) => (
            <>
              <div className="flex flex-col gap-1">
                <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-nome-meio`}>
                  Nome do novo meio de pagamento
                </label>
                <input
                  id={`${idCadastro}-nome-meio`}
                  className={CONTROLE_CLASSE}
                  value={nomeMeio}
                  onChange={(e) => setNomeMeio(e.target.value)}
                  maxLength={MAX_NOME_MEIO}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-tipo-meio`}>
                  Tipo
                </label>
                <select
                  id={`${idCadastro}-tipo-meio`}
                  className={CONTROLE_CLASSE}
                  value={tipoMeio}
                  onChange={(e) => setTipoMeio(e.target.value as typeof tipoMeio)}
                >
                  {TIPOS_DE_MEIO.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              {/*
                Os dias aparecem **só** para cartão. Não é preferência: o banco
                tem um CHECK bicondicional que proíbe dia de ciclo em conta
                corrente e em rótulo. Mostrar os campos ali seria oferecer um
                dado que a gravação rejeitaria.
              */}
              {tipoMeio === "CARTAO_CREDITO" ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex w-full flex-col gap-1">
                    <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-fechamento`}>
                      Dia de fechamento
                    </label>
                    <input
                      id={`${idCadastro}-fechamento`}
                      className={CONTROLE_CLASSE}
                      inputMode="numeric"
                      value={diaFechamento}
                      onChange={(e) => setDiaFechamento(e.target.value)}
                      placeholder="25"
                    />
                  </div>
                  <div className="flex w-full flex-col gap-1">
                    <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-vencimento`}>
                      Dia de vencimento
                    </label>
                    <input
                      id={`${idCadastro}-vencimento`}
                      className={CONTROLE_CLASSE}
                      inputMode="numeric"
                      value={diaVencimento}
                      onChange={(e) => setDiaVencimento(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}
        >
          <select
            id={`${id}-meio`}
            className={CONTROLE_CLASSE}
            value={meioPagamentoId}
            onChange={(e) => setMeioPagamentoId(e.target.value)}
            {...erroMeio.props}
          >
            {listaMeios.map((meio) => (
              <option key={meio.id} value={meio.id}>
                {meio.nome}
              </option>
            ))}
          </select>
          {erroMeio.no}
        </CadastroInline>

        <CadastroInline
          rotulo="Categoria"
          idDoControle={`${id}-categoria`}
          rotuloDoAtalho="+ nova"
          descricaoDoGrupo="Nova categoria"
          validar={() => primeiroErro(payloadDeCategoria())}
          aoCriar={async () => {
            const validado = payloadDeCategoria();
            if (!validado.success) {
              throw new Error("payload inválido chegou ao envio");
            }
            return criarCategoria(validado.data);
          }}
          aoCriado={(criada) => {
            setListaCategorias((atual) =>
              atual.some((c) => c.id === criada.id)
                ? atual
                : [...atual, { id: criada.id, nome: criada.nome }].sort((a, b) =>
                    a.nome.localeCompare(b.nome, "pt-BR"),
                  ),
            );
            setCategoriaId(criada.id);
          }}
          aoLimpar={() => setNomeCategoria("")}
          ajuda="Ela passa a valer para todos os meses, inclusive os que ainda não chegaram."
          campos={(idCadastro) => (
            <div className="flex flex-col gap-1">
              <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-nome-categoria`}>
                Nome da nova categoria
              </label>
              <input
                id={`${idCadastro}-nome-categoria`}
                className={CONTROLE_CLASSE}
                value={nomeCategoria}
                onChange={(e) => setNomeCategoria(e.target.value)}
                maxLength={MAX_NOME_CATEGORIA}
              />
            </div>
          )}
        >
          <select
            id={`${id}-categoria`}
            className={CONTROLE_CLASSE}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {listaCategorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </CadastroInline>
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

      {/*
        A previsão é o momento central do app: uma compra vira N parcelas nos
        meses seguintes, que é exatamente a re-digitação que a planilha exigia.
        A cascata comunica isso, e por isso ela é disparada pela **quantidade**
        de parcelas (a chave do `ul`), não por cada tecla digitada. Recomeçar a
        animação a cada dígito do valor seria ruído, não informação.
      */}
      <section
        aria-label="Previsão das parcelas"
        className="flex flex-col gap-3 rounded-xl bg-canvas p-5"
      >
        <h3 className={ROTULO_CLASSE}>Parcelas que serão criadas</h3>
        {previa === null ? (
          <p className="text-[15px] text-ink-muted">
            Informe o valor e a quantidade de parcelas para ver a previsão.
          </p>
        ) : (
          <ul key={previa.parcelas.length} className="flex flex-col gap-1.5">
            {previa.parcelas.map((parcela, indice) => (
              <motion.li
                key={parcela.numero}
                initial={reduzir ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  // Teto no atraso: em 120 parcelas, 0.03s cada levaria 3,6
                  // segundos até a última aparecer.
                  delay: Math.min(indice * 0.03, 0.45),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex flex-wrap justify-between gap-2 text-[15px]"
              >
                <span className="text-ink-muted">
                  <span className="tabular">
                    {parcela.numero}/{inteiro(qtdParcelas)}
                  </span>{" "}
                  {formatarCompetencia(parcela.competencia)}
                </span>
                <span className="tabular">{formatarBRL(parcela.valor)}</span>
              </motion.li>
            ))}
            <li className="mt-1 flex flex-wrap justify-between gap-2 border-t border-line pt-2.5 text-[15px]">
              <span className="text-ink-muted">Total da compra</span>
              <span className="tabular">{formatarBRL(previa.valorTotal)}</span>
            </li>
          </ul>
        )}
      </section>

      {erroGeral === "" ? null : (
        <p role="alert" className={`${ERRO_CLASSE} rounded-lg border border-negativo px-4 py-3`}>
          <WarningCircleIcon
            size={18}
            weight="fill"
            aria-hidden="true"
            className="shrink-0 text-negativo"
          />
          {erroGeral}
        </p>
      )}

      {confirmacao === null ? null : (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-line bg-surface-soft px-4 py-3 text-[15px] font-medium text-positivo"
        >
          <CheckCircleIcon size={18} weight="fill" aria-hidden="true" className="shrink-0" />
          {confirmacao.descricao} gravada em {confirmacao.qtdParcelas} parcela
          {confirmacao.qtdParcelas === 1 ? "" : "s"}.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        aria-busy={pendente}
        className="inline-flex min-h-14 items-center justify-center rounded-pill bg-primary px-8 text-[16px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo"
      >
        {pendente ? "Gravando…" : "Cadastrar compra"}
      </button>
    </form>
  );
}
