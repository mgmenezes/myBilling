import { describe, expect, it } from "vitest";
import type { Fakes } from "@/application/ports/fakes";
import type { Cents } from "@/domain";
import {
  CONTA,
  c,
  conteudoDaFixture,
  criarCenario,
  DECISOES_NOVAS_DE_NOVEMBRO,
  PESSOA_A,
  SEM_DECISOES,
  semearOutubroAMao,
} from "../testing/cenario";
import { type EntradaDaImportacao, preverImportacao } from "./handler";

/**
 * A prévia (design, Decisão 2): lê a aba, confere a ordem e o banco vazio
 * (IMP-02 AC 4 a 6), carrega o estado e monta o plano com as decisões
 * lembradas somadas às do passo 2 (IMP-04 AC 5). Não grava nada.
 */

function entrada(mudancas: Partial<EntradaDaImportacao> = {}): EntradaDaImportacao {
  return {
    nomeArquivo: "Planilha 2026 - Outubro.csv",
    conteudo: conteudoDaFixture("Outubro"),
    competencia: c("2026-10"),
    decisoes: SEM_DECISOES,
    ...mudancas,
  };
}

function novembro(mudancas: Partial<EntradaDaImportacao> = {}): EntradaDaImportacao {
  return entrada({
    nomeArquivo: "Planilha 2026 - Novembro.csv",
    conteudo: conteudoDaFixture("Novembro"),
    competencia: c("2026-11"),
    ...mudancas,
  });
}

/** Tudo o que os fakes guardam, copiado: o que a prévia não pode mudar. */
function fotografia(fakes: Fakes) {
  return structuredClone(fakes.estado);
}

async function depoisDeOutubro() {
  const fakes = criarCenario();
  await semearOutubroAMao(fakes);
  return fakes;
}

describe("preverImportacao: primeira importação (T17)", () => {
  it("banco vazio aceita outubro, sem competência esperada, com as pendências da aba (IMP-02 AC 6, IMP-04 AC 1 e 3)", async () => {
    const fakes = criarCenario();

    const resultado = await preverImportacao(fakes, entrada());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.value.competenciaEsperada).toBeNull();
    expect(resultado.value.plano.competencia).toBe("2026-10");
    expect(resultado.value.plano.pendencias).toEqual({
      tiposSemMeio: [
        { chave: "débito", nome: "Débito", linhas: 4 },
        { chave: "cartão roxo", nome: "Cartão Roxo", linhas: 8 },
        { chave: "cartão verde", nome: "Cartão Verde", linhas: 1 },
      ],
      entradasSemClasse: [
        { chave: "salário a", nome: "Salário A" },
        { chave: "salário b", nome: "Salário B" },
        { chave: "reembolso", nome: "Reembolso" },
      ],
    });
    expect(resultado.value.plano.operacoes).toBeNull();
  });

  it("sem registro e com um avulso no banco, recusa com IMPORTACAO_BANCO_NAO_VAZIO (IMP-02 AC 6)", async () => {
    const fakes = criarCenario();
    await fakes.movimentos.criarAvulso({
      natureza: "DESPESA",
      descricao: "Lançado à mão",
      competencia: c("2026-09"),
      dataEvento: "2026-09-10",
      valor: 5000 as Cents,
      pagoEm: null,
      categoriaId: null,
      usuarioId: PESSOA_A,
      meioPagamentoId: CONTA,
    });

    const resultado = await preverImportacao(fakes, entrada());

    expect(resultado).toEqual({ ok: false, error: { code: "IMPORTACAO_BANCO_NAO_VAZIO" } });
  });
});

describe("preverImportacao: abas seguintes (T17)", () => {
  it("depois de outubro, a esperada é novembro (IMP-02 AC 4)", async () => {
    const fakes = await depoisDeOutubro();

    const resultado = await preverImportacao(fakes, novembro());

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.value.competenciaEsperada).toBe("2026-11");
  });

  it("depois de outubro, dezembro é recusado nomeando novembro (IMP-02 AC 5)", async () => {
    const fakes = await depoisDeOutubro();

    const resultado = await preverImportacao(
      fakes,
      entrada({ conteudo: conteudoDaFixture("Dezembro"), competencia: c("2026-12") }),
    );

    expect(resultado).toEqual({
      ok: false,
      error: { code: "IMPORTACAO_FORA_DE_ORDEM", detalhes: { esperada: "2026-11" } },
    });
  });

  it("aplica as decisões lembradas: novembro só pergunta Cartão Azul e Presente (IMP-04 AC 5)", async () => {
    const fakes = await depoisDeOutubro();

    const resultado = await preverImportacao(fakes, novembro());

    expect(resultado.ok && resultado.value.plano.pendencias).toEqual({
      tiposSemMeio: [{ chave: "cartão azul", nome: "Cartão Azul", linhas: 1 }],
      entradasSemClasse: [{ chave: "presente", nome: "Presente" }],
    });
  });

  it("com as duas decisões do passo 2, monta o plano de novembro: 9 a importar (IMP-05 AC 9)", async () => {
    const fakes = await depoisDeOutubro();

    const resultado = await preverImportacao(
      fakes,
      novembro({ decisoes: DECISOES_NOVAS_DE_NOVEMBRO }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    const { plano } = resultado.value;
    expect(plano.pendencias).toEqual({ tiposSemMeio: [], entradasSemClasse: [] });
    expect(plano.quantidadeAImportar).toBe(9);
    expect(plano.deixamDeValer).toEqual([{ recorrenciaId: "rec-4", descricao: "Academia" }]);
    expect(plano.operacoes?.reajustes).toEqual([
      { recorrenciaId: "rec-2", valor: 11000 },
      { recorrenciaId: "rec-6", valor: 420000 },
    ]);
    expect(plano.operacoes?.reprecificacoes).toEqual([
      { compraId: "compra-2", aPartirDe: 2, valor: 3333 },
      { compraId: "compra-6", aPartirDe: 2, valor: 3002 },
    ]);
  });
});

describe("preverImportacao: arquivo (T17, IMP-01)", () => {
  it("aspas não fechadas propagam PLANILHA_ARQUIVO_INVALIDO (AC 17)", async () => {
    const fakes = criarCenario();

    const resultado = await preverImportacao(fakes, entrada({ conteudo: 'X,"aberta\n,,Fixos' }));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("PLANILHA_ARQUIVO_INVALIDO");
  });

  it("CSV salvo com ponto e vírgula propaga PLANILHA_ARQUIVO_INVALIDO, não bloco ausente (AC 17)", async () => {
    const fakes = criarCenario();

    const resultado = await preverImportacao(
      fakes,
      entrada({ conteudo: conteudoDaFixture("Outubro").replaceAll(",", ";") }),
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("PLANILHA_ARQUIVO_INVALIDO");
  });

  it("sem o título Entradas propaga PLANILHA_BLOCO_AUSENTE com detalhes.bloco (AC 3)", async () => {
    const fakes = criarCenario();
    const semEntradas = conteudoDaFixture("Outubro").replace(",Entradas,", ",,");

    const resultado = await preverImportacao(fakes, entrada({ conteudo: semEntradas }));

    expect(resultado).toEqual({
      ok: false,
      error: { code: "PLANILHA_BLOCO_AUSENTE", detalhes: { bloco: "Entradas" } },
    });
  });
});

describe("preverImportacao: não grava nada (T17, Decisão 2)", () => {
  it("nem na prévia com pendência, nem na prévia completa, nem na recusa", async () => {
    const fakes = await depoisDeOutubro();
    const antes = fotografia(fakes);

    await preverImportacao(fakes, novembro());
    await preverImportacao(fakes, novembro({ decisoes: DECISOES_NOVAS_DE_NOVEMBRO }));
    await preverImportacao(fakes, entrada());

    expect(fotografia(fakes)).toEqual(antes);
  });

  it("nem no banco vazio", async () => {
    const fakes = criarCenario();
    const antes = fotografia(fakes);

    await preverImportacao(fakes, entrada());

    expect(fotografia(fakes)).toEqual(antes);
  });
});
