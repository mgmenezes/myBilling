import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

/**
 * O que só o navegador resolve (CAMP-03 AC 6): rolagem horizontal e
 * acessibilidade, medidas em três larguras e dois temas. jsdom não calcula
 * layout, então uma assertion sobre classe CSS provaria que a classe está
 * escrita, e não que a página cabe na tela.
 *
 * Sai com código 1 na primeira combinação que falhar, dizendo qual.
 * Uso: `pnpm site:verificar` (roda o estrutural antes).
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const URL_PAGINA = pathToFileURL(join(AQUI, "index.html")).href;
const LARGURAS = [360, 768, 1440];
const TEMAS = ["light", "dark"];
const REGRAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function verificar() {
  const navegador = await chromium.launch({ channel: "chrome" });
  const falhas = [];
  try {
    for (const largura of LARGURAS) {
      for (const tema of TEMAS) {
        const contexto = await navegador.newContext({
          viewport: { width: largura, height: 900 },
          colorScheme: tema,
          reducedMotion: "reduce",
        });
        const pagina = await contexto.newPage();
        await pagina.goto(URL_PAGINA, { waitUntil: "load" });
        await pagina.evaluate(() => document.fonts.ready);

        const medidas = await pagina.evaluate(() => {
          // Conteúdo cortado por `overflow: hidden` não aparece na rolagem da
          // página, então cada elemento que recorta é medido por dentro.
          const cortados = [];
          for (const el of document.querySelectorAll("body *")) {
            const estilo = getComputedStyle(el);
            const recorta = /hidden|clip/.test(estilo.overflowX);
            const invisivel = el.getBoundingClientRect().width <= 1;
            if (recorta && !invisivel && el.scrollWidth > el.clientWidth + 1) {
              const classe = el.className ? `.${String(el.className).split(" ")[0]}` : "";
              cortados.push(
                `${el.tagName.toLowerCase()}${classe} (${el.scrollWidth} > ${el.clientWidth})`,
              );
            }
          }
          // DOR-02 AC 6: a partir de 768 px, a cena em destaque ocupa a grade
          // inteira e tem a fonte maior que a da segunda cena.
          const dores = document.querySelector(".dores");
          const cenas = document.querySelectorAll(".dores .dor");
          const destaque =
            dores && cenas.length >= 2
              ? {
                  larguraGrade: dores.getBoundingClientRect().width,
                  larguraPrimeira: cenas[0].getBoundingClientRect().width,
                  fontePrimeira: Number.parseFloat(
                    getComputedStyle(cenas[0].querySelector(".dor-cena")).fontSize,
                  ),
                  fonteSegunda: Number.parseFloat(
                    getComputedStyle(cenas[1].querySelector(".dor-cena")).fontSize,
                  ),
                }
              : null;
          return {
            destaque,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyScroll: document.body.scrollWidth,
            cortados,
          };
        });
        if (
          medidas.scrollWidth !== medidas.clientWidth ||
          medidas.bodyScroll > medidas.clientWidth
        ) {
          falhas.push(
            `${largura}px ${tema}: rolagem horizontal (${medidas.scrollWidth} > ${medidas.clientWidth})`,
          );
        }
        for (const cortado of medidas.cortados) {
          falhas.push(`${largura}px ${tema}: conteúdo cortado em ${cortado}`);
        }
        if (largura >= 768) {
          const d = medidas.destaque;
          if (!d) {
            falhas.push(`${largura}px ${tema}: cena em destaque ausente`);
          } else {
            if (Math.abs(d.larguraPrimeira - d.larguraGrade) > 1) {
              falhas.push(
                `${largura}px ${tema}: a cena em destaque não ocupa a grade (${d.larguraPrimeira} de ${d.larguraGrade})`,
              );
            }
            if (!(d.fontePrimeira > d.fonteSegunda)) {
              falhas.push(
                `${largura}px ${tema}: a fonte da cena em destaque (${d.fontePrimeira}) não é maior que a da segunda (${d.fonteSegunda})`,
              );
            }
          }
        }

        const resultado = await new AxeBuilder({ page: pagina }).withTags(REGRAS_WCAG).analyze();
        for (const violacao of resultado.violations) {
          const alvos = violacao.nodes.map((n) => n.target.join(" ")).join("; ");
          falhas.push(
            `${largura}px ${tema}: axe ${violacao.id} (${violacao.impact}): ${violacao.help} em ${alvos}`,
          );
        }

        console.log(
          `${largura}px ${tema}: ${resultado.violations.length} violação(ões), ${resultado.passes.length} regras ok`,
        );
        await contexto.close();
      }
    }
  } finally {
    await navegador.close();
  }
  if (falhas.length > 0) {
    console.error("\nFALHOU:");
    for (const f of falhas) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }
  console.log("\nSem rolagem horizontal e sem violação de axe nas seis combinações.");
}

verificar().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
