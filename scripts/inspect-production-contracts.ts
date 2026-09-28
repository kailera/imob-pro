import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log("=== VERIFICANDO BANCO DE PRODUÇÃO ===");
    
    // 1. Organizações / Imobiliárias
    const imobs = await prisma.imob.findMany({
      select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true }
    });
    console.log(`Imobs encontradas: ${imobs.length}`, imobs);

    // 2. Contagem de Leases por Status
    const leaseStatusCount = await prisma.lease.groupBy({
      by: ["status"],
      _count: { id: true }
    });
    console.log("\n--- Contagem de Leases por Status ---");
    console.table(leaseStatusCount);

    // 3. Contagem de Contratos Legados
    const legacyCount = await prisma.contratoImovelLocacao.count();
    console.log(`\nTotal de Contratos Legados (ContratoImovelLocacao): ${legacyCount}`);

    // 4. Buscar todos os Leases VÁLIDOS (não inativos: exceto SUSPENDED, TERMINATED, CANCELLED)
    const validLeases = await prisma.lease.findMany({
      where: {
        status: {
          notIn: ["SUSPENDED", "TERMINATED", "CANCELLED"]
        }
      },
      include: {
        property: {
          select: {
            id: true,
            codigo: true,
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            uf: true,
            cep: true,
            residencial: {
              include: { despesas: true }
            }
          }
        },
        parties: {
          where: { role: { in: ["TENANT", "CO_TENANT"] } },
          include: {
            person: {
              include: {
                phones: true,
                addresses: true
              }
            }
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
        },
        terms: true,
        termsPeriods: {
          orderBy: { effectiveFrom: "desc" }
        },
        iptu: true,
        condominium: true,
        utilities: true
      },
      orderBy: { code: "asc" }
    });

    console.log(`\nTotal de Leases válidos (não inativos): ${validLeases.length}`);

    // 5. Buscar Contratos Legados válidos
    const validLegacy = await prisma.contratoImovelLocacao.findMany({
      include: {
        imovel: {
          select: {
            codigo: true,
            logradouro: true,
            numero: true,
            bairro: true,
            cidade: true
          }
        },
        imovelLocacao: {
          include: {
            periodos: { orderBy: { dataInicio: "desc" } }
          }
        },
        locatarios: true
      }
    });
    console.log(`Total de contratos legados no banco: ${validLegacy.length}`);

    // Amostra detalhada dos Leases
    const leaseSummary = validLeases.map(l => {
      const tenant = l.parties.find(p => p.role === "TENANT" || p.isPrimary)?.person;
      const currentPeriod = l.termsPeriods[0];
      return {
        id: l.id,
        code: l.code,
        status: l.status,
        propertyCode: l.property?.codigo,
        propertyAddress: l.property ? `${l.property.logradouro}, ${l.property.numero} - ${l.property.bairro}` : "S/ imóvel",
        tenantName: tenant?.name ?? "S/ inquilino",
        tenantCpfCnpj: tenant?.cpfCnpj ?? "",
        paymentDueDay: l.terms?.paymentDueDay ?? currentPeriod?.paymentDueDay ?? "N/D",
        rentValue: Number(currentPeriod?.rentAmount ?? l.terms?.rentValue ?? 0),
        discountValue: Number(currentPeriod?.earlyPaymentDiscount ?? l.terms?.earlyPaymentDiscount ?? 0),
        discountType: currentPeriod?.discountType ?? l.terms?.discountType ?? "N/D",
        discountDaysBefore: currentPeriod?.discountDaysBefore ?? l.terms?.discountDaysBefore ?? 0,
        lateFeePercentage: Number(currentPeriod?.lateFeePercentage ?? l.terms?.lateFeePercentage ?? 0),
        lateInterestMonthly: Number(currentPeriod?.lateInterestMonthly ?? l.terms?.lateInterestMonthly ?? 0),
        iptu: Number(l.iptu?.amount ?? 0),
        condo: Number(l.condominium?.amount ?? 0),
        utilitiesCount: l.utilities.length,
        periodsCount: l.termsPeriods.length,
        reviewedPeriods: l.termsPeriods.filter(p => p.reviewStatus === "REVIEWED").length
      };
    });

    console.log("\n--- Resumo de Leases Válidos ---");
    console.table(leaseSummary.slice(0, 20));

    // Salvar JSON completo para análise detalhada
    const fs = await import("node:fs");
    fs.writeFileSync(
      "valid-contracts-inspection.json",
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          imobs,
          leaseStatusCount,
          totalValidLeases: validLeases.length,
          validLeases,
          validLegacyCount: validLegacy.length,
          validLegacy
        },
        null,
        2
      )
    );
    console.log("\nRelatório completo salvo em valid-contracts-inspection.json");

  } catch (error) {
    console.error("Erro ao inspecionar banco:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
