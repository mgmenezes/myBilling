import { type DomainError, err, ok, type Result } from "../shared/result";

/** Linhas do arquivo, cada uma com as suas células, como texto cru. */
export type Grade = ReadonlyArray<ReadonlyArray<string>>;

const BOM = "﻿";

/**
 * Lê o CSV exportado pelo Google Sheets (RFC 4180): vírgula separa células,
 * aspas duplas envolvem a célula que tem vírgula, aspa ou quebra de linha, e
 * `""` dentro de aspas é uma aspa. As linhas terminam em CRLF ou LF; o `\r`
 * só é descartado quando antecede o `\n`, e dentro de aspas tudo é conteúdo.
 *
 * O fim de linha depois da última linha não abre uma linha nova: o arquivo
 * `a,b\n` tem uma linha só.
 */
export function lerCsv(texto: string): Result<Grade, DomainError> {
  const conteudo = texto.startsWith(BOM) ? texto.slice(BOM.length) : texto;
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let entreAspas = false;

  for (let indice = 0; indice < conteudo.length; indice += 1) {
    const caractere = conteudo.charAt(indice);
    const seguinte = conteudo.charAt(indice + 1);

    if (entreAspas) {
      if (caractere !== '"') {
        celula += caractere;
      } else if (seguinte === '"') {
        celula += '"';
        indice += 1;
      } else {
        entreAspas = false;
      }
    } else if (caractere === '"') {
      entreAspas = true;
    } else if (caractere === ",") {
      linha.push(celula);
      celula = "";
    } else if (caractere === "\n") {
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
    } else if (caractere !== "\r" || seguinte !== "\n") {
      celula += caractere;
    }
  }

  if (entreAspas) {
    return err({ code: "PLANILHA_ARQUIVO_INVALIDO", detalhes: { motivo: "ASPAS_NAO_FECHADAS" } });
  }
  if (celula !== "" || linha.length > 0) {
    linha.push(celula);
    linhas.push(linha);
  }
  return ok(linhas);
}
