import { prisma } from "../lib/prisma";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const totalCount = await prisma.transacaoFinanceira.count({
      where: { categoria: "ALUGUEL" }
    });
    console.log("TOTAL ALUGUEL IN DB:", totalCount);

    const statusGroup = await prisma.transacaoFinanceira.groupBy({
      by: ['status'],
      where: { categoria: "ALUGUEL" },
      _sum: {
        valor: true
      }
    });
    console.log("GROUP BY STATUS RESULT:", JSON.stringify(statusGroup, null, 2));

    const sample = await prisma.transacaoFinanceira.findMany({
      where: { categoria: "ALUGUEL" },
      take: 5
    });
    console.log("SAMPLE TRANSACTIONS:", JSON.stringify(sample, null, 2));

  } catch (error) {
    console.error("Error inspecting database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
