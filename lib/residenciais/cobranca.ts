export type DespesaResidencialCobranca = {
  id: string;
  nome: string;
  categoria: string;
  valor: unknown;
  ativo: boolean;
  inicioVigencia: Date;
  fimVigencia: Date | null;
};

export function resolverDespesasResidencial(
  despesas: DespesaResidencialCobranca[] | null | undefined,
  referencia: Date,
  gasLocacao: number,
) {
  const vigentes = (despesas ?? []).filter(item =>
    item.ativo
    && item.inicioVigencia <= referencia
    && (!item.fimVigencia || item.fimVigencia >= referencia),
  );
  const gasResidencial = vigentes
    .filter(item => item.categoria === "GAS")
    .reduce((total, item) => total + Number(item.valor), 0);
  const residentialExpenses = vigentes.map(item => ({
    id: item.id,
    description: item.nome,
    category: item.categoria,
    amount: Number(Number(item.valor).toFixed(2)),
  }));

  return {
    gasValue: gasResidencial > 0 ? Number(gasResidencial.toFixed(2)) : gasLocacao,
    gasOverridden: gasResidencial > 0 && gasLocacao > 0,
    residentialExpenses: residentialExpenses.filter(item => item.category !== "GAS"),
    residentialGasExpenses: residentialExpenses.filter(item => item.category === "GAS"),
    additionalTotal: Number(residentialExpenses
      .filter(item => item.category !== "GAS")
      .reduce((total, item) => total + item.amount, 0)
      .toFixed(2)),
  };
}
