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

  // Compatibilidade com repasses criados antes da coluna relacional existir.
  const legacyRepasses = await db.transacaoFinanceira.findMany({
    where: { contratoId: rentTx.contratoId, categoria: "REPASSE" },
    select: { id: true, metadata: true },
  });
  const legacyRepasse = legacyRepasses.find((item) => {
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
  if (!contrato?.imovel) return { created: false };

  const aluguelDados = (contrato.imovel.aluguelDados ?? {}) as Record<string, unknown>;
  const adminFeeRaw = aluguelDados.taxaAdministracao;
  const adminFeePercent = typeof adminFeeRaw === "number"
    ? adminFeeRaw
    : Number.parseFloat(String(adminFeeRaw ?? "10").replace(",", ".")) || 10;

  const rentMeta = (rentTx.metadata ?? {}) as Record<string, unknown>;
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
      imovelId: contrato.imovelId,
      tipo: "DESPESA",
      categoria: "CUSTO_OPERACIONAL",
      status: "LIQUIDADO",
      dataPagamento: { gte: startDate, lte: endDate },
    },
    select: { id: true, valor: true },
  });

  const maintenanceTotal = manutencoes.reduce((sum, item) => sum + item.valor, 0);
  const netValue = Math.max(0, rentTx.valor - adminFeeValue - maintenanceTotal);
  const ownerName = contrato.imovelLocacao?.locadors?.[0]?.nome || "Proprietário";
  const propertyTitle = contrato.imovel.titulo || `Cód ${contrato.imovel.codigo}`;

  const repasse = await db.transacaoFinanceira.create({
    data: {
      descricao: `Repasse - ${ownerName} (${propertyTitle}) - Competência ${monthText}/${yearText}`,
      valor: netValue,
      tipo: "DESPESA",
      categoria: "REPASSE",
      status: "PENDENTE",
      dataVencimento: new Date(),
      contratoId: contrato.id,
      imovelId: contrato.imovelId,
      transacaoOrigemId: rentTx.id,
      metadata: {
        rentTransactionId: rentTx.id,
        grossRentValue: rentValue,
        grossTotalValue: rentTx.valor,
        adminFeePercent,
        adminFeeValue,
        deductedMaintenanceIds: manutencoes.map((item) => item.id),
        deductedMaintenanceValue: maintenanceTotal,
        competence,
      },
    },
    select: { id: true },
  });

  return { created: true, repasseId: repasse.id };
}
