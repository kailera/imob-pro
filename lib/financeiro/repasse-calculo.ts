export interface RepasseCalculationInput {
  grossValue: number;
  rentValue: number;
  adminFeePercent: number;
  deductionValues: number[];
  otherDeductionValues: number[];
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

interface RepasseGrossValueInput {
  rentValue: number;
  transactionValue: number | null | undefined;
  receivedValue: number | null | undefined;
  isReceived: boolean;
}

/**
 * Mantém a previsão de repasse independente da liquidação do boleto.
 * Antes do recebimento, o bruto é o aluguel contratual; depois, passa a ser
 * o valor efetivamente recebido (com fallback para o valor da cobrança).
 */
export function resolveRepasseGrossValue(input: RepasseGrossValueInput) {
  const rentValue = Math.max(0, Number(input.rentValue) || 0);
  if (!input.isReceived) return rentValue;

  const receivedValue = Number(input.receivedValue);
  if (Number.isFinite(receivedValue) && receivedValue > 0) return receivedValue;

  const transactionValue = Number(input.transactionValue);
  if (Number.isFinite(transactionValue) && transactionValue > 0) return transactionValue;

  return rentValue;
}

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
