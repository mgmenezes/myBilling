import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { build } from "esbuild";
import { BANNER, OPCOES } from "./construir.mjs";

/**
 * O pacote da landing (JANO-03, JANO-04, JANO-05). Spec:
 * `.specs/features/landing-jano/spec.md`.
 *
 * O teste roda o arquivo versionado, `site/simulador.js`, que é o que a página
 * carrega: num contexto `node:vm` sem `document`, o pacote só expõe as funções
 * em `SimuladorDaLanding` e não tenta ligar a página.
 *
 * Os valores esperados saem da spec e das frases do app, nunca do pacote: a
 * casa inventada de doze meses (AD-009) e a fixture R$ 1.000,00 em 3x.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const CAMINHO_DO_PACOTE = join(AQUI, "simulador.js");
const pacote = readFileSync(CAMINHO_DO_PACOTE, "utf8");

function carregar() {
  const contexto = createContext({});
  runInContext(pacote, contexto);
  return contexto.SimuladorDaLanding;
}

const S = carregar();

/**
 * Arrays e objetos que vêm do contexto `node:vm` têm outro protótipo, e a
 * comparação estrita reprovaria valores iguais. Copia para este contexto.
 */
function local(valor) {
  return JSON.parse(JSON.stringify(valor));
}
/** Novembro de 2026: o horizonte vai de 2026-11 a 2027-10. */
const HORIZONTE = S.horizonteDaCasa("2026-11");

test("JANO-05 ACs 1 e 2: o pacote versionado é o que site:construir gera agora, com o banner", async () => {
  const gerado = await build({ ...OPCOES, write: false });
  assert.equal(gerado.outputFiles.length, 1);
  assert.ok(pacote.startsWith(BANNER), "o pacote começa dizendo que é gerado");
  assert.equal(
    gerado.outputFiles[0].text,
    pacote,
    "site/simulador.js está desatualizado: rode pnpm site:construir",
  );
});

test("JANO-02 AC 3: o pacote não faz chamada de rede", () => {
  assert.doesNotMatch(pacote, /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
});

test("JANO-04 ACs 1 e 3: doze saldos inventados, em centavos, múltiplos de R$ 5,00, entre R$ 0,00 e R$ 2.000,00", () => {
  const fonte = readFileSync(join(AQUI, "fonte", "casa-inventada.ts"), "utf8");
  assert.match(fonte, /inventad/i, "o arquivo diz que os valores são inventados");
  const saldos = local(S.SALDOS_DA_CASA);
  assert.equal(saldos.length, 12);
  for (const saldo of saldos) {
    assert.ok(Number.isInteger(saldo), `saldo não inteiro: ${saldo}`);
    assert.equal(saldo % 500, 0, `saldo fora de R$ 5,00: ${saldo}`);
    assert.ok(saldo >= 0 && saldo <= 200000, `saldo fora da faixa: ${saldo}`);
  }
});

test("JANO-04 AC 2: o horizonte começa no mês dado e segue onze meses, atravessando o ano", () => {
  const competencias = local(S.horizonteDaCasa("2026-12").map((mes) => mes.competencia));
  assert.deepEqual(competencias, [
    "2026-12",
    "2027-01",
    "2027-02",
    "2027-03",
    "2027-04",
    "2027-05",
    "2027-06",
    "2027-07",
    "2027-08",
    "2027-09",
    "2027-10",
    "2027-11",
  ]);
  assert.deepEqual(
    local(S.horizonteDaCasa("2026-12").map((mes) => mes.saldo)),
    local(S.SALDOS_DA_CASA),
  );
});

test("JANO-04 AC 2: o mês corrente sai do fuso de São Paulo, não do UTC", () => {
  // 23h de 31/03 em São Paulo (UTC-3) já é 1º de abril, 02h, em UTC: só o fuso
  // de São Paulo diz março.
  assert.equal(S.competenciaCorrente("2026-04-01T02:00:00.000Z"), "2026-03");
  // Três horas depois, 00h de 1º/04 em São Paulo, os dois fusos dizem abril.
  assert.equal(S.competenciaCorrente("2026-04-01T03:00:00.000Z"), "2026-04");
});

test("JANO-03 AC 3: R$ 1.000,00 em 3x vira 333,34, 333,33 e 333,33", () => {
  const resposta = S.responder({ valor: "1.000,00", vezes: "3", horizonte: HORIZONTE });
  assert.equal(resposta.tipo, "RESPOSTA");
  assert.deepEqual(local(resposta.parcelas), [33334, 33333, 33333]);
});

test("JANO-04 AC 4 e JANO-03 ACs 1 e 2: R$ 2.400,00 em 10x não cabe, com dois meses derrubados e a frase do app", () => {
  const resposta = S.responder({ valor: "2.400,00", vezes: "10", horizonte: HORIZONTE });
  assert.equal(resposta.tipo, "RESPOSTA");
  assert.equal(resposta.cabe, false);
  assert.equal(resposta.menorQueCabe, 12);
  const vermelhos = resposta.colunas.filter((coluna) => coluna.vermelho);
  assert.deepEqual(local(vermelhos.map((coluna) => coluna.competencia)), ["2027-03", "2027-04"]);
  assert.equal(
    resposta.veredito,
    "Em 10x não cabe: março de 2027 e abril de 2027 ficam no vermelho. Em 12x cabe.",
  );
  assert.equal(resposta.enxergaAte, null);
});

test("JANO-03 ACs 1 e 2: R$ 2.400,00 em 12x cabe, com a frase do app", () => {
  const resposta = S.responder({ valor: "2.400,00", vezes: "12", horizonte: HORIZONTE });
  assert.equal(resposta.tipo, "RESPOSTA");
  assert.equal(resposta.cabe, true);
  assert.equal(resposta.menorQueCabe, null);
  assert.equal(resposta.veredito, "Cabe. Nenhum mês fica no vermelho.");
  assert.equal(resposta.colunas.filter((coluna) => coluna.vermelho).length, 0);
});

test("JANO-02 AC 4: uma coluna por mês do horizonte, com o nome curto, o antes e o depois", () => {
  const resposta = S.responder({ valor: "2.400,00", vezes: "10", horizonte: HORIZONTE });
  assert.equal(resposta.colunas.length, 12);
  const [primeira, , , , marco] = resposta.colunas;
  assert.deepEqual(
    {
      mes: primeira.mes,
      antes: primeira.antes,
      parcela: primeira.parcela,
      depois: primeira.depois,
    },
    { mes: "nov", antes: 82000, parcela: 24000, depois: 58000 },
  );
  assert.deepEqual(
    { mes: marco.mes, antes: marco.antes, depois: marco.depois, vermelho: marco.vermelho },
    { mes: "mar", antes: 21500, depois: -2500, vermelho: true },
  );
  // Depois da décima parcela, o mês não muda.
  const ultima = resposta.colunas[11];
  assert.equal(ultima.parcela, 0);
  assert.equal(ultima.depois, ultima.antes);
});

test("JANO-03 AC 4: valor vazio ou inválido pede o valor, sem veredito", () => {
  for (const valor of ["", "abc"]) {
    const resposta = S.responder({ valor, vezes: "10", horizonte: HORIZONTE });
    assert.equal(resposta.tipo, "SEM_VALOR", `valor "${valor}"`);
    assert.equal(resposta.mensagem, "Informe o valor para ver a resposta.");
    assert.equal(resposta.veredito, undefined);
  }
});

test("JANO-03 AC 5: parcelas fora de 1 a 120 dão a mensagem do app, sem veredito", () => {
  for (const vezes of ["0", "121", ""]) {
    const resposta = S.responder({ valor: "2.400,00", vezes, horizonte: HORIZONTE });
    assert.equal(resposta.tipo, "ERRO", `vezes "${vezes}"`);
    assert.equal(resposta.mensagem, "A quantidade de parcelas precisa estar entre 1 e 120.");
    assert.equal(resposta.veredito, undefined);
  }
  for (const vezes of ["1", "120"]) {
    const resposta = S.responder({ valor: "2.400,00", vezes, horizonte: HORIZONTE });
    assert.equal(resposta.tipo, "RESPOSTA", `vezes "${vezes}"`);
  }
});

test("JANO-03 AC 7: parcelas além do horizonte dizem até onde o app enxerga", () => {
  const resposta = S.responder({ valor: "2.400,00", vezes: "14", horizonte: HORIZONTE });
  assert.equal(resposta.tipo, "RESPOSTA");
  assert.equal(resposta.enxergaAte, "Enxergo até Outubro de 2027.");
  const dentro = S.responder({ valor: "2.400,00", vezes: "12", horizonte: HORIZONTE });
  assert.equal(dentro.enxergaAte, null);
});
