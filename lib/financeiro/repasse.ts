import type { Prisma } from "@/generated/prisma";

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
  const adminFeeRaw = aluguelDados.taxaAdministracao;
  let adminFeePercent = typeof adminFeeRaw === "number"
    ? adminFeeRaw
    : Number.parseFloat(String(adminFeeRaw ?? "10").replace(",", ".")) || 10;

  const rentMeta = (rentTx.metadata ?? {}) as Record<string, unknown>;
  if (lease && typeof rentMeta.termsPeriodId === "string") {
    const termsPeriod = lease.termsPeriods.find(period => period.id === rentMeta.termsPeriodId);
    if (termsPeriod?.adminFeePercentage != null) {
      adminFeePercent = Number(termsPeriod.adminFeePercentage);
    }
  }

  const metadataRentValue = Number(rentMeta.rentValue);
  const rentValue = Number.isFinite(metadataRentValue) ? metadataRentValue : rentTx.valor;
  const adminFeeValue = rentValue * (adminFeePercent / 100);

  const metadataCompetence = typeof rentMeta.competence === "string" ? rentMeta.competence : "";
  const competence = /^\d{4}-\d{2}$/.test(metadataCompetence)
    ? metadataCompetence
    : new Date(rentTx.dataVencimento).toISOString().slice(0, 7);
  const [yearText, monthText] = competence.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const manutencoes = await db.transacaoFinanceira.findMany({
    where: {
      imovelId: property.id,
      tipo: "DESPESA",
      categoria: "CUSTO_OPERACIONAL",
      status: "LIQUIDADO",
      dataPagamento: { gte: startDate, lte: endDate },
    },
    select: { id: true, valor: true },
  });

  const maintenanceTotal = manutencoes.reduce((sum, item) => sum + item.valor, 0);
  const netValue = Math.max(0, rentTx.valor - adminFeeValue - maintenanceTotal);
  const ownerName = contrato?.imovelLocacao?.locadors?.[0]?.nome
    ?? lease?.parties[0]?.person.name
    ?? "Proprietário";
  const propertyTitle = property.titulo || `Cód ${property.codigo}`;

  const repasse = await db.transacaoFinanceira.create({
    data: {
      descricao: `Repasse - ${ownerName} (${propertyTitle}) - Competência ${monthText}/${yearText}`,
      valor: netValue,
      tipo: "DESPESA",
      categoria: "REPASSE",
      status: "PENDENTE",
      dataVencimento: new Date(),
      contratoId: contrato?.id,
      leaseId: lease?.id,
      imovelId: property.id,
      transacaoOrigemId: rentTx.id,
      metadata: {
        rentTransactionId: rentTx.id,
        grossRentValue: rentValue,
        grossTotalValue: rentTx.valor,
        adminFeePercent,
        adminFeeValue,
        deductedMaintenanceIds: manutencoes.map(item => item.id),
        deductedMaintenanceValue: maintenanceTotal,
        competence,
      },
    },
    select: { id: true },
  });

  return { created: true, repasseId: repasse.id };
}
