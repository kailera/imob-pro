import { ManutencoesClient } from "./components/ManutencoesClient";
import { getManutencaoFormOptions, getManutencoes } from "./actions";

export const dynamic = "force-dynamic";

export default async function ManutencoesPage() {
  const [manutencoesResult, optionsResult] = await Promise.all([
    getManutencoes(),
    getManutencaoFormOptions(),
  ]);

  return (
    <ManutencoesClient
      initialManutencoes={manutencoesResult.success ? manutencoesResult.data : []}
      contratos={optionsResult.success ? optionsResult.data.contratos : []}
      prestadores={optionsResult.success ? optionsResult.data.prestadores : []}
      initialError={
        !manutencoesResult.success
          ? manutencoesResult.error
          : !optionsResult.success
            ? optionsResult.error
            : null
      }
    />
  );
}
