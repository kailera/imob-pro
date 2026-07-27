import "server-only";

import { prisma } from "@/lib/prisma";
import { calcularFimExclusivoPeriodoInicial } from "./periodoInicialLease";

export async function sincronizarPeriodoInicialLease(leaseId: string) {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      terms: true,
      termsPeriods: { orderBy: { effectiveFrom: "asc" } },
    },
  });
  if (!lease) return null;

  if (lease.legacyCode) {
    if (lease.status === "DRAFT") {
      await prisma.leaseTermsPeriod.deleteMany({
        where: { leaseId, source: "CONTRACT_INITIAL" },
      });
    }
    return null;
  }
  if (!lease.startDate || !lease.endDate || !lease.terms) {
    return null;
  }

  const rentAmount = Number(lease.terms.rentValue);
  if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
    return null;
  }

  const effectiveFrom = lease.startDate;
  const effectiveTo = calcularFimExclusivoPeriodoInicial(
    effectiveFrom,
    lease.endDate,
    lease.terms.readjustmentPeriodM ?? 12,
  );
  const periodData = {
    effectiveFrom,
    effectiveTo,
    rentAmount: lease.terms.rentValue,
    paymentDueDay: lease.terms.paymentDueDay,
    adjustmentIndex: lease.terms.readjustmentIndex || "IGP-M",
    adjustmentPercentage: null,
    previousRentAmount: null,
    earlyPaymentDiscount: lease.terms.earlyPaymentDiscount,
    discountType: lease.terms.discountType,
    discountDaysBefore: lease.terms.discountDaysBefore,
    lateFeePercentage: lease.terms.lateFeePercentage,
    lateFeeDays: lease.terms.lateFeeDays,
    lateInterestMonthly: lease.terms.lateInterestMonthly,
    lateInterestDays: lease.terms.lateInterestDays,
    lawyerFeePercentage: lease.terms.lawyerFeePercentage,
    lawyerFeeGraceDays: lease.terms.lawyerFeeGraceDays,
    transferGraceDays: lease.terms.transferGraceDays,
    guaranteedPeriod: lease.terms.guaranteedPeriod,
    guaranteeScope: lease.terms.guaranteeScope,
    adminFeePercentage: lease.terms.adminFeePercentage,
    adminFeeFinesPercentage: lease.terms.adminFeeFinesPercentage,
    brokerageFeePercentage: lease.terms.brokerageFeePercentage,
    source: "CONTRACT_INITIAL",
    reviewStatus: "REVIEWED",
    notes: "Período inicial criado automaticamente a partir das condições do contrato.",
  };

  const existing = lease.termsPeriods.find(period => period.source === "CONTRACT_INITIAL")
    ?? lease.termsPeriods.find(period => period.effectiveFrom.getTime() === effectiveFrom.getTime());

  return existing
    ? prisma.leaseTermsPeriod.update({
        where: { id: existing.id },
        data: periodData,
      })
    : prisma.leaseTermsPeriod.create({
        data: {
          leaseId,
          ...periodData,
        },
      });
}
