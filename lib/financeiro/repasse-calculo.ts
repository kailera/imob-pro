export interface RepasseCalculationInput {
  grossValue: number;
  rentValue: number;
  adminFeePercent: number;
  deductionValues: number[];
  otherDeductionValues: number[];
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateRepasse(input: RepasseCalculationInput) {
  const grossValue = Math.max(0, Number(input.grossValue) || 0);
  const rentValue = Math.max(0, Number(input.rentValue) || 0);
  const adminFeePercent = Math.min(100, Math.max(0, Number(input.adminFeePercent) || 0));
  const adminFeeValue = money(rentValue * adminFeePercent / 100);
  const maintenanceAndExpenses = money(
    input.deductionValues.reduce((total, value) => total + Math.max(0, Number(value) || 0), 0),
  );
  const otherDeductions = money(
    input.otherDeductionValues.reduce((total, value) => total + Math.max(0, Number(value) || 0), 0),
  );
  const deductionTotal = money(maintenanceAndExpenses + otherDeductions);
  const netValue = money(Math.max(0, grossValue - adminFeeValue - deductionTotal));

  return { grossValue, adminFeePercent, adminFeeValue, deductionTotal, netValue };
}
