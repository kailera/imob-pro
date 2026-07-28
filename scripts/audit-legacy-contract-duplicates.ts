import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import {
  findCompleteLeaseForLegacyContract,
  isCompleteCanonicalLease,
} from "../lib/locacao/contract-deduplication.js";

function hasJsonValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim().length > 0;
}

async function main() {
  const outputIndex = process.argv.indexOf("--report");
  const output =
    outputIndex >= 0
      ? process.argv[outputIndex + 1]
      : "legacy-contract-duplicates-audit.json";
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [leases, legacyContracts] = await Promise.all([
      prisma.lease.findMany({
        select: {
          id: true,
          code: true,
          legacyCode: true,
          status: true,
          propertyId: true,
          termsPeriods: { select: { reviewStatus: true } },
          parties: {
            where: { role: "TENANT" },
            select: {
              role: true,
              person: { select: { cpfCnpj: true, name: true } },
            },
          },
        },
      }),
      prisma.contratoImovelLocacao.findMany({
        select: {
          id: true,
          imovelId: true,
          imovelLocacaoId: true,
          documentoUrl: true,
          imovel: { select: { codigo: true } },
          locatarios: {
            select: {
              cpfCnpj: true,
              nome: true,
              documentoUrl: true,
              _count: {
                select: { vistorias: true, acessosVistoria: true },
              },
            },
          },
          fiadors: { select: { documentoUrl: true } },
          _count: {
            select: {
              transacaoFinanceiras: true,
              manutencoes: true,
            },
          },
        },
      }),
    ]);

    const completeLeases = leases.filter(isCompleteCanonicalLease);
    const duplicates = legacyContracts.flatMap((legacy) => {
      const canonical = findCompleteLeaseForLegacyContract(
        legacy,
        completeLeases,
      );
      if (!canonical) return [];

      const vistoriaLinks = legacy.locatarios.reduce(
        (sum, tenant) =>
          sum + tenant._count.vistorias + tenant._count.acessosVistoria,
        0,
      );
      const documentLinks =
        Number(hasJsonValue(legacy.documentoUrl)) +
        legacy.locatarios.filter((tenant) =>
          hasJsonValue(tenant.documentoUrl),
        ).length +
        legacy.fiadors.filter((guarantor) =>
          hasJsonValue(guarantor.documentoUrl),
        ).length;
      const blockers = {
        transactions: legacy._count.transacaoFinanceiras,
        maintenances: legacy._count.manutencoes,
        vistoriaLinks,
        documentLinks,
      };

      return [
        {
          legacyContractId: legacy.id,
          legacyPropertyCode: legacy.imovel.codigo,
          imovelLocacaoId: legacy.imovelLocacaoId,
          tenantNames: legacy.locatarios.map((tenant) => tenant.nome),
          canonicalLeaseId: canonical.id,
          canonicalCode: canonical.legacyCode ?? canonical.code,
          blockers,
          safeForPhysicalDeletion: Object.values(blockers).every(
            (count) => count === 0,
          ),
        },
      ];
    });

    const report = {
      generatedAt: new Date().toISOString(),
      completeCanonicalLeases: completeLeases.length,
      legacyContracts: legacyContracts.length,
      duplicatePairs: duplicates.length,
      safeForPhysicalDeletion: duplicates.filter(
        (item) => item.safeForPhysicalDeletion,
      ).length,
      preservedBecauseOfDependencies: duplicates.filter(
        (item) => !item.safeForPhysicalDeletion,
      ).length,
      duplicates,
    };
    fs.writeFileSync(
      path.resolve(output),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    console.log(JSON.stringify({ ...report, duplicates: undefined }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
