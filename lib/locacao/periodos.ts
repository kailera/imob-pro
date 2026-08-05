export const HISTORICO_STATUS = {
  NAO_INICIADO: "NAO_INICIADO",
  PARCIAL: "PARCIAL",
  COMPLETO: "COMPLETO",
  DIVERGENTE: "DIVERGENTE",
} as const;

export type HistoricoStatus = (typeof HISTORICO_STATUS)[keyof typeof HISTORICO_STATUS];

export function normalizarDataUTC(valor: string | Date): Date {
  if (typeof valor === "string") {
    const dataPura = valor.slice(0, 10);
    const [ano, mes, dia] = dataPura.split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
  }

  return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
}

export function adicionarDiasUTC(valor: string | Date, dias: number): Date {
  const data = normalizarDataUTC(valor);
  data.setUTCDate(data.getUTCDate() + dias);
  return data;
}

export function adicionarMesesUTC(valor: string | Date, meses: number): Date {
  const data = normalizarDataUTC(valor);
  const diaOriginal = data.getUTCDate();
  const mesAlvo = data.getUTCMonth() + meses;
  const primeiroDiaMesAlvo = new Date(Date.UTC(data.getUTCFullYear(), mesAlvo, 1));
  const ultimoDiaMesAlvo = new Date(Date.UTC(
    primeiroDiaMesAlvo.getUTCFullYear(),
    primeiroDiaMesAlvo.getUTCMonth() + 1,
    0,
  )).getUTCDate();

  return new Date(Date.UTC(
    primeiroDiaMesAlvo.getUTCFullYear(),
    primeiroDiaMesAlvo.getUTCMonth(),
    Math.min(diaOriginal, ultimoDiaMesAlvo),
  ));
}

export function formatarDataInput(valor: string | Date): string {
  return normalizarDataUTC(valor).toISOString().slice(0, 10);
}

export function calcularFaixaPeriodo(
  inicio: string | Date,
  periodicidadeMeses: number,
  fimContrato: string | Date,
) {
  const dataInicio = normalizarDataUTC(inicio);
  const limiteContrato = normalizarDataUTC(fimContrato);
  const aniversario = adicionarMesesUTC(dataInicio, Math.max(1, periodicidadeMeses));
  const fimCalculado = adicionarDiasUTC(aniversario, -1);

  return {
    dataInicio,
    dataFim: fimCalculado > limiteContrato ? limiteContrato : fimCalculado,
  };
}

export function sugerirLacunaPeriodo(
  inicioContrato: string | Date,
  fimContrato: string | Date,
  periodos: Array<{ dataInicio: string | Date; dataFim: string | Date }>,
  periodicidadeMeses = 12,
) {
  const inicio = normalizarDataUTC(inicioContrato);
  const limite = normalizarDataUTC(fimContrato);
  const ordenados = periodos
    .map((periodo) => ({
      dataInicio: normalizarDataUTC(periodo.dataInicio),
      dataFim: normalizarDataUTC(periodo.dataFim),
    }))
    .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());

  let cursor = inicio;
  for (const periodo of ordenados) {
    if (periodo.dataFim < cursor || periodo.dataInicio > limite) continue;
    if (periodo.dataInicio > cursor) {
      return {
        dataInicio: cursor,
        dataFim: adicionarDiasUTC(periodo.dataInicio, -1),
      };
    }
    if (periodo.dataFim >= cursor) cursor = adicionarDiasUTC(periodo.dataFim, 1);
    if (cursor > limite) return null;
  }

  if (cursor > limite) return null;
  return calcularFaixaPeriodo(cursor, periodicidadeMeses, limite);
}

export function datasSaoConsecutivas(fimAnterior: string | Date, inicioSeguinte: string | Date) {
  return adicionarDiasUTC(fimAnterior, 1).getTime() === normalizarDataUTC(inicioSeguinte).getTime();
}

export function calcularPercentualEntreValores(valorAnterior: number, novoValor: number) {
  if (!Number.isFinite(valorAnterior) || valorAnterior <= 0 || !Number.isFinite(novoValor)) return null;
  return Number((((novoValor / valorAnterior) - 1) * 100).toFixed(2));
}

export function calcularIntervaloCompetenciasReajuste(
  inicioPeriodo: string | Date,
  fimPeriodo: string | Date,
) {
  const inicio = normalizarDataUTC(inicioPeriodo);
  const inicioNovoPeriodo = adicionarDiasUTC(fimPeriodo, 1);

  return {
    dataInicio: new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1)),
    dataFim: new Date(Date.UTC(
      inicioNovoPeriodo.getUTCFullYear(),
      inicioNovoPeriodo.getUTCMonth(),
      0,
    )),
  };
}

export function inicioMesUTC(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes - 1, 1));
}

export function proximoMesUTC(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 1));
}
