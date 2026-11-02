// Gerado por `pnpm site:construir` a partir de site/fonte/simulador.ts. Não edite à mão.
"use strict";
var SimuladorDaLanding = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // site/fonte/simulador.ts
  var simulador_exports = {};
  __export(simulador_exports, {
    FUSO: () => FUSO,
    SALDOS_DA_CASA: () => SALDOS_DA_CASA,
    competenciaCorrente: () => competenciaCorrente,
    horizonteDaCasa: () => horizonteDaCasa,
    iniciar: () => iniciar,
    responder: () => responder
  });

  // src/domain/shared/result.ts
  function ok(value) {
    return { ok: true, value };
  }
  function err(error) {
    return { ok: false, error };
  }

  // src/domain/shared/competencia.ts
  var REGEX_COMPETENCIA = /^\d{4}-(?:0[1-9]|1[0-2])$/;
  function criarCompetencia(texto) {
    if (!REGEX_COMPETENCIA.test(texto)) {
      return err({ code: "COMPETENCIA_INVALIDA", detalhes: { texto } });
    }
    return ok(texto);
  }
  function paraIndice(competencia) {
    const ano = Number.parseInt(competencia.slice(0, 4), 10);
    const mes = Number.parseInt(competencia.slice(5, 7), 10);
    return ano * 12 + (mes - 1);
  }
  function deIndice(indice) {
    const ano = Math.floor(indice / 12);
    const mes = indice - ano * 12 + 1;
    return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}`;
  }
  function addMeses(competencia, n) {
    return deIndice(paraIndice(competencia) + n);
  }
  var REGEX_INSTANTE_UTC = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/;
  var MS_POR_DIA = 864e5;
  function diasDesdeEpoch(ano, mes, dia) {
    const anoDeslocado = mes <= 2 ? ano - 1 : ano;
    const era = Math.floor(anoDeslocado / 400);
    const anoNaEra = anoDeslocado - era * 400;
    const deslocamentoDoMes = mes > 2 ? -3 : 9;
    const diaDoAno = Math.floor((153 * (mes + deslocamentoDoMes) + 2) / 5) + dia - 1;
    const diaNaEra = anoNaEra * 365 + Math.floor(anoNaEra / 4) - Math.floor(anoNaEra / 100) + diaDoAno;
    return era * 146097 + diaNaEra - 719468;
  }
  function dataParaCompetencia(dataISO, tz) {
    if (!REGEX_INSTANTE_UTC.test(dataISO)) {
      return err({ code: "COMPETENCIA_INVALIDA", detalhes: { dataISO } });
    }
    const dias = diasDesdeEpoch(
      Number.parseInt(dataISO.slice(0, 4), 10),
      Number.parseInt(dataISO.slice(5, 7), 10),
      Number.parseInt(dataISO.slice(8, 10), 10)
    );
    const segundosDoDia = Number.parseInt(dataISO.slice(11, 13), 10) * 3600 + Number.parseInt(dataISO.slice(14, 16), 10) * 60 + Number.parseInt(dataISO.slice(17, 19), 10);
    const instante = dias * MS_POR_DIA + segundosDoDia * 1e3;
    let partes;
    try {
      partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit"
      }).formatToParts(instante);
    } catch {
      return err({ code: "COMPETENCIA_INVALIDA", detalhes: { tz } });
    }
    let ano = "";
    let mes = "";
    for (const parte of partes) {
      if (parte.type === "year") {
        ano = parte.value;
      }
      if (parte.type === "month") {
        mes = parte.value;
      }
    }
    return criarCompetencia(`${ano}-${mes}`);
  }

  // src/domain/parcelamento/ratear-parcelas.ts
  var MAX_PARCELAS = 120;
  function ratearParcelas(total, n, politica) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_PARCELAS) {
      return err({ code: "QTD_PARCELAS_INVALIDA", detalhes: { n } });
    }
    if (!Number.isInteger(total) || total < 1) {
      return err({ code: "VALOR_NAO_POSITIVO", detalhes: { total } });
    }
    if (n > total) {
      return err({ code: "PARCELA_INFERIOR_A_UM_CENTAVO", detalhes: { total, n } });
    }
    const base = Math.floor(total / n);
    const resto = total - base * n;
    const parcelas = [];
    for (let indice = 0; indice < n; indice += 1) {
      const recebeCentavo = politica === "PRIMEIRAS" ? indice < resto : indice >= n - resto;
      parcelas.push(recebeCentavo ? base + 1 : base);
    }
    return ok(parcelas);
  }

  // src/domain/shared/money.ts
  var ZERO_CENTS = 0;
  function criarCents(valor) {
    if (!Number.isInteger(valor) || valor < 1) {
      return err({ code: "VALOR_NAO_POSITIVO", detalhes: { valor } });
    }
    return ok(valor);
  }
  function somar(a, b) {
    return a + b;
  }
  function subtrair(a, b) {
    return a - b;
  }
  function multiplicar(a, quantidade) {
    return a * quantidade;
  }
  var REGEX_BRL = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;
  function parseBRL(entrada) {
    if (!REGEX_BRL.test(entrada)) {
      return err({ code: "VALOR_NAO_POSITIVO", detalhes: { entrada } });
    }
    const semMilhar = entrada.replaceAll(".", "");
    const virgula = semMilhar.indexOf(",");
    const digitos = virgula === -1 ? `${semMilhar}00` : `${semMilhar.slice(0, virgula)}${semMilhar.slice(virgula + 1).padEnd(2, "0")}`;
    return criarCents(Number.parseInt(digitos, 10));
  }

  // src/domain/parcelamento/gerar-parcelas.ts
  function gerarParcelas(entrada) {
    if (!Number.isInteger(entrada.qtdParcelas) || entrada.qtdParcelas < 1 || entrada.qtdParcelas > MAX_PARCELAS) {
      return err({ code: "QTD_PARCELAS_INVALIDA", detalhes: { qtdParcelas: entrada.qtdParcelas } });
    }
    if (!Number.isInteger(entrada.parcelaInicial) || entrada.parcelaInicial < 1 || entrada.parcelaInicial > entrada.qtdParcelas) {
      return err({
        code: "PARCELA_INICIAL_INVALIDA",
        detalhes: { parcelaInicial: entrada.parcelaInicial, qtdParcelas: entrada.qtdParcelas }
      });
    }
    if (!Number.isInteger(entrada.valorEntrada) || entrada.valorEntrada < 1) {
      return err({ code: "VALOR_NAO_POSITIVO", detalhes: { valorEntrada: entrada.valorEntrada } });
    }
    const valorTotal = entrada.modo === "TOTAL" ? entrada.valorEntrada : multiplicar(entrada.valorEntrada, entrada.qtdParcelas);
    const rateio = ratearParcelas(valorTotal, entrada.qtdParcelas, entrada.politicaResiduo);
    if (!rateio.ok) {
      return err(rateio.error);
    }
    const valores = rateio.value;
    const parcelas = valores.slice(entrada.parcelaInicial - 1).map((valor, deslocamento) => ({
      numero: entrada.parcelaInicial + deslocamento,
      valor,
      competencia: addMeses(entrada.competenciaCompra, entrada.parcelaInicial - 1 + deslocamento)
    }));
    let valorAmortizadoAnterior = ZERO_CENTS;
    for (const valor of valores.slice(0, entrada.parcelaInicial - 1)) {
      valorAmortizadoAnterior = somar(valorAmortizadoAnterior, valor);
    }
    return ok({ valorTotal, parcelas, valorAmortizadoAnterior });
  }

  // src/domain/mes/simular-compra.ts
  function ultimaCompetenciaDoHorizonte(horizonte) {
    const [primeiro, ...seguintes] = horizonte;
    if (primeiro === void 0) {
      return null;
    }
    let esperada = primeiro.competencia;
    for (const mes of seguintes) {
      esperada = addMeses(esperada, 1);
      if (mes.competencia !== esperada) {
        return null;
      }
    }
    return esperada;
  }
  function simularCompra(horizonte, plano) {
    const enxergaAte = ultimaCompetenciaDoHorizonte(horizonte);
    if (enxergaAte === null) {
      return err({ code: "HORIZONTE_INVALIDO" });
    }
    const saldoPorMes = new Map(horizonte.map((mes) => [mes.competencia, mes.saldo]));
    const primeira = plano.parcelas[0];
    if (primeira === void 0 || !saldoPorMes.has(primeira.competencia)) {
      return err({
        code: "PRIMEIRA_PARCELA_FORA_DO_HORIZONTE",
        detalhes: { competencia: primeira?.competencia }
      });
    }
    const linhas = plano.parcelas.flatMap((parcela) => {
      const saldoAntes = saldoPorMes.get(parcela.competencia);
      if (saldoAntes === void 0) {
        return [];
      }
      return [
        {
          competencia: parcela.competencia,
          parcela: parcela.valor,
          saldoAntes,
          saldoDepois: subtrair(saldoAntes, parcela.valor),
          jaFaltava: saldoAntes < 0
        }
      ];
    });
    return ok({
      linhas,
      cabe: linhas.every((linha) => linha.jaFaltava || linha.saldoDepois >= 0),
      enxergaAte,
      parcelasForaDoHorizonte: plano.parcelas.length - linhas.length
    });
  }
  function menorParcelamentoQueCabe(horizonte, entrada, maximo = MAX_PARCELAS) {
    for (let n = 1; n <= maximo; n += 1) {
      const plano = gerarParcelas({
        modo: "TOTAL",
        valorEntrada: entrada.valorTotal,
        qtdParcelas: n,
        competenciaCompra: entrada.competenciaPrimeiraParcela,
        parcelaInicial: 1,
        politicaResiduo: entrada.politicaResiduo
      });
      if (!plano.ok) {
        continue;
      }
      const simulacao = simularCompra(horizonte, plano.value);
      if (simulacao.ok && simulacao.value.cabe) {
        return n;
      }
    }
    return null;
  }

  // src/application/compras/plano-da-compra.ts
  function planoDaCompra(dados) {
    const competenciaInicial = criarCompetencia(dados.competenciaInicial);
    if (!competenciaInicial.ok) {
      return err(competenciaInicial.error);
    }
    const valorEntrada = criarCents(dados.valorCentavos);
    if (!valorEntrada.ok) {
      return err(valorEntrada.error);
    }
    const competenciaCompra = addMeses(competenciaInicial.value, -(dados.parcelaInicial - 1));
    const plano = gerarParcelas({
      modo: dados.modo,
      valorEntrada: valorEntrada.value,
      qtdParcelas: dados.qtdParcelas,
      competenciaCompra,
      parcelaInicial: dados.parcelaInicial,
      politicaResiduo: dados.politicaResiduo
    });
    if (!plano.ok) {
      return err(plano.error);
    }
    return ok({ competenciaCompra, plano: plano.value });
  }

  // src/lib/formatar.ts
  var MOEDA = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var DATA = new Intl.DateTimeFormat("pt-BR", {
    // Fixo em UTC de propósito: sem isso, `2026-03-05` renderiza `04/03/2026`
    // em qualquer fuso a oeste de Greenwich (AD-002).
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  function espacoNormal(texto) {
    return texto.replace(/[  ]/g, " ");
  }
  function formatarBRL(centavos) {
    return espacoNormal(MOEDA.format(centavos / 100));
  }
  var NUMERO_DE_CAMPO = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var MES_E_ANO = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric"
  });
  function formatarCompetencia(competencia) {
    const texto = MES_E_ANO.format(/* @__PURE__ */ new Date(`${competencia}-01T00:00:00Z`));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  function nomeDoMes(competencia) {
    return formatarCompetencia(competencia).split(" de ")[0] ?? "";
  }

  // src/components/apresentar-saldo.ts
  function apresentarSaldo(saldo) {
    if (saldo < 0) {
      return { rotulo: "Vai faltar", valor: formatarBRL(Math.abs(saldo)), classe: "text-negativo" };
    }
    return {
      rotulo: "Vai sobrar",
      valor: formatarBRL(saldo),
      classe: saldo > 0 ? "text-positivo" : "text-ink"
    };
  }

  // src/components/texto-do-veredito.ts
  var TEXTO_SEM_VALOR = "Informe o valor para ver a resposta.";
  function mesNoVeredito(competencia, competenciaAberta) {
    const nome = nomeDoMes(competencia).toLowerCase();
    return competencia.slice(0, 4) === competenciaAberta.slice(0, 4) ? nome : `${nome} de ${competencia.slice(0, 4)}`;
  }
  function listarMeses(meses) {
    if (meses.length <= 1) {
      return meses.join("");
    }
    return `${meses.slice(0, -1).join(", ")} e ${meses[meses.length - 1]}`;
  }
  function iniciarComMaiuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  function textoDoVeredito({
    simulacao,
    qtdParcelas,
    menorQueCabe,
    competenciaAberta
  }) {
    const nome = (competencia) => mesNoVeredito(competencia, competenciaAberta);
    if (simulacao.cabe) {
      const jaFaltavam = simulacao.linhas.filter((linha) => linha.jaFaltava);
      if (jaFaltavam.length === 0) {
        return "Cabe. Nenhum mês fica no vermelho.";
      }
      const verbo2 = jaFaltavam.length === 1 ? "estava" : "estavam";
      const meses2 = listarMeses(jaFaltavam.map((linha) => nome(linha.competencia)));
      return `Cabe. ${iniciarComMaiuscula(meses2)} já ${verbo2} no vermelho antes desta compra.`;
    }
    const derrubados = simulacao.linhas.filter((linha) => !linha.jaFaltava && linha.saldoDepois < 0);
    const verbo = derrubados.length === 1 ? "fica" : "ficam";
    const meses = listarMeses(derrubados.map((linha) => nome(linha.competencia)));
    const saida = menorQueCabe === null ? `Não cabe em nenhum parcelamento até ${MAX_PARCELAS}x.` : `Em ${menorQueCabe}x cabe.`;
    return `Em ${qtdParcelas}x não cabe: ${meses} ${verbo} no vermelho. ${saida}`;
  }
  function textoEnxergaAte(simulacao) {
    return simulacao.parcelasForaDoHorizonte > 0 ? `Enxergo até ${formatarCompetencia(simulacao.enxergaAte)}.` : null;
  }

  // src/lib/erros.ts
  var MENSAGENS = {
    PARCELA_INFERIOR_A_UM_CENTAVO: "O valor é pequeno demais para esse número de parcelas.",
    QTD_PARCELAS_INVALIDA: "A quantidade de parcelas precisa estar entre 1 e 120.",
    VALOR_NAO_POSITIVO: "Informe um valor maior que zero.",
    HORIZONTE_INVALIDO: "O app não conseguiu montar os próximos meses. Recarregue a página.",
    PRIMEIRA_PARCELA_FORA_DO_HORIZONTE: "A primeira parcela precisa cair entre o mês aberto e doze meses à frente.",
    PARCELA_INICIAL_INVALIDA: "A parcela inicial não pode ser maior que a quantidade de parcelas.",
    MEIO_PAGAMENTO_ARQUIVADO: "Esse meio de pagamento está arquivado e não recebe compra nova.",
    MEIO_PAGAMENTO_NAO_ENCONTRADO: "Escolha um meio de pagamento válido.",
    CONSERVACAO_VIOLADA: "A soma das parcelas não fechou com o total. Nada foi gravado.",
    COMPETENCIA_INVALIDA: "Informe a competência no formato AAAA-MM.",
    LANCAMENTO_NAO_CANCELAVEL: "Só lançamento avulso pode ser excluído. Parcela faz parte de uma compra, e gasto fixo se encerra na área Todo mês.",
    /* Sem "recarregue a página": a mensagem diz o que aconteceu, e a própria
       revalidação da action já traz a lista nova. */
    LANCAMENTO_NAO_ENCONTRADO: "Esse lançamento não existe mais.",
    LANCAMENTO_NAO_E_PARCELA: "Só parcela de compra se exclui por aqui.",
    PERIODO_INVALIDO: "O mês de fim não pode ser anterior ao de início.",
    RECORRENCIA_NAO_ENCONTRADA: "Esse gasto fixo não existe mais.",
    CATEGORIA_NAO_ENCONTRADA: "Escolha uma categoria válida.",
    /* Também quando a outra está arquivada: o nome dela continua ocupado. */
    CATEGORIA_JA_EXISTE: "Já existe outra categoria com esse nome.",
    /* "Outro": quem vê esta recusa está renomeando um meio que já existe. A
       criação diz "um meio" e não passa por este código. */
    MEIO_PAGAMENTO_JA_EXISTE: "Já existe outro meio de pagamento com esse nome.",
    // SPEC_DEVIATION: a mensagem entrou com o código, em T1, e não em T5.
    // Reason: todo `CodigoErro` do domínio é exibível, e o código sem mensagem não compila.
    CATEGORIA_EM_RECEITA: "Entrada não tem categoria.",
    CICLO_NAO_CORRESPONDE_AO_TIPO: "Dia de fechamento e de vencimento existem só no cartão de crédito, e nele são obrigatórios.",
    LANCAMENTO_NAO_CONFIRMAVEL: "Só gasto fixo tem valor a confirmar.",
    PLANILHA_ARQUIVO_INVALIDO: "Este arquivo não parece uma aba da planilha exportada em CSV. No Google Sheets: Arquivo → Fazer download → Valores separados por vírgula (.csv).",
    /* `{bloco}` é composto pela action a partir de `detalhes.bloco`. */
    PLANILHA_BLOCO_AUSENTE: "O arquivo não tem o bloco “{bloco}”. Exporte a aba de um mês da planilha.",
    /* `{competencia}` é composto pela action, por extenso, a partir de `detalhes.esperada`. */
    IMPORTACAO_FORA_DE_ORDEM: "As abas entram em sequência. A próxima é {competencia}.",
    IMPORTACAO_BANCO_NAO_VAZIO: "Já existem lançamentos no app. Rode o script de limpeza antes da primeira importação.",
    IMPORTACAO_PENDENCIA_ABERTA: "Ainda há meio de pagamento ou entrada sem decisão.",
    IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA: "Há totais que não batem. Confirme que entendeu a diferença antes de importar.",
    // SPEC_DEVIATION: a mensagem entrou com o código, em T1, e não em T7.
    // Reason: todo `CodigoErro` do domínio é exibível, e o código sem mensagem não compila.
    NADA_A_EXCLUIR: "Todas as parcelas desta em diante já foram pagas. Nada a excluir.",
    VALIDACAO: "Confira os campos destacados.",
    NAO_AUTENTICADO: "Sua sessão terminou. Entre de novo para continuar.",
    ACESSO_NEGADO: "Este e-mail não tem acesso ao Jano.",
    ERRO_INESPERADO: "Não foi possível concluir a operação. Tente de novo."
  };
  function mensagemDoErro(code) {
    return MENSAGENS[code];
  }

  // site/fonte/casa-inventada.ts
  var SALDOS_DA_CASA = [
    82e3,
    41e3,
    56e3,
    69e3,
    21500,
    20500,
    64e3,
    59e3,
    72e3,
    65e3,
    7e4,
    86e3
  ];

  // site/fonte/simulador.ts
  var FUSO = "America/Sao_Paulo";
  var MAIOR_SALDO = Math.max(...SALDOS_DA_CASA);
  var ALTURA_DAS_BARRAS = 120;
  var ALTURA_MAXIMA_DO_QUE_FALTA = 30;
  var ALTURA_MINIMA_DO_QUE_FALTA = 8;
  function competenciaCorrente(agoraISO) {
    const competencia = dataParaCompetencia(agoraISO, FUSO);
    if (!competencia.ok) {
      throw new Error("não foi possível resolver o mês corrente");
    }
    return competencia.value;
  }
  function horizonteDaCasa(inicio) {
    return SALDOS_DA_CASA.map((saldo, indice) => ({
      competencia: addMeses(inicio, indice),
      saldo
    }));
  }
  function inteiro(texto) {
    const valor = Number.parseInt(texto, 10);
    return Number.isNaN(valor) ? Number.NaN : valor;
  }
  function mesCurto(competencia) {
    return nomeDoMes(competencia).slice(0, 3).toLowerCase();
  }
  function responder({
    valor,
    vezes,
    horizonte
  }) {
    const primeiro = horizonte[0];
    if (primeiro === void 0) {
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
      politicaResiduo: "PRIMEIRAS"
    });
    if (!plano.ok) {
      return { tipo: "ERRO", mensagem: mensagemDoErro(plano.error.code) };
    }
    const simulacao = simularCompra(horizonte, plano.value.plano);
    if (!simulacao.ok) {
      return { tipo: "ERRO", mensagem: mensagemDoErro(simulacao.error.code) };
    }
    const menorQueCabe = simulacao.value.cabe ? null : menorParcelamentoQueCabe(horizonte, {
      valorTotal: plano.value.plano.valorTotal,
      competenciaPrimeiraParcela: inicio,
      politicaResiduo: "PRIMEIRAS"
    });
    const parcelaPorMes = new Map(
      simulacao.value.linhas.map((linha) => [linha.competencia, linha.parcela])
    );
    const colunas = horizonte.map((mes) => {
      const parcela = parcelaPorMes.get(mes.competencia) ?? 0;
      const depois = mes.saldo - parcela;
      return {
        competencia: mes.competencia,
        mes: mesCurto(mes.competencia),
        antes: mes.saldo,
        parcela,
        depois,
        vermelho: depois < 0
      };
    });
    const detalhe = colunas.filter((coluna) => coluna.vermelho).map((coluna) => {
      const saldo = apresentarSaldo(coluna.depois);
      return `${formatarCompetencia(coluna.competencia)}: ${saldo.rotulo.toLowerCase()} ${saldo.valor}.`;
    }).join(" ");
    return {
      tipo: "RESPOSTA",
      cabe: simulacao.value.cabe,
      menorQueCabe,
      veredito: textoDoVeredito({
        simulacao: simulacao.value,
        qtdParcelas,
        menorQueCabe,
        competenciaAberta: inicio
      }),
      enxergaAte: textoEnxergaAte(simulacao.value),
      detalhe,
      parcelas: plano.value.plano.parcelas.map((parcela) => parcela.valor),
      colunas
    };
  }
  function altura(centavos) {
    return Math.max(0, Math.round(centavos / MAIOR_SALDO * ALTURA_DAS_BARRAS));
  }
  function alturaDoQueFalta(centavos) {
    if (centavos >= 0) {
      return 0;
    }
    const proporcional = Math.round(-centavos / MAIOR_SALDO * ALTURA_DAS_BARRAS * 3);
    return Math.min(ALTURA_MAXIMA_DO_QUE_FALTA, Math.max(ALTURA_MINIMA_DO_QUE_FALTA, proporcional));
  }
  function elemento(documento, tag, classe) {
    const el = documento.createElement(tag);
    el.className = classe;
    return el;
  }
  function desenharColunas(documento, grafico, colunas) {
    grafico.replaceChildren(
      ...colunas.map((coluna) => {
        const raiz = elemento(
          documento,
          "div",
          coluna.vermelho ? "coluna coluna-vermelha" : "coluna"
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
      })
    );
  }
  function iniciar(documento, agoraISO) {
    const raiz = documento.querySelector("[data-simulador]");
    const exemplo = documento.querySelector("[data-simulador-exemplo]");
    const campoValor = documento.querySelector("#simulador-valor");
    const campoVezes = documento.querySelector("#simulador-vezes");
    const veredito = documento.querySelector("#simulador-veredito");
    const detalhe = documento.querySelector("#simulador-detalhe");
    const grafico = documento.querySelector("#simulador-grafico");
    if (!raiz || !campoValor || !campoVezes || !veredito || !detalhe || !grafico) {
      return;
    }
    const horizonte = horizonteDaCasa(competenciaCorrente(agoraISO));
    function atualizar() {
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
        `Quanto sobra em cada um dos próximos doze meses depois da compra. ${resposta.veredito}`
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
    iniciar(document, (/* @__PURE__ */ new Date()).toISOString());
  }
  return __toCommonJS(simulador_exports);
})();
