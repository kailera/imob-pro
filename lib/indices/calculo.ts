export function calcularVariacaoComposta(taxasMensais: Array<number | string>) {
  const fator = taxasMensais.reduce<number>((acumulado, taxaInformada) => {
    const taxa = Number(taxaInformada);
    if (!Number.isFinite(taxa)) throw new Error(`Taxa mensal inválida: ${taxaInformada}`);
    return acumulado * (1 + taxa / 100);
  }, 1);

  return {
    fator,
    percentual: Number(((fator - 1) * 100).toFixed(4)),
  };
}
