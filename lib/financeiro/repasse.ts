import type { Prisma } from "@/generated/prisma";
import { calculateRepasse } from "@/lib/financeiro/repasse-calculo";

type DbClient = Prisma.TransactionClient;

export async function createPendingRepasseForRent(
  db: DbClient,
  rentTransactionId: string,
): Promise<{ created: boolean; repasseId?: string }> {
  const rentTx = await db.transacaoFinanceira.findUnique({
    where: { id: rentTransactionId },
    include: {
      contrato: {
        include: {
          imovel: true,
          imovelLocacao: { include: { locadors: true } },
        },
      },
      lease: {
        include: {
          property: true,
          termsPeriods: true,
          parties: {
            where: { role: "LANDLORD" },
            include: { person: true },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (!rentTx || rentTx.categoria !== "ALUGUEL" || rentTx.status !== "LIQUIDADO") {
    return { created: false };
  }

  const existing = await db.transacaoFinanceira.findUnique({
    where: { transacaoOrigemId: rentTransactionId },
    select: { id: true },
  });
  if (existing) return { created: false, repasseId: existing.id };

  const legacyRepasses = await db.transacaoFinanceira.findMany({
    where: rentTx.contratoId
      ? { contratoId: rentTx.contratoId, categoria: "REPASSE" }
      : { leaseId: rentTx.leaseId, categoria: "REPASSE" },
    select: { id: true, metadata: true },
  });
  const legacyRepasse = legacyRepasses.find(item => {
    const metadata = (item.metadata ?? {}) as Record<string, unknown>;
    return metadata.rentTransactionId === rentTransactionId;
  });
  if (legacyRepasse) {
    await db.transacaoFinanceira.update({
      where: { id: legacyRepasse.id },
      data: { transacaoOrigemId: rentTransactionId },
    });
    return { created: false, repasseId: legacyRepasse.id };
  }

  const contrato = rentTx.contrato;
  const lease = rentTx.lease;
  const property = contrato?.imovel ?? lease?.property;
  if (!property) return { created: false };

  const aluguelDados = (property.aluguelDados ?? {}) as Record<string, unknown>;
  const adminFeeRaw = contrato?.imovelLocacao?.taxaAdministracao ?? aluguelDados.taxaAdministracao;
  let adminFeePercent = typeof adminFeeRaw === "number"
    ? adminFeeRaw
    : Number.parseFloat(String(adminFeeRaw ?? "10").replace(",", ".")) || 10;

  const rentMeta = (rentTx.metadata ?? {}) as Record<string, unknown>;
  const repasseDraft = rentMeta.repasseDraft && typeof rentMeta.repasseDraft === "object" && !Array.isArray(rentMeta.repasseDraft)
    ? rentMeta.repasseDraft as Record<string, unknown>
    : {};
  if (lease && typeof rentMeta.termsPeriodId === "string") {
    const termsPeriod = lease.termsPeriods.find(period => period.id === rentMeta.termsPeriodId);
    if (termsPeriod?.adminFeePercentage != null) {
      adminFeePercent = Number(termsPeriod.adminFeePercentage);
    }
  }
  const draftAdminFee = Number(repasseDraft.adminFeePercent);
  if (Number.isFinite(draftAdminFee) && draftAdminFee >= 0 && draftAdminFee <= 100) {
    adminFeePercent = draftAdminFee;
  }

  const metadataRentValue = Number(rentMeta.rentValue);
  const rentValue = Number.isFinite(metadataRentValue) ? metadataRentValue : rentTx.valor;
  const metadataCompetence = typeof rentMeta.competence === "string" ? rentMeta.competence : "";
  const competence = /^\d{4}-\d{2}$/.test(metadataCompetence)
    ? metadataCompetence
    : new Date(rentTx.dataVencimento).toISOString().slice(0, 7);
  const [yearText, monthText] = competence.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const draftDeductionIds = repasseDraft.deductedMaintenanceIds;
  const hasSavedSelection = Array.isArray(draftDeductionIds);
  const savedSelection = hasSavedSelection
    ? draftDeductionIds.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const [maintenanceExpenses, scheduledMaintenance] = await Promise.all([
    db.transacaoFinanceira.findMany({
      where: hasSavedSelection
        ? {
            id: { in: savedSelection },
            imovelId: property.id,
            tipo: "DESPESA",
            status: "LIQUIDADO",
          }
        : {
            imovelId: property.id,
            tipo: "DESPESA",
            categoria: { in: ["CUSTO_OPERACIONAL", "OUTRO"] },
            status: "LIQUIDADO",
            dataPagamento: { gte: startDate, lte: endDate },
          },
      select: { id: true, valor: true },
    }),
    db.descontoManutencao.findMany({
      where: hasSavedSelection
        ? {
            id: { in: savedSelection },
            competencia: competence,
            manutencao: { imovelId: property.id, repassarProprietario: true },
          }
        : {
            competencia: competence,
            status: "PROGRAMADO",
            manutencao: { imovelId: property.id, repassarProprietario: true },
          },
      select: { id: true, valor: true },
    }),
  ]);
  const otherDeductions = Array.isArray(repasseDraft.otherDeductions)
    ? repasseDraft.otherDeductions.flatMap((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        const description = typeof record.description === "string" ? record.description.trim() : "";
        const value = Number(record.value);
        if (!description || !Number.isFinite(value) || value < 0) return [];
        return [{ id: typeof record.id === "string" ? record.id : `outro-${index}`, description, value }];
      })
    : [];
  const otherAdditions = Array.isArray(repasseDraft.otherAdditions)
    ? repasseDraft.otherAdditions.flatMap((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        const description = typeof record.description === "string" ? record.description.trim() : "";
        const value = Number(record.value);
        if (!description || !Number.isFinite(value) || value < 0) return [];
        return [{ id: typeof record.id === "string" ? record.id : `acrescimo-${index}`, description, value }];
      })
    : [];
  const selectedDeductionIds = [
    ...maintenanceExpenses.map(item => item.id),
    ...scheduledMaintenance.map(item => item.id),
  ];
  const calculation = calculateRepasse({
    grossValue: rentTx.valor,
    rentValue,
    adminFeePercent,
    deductionValues: [
      ...maintenanceExpenses.map(item => item.valor),
      ...scheduledMaintenance.map(item => Number(item.valor)),
    ],
    otherDeductionValues: otherDeductions.map(item => item.value),
    additionValues: otherAdditions.map(item => item.value),
  });
  const ownerName = contrato?.imovelLocacao?.locadors?.[0]?.nome
    ?? lease?.parties[0]?.person.name
    ?? "Proprietário";
  const propertyTitle = property.titulo || `Cód ${property.codigo}`;

  const repasse = await db.transacaoFinanceira.create({
    data: {
      descricao: `Repasse - ${ownerName} (${propertyTitle}) - Competência ${monthText}/${yearText}`,
      valor: calculation.netValue,
      tipo: "DESPESA",
      categoria: "REPASSE",
      status: "PENDENTE",
      dataVencimento: typeof repasseDraft.transferDueDate === "string"
        ? new Date(repasseDraft.transferDueDate)
        : new Date(),
      contratoId: contrato?.id,
      leaseId: lease?.id,
      imovelId: property.id,
      transacaoOrigemId: rentTx.id,
      metadata: {
        rentTransactionId: rentTx.id,
        grossRentValue: rentValue,
        grossTotalValue: rentTx.valor,
        adminFeePercent,
        adminFeeValue: calculation.adminFeeValue,
        deductedMaintenanceIds: selectedDeductionIds,
        deductedMaintenanceValue: calculation.deductionTotal - otherDeductions.reduce((sum, item) => sum + item.value, 0),
        otherDeductions,
        otherAdditions,
        additionTotal: calculation.additionTotal,
        competence,
      },
    },
    select: { id: true },
  });

  if (scheduledMaintenance.length > 0) {
    await db.descontoManutencao.updateMany({
      where: { id: { in: scheduledMaintenance.map(item => item.id) } },
      data: { status: "APLICADO", repasseId: repasse.id, aplicadoEm: new Date() },
    });
  }

  return { created: true, repasseId: repasse.id };
}
