import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/index.js";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const imoveis = await prisma.imovel.findMany();
  console.log(`Total imoveis in DB: ${imoveis.length}`);
  const scImoveis = imoveis.filter(im => im.codigo.startsWith("SC-"));
  console.log(`Total SC- imoveis: ${scImoveis.length}`);
  scImoveis.forEach(im => {
    console.log(`- ${im.codigo} | ${im.titulo} | Imagens: ${JSON.stringify(im.imagens)}`);
  });
  await prisma.$disconnect();
  await pool.end();
}

main();
