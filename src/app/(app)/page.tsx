import { redirect } from "next/navigation";
import { dataParaCompetencia } from "@/domain";
import { sessaoDaUI } from "./sessao";

/**
 * A raiz autenticada não tem conteúdo próprio: manda para a competência
 * corrente (UI-01, AC 1). O fuso é explícito, nunca o da máquina (AD-002).
 */
const FUSO = "America/Sao_Paulo";

export const dynamic = "force-dynamic";

export default async function RaizAutenticada() {
  await sessaoDaUI();

  const corrente = dataParaCompetencia(new Date().toISOString(), FUSO);
  if (!corrente.ok) {
    throw new Error("não foi possível resolver a competência corrente");
  }
  redirect(`/${corrente.value}`);
}
