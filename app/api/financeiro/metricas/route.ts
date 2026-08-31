import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { requireUserContext } from "@/lib/auth";
import {
  contractOverlapsFinancePeriod,
  getCalendarDayStartInTimeZone,
  getFinanceMetricMonthRange,
} from "@/lib/financeiro/period-metrics";
import { prisma } from "@/lib/prisma";
import { removeLegacyDuplicatesWithCompleteLease } from "@/lib/locacao/contract-deduplication";

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
        { interTxId: { not: null } },
        { interBarcode: { not: null } },
      ],
    };
    const boletoNaoEmitido: Prisma.TransacaoFinanceiraWhereInput = {
      interCodigoSolicitacao: null,
      interNossoNumero: null,
      interSeuNumero: null,
      interTxId: null,
      interBarcode: null,
    };
    const inicioHoje = getCalendarDayStartInTimeZone();

    const [
      leases,
      legacyContracts,
      contractCharges,
      generatedBills,
      settledBills,
      chargesWithoutBill,
      overdueBills,
    ] =
      await Promise.all([
        prisma.lease.findMany({
          where: {
            tenantId: context.tenantId,
          },
          select: {
            id: true,
            status: true,
            legacyCode: true,
            propertyId: true,
            startDate: true,
            endDate: true,
            termsPeriods: { select: { reviewStatus: true } },
            parties: {
              where: { role: "TENANT" },
              select: { role: true, person: { select: { cpfCnpj: true } } },
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
              { tipo: "RECEITA", categoria: "ALUGUEL" },
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
              { tipo: "RECEITA", categoria: "ALUGUEL" },
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
              { tipo: "RECEITA", categoria: "ALUGUEL", status: "LIQUIDADO" },
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
        prisma.transacaoFinanceira.count({
          where: {
            AND: [
              tenantScope,
              boletoNaoEmitido,
              { tipo: "RECEITA", categoria: "ALUGUEL", status: "PENDENTE" },
              { dataVencimento: { gte: range.start, lt: range.endExclusive } },
            ],
          },
        }),
        prisma.transacaoFinanceira.count({
          where: {
            AND: [
              tenantScope,
              boletoEmitido,
              { tipo: "RECEITA", categoria: "ALUGUEL", status: "PENDENTE" },
              {
                dataVencimento: {
                  gte: range.start,
                  lt: range.endExclusive < inicioHoje ? range.endExclusive : inicioHoje,
                },
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
    const activeLegacyContracts = removeLegacyDuplicatesWithCompleteLease(
      legacyContracts,
      leases,
    );

    return NextResponse.json({
      period: month,
      activeContracts: activeCanonicalLeases.length + activeLegacyContracts.length,
      contractCharges,
      generatedBills,
      settledBills,
      chargesWithoutBill,
      overdueBills,
    });
  } catch (error) {
    console.error("[financeiro-metricas] Erro:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as métricas financeiras." },
      { status: 500 },
    );
  }
}
