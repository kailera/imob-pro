import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/index.js";
import {
  buildSicadiPeriods,
  normalizeAdjustmentIndex,
  normalizeSicadiCode,
  parseSicadiDate,
  type SicadiCollectedContract,
  type SicadiPeriodInput,
  validateSicadiCollection,
} from "../lib/locacao/sicadi-import.js";

type ExistingPeriod = {
  id: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  rentAmount: unknown;
  paymentDueDay: number;
  adjustmentIndex: string | null;
  adjustmentPercentage: unknown;
  previousRentAmount: unknown;
  earlyPaymentDiscount: unknown;
  discountType: string | null;
  discountDaysBefore: number | null;
  lateFeePercentage: unknown;
  lateFeeDays: number | null;
  lateInterestMonthly: unknown;
  lateInterestDays: number | null;
  lawyerFeePercentage: unknown;
  lawyerFeeGraceDays: number | null;
  transferGraceDays: number | null;
  guaranteedPeriod: string | null;
  guaranteeScope: string | null;
  adminFeePercentage: unknown;
  adminFeeFinesPercentage: unknown;
  brokerageFeePercentage: unknown;
  source: string;
  externalId: string | null;
  reviewStatus: string;
  notes: string | null;
  _count: { charges: number };
};

type PlannedAction = {
  kind: "CREATE" | "UPDATE" | "ADOPT" | "UNCHANGED" | "CONFLICT";
  target: SicadiPeriodInput;
  existingId?: string;
  reason?: string;
  existingCharges?: number;
};

type MatchableLease = {
  id: string;
  tenantId: string;
  code: string;
  legacySystem: string | null;
  legacyCode: string | null;
  status: string;
  billingStartDate: Date | null;
  terms: { id: string } | null;
  property: {
    codigo: string;
    cep: number;
    logradouro: string | null;
    numero: number;
    complemento: string | null;
    cidade: string;
    uf: string;
  } | null;
  parties: Array<{
    role: string;
    person: { cpfCnpj: string };
  }>;
  termsPeriods: ExistingPeriod[];
};

function argumentValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sourceTenantCpf(source: SicadiCollectedContract) {
  return onlyDigits(
    source.contrato?.locatario?.pessoa?.cpfCnpj ??
      source.contrato?.locatario?.cpfCnpj,
  );
}

function sourceLandlordCpfs(source: SicadiCollectedContract) {
  return new Set(
    (source.contrato?.locadores ?? [])
      .map((landlord) =>
        onlyDigits(landlord.pessoa?.cpfCnpj ?? landlord.cpfCnpj),
      )
      .filter(Boolean),
  );
}

function hasUnpaidBillingMonth(
  source: SicadiCollectedContract,
  month: string,
) {
  return (source.contrato?.periodos ?? []).some(
    (period) =>
      period.vencimento &&
      parseSicadiDate(period.vencimento).toISOString().slice(0, 7) === month &&
      period.pago !== true,
  );
}

function propertyMatchScore(
  source: SicadiCollectedContract,
  lease: MatchableLease,
) {
  const sourceProperty = source.contrato?.imovel;
  const targetProperty = lease.property;
  if (!sourceProperty || !targetProperty) return 0;

  let score = 0;
  const sourcePropertyCode = normalizeSicadiCode(
    sourceProperty.identificacao?.codigo ?? "",
  );
  if (
    sourcePropertyCode &&
    normalizeSicadiCode(targetProperty.codigo) === sourcePropertyCode
  ) {
    score += 80;
  }

  const address = sourceProperty.endereco;
  if (!address) return score;
  if (
    onlyDigits(address.cep) &&
    onlyDigits(address.cep) === onlyDigits(targetProperty.cep)
  ) {
    score += 4;
  }
  if (
    normalizeText(address.logradouro) &&
    normalizeText(address.logradouro) ===
      normalizeText(targetProperty.logradouro)
  ) {
    score += 4;
  }
  if (
    onlyDigits(address.numero) &&
    onlyDigits(address.numero) === onlyDigits(targetProperty.numero)
  ) {
    score += 2;
  }
  if (
    normalizeText(address.complemento) &&
    normalizeText(address.complemento) ===
      normalizeText(targetProperty.complemento)
  ) {
    score += 1;
  }
  if (
    normalizeText(address.municipio) &&
    normalizeText(address.municipio) === normalizeText(targetProperty.cidade)
  ) {
    score += 1;
  }
  if (
    normalizeText(address.uf) &&
    normalizeText(address.uf) === normalizeText(targetProperty.uf)
  ) {
    score += 1;
  }
  return score;
}

function fallbackMatchCandidates(
  source: SicadiCollectedContract,
  leases: MatchableLease[],
) {
  const tenantCpf = sourceTenantCpf(source);
  const landlordCpfs = sourceLandlordCpfs(source);
  const scored = leases
    .map((lease) => {
      const tenantMatch =
        Boolean(tenantCpf) &&
        lease.parties.some(
          (party) => onlyDigits(party.person.cpfCnpj) === tenantCpf,
        );
      const landlordMatch = lease.parties.some(
        (party) =>
          party.role === "LANDLORD" &&
          landlordCpfs.has(onlyDigits(party.person.cpfCnpj)),
      );
      const propertyScore = propertyMatchScore(source, lease);
      return {
        lease,
        tenantMatch,
        landlordMatch,
        propertyScore,
        score:
          (tenantMatch ? 100 : 0) +
          (landlordMatch ? 40 : 0) +
          propertyScore,
      };
    })
    .filter(
      (candidate) =>
        candidate.tenantMatch ||
        candidate.propertyScore >= 8 ||
        candidate.propertyScore >= 80,
    )
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) return [];
  const bestScore = scored[0].score;
  return scored
    .filter((candidate) => candidate.score === bestScore)
    .map((candidate) => ({
      ...candidate,
      strategy:
        candidate.tenantMatch && candidate.landlordMatch
          ? "TENANT_AND_LANDLORD_CPF"
          : candidate.tenantMatch && candidate.propertyScore >= 8
            ? "TENANT_CPF_AND_PROPERTY"
          : candidate.tenantMatch
            ? "TENANT_CPF_UNIQUE"
            : "PROPERTY",
    }));
}

function sameNumber(left: unknown, right: unknown, tolerance = 0.0001) {
  const a = numberOrNull(left);
  const b = numberOrNull(right);
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= tolerance;
}

function sameDate(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

function sameMaterialTerms(
  existing: ExistingPeriod,
  target: SicadiPeriodInput,
) {
  return (
    sameNumber(existing.rentAmount, target.rentAmount) &&
    existing.paymentDueDay === target.paymentDueDay &&
    normalizeAdjustmentIndex(existing.adjustmentIndex) ===
      normalizeAdjustmentIndex(target.adjustmentIndex) &&
    sameNumber(existing.adjustmentPercentage, target.adjustmentPercentage) &&
    sameNumber(existing.previousRentAmount, target.previousRentAmount) &&
    sameNumber(existing.earlyPaymentDiscount, target.earlyPaymentDiscount) &&
    (existing.discountType || "PERCENT") === target.discountType &&
    sameNumber(existing.discountDaysBefore, target.discountDaysBefore) &&
    sameNumber(existing.lateFeePercentage, target.lateFeePercentage) &&
    sameNumber(existing.lateFeeDays, target.lateFeeDays) &&
    sameNumber(
      existing.lateInterestMonthly,
      target.lateInterestMonthly,
    ) &&
    sameNumber(existing.lateInterestDays, target.lateInterestDays) &&
    sameNumber(
      existing.lawyerFeePercentage,
      target.lawyerFeePercentage,
    ) &&
    sameNumber(
      existing.lawyerFeeGraceDays,
      target.lawyerFeeGraceDays,
    ) &&
    sameNumber(existing.transferGraceDays, target.transferGraceDays) &&
    (existing.guaranteedPeriod || null) === target.guaranteedPeriod &&
    (existing.guaranteeScope || null) === target.guaranteeScope &&
    sameNumber(
      existing.adminFeePercentage,
      target.adminFeePercentage,
    ) &&
    sameNumber(
      existing.adminFeeFinesPercentage,
      target.adminFeeFinesPercentage,
    ) &&
    sameNumber(
      existing.brokerageFeePercentage,
      target.brokerageFeePercentage,
    )
  );
}

function sameManagedPeriod(
  existing: ExistingPeriod,
  target: SicadiPeriodInput,
) {
  return (
    sameMaterialTerms(existing, target) &&
    sameDate(existing.effectiveTo, target.effectiveTo) &&
    existing.externalId === target.externalId &&
    existing.source === target.source &&
    existing.reviewStatus === target.reviewStatus
  );
}

function periodsOverlap(
  leftStart: Date,
  leftEnd: Date | null,
  rightStart: Date,
  rightEnd: Date | null,
) {
  const leftEndTime = leftEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEndTime = rightEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  return (
    leftStart.getTime() < rightEndTime &&
    rightStart.getTime() < leftEndTime
  );
}

function planPeriods(
  existingPeriods: ExistingPeriod[],
  targets: SicadiPeriodInput[],
): PlannedAction[] {
  const claimedExisting = new Set<string>();
  const actions: PlannedAction[] = [];

  for (const target of targets) {
    const managed = existingPeriods.find(
      (period) => period.externalId === target.externalId,
    );
    if (managed) {
      claimedExisting.add(managed.id);
      if (sameManagedPeriod(managed, target)) {
        actions.push({
          kind: "UNCHANGED",
          target,
          existingId: managed.id,
          existingCharges: managed._count.charges,
        });
      } else if (
        managed._count.charges > 0 &&
        !sameMaterialTerms(managed, target)
      ) {
        actions.push({
          kind: "CONFLICT",
          target,
          existingId: managed.id,
          existingCharges: managed._count.charges,
          reason:
            "Período importado diverge do SICADI e já originou cobranças.",
        });
      } else {
        actions.push({
          kind: "UPDATE",
          target,
          existingId: managed.id,
          existingCharges: managed._count.charges,
        });
      }
      continue;
    }

    const sameStart = existingPeriods.find(
      (period) =>
        !claimedExisting.has(period.id) &&
        period.effectiveFrom.getTime() === target.effectiveFrom.getTime(),
    );
    if (sameStart) {
      claimedExisting.add(sameStart.id);
      if (sameMaterialTerms(sameStart, target)) {
        actions.push({
          kind: "ADOPT",
          target,
          existingId: sameStart.id,
          existingCharges: sameStart._count.charges,
          reason:
            "Período manual equivalente será identificado como importado do SICADI.",
        });
      } else {
        actions.push({
          kind: "CONFLICT",
          target,
          existingId: sameStart.id,
          existingCharges: sameStart._count.charges,
          reason:
            "Já existe período na mesma data com condições diferentes.",
        });
      }
      continue;
    }

    const overlapping = existingPeriods.find(
      (period) =>
        !claimedExisting.has(period.id) &&
        periodsOverlap(
          period.effectiveFrom,
          period.effectiveTo,
          target.effectiveFrom,
          target.effectiveTo,
        ),
    );
    if (overlapping) {
      actions.push({
        kind: "CONFLICT",
        target,
        existingId: overlapping.id,
        existingCharges: overlapping._count.charges,
        reason: "O novo período sobrepõe um período já cadastrado.",
      });
      continue;
    }

    actions.push({ kind: "CREATE", target });
  }

  return actions;
}

function databasePeriodData(target: SicadiPeriodInput) {
  return {
    effectiveFrom: target.effectiveFrom,
    effectiveTo: target.effectiveTo,
    rentAmount: target.rentAmount,
    paymentDueDay: target.paymentDueDay,
    adjustmentIndex: target.adjustmentIndex,
    adjustmentPercentage: target.adjustmentPercentage,
    previousRentAmount: target.previousRentAmount,
    earlyPaymentDiscount: target.earlyPaymentDiscount,
    discountType: target.discountType,
    discountDaysBefore: target.discountDaysBefore,
    lateFeePercentage: target.lateFeePercentage,
    lateFeeDays: target.lateFeeDays,
    lateInterestMonthly: target.lateInterestMonthly,
    lateInterestDays: target.lateInterestDays,
    lawyerFeePercentage: target.lawyerFeePercentage,
    lawyerFeeGraceDays: target.lawyerFeeGraceDays,
    transferGraceDays: target.transferGraceDays,
    guaranteedPeriod: target.guaranteedPeriod,
    guaranteeScope: target.guaranteeScope,
    adminFeePercentage: target.adminFeePercentage,
    adminFeeFinesPercentage: target.adminFeeFinesPercentage,
    brokerageFeePercentage: target.brokerageFeePercentage,
    source: target.source,
    externalId: target.externalId,
    reviewStatus: target.reviewStatus,
    notes: target.notes,
  };
}

async function createCurrentTermsWhenMissing(
  tx: Prisma.TransactionClient,
  leaseId: string,
) {
  const existingTerms = await tx.leaseTerms.findUnique({
    where: { leaseId },
    select: { id: true },
  });
  if (existingTerms) return false;

  const today = new Date();
  const current =
    (await tx.leaseTermsPeriod.findFirst({
      where: {
        leaseId,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: today } }],
      },
      orderBy: { effectiveFrom: "desc" },
    })) ??
    (await tx.leaseTermsPeriod.findFirst({
      where: { leaseId },
      orderBy: { effectiveFrom: "desc" },
    }));

  if (!current) return false;

  const data = {
    rentValue: current.rentAmount,
    paymentDueDay: current.paymentDueDay,
    nextReadjustmentDate: current.effectiveTo,
    readjustmentIndex: current.adjustmentIndex || "IGP-M",
    earlyPaymentDiscount: current.earlyPaymentDiscount,
    discountType: current.discountType || "PERCENT",
    discountDaysBefore: current.discountDaysBefore,
    lateFeePercentage: current.lateFeePercentage,
    lateFeeDays: current.lateFeeDays,
    lateInterestMonthly: current.lateInterestMonthly,
    lateInterestDays: current.lateInterestDays,
    lawyerFeePercentage: current.lawyerFeePercentage,
    lawyerFeeGraceDays: current.lawyerFeeGraceDays,
    transferGraceDays: current.transferGraceDays,
    guaranteedPeriod: current.guaranteedPeriod,
    guaranteeScope: current.guaranteeScope,
    adminFeePercentage: current.adminFeePercentage,
    adminFeeFinesPercentage: current.adminFeeFinesPercentage,
    brokerageFeePercentage: current.brokerageFeePercentage,
  };

  await tx.leaseTerms.create({
    data: { leaseId, ...data },
  });
  return true;
}

async function main() {
  const fileArg = argumentValue("--file");
  const tenantId = argumentValue("--tenant-id");
  const reportArg = argumentValue("--report");
  const apply = process.argv.includes("--apply");
  const billingStartArg = argumentValue("--billing-start");
  const requiredOpenMonth = argumentValue("--require-open-month");
  const billingStartDate = billingStartArg
    ? new Date(`${billingStartArg}T00:00:00.000Z`)
    : null;

  if (!fileArg) {
    throw new Error(
      "Informe --file <sicadi-contratos-detalhados-...json>.",
    );
  }
  if (apply && !tenantId) {
    throw new Error("--tenant-id é obrigatório com --apply.");
  }
  if (
    billingStartArg &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(billingStartArg) ||
      !billingStartDate ||
      Number.isNaN(billingStartDate.getTime()) ||
      billingStartDate.toISOString().slice(0, 10) !== billingStartArg)
  ) {
    throw new Error("--billing-start deve estar no formato AAAA-MM-DD.");
  }
  if (requiredOpenMonth && !/^\d{4}-\d{2}$/.test(requiredOpenMonth)) {
    throw new Error("--require-open-month deve estar no formato AAAA-MM.");
  }
  if (
    apply &&
    process.env.SICADI_IMPORT_CONFIRM !== "IMPORTAR_PERIODOS_REVISADOS"
  ) {
    throw new Error(
      "Aplicação bloqueada. Defina SICADI_IMPORT_CONFIRM=IMPORTAR_PERIODOS_REVISADOS.",
    );
  }

  const filePath = path.resolve(fileArg);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  validateSicadiCollection(parsed);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const leases = await prisma.lease.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: {
        id: true,
        tenantId: true,
        code: true,
        legacySystem: true,
        legacyCode: true,
        status: true,
        billingStartDate: true,
        terms: { select: { id: true } },
        property: {
          select: {
            codigo: true,
            cep: true,
            logradouro: true,
            numero: true,
            complemento: true,
            cidade: true,
            uf: true,
          },
        },
        parties: {
          where: { role: { in: ["TENANT", "CO_TENANT", "LANDLORD"] } },
          select: {
            role: true,
            person: { select: { cpfCnpj: true } },
          },
        },
        termsPeriods: {
          orderBy: { effectiveFrom: "asc" },
          include: { _count: { select: { charges: true } } },
        },
      },
    });

    const report = {
      mode: apply ? "APPLY" : "DRY_RUN",
      generatedAt: new Date().toISOString(),
      sourceFile: filePath,
      tenantId: tenantId ?? null,
      configuredBillingStartDate: billingStartDate,
      requiredOpenMonth,
      sourceContracts: parsed.contratos.length,
      databaseLeasesScanned: leases.length,
      counts: {
        matched: 0,
        unmatched: 0,
        ambiguous: 0,
        blockedByConflict: 0,
        blockedMissingRequiredOpenMonth: 0,
        missingBillingStartDate: 0,
        inactive: 0,
        existingTermsPreserved: 0,
        missingTermsWillBeCreated: 0,
        billingStartWillBeSet: 0,
        create: 0,
        update: 0,
        adopt: 0,
        unchanged: 0,
        conflict: 0,
        appliedLeases: 0,
      },
      contracts: [] as Array<Record<string, unknown>>,
    };

    const matchableLeases = leases as MatchableLease[];
    const claimedLeaseSources = new Map<string, string>();

    for (const source of parsed.contratos as SicadiCollectedContract[]) {
      const normalizedSourceCode = normalizeSicadiCode(source.codigo);
      const exactLegacy = matchableLeases.filter(
        (lease) =>
          lease.legacySystem === "SICADI" &&
          lease.legacyCode?.trim() === source.codigo.trim(),
      );
      const normalizedLegacy = matchableLeases.filter(
        (lease) =>
          lease.legacySystem === "SICADI" &&
          lease.legacyCode &&
          normalizeSicadiCode(lease.legacyCode) === normalizedSourceCode,
      );
      const codeFallback = matchableLeases.filter(
        (lease) =>
          normalizeSicadiCode(lease.code) === normalizedSourceCode,
      );
      const codeCandidates = [
        ...new Map(
          [...exactLegacy, ...normalizedLegacy, ...codeFallback].map((lease) => [
            lease.id,
            lease,
          ]),
        ).values(),
      ];
      const fallbackCandidates =
        codeCandidates.length === 0
          ? fallbackMatchCandidates(source, matchableLeases)
          : [];
      const candidates =
        codeCandidates.length > 0
          ? codeCandidates.map((lease) => ({
              lease,
              score: 1000,
              strategy: "SICADI_OR_LEASE_CODE",
            }))
          : fallbackCandidates;

      if (candidates.length === 0) {
        report.counts.unmatched += 1;
        report.contracts.push({
          sicadiCode: source.codigo,
          sicadiContractId: source.contratoId,
          status: "UNMATCHED",
        });
        continue;
      }
      if (candidates.length > 1) {
        report.counts.ambiguous += 1;
        report.contracts.push({
          sicadiCode: source.codigo,
          sicadiContractId: source.contratoId,
          status: "AMBIGUOUS",
          candidateLeaseIds: candidates.map((candidate) => candidate.lease.id),
          candidateStrategies: candidates.map(
            (candidate) => candidate.strategy,
          ),
        });
        continue;
      }

      const match = candidates[0];
      const lease = match.lease;
      const previousSource = claimedLeaseSources.get(lease.id);
      if (previousSource && previousSource !== source.codigo) {
        report.counts.ambiguous += 1;
        report.contracts.push({
          sicadiCode: source.codigo,
          sicadiContractId: source.contratoId,
          status: "LEASE_ALREADY_MATCHED",
          leaseId: lease.id,
          previousSicadiCode: previousSource,
          matchStrategy: match.strategy,
          matchScore: match.score,
        });
        continue;
      }
      claimedLeaseSources.set(lease.id, source.codigo);

      const targets = buildSicadiPeriods(source);
      const hasRequiredOpenMonth =
        !requiredOpenMonth ||
        hasUnpaidBillingMonth(source, requiredOpenMonth);
      if (!hasRequiredOpenMonth) {
        report.counts.matched += 1;
        report.counts.blockedMissingRequiredOpenMonth += 1;
        report.contracts.push({
          sicadiCode: source.codigo,
          sicadiContractId: source.contratoId,
          status: "BLOCKED_MISSING_REQUIRED_OPEN_MONTH",
          leaseId: lease.id,
          tenantId: lease.tenantId,
          matchStrategy: match.strategy,
          matchScore: match.score,
          requiredOpenMonth,
        });
        continue;
      }
      const actions = planPeriods(
        lease.termsPeriods as ExistingPeriod[],
        targets,
      );
      const hasConflict = actions.some((action) => action.kind === "CONFLICT");

      report.counts.matched += 1;
      if (!lease.billingStartDate) report.counts.missingBillingStartDate += 1;
      if (lease.terms) {
        report.counts.existingTermsPreserved += 1;
      } else {
        report.counts.missingTermsWillBeCreated += 1;
      }
      if (!lease.billingStartDate && billingStartDate) {
        report.counts.billingStartWillBeSet += 1;
      }
      if (lease.status !== "ACTIVE") report.counts.inactive += 1;
      if (hasConflict) report.counts.blockedByConflict += 1;
      for (const action of actions) {
        report.counts[action.kind.toLowerCase() as "create"] += 1;
      }

      report.contracts.push({
        sicadiCode: source.codigo,
        sicadiContractId: source.contratoId,
        status: hasConflict ? "BLOCKED_CONFLICT" : "READY",
        leaseId: lease.id,
        tenantId: lease.tenantId,
        matchStrategy: match.strategy,
        matchScore: match.score,
        leaseStatus: lease.status,
        billingStartDate: lease.billingStartDate,
        existingTermsPreserved: Boolean(lease.terms),
        configuredBillingStartDate: billingStartDate,
        actions: actions.map((action) => ({
          kind: action.kind,
          existingId: action.existingId,
          existingCharges: action.existingCharges,
          effectiveFrom: action.target.effectiveFrom.toISOString(),
          effectiveTo: action.target.effectiveTo?.toISOString() ?? null,
          rentAmount: action.target.rentAmount,
          paymentDueDay: action.target.paymentDueDay,
          externalId: action.target.externalId,
          reason: action.reason,
        })),
      });

      if (!apply || hasConflict) continue;

      await prisma.$transaction(async (tx) => {
        for (const action of actions) {
          if (action.kind === "UNCHANGED") continue;
          const data = databasePeriodData(action.target);
          if (action.kind === "CREATE") {
            await tx.leaseTermsPeriod.create({
              data: { leaseId: lease.id, ...data },
            });
          } else if (action.existingId) {
            await tx.leaseTermsPeriod.update({
              where: { id: action.existingId },
              data,
            });
          }
        }
        await createCurrentTermsWhenMissing(tx, lease.id);
        await tx.lease.update({
          where: { id: lease.id },
          data: {
            legacySystem: "SICADI",
            legacyCode: source.codigo,
            migratedAt: new Date(),
            billingStartDate:
              !lease.billingStartDate && billingStartDate
                ? billingStartDate
                : undefined,
            version: { increment: 1 },
          },
        });
      });
      report.counts.appliedLeases += 1;
    }

    const reportPath = path.resolve(
      reportArg ?? `sicadi-import-${apply ? "apply" : "dry-run"}.json`,
    );
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(`Modo: ${report.mode}`);
    console.log(`Relatório: ${reportPath}`);
    console.log(JSON.stringify(report.counts, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
