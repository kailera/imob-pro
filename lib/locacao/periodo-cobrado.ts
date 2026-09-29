import { calcularInicioCompetencia } from "./financeiro";
import { adicionarDiasUTC } from "./periodos";

export type PeriodoCobrado = { startDate: string; endDate: string };

/** A criação automática calcula um ciclo mensal completo. Períodos parciais
 * exigem cálculo próprio e não podem receber um aluguel integral por padrão. */
export function resolverCicloInformado(value: unknown) {
  const periodo = lerPeriodoCobrado(value);
  if (!periodo) throw new Error("Informe o início e o fim válidos do período deste aluguel.");
  const inicio = new Date(`${periodo.startDate}T00:00:00Z`);
  const competencia = periodo.startDate.slice(0, 7);
  const fimPeriodo = inicio.getUTCDate() === 1 ? "Último dia do mês" : `Dia ${inicio.getUTCDate() - 1}`;
  const proximoMes = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1));
  const proximoInicio = calcularInicioCompetencia(proximoMes.toISOString().slice(0, 7), fimPeriodo);
  // O cálculo mensal existente não suporta ciclos ancorados em um dia que
  // não existe no mês seguinte. Não trate o recuo ao dia 1 como mês completo.
  if (proximoInicio.getUTCDate() !== inicio.getUTCDate()) {
    throw new Error("Esse ciclo atravessa um mês sem o dia de início informado e exige cálculo proporcional específico.");
  }
  const fim = adicionarDiasUTC(proximoInicio, -1);
  if (fim.toISOString().slice(0, 10) !== periodo.endDate) {
    throw new Error("Para gerar automaticamente, informe um ciclo mensal completo, como 23/09 a 22/10. Períodos parciais exigem cálculo proporcional específico.");
  }
  return { periodo, competencia, fimPeriodo };
}

function dataValida(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function lerPeriodoCobrado(value: unknown): PeriodoCobrado | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const period = value as Record<string, unknown>;
  if (!dataValida(period.startDate) || !dataValida(period.endDate)
    || period.startDate > period.endDate) return null;
  return { startDate: period.startDate, endDate: period.endDate };
}

/** Datas de serviço inclusivas. O vencimento é apenas o prazo de pagamento. */
export function periodoCobradoDentroDaVigencia(input: {
  periodo: unknown;
  inicioContrato: Date | null | undefined;
  fimContrato: Date | null | undefined;
  vencimento: Date;
}) {
  const period = lerPeriodoCobrado(input.periodo);
  if (!period || !input.inicioContrato || !input.fimContrato) return false;
  const inicio = input.inicioContrato.toISOString().slice(0, 10);
  const fim = input.fimContrato.toISOString().slice(0, 10);
  return period.startDate >= inicio && period.endDate <= fim
    && period.endDate <= input.vencimento.toISOString().slice(0, 10);
}
