import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/index.js";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database seed...");
  try {
    // 1. Create or Find default Imob
    const imobId = "imob-default-id";
    const imob = await prisma.imob.upsert({
      where: { id: imobId },
      update: {},
      create: {
        id: imobId,
        orgId: "org_default",
      },
    });
    console.log("Seeded Imob:", imob);

    // 2. Create or Find default Users
    const userAdmin = await prisma.users.upsert({
      where: { id: "user_operador" },
      update: {},
      create: {
        id: "user_operador",
        email: "operador@imobpro.com.br",
        firstName: "Admin",
        lastName: "Operador",
        role: "ADMIN",
        imobId: imob.id,
      },
    });
    console.log("Seeded Admin/Operador User:", userAdmin);

    const userVistoriador = await prisma.users.upsert({
      where: { id: "user_vistoriador" },
      update: {},
      create: {
        id: "user_vistoriador",
        email: "vistoriador@imobpro.com.br",
        firstName: "Carlos",
        lastName: "Vistoriador",
        role: "VISTORIADOR",
        imobId: imob.id,
      },
    });
    console.log("Seeded Vistoriador User:", userVistoriador);

    // 3. Create or Find default Imoveis
    const imoveisData = [
      {
        codigo: "IMB-001",
        numero: 123,
        bairro: "Jardim das Flores",
        cidade: "São Paulo",
        uf: "SP",
        cep: 12345678,
        tipo: "CASA" as const,
        forVenda: true,
        forLocacao: true,
        valorAluguel: 250000,
        valorCondominio: 15000,
        valorIPTU: 8000,
        valorVenda: 45000000,
        valorTotal: 273000,
        imobId: imob.id,
      },
      {
        codigo: "IMB-002",
        numero: 1000,
        bairro: "Residencial Ouro",
        cidade: "Campinas",
        uf: "SP",
        cep: 13080000,
        tipo: "CONDOMINIO" as const,
        forVenda: false,
        forLocacao: true,
        valorAluguel: 850000,
        valorCondominio: 120000,
        valorIPTU: 45000,
        valorTotal: 1015000,
        imobId: imob.id,
      },
      {
        codigo: "IMB-003",
        numero: 55,
        bairro: "Parque Industrial",
        cidade: "Sorocaba",
        uf: "SP",
        cep: 18010000,
        tipo: "LOTE" as const,
        forVenda: true,
        forLocacao: false,
        valorVenda: 15000000,
        imobId: imob.id,
      },
      {
        codigo: "IMB-004",
        numero: 300,
        bairro: "Centro",
        cidade: "Ribeirão Preto",
        uf: "SP",
        cep: 14010000,
        tipo: "COMERCIAL" as const,
        forVenda: true,
        forLocacao: true,
        valorAluguel: 1200000,
        valorCondominio: 200000,
        valorIPTU: 80000,
        valorVenda: 250000000,
        valorTotal: 1480000,
        imobId: imob.id,
      },
      {
        codigo: "IMB-005",
        numero: 100,
        bairro: "Área Rural",
        cidade: "São Carlos",
        uf: "SP",
        cep: 13560000,
        tipo: "RURAL" as const,
        forVenda: true,
        forLocacao: false,
        valorVenda: 350000000,
        imobId: imob.id,
      },
    ];

    for (const item of imoveisData) {
      const imovel = await prisma.imovel.upsert({
        where: { codigo: item.codigo },
        update: item,
        create: item,
      });
      console.log(`Seeded Imovel ${item.codigo} (${item.tipo})`);
    }

    console.log("Database seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
