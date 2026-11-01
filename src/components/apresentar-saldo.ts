import type { Cents } from "@/domain";
import { formatarBRL } from "@/lib/formatar";

/**
 * O rótulo carrega o sentido e a cor só o repete (`docs/design.md`, "Semântica
 * de valor"). Por isso o valor sai sem sinal: "Vai faltar R$ 500,00", e não
 * "Vai faltar -R$ 500,00". O zero não é sobra nem falta, e fica sem cor. As
 * classes ficam escritas por extenso porque o Tailwind só gera o que lê.
 *
 * "Vai sobrar" e "Vai faltar" são as palavras do dono (SALDO-03). Vivem num
 * módulo puro porque "Próximos meses" e a resposta do simulador (SIM-02, AC 3)
 * precisam dizer a mesma coisa com as mesmas cores.
 */
export function apresentarSaldo(saldo: Cents): {
  readonly rotulo: string;
  readonly valor: string;
  readonly classe: string;
} {
  if (saldo < 0) {
    return { rotulo: "Vai faltar", valor: formatarBRL(Math.abs(saldo)), classe: "text-negativo" };
  }
  return {
    rotulo: "Vai sobrar",
    valor: formatarBRL(saldo),
    classe: saldo > 0 ? "text-positivo" : "text-ink",
  };
}
