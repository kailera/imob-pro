export type SicadiControl = {
  inicioPeriodo: string;
  valorAluguel: number;
  indiceReajuste?: string | null;
  descontoPontualidade?: number | null;
  descontoPontualidadeAte?: number | null;
  multaAtraso?: number | null;
  multaAtrasoCarencia?: number | null;
  jurosMensal?: number | null;
  jurosMensalCarencia?: number | null;
  honorarioAdvocaticio?: number | null;
  honorarioAdvocaticioCarencia?: number | null;
  taxaAdministracao?: number | null;
  taxaEncargos?: number | null;
  taxaIntermediacao?: number | null;
  repasseCarencia?: number | null;
  aluguelGarantidoPeriodo?: string | null;
  aluguelGarantidoSomenteAluguel?: boolean | null;
};

export type SicadiAdjustment = {
  quando?: string | null;
  fator?: number | null;
  indice?: string | null;
};

export type SicadiCollectedContract = {
  contratoId: string;
  codigo: string;
  contrato: {
    locatario?: {
      pessoa?: { cpfCnpj?: string | null } | null;
      cpfCnpj?: string | null;
    } | null;
    locadores?: Array<{
      pessoa?: { cpfCnpj?: string | null } | null;
      cpfCnpj?: string | null;
    }> | null;
    imovel?: {
      identificacao?: { codigo?: string | null } | null;
      endereco?: {
        cep?: string | null;
        logradouro?: string | null;
        numero?: string | null;
        complemento?: string | null;
        bairro?: string | null;
        municipio?: string | null;
        uf?: string | null;
      } | null;
    } | null;
    dadosContrato?: {
      diaVencimento?: number | null;
    } | null;
    reajustes?: SicadiAdjustment[] | null;
    periodos?: Array<{
      inicio?: string | null;
      vencimento?: string | null;
      pago?: boolean | null;
    }> | null;
  };
  controles: SicadiControl[];
  periodosAbertos?: string[];
};

export type SicadiCollection = {
  fonte: string;
  parcial: boolean;
  totalInformado: number;
  totalColetado: number;
  contratos: SicadiCollectedContract[];
};

export type SicadiPeriodInput = {
  externalId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  rentAmount: number;
  paymentDueDay: number;
  adjustmentIndex: string | null;
  adjustmentPercentage: number | null;
  previousRentAmount: number | null;
  earlyPaymentDiscount: number | null;
  discountType: "PERCENT";
  discountDaysBefore: number | null;
  lateFeePercentage: number | null;
  lateFeeDays: number | null;
  lateInterestMonthly: number | null;
  lateInterestDays: number | null;
  lawyerFeePercentage: number | null;
  lawyerFeeGraceDays: number | null;
  transferGraceDays: number | null;
  guaranteedPeriod: string | null;
  guaranteeScope: string | null;
  adminFeePercentage: number | null;
  adminFeeFinesPercentage: number | null;
  brokerageFeePercentage: number | null;
  source: "SICADI_IMPORT";
  reviewStatus: "REVIEWED";
  notes: string;
};

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseSicadiDate(value: string): Date {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value).trim());
  if (!match) {
    throw new Error(`Data SICADI inválida: "${value}".`);
  }
  const [, day, month, year] = match;
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new Error(`Data SICADI inexistente: "${value}".`);
  }
  return parsed;
}

export function normalizeSicadiCode(value: string): string {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) return normalized.toLocaleLowerCase("pt-BR");
  return normalized.replace(/^0+(?=\d)/, "");
}

export function normalizeAdjustmentIndex(
  value: string | null | undefined,
): string | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "IGPM" || normalized === "IGP-M") return "IGP-M";
  return normalized;
}

function findAdjustment(
  adjustments: SicadiAdjustment[],
  effectiveFrom: Date,
) {
  return adjustments.find((adjustment) => {
    if (!adjustment.quando) return false;
    try {
      return parseSicadiDate(adjustment.quando).getTime() === effectiveFrom.getTime();
    } catch {
      return false;
    }
  });
}

export function buildSicadiPeriods(
  collected: SicadiCollectedContract,
): SicadiPeriodInput[] {
  const dueDay = Number(collected.contrato?.dadosContrato?.diaVencimento);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new Error(
      `Contrato ${collected.codigo}: dia de vencimento inválido (${dueDay}).`,
    );
  }

  const controls = [...(collected.controles ?? [])]
    .map((control) => ({
      control,
      effectiveFrom: parseSicadiDate(control.inicioPeriodo),
    }))
    .sort(
      (left, right) =>
        left.effectiveFrom.getTime() - right.effectiveFrom.getTime(),
    );

  if (controls.length === 0) {
    throw new Error(`Contrato ${collected.codigo}: nenhum controle locatício.`);
  }

  const adjustments = collected.contrato?.reajustes ?? [];

  return controls.map(({ control, effectiveFrom }, index) => {
    const rentAmount = Number(control.valorAluguel);
    if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
      throw new Error(
        `Contrato ${collected.codigo}: aluguel inválido no período ${control.inicioPeriodo}.`,
      );
    }

    const adjustment = findAdjustment(adjustments, effectiveFrom);
    const factor = optionalNumber(adjustment?.fator);
    const previousRentAmount =
      index > 0 ? Number(controls[index - 1].control.valorAluguel) : null;

    return {
      externalId: `SICADI:${collected.contratoId}:${control.inicioPeriodo}`,
      effectiveFrom,
      effectiveTo: controls[index + 1]?.effectiveFrom ?? null,
      rentAmount,
      paymentDueDay: dueDay,
      adjustmentIndex: normalizeAdjustmentIndex(
        adjustment?.indice ?? control.indiceReajuste,
      ),
      adjustmentPercentage: factor === null ? null : factor * 100,
      previousRentAmount:
        previousRentAmount !== null && Number.isFinite(previousRentAmount)
          ? previousRentAmount
          : null,
      earlyPaymentDiscount: optionalNumber(control.descontoPontualidade),
      discountType: "PERCENT" as const,
      discountDaysBefore: optionalNumber(control.descontoPontualidadeAte),
      lateFeePercentage: optionalNumber(control.multaAtraso),
      lateFeeDays: optionalNumber(control.multaAtrasoCarencia),
      lateInterestMonthly: optionalNumber(control.jurosMensal),
      lateInterestDays: optionalNumber(control.jurosMensalCarencia),
      lawyerFeePercentage: optionalNumber(control.honorarioAdvocaticio),
      lawyerFeeGraceDays: optionalNumber(
        control.honorarioAdvocaticioCarencia,
      ),
      transferGraceDays: optionalNumber(control.repasseCarencia),
      guaranteedPeriod: control.aluguelGarantidoPeriodo || null,
      guaranteeScope:
        control.aluguelGarantidoSomenteAluguel === true
          ? "Somente o aluguel"
          : control.aluguelGarantidoSomenteAluguel === false
            ? "Aluguel e encargos"
            : null,
      adminFeePercentage: optionalNumber(control.taxaAdministracao),
      adminFeeFinesPercentage: optionalNumber(control.taxaEncargos),
      brokerageFeePercentage: optionalNumber(control.taxaIntermediacao),
      source: "SICADI_IMPORT" as const,
      reviewStatus: "REVIEWED" as const,
      notes: `Importado do SICADI; contrato ${collected.codigo}; controle iniciado em ${control.inicioPeriodo}.`,
    };
  });
}

export function validateSicadiCollection(
  value: unknown,
): asserts value is SicadiCollection {
  if (!value || typeof value !== "object") {
    throw new Error("Arquivo de coleta inválido.");
  }
  const collection = value as Partial<SicadiCollection>;
  if (
    collection.fonte !== "SICADI_WEB" ||
    collection.parcial !== false ||
    !Array.isArray(collection.contratos)
  ) {
    throw new Error(
      "Use um arquivo completo do coletor SICADI, não um arquivo parcial.",
    );
  }
}
