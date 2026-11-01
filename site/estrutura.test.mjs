import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { aplicarFormulario, lerUrlDoFormulario, PLACEHOLDER } from "./formulario.mjs";

/**
 * O que é texto, provado como texto. Spec: `.specs/features/campanha-lista-de-espera/spec.md`.
 *
 * Este arquivo lê `index.html` e `estilos.css` e confere o que não precisa de
 * navegador: a ordem das seções, um script só, o azul só onde pode, a
 * constante do formulário, nenhum `R$` fora da allowlist. O que só o navegador
 * resolve (rolagem horizontal, axe) vive em `verificar-navegador.mjs`.
 *
 * Nenhum valor aqui é dado real (AD-009): a allowlist de `R$` é a fixture da
 * spec do MVP, escolhida pelo resíduo do rateio e não por realismo.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(AQUI, "index.html"), "utf8");
const css = readFileSync(join(AQUI, "estilos.css"), "utf8");

/** CAMP-02 AC 1: as sete seções, nesta ordem. */
const SECOES = [
  "inicio",
  "onde-quebra",
  "comparativo",
  "para-dois",
  "sua-planilha",
  "numeros",
  "rodape",
];

/** CAMP-02 AC 4, parte: os únicos valores em reais que podem aparecer. */
const REAIS_PERMITIDOS = new Set(["1.000,00", "333,34", "333,33"]);

/** CAMP-03 AC 1: os tokens de `docs/design.md`, com os valores de lá. */
const TOKENS = {
  "--canvas": "light-dark(#ffffff, #0a0b0d)",
  "--surface-soft": "light-dark(#f7f7f7, #101216)",
  "--surface": "light-dark(#ffffff, #16181c)",
  "--surface-strong": "light-dark(#eef0f3, #21242a)",
  "--inverso": "light-dark(#0a0b0d, #eef0f3)",
  "--on-inverso": "light-dark(#ffffff, #0a0b0d)",
  "--on-inverso-suave": "light-dark(#a8acb3, #5b616e)",
  "--ink": "light-dark(#0a0b0d, #ffffff)",
  "--ink-muted": "light-dark(#5b616e, #a8acb3)",
  "--ink-soft": "light-dark(#7c828a, #7c828a)",
  "--primary": "#0052ff",
  "--primary-ativo": "#003ecc",
  "--primary-texto": "light-dark(#0052ff, #3979ff)",
  "--positivo": "light-dark(#047d4a, #05b169)",
  "--negativo": "light-dark(#cf202f, #e34855)",
  "--line": "light-dark(#dee1e6, rgb(255 255 255 / 0.1))",
};

/** Blocos `seletor { declarações }` da folha, sem comentários. */
function blocosDaFolha() {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocos = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of semComentarios.matchAll(re)) {
    blocos.push({ seletor: m[1].trim(), declaracoes: m[2] });
  }
  return blocos;
}

test("CAMP-02 AC 7: idioma, título, viewport e descrição", () => {
  assert.match(html, /<html[^>]*\slang="pt-BR"/);
  assert.match(html, /<title>[^<]{3,}<\/title>/);
  assert.match(html, /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"/);
  assert.match(html, /<meta\s+name="description"\s+content="[^"]{20,}"/);
});

test("CAMP-02 AC 1: as sete seções existem e estão na ordem", () => {
  const posicoes = SECOES.map((id) => {
    const posicao = html.search(new RegExp(`<(section|footer)[^>]*\\sid="${id}"`));
    assert.notEqual(posicao, -1, `seção #${id} ausente`);
    return posicao;
  });
  for (let i = 1; i < posicoes.length; i += 1) {
    assert.ok(
      posicoes[i] > posicoes[i - 1],
      `#${SECOES[i]} deveria vir depois de #${SECOES[i - 1]}`,
    );
  }
});

test("CAMP-02 AC 6: diz o que o produto é hoje, sem dizer que está disponível", () => {
  assert.match(html, /usado hoje por um casal/);
  assert.match(html, /abrindo para mais casas/);
  assert.doesNotMatch(html, /crie sua conta|dispon[ií]vel agora|cadastre-se/i);
});

test("CAMP-03 AC 5: um script só, inline, e nenhum terceiro além das fontes", () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotMatch(scripts[0][0], /\ssrc=/);
  const externos = [...html.matchAll(/\b(?:href|src)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  const urlDoFormulario = lerUrlDoFormulario(html);
  for (const url of externos) {
    if (url === urlDoFormulario) {
      continue;
    }
    assert.match(
      url,
      /^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/,
      `recurso externo fora das fontes: ${url}`,
    );
  }
  for (const m of html.matchAll(/<link\b[^>]*>/g)) {
    assert.doesNotMatch(m[0], /\bhref="\/\//, `link protocol-relative: ${m[0]}`);
  }
  // Fontes carregadas com swap: a página não espera a fonte para pintar.
  assert.match(html, /fonts\.googleapis\.com\/css2\?[^"]*display=swap/);
});

test("CAMP-03 AC 1: cada token é declarado uma vez, com os valores do design, sem paleta duplicada", () => {
  const raiz = blocosDaFolha().filter((b) => b.seletor === ":root");
  assert.equal(raiz.length, 1, "um único bloco :root");
  for (const [nome, valor] of Object.entries(TOKENS)) {
    const re = new RegExp(`${nome.replace(/[-]/g, "\\-")}\\s*:\\s*([^;]+);`, "g");
    const ocorrencias = [...raiz[0].declaracoes.matchAll(re)];
    assert.equal(ocorrencias.length, 1, `${nome} deve ser declarado exatamente uma vez`);
    assert.equal(ocorrencias[0][1].trim(), valor, `${nome} diverge de docs/design.md`);
  }
  assert.doesNotMatch(
    css,
    /@media\s*\(\s*prefers-color-scheme/,
    "paleta duplicada por media query",
  );
  assert.match(css, /:root\[data-tema="claro"\]\s*\{\s*color-scheme:\s*light;?\s*\}/);
  assert.match(css, /:root\[data-tema="escuro"\]\s*\{\s*color-scheme:\s*dark;?\s*\}/);
});

test("CAMP-03 AC 2: o azul só em botão de chamada, link e foco; a inversão uma vez", () => {
  const blocos = blocosDaFolha().filter((b) => b.seletor !== ":root");
  const usamPrimary = blocos.filter((b) => /var\(--primary(?:-ativo)?\)/.test(b.declaracoes));
  assert.ok(usamPrimary.length > 0, "o botão de chamada precisa existir");
  for (const b of usamPrimary) {
    assert.match(
      b.seletor,
      /\.botao-primario|(^|,\s*)a(:|\s|$)|focus-visible/,
      `--primary fora de botão, link ou foco: "${b.seletor}"`,
    );
  }
  const usamPrimaryTexto = blocos.filter((b) => /var\(--primary-texto\)/.test(b.declaracoes));
  for (const b of usamPrimaryTexto) {
    assert.match(
      b.seletor,
      /(^|,\s*)a(:|\s|$)|\.marca/,
      `--primary-texto fora de link ou marca: "${b.seletor}"`,
    );
  }
  const usamInverso = blocos.filter((b) => /var\(--inverso\)/.test(b.declaracoes));
  assert.equal(usamInverso.length, 1, "a superfície invertida aparece em um seletor só");
  assert.equal(
    (html.match(/class="[^"]*\binverso\b[^"]*"/g) ?? []).length,
    1,
    "um elemento invertido na página",
  );
});

test('CAMP-03 AC 3: o tema nunca grava data-tema="sistema"', () => {
  assert.doesNotMatch(html, /data-tema="sistema"/);
  assert.doesNotMatch(html, /setAttribute\("data-tema",\s*"sistema"\)/);
  assert.match(html, /removeAttribute\("data-tema"\)/);
});

test("CAMP-03 AC 4: toda font-family termina em pilha de reserva", () => {
  const familias = [...css.matchAll(/font-family\s*:\s*([^;]+);/g)].map((m) => m[1]);
  assert.ok(familias.length >= 2, "sans e mono declaradas");
  for (const f of familias) {
    if (/^var\(/.test(f.trim())) {
      continue;
    }
    assert.match(f, /(sans-serif|monospace)\s*$/, `sem pilha de reserva: ${f}`);
  }
});

test("CAMP-03 AC 8: display em 400 e nenhuma sombra fora de --sombra-1", () => {
  const regrasDeH1 = blocosDaFolha().filter((b) => /(^|,\s*)h1(\s*,|\s*$)/.test(b.seletor));
  assert.ok(regrasDeH1.length > 0, "regra de h1");
  const declaracoesDeH1 = regrasDeH1.map((b) => b.declaracoes).join("\n");
  assert.match(declaracoesDeH1, /font-weight\s*:\s*400/);
  assert.doesNotMatch(declaracoesDeH1, /font-weight\s*:\s*(?!400\b)\d+/, "h1 com outro peso");
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;]+);/g)) {
    assert.match(m[1].trim(), /^(var\(--sombra-1\)|none)$/, `sombra fora do sistema: ${m[1]}`);
  }
});

test("CAMP-02 AC 4, parte: nenhum valor em reais fora da allowlist", () => {
  const valores = [...html.matchAll(/R\$\s?([\d.]+,\d{2})/g)].map((m) => m[1]);
  for (const v of valores) {
    assert.ok(REAIS_PERMITIDOS.has(v), `valor fora da allowlist: R$ ${v}`);
  }
});

test("CAMP-04 AC 1: a URL do formulário vive numa constante única e o HTML está consistente com ela", () => {
  const metas = [...html.matchAll(/<meta\s+name="lista-de-espera"/g)];
  assert.equal(metas.length, 1);
  const url = lerUrlDoFormulario(html);
  assert.equal(aplicarFormulario(html, url), html, "index.html diverge do que a constante manda");
});

test("CAMP-04 AC 2: com o placeholder, todo botão da lista está desabilitado e diz 'em breve'", () => {
  const comPlaceholder = aplicarFormulario(html, PLACEHOLDER);
  const botoes = [
    ...comPlaceholder.matchAll(/<button\b[^>]*\bbotao-lista\b[^>]*>([\s\S]*?)<\/button>/g),
  ];
  assert.ok(botoes.length >= 2, "ao menos o botão do topo e o do rodapé");
  for (const [tag, texto] of botoes) {
    assert.match(tag, /aria-disabled="true"/);
    assert.match(tag, /\sdisabled[\s>]/);
    assert.doesNotMatch(tag, /\shref=/);
    assert.match(texto, /em breve/);
  }
  assert.doesNotMatch(
    comPlaceholder,
    /<a\b[^>]*\bbotao-lista\b/,
    "nenhum <a> da lista sem destino",
  );
});

test("CAMP-04 ACs 3 e 4: com uma URL https, todo botão é um link estático em nova aba", () => {
  const url = "https://docs.google.com/forms/d/e/exemplo/viewform";
  const comUrl = aplicarFormulario(html, url);
  const botoes = [...comUrl.matchAll(/<a\b[^>]*\bbotao-lista\b[^>]*>([\s\S]*?)<\/a>/g)];
  assert.ok(botoes.length >= 2);
  for (const [tag, texto] of botoes) {
    assert.match(tag, new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}"`));
    assert.match(tag, /target="_blank"/);
    assert.match(tag, /rel="noopener"/);
    assert.doesNotMatch(tag, /aria-disabled/);
    assert.match(texto, /Entrar na lista de espera/);
  }
  assert.match(
    comUrl,
    new RegExp(
      `<meta\\s+name="lista-de-espera"\\s+content="${url.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}"`,
    ),
  );
});

test("Edge case: URL sem TLS é tratada como placeholder", () => {
  assert.throws(() => aplicarFormulario(html, "http://exemplo.com/form"), /https/);
});

/** Texto visível, sem tags, para as asserções de copy. */
function textoVisivel(trecho) {
  return trecho
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * CAMP-02 AC 4: nada da lista "O que nunca prometer" de
 * `docs/marketing/posicionamento.md`. A lista vive aqui, em padrões: mudar a
 * lista lá sem mudar aqui deixa o teste mentindo.
 */
const PROMESSAS_PROIBIDAS = [
  /sincroniz/i,
  /open finance/i,
  /importa (do|de) (seu|sua) banco/i,
  /conecte (seu|sua) banco/i,
  /app nativo|baixe na loja|app store|google play/i,
  /notifica/i,
  /or[çc]amento por categoria/i,
  /defina um limite/i,
  /veja quanto vai vir na fatura|controle de fatura|[áa]rea de cart[õo]es/i,
  /edite (a|sua) compra|editar (a|sua) compra/i,
  /sem conflito|ao mesmo tempo sem/i,
  /gr[áa]tis|gratuito|sem mensalidade|R\$\s?\d+(,\d{2})?\s?(\/|por)\s?m[êe]s/i,
  /dispon[íi]vel agora|crie sua conta|cadastre-se/i,
  /compara[çc][ãa]o m[êe]s a m[êe]s|gr[áa]fico de evolu[çc][ãa]o/i,
  /quem deve a quem|acerto de contas/i,
];

test("CAMP-02 AC 2: cinco blocos de dor, cada um com a cena e a garantia", () => {
  const secao = html.slice(html.indexOf('id="onde-quebra"'), html.indexOf('id="comparativo"'));
  const blocos = [
    ...secao.matchAll(/<article\b[^>]*\bclass="[^"]*\bdor\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g),
  ];
  assert.equal(blocos.length, 5);
  const temas = ["parcela", "fatura", "ano", "luz", "duas pessoas"];
  const texto = textoVisivel(secao).toLowerCase();
  for (const tema of temas) {
    assert.ok(texto.includes(tema), `dor sem o tema "${tema}"`);
  }
  for (const [, corpo] of blocos) {
    assert.match(corpo, /<h3\b/);
    assert.match(corpo, /<p\b[^>]*\bclass="[^"]*\bdor-cena\b/);
    assert.match(corpo, /<p\b[^>]*\bclass="[^"]*\bdor-garantia\b/);
  }
});

test("CAMP-02 AC 3: o comparativo tem linhas em que a planilha ou o caderno ganham", () => {
  const secao = html.slice(html.indexOf('id="comparativo"'), html.indexOf('id="para-dois"'));
  assert.match(secao, /<table\b/);
  const cabecalhos = [...secao.matchAll(/<th\b[^>]*scope="col"[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
    textoVisivel(m[1]).trim(),
  );
  assert.deepEqual(cabecalhos.slice(-3), ["Caderno", "Planilha", "myBilling"]);
  const linhas = [...secao.matchAll(/<tr\b[^>]*\bdata-vence="([^"]*)"[^>]*>/g)].map((m) => m[1]);
  assert.ok(linhas.length >= 5, "ao menos cinco linhas comparadas");
  const outrosGanham = linhas.filter((v) => /planilha|caderno/.test(v));
  assert.ok(outrosGanham.length >= 2, "ao menos duas linhas em que planilha ou caderno ganham");
  for (const v of outrosGanham) {
    assert.doesNotMatch(
      v,
      /mybilling/i,
      `linha em que a planilha ganha não pode marcar o myBilling: "${v}"`,
    );
  }
});

test("CAMP-02 AC 4: nenhuma promessa da lista 'O que nunca prometer'", () => {
  const texto = textoVisivel(html);
  for (const padrao of PROMESSAS_PROIBIDAS) {
    assert.doesNotMatch(texto, padrao, `promessa proibida: ${padrao}`);
  }
});

test("CAMP-02 AC 5: cada número de mercado com fonte e ano, no máximo três", () => {
  const figuras = [
    ...html.matchAll(/<figure\b[^>]*\bclass="[^"]*\bnumero\b[^"]*"[^>]*>([\s\S]*?)<\/figure>/g),
  ];
  assert.ok(figuras.length >= 1 && figuras.length <= 3, `${figuras.length} números`);
  for (const [, corpo] of figuras) {
    const legenda = corpo.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/);
    assert.ok(legenda, "número sem figcaption");
    assert.match(legenda[1], /<cite\b/);
    assert.match(textoVisivel(legenda[1]), /\b(19|20)\d{2}\b/);
  }
});

test("Tom: sem exclamação, sem travessão, sem emoji no texto visível", () => {
  const texto = textoVisivel(html);
  assert.doesNotMatch(texto, /!/);
  assert.doesNotMatch(texto, /[—–]/);
  assert.doesNotMatch(texto, /\p{Extended_Pictographic}/u);
});
