import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRepasse, resolveRepasseGrossValue } from "@/lib/financeiro/repasse-calculo";
import { resolveRepasseBonus, restoreGrossBeforeBonus } from "@/lib/financeiro/repasse-bonificacao";
import { createPendingRepasseForRent } from "@/lib/financeiro/repasse";
import { buildResidentialRepasseReports } from "@/lib/financeiro/repasse-residencial";
import type {
  RepasseDeduction,
  RepasseItem,
  RepasseNewMaintenance,
  RepasseOtherAddition,
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

function parseOtherAdditions(value: unknown): RepasseOtherAddition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = asRecord(item);
    const description = typeof record.description === "string" ? record.description.trim() : "";
    const amount = asFiniteNumber(record.value, -1);
    if (!description || amount < 0) return [];
    return [{
      id: typeof record.id === "string" ? record.id : `acrescimo-${index}`,
      description,
      value: amount,
    }];
  });
}

function parseNewMaintenances(value: unknown): RepasseNewMaintenance[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item, index) => {
    const record = asRecord(item);
    const description = typeof record.description === "string" ? record.description.trim() : "";
    const maintenanceDate = typeof record.maintenanceDate === "string" ? record.maintenanceDate : "";
    const amount = asFiniteNumber(record.value, -1);
    const status = record.status === "EM_ANDAMENTO" ? "EM_ANDAMENTO" : "FINALIZADA";
    const parsedDate = new Date(`${maintenanceDate}T12:00:00`);
    if (!description || description.length > 3000 || !/^\d{4}-\d{2}-\d{2}$/.test(maintenanceDate) || Number.isNaN(parsedDate.getTime()) || amount <= 0) return [];
    return [{
      id: typeof record.id === "string" ? record.id : `manutencao-${index}`,
      description,
      maintenanceDate,
      value: amount,
      status,
      deductFromOwner: status === "FINALIZADA" && record.deductFromOwner === true,
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
        property: { include: { residencial: { select: { id: true, nome: true } } } },
        terms: true,
        termsPeriods: { orderBy: { effectiveFrom: "desc" } },
        parties: {
          include: { person: true },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    const propertyIds = leases.flatMap((lease) => lease.propertyId ? [lease.propertyId] : []);
    const residentialIds = [...new Set(leases.flatMap((lease) => lease.property?.residencialId ? [lease.property.residencialId] : []))];
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

    const [rentTransactions, repasseTransactions, expenseTransactions, maintenanceDiscounts, residentialMaintenances, company] = await Promise.all([
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
        include: { itensCobranca: { orderBy: { order: "asc" } } },
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
      prisma.residencialManutencao.findMany({
        where: {
          residencialId: { in: residentialIds },
          dataManutencao: { gte: start, lte: end },
        },
        include: { imovel: { select: { id: true, codigo: true } } },
        orderBy: { dataManutencao: "asc" },
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
      const isRentReceived = rentTransaction?.status === "LIQUIDADO";
      const receivedGrossValue = resolveRepasseGrossValue({
        rentValue,
        transactionValue: rentTransaction?.valor,
        receivedValue: rentTransaction?.interValorRecebido == null
          ? null
          : Number(rentTransaction.interValorRecebido),
        isReceived: isRentReceived,
      });
      const bonusDiscount = rentTransaction ? resolveRepasseBonus({
        transactionId: rentTransaction.id,
        rentValue,
        metadata: rentTransaction.metadata,
        chargeItems: rentTransaction.itensCobranca,
      }) : null;
      const grossValue = restoreGrossBeforeBonus({
        grossValue: receivedGrossValue,
        transactionValue: rentTransaction?.valor ?? rentValue,
        bonusValue: bonusDiscount?.value ?? 0,
        isReceived: isRentReceived,
      });

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
        ...(bonusDiscount ? [bonusDiscount] : []),
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
      const hasSavedSelection = Object.prototype.hasOwnProperty.call(editMetadata, "deductedMaintenanceIds");
      const savedSelection = asStringArray(editMetadata.deductedMaintenanceIds);
      const selectedIds = new Set(hasSavedSelection ? savedSelection : availableDeductions.map((item) => item.id));
      const deductions: RepasseDeduction[] = availableDeductions.map((deduction) => ({
        ...deduction,
        selected: selectedIds.has(deduction.id),
      }));
      const otherDeductions = parseOtherDeductions(editMetadata.otherDeductions);
      const otherAdditions = parseOtherAdditions(editMetadata.otherAdditions);
      const calculation = calculateRepasse({
        grossValue,
        rentValue,
        adminFeePercent,
        deductionValues: deductions.filter((item) => item.selected).map((item) => item.value),
        otherDeductionValues: otherDeductions.map((item) => item.value),
        additionValues: otherAdditions.map((item) => item.value),
      });

      let status: RepasseStatus = "AGUARDANDO_RECEBIMENTO";
      if (repasse?.status === "LIQUIDADO") status = "PAGO";
      else if (repasse) status = "PENDENTE";
      else if (rentTransaction?.status === "LIQUIDADO") status = "PRONTO";

      const receivedAt = isRentReceived
        ? rentTransaction?.interDataRecebimento ?? rentTransaction?.dataPagamento ?? null
        : null;
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
      const chargeItems = rentTransaction?.itensCobranca ?? [];
      const chargeTotal = chargeItems
        .filter((item) => !["RENT", "DISCOUNT"].includes(item.type))
        .reduce((total, item) => total + Number(item.amount), 0);
      const operationDate = (receivedAt ?? rentTransaction?.dataVencimento ?? null)?.toISOString() ?? null;
      const operations = [
        {
          id: `rent:${rentTransaction?.id ?? lease.id}`,
          type: "ALUGUEL" as const,
          description: isRentReceived ? "Aluguel recebido" : "Aluguel previsto / não recebido",
          date: operationDate,
          value: rentValue,
          direction: isRentReceived ? "CREDITO" as const : "INFORMATIVO" as const,
          propertyId: lease.property.id,
          propertyCode: lease.property.codigo,
        },
        ...chargeItems
          .filter((item) => !["RENT", "DISCOUNT"].includes(item.type) && Number(item.amount) > 0)
          .map((item) => ({
            id: `charge:${item.id}`,
            type: "CONTA" as const,
            description: item.description,
            date: operationDate,
            value: Number(item.amount),
            direction: isRentReceived ? "CREDITO" as const : "INFORMATIVO" as const,
            propertyId: lease.property!.id,
            propertyCode: lease.property!.codigo,
          })),
        ...(calculation.adminFeeValue > 0 ? [{
          id: `admin:${lease.id}:${competence}`,
          type: "TAXA_ADMINISTRACAO" as const,
          description: `Taxa administrativa de ${calculation.adminFeePercent.toLocaleString("pt-BR")}%`,
          date: operationDate,
          value: calculation.adminFeeValue,
          direction: "DEBITO" as const,
          propertyId: lease.property.id,
          propertyCode: lease.property.codigo,
        }] : []),
        ...deductions.filter((item) => item.selected).map((item) => ({
          id: `deduction:${item.id}`,
          type: item.type === "MANUTENCAO" ? "MANUTENCAO" as const : "DESCONTO" as const,
          description: item.description,
          date: operationDate,
          value: item.value,
          direction: "DEBITO" as const,
          propertyId: lease.property!.id,
          propertyCode: lease.property!.codigo,
        })),
        ...otherDeductions.map((item) => ({
          id: `other-deduction:${item.id}`,
          type: "DESCONTO" as const,
          description: item.description,
          date: operationDate,
          value: item.value,
          direction: "DEBITO" as const,
          propertyId: lease.property!.id,
          propertyCode: lease.property!.codigo,
        })),
        ...otherAdditions.map((item) => ({
          id: `addition:${item.id}`,
          type: "ACRESCIMO" as const,
          description: item.description,
          date: operationDate,
          value: item.value,
          direction: "CREDITO" as const,
          propertyId: lease.property!.id,
          propertyCode: lease.property!.codigo,
        })),
        ...(repasse ? [{
          id: `repasse:${repasse.id}`,
          type: "REPASSE" as const,
          description: repasse.status === "LIQUIDADO" ? "Repasse pago ao proprietário" : "Repasse programado",
          date: (repasse.dataPagamento ?? repasse.dataVencimento).toISOString(),
          value: repasse.valor,
          direction: "INFORMATIVO" as const,
          propertyId: lease.property.id,
          propertyCode: lease.property.codigo,
        }] : []),
      ];

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
        residential: lease.property.residencial
          ? { id: lease.property.residencial.id, name: lease.property.residencial.nome }
          : null,
        rentValue,
        chargeTotal,
        grossValue: calculation.grossValue,
        receivedAt: receivedAt?.toISOString() ?? null,
        adminFeePercent: calculation.adminFeePercent,
        adminFeeValue: calculation.adminFeeValue,
        deductions,
        otherDeductions,
        otherAdditions,
        additionTotal: calculation.additionTotal,
        deductionTotal: calculation.deductionTotal,
        netValue: isRentReceived && repasse ? repasse.valor : calculation.netValue,
        transferDueDate: (repasse?.dataVencimento ?? projectedDueDate)?.toISOString() ?? null,
        paidAt: repasse?.dataPagamento?.toISOString() ?? null,
        status,
        operations,
      }];
    });

    const summary = items.reduce((total, item) => ({
      contracts: total.contracts + 1,
      received: total.received + (item.receivedAt ? 1 : 0),
      grossTotal: total.grossTotal + item.grossValue,
      adminFeeTotal: total.adminFeeTotal + item.adminFeeValue,
      additionTotal: total.additionTotal + item.additionTotal,
      deductionTotal: total.deductionTotal + item.deductionTotal,
      netTotal: total.netTotal + item.netValue,
    }), { contracts: 0, received: 0, grossTotal: 0, adminFeeTotal: 0, additionTotal: 0, deductionTotal: 0, netTotal: 0 });
    const residentialReports = buildResidentialRepasseReports(items, residentialMaintenances.map((maintenance) => ({
      id: maintenance.id,
      residencialId: maintenance.residencialId,
      propertyId: maintenance.imovelId,
      propertyCode: maintenance.imovel?.codigo ?? null,
      description: maintenance.descricao,
      date: maintenance.dataManutencao.toISOString(),
      value: Number(maintenance.valor),
      allocationType: maintenance.tipoRateio,
    })));

    return NextResponse.json({
      success: true,
      data: items,
      summary,
      residentialReports,
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

/**
 * Atualiza a composição mensal do repasse e, opcionalmente, registra novas
 * manutenções vinculadas ao contrato. Toda a gravação ocorre em uma única
 * transação para evitar divergência entre manutenção, desconto e repasse.
 */
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

    const { start, end } = monthRange(competence);
    const lease = await prisma.lease.findFirst({
      where: { id: body.leaseId, tenantId: user.imobId },
      select: {
        id: true,
        propertyId: true,
        property: { select: { valorAluguel: true } },
        terms: { select: { rentValue: true } },
        termsPeriods: {
          where: {
            effectiveFrom: { lte: end },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
          },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: { rentAmount: true },
        },
      },
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
      include: { itensCobranca: { orderBy: { order: "asc" } } },
    });
    if (!rentTransaction) return NextResponse.json({ error: "Cobrança de aluguel não encontrada." }, { status: 404 });

    const selectedIds = Array.from(new Set(body.selectedDeductionIds?.filter((id): id is string => typeof id === "string") ?? []));
    const otherDeductions = parseOtherDeductions(body.otherDeductions).slice(0, 50);
    const otherAdditions = parseOtherAdditions(body.otherAdditions).slice(0, 50);
    const rawNewMaintenances = Array.isArray(body.newMaintenances) ? body.newMaintenances : [];
    const newMaintenances = parseNewMaintenances(rawNewMaintenances);
    if (newMaintenances.length !== rawNewMaintenances.length) {
      return NextResponse.json({ error: "Preencha descrição, data e valor válido em todas as novas manutenções." }, { status: 400 });
    }
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
    const rentMetadata = asRecord(rentTransaction.metadata);
    const contractualRentValue = lease.termsPeriods[0]?.rentAmount
      ?? lease.terms?.rentValue
      ?? lease.property?.valorAluguel
      ?? rentTransaction.valor;
    const rentValue = asFiniteNumber(rentMetadata.rentValue, Number(contractualRentValue));
    const receivedGrossValue = resolveRepasseGrossValue({
      rentValue,
      transactionValue: rentTransaction.valor,
      receivedValue: rentTransaction.interValorRecebido == null
        ? null
        : Number(rentTransaction.interValorRecebido),
      isReceived: rentTransaction.status === "LIQUIDADO",
    });
    const bonusDiscount = resolveRepasseBonus({
      transactionId: rentTransaction.id,
      rentValue,
      metadata: rentTransaction.metadata,
      chargeItems: rentTransaction.itensCobranca,
    });
    const bonusSelected = Boolean(bonusDiscount && selectedIds.includes(bonusDiscount.id));
    const grossValue = restoreGrossBeforeBonus({
      grossValue: receivedGrossValue,
      transactionValue: rentTransaction.valor,
      bonusValue: bonusDiscount?.value ?? 0,
      isReceived: rentTransaction.status === "LIQUIDADO",
    });
    const validSelectedIds = [
      ...expenses.map((item) => item.id),
      ...maintenanceDiscounts.map((item) => item.id),
      ...(bonusSelected && bonusDiscount ? [bonusDiscount.id] : []),
    ];
    const calculation = calculateRepasse({
      grossValue,
      rentValue,
      adminFeePercent,
      deductionValues: [
        ...expenses.map((item) => item.valor),
        ...maintenanceDiscounts.map((item) => Number(item.valor)),
        ...(bonusSelected && bonusDiscount ? [bonusDiscount.value] : []),
        ...newMaintenances.filter((item) => item.deductFromOwner).map((item) => item.value),
      ],
      otherDeductionValues: otherDeductions.map((item) => item.value),
      additionValues: otherAdditions.map((item) => item.value),
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
    const otherAdditionsJson: Prisma.InputJsonArray = otherAdditions.map((item) => ({
      id: item.id,
      description: item.description,
      value: item.value,
    }));

    const legacyContract = newMaintenances.length > 0
      ? await prisma.contratoImovelLocacao.findFirst({
          where: {
            imobId: user.imobId,
            imovelId: propertyId,
            ...(body.legacyContractId ? { id: body.legacyContractId } : {}),
          },
          select: { id: true },
        })
      : null;
    if (newMaintenances.length > 0 && !legacyContract) {
      return NextResponse.json({ error: "Não foi possível vincular a manutenção ao contrato de locação." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (db) => {
      const createdMaintenanceDeductionIds: string[] = [];
      for (const maintenance of newMaintenances) {
        const shouldDeduct = maintenance.status === "FINALIZADA" && maintenance.deductFromOwner;
        const created = await db.manutencao.create({
          data: {
            imobId: user.imobId,
            contratoId: legacyContract!.id,
            imovelId: propertyId,
            descricao: maintenance.description,
            dataManutencao: new Date(`${maintenance.maintenanceDate}T12:00:00`),
            valor: maintenance.value,
            status: maintenance.status,
            repassarProprietario: shouldDeduct,
            descontos: shouldDeduct ? {
              create: [{ competencia: competence, valor: maintenance.value }],
            } : undefined,
          },
          select: { descontos: { select: { id: true } } },
        });
        createdMaintenanceDeductionIds.push(...created.descontos.map((discount) => discount.id));
      }

      const allSelectedIds = [...validSelectedIds, ...createdMaintenanceDeductionIds];
      const draft: Prisma.InputJsonObject = {
        adminFeePercent,
        adminFeeValue: calculation.adminFeeValue,
        deductedMaintenanceIds: allSelectedIds,
        deductedMaintenanceValue: calculation.deductionTotal - otherDeductions.reduce((sum, item) => sum + item.value, 0),
        otherDeductions: otherDeductionsJson,
        otherAdditions: otherAdditionsJson,
        additionTotal: calculation.additionTotal,
        transferDueDate: transferDueDate?.toISOString() ?? null,
        updatedAt: new Date().toISOString(),
      };

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

      if (repasseId && createdMaintenanceDeductionIds.length > 0) {
        await db.descontoManutencao.updateMany({
          where: { id: { in: createdMaintenanceDeductionIds } },
          data: { status: "APLICADO", repasseId, aplicadoEm: new Date() },
        });
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
