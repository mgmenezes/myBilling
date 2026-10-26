import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Em desenvolvimento, o Next registra no terminal cada Server Action com os
  // argumentos. O da importação é o texto inteiro de uma aba real da planilha,
  // e ele não pode parar em scrollback nem em log colado (AD-009).
  logging: {
    serverFunctions: false,
  },
  experimental: {
    // Habilita `forbidden()`, que é como uma página responde 403 de verdade
    // em vez de fingir com uma tela de erro 200 (AUTH-01, AC 2).
    authInterrupts: true,
  },
};

export default nextConfig;
