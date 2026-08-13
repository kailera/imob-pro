import { ResidenciaisClient } from "./components/ResidenciaisClient";
import { getResidenciais } from "./actions";

export const dynamic = "force-dynamic";

export default async function ResidenciaisPage() {
  const result = await getResidenciais();
  return <ResidenciaisClient initialData={result.success ? result.data : { residenciais: [], imoveisDisponiveis: [] }} initialError={result.success ? null : result.error} />;
}
