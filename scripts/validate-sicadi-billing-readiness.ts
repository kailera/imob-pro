import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import {
  parseSicadiDate,
  type SicadiCollectedContract,
  validateSicadiCollection,
} from "../lib/locacao/sicadi-import.js";

function argumentValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function isPresentNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function monthOf(date: Date) {
  return date.toISOString().slice(0, 7);
}

async function main() {
  const collectionArg = argumentValue("--file");
  const dryRunArg = argumentValue("--dry-run-report");
  const month = argumentValue("--month");
  const reportArg =
    argumentValue("--report") ?? "sicadi-august-readiness.json";

  if (!collectionArg || !dryRunArg || !month) {
    throw new Error(
      "Informe --file, --dry-run-report e --month AAAA-MM.",
    );
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("--month deve estar no formato AAAA-MM.");
  }

  const collection = JSON.parse(
    fs
      .readFileSync(path.resolve(collectionArg), "utf8")
      .replace(/^\uFEFF/, ""),
  );
  validateSicadiCollection(collection);
  const dryRun = JSON.parse(
    fs.readFileSync(path.resolve(dryRunArg), "utf8"),
  );

  const readyMappings = dryRun.contracts.filter(
    (contract: Record<string, unknown>) => contract.status === "READY",
  );
  const leaseIds = readyMappings.map(
    (contract: Record<string, string>) => contract.leaseId,
  );
  const sourcesById = new Map(
    (collection.contratos as SicadiCollectedContract[]).map((contract) => [
      contract.contratoId,
      contract,
    ]),
  );

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const leases = await prisma.lease.findMany({
      where: { id: { in: leaseIds } },
      select: {
        id: true,
        code: true,
        status: true,
        billingStartDate: true,
        property: {
          select: {
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            uf: true,
            cep: true,
          },
        },
        parties: {
          where: { role: "TENANT" },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            isPrimary: true,
            person: {
              select: {
                name: true,
                cpfCnpj: true,
                addresses: {
                  take: 1,
                  select: {
                    logradouro: true,
                    numero: true,
                    complemento: true,
                    bairro: true,
                    municipio: true,
                    estado: true,
                    cep: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const leasesById = new Map(leases.map((lease) => [lease.id, lease]));

    const report = {
      generatedAt: new Date().toISOString(),
      month,
      readyMappings: readyMappings.length,
      counts: {
        readyForInternalCharge: 0,
        readyForInter: 0,
        missingAugustPeriod: 0,
        augustAlreadyPaidInSicadi: 0,
        missingSourceIdentification: 0,
        missingSourceAddress: 0,
        missingRent: 0,
        missingDueDay: 0,
        missingLateFee: 0,
        missingLateInterest: 0,
        missingDiscountValue: 0,
        missingDiscountDeadline: 0,
        missingDatabaseTenant: 0,
        missingDatabaseCpfCnpj: 0,
        missingDatabaseAddress: 0,
      },
      contracts: [] as Array<Record<string, unknown>>,
    };

    for (const mapping of readyMappings as Array<Record<string, string>>) {
      const source = sourcesById.get(mapping.sicadiContractId);
      const lease = leasesById.get(mapping.leaseId);
      const issues: string[] = [];

      if (!source || !lease) {
        issues.push("MAPPING_NOT_FOUND");
        report.contracts.push({
          sicadiCode: mapping.sicadiCode,
          leaseId: mapping.leaseId,
          issues,
        });
        continue;
      }

      const periodsInMonth = (source.contrato.periodos ?? []).filter(
        (period) =>
          period.vencimento &&
          monthOf(parseSicadiDate(period.vencimento)) === month,
      );
      const unpaidPeriods = periodsInMonth.filter(
        (period) => period.pago !== true,
      );
      if (periodsInMonth.length === 0) {
        issues.push("MISSING_AUGUST_PERIOD");
        report.counts.missingAugustPeriod += 1;
      } else if (unpaidPeriods.length === 0) {
        issues.push("AUGUST_ALREADY_PAID_IN_SICADI");
        report.counts.augustAlreadyPaidInSicadi += 1;
      }

      const referencePeriod = unpaidPeriods.at(-1) ?? periodsInMonth.at(-1);
      const referenceStart = referencePeriod?.inicio
        ? parseSicadiDate(referencePeriod.inicio)
        : null;
      const activeControl = [...source.controles]
        .filter((control) => {
          if (!referenceStart) return true;
          return parseSicadiDate(control.inicioPeriodo) <= referenceStart;
        })
        .sort(
          (left, right) =>
            parseSicadiDate(right.inicioPeriodo).getTime() -
            parseSicadiDate(left.inicioPeriodo).getTime(),
        )[0];

      const tenant = source.contrato.locatario;
      const sourceCpf = onlyDigits(
        tenant?.pessoa?.cpfCnpj ?? tenant?.cpfCnpj,
      );
      if (!sourceCpf || ![11, 14].includes(sourceCpf.length)) {
        issues.push("MISSING_SOURCE_IDENTIFICATION");
        report.counts.missingSourceIdentification += 1;
      }

      const sourceAddress = source.contrato.imovel?.endereco;
      if (
        !sourceAddress?.logradouro ||
        !sourceAddress.numero ||
        !sourceAddress.bairro ||
        !sourceAddress.municipio ||
        !sourceAddress.uf ||
        onlyDigits(sourceAddress.cep).length !== 8
      ) {
        issues.push("MISSING_SOURCE_ADDRESS");
        report.counts.missingSourceAddress += 1;
      }

      const dueDay = Number(source.contrato.dadosContrato?.diaVencimento);
      if (!activeControl || !(Number(activeControl.valorAluguel) > 0)) {
        issues.push("MISSING_RENT");
        report.counts.missingRent += 1;
      }
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        issues.push("MISSING_DUE_DAY");
        report.counts.missingDueDay += 1;
      }
      if (!activeControl || !isPresentNumber(activeControl.multaAtraso)) {
        issues.push("MISSING_LATE_FEE");
        report.counts.missingLateFee += 1;
      }
      if (!activeControl || !isPresentNumber(activeControl.jurosMensal)) {
        issues.push("MISSING_LATE_INTEREST");
        report.counts.missingLateInterest += 1;
      }
      if (
        !activeControl ||
        !isPresentNumber(activeControl.descontoPontualidade)
      ) {
        issues.push("MISSING_DISCOUNT_VALUE");
        report.counts.missingDiscountValue += 1;
      }
      if (
        activeControl &&
        Number(activeControl.descontoPontualidade) > 0 &&
        !isPresentNumber(activeControl.descontoPontualidadeAte)
      ) {
        issues.push("MISSING_DISCOUNT_DEADLINE");
        report.counts.missingDiscountDeadline += 1;
      }

      const databaseTenant = lease.parties[0]?.person;
      if (!databaseTenant?.name) {
        issues.push("MISSING_DATABASE_TENANT");
        report.counts.missingDatabaseTenant += 1;
      }
      const databaseCpf = onlyDigits(databaseTenant?.cpfCnpj);
      if (![11, 14].includes(databaseCpf.length)) {
        issues.push("MISSING_DATABASE_CPF_CNPJ");
        report.counts.missingDatabaseCpfCnpj += 1;
      }

      const tenantAddress = databaseTenant?.addresses[0];
      const propertyAddress = lease.property;
      const resolvedAddress = {
        logradouro:
          tenantAddress?.logradouro || propertyAddress?.logradouro || "",
        bairro: tenantAddress?.bairro || propertyAddress?.bairro || "",
        cidade: tenantAddress?.municipio || propertyAddress?.cidade || "",
        uf: tenantAddress?.estado || propertyAddress?.uf || "",
        cep: onlyDigits(tenantAddress?.cep || propertyAddress?.cep),
      };
      if (
        !resolvedAddress.logradouro ||
        !resolvedAddress.bairro ||
        !resolvedAddress.cidade ||
        !resolvedAddress.uf ||
        resolvedAddress.cep.length !== 8
      ) {
        issues.push("MISSING_DATABASE_ADDRESS");
        report.counts.missingDatabaseAddress += 1;
      }

      const internalBlockingIssues = new Set([
        "MISSING_AUGUST_PERIOD",
        "AUGUST_ALREADY_PAID_IN_SICADI",
        "MISSING_RENT",
        "MISSING_DUE_DAY",
      ]);
      const interBlockingIssues = new Set([
        ...internalBlockingIssues,
        "MISSING_DATABASE_TENANT",
        "MISSING_DATABASE_CPF_CNPJ",
        "MISSING_DATABASE_ADDRESS",
      ]);
      const readyForInternalCharge = !issues.some((issue) =>
        internalBlockingIssues.has(issue),
      );
      const readyForInter = !issues.some((issue) =>
        interBlockingIssues.has(issue),
      );
      if (readyForInternalCharge) {
        report.counts.readyForInternalCharge += 1;
      }
      if (readyForInter) report.counts.readyForInter += 1;

      report.contracts.push({
        sicadiCode: mapping.sicadiCode,
        leaseId: mapping.leaseId,
        matchStrategy: mapping.matchStrategy,
        readyForInternalCharge,
        readyForInter,
        augustDueDate: referencePeriod?.vencimento ?? null,
        augustPaidInSicadi: referencePeriod?.pago ?? null,
        discountValue:
          activeControl?.descontoPontualidade ?? null,
        discountDeadline:
          activeControl?.descontoPontualidadeAte ?? null,
        lateFee: activeControl?.multaAtraso ?? null,
        lateInterest: activeControl?.jurosMensal ?? null,
        issues,
      });
    }

    const reportPath = path.resolve(reportArg);
    fs.writeFileSync(
      reportPath,
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
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
