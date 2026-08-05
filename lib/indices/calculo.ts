/**
 * Acumula as variações mensais publicadas pelo SGS.
 *
 * Como o SGS fornece taxas já arredondadas, o resultado é uma prévia e pode
 * diferir alguns centésimos do acumulado oficial publicado pelo instituto.
 */
export function calcularVariacaoSicadi(taxasMensais: Array<number | string>) {
  const fator = taxasMensais.reduce<number>((acumulado, taxaInformada) => {
    const taxa = Number(taxaInformada);
    if (!Number.isFinite(taxa)) throw new Error(`Taxa mensal inválida: ${taxaInformada}`);
    return acumulado * (1 + taxa / 100);
  }, 1);
  // O Sicadi trabalha com o percentual acumulado arredondado em duas casas
  // antes de aplicá-lo ao aluguel.
  const percentual = Number(((fator - 1) * 100).toFixed(2));

  return {
    fator: 1 + percentual / 100,
    percentual,
  };
}
