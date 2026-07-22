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

// Helpers
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const cleanStr = dateStr.trim();
  const parts = cleanStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

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
  console.log("=============================================================");
  console.log("  INICIANDO ENRIQUECIMENTO E CORREÇÃO DE CONTRATOS (SICADI)");
  console.log("=============================================================\n");

  const csvPath = path.resolve("Contratos (7).csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`Erro: Arquivo CSV não encontrado: ${csvPath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(csvPath);
  const decodedContent = iconv.decode(fileBuffer, "cp850");
  const records = parse(decodedContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  console.log(`Carregados ${records.length} registros do CSV.`);

  let totalUpdated = 0;
  let periodsCreated = 0;
  let errors = 0;

  for (const record of records as any[]) {
    try {
      const keys = Object.keys(record);
      const contratoId = record[keys[0]]?.trim();
      if (!contratoId || !/^\d+$/.test(contratoId)) continue;

      const txAdmStr = record[keys[9]]; // TX. ADM.
      const valorAluguelStr = record[keys[8]]; // VALOR DO ALUGUEL
      const vencimentoAbertoStr = record[keys[6]]; // VENCTO EM ABERTO
      const proximoReajusteStr = record[keys[7]]; // PRÓXIMO REAJUSTE

      const taxaAdministracao = parseMoney(txAdmStr);
      const valorAluguel = parseMoney(valorAluguelStr);
      const vencimentoAberto = parseDate(vencimentoAbertoStr);
      const proximoReajuste = parseDate(proximoReajusteStr);

      // Buscar se o contrato existe no banco
      const contrato = await prisma.contratoImovelLocacao.findUnique({
        where: { id: contratoId },
        include: { imovelLocacao: true },
      });

      if (!contrato) {
        console.log(`⚠️ Contrato #${contratoId} não encontrado no banco de dados. Ignorando.`);
        continue;
      }

      const imovelLocacao = contrato.imovelLocacao;
      if (!imovelLocacao) {
        console.warn(`  ⚠️ Contrato #${contratoId} não possui relacionamento de locação.`);
        continue;
      }
      const locacaoId = imovelLocacao.id;

      // 1. Atualizar a locação com os campos que faltam (Sicadi)
      await prisma.imovelLocacao.update({
        where: { id: locacaoId },
        data: {
          taxaAdministracao: taxaAdministracao,
          taxaMultasEncargos: 50.0, // Default do sistema
          taxaIntermediacao: 100.0, // Default do sistema
          carenciaRepasse: 10,       // Default do sistema
          irrfResponsabilidade: "LOCADOR",
          periodicidadeReajuste: 12,
          indiceReajuste: "IGPM",
          proximoReajuste: proximoReajuste || imovelLocacao.proximoReajuste,
          historicoPeriodosStatus: "PARCIAL",
          multaAtrasoPercentual: 10.0, // Default
          diasCarenciaMulta: 1,        // Default
          jurosAtrasoPercentual: 1.0,  // Default
          diasCarenciaJuros: 1,        // Default
        },
      });

      // 2. Verificar se já existe um período associado
      const existingPeriod = await prisma.periodoContratoLocacao.findFirst({
        where: { imovelLocacaoId: locacaoId },
      });

      if (!existingPeriod) {
        // Criar o Período Contratual vigente inicial
        await prisma.periodoContratoLocacao.create({
          data: {
            imovelLocacaoId: locacaoId,
            dataInicio: imovelLocacao.dataInicio,
            dataFim: imovelLocacao.dataFim,
            valorAluguel: valorAluguel,
            hasCondominio: false,
            valorCondominio: 0,
            hasIPTU: false,
            valorIPTU: 0,
            valorTotal: valorAluguel,
            descontoPontualidade: null,
            multaAtrasoPercentual: 10.0,
            diasCarenciaMulta: 1,
            jurosAtrasoPercentual: 1.0,
            diasCarenciaJuros: 1,
            indiceReajuste: "IGPM",
            tipoPeriodo: "BASE",
            origemPeriodo: "SICADI_PROVISORIO",
          },
        });
        periodsCreated++;
      }

      totalUpdated++;
      console.log(`✓ Contrato #${contratoId} atualizado: Tx Adm: ${taxaAdministracao}%, Aluguel: R$ ${valorAluguel}, Período criado: ${!existingPeriod ? "Sim" : "Já existia"}`);

    } catch (err: any) {
      console.error(`❌ Erro ao processar registro do contrato:`, err);
      errors++;
    }
  }

  console.log("\n=============================================================");
  console.log("  RELATÓRIO DE ENRIQUECIMENTO DOS CONTRATOS");
  console.log("=============================================================");
  console.log(`- Contratos atualizados com sucesso: ${totalUpdated}`);
  console.log(`- Novos Períodos contratuais criados: ${periodsCreated}`);
  console.log(`- Registros com falha: ${errors}`);
  console.log("=============================================================\n");
}

main()
  .catch((e) => {
    console.error("Erro geral no script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
