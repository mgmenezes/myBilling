import { handlers } from "@/infrastructure/auth/auth";

/**
 * Rota do Auth.js. Sem lógica própria de propósito: toda regra de
 * autorização vive na configuração (`src/infrastructure/auth/auth.ts`), num
 * lugar só. Uma verificação duplicada aqui seria uma segunda fonte de verdade
 * que pode divergir em silêncio da primeira.
 */
export const { GET, POST } = handlers;
