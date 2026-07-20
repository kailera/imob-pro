import fs from "fs";
import path from "path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import dotenv from "dotenv";
import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseMoney(valStr: string | undefined): number {
  if (!valStr || valStr.trim() === "") return 0;
  let cleanStr = valStr.replace(/[R$\s]/g, "").trim();
  
  const commaIdx = cleanStr.lastIndexOf(",");
  const dotIdx = cleanStr.lastIndexOf(".");
  
  if (commaIdx !== -1 && dotIdx !== -1) {
    if (commaIdx < dotIdx) {
      cleanStr = cleanStr.replace(/,/g, "");
    } else {
      cleanStr = cleanStr.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (commaIdx !== -1) {
    cleanStr = cleanStr.replace(/,/g, ".");
  }
  
  const value = parseFloat(cleanStr);
  return isNaN(value) ? 0 : value;
}

async function main() {
  console.log("=== INICIANDO VALIDAÇÃO DE VALORES DO ALUGUEL NO BANCO ===");

  const csvPath = path.resolve("Contratos (7).csv");
  const fileBuffer = fs.readFileSync(csvPath);
  const decodedContent = iconv.decode(fileBuffer, "cp850");
  const csvRecords = parse(decodedContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const csvContractsMap = new Map<string, number>();
  for (const record of csvRecords as any[]) {
    const keys = Object.keys(record);
    const rawId = record[keys[0]]; // CONTRATO
    if (rawId && /^\d+$/.test(rawId.trim())) {
      const contractId = rawId.trim();
      const rawRent = record[keys[8]]; // VALOR DO ALUGUEL
      csvContractsMap.set(contractId, parseMoney(rawRent));
    }
  }

  const dbContracts = await prisma.contratoImovelLocacao.findMany({
    include: {
      imovelLocacao: true,
      imovel: true
    }
  });

  let mismatches = 0;
  for (const contract of dbContracts) {
    const expectedRent = csvContractsMap.get(contract.id);
    if (expectedRent === undefined) {
      if (contract.id !== "testecadas") {
        console.error(`❌ Mismatch: Contrato #${contract.id} no banco de dados não existe no CSV.`);
        mismatches++;
      }
      continue;
    }

    const actualDbRent = contract.imovelLocacao?.valorAluguel ?? 0;
    const actualImovelRentInCents = contract.imovel?.valorAluguel ?? 0;

    const diffLocacao = Math.abs(actualDbRent - expectedRent);
    const diffImovelInCents = Math.abs(actualImovelRentInCents - Math.round(expectedRent * 100));

    if (diffLocacao > 0.01) {
      console.error(`❌ Erro no Contrato #${contract.id}: Aluguel no banco é R$ ${actualDbRent}, mas no CSV é R$ ${expectedRent}`);
      mismatches++;
    }

    if (diffImovelInCents > 0) {
      console.error(`❌ Erro no Imóvel do Contrato #${contract.id}: Aluguel em centavos no banco é ${actualImovelRentInCents}, mas o esperado era ${Math.round(expectedRent * 100)}`);
      mismatches++;
    }
  }

  console.log(`\n=== RESULTADO DA VERIFICAÇÃO ===`);
  if (mismatches === 0) {
    console.log("✅ Todos os valores de aluguel no banco coincidem 100% com o CSV original!");
    process.exit(0);
  } else {
    console.error(`❌ Encontradas ${mismatches} inconsistências de aluguel!`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
