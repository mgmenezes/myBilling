import type { Metadata, Viewport } from "next";
import { Sofia_Sans } from "next/font/google";
import "./globals.css";

/**
 * Sofia Sans é variável de 1 a 1000, então o peso 450 do corpo existe de
 * verdade em vez de ser arredondado para 400. O documento de referência a
 * indica como o substituto aberto mais próximo do MarkForMC.
 *
 * Antes desta troca o app renderizava em **Arial**: o `globals.css` de
 * scaffold sobrescrevia o `body` e as variáveis do Geist nunca eram usadas.
 */
const sofia = Sofia_Sans({
  variable: "--font-sofia",
  subsets: ["latin"],
  display: "swap",
  // Sem `weight`: carrega o arquivo variável com o eixo inteiro. Declarar a
  // lista de pesos traria estáticos e 450 nem existe lá. O eixo contínuo é
  // justamente o que permite o peso intermediário do corpo.
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
    { media: "(prefers-color-scheme: light)", color: "#f3f0ee" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sofia.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
