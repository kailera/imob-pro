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

export function datasSaoConsecutivas(fimAnterior: string | Date, inicioSeguinte: string | Date) {
  return adicionarDiasUTC(fimAnterior, 1).getTime() === normalizarDataUTC(inicioSeguinte).getTime();
}

export function calcularPercentualEntreValores(valorAnterior: number, novoValor: number) {
  if (!Number.isFinite(valorAnterior) || valorAnterior <= 0 || !Number.isFinite(novoValor)) return null;
  return Number((((novoValor / valorAnterior) - 1) * 100).toFixed(4));
}

export function inicioMesUTC(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes - 1, 1));
}

export function proximoMesUTC(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 1));
}
