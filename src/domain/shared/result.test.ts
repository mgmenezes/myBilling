import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type CodigoErro, type DomainError, err, isErr, isOk, ok, type Result } from "./result";

describe("ok / isOk", () => {
  it("ok(v) produz um Result cujo ramo de sucesso isOk estreita para value", () => {
    const resultado: Result<number, CodigoErro> = ok(42);

    expect(isOk(resultado)).toBe(true);

    if (isOk(resultado)) {
      // Só compila porque isOk estreitou o tipo para o ramo { ok: true; value: T }.
      expect(resultado.value).toBe(42);
    } else {
      throw new Error("isOk deveria ter estreitado para o ramo de sucesso");
    }
  });

  it("isErr é false para um Result de sucesso", () => {
    const resultado: Result<number, CodigoErro> = ok(1);
    expect(isErr(resultado)).toBe(false);
  });
});

describe("err / isErr", () => {
  it("err(c) produz um Result cujo ramo de falha isErr estreita para error", () => {
    const resultado: Result<number, CodigoErro> = err("VALOR_NAO_POSITIVO");

    expect(isErr(resultado)).toBe(true);

    if (isErr(resultado)) {
      // Só compila porque isErr estreitou o tipo para o ramo { ok: false; error: E }.
      expect(resultado.error).toBe("VALOR_NAO_POSITIVO");
    } else {
      throw new Error("isErr deveria ter estreitado para o ramo de falha");
    }
  });

  it("isOk é false para um Result de falha", () => {
    const resultado: Result<number, CodigoErro> = err("VALOR_NAO_POSITIVO");
    expect(isOk(resultado)).toBe(false);
  });
});

describe("CodigoErro", () => {
  const todosOsCodigos: readonly CodigoErro[] = [
    "PARCELA_INFERIOR_A_UM_CENTAVO",
    "QTD_PARCELAS_INVALIDA",
    "VALOR_NAO_POSITIVO",
    "PARCELA_INICIAL_INVALIDA",
    "MEIO_PAGAMENTO_ARQUIVADO",
    "CONSERVACAO_VIOLADA",
    "COMPETENCIA_INVALIDA",
  ];

  it.each(todosOsCodigos)("aceita o código de erro do catálogo: %s", (codigo) => {
    const erro: DomainError = { code: codigo };
    expect(erro.code).toBe(codigo);
  });

  it("é união fechada de literais: um código fora do catálogo não compila", () => {
    // @ts-expect-error — CodigoErro é união fechada, não aceita string arbitrária.
    // Se esta linha compilar (ou seja, se @ts-expect-error virar "diretiva não usada"),
    // `pnpm typecheck` falha: é isso que prova que a união não é `string` aberto.
    const codigoInvalido: CodigoErro = "CODIGO_QUE_NAO_EXISTE_NO_CATALOGO";
    expect(typeof codigoInvalido).toBe("string");
  });
});

describe("nenhuma mensagem de usuário em result.ts", () => {
  it("o arquivo fonte não declara nenhum campo de mensagem em pt-BR", () => {
    const caminho = join(__dirname, "result.ts");
    const fonte = readFileSync(caminho, "utf-8");

    expect(fonte).not.toMatch(/mensagem\s*:/i);
    expect(fonte).not.toMatch(/message\s*:/i);
  });
});
