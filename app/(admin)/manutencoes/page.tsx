import { ManutencoesClient } from "./components/ManutencoesClient";
import { getManutencaoFormOptions, getManutencoes } from "./actions";
import { getResidenciais } from "../residenciais/actions";

export const dynamic = "force-dynamic";

export default async function ManutencoesPage() {
  const [manutencoesResult, optionsResult, residenciaisResult] = await Promise.all([
    getManutencoes(),
    getManutencaoFormOptions(),
    getResidenciais(),
  ]);

  return (
    <ManutencoesClient
      initialManutencoes={manutencoesResult.success ? manutencoesResult.data : []}
      contratos={optionsResult.success ? optionsResult.data.contratos : []}
      prestadores={optionsResult.success ? optionsResult.data.prestadores : []}
      residenciais={residenciaisResult.success ? residenciaisResult.data.residenciais.map(item => ({ id: item.id, nome: item.nome, unidades: item.imoveis.length, manutencoes: item.manutencoes.length })) : []}
      initialError={
        !manutencoesResult.success
          ? manutencoesResult.error
          : !optionsResult.success
            ? optionsResult.error
            : !residenciaisResult.success
              ? residenciaisResult.error
            : null
      }
    />
  );
}
