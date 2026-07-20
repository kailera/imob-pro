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

// Robust currency parser (supports US and BR formats)
function parseMoney(valStr: string | undefined): number {
  if (!valStr || valStr.trim() === "") return 0;
  let cleanStr = valStr.replace(/[R$\s]/g, "").trim();
  
  const commaIdx = cleanStr.lastIndexOf(",");
  const dotIdx = cleanStr.lastIndexOf(".");
  
  if (commaIdx !== -1 && dotIdx !== -1) {
    if (commaIdx < dotIdx) {
      // US Format: "3,100.00" -> remove comma, keep dot
      cleanStr = cleanStr.replace(/,/g, "");
    } else {
      // BR Format: "3.100,00" -> remove dot, replace comma with dot
      cleanStr = cleanStr.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (commaIdx !== -1) {
    // Only comma: "969,00" -> replace with dot
    cleanStr = cleanStr.replace(/,/g, ".");
  }
  
  const value = parseFloat(cleanStr);
  return isNaN(value) ? 0 : value;
}

function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(name: string): string {
  return normalizeName(name)
    .replace(/\b(ltda|me|epp|s\/a|sa)\b/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("=============================================================");
  console.log("  INICIANDO SCRIPT DE RECONCILIAÇÃO E CORREÇÃO DE DADOS");
  console.log("=============================================================\n");

  // 1. LER E PARSEAR CONTRATOS DO CSV
  const csvPath = path.resolve("Contratos (7).csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`Erro: Arquivo CSV não encontrado em: ${csvPath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(csvPath);
  const decodedContent = iconv.decode(fileBuffer, "cp850");
  const csvRecords = parse(decodedContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const csvContractsMap = new Map<string, any>();
  for (const record of csvRecords as any[]) {
    const keys = Object.keys(record);
    const rawId = record[keys[0]]; // CONTRATO
    if (rawId && /^\d+$/.test(rawId.trim())) {
      const contractId = rawId.trim();
      const rawRent = record[keys[8]]; // VALOR DO ALUGUEL
      const correctRent = parseMoney(rawRent);
      csvContractsMap.set(contractId, {
        contractId,
        correctRent,
        locatario: record[keys[2]],
      });
    }
  }
  console.log(`Carregados ${csvContractsMap.size} contratos válidos do CSV.`);

  // 2. ATUALIZAR ALUGUÉIS NO BANCO
  let contractsUpdated = 0;
  const dbContracts = await prisma.contratoImovelLocacao.findMany({
    include: {
      imovelLocacao: true,
    }
  });

  console.log(`Encontrados ${dbContracts.length} contratos no banco de dados.`);
  console.log("Corrigindo valores de aluguel no banco...");

  for (const contract of dbContracts) {
    const csvInfo = csvContractsMap.get(contract.id);
    if (!csvInfo) {
      console.warn(`  ⚠️ Contrato #${contract.id} está no banco mas não foi encontrado no CSV!`);
      continue;
    }

    const correctRent = csvInfo.correctRent;
    const currentDbRent = contract.imovelLocacao?.valorAluguel ?? 0;

    // Se o valor estiver incorreto (diferença maior que 0.01)
    if (Math.abs(currentDbRent - correctRent) > 0.01) {
      // Atualizar ImovelLocacao
      if (contract.imovelLocacaoId) {
        await prisma.imovelLocacao.update({
          where: { id: contract.imovelLocacaoId },
          data: {
            valorAluguel: correctRent,
            valorTotal: correctRent,
          }
        });
      }

      // Atualizar Imovel (Math.round(valor * 100))
      await prisma.imovel.update({
        where: { id: contract.imovelId },
        data: {
          valorAluguel: Math.round(correctRent * 100)
        }
      });

      contractsUpdated++;
    }
  }
  console.log(`✅ Sucesso: ${contractsUpdated} aluguéis corrigidos no banco de dados.\n`);

  // 3. VINCULAR TRANSAÇÕES FINANCEIRAS ÓRFÃS
  console.log("Buscando locatários e transações financeiras para vincular...");

  // Buscar todos os locatários e indexar por nome limpo
  const dbLocatarios = await prisma.locatario.findMany({
    include: {
      contrato: true
    }
  });

  console.log(`Encontrados ${dbLocatarios.length} locatários no banco.`);

  const locatarioIndex = new Map<string, typeof dbLocatarios[0]>();
  for (const loc of dbLocatarios) {
    const cleaned = cleanName(loc.nome);
    if (cleaned) {
      locatarioIndex.set(cleaned, loc);
    }
  }
  
  console.log(`Indexados ${locatarioIndex.size} locatários por nome limpo.`);
  if (locatarioIndex.size > 0) {
    console.log("Amostra de chaves de locatários:", Array.from(locatarioIndex.keys()).slice(0, 5));
  }

  // Buscar transações financeiras de ALUGUEL
  const dbTxs = await prisma.transacaoFinanceira.findMany({
    where: { categoria: "ALUGUEL", tipo: "RECEITA" }
  });

  console.log(`Total de transações de aluguel no banco: ${dbTxs.length}`);

  let txsLinked = 0;
  let cpfsUpdated = 0;
  let alreadyLinked = 0;

  for (const tx of dbTxs) {
    // Se já estiver vinculada
    if (tx.contratoId) {
      alreadyLinked++;
      continue;
    }

    const metadataObj = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
    const sacadoName = (metadataObj as any)?.sacadoNome || "";
    const sacadoCpf = (metadataObj as any)?.sacadoCpf || "";
    const cleanedSacado = cleanName(sacadoName);

    if (!cleanedSacado) continue;

    // Buscar correspondência de locatário
    let matchedLocatario = locatarioIndex.get(cleanedSacado);
    if (!matchedLocatario) {
      // Busca parcial (um contém o outro)
      for (const [key, locObj] of locatarioIndex.entries()) {
        if (key.includes(cleanedSacado) || cleanedSacado.includes(key)) {
          matchedLocatario = locObj;
          break;
        }
      }
    }

    if (matchedLocatario && matchedLocatario.contrato) {
      // Vincular transação ao contrato e imóvel
      await prisma.transacaoFinanceira.update({
        where: { id: tx.id },
        data: {
          contratoId: matchedLocatario.contratoId,
          imovelId: matchedLocatario.contrato.imovelId
        }
      });
      txsLinked++;

      // Atualizar o CPF do locatário se estiver vazio
      if (sacadoCpf && (!matchedLocatario.cpfCnpj || matchedLocatario.cpfCnpj.trim() === "")) {
        await prisma.locatario.update({
          where: { id: matchedLocatario.id },
          data: { cpfCnpj: sacadoCpf }
        });
        matchedLocatario.cpfCnpj = sacadoCpf; // atualizar no cache
        cpfsUpdated++;
      }
    }
  }

  const unlinkedCount = await prisma.transacaoFinanceira.count({
    where: { categoria: "ALUGUEL", contratoId: null }
  });

  console.log("\n=============================================================");
  console.log("  RELATÓRIO DE RECONCILIAÇÃO");
  console.log("=============================================================");
  console.log(`  Aluguéis de contratos corrigidos: ${contractsUpdated}`);
  console.log(`  Transações já vinculadas anteriormente: ${alreadyLinked}`);
  console.log(`  Transações vinculadas nesta rodada:   ${txsLinked}`);
  console.log(`  CPFs de locatários atualizados:      ${cpfsUpdated}`);
  console.log(`  Transações que permanecem órfãs:     ${unlinkedCount}`);
  console.log("=============================================================\n");
}

main()
  .catch((e) => {
    console.error("Erro na reconciliação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
