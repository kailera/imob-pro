export type BoletoBillingConditions = {
  discountValue: number;
  discountType: string;
  discountDaysBefore: number;
  lateFeePercentage: number;
  lateInterestMonthly: number;
};

export type BoletoCompositionValues = {
  rentValue: number;
  iptuValue: number;
  condominiumValue: number;
  waterValue: number;
  electricityValue: number;
  gasValue: number;
};

export type BoletoCompositionInput = BoletoCompositionValues & BoletoBillingConditions & {
  applyToContract: boolean;
  iptuPaymentStartDate?: string | null;
  iptuInstallments?: string | null;
};

export function asMetadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
}

export function numeroSeguro(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calcularTotalNominal(values: BoletoCompositionValues) {
  return Number((
    values.rentValue
    + values.iptuValue
    + values.condominiumValue
    + values.waterValue
    + values.electricityValue
    + values.gasValue
  ).toFixed(2));
}

export function calcularDescontoEfetivo(
  rentValue: number,
  discountValue: number,
  discountType: string,
) {
  if (discountValue <= 0) return 0;
  const normalizedType = discountType.toUpperCase();
  const desconto = ["PERCENT", "PERCENTAGE", "PERCENTUAL"].includes(normalizedType)
    ? rentValue * (discountValue / 100)
    : discountValue;
  return Number(desconto.toFixed(2));
}

export function lerCondicoesBoletoMetadata(
  metadata: unknown,
): BoletoBillingConditions | null {
  const root = asMetadataRecord(metadata);
  const raw = asMetadataRecord(root.billingConditions);
  if (!Object.keys(raw).length) return null;

  return {
    discountValue: numeroSeguro(raw.discountValue),
    discountType: typeof raw.discountType === "string" ? raw.discountType : "FIXED",
    discountDaysBefore: Math.max(0, Math.trunc(numeroSeguro(raw.discountDaysBefore))),
    lateFeePercentage: numeroSeguro(raw.lateFeePercentage),
    lateInterestMonthly: numeroSeguro(raw.lateInterestMonthly),
  };
}

export function atualizarMetadataComposicao(
  metadata: unknown,
  input: BoletoCompositionInput,
) {
  return {
    ...asMetadataRecord(metadata),
    rentValue: input.rentValue,
    iptuValue: input.iptuValue,
    condominiumValue: input.condominiumValue,
    waterValue: input.waterValue,
    electricityValue: input.electricityValue,
    gasValue: input.gasValue,
    billingConditions: {
      discountValue: input.discountValue,
      discountType: input.discountType,
      discountDaysBefore: input.discountDaysBefore,
      lateFeePercentage: input.lateFeePercentage,
      lateInterestMonthly: input.lateInterestMonthly,
    },
    compositionEditedAt: new Date().toISOString(),
  };
}
