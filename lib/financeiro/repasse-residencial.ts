import type { RepasseItem, RepasseOperation, RepasseResidentialReport } from "./repasse-types";

export type ResidentialMaintenanceForReport = {
  id: string;
  residencialId: string;
  propertyId: string | null;
  propertyCode: string | null;
  description: string;
  date: string;
  value: number;
  allocationType: string;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function buildResidentialRepasseReports(
  items: RepasseItem[],
  maintenances: ResidentialMaintenanceForReport[],
): RepasseResidentialReport[] {
  const reports = new Map<string, RepasseResidentialReport>();

  for (const item of items) {
    if (!item.residential) continue;
    const current = reports.get(item.residential.id) ?? {
      id: item.residential.id,
      name: item.residential.name,
      ownerNames: [],
      propertyCount: 0,
      receivedCount: 0,
      rentTotal: 0,
      chargeTotal: 0,
      grossTotal: 0,
      adminFeeTotal: 0,
      additionTotal: 0,
      deductionTotal: 0,
      maintenanceTotal: 0,
      netRepasseTotal: 0,
      globalResult: 0,
      operations: [],
    };
    current.propertyCount += 1;
    if (item.receivedAt) current.receivedCount += 1;
    current.rentTotal += item.rentValue;
    current.chargeTotal += item.chargeTotal;
    current.grossTotal += item.grossValue;
    current.adminFeeTotal += item.adminFeeValue;
    current.additionTotal += item.additionTotal;
    current.deductionTotal += item.deductionTotal;
    current.netRepasseTotal += item.netValue;
    current.operations.push(...item.operations);
    for (const owner of [item.owner, ...item.additionalOwners]) {
      if (!current.ownerNames.includes(owner.name)) current.ownerNames.push(owner.name);
    }
    reports.set(item.residential.id, current);
  }

  for (const maintenance of maintenances) {
    const report = reports.get(maintenance.residencialId);
    if (!report) continue;
    report.maintenanceTotal += maintenance.value;
    const operation: RepasseOperation = {
      id: `residential-maintenance:${maintenance.id}`,
      type: "MANUTENCAO",
      description: `${maintenance.description} · Rateio ${maintenance.allocationType.toLowerCase().replaceAll("_", " ")}`,
      date: maintenance.date,
      value: maintenance.value,
      direction: "INFORMATIVO",
      propertyId: maintenance.propertyId,
      propertyCode: maintenance.propertyCode,
    };
    report.operations.push(operation);
  }

  for (const report of reports.values()) {
    report.rentTotal = money(report.rentTotal);
    report.chargeTotal = money(report.chargeTotal);
    report.grossTotal = money(report.grossTotal);
    report.adminFeeTotal = money(report.adminFeeTotal);
    report.additionTotal = money(report.additionTotal);
    report.deductionTotal = money(report.deductionTotal);
    report.maintenanceTotal = money(report.maintenanceTotal);
    report.netRepasseTotal = money(report.netRepasseTotal);
    report.globalResult = money(report.netRepasseTotal - report.maintenanceTotal);
    report.ownerNames.sort((a, b) => a.localeCompare(b, "pt-BR"));
    report.operations.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.description.localeCompare(b.description, "pt-BR"));
  }

  return [...reports.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
