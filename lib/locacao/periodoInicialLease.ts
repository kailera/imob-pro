const DAY_MS = 86_400_000;

export function adicionarMesesUTC(data: Date, meses: number) {
  const resultado = new Date(data);
  const dia = resultado.getUTCDate();
  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(
    resultado.getUTCFullYear(),
    resultado.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  resultado.setUTCDate(Math.min(dia, ultimoDia));
  return resultado;
}

export function calcularFimExclusivoPeriodoInicial(
  inicioContrato: Date,
  fimContratoInclusivo: Date,
  periodicidadeMeses: number,
) {
  const fimPelaPeriodicidade = adicionarMesesUTC(
    inicioContrato,
    Math.max(1, Math.trunc(periodicidadeMeses)),
  );
  const fimContratoExclusivo = new Date(fimContratoInclusivo.getTime() + DAY_MS);
  return fimPelaPeriodicidade < fimContratoExclusivo
    ? fimPelaPeriodicidade
    : fimContratoExclusivo;
}
