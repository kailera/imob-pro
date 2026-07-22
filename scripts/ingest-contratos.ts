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

// Função auxiliar para parsing de datas no formato DD/MM/AAAA
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;
  
  // Normalizar separadores e espaços
  const cleanStr = dateStr.trim();
  const parts = cleanStr.split("/");
  if (parts.length !== 3) {
    console.warn(`Data inválida ou em formato desconhecido: "${dateStr}"`);
    return null;
  }
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Meses em JS são 0-indexed (Jan = 0)
  const year = parseInt(parts[2], 10);
  
  // Criar data no meio do dia para evitar problemas de fuso horário/timezone shift
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  if (isNaN(date.getTime())) {
    console.warn(`Falha ao converter a data: "${dateStr}"`);
    return null;
  }
  return date;
}

// Função auxiliar para parsing de valores monetários (ex: "3,100.00" -> 3100.0 ou "969.00" -> 969.0)
export function parseMoney(valStr: string | undefined): number {
  if (!valStr || valStr.trim() === "") return 0;
  
  // Remove cifrão, espaços e trim
  let cleanStr = valStr.replace(/[R$\s]/g, "").trim();
  
  const commaIdx = cleanStr.lastIndexOf(",");
  const dotIdx = cleanStr.lastIndexOf(".");
  
  if (commaIdx !== -1 && dotIdx !== -1) {
    if (commaIdx < dotIdx) {
      // Formato americano: "3,100.00" -> remove a vírgula, mantém o ponto
      cleanStr = cleanStr.replace(/,/g, "");
    } else {
      // Formato brasileiro: "3.100,00" -> remove o ponto, substitui a vírgula por ponto
      cleanStr = cleanStr.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (commaIdx !== -1) {
    // Apenas vírgula: "969,00" -> substitui por ponto
    cleanStr = cleanStr.replace(/,/g, ".");
  }
  
  const value = parseFloat(cleanStr);
  return isNaN(value) ? 0 : value;
}

// Função auxiliar para obter um valor do objeto com fallback para acentuação corrompida
function getField(obj: any, keys: string[]): any {
  for (const key of keys) {
    if (obj[key] !== undefined) {
      return obj[key];
    }
  }
  return undefined;
}

async function main() {
  console.log("Iniciando a ingestão de contratos a partir do CSV...");
  
  // Caminho absoluto para o CSV de contratos
  const csvPath = path.resolve("Contratos (7).csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`Erro: Arquivo CSV não encontrado no caminho: ${csvPath}`);
    process.exit(1);
  }

  // 1. Ler o arquivo como buffer e decodificar usando CP850 / IBM850 (comum em exports de sistemas antigos no Windows brasileiro)
  const fileBuffer = fs.readFileSync(csvPath);
  const decodedContent = iconv.decode(fileBuffer, "cp850");

  // 2. Realizar o parser do CSV
  const records = parse(decodedContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  console.log(`Carregados ${records.length} registros do arquivo CSV.`);
  if (records.length > 0) {
    console.log("Campos detectados no CSV:", Object.keys(records[0] as object));
  }

  // Garantir a Imob padrão no banco
  let imob = await prisma.imob.findFirst();
  if (!imob) {
    console.log("Nenhuma Imob encontrada. Criando Imob padrão...");
    imob = await prisma.imob.create({
      data: {
        id: "imob-default-id",
        orgId: "org_default",
        nomeFantasia: "Imobiliária Scatolin",
      },
    });
  }
  console.log(`Usando Imob ID: ${imob.id} | OrgID: ${imob.orgId}`);

  let importados = 0;
  let erros = 0;

  for (const record of records as any[]) {
    try {
      const keys = Object.keys(record);
      const contratoId = record[keys[0]];
      if (!contratoId || !/^\d+$/.test(contratoId.trim())) {
        continue;
      }
      
      const enderecoImovel = record[keys[1]];
      const locatarioNome = record[keys[2]];
      const locadorNome = record[keys[3]];
      const inicioContratoStr = record[keys[4]];
      const dataTerminoStr = record[keys[5]];
      const proximoReajusteStr = record[keys[7]];
      const valorAluguelStr = record[keys[8]];

      console.log(`Importando Contrato #${contratoId} | Locatário: ${locatarioNome} | Aluguel: ${valorAluguelStr}`);

      const dataInicio = parseDate(inicioContratoStr) || new Date();
      const dataFim = parseDate(dataTerminoStr) || new Date();
      const proximoReajuste = parseDate(proximoReajusteStr);
      const valorAluguel = parseMoney(valorAluguelStr);

      // Nunca recriar um contrato já importado: isso apagaria períodos e correções manuais.
      const contratoJaExistente = await prisma.contratoImovelLocacao.findUnique({
        where: { id: contratoId },
        select: { id: true },
      });
      if (contratoJaExistente) {
        console.log(`Contrato #${contratoId} já existe. Preservando o histórico cadastrado e ignorando a linha.`);
        continue;
      }

      // Usaremos o contratoId para compor um código único para o Imóvel
      const imovelCodigo = `IMB-CSV-${contratoId}`;

      // 1. Criar ou buscar o Imóvel
      const imovel = await prisma.imovel.upsert({
        where: { codigo: imovelCodigo },
        update: {
          valorAluguel: Math.round(valorAluguel * 100),
          descricao: `Endereço completo importado: ${enderecoImovel}`,
        },
        create: {
          codigo: imovelCodigo,
          numero: 0,
          bairro: "Importado via CSV",
          cidade: "Indefinida",
          uf: "SP",
          cep: 0,
          tipo: "CASA",
          forLocacao: true,
          valorAluguel: Math.round(valorAluguel * 100), // Armazenado em centavos na tabela Imovel (conforme seed-db.ts)
          imobId: imob.id,
          descricao: `Endereço completo importado: ${enderecoImovel}`,
        },
      });

      // 2. Criar a Locação (ImovelLocacao)
      // Como não há ID único no CSV para a locação, criaremos um novo registro
      const locacao = await prisma.imovelLocacao.create({
        data: {
          dataInicio,
          dataFim,
          valorAluguel: valorAluguel,
          valorTotal: valorAluguel,
          hasCondominio: false,
          hasIPTU: false,
          proximoReajuste,
          imovelId: imovel.id,
        },
      });

      // 3. Criar o Contrato (ContratoImovelLocacao)
      // Para evitar duplicidade, excluímos contratos com o mesmo ID se existirem ou fazemos upsert
      const contrato = await prisma.contratoImovelLocacao.create({
        data: {
          id: contratoId,
          imovelId: imovel.id,
          imovelLocacaoId: locacao.id,
          imobId: imob.id,
        },
      });

      // 4. Criar o Locatário com placeholders
      await prisma.locatario.create({
        data: {
          nome: locatarioNome || "Locatário Não Informado",
          cpfCnpj: "", // Será preenchido manualmente
          email: "",
          dataNasc: "",
          rg: "",
          orgaoEmissor: "",
          estadoCivil: "",
          profissao: "",
          nacionalidade: "",
          genero: "",
          contratoId: contrato.id,
        },
      });

      // 5. Buscar se já existe algum Locador cadastrado com o mesmo nome para reutilizar seus dados cadastrais (CPF, email, etc.)
      const locadorNomeNormalizado = locadorNome || "Locador Não Informado";
      const existingLocador = await prisma.locador.findFirst({
        where: {
          nome: {
            equals: locadorNomeNormalizado,
            mode: 'insensitive'
          }
        }
      });

      // Criar o Locador para esta locação específica, herdando dados cadastrais caso já existam
      await prisma.locador.create({
        data: {
          nome: locadorNomeNormalizado,
          cpfCnpj: existingLocador?.cpfCnpj || "",
          email: existingLocador?.email || "",
          telefone: existingLocador?.telefone || [],
          endereco: existingLocador?.endereco || [],
          dataNasc: existingLocador?.dataNasc || "",
          rg: existingLocador?.rg || "",
          orgaoEmissor: existingLocador?.orgaoEmissor || "",
          estadoCivil: existingLocador?.estadoCivil || "",
          profissao: existingLocador?.profissao || "",
          nacionalidade: existingLocador?.nacionalidade || "",
          genero: existingLocador?.genero || "",
          documentoUrl: existingLocador?.documentoUrl || [],
          imovelLocacaoId: locacao.id,
        },
      });

      importados++;
    } catch (err) {
      console.error(`Erro ao importar registro do contrato:`, err);
      erros++;
    }
  }

  console.log(`\nRelatório de importação:`);
  console.log(`- Contratos importados com sucesso: ${importados}`);
  console.log(`- Contratos com falha: ${erros}`);
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
