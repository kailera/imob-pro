import { calcularDescontoEfetivo } from "./boleto-composicao";

interface ChargeItem {
  type: string;
  description: string;
  amount: unknown;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function resolveRepasseBonus(input: {
  transactionId: string;
  rentValue: number;
  metadata: unknown;
  chargeItems: ChargeItem[];
}) {
  const persisted = input.chargeItems.find((item) => item.type === "DISCOUNT");
  const persistedValue = Number(persisted?.amount);
  if (Number.isFinite(persistedValue) && persistedValue > 0) {
    return {
      id: `bonificacao:${input.transactionId}`,
      type: "BONIFICACAO" as const,
      description: persisted?.description.trim() || "Bonificação por pontualidade",
      value: Number(persistedValue.toFixed(2)),
    };
  }

  const conditions = record(record(input.metadata).billingConditions);
  const discountValue = Number(conditions.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return null;
  const discountType = typeof conditions.discountType === "string"
    ? conditions.discountType
    : "FIXED";
  const value = calcularDescontoEfetivo(input.rentValue, discountValue, discountType);
  if (value <= 0) return null;

  return {
    id: `bonificacao:${input.transactionId}`,
    type: "BONIFICACAO" as const,
    description: "Bonificação por pontualidade",
    value,
  };
}

/**
 * Quando o banco informa o valor já bonificado, recompõe o bruto nominal para
 * que a bonificação apareça uma única vez na coluna de descontos.
 */
export function restoreGrossBeforeBonus(input: {
  grossValue: number;
  transactionValue: number;
  bonusValue: number;
  isReceived: boolean;
}) {
  if (!input.isReceived || input.bonusValue <= 0) return input.grossValue;
  const nominalDifference = input.transactionValue - input.grossValue;
  return Math.abs(nominalDifference - input.bonusValue) <= 0.02
    ? Number((input.grossValue + input.bonusValue).toFixed(2))
    : input.grossValue;
}
