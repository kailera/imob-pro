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
  otherValue?: number;
  otherDescription?: string;
};

export type BoletoCompositionInput = BoletoCompositionValues & BoletoBillingConditions & {
  applyToContract: boolean;
  iptuPaymentStartDate?: string | null;
  iptuInstallments?: string | null;
};

export type BoletoChargeItemType =
  | "RENT"
  | "CONDOMINIUM"
  | "IPTU"
  | "WATER"
  | "ENERGY"
  | "GAS"
  | "OTHER"
  | "DISCOUNT";

export type BoletoChargeItem = {
  type: BoletoChargeItemType;
  description: string;
  amount: number;
  order: number;
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
    + (values.otherValue ?? 0)
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
    otherValue: input.otherValue ?? 0,
    otherDescription: input.otherDescription?.trim() || null,
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

export function criarItensCobranca(
  values: BoletoCompositionValues,
  conditions?: Pick<BoletoBillingConditions, "discountValue" | "discountType">,
): BoletoChargeItem[] {
  const positiveItems: Array<[BoletoChargeItemType, string, number]> = [
    ["RENT", "Aluguel", values.rentValue],
    ["CONDOMINIUM", "Condomínio", values.condominiumValue],
    ["IPTU", "IPTU", values.iptuValue],
    ["WATER", "Água", values.waterValue],
    ["ENERGY", "Energia", values.electricityValue],
    ["GAS", "Gás", values.gasValue],
    ["OTHER", values.otherDescription?.trim() || "Outros", values.otherValue ?? 0],
  ];
  const items = positiveItems
    .filter(([, , amount]) => Number.isFinite(amount) && amount > 0)
    .map(([type, description, amount], order) => ({
      type,
      description,
      amount: Number(amount.toFixed(2)),
      order,
    }));

  if (conditions?.discountValue && conditions.discountValue > 0) {
    items.push({
      type: "DISCOUNT",
      description: "Desconto de pontualidade",
      amount: calcularDescontoEfetivo(
        values.rentValue,
        conditions.discountValue,
        conditions.discountType,
      ),
      order: items.length,
    });
  }

  return items;
}

export function criarItensCobrancaDeMetadata(input: {
  metadata: unknown;
  valorNominal: number;
  fallbackDescription?: string;
}): BoletoChargeItem[] {
  const metadata = asMetadataRecord(input.metadata);
  const componentKeys = [
    "rentValue",
    "iptuValue",
    "condominiumValue",
    "waterValue",
    "electricityValue",
    "gasValue",
    "otherValue",
  ];
  const hasComposition = componentKeys.some(key => Number.isFinite(Number(metadata[key])));
  const conditions = lerCondicoesBoletoMetadata(metadata) ?? undefined;

  if (!hasComposition) {
    return [{
      type: "OTHER",
      description: input.fallbackDescription?.trim() || "Cobrança",
      amount: Number(input.valorNominal.toFixed(2)),
      order: 0,
    }];
  }

  return criarItensCobranca({
    rentValue: numeroSeguro(metadata.rentValue),
    iptuValue: numeroSeguro(metadata.iptuValue),
    condominiumValue: numeroSeguro(metadata.condominiumValue),
    waterValue: numeroSeguro(metadata.waterValue),
    electricityValue: numeroSeguro(metadata.electricityValue),
    gasValue: numeroSeguro(metadata.gasValue),
    otherValue: numeroSeguro(metadata.otherValue),
    otherDescription: typeof metadata.otherDescription === "string"
      ? metadata.otherDescription
      : undefined,
  }, conditions);
}
