/**
 * Regra aplicada pelo SICADI: o acumulado anual é a soma das taxas mensais,
 * sem capitalização entre competências.
 */
export function calcularVariacaoSicadi(taxasMensais: Array<number | string>) {
  const percentualBruto = taxasMensais.reduce<number>((acumulado, taxaInformada) => {
    const taxa = Number(taxaInformada);
    if (!Number.isFinite(taxa)) throw new Error(`Taxa mensal inválida: ${taxaInformada}`);
    return acumulado + taxa;
  }, 0);
  const percentual = Number(percentualBruto.toFixed(4));

  return {
    fator: 1 + percentual / 100,
    percentual,
  };
}
