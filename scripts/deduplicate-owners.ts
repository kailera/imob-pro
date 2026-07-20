import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando a sincronização e consolidação de proprietários (Locadores)...");

  // 1. Buscar todos os locadores
  const locadores = await prisma.locador.findMany();
  console.log(`Total de registros de Locador no banco: ${locadores.length}`);

  // 2. Agrupar por nome (case-insensitive, trimmed)
  const groups: Record<string, typeof locadores> = {};
  for (const loc of locadores) {
    const key = loc.nome.trim().toLowerCase();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(loc);
  }

  let totalSincronizados = 0;

  // 3. Para cada grupo de homônimos, encontrar o registro mais completo e propagar os dados
  for (const [nameKey, group] of Object.entries(groups)) {
    if (group.length <= 1) continue;

    console.log(`\nGrupo encontrado: "${group[0].nome}" com ${group.length} duplicatas.`);

    // Encontrar o registro "principal" (o que tem CPF, ou e-mail, ou o primeiro)
    const principal = group.find(l => l.cpfCnpj && l.cpfCnpj.trim() !== "") || 
                      group.find(l => l.email && l.email.trim() !== "") || 
                      group[0];

    console.log(`  -> Usando ID "${principal.id}" como fonte de dados (CPF: "${principal.cpfCnpj || "vazio"}").`);

    // Propagar os dados do principal para todos os outros do grupo
    for (const duplicate of group) {
      if (duplicate.id === principal.id) continue;

      await prisma.locador.update({
        where: { id: duplicate.id },
        data: {
          cpfCnpj: principal.cpfCnpj || duplicate.cpfCnpj,
          telefone: (principal.telefone || duplicate.telefone) as any,
          email: principal.email || duplicate.email,
          endereco: (principal.endereco || duplicate.endereco) as any,
          dataNasc: principal.dataNasc || duplicate.dataNasc,
          rg: principal.rg || duplicate.rg,
          orgaoEmissor: principal.orgaoEmissor || duplicate.orgaoEmissor,
          estadoCivil: principal.estadoCivil || duplicate.estadoCivil,
          profissao: principal.profissao || duplicate.profissao,
          nacionalidade: principal.nacionalidade || duplicate.nacionalidade,
          genero: principal.genero || duplicate.genero,
          documentoUrl: (principal.documentoUrl || duplicate.documentoUrl) as any,
        }
      });
      totalSincronizados++;
    }
    console.log(`  ✓ Sincronizados ${group.length - 1} registros duplicados para "${group[0].nome}".`);
  }

  console.log(`\nSincronização concluída! Total de registros atualizados: ${totalSincronizados}`);
}

main()
  .catch((e) => {
    console.error("Erro ao executar script de deduplicação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
