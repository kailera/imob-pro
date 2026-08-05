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
        role: "OPERADOR",
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
        area: 420,
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
        area: 160,
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
        area: 360,
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
        area: 280,
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
        area: 550,
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

    // 4. Create or Find Subdivision (Loteamento)
    const loteamentoId = "loteamento-village-parra";
    const loteamento = await prisma.loteamento.upsert({
      where: { id: loteamentoId },
      update: {
        nome: "Loteamento Village Parra",
        slug: "village-parra",
        cidade: "Ilha Solteira",
        uf: "SP",
        descricao: "O Loteamento Village Parra é o novo endereço dos seus sonhos, em uma localização privilegiada, ao lado do Residencial Portal do Sol e bem em frente ao Beach Tennis. Os lotes estão incríveis, com condições imperdíveis.",
        imagens: [
          "/loteamentos/image.png",
          "/loteamentos/image copy.png",
          "/loteamentos/image copy 2.png"
        ],
        infraestrutura: {
          asfalto: 100,
          agua: 100,
          esgoto: 100,
          energia: 100,
          lazer: 85,
        },
      },
      create: {
        id: loteamentoId,
        nome: "Loteamento Village Parra",
        slug: "village-parra",
        cidade: "Ilha Solteira",
        uf: "SP",
        descricao: "O Loteamento Village Parra é o novo endereço dos seus sonhos, em uma localização privilegiada, ao lado do Residencial Portal do Sol e bem em frente ao Beach Tennis. Os lotes estão incríveis, com condições imperdíveis.",
        imagens: [
          "/loteamentos/image.png",
          "/loteamentos/image copy.png",
          "/loteamentos/image copy 2.png"
        ],
        infraestrutura: {
          asfalto: 100,
          agua: 100,
          esgoto: 100,
          energia: 100,
          lazer: 85,
        },
      },
    });
    console.log("Seeded Loteamento:", loteamento);

    // 5. Seed lots for the Loteamento
    const quadraConfigs = [
      { q: "A", range: [13, 16], occupied: [13, 14, 15, 16] },
      { q: "B", range: [1, 8], occupied: [1, 2, 3, 4, 5, 6, 7, 8] },
      { q: "C", range: [1, 8], occupied: [1, 2, 3, 4, 5, 6, 7, 8] },
      { 
        q: "F", 
        range: [1, 30], 
        occupied: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 30] 
      },
      { 
        q: "E", 
        range: [1, 27], 
        occupied: [1, 2, 3, 4, 6, 7, 8, 9, 13, 14, 15, 16, 23, 24, 25] 
      },
      { 
        q: "D", 
        range: [1, 33], 
        occupied: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33] 
      },
      { 
        q: "D_EXT", 
        range: [1, 26], 
        occupied: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 15, 16, 21, 22, 23, 26] 
      }
    ];

    let lotIndex = 0;
    for (const config of quadraConfigs) {
      const [start, end] = config.range;
      for (let i = start; i <= end; i++) {
        lotIndex++;
        const isOccupied = config.occupied.includes(i);
        const status = isOccupied ? "VENDIDO" : "DISPONIVEL";
        const codigo = `LOTE-${config.q}${String(i).padStart(2, "0")}`;
        
        // Quadras C, D, D_EXT são lotes ligeiramente maiores
        const isBig = ["C", "D", "D_EXT"].includes(config.q);
        const area = isBig ? 300 : 253; 
        
        // Preço total correspondente a aproximadamente R$ 530 mensais em 180 parcelas (sinal + saldo financiado)
        // Lotes de 253m² custando R$ 95.400, lotes maiores custando R$ 120.000
        const precoBase = isBig ? 12000000 : 9540000;
        const valorVenda = precoBase + (i * 100000); // variação leve de preço

        const lotData = {
          codigo,
          numero: 200 + lotIndex,
          bairro: "Zona Sul",
          cidade: "Ilha Solteira",
          uf: "SP",
          cep: 15385000,
          tipo: "LOTE" as const,
          forVenda: true,
          forLocacao: false,
          valorVenda,
          area,
          imobId: imob.id,
          loteamentoId: loteamento.id,
          quadra: config.q,
          loteNumero: String(i),
          topografia: i % 3 === 0 ? "DECLIVE_SUAVE" : i % 2 === 0 ? "ACLIVE_SUAVE" : "PLANO",
          statusLote: status as any,
        };

        await prisma.imovel.upsert({
          where: { codigo },
          update: lotData,
          create: lotData,
        });
      }
    }
    console.log(`Seeded ${lotIndex} subdivision lots successfully!`);

    console.log("Database seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
