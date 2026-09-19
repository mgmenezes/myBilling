import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SCRIPT_TEMA } from "@/components/alternador-de-tema";
import "./globals.css";

/**
 * As duas famílias do sistema. `DESIGN.md` descreve tipos licenciados da
 * Coinbase e indica os substitutos abertos na própria seção de lacunas:
 * **CoinbaseDisplay e CoinbaseSans → Inter**, **CoinbaseMono → JetBrains
 * Mono**. É o que está aqui — nenhum arquivo de marca deles é distribuído.
 *
 * Inter variável, sem lista de pesos: o eixo contínuo dá 400 para corpo e
 * display e 600 para rótulo e título pequeno, que é a divisão do documento.
 * Declarar `weight` traria estáticos e obrigaria a carregar dois arquivos.
 *
 * A mono não é enfeite: ela carrega **toda grandeza numérica** do app, por
 * regra do sistema. Por isso vem com subset latino e `display: swap`, como a
 * outra — um valor monetário que chega tarde é pior que um rótulo que chega
 * tarde.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "myBilling",
  description: "Controle financeiro da casa",
};

/** Sem zoom travado: ampliar a página é acessibilidade, não bug. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
  ],
};

/**
 * O `<script>` inline do `<head>` aplica o tema escolhido durante o parse do
 * HTML, antes da primeira pintura. Sem ele o navegador pintaria o tema do
 * sistema e só depois, na hidratação, corrigiria — o lampejo branco que
 * qualquer app de tema persistido dá quando resolve isso em `useEffect`.
 *
 * `suppressHydrationWarning` no `<html>` é consequência direta disso: o
 * script escreve `data-tema` antes de o React hidratar, e sem a supressão o
 * React trataria o atributo a mais como divergência e descartaria a correção.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/*
          O React avisa no console de desenvolvimento: "Encountered a script tag
          while rendering React component. Scripts inside React components are
          never executed when rendering on the client."

          **O aviso é um falso positivo aqui, e trocar por `next/script` seria
          pior.** Ele alerta sobre renderização no *cliente*; este script só
          existe na primeira carga, vinda do servidor, que é exatamente quando o
          tema precisa ser aplicado — antes da primeira pintura. Conferido: ele
          chega ao HTML servido e executa.

          `next/script` com `beforeInteractive` silenciaria o aviso e devolveria
          o flash de tema errado, que é defeito que o usuário vê. Trocar ruído de
          console por isso é andar para trás.
        */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: conteúdo constante do próprio módulo, sem nenhum dado de usuário ou de requisição. É a única forma de rodar antes da pintura. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
