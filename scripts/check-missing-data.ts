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
  console.log("  VERIFICANDO DADOS PARA GERAÇÃO DE BOLETOS BANCO INTER");
  console.log("=============================================================\n");

  const contratos = await prisma.contratoImovelLocacao.findMany({
    include: {
      locatarios: true,
      imovel: true,
    },
  });

  console.log(`Total de contratos analisados: ${contratos.length}\n`);

  let countIncompletos = 0;
  const listIncompletos: any[] = [];

  for (const contrato of contratos) {
    const locatario = contrato.locatarios[0];
    if (!locatario) {
      listIncompletos.push({
        contratoId: contrato.id,
        locatarioNome: "Nenhum inquilino vinculado",
        problemas: ["Falta vincular um inquilino ao contrato"],
      });
      countIncompletos++;
      continue;
    }

    const problemas: string[] = [];

    // 1. Validar CPF/CNPJ
    const cpfClean = locatario.cpfCnpj ? locatario.cpfCnpj.replace(/\D/g, "") : "";
    if (!cpfClean) {
      problemas.push("Falta CPF/CNPJ");
    } else if (cpfClean.length !== 11 && cpfClean.length !== 14) {
      problemas.push(`CPF/CNPJ inválido (tamanho: ${cpfClean.length} dígitos)`);
    }

    // 2. Validar Endereço
    const endereco = parseEndereco(locatario.endereco);
    if (!endereco) {
      problemas.push("Falta endereço (não preenchido)");
    } else {
      if (!endereco.logradouro || endereco.logradouro.trim() === "" || endereco.logradouro === "Rua não informada") {
        problemas.push("Falta Logradouro (rua/número)");
      }
      if (!endereco.bairro || endereco.bairro.trim() === "") {
        problemas.push("Falta Bairro");
      }
      if (!endereco.municipio && !endereco.cidade) {
        problemas.push("Falta Município/Cidade");
      }
      if (!endereco.estado && !endereco.uf) {
        problemas.push("Falta Estado/UF");
      }
      
      const cepClean = endereco.cep ? String(endereco.cep).replace(/\D/g, "") : "";
      if (!cepClean) {
        problemas.push("Falta CEP");
      } else if (cepClean.length !== 8) {
        problemas.push(`CEP inválido (tamanho: ${cepClean.length} dígitos)`);
      } else if (cepClean === "00000000") {
        problemas.push("CEP é inválido (00000000)");
      }
    }

    if (problemas.length > 0) {
      listIncompletos.push({
        contratoId: contrato.id,
        locatarioNome: locatario.nome,
        problemas,
      });
      countIncompletos++;
    }
  }

  if (countIncompletos === 0) {
    console.log("✅ Excelente! Todos os contratos ativos possuem CPF e Endereço válidos para gerar boletos!");
  } else {
    console.log(`⚠️ Foram encontrados ${countIncompletos} contratos com dados incompletos:\n`);
    for (const item of listIncompletos) {
      console.log(`• Contrato #${item.contratoId} | Inquilino: ${item.locatarioNome}`);
      for (const prob of item.problemas) {
        console.log(`  - ❌ ${prob}`);
      }
      console.log("");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
