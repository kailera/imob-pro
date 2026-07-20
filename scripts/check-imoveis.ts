import { PrismaClient } from "../generated/prisma/index.js";
import dotenv from "dotenv";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const imoveis = await prisma.imovel.findMany({
    take: 10,
    select: {
      codigo: true,
      descricao: true
    }
  });
  console.log("IMOVEIS IN DB:", imoveis);
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
