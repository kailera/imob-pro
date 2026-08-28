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
  lateFeeAmount?: number;
  lateInterestAmount?: number;
  residentialExpenses?: Array<{ id?: string; description: string; amount: number; category?: string }>;
};

export type OverdueReissueInput = {
  originalDueDate: string;
  calculationDate: string;
  daysLate: number;
  baseAmount: number;
  lateFeePercentage: number;
  lateInterestMonthly: number;
};

export type BoletoCompositionInput = BoletoCompositionValues & BoletoBillingConditions & {
  dueDate: string;
  applyToContract: boolean;
  iptuPaymentStartDate?: string | null;
  iptuInstallments?: string | null;
  overdueReissue?: OverdueReissueInput | null;
};

export type BoletoChargeItemType =
  | "RENT"
  | "CONDOMINIUM"
  | "IPTU"
  | "WATER"
  | "ENERGY"
  | "GAS"
  | "OTHER"
  | "LATE_FEE"
  | "LATE_INTEREST"
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
    + (values.lateFeeAmount ?? 0)
    + (values.lateInterestAmount ?? 0)
    + (values.residentialExpenses ?? []).reduce((total, item) => total + item.amount, 0)
  ).toFixed(2));
}

export function calcularEncargosReemissaoVencida(input: {
  baseAmount: number;
  originalDueDate: string;
  calculationDate: string;
  lateFeePercentage: number;
  lateInterestMonthly: number;
}) {
  const originalDueDate = new Date(`${input.originalDueDate}T00:00:00.000Z`);
  const calculationDate = new Date(`${input.calculationDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(input.baseAmount)
    || input.baseAmount <= 0
    || Number.isNaN(originalDueDate.getTime())
    || Number.isNaN(calculationDate.getTime())
  ) {
    throw new Error("Não foi possível calcular os encargos da cobrança vencida.");
  }

  const daysLate = Math.max(0, Math.floor(
    (calculationDate.getTime() - originalDueDate.getTime()) / 86_400_000,
  ));
  const lateFeeAmount = daysLate > 0
    ? Number((input.baseAmount * Math.max(0, input.lateFeePercentage) / 100).toFixed(2))
    : 0;
  const lateInterestAmount = daysLate > 0
    ? Number((
        input.baseAmount
        * Math.max(0, input.lateInterestMonthly)
        / 100
        * daysLate
        / 30
      ).toFixed(2))
    : 0;

  return {
    daysLate,
    lateFeeAmount,
    lateInterestAmount,
    updatedTotal: Number((input.baseAmount + lateFeeAmount + lateInterestAmount).toFixed(2)),
  };
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
    lateFeeAmount: input.lateFeeAmount ?? 0,
    lateInterestAmount: input.lateInterestAmount ?? 0,
    residentialExpenses: input.residentialExpenses ?? [],
    billingConditions: {
      discountValue: input.discountValue,
      discountType: input.discountType,
      discountDaysBefore: input.discountDaysBefore,
      lateFeePercentage: input.lateFeePercentage,
      lateInterestMonthly: input.lateInterestMonthly,
    },
    overdueReissue: input.overdueReissue ?? null,
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
    ["LATE_FEE", "Multa por atraso acumulada", values.lateFeeAmount ?? 0],
    ["LATE_INTEREST", "Juros de mora acumulados", values.lateInterestAmount ?? 0],
  ];
  const items = positiveItems
    .filter(([, , amount]) => Number.isFinite(amount) && amount > 0)
    .map(([type, description, amount], order) => ({
      type,
      description,
      amount: Number(amount.toFixed(2)),
      order,
    }));

  for (const expense of values.residentialExpenses ?? []) {
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) continue;
    items.push({
      type: expense.category === "GAS" ? "GAS" : "OTHER",
      description: expense.description.trim() || "Despesa do residencial",
      amount: Number(expense.amount.toFixed(2)),
      order: items.length,
    });
  }

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
    "lateFeeAmount",
    "lateInterestAmount",
    "residentialExpenses",
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
    lateFeeAmount: numeroSeguro(metadata.lateFeeAmount),
    lateInterestAmount: numeroSeguro(metadata.lateInterestAmount),
    residentialExpenses: Array.isArray(metadata.residentialExpenses)
      ? metadata.residentialExpenses.flatMap(item => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const record = item as Record<string, unknown>;
          const amount = numeroSeguro(record.amount);
          if (amount <= 0) return [];
          return [{
            id: typeof record.id === "string" ? record.id : undefined,
            description: typeof record.description === "string" ? record.description : "Despesa do residencial",
            category: typeof record.category === "string" ? record.category : undefined,
            amount,
          }];
        })
      : [],
  }, conditions);
}
