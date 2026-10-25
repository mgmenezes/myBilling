/**
 * Mês e ano lidos do nome do arquivo, só para pré-selecionar o diálogo: a
 * competência é sempre confirmada pela pessoa (IMP-02). `null` deixa o seletor
 * correspondente sem escolha.
 */
export interface MesEAnoDoArquivo {
  readonly mes: number | null;
  readonly ano: number | null;
}

const MESES: ReadonlyArray<string> = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const SEPARADOR = " - ";
const EXTENSAO = /\.csv$/i;
/** O navegador acrescenta ` (1)`, ` (2)`… a um download com nome repetido. */
const SUFIXO_DE_DOWNLOAD = /\s*\(\d+\)$/;
const ANO = /^20\d{2}$/;
/** Marcas que a decomposição NFD separa da letra: `ç` vira `c` + cedilha. */
const ACENTOS = /[̀-ͯ]/g;

function semCaixaNemAcento(texto: string): string {
  return texto.normalize("NFD").replace(ACENTOS, "").toLocaleLowerCase("pt-BR");
}

/**
 * `"Planilha 2026 - Outubro.csv"` → `{ mes: 10, ano: 2026 }`. O nome segue
 * `<título da planilha> - <nome da aba>.csv`: o mês é o nome da aba comparado
 * sem caixa e sem acento aos doze meses, e o ano é o último número de quatro
 * dígitos entre 2000 e 2099 do título (IMP-02 AC 1). Sem o separador, o nome
 * inteiro faz os dois papéis.
 */
export function competenciaDoNomeDoArquivo(nomeArquivo: string): MesEAnoDoArquivo {
  const base = nomeArquivo.replace(EXTENSAO, "").replace(SUFIXO_DE_DOWNLOAD, "");
  const corte = base.lastIndexOf(SEPARADOR);
  const [titulo, aba] =
    corte === -1 ? [base, base] : [base.slice(0, corte), base.slice(corte + SEPARADOR.length)];

  const indiceDoMes = MESES.indexOf(semCaixaNemAcento(aba.trim()));
  const ultimoAno = titulo
    .split(/\D+/)
    .filter((numero) => ANO.test(numero))
    .pop();

  return {
    mes: indiceDoMes === -1 ? null : indiceDoMes + 1,
    ano: ultimoAno === undefined ? null : Number(ultimoAno),
  };
}
