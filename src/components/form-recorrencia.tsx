"use client";

import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { criarCategoria as criarCategoriaAction } from "@/app/actions/categorias";
import type { criarMeioDePagamento as criarMeioAction } from "@/app/actions/meios-de-pagamento";
import type { criarRecorrencia as criarRecorrenciaAction } from "@/app/actions/recorrencias";
import { entradaCategoriaSchema, MAX_NOME_CATEGORIA } from "@/application/schemas/categoria.schema";
import {
  entradaMeioPagamentoSchema,
  MAX_NOME_MEIO,
  TIPOS_DE_MEIO,
} from "@/application/schemas/meio-pagamento.schema";
import { entradaRecorrenciaSchema } from "@/application/schemas/recorrencia.schema";
import { parseBRL } from "@/domain";
import { CadastroInline } from "./cadastro-inline";

/**
 * Cadastro de gasto fixo e receita recorrente.
 *
 * **O valor é "de quanto costuma ser", não "de quanto é".** A conta de luz muda
 * todo mês, e o número aqui é a previsão que aparece antes de a conta chegar.
 * Confirmar quanto ela veio de fato é outro gesto, na lista de lançamentos — e
 * o texto de apoio diz isso, porque a pessoa que digita 180 precisa saber que
 * não está mentindo ao app.
 *
 * O mês de fim é opcional e quase sempre vazio: água e luz não acabam. Ele
 * existe para o caso que acaba, como um consórcio.
 */

interface Opcao {
  readonly id: string;
  readonly nome: string;
}

/**
 * O meio precisa dizer se gera fatura, porque **receita não cai em cartão de
 * crédito**. Sem esse dado a lista ofereceria "Cartão Azul" como destino de
 * salário, que foi o estado sem sentido que a tela permitia (ENTR-03, AC 2).
 */
interface OpcaoDeMeio extends Opcao {
  readonly geraFatura: boolean;
}

const ROTULO = "text-[14px] font-medium text-ink";
const CAMPO =
  "w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong " +
  "aria-[invalid=true]:border-negativo aria-[invalid=true]:border-2";
const ERRO = "flex items-center gap-1.5 text-[14px] font-medium text-negativo";

export function FormRecorrencia({
  competencia,
  meios,
  categorias,
  usuarios,
  criar,
  criarCategoria,
  criarMeioDePagamento,
}: {
  readonly competencia: string;
  readonly meios: ReadonlyArray<OpcaoDeMeio>;
  readonly categorias: ReadonlyArray<Opcao>;
  readonly usuarios: ReadonlyArray<Opcao>;
  readonly criar: typeof criarRecorrenciaAction;
  readonly criarCategoria: typeof criarCategoriaAction;
  readonly criarMeioDePagamento: typeof criarMeioAction;
}) {
  const id = useId();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const [descricao, setDescricao] = useState("");
  const [natureza, setNatureza] = useState<"DESPESA" | "RECEITA">("DESPESA");
  const ehReceita = natureza === "RECEITA";

  /*
   * O vocabulário do formulário sai daqui, e não de ternários espalhados.
   * Um formulário que diz "Cadastrar gasto fixo" com "Um dinheiro que entra"
   * marcado contradiz a escolha de quem o preenche (ENTR-03, AC 3).
   */

  const palavras = ehReceita
    ? {
        titulo: "Nova entrada fixa",
        botao: "Cadastrar entrada",
        valor: "De quanto costuma ser (R$)",
        dia: "Dia que costuma cair",
        meio: "Onde o dinheiro cai",
        ajudaDoMeio: "Só contas: dinheiro não entra em cartão de crédito.",
      }
    : {
        titulo: "Novo gasto fixo",
        botao: "Cadastrar gasto fixo",
        valor: "De quanto costuma ser (R$)",
        dia: "Dia de vencimento",
        meio: "Meio de pagamento",
        ajudaDoMeio: "Ele passa a valer para todos os meses, inclusive os que ainda não chegaram.",
      };
  const [valor, setValor] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [inicio, setInicio] = useState(competencia);
  const [fim, setFim] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [usuarioId, setUsuarioId] = useState(usuarios[0]?.id ?? "");
  const [meioPagamentoId, setMeioPagamentoId] = useState(meios[0]?.id ?? "");

  /* As listas crescem localmente quando um cadastro nasce aqui dentro, para o
     item novo já vir selecionado sem esperar o round-trip. */
  const [listaCategorias, setListaCategorias] = useState(categorias);
  const [listaMeios, setListaMeios] = useState<ReadonlyArray<OpcaoDeMeio>>(meios);

  /*
   * Receita só aceita meio sem fatura. Filtrar na exibição não basta: se a
   * pessoa já tinha um cartão escolhido e depois marcou receita, a seleção
   * continuaria apontando para ele. `trocarNatureza` reposiciona (AC 5).
   */
  const meiosDisponiveis = ehReceita ? listaMeios.filter((m) => !m.geraFatura) : listaMeios;

  function trocarNatureza(nova: "DESPESA" | "RECEITA"): void {
    setNatureza(nova);
    if (nova !== "RECEITA") {
      return;
    }
    const atual = listaMeios.find((m) => m.id === meioPagamentoId);
    if (atual?.geraFatura !== true) {
      return;
    }
    /* O cartão escolhido deixou de ser oferecido: cai para a primeira conta. */
    setMeioPagamentoId(listaMeios.find((m) => !m.geraFatura)?.id ?? "");
  }
  const [nomeCategoria, setNomeCategoria] = useState("");
  const [nomeMeio, setNomeMeio] = useState("");
  const [tipoMeio, setTipoMeio] =
    useState<(typeof TIPOS_DE_MEIO)[number]["valor"]>("CONTA_CORRENTE");
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimentoCartao, setDiaVencimentoCartao] = useState("");

  const [campos, setCampos] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  function payloadDeCategoria() {
    return entradaCategoriaSchema.safeParse({ nome: nomeCategoria });
  }

  function payloadDeMeio() {
    return entradaMeioPagamentoSchema.safeParse(
      tipoMeio === "CARTAO_CREDITO"
        ? {
            nome: nomeMeio,
            tipo: tipoMeio,
            diaFechamento: Number.parseInt(diaFechamento, 10),
            diaVencimento: Number.parseInt(diaVencimentoCartao, 10),
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

  function erroDe(campo: string) {
    const mensagem = campos[campo];
    return {
      props: mensagem === undefined ? {} : { "aria-invalid": true as const },
      no:
        mensagem === undefined ? null : (
          <p role="alert" className={ERRO}>
            <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
            {mensagem}
          </p>
        ),
    };
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroGeral("");
    setConfirmacao("");

    const centavos = parseBRL(valor);
    const payload = {
      descricao,
      natureza,
      // Texto que não é valor em reais entra como zero: o schema o rejeita com
      // a mesma mensagem de "valor não positivo", em vez de um NaN que viraria
      // erro de tipo em vez de erro de campo.
      valorCentavos: centavos.ok ? centavos.value : 0,
      diaVencimento: Number.parseInt(diaVencimento, 10),
      competenciaInicio: inicio,
      competenciaFim: fim === "" ? null : fim,
      categoriaId: categoriaId === "" ? null : categoriaId,
      usuarioId,
      meioPagamentoId,
    };

    const validado = entradaRecorrenciaSchema.safeParse(payload);
    if (!validado.success) {
      const novos: Record<string, string> = {};
      for (const issue of validado.error.issues) {
        novos[issue.path.join(".")] ??= issue.message;
      }
      setCampos(novos);
      return;
    }
    setCampos({});

    iniciar(async () => {
      const resposta = await criar(payload);
      if (!resposta.ok) {
        setCampos(resposta.erro.campos ?? {});
        if (resposta.erro.campos === undefined) {
          setErroGeral(resposta.erro.mensagem);
        }
        return;
      }
      setConfirmacao(`${resposta.data.descricao} passa a aparecer em todo mês.`);
      setDescricao("");
      setValor("");
      setFim("");
      router.refresh();
    });
  }

  const erroDescricao = erroDe("descricao");
  const erroValor = erroDe("valorCentavos");
  const erroDia = erroDe("diaVencimento");
  const erroFim = erroDe("competenciaFim");

  return (
    <form
      onSubmit={enviar}
      aria-labelledby={`${id}-titulo`}
      className="flex w-full flex-col gap-5 rounded-xl border border-line bg-surface p-6 sm:p-8"
    >
      <h2 id={`${id}-titulo`} className="text-[22px]">
        {palavras.titulo}
      </h2>

      <div className="flex flex-col gap-1">
        <label className={ROTULO} htmlFor={`${id}-descricao`}>
          Descrição
        </label>
        <input
          id={`${id}-descricao`}
          className={CAMPO}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Conta de luz"
          {...erroDescricao.props}
        />
        {erroDescricao.no}
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className={ROTULO}>O que é</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {(
            [
              ["DESPESA", "Uma conta a pagar"],
              ["RECEITA", "Um dinheiro que entra"],
            ] as const
          ).map(([valorOpcao, rotulo]) => (
            <label key={valorOpcao} className="flex items-center gap-2 text-[15px]">
              <input
                type="radio"
                name={`${id}-natureza`}
                checked={natureza === valorOpcao}
                onChange={() => trocarNatureza(valorOpcao)}
              />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO} htmlFor={`${id}-valor`}>
            {palavras.valor}
          </label>
          <input
            id={`${id}-valor`}
            className={CAMPO}
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="180,00"
            {...erroValor.props}
          />
          <p className="text-[13px] text-ink-muted">
            É a previsão. Quando a conta chegar, você confirma o valor real na lista do mês.
          </p>
          {erroValor.no}
        </div>
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO} htmlFor={`${id}-dia`}>
            {palavras.dia}
          </label>
          <input
            id={`${id}-dia`}
            className={CAMPO}
            inputMode="numeric"
            value={diaVencimento}
            onChange={(e) => setDiaVencimento(e.target.value)}
            {...erroDia.props}
          />
          {erroDia.no}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO} htmlFor={`${id}-inicio`}>
            Começa em
          </label>
          <input
            id={`${id}-inicio`}
            className={`${CAMPO} tabular`}
            type="month"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label className={ROTULO} htmlFor={`${id}-fim`}>
            Termina em (opcional)
          </label>
          <input
            id={`${id}-fim`}
            className={`${CAMPO} tabular`}
            type="month"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            {...erroFim.props}
          />
          <p className="text-[13px] text-ink-muted">Deixe vazio para algo que não tem fim.</p>
          {erroFim.no}
        </div>
      </div>

      {/* Mesmo padrão do formulário de compra: cadastrar sem sair daqui. Quem
          percebe que falta a categoria "Moradia" enquanto cadastra a conta de
          luz não deveria precisar ir para outra área e voltar. */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <CadastroInline
          rotulo={palavras.meio}
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
            setTipoMeio("CONTA_CORRENTE");
            setDiaFechamento("");
            setDiaVencimentoCartao("");
          }}
          ajuda="Ele passa a valer para todos os meses, inclusive os que ainda não chegaram."
          campos={(idCadastro) => (
            <>
              <div className="flex flex-col gap-1">
                <label className={ROTULO} htmlFor={`${idCadastro}-nome-meio`}>
                  Nome do novo meio de pagamento
                </label>
                <input
                  id={`${idCadastro}-nome-meio`}
                  className={CAMPO}
                  value={nomeMeio}
                  onChange={(e) => setNomeMeio(e.target.value)}
                  maxLength={MAX_NOME_MEIO}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={ROTULO} htmlFor={`${idCadastro}-tipo-meio`}>
                  Tipo
                </label>
                <select
                  id={`${idCadastro}-tipo-meio`}
                  className={CAMPO}
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
                    <label className={ROTULO} htmlFor={`${idCadastro}-fechamento`}>
                      Dia de fechamento
                    </label>
                    <input
                      id={`${idCadastro}-fechamento`}
                      className={CAMPO}
                      inputMode="numeric"
                      value={diaFechamento}
                      onChange={(e) => setDiaFechamento(e.target.value)}
                      placeholder="25"
                    />
                  </div>
                  <div className="flex w-full flex-col gap-1">
                    <label className={ROTULO} htmlFor={`${idCadastro}-vencimento-cartao`}>
                      Dia de vencimento
                    </label>
                    <input
                      id={`${idCadastro}-vencimento-cartao`}
                      className={CAMPO}
                      inputMode="numeric"
                      value={diaVencimentoCartao}
                      onChange={(e) => setDiaVencimentoCartao(e.target.value)}
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
            className={CAMPO}
            value={meioPagamentoId}
            onChange={(e) => setMeioPagamentoId(e.target.value)}
          >
            {meiosDisponiveis.map((meio) => (
              <option key={meio.id} value={meio.id}>
                {meio.nome}
              </option>
            ))}
          </select>
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
              <label className={ROTULO} htmlFor={`${idCadastro}-nome-categoria`}>
                Nome da nova categoria
              </label>
              <input
                id={`${idCadastro}-nome-categoria`}
                className={CAMPO}
                value={nomeCategoria}
                onChange={(e) => setNomeCategoria(e.target.value)}
                maxLength={MAX_NOME_CATEGORIA}
              />
            </div>
          )}
        >
          <select
            id={`${id}-categoria`}
            className={CAMPO}
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

      <div className="flex w-full flex-col gap-1 sm:w-1/2 sm:pr-2">
        <label className={ROTULO} htmlFor={`${id}-usuario`}>
          De quem é
        </label>
        <select
          id={`${id}-usuario`}
          className={CAMPO}
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

      {erroGeral === "" ? null : (
        <p role="alert" className={`${ERRO} rounded-lg border border-negativo px-4 py-3`}>
          <WarningCircleIcon size={18} weight="fill" aria-hidden="true" className="shrink-0" />
          {erroGeral}
        </p>
      )}

      {confirmacao === "" ? null : (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-line bg-surface-soft px-4 py-3 text-[15px] font-medium text-positivo"
        >
          <CheckCircleIcon size={18} weight="fill" aria-hidden="true" className="shrink-0" />
          {confirmacao}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        aria-busy={pendente}
        className="inline-flex min-h-14 items-center justify-center rounded-pill bg-primary px-8 text-[16px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo"
      >
        {pendente ? "Gravando…" : palavras.botao}
      </button>
    </form>
  );
}
