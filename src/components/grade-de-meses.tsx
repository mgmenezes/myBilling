import Link from "next/link";
import { type Competencia, compararCompetencias } from "@/domain";
import { nomeDoMes } from "@/lib/formatar";

/**
 * Os doze meses do ano como destinos.
 *
 * **Grade de quatro por três, não duas colunas de seis.** Um ano se lê como
 * quatro trimestres empilhados; duas colunas de seis é o que o papel impõe, não
 * o que o olho procura. Em 400px vira duas colunas, em tablet três.
 *
 * **O tempo é lido como forma.** Mês que já passou tem borda sólida; mês que
 * ainda não chegou tem borda tracejada e texto recuado; o corrente carrega a
 * barra de 2px em `--primary`, o mesmo marcador de "você está aqui" que a
 * navegação lateral usa. Nada aqui é cor sozinha — a borda tracejada continua
 * legível sem matiz, e o estado vai também em texto para leitor de tela.
 *
 * A competência aparece em mono embaixo do nome. É o detalhe que separa app de
 * finanças de calendário: a mono do sistema aparece onde há grandeza, e a chave
 * do mês é a grandeza desta tela.
 *
 * **Recebe as competências prontas, não o ano.** Montá-las aqui obrigaria a
 * tratar um ano que não cabe numa competência, e esse ramo seria morto: quem
 * chama já validou. `competenciasDoAno` é o único lugar que constrói os doze, e
 * o único que precisa dizer o que fazer com `99999`.
 */

export function GradeDeMeses({
  competencias,
  competenciaCorrente,
}: {
  readonly competencias: ReadonlyArray<Competencia>;
  readonly competenciaCorrente: Competencia;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {competencias.map((competencia) => {
        const ordem = compararCompetencias(competencia, competenciaCorrente);
        const corrente = ordem === 0;
        const futuro = ordem === 1;

        return (
          <li key={competencia}>
            <Link
              href={`/${competencia}`}
              aria-current={corrente ? "date" : undefined}
              className={`relative flex min-h-[84px] flex-col justify-center gap-1 rounded-lg border bg-surface px-5 py-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-lift ${
                futuro ? "border-dashed border-line" : "border-line"
              }`}
            >
              {corrente ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-0 h-7 w-0.5 -translate-y-1/2 rounded-pill bg-primary"
                />
              ) : null}
              <span
                className={`text-[17px] ${corrente ? "font-semibold text-ink" : "font-normal"} ${
                  futuro ? "text-ink-muted" : "text-ink"
                }`}
              >
                {nomeDoMes(competencia)}
              </span>
              <span className="tabular text-[12px] text-ink-soft">{competencia}</span>
              {/* O estado que a borda desenha, em texto, para quem não a vê. */}
              <span className="sr-only">
                {corrente ? ", mês corrente" : futuro ? ", ainda não chegou" : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
