import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== INICIANDO VALIDAÇÃO DE TRANSAÇÕES VINCULADAS ===");

  const totalTxs = await prisma.transacaoFinanceira.count({
    where: { categoria: "ALUGUEL", tipo: "RECEITA" }
  });

  const linkedTxs = await prisma.transacaoFinanceira.count({
    where: { categoria: "ALUGUEL", tipo: "RECEITA", contratoId: { not: null } }
  });

  const unlinkedTxs = await prisma.transacaoFinanceira.count({
    where: { categoria: "ALUGUEL", tipo: "RECEITA", contratoId: null }
  });

  console.log(`Estatísticas de Cobranças no Banco:`);
  console.log(`- Total: ${totalTxs}`);
  console.log(`- Vinculadas: ${linkedTxs}`);
  console.log(`- Órfãs: ${unlinkedTxs}`);

  if (linkedTxs === 654 && unlinkedTxs === 328) {
    console.log("✅ Validação bem-sucedida! Exatamente 654 transações vinculadas e 328 órfãs (sacados sem contrato cadastrado no sistema).");
    process.exit(0);
  } else {
    console.error(`❌ Validação falhou! Esperado 654 vinculadas e 328 órfãs, mas encontrou ${linkedTxs} vinculadas e ${unlinkedTxs} órfãs.`);
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
