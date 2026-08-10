import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRepasse } from "@/lib/financeiro/repasse-calculo";
import { createPendingRepasseForRent } from "@/lib/financeiro/repasse";
import type {
  RepasseDeduction,
  RepasseItem,
  RepasseOtherDeduction,
  RepasseOwner,
  RepasseStatus,
  RepasseUpdateInput,
} from "@/lib/financeiro/repasse-types";
import type { Prisma } from "@/generated/prisma";

const COMPETENCE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseOtherDeductions(value: unknown): RepasseOtherDeduction[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = asRecord(item);
    const description = typeof record.description === "string" ? record.description.trim() : "";
    const amount = asFiniteNumber(record.value, -1);
    if (!description || amount < 0) return [];
    return [{
      id: typeof record.id === "string" ? record.id : `outro-${index}`,
      description,
      value: amount,
    }];
  });
}

function monthRange(competence: string) {
  const [year, month] = competence.split("-").map(Number);
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

function formatAddress(property: {
  logradouro: string | null;
  numero: number;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}) {
  const street = [property.logradouro, property.numero, property.complemento].filter(Boolean).join(", ");
  return [street, property.bairro, `${property.cidade}/${property.uf}`].filter(Boolean).join(" — ");
}

async function requireImob() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.users.findUnique({
    where: { id: userId },
    select: { imobId: true, ativo: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireImob();
    if (!user?.ativo) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const competence = request.nextUrl.searchParams.get("competencia")
      ?? new Date().toISOString().slice(0, 7);
    if (!COMPETENCE_PATTERN.test(competence)) {
      return NextResponse.json({ error: "Competência inválida. Use YYYY-MM." }, { status: 400 });
    }

    const { start, end } = monthRange(competence);
    const leases = await prisma.lease.findMany({
      where: { tenantId: user.imobId, status: "ACTIVE" },
      orderBy: { code: "asc" },
      include: {
        property: true,
        terms: true,
        termsPeriods: { orderBy: { effectiveFrom: "desc" } },
        parties: {
          include: { person: true },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    const propertyIds = leases.flatMap((lease) => lease.propertyId ? [lease.propertyId] : []);
    const leaseIds = leases.map((lease) => lease.id);
    const legacyContracts = await prisma.contratoImovelLocacao.findMany({
      where: { imobId: user.imobId, imovelId: { in: propertyIds } },
      include: {
        locatarios: { select: { nome: true } },
        imovelLocacao: {
          include: {
            locadors: true,
            person: true,
            periodos: { orderBy: { dataInicio: "desc" } },
          },
        },
      },
    });
    const legacyIds = legacyContracts.map((contract) => contract.id);

    const [rentTransactions, repasseTransactions, expenseTransactions, maintenanceDiscounts, company] = await Promise.all([
      prisma.transacaoFinanceira.findMany({
        where: {
          categoria: "ALUGUEL",
          OR: [
            { leaseId: { in: leaseIds } },
            { contratoId: { in: legacyIds } },
          ],
          AND: [{
            OR: [
              { dataVencimento: { gte: start, lte: end } },
              { metadata: { path: ["competence"], equals: competence } },
            ],
          }],
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.transacaoFinanceira.findMany({
        where: {
          categoria: "REPASSE",
          OR: [
            { leaseId: { in: leaseIds } },
            { contratoId: { in: legacyIds } },
          ],
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.transacaoFinanceira.findMany({
        where: {
          imovelId: { in: propertyIds },
          tipo: "DESPESA",
          categoria: { in: ["CUSTO_OPERACIONAL", "OUTRO"] },
          status: "LIQUIDADO",
          dataPagamento: { gte: start, lte: end },
        },
        orderBy: { dataPagamento: "desc" },
      }),
      prisma.descontoManutencao.findMany({
        where: {
          competencia: competence,
          status: { in: ["PROGRAMADO", "APLICADO"] },
          manutencao: { imobId: user.imobId, imovelId: { in: propertyIds }, repassarProprietario: true },
        },
        include: { manutencao: { select: { imovelId: true, descricao: true } } },
      }),
      prisma.imob.findUnique({ where: { id: user.imobId } }),
    ]);

    const legacyByProperty = new Map<string, typeof legacyContracts[number]>();
    for (const contract of legacyContracts) {
      const current = legacyByProperty.get(contract.imovelId);
      const isInCompetence = contract.imovelLocacao
        ? contract.imovelLocacao.dataInicio <= end && contract.imovelLocacao.dataFim >= start
        : false;
      if (!current || isInCompetence) legacyByProperty.set(contract.imovelId, contract);
    }

    const items: RepasseItem[] = leases.flatMap((lease) => {
      if (!lease.property) return [];
      const legacy = legacyByProperty.get(lease.property.id);
      const matchingRentTransactions = rentTransactions.filter((transaction) =>
        transaction.leaseId === lease.id || Boolean(legacy && transaction.contratoId === legacy.id),
      );
      const rentTransaction = matchingRentTransactions.find((transaction) => transaction.status === "LIQUIDADO")
        ?? matchingRentTransactions.find((transaction) => transaction.status === "PENDENTE")
        ?? matchingRentTransactions[0]
        ?? null;
      const rentMetadata = asRecord(rentTransaction?.metadata);
      const repasse = repasseTransactions.find((transaction) => {
        if (rentTransaction && transaction.transacaoOrigemId === rentTransaction.id) return true;
        const metadata = asRecord(transaction.metadata);
        return metadata.competence === competence
          && (transaction.leaseId === lease.id || Boolean(legacy && transaction.contratoId === legacy.id));
      }) ?? null;

      const activeTermsPeriod = lease.termsPeriods.find((period) =>
        period.effectiveFrom <= end && (!period.effectiveTo || period.effectiveTo >= start),
      );
      const legacyPeriod = legacy?.imovelLocacao?.periodos.find((period) =>
        period.dataInicio <= end && period.dataFim >= start,
      );
      const rentValue = asFiniteNumber(
        rentMetadata.rentValue,
        activeTermsPeriod
          ? Number(activeTermsPeriod.rentAmount)
          : lease.terms
            ? Number(lease.terms.rentValue)
            : legacyPeriod?.valorAluguel
              ?? legacy?.imovelLocacao?.valorAluguel
              ?? lease.property.valorAluguel
              ?? 0,
      );
      const grossValue = rentTransaction
        ? asFiniteNumber(rentTransaction.interValorRecebido, rentTransaction.valor)
        : rentValue;

      const landlordParties = lease.parties.filter((party) => party.role === "LANDLORD");
      let owners: RepasseOwner[] = landlordParties.map((party) => ({
        id: party.person.id,
        name: party.person.name,
        cpfCnpj: party.person.cpfCnpj,
        participation: party.participation == null ? null : Number(party.participation),
        bankName: party.person.bankName,
        bankAgency: party.person.bankAgency,
        bankAccount: party.person.bankAccount,
        pixKey: party.person.pixKey,
      }));
      if (owners.length === 0 && legacy?.imovelLocacao?.person) {
        const person = legacy.imovelLocacao.person;
        owners = [{
          id: person.id,
          name: person.name,
          cpfCnpj: person.cpfCnpj,
          participation: null,
          bankName: person.bankName,
          bankAgency: person.bankAgency,
          bankAccount: person.bankAccount,
          pixKey: person.pixKey,
        }];
      }
      if (owners.length === 0) {
        owners = (legacy?.imovelLocacao?.locadors ?? []).map((owner) => ({
          id: owner.id,
          name: owner.nome,
          cpfCnpj: owner.cpfCnpj,
          participation: null,
          bankName: null,
          bankAgency: null,
          bankAccount: null,
          pixKey: null,
        }));
      }
      if (owners.length === 0) {
        owners = [{ id: "sem-proprietario", name: "Proprietário não informado", cpfCnpj: "", participation: null, bankName: null, bankAgency: null, bankAccount: null, pixKey: null }];
      }

      const repasseMetadata = asRecord(repasse?.metadata);
      const draftMetadata = asRecord(rentMetadata.repasseDraft);
      const editMetadata = repasse ? repasseMetadata : draftMetadata;
      const defaultAdminFee = activeTermsPeriod?.adminFeePercentage != null
        ? Number(activeTermsPeriod.adminFeePercentage)
        : lease.terms?.adminFeePercentage != null
          ? Number(lease.terms.adminFeePercentage)
          : legacy?.imovelLocacao?.taxaAdministracao
            ?? asFiniteNumber(asRecord(lease.property.aluguelDados).taxaAdministracao, 10);
      const adminFeePercent = asFiniteNumber(editMetadata.adminFeePercent, defaultAdminFee);

      const availableDeductions: Omit<RepasseDeduction, "selected">[] = [
        ...maintenanceDiscounts
          .filter((discount) => discount.manutencao.imovelId === lease.property?.id)
          .map((discount) => ({
            id: discount.id,
            type: "MANUTENCAO" as const,
            description: discount.manutencao.descricao,
            value: Number(discount.valor),
          })),
        ...expenseTransactions
          .filter((expense) => expense.imovelId === lease.property?.id)
          .map((expense) => ({
            id: expense.id,
            type: "DESPESA" as const,
            description: expense.descricao,
            value: expense.valor,
          })),
      ];
      const savedSelection = asStringArray(editMetadata.deductedMaintenanceIds);
      const selectedIds = new Set(savedSelection.length > 0 ? savedSelection : availableDeductions.map((item) => item.id));
      const deductions: RepasseDeduction[] = availableDeductions.map((deduction) => ({
        ...deduction,
        selected: selectedIds.has(deduction.id),
      }));
      const otherDeductions = parseOtherDeductions(editMetadata.otherDeductions);
      const calculation = calculateRepasse({
        grossValue,
        rentValue,
        adminFeePercent,
        deductionValues: deductions.filter((item) => item.selected).map((item) => item.value),
        otherDeductionValues: otherDeductions.map((item) => item.value),
      });

      let status: RepasseStatus = "AGUARDANDO_RECEBIMENTO";
      if (repasse?.status === "LIQUIDADO") status = "PAGO";
      else if (repasse) status = "PENDENTE";
      else if (rentTransaction?.status === "LIQUIDADO") status = "PRONTO";

      const receivedAt = rentTransaction?.interDataRecebimento ?? rentTransaction?.dataPagamento ?? null;
      const graceDays = activeTermsPeriod?.transferGraceDays
        ?? lease.terms?.transferGraceDays
        ?? legacy?.imovelLocacao?.carenciaRepasse
        ?? 10;
      const projectedDueDate = receivedAt
        ? new Date(new Date(receivedAt).getTime() + graceDays * 86_400_000)
        : null;
      const tenantNames = lease.parties
        .filter((party) => party.role === "TENANT" || party.role === "CO_TENANT")
        .map((party) => party.person.name);

      return [{
        key: `${lease.id}:${competence}`,
        leaseId: lease.id,
        legacyContractId: legacy?.id ?? null,
        rentTransactionId: rentTransaction?.id ?? null,
        repasseId: repasse?.id ?? null,
        competence,
        contractCode: lease.code,
        owner: owners[0],
        additionalOwners: owners.slice(1),
        tenantNames: tenantNames.length > 0 ? tenantNames : (legacy?.locatarios.map((tenant) => tenant.nome) ?? []),
        propertyId: lease.property.id,
        propertyCode: lease.property.codigo,
        propertyTitle: lease.property.titulo || `Imóvel ${lease.property.codigo}`,
        propertyAddress: formatAddress(lease.property),
        rentValue,
        grossValue: calculation.grossValue,
        receivedAt: receivedAt?.toISOString() ?? null,
        adminFeePercent: calculation.adminFeePercent,
        adminFeeValue: calculation.adminFeeValue,
        deductions,
        otherDeductions,
        deductionTotal: calculation.deductionTotal,
        netValue: repasse ? repasse.valor : calculation.netValue,
        transferDueDate: (repasse?.dataVencimento ?? projectedDueDate)?.toISOString() ?? null,
        paidAt: repasse?.dataPagamento?.toISOString() ?? null,
        status,
      }];
    });

    const summary = items.reduce((total, item) => ({
      contracts: total.contracts + 1,
      received: total.received + (item.receivedAt ? 1 : 0),
      grossTotal: total.grossTotal + item.grossValue,
      adminFeeTotal: total.adminFeeTotal + item.adminFeeValue,
      deductionTotal: total.deductionTotal + item.deductionTotal,
      netTotal: total.netTotal + item.netValue,
    }), { contracts: 0, received: 0, grossTotal: 0, adminFeeTotal: 0, deductionTotal: 0, netTotal: 0 });

    return NextResponse.json({
      success: true,
      data: items,
      summary,
      company: {
        name: company?.nomeFantasia || company?.razaoSocial || "Imobiliária",
        legalName: company?.razaoSocial ?? null,
        cnpj: company?.cnpj ?? null,
        creci: company?.creci ?? null,
        phone: company?.telefone ?? null,
        email: company?.emailContato ?? null,
        logoUrl: company?.logoUrl ?? null,
        address: [
          [company?.logradouro, company?.numero, company?.complemento].filter(Boolean).join(", "),
          company?.bairro,
          company?.cidade && company?.uf ? `${company.cidade}/${company.uf}` : company?.cidade,
          company?.cep,
        ].filter(Boolean).join(" — "),
      },
    });
  } catch (error) {
    console.error("[repasses-get] Erro:", error);
    return NextResponse.json({ error: "Erro ao montar a relação de repasses." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireImob();
    if (!user?.ativo) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const body = await request.json() as Partial<RepasseUpdateInput>;
    if (!body.leaseId || !body.rentTransactionId || !body.competence || !COMPETENCE_PATTERN.test(body.competence)) {
      return NextResponse.json({ error: "Contrato, cobrança e competência são obrigatórios." }, { status: 400 });
    }
    const competence = body.competence;
    const adminFeePercent = asFiniteNumber(body.adminFeePercent, -1);
    if (adminFeePercent < 0 || adminFeePercent > 100) {
      return NextResponse.json({ error: "A taxa de administração deve estar entre 0% e 100%." }, { status: 400 });
    }

    const lease = await prisma.lease.findFirst({
      where: { id: body.leaseId, tenantId: user.imobId },
      select: { id: true, propertyId: true },
    });
    if (!lease?.propertyId) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
    const propertyId = lease.propertyId;

    const rentTransaction = await prisma.transacaoFinanceira.findFirst({
      where: {
        id: body.rentTransactionId,
        categoria: "ALUGUEL",
        OR: [
          { leaseId: lease.id },
          { contrato: { is: { imobId: user.imobId, imovelId: propertyId } } },
        ],
      },
    });
    if (!rentTransaction) return NextResponse.json({ error: "Cobrança de aluguel não encontrada." }, { status: 404 });

    const selectedIds = Array.from(new Set(body.selectedDeductionIds?.filter((id): id is string => typeof id === "string") ?? []));
    const otherDeductions = parseOtherDeductions(body.otherDeductions).slice(0, 50);
    const [expenses, maintenanceDiscounts] = await Promise.all([
      prisma.transacaoFinanceira.findMany({
        where: { id: { in: selectedIds }, imovelId: propertyId, tipo: "DESPESA", status: "LIQUIDADO" },
        select: { id: true, valor: true },
      }),
      prisma.descontoManutencao.findMany({
        where: {
          id: { in: selectedIds },
          competencia: competence,
          manutencao: { imobId: user.imobId, imovelId: propertyId, repassarProprietario: true },
        },
        select: { id: true, valor: true },
      }),
    ]);
    const validSelectedIds = [...expenses.map((item) => item.id), ...maintenanceDiscounts.map((item) => item.id)];
    const rentMetadata = asRecord(rentTransaction.metadata);
    const rentValue = asFiniteNumber(rentMetadata.rentValue, rentTransaction.valor);
    const grossValue = asFiniteNumber(rentTransaction.interValorRecebido, rentTransaction.valor);
    const calculation = calculateRepasse({
      grossValue,
      rentValue,
      adminFeePercent,
      deductionValues: [...expenses.map((item) => item.valor), ...maintenanceDiscounts.map((item) => Number(item.valor))],
      otherDeductionValues: otherDeductions.map((item) => item.value),
    });
    const transferDueDate = body.transferDueDate ? new Date(body.transferDueDate) : null;
    if (transferDueDate && Number.isNaN(transferDueDate.getTime())) {
      return NextResponse.json({ error: "Data prevista para repasse inválida." }, { status: 400 });
    }

    const otherDeductionsJson: Prisma.InputJsonArray = otherDeductions.map((item) => ({
      id: item.id,
      description: item.description,
      value: item.value,
    }));
    const draft: Prisma.InputJsonObject = {
      adminFeePercent,
      adminFeeValue: calculation.adminFeeValue,
      deductedMaintenanceIds: validSelectedIds,
      deductedMaintenanceValue: calculation.deductionTotal - otherDeductions.reduce((sum, item) => sum + item.value, 0),
      otherDeductions: otherDeductionsJson,
      transferDueDate: transferDueDate?.toISOString() ?? null,
      updatedAt: new Date().toISOString(),
    };

    const result = await prisma.$transaction(async (db) => {
      await db.transacaoFinanceira.update({
        where: { id: rentTransaction.id },
        data: { metadata: { ...rentMetadata, repasseDraft: draft } as Prisma.InputJsonObject },
      });

      let repasseId = body.repasseId ?? null;
      if (body.repasseId) {
        const existing = await db.transacaoFinanceira.findFirst({
          where: {
            id: body.repasseId,
            categoria: "REPASSE",
            OR: [
              { leaseId: lease.id },
              { contrato: { is: { imobId: user.imobId, imovelId: propertyId } } },
            ],
          },
        });
        if (!existing) throw new Error("Repasse não encontrado para este contrato.");
        const currentMetadata = asRecord(existing.metadata);
        await db.transacaoFinanceira.update({
          where: { id: existing.id },
          data: {
            valor: calculation.netValue,
            dataVencimento: transferDueDate ?? existing.dataVencimento,
            metadata: { ...currentMetadata, ...draft, competence } as Prisma.InputJsonObject,
          },
        });
      } else if (rentTransaction.status === "LIQUIDADO") {
        const created = await createPendingRepasseForRent(db, rentTransaction.id);
        repasseId = created.repasseId ?? null;
      }

      return repasseId;
    });

    return NextResponse.json({ success: true, repasseId: result, calculation });
  } catch (error) {
    console.error("[repasses-patch] Erro:", error);
    const message = error instanceof Error && error.message.includes("Repasse não encontrado")
      ? error.message
      : "Erro ao salvar os ajustes do repasse.";
    return NextResponse.json({ error: message }, { status: message.includes("não encontrado") ? 404 : 500 });
  }
}
