import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

/**
 * Capturas do app para a landing (CAMP-05).
 *
 * Sobe o `next dev` numa porta própria contra o banco de teste descartável,
 * entra pelo provider de teste e fotografa duas telas nos dois temas. Nada
 * aqui é dado real (AD-009): o banco é o `mybilling_test`, semeado por
 * `pnpm db:seed`, com "Pessoa A", "Cartão Roxo" e "Compra parcelada A".
 *
 * Uso, a partir da raiz do repositório:
 *
 *   DATABASE_URL=postgres://mybilling:mybilling@localhost:5433/mybilling_test pnpm db:migrate
 *   DATABASE_URL=postgres://mybilling:mybilling@localhost:5433/mybilling_test pnpm db:seed
 *   node site/capturar.mjs
 *
 * Determinístico no conteúdo: o seed tem semente fixa e se ancora no mês
 * corrente, então as capturas mudam só quando o mês vira. Movimento reduzido
 * e `document.fonts.ready` tiram o resto da variação.
 */

const PORTA = 3200;
const URL_BASE = `http://localhost:${PORTA}`;
const URL_BANCO =
  process.env.DATABASE_URL_CAPTURA ??
  "postgres://mybilling:mybilling@localhost:5433/mybilling_test";
const EMAIL = "pessoa-a@example.com";
const FUSO = "America/Sao_Paulo";
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const DESTINO = join(AQUI, "imagens");

const TELAS = [
  { nome: "visao-geral", rota: (comp) => `/${comp}` },
  { nome: "lancamentos", rota: (comp) => `/${comp}/lancamentos` },
];
const TEMAS = ["claro", "escuro"];

function competenciaCorrente() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year").value;
  const mes = partes.find((p) => p.type === "month").value;
  return `${ano}-${mes}`;
}

async function esperarServidor(url, tentativas = 120) {
  for (let i = 0; i < tentativas; i += 1) {
    try {
      const resposta = await fetch(url, { redirect: "manual" });
      if (resposta.status < 500) {
        return;
      }
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`servidor não respondeu em ${url}`);
}

function subirServidor() {
  const filho = spawn("pnpm", ["exec", "next", "dev", "--port", String(PORTA)], {
    cwd: RAIZ,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    env: {
      ...process.env,
      NODE_ENV: "test",
      AUTH_PROVIDER_DE_TESTE: "1",
      DATABASE_URL: URL_BANCO,
      AUTH_SECRET: "segredo-local-de-captura-nao-e-credencial",
      AUTH_GOOGLE_ID: "client-id-placeholder",
      AUTH_GOOGLE_SECRET: "client-secret-placeholder",
      EMAILS_PERMITIDOS: `${EMAIL},pessoa-b@example.com`,
    },
  });
  filho.stderr.on("data", (d) => process.stderr.write(d));
  return filho;
}

async function entrar(contexto) {
  const csrf = await contexto.request.get(`${URL_BASE}/api/auth/csrf`);
  const { csrfToken } = await csrf.json();
  await contexto.request.post(`${URL_BASE}/api/auth/callback/provedor-de-teste`, {
    form: { csrfToken, email: EMAIL, callbackUrl: "/" },
  });
}

async function capturar() {
  mkdirSync(DESTINO, { recursive: true });
  const servidor = subirServidor();
  const navegador = await chromium.launch({ channel: "chrome" });
  try {
    await esperarServidor(`${URL_BASE}/login`);
    const competencia = competenciaCorrente();
    for (const tema of TEMAS) {
      const contexto = await navegador.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        reducedMotion: "reduce",
        colorScheme: tema === "escuro" ? "dark" : "light",
        locale: "pt-BR",
        timezoneId: FUSO,
      });
      await contexto.addInitScript((t) => {
        localStorage.setItem("mybilling:tema", t);
      }, tema);
      await entrar(contexto);
      const pagina = await contexto.newPage();
      for (const tela of TELAS) {
        await pagina.goto(`${URL_BASE}${tela.rota(competencia)}`, { waitUntil: "networkidle" });
        await pagina.evaluate(() => document.fonts.ready);
        // O indicador de desenvolvimento do Next não é parte do produto.
        await pagina.evaluate(() => {
          for (const portal of document.querySelectorAll("nextjs-portal")) {
            portal.remove();
          }
        });
        await pagina.waitForTimeout(300);
        const arquivo = join(DESTINO, `${tela.nome}-${tema}.png`);
        await pagina.screenshot({ path: arquivo, fullPage: false });
        console.log(`gravado ${arquivo}`);
      }
      await contexto.close();
    }
  } finally {
    await navegador.close();
    try {
      process.kill(-servidor.pid, "SIGTERM");
    } catch {
      // já encerrado
    }
  }
}

capturar().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
