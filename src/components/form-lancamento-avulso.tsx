"use client";

import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { criarCategoria as criarCategoriaAction } from "@/app/actions/categorias";
import type { criarLancamentoAvulso } from "@/app/actions/lancamentos";
import type { criarMeioDePagamento as criarMeioAction } from "@/app/actions/meios-de-pagamento";
import { jaPagoPorPadrao } from "@/application/mes/criar-lancamento-avulso/handler";
import { entradaCategoriaSchema, MAX_NOME_CATEGORIA } from "@/application/schemas/categoria.schema";
import { entradaLancamentoAvulsoSchema } from "@/application/schemas/lancamento-avulso.schema";
import {
  entradaMeioPagamentoSchema,
  MAX_NOME_MEIO,
  TIPOS_DE_MEIO,
} from "@/application/schemas/meio-pagamento.schema";
import { parseBRL } from "@/domain";
import { formatarBRL } from "@/lib/formatar";
import { CadastroInline } from "./cadastro-inline";
import { useFecharDialogo } from "./dialogo-de-cadastro";

/**
 * Cadastro de lançamento avulso: o gasto que não é parcelado nem fixo, e o
 * dinheiro que entra fora do salário.
 *
 * Três coisas mandam aqui.
 *
 * 1. **A caixa "já saiu da conta" tem padrão vindo do meio de pagamento**, pela
 *    mesma função que o servidor usa (`jaPagoPorPadrao`). Dinheiro em conta
 *    corrente se move no ato do gesto; compra no cartão só sai na fatura. Duas
 *    implementações do padrão divergiriam, e a tela proporia uma coisa enquanto
 *    o servidor assumiria outra.
 * 2. **O padrão para de se aplicar assim que a pessoa toca na caixa.** Trocar o
 *    meio depois disso não desfaz a escolha dela — um formulário que reverte o
 *    que você acabou de marcar é pior que um sem padrão nenhum.
 * 3. **Sem chave de idempotência**, ao contrário de `FormCompra`. Dois Pix de
 *    R$ 50 no mesmo dia são dois Pix; o que protege do duplo clique é o botão
 *    desabilitado enquanto grava.
 *
 * Nenhum valor monetário é manipulado como decimal: o texto digitado vira
 * centavos por `parseBRL`, do domínio (AD-001).
 */

export interface OpcaoDeCadastro {
  readonly id: string;
  readonly nome: string;
}

/** O meio precisa dizer se gera fatura: é o que decide o padrão da caixa. */
export interface OpcaoDeMeio extends OpcaoDeCadastro {
  readonly geraFatura: boolean;
}

export interface FormLancamentoAvulsoProps {
  readonly competencia: string;
  readonly meios: ReadonlyArray<OpcaoDeMeio>;
  readonly categorias: ReadonlyArray<OpcaoDeCadastro>;
  readonly usuarios: ReadonlyArray<OpcaoDeCadastro>;
  readonly enviar: typeof criarLancamentoAvulso;
  readonly criarCategoria: typeof criarCategoriaAction;
  readonly criarMeioDePagamento: typeof criarMeioAction;
}

type Campos = Record<string, string>;

interface Confirmacao {
  readonly descricao: string;
  readonly valor: string;
  readonly natureza: "DESPESA" | "RECEITA";
}

const ROTULO_CLASSE = "text-[14px] font-medium text-ink";
const CONTROLE_CLASSE =
  "w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong " +
  "aria-[invalid=true]:border-negativo aria-[invalid=true]:border-2";
const ERRO_CLASSE = "flex items-center gap-1.5 text-[14px] font-medium text-negativo";

function inteiro(texto: string): number {
  const valor = Number.parseInt(texto, 10);
  return Number.isNaN(valor) ? Number.NaN : valor;
}

export function FormLancamentoAvulso({
  competencia,
  meios,
  categorias,
  usuarios,
  enviar,
  criarCategoria,
  criarMeioDePagamento,
}: FormLancamentoAvulsoProps) {
  const router = useRouter();
  const id = useId();
  const [pendente, iniciarEnvio] = useTransition();
  const fecharDialogo = useFecharDialogo();

  const [descricao, setDescricao] = useState("");
  const [natureza, setNatureza] = useState<"DESPESA" | "RECEITA">("DESPESA");
  const [valor, setValor] = useState("");
  const [dataEvento, setDataEvento] = useState(`${competencia}-01`);
  const [categoriaId, setCategoriaId] = useState("");
  const [usuarioId, setUsuarioId] = useState(usuarios[0]?.id ?? "");
  const [meioPagamentoId, setMeioPagamentoId] = useState(meios[0]?.id ?? "");

  /*
   * A caixa e a marca de que a pessoa já a tocou. Enquanto ela não tocou, o
   * meio de pagamento manda; depois, a escolha dela manda.
   */
  const [jaPago, setJaPago] = useState(() => jaPagoPorPadrao(meios[0]?.geraFatura ?? false));
  const [jaPagoTocado, setJaPagoTocado] = useState(false);

  const [listaCategorias, setListaCategorias] = useState(categorias);
  const [nomeCategoria, setNomeCategoria] = useState("");

  const [listaMeios, setListaMeios] = useState<ReadonlyArray<OpcaoDeMeio>>(meios);
  const [nomeMeio, setNomeMeio] = useState("");
  const [tipoMeio, setTipoMeio] =
    useState<(typeof TIPOS_DE_MEIO)[number]["valor"]>("CARTAO_CREDITO");
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");

  const [campos, setCampos] = useState<Campos>({});
  const [erroGeral, setErroGeral] = useState("");
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const valorEmCentavos = parseBRL(valor);
  const meioEscolhido = listaMeios.find((m) => m.id === meioPagamentoId);
  const ehReceita = natureza === "RECEITA";

  /*
   * Receita só aceita meio sem fatura: ninguém recebe dinheiro num cartão de
   * crédito. Filtrar a exibição não basta — se a pessoa já tinha um cartão
   * escolhido e depois marcou receita, a seleção continuaria nele e o
   * formulário enviaria o que a lista não oferece mais (ENTR-03, AC 2 e 5).
   */
  const meiosDisponiveis = ehReceita ? listaMeios.filter((m) => !m.geraFatura) : listaMeios;
  const rotuloDoMeio = ehReceita ? "Onde o dinheiro cai" : "Meio de pagamento";

  function trocarNatureza(nova: "DESPESA" | "RECEITA"): void {
    setNatureza(nova);
    if (nova !== "RECEITA") {
      return;
    }
    const atual = listaMeios.find((m) => m.id === meioPagamentoId);
    if (atual?.geraFatura !== true) {
      return;
    }
    /* Cai para a primeira conta — e o padrão da caixa acompanha, senão ele
       ficaria descrevendo o cartão que já não está selecionado. */
    const conta = listaMeios.find((m) => !m.geraFatura);
    setMeioPagamentoId(conta?.id ?? "");
    if (!jaPagoTocado) {
      setJaPago(jaPagoPorPadrao(conta?.geraFatura ?? false));
    }
  }

  function trocarMeio(novoId: string): void {
    setMeioPagamentoId(novoId);
    if (jaPagoTocado) {
      return;
    }
    const meio = listaMeios.find((m) => m.id === novoId);
    setJaPago(jaPagoPorPadrao(meio?.geraFatura ?? false));
  }

  function payloadDeCategoria() {
    return entradaCategoriaSchema.safeParse({ nome: nomeCategoria });
  }

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
      descricao,
      natureza,
      // Texto que não é valor em reais entra como zero, e o schema o rejeita
      // com a mensagem de campo, em vez de um `NaN` que viraria erro de tipo.
      valorCentavos: valorEmCentavos.ok ? valorEmCentavos.value : 0,
      competencia,
      dataEvento,
      categoriaId: categoriaId === "" ? null : categoriaId,
      usuarioId,
      meioPagamentoId,
      jaPago,
    };

    // O cliente valida para dar retorno imediato; o servidor revalida, porque
    // quem manda é o servidor (AUTH-02, AC 4).
    const local = entradaLancamentoAvulsoSchema.safeParse(payload);
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
        valor: formatarBRL(resposta.data.valorCentavos),
        natureza: resposta.data.natureza,
      });
      setDescricao("");
      setValor("");
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

  const erroDescricao = erroDe("descricao");
  const erroValor = erroDe("valorCentavos");
  const erroMeio = erroDe("meioPagamentoId");

  const rotuloDaCaixa = natureza === "RECEITA" ? "Já caiu na conta" : "Já saiu da conta";

  return (
    <form
      onSubmit={enviarFormulario}
      /* Sem `<h2>` próprio: o diálogo que o envolve já carrega o título, e a
         aba já diz qual dos dois formulários é. Três níveis dizendo quase a
         mesma coisa é o leitor de tela anunciando redundância. O nome acessível
         fica, porque é o que distingue este formulário do outro na mesma tela. */
      aria-label="Lançamento avulso"
      className="flex w-full flex-col gap-5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className={ROTULO_CLASSE}>O que é</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["DESPESA", "Um dinheiro que sai"],
              ["RECEITA", "Um dinheiro que entra"],
            ] as const
          ).map(([valorOpcao, rotulo]) => (
            <label key={valorOpcao} className="flex items-center gap-2 text-[15px] text-ink">
              <input
                type="radio"
                name={`${id}-natureza`}
                value={valorOpcao}
                checked={natureza === valorOpcao}
                onChange={() => trocarNatureza(valorOpcao)}
              />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

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

      <div className="flex flex-col gap-1">
        <label className={ROTULO_CLASSE} htmlFor={`${id}-valor`}>
          Valor (R$)
        </label>
        <input
          id={`${id}-valor`}
          className={CONTROLE_CLASSE}
          inputMode="decimal"
          placeholder="32,50"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          {...erroValor.props}
        />
        {erroValor.no}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <CadastroInline
          rotulo={rotuloDoMeio}
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
            const novo: OpcaoDeMeio = {
              id: criado.id,
              nome: criado.nome,
              geraFatura: criado.geraFatura,
            };
            setListaMeios((atual) =>
              atual.some((m) => m.id === novo.id) ? atual : [...atual, novo],
            );
            setMeioPagamentoId(novo.id);
            if (!jaPagoTocado) {
              setJaPago(jaPagoPorPadrao(novo.geraFatura));
            }
          }}
          aoLimpar={() => {
            setNomeMeio("");
            setTipoMeio("CARTAO_CREDITO");
            setDiaFechamento("");
            setDiaVencimento("");
          }}
          ajuda={
            ehReceita
              ? "Só contas: dinheiro não entra em cartão de crédito."
              : tipoMeio === "ROTULO"
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
            onChange={(e) => trocarMeio(e.target.value)}
            {...erroMeio.props}
          >
            {meiosDisponiveis.map((meio) => (
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
            De quem é o lançamento
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
            Data
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

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2.5 text-[15px] text-ink">
          <input
            type="checkbox"
            checked={jaPago}
            onChange={(e) => {
              setJaPago(e.target.checked);
              setJaPagoTocado(true);
            }}
          />
          {rotuloDaCaixa}
        </label>
        <p className="text-[14px] text-ink-muted">
          {meioEscolhido?.geraFatura === true
            ? "Compra no cartão só sai da conta quando a fatura é paga, então a marca vem desligada."
            : "Dinheiro em conta se move na hora, então a marca já vem ligada. Desmarque se ainda não aconteceu."}
        </p>
      </div>

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
          {confirmacao.natureza === "RECEITA" ? "Entrada" : "Gasto"} {confirmacao.descricao} de{" "}
          {confirmacao.valor} gravado.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        aria-busy={pendente}
        className="inline-flex min-h-14 items-center justify-center rounded-pill bg-primary px-8 text-[16px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo"
      >
        {pendente ? "Gravando…" : "Cadastrar lançamento"}
      </button>
    </form>
  );
}
