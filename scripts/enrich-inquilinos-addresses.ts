import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Safe JSON parser helper
const parseEndereco = (field: any): any => {
  if (!field) return null;
  if (typeof field === "string") {
    try { return JSON.parse(field); } catch { return null; }
  }
  if (typeof field === "object" && !Array.isArray(field)) return field;
  return null;
};

async function main() {
  console.log("=============================================================");
  console.log("  ENRIQUECIMENTO AUTOMÁTICO DE ENDEREÇOS DE INQUILINOS");
  console.log("=============================================================\n");

  const contratos = await prisma.contratoImovelLocacao.findMany({
    include: {
      locatarios: true,
      imovel: true,
    },
  });

  let enrichedCount = 0;

  for (const contrato of contratos) {
    const locatario = contrato.locatarios[0];
    if (!locatario) {
      console.warn(`  ⚠️ Contrato #${contrato.id} não possui locatário vinculado.`);
      continue;
    }

    const endereco = parseEndereco(locatario.endereco);
    const hasLogradouro = endereco && endereco.logradouro && endereco.logradouro !== "Rua não informada" && endereco.logradouro.trim() !== "";
    const hasCep = endereco && endereco.cep && String(endereco.cep).replace(/\D/g, "") !== "00000000" && String(endereco.cep).trim() !== "";

    // Se já tiver logradouro e CEP válidos, não sobrescrevemos
    if (hasLogradouro && hasCep) {
      continue;
    }

    // Extrair o endereço completo do imóvel associado
    let rawAddress = "Rua não informada";
    if (contrato.imovel && contrato.imovel.descricao) {
      if (contrato.imovel.descricao.includes("Endereço completo importado:")) {
        rawAddress = contrato.imovel.descricao.replace("Endereço completo importado: ", "").trim();
      } else {
        rawAddress = contrato.imovel.descricao.trim();
      }
    }

    // Bairro padrão
    let bairro = "Importado";
    if (contrato.imovel && contrato.imovel.bairro && contrato.imovel.bairro !== "Importado via CSV") {
      bairro = contrato.imovel.bairro;
    }

    const novoEnderecoObj = {
      cep: "15385000", // CEP Geral de Ilha Solteira - SP
      logradouro: rawAddress,
      bairro: bairro,
      municipio: "Ilha Solteira",
      estado: "SP",
    };

    console.log(`• Enriquecendo Inquilino: ${locatario.nome} (Contrato #${contrato.id})`);
    console.log(`  -> Novo Endereço: ${novoEnderecoObj.logradouro}, ${novoEnderecoObj.bairro}, Ilha Solteira-SP (CEP: 15385-000)`);

    await prisma.locatario.update({
      where: { id: locatario.id },
      data: {
        endereco: novoEnderecoObj,
      },
    });

    enrichedCount++;
  }

  console.log(`\n=============================================================`);
  console.log(`🎉 Sucesso! Endereços de ${enrichedCount} inquilinos enriquecidos com sucesso!`);
  console.log(`=============================================================`);
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o enriquecimento:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
