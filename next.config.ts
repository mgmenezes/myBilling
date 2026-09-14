import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Habilita `forbidden()`, que é como uma página responde 403 de verdade
    // em vez de fingir com uma tela de erro 200 (AUTH-01, AC 2).
    authInterrupts: true,
  },
};

export default nextConfig;
