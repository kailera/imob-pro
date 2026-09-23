import { adicionarMesesUTC, inicioMesUTC, normalizarDataUTC, proximoMesUTC } from "./periodos";

export type LeaseAgendaInput = {
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  terms: { nextReadjustmentDate: Date | null; readjustmentPeriodM: number | null } | null;
  termsPeriods: Array<{
    id: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    reviewStatus: string;
  }>;
};

// LeaseTermsPeriod.effectiveTo é exclusivo: já é a data do reajuste.
// Um período importado sem fim não pode fazer o aniversário desaparecer.
export function eventosLeaseNoMes(lease: LeaseAgendaInput, ano: number, mes: number) {
  type Event = {
    tipo: "REAJUSTE_PERIODO" | "VENCIMENTO_CONTRATO";
    data: Date;
    periodoId?: string;
    sucessorId?: string;
    revisar: boolean;
  };
  const eventos: Event[] = [];
  if (lease.status !== "ACTIVE" || !lease.startDate || !lease.endDate) return eventos;
  const inicio = inicioMesUTC(ano, mes);
  const fim = proximoMesUTC(ano, mes);
  const fimContrato = normalizarDataUTC(lease.endDate);
  const noMes = (data: Date) => data >= inicio && data < fim;
  if (noMes(fimContrato)) {
    eventos.push({ tipo: "VENCIMENTO_CONTRATO", data: fimContrato, revisar: false });
  }
  const periodos = [...lease.termsPeriods].sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
  for (const [index, periodo] of periodos.entries()) {
    if (!periodo.effectiveTo) continue;
    const data = normalizarDataUTC(periodo.effectiveTo);
    if (!noMes(data) || data > fimContrato) continue;
    const sucessor = periodos[index + 1];
    eventos.push({
      tipo: "REAJUSTE_PERIODO", data, periodoId: periodo.id,
      sucessorId: sucessor && normalizarDataUTC(sucessor.effectiveFrom).getTime() === data.getTime()
        ? sucessor.id : undefined,
      revisar: periodo.reviewStatus !== "REVIEWED",
    });
  }
  const ultimo = periodos.at(-1);
  if (!ultimo?.effectiveTo) {
    const meses = lease.terms?.readjustmentPeriodM ?? 12;
    const base = ultimo?.effectiveFrom ?? lease.startDate;
    const data = lease.terms?.nextReadjustmentDate
      ? normalizarDataUTC(lease.terms.nextReadjustmentDate)
      : Number.isInteger(meses) && meses > 0 ? adicionarMesesUTC(base, meses) : null;
    if (data && noMes(data) && data <= fimContrato && data > normalizarDataUTC(base)
      && !eventos.some(e => e.tipo === "REAJUSTE_PERIODO" && e.data.getTime() === data.getTime())) {
      eventos.push({ tipo: "REAJUSTE_PERIODO", data, periodoId: ultimo?.id, revisar: true });
    }
  }
  return eventos;
}
