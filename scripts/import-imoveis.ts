import fs from "fs";
import path from "path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// Configurações de Banco de Dados
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Diretórios de Origem e Destino
const SOURCE_DIR = "c:/Users/rebec/Documents/scatolin/imoveis_scatolin";
const SOURCE_IMAGES_DIR = path.join(SOURCE_DIR, "imagens");
const DEST_IMAGES_DIR = path.join(process.cwd(), "public", "imoveis");

// Criar pasta de destino se não existir
if (!fs.existsSync(DEST_IMAGES_DIR)) {
  fs.mkdirSync(DEST_IMAGES_DIR, { recursive: true });
  console.log(`📁 Criada pasta de destino: ${DEST_IMAGES_DIR}`);
}

function parsePriceStringToCents(priceStr: string): number {
  if (!priceStr) return 0;
  // Remover palavras e símbolos
  let cleaned = priceStr.replace(/Locação|Venda|R\$|\s/gi, "");
  // Remover ponto de milhar e trocar vírgula decimal por ponto
  cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.round(val * 100);
}

async function main() {
  console.log("🚀 Iniciando script de importação de imóveis...");
  
  const jsonPath = path.join(SOURCE_DIR, "imoveis_locacao.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Erro: Arquivo não encontrado em ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const imoveis = data.imoveis || [];
  console.log(`📋 Total de imóveis no JSON: ${imoveis.length}`);

  let importedCount = 0;

  for (const item of imoveis) {
    try {
      console.log(`\n🔹 [${item.index}/${imoveis.length}] Processando: "${item.titulo}"`);

      // 1. Tentar extrair os dados estruturados da API contida no campo "codigo"
      let apiData: any = null;
      if (item.codigo) {
        const cleanedHtml = item.codigo.replace(/&q;/g, '"');
        const match = cleanedHtml.match(/"api\/tenants\/[^"]+\/anunciosSite\/ANU-ST-[^"]+":\s*({.+?})/);
        if (match) {
          try {
            apiData = JSON.parse(match[1]);
            console.log(`  📡 Dados de API extraídos com sucesso! Código original: ${apiData.codigoImovel}`);
          } catch (e) {
            console.warn("  ⚠️ Falha ao decodificar JSON interno.");
          }
        }
      }

      // 2. Extrair código único do imóvel
      let codigo = "";
      if (apiData?.codigoImovel) {
        codigo = `SC-${apiData.codigoImovel}`;
      } else if (item.codigo) {
        const matchCod = item.codigo.match(/Código:\s*(\d+)/i);
        if (matchCod) {
          codigo = `SC-${matchCod[1]}`;
        }
      }
      
      if (!codigo) {
        codigo = `SC-RAW-${item.index}`;
      }

      // 3. Mapear Tipo do Imóvel para o Enum
      let tipoEnum: "CASA" | "CONDOMINIO" | "LOTE" | "COMERCIAL" | "RURAL" = "CASA";
      const tipoLower = ((apiData?.tipo || item.titulo) as string).toLowerCase();
      if (tipoLower.includes("salão") || tipoLower.includes("sala") || tipoLower.includes("loja") || tipoLower.includes("barracão") || tipoLower.includes("comercial") || tipoLower.includes("galpão")) {
        tipoEnum = "COMERCIAL";
      } else if (tipoLower.includes("lote") || tipoLower.includes("terreno")) {
        tipoEnum = "LOTE";
      } else if (tipoLower.includes("rural") || tipoLower.includes("fazenda") || tipoLower.includes("chácara")) {
        tipoEnum = "RURAL";
      } else if (tipoLower.includes("apartamento") || tipoLower.includes("condo") || tipoLower.includes("flat") || tipoLower.includes("sobrado") || tipoLower.includes("rancho")) {
        // Como o banco suporta CASA, CONDOMINIO, LOTE, COMERCIAL, RURAL
        // Mapear apartamentos e sobrados em condomínio para CONDOMINIO, ranchos para RURAL, etc.
        if (tipoLower.includes("rancho")) {
          tipoEnum = "RURAL";
        } else {
          tipoEnum = "CONDOMINIO";
        }
      }

      // 4. Copiar Imagens correspondentes
      const imagensCopiadas: string[] = [];
      const imagensLocais = item.imagensLocais || [];
      for (const imgName of imagensLocais) {
        const srcPath = path.join(SOURCE_IMAGES_DIR, imgName);
        const destPath = path.join(DEST_IMAGES_DIR, imgName);

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          imagensCopiadas.push(`/imoveis/${imgName}`);
        }
      }

      console.log(`  📸 Imagens copiadas: ${imagensCopiadas.length} de ${imagensLocais.length}`);

      // 5. Determinar Finalidade e Valores
      // Se comprar: true ou título/descrição contiver termos de venda, marcar como venda
      const textForVenda = (item.titulo + " " + (item.descricao || "")).toLowerCase();
      const isVenda = apiData?.comprar === true || textForVenda.includes("à venda") || textForVenda.includes("venda") || textForVenda.includes("vendo");
      const isLocacao = apiData?.alugar === true || item.valores?.some((v: string) => v.toLowerCase().includes("locaç"));

      let valorAluguel: number | null = null;
      let valorVenda: number | null = null;

      // Extrair valores dos campos do JSON ou do texto
      const rawPrice = item.valores?.[0] || "";
      const priceCents = parsePriceStringToCents(rawPrice);

      if (isLocacao) {
        valorAluguel = priceCents;
      }
      if (isVenda) {
        valorVenda = priceCents > 0 ? priceCents : (isLocacao ? null : 15000000); // fallback se for venda
      }

      // Se nenhum foi detectado, assumir locação (pois a listagem principal é de locação)
      const finalForLocacao = isLocacao || (!isVenda);
      const finalForVenda = isVenda;

      // 6. Preparar Payload do Banco
      const imovelData = {
        codigo,
        numero: parseInt(apiData?.numero) || 0,
        bairro: apiData?.bairro || item.endereco?.split("-")?.[0]?.trim() || "Centro",
        cidade: apiData?.municipio || "Ilha Solteira",
        uf: apiData?.uf || "SP",
        cep: parseInt(apiData?.cep?.replace(/\D/g, "")) || 15385000,
        tipo: tipoEnum,
        forVenda: finalForVenda,
        forLocacao: finalForLocacao,
        valorAluguel,
        valorVenda,
        valorCondominio: parsePriceStringToCents(apiData?.valorCondominio) || null,
        valorIPTU: parsePriceStringToCents(apiData?.valorIptu) || null,
        valorTotal: priceCents,
        area: parseInt(apiData?.areaTotal || apiData?.areaUtil) || 1,
        
        // Novos campos comerciais
        titulo: item.titulo,
        descricao: apiData?.descricao || item.descricao || "Imóvel residencial/comercial em localização privilegiada.",
        imagens: imagensCopiadas,
        quartos: parseInt(apiData?.quartos) || 0,
        banheiros: parseInt(apiData?.banheiros) || 0,
        vagas: parseInt(apiData?.vagas) || 0,
        
        imobId: "imob-default-id" // Imob padrão
      };

      // 7. Upsert no Banco de Dados
      await prisma.imovel.upsert({
        where: { codigo },
        update: imovelData,
        create: imovelData
      });

      console.log(`  ✅ Importado para o Banco: Código ${codigo} | Tipo: ${tipoEnum}`);
      importedCount++;

    } catch (err) {
      console.error(`  ❌ Erro ao importar imóvel ${item.index}:`, err);
    }
  }

  console.log(`\n🎉 Concluído! Total de imóveis importados/sincronizados: ${importedCount}`);
  process.exit(0);
}

main();
