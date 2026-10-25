"use client";

import { CheckCircleIcon, UploadSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import { MAX_CONTEUDO_PLANILHA } from "@/application/schemas/importacao.schema";
import {
  type Competencia,
  competenciaDeAnoEMes,
  competenciaDoNomeDoArquivo,
  type DomainError,
  lerAba,
  lerCsv,
  TITULOS,
} from "@/domain";
import { mensagemDoErro } from "@/lib/erros";
import { formatarCompetencia, nomeDoMes } from "@/lib/formatar";
import { hojeEm } from "@/lib/relogio";

/**
 * Passo 1 da importação: o arquivo e o mês (IMP-02, IMP-08).
 *
 * **O arquivo é lido aqui, no navegador**, com as mesmas funções do domínio
 * que o servidor usa. É o que permite dizer "4 blocos encontrados" ou qual
 * bloco faltou antes de qualquer ida ao servidor. O servidor lê de novo na
 * prévia e na gravação (IMP-06, AC 6): o que este passo conclui orienta a
 * pessoa, não decide nada.
 *
 * **O mês e o ano só são pré-selecionados.** Eles vêm do nome do arquivo, e a
 * competência aparece por extenso com o aviso de conferir o ano. Foi o ano
 * digitado errado que motivou a fatia; o ano lido do título pode estar errado
 * do mesmo jeito, numa planilha que atravessa a virada do ano.
 */

export interface ArquivoEscolhido {
  readonly nomeArquivo: string;
  readonly conteudo: string;
  readonly competencia: Competencia;
}

export interface PassoArquivoProps {
  readonly nomeDaPessoa: string;
  readonly competenciaEsperada: Competencia | null;
  readonly aoContinuar: (escolhido: ArquivoEscolhido) => void;
}

interface Lido {
  readonly nomeArquivo: string;
  readonly conteudo: string;
}

const ROTULO_CLASSE = "text-[14px] font-medium text-ink";
const CONTROLE_CLASSE =
  "w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong";
const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo";

const MESES = Array.from({ length: 12 }, (_, indice) => indice + 1);
const EXTENSAO_CSV = /\.csv$/i;

/** Quantos anos o seletor oferece de cada lado do ano de referência. */
const ANOS_EM_VOLTA = 2;

function mensagemDaLeitura(erro: DomainError): string {
  if (erro.code === "PLANILHA_BLOCO_AUSENTE") {
    return mensagemDoErro("PLANILHA_BLOCO_AUSENTE").replace(
      "{bloco}",
      String(erro.detalhes?.bloco),
    );
  }
  return mensagemDoErro("PLANILHA_ARQUIVO_INVALIDO");
}

/**
 * Os anos do seletor: em volta do ano do arquivo, ou do esperado, ou do
 * corrente, e sempre com o do mês esperado. Uma lista de cem anos esconderia o
 * que importa; o ano errado mais provável é o vizinho.
 */
function anosOferecidos(anoDoArquivo: number | null, esperada: Competencia | null): number[] {
  const anoEsperado = esperada === null ? null : Number(esperada.slice(0, 4));
  const referencia = anoDoArquivo ?? anoEsperado ?? Number(hojeEm().slice(0, 4));
  const anos = new Set<number>();
  for (let ano = referencia - ANOS_EM_VOLTA; ano <= referencia + ANOS_EM_VOLTA; ano++) {
    anos.add(ano);
  }
  if (anoEsperado !== null) {
    anos.add(anoEsperado);
  }
  return [...anos].sort((a, b) => a - b);
}

export function PassoArquivo({
  nomeDaPessoa,
  competenciaEsperada,
  aoContinuar,
}: PassoArquivoProps) {
  const id = useId();
  const seletor = useRef<HTMLInputElement>(null);
  const [lido, setLido] = useState<Lido | null>(null);
  const [erro, setErro] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [anos, setAnos] = useState<number[]>([]);
  const [arrastando, setArrastando] = useState(false);

  const competencia =
    mes === "" || ano === "" ? null : competenciaDeAnoEMes(Number(ano), Number(mes));
  const escolhida = competencia?.ok === true ? competencia.value : null;

  async function receber(arquivo: File | undefined): Promise<void> {
    if (arquivo === undefined) {
      return;
    }
    setErro("");
    setLido(null);

    if (!EXTENSAO_CSV.test(arquivo.name) || arquivo.size > MAX_CONTEUDO_PLANILHA) {
      setErro(mensagemDoErro("PLANILHA_ARQUIVO_INVALIDO"));
      return;
    }

    const conteudo = await arquivo.text();
    const grade = lerCsv(conteudo);
    const aba = grade.ok ? lerAba(grade.value) : grade;
    if (!aba.ok) {
      setErro(mensagemDaLeitura(aba.error));
      return;
    }

    const doNome = competenciaDoNomeDoArquivo(arquivo.name);
    setMes(doNome.mes === null ? "" : String(doNome.mes));
    setAno(doNome.ano === null ? "" : String(doNome.ano));
    setAnos(anosOferecidos(doNome.ano, competenciaEsperada));
    setLido({ nomeArquivo: arquivo.name, conteudo });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-[15px] text-ink-muted">
        <p>{`Tudo entra em nome de ${nomeDaPessoa}`}</p>
        {competenciaEsperada === null ? null : (
          <p>{`Próximo mês esperado: ${formatarCompetencia(competenciaEsperada)}`}</p>
        )}
      </div>

      <section
        aria-label="Área para soltar o arquivo"
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastando(false);
          void receber(evento.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center transition-colors duration-200 ${
          arrastando ? "border-ink bg-surface-strong" : "border-line-strong bg-surface-soft"
        }`}
      >
        <UploadSimpleIcon size={28} aria-hidden="true" className="text-ink-muted" />
        <p className="text-[15px] text-ink-muted">
          Arraste para cá a aba do mês exportada em .csv, ou
        </p>
        <button
          type="button"
          onClick={() => seletor.current?.click()}
          className="inline-flex min-h-11 items-center justify-center rounded-pill bg-surface-strong px-5 text-[15px] font-semibold text-ink transition-[transform,background-color] duration-200 hover:bg-line active:scale-[0.97]"
        >
          Escolher arquivo
        </button>
        <input
          ref={seletor}
          type="file"
          accept=".csv"
          aria-label="Arquivo .csv da aba"
          tabIndex={-1}
          className="sr-only"
          onChange={(evento) => {
            void receber(evento.target.files?.[0]);
            /* Escolher o mesmo arquivo de novo precisa disparar `change`. */
            evento.target.value = "";
          }}
        />
      </section>

      {erro === "" ? null : (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-negativo px-4 py-3 text-[14px] font-medium text-negativo"
        >
          <WarningCircleIcon
            size={18}
            weight="fill"
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          {erro}
        </p>
      )}

      {lido === null ? null : (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-4">
            <CheckCircleIcon
              size={20}
              weight="fill"
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-ink"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="break-words text-[15px] font-medium text-ink">{lido.nomeArquivo}</p>
              <p className="text-[14px] text-ink-muted">{`${Object.keys(TITULOS).length} blocos encontrados`}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex w-full flex-col gap-1">
              <label className={ROTULO_CLASSE} htmlFor={`${id}-mes`}>
                Mês
              </label>
              <select
                id={`${id}-mes`}
                className={CONTROLE_CLASSE}
                value={mes}
                onChange={(evento) => setMes(evento.target.value)}
              >
                <option value="">Escolha o mês</option>
                {MESES.map((numero) => (
                  <option key={numero} value={String(numero)}>
                    {nomeDoMes(`2000-${String(numero).padStart(2, "0")}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-full flex-col gap-1">
              <label className={ROTULO_CLASSE} htmlFor={`${id}-ano`}>
                Ano
              </label>
              <select
                id={`${id}-ano`}
                className={CONTROLE_CLASSE}
                value={ano}
                onChange={(evento) => setAno(evento.target.value)}
              >
                <option value="">Escolha o ano</option>
                {anos.map((opcao) => (
                  <option key={opcao} value={String(opcao)}>
                    {opcao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {escolhida === null ? null : (
            <div className="flex flex-col gap-1">
              <p className="text-[22px] leading-tight text-ink">{formatarCompetencia(escolhida)}</p>
              <p className="flex items-center gap-1.5 text-[14px] font-medium text-ink-muted">
                <WarningCircleIcon size={16} aria-hidden="true" className="shrink-0" />
                Confira o ano antes de continuar
              </p>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={lido === null || escolhida === null}
        onClick={() => {
          if (lido !== null && escolhida !== null) {
            aoContinuar({ ...lido, competencia: escolhida });
          }
        }}
        className={`${BOTAO_PRIMARIO} w-fit`}
      >
        Continuar
      </button>
    </div>
  );
}
