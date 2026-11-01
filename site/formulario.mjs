import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A constante única da URL do formulário (CAMP-04).
 *
 * A URL vive numa `<meta name="lista-de-espera">` no `<head>`, e todo botão
 * com a classe `botao-lista` é escrito a partir dela, **no HTML**, não em
 * tempo de execução: a página funciona sem JavaScript (AC 4). Quem troca a
 * URL roda `node site/formulario.mjs <url>`, e este módulo reescreve a meta e
 * os botões de uma vez, para que não exista uma segunda verdade.
 *
 * Com o placeholder, o botão não é link: vira `<button disabled>`, sem `href`,
 * e diz "em breve" (AC 2). Com `https://`, vira link em nova aba com
 * `rel="noopener"` (AC 3). `http://` sem TLS é recusado (edge case da spec).
 */

export const PLACEHOLDER = "COLE_AQUI_A_URL_DO_GOOGLE_FORMS";

const RE_META = /(<meta\s+name="lista-de-espera"\s+content=")[^"]*(")/;
const RE_BOTAO = /<(a|button)\b([^>]*\bclass="[^"]*\bbotao-lista\b[^"]*"[^>]*)>[\s\S]*?<\/\1>/g;
const ATRIBUTOS_DE_ESTADO = new Set(["href", "target", "rel", "aria-disabled", "disabled", "type"]);

export function lerUrlDoFormulario(html) {
  const m = html.match(RE_META);
  if (!m) {
    throw new Error('index.html sem <meta name="lista-de-espera">');
  }
  return html.slice(m.index + m[1].length, html.indexOf('"', m.index + m[1].length));
}

function atributosPreservados(abertura) {
  const preservados = [];
  for (const m of abertura.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    if (!ATRIBUTOS_DE_ESTADO.has(m[1])) {
      preservados.push(`${m[1]}="${m[2]}"`);
    }
  }
  return preservados.join(" ");
}

export function aplicarFormulario(html, url) {
  if (url !== PLACEHOLDER && !/^https:\/\/\S+$/.test(url)) {
    throw new Error("A URL do formulário precisa começar com https:// (sem TLS não entra)");
  }
  const comMeta = html.replace(RE_META, `$1${url}$2`);
  return comMeta.replace(RE_BOTAO, (_tag, _elemento, abertura) => {
    const fixos = atributosPreservados(abertura);
    if (url === PLACEHOLDER) {
      return `<button ${fixos} type="button" disabled aria-disabled="true">Lista de espera em breve</button>`;
    }
    return `<a ${fixos} href="${url}" target="_blank" rel="noopener">Entrar na lista de espera</a>`;
  });
}

const executadoDiretamente =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (executadoDiretamente) {
  const caminho = join(dirname(fileURLToPath(import.meta.url)), "index.html");
  const html = readFileSync(caminho, "utf8");
  const url = process.argv[2];
  if (url === undefined) {
    console.log(lerUrlDoFormulario(html));
  } else {
    writeFileSync(caminho, aplicarFormulario(html, url));
    console.log(`Formulário aplicado: ${url}`);
  }
}
