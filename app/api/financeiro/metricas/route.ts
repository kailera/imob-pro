import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { requireUserContext } from "@/lib/auth";
import {
  contractOverlapsFinancePeriod,
  getFinanceMetricMonthRange,
  normalizedContractDocument,
} from "@/lib/financeiro/period-metrics";
import { prisma } from "@/lib/prisma";

function canonicalMatchesLegacy(
  legacy: { id: string; imovelId: string; locatarios: Array<{ cpfCnpj: string }> },
  lease: {
    legacyCode: string | null;
    propertyId: string | null;
    parties: Array<{ person: { cpfCnpj: string } }>;
  },
) {
  if (lease.legacyCode === legacy.id) return true;
  if (lease.propertyId !== legacy.imovelId) return false;
  const legacyDocuments = new Set(
    legacy.locatarios
      .map((tenant) => normalizedContractDocument(tenant.cpfCnpj))
      .filter(Boolean),
  );
  return lease.parties.some((party) =>
    legacyDocuments.has(normalizedContractDocument(party.person.cpfCnpj)),
  );
}

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month") ?? "";
    const range = getFinanceMetricMonthRange(month);
    if (!range) {
      return NextResponse.json(
        { error: "Período inválido. Use o formato AAAA-MM." },
        { status: 400 },
      );
    }

    const context = await requireUserContext();
    const tenantScope: Prisma.TransacaoFinanceiraWhereInput = {
      OR: [
        { contrato: { is: { imobId: context.tenantId } } },
        { lease: { is: { tenantId: context.tenantId } } },
      ],
    };
    const boletoEmitido: Prisma.TransacaoFinanceiraWhereInput = {
      OR: [
        { interCodigoSolicitacao: { not: null } },
        { interNossoNumero: { not: null } },
        { interSeuNumero: { not: null } },
      ],
    };

    const [leases, legacyContracts, contractCharges, generatedBills, settledBills] =
      await Promise.all([
        prisma.lease.findMany({
          where: {
            tenantId: context.tenantId,
            status: { in: ["ACTIVE", "SUSPENDED"] },
          },
          select: {
            id: true,
            status: true,
            legacyCode: true,
            propertyId: true,
            startDate: true,
            endDate: true,
            parties: {
              where: { role: "TENANT" },
              select: { person: { select: { cpfCnpj: true } } },
            },
          },
        }),
        prisma.contratoImovelLocacao.findMany({
          where: {
            imobId: context.tenantId,
            imovelLocacao: {
              is: {
                dataInicio: { lt: range.endExclusive },
                dataFim: { gte: range.start },
              },
            },
          },
          select: {
            id: true,
            imovelId: true,
            locatarios: { select: { cpfCnpj: true } },
          },
        }),
        prisma.transacaoFinanceira.count({
          where: {
            AND: [
              tenantScope,
              { tipo: "RECEITA" },
              { status: { not: "CANCELADO" } },
              {
                dataVencimento: {
                  gte: range.start,
                  lt: range.endExclusive,
                },
              },
            ],
          },
        }),
        prisma.transacaoFinanceira.count({
          where: {
            AND: [
              tenantScope,
              boletoEmitido,
              { tipo: "RECEITA" },
              {
                dataVencimento: {
                  gte: range.start,
                  lt: range.endExclusive,
                },
              },
            ],
          },
        }),
        prisma.transacaoFinanceira.count({
          where: {
            AND: [
              tenantScope,
              boletoEmitido,
              { tipo: "RECEITA", status: "LIQUIDADO" },
              {
                OR: [
                  {
                    dataPagamento: {
                      gte: range.start,
                      lt: range.endExclusive,
                    },
                  },
                  {
                    interDataRecebimento: {
                      gte: range.start,
                      lt: range.endExclusive,
                    },
                  },
                ],
              },
            ],
          },
        }),
      ]);

    const activeCanonicalLeases = leases.filter(
      (lease) =>
        lease.status === "ACTIVE" &&
        contractOverlapsFinancePeriod(lease.startDate, lease.endDate, range),
    );
    const activeLegacyContracts = legacyContracts.filter(
      (legacy) => !leases.some((lease) => canonicalMatchesLegacy(legacy, lease)),
    );

    return NextResponse.json({
      period: month,
      activeContracts: activeCanonicalLeases.length + activeLegacyContracts.length,
      contractCharges,
      generatedBills,
      settledBills,
    });
  } catch (error) {
    console.error("[financeiro-metricas] Erro:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as métricas financeiras." },
      { status: 500 },
    );
  }
}
