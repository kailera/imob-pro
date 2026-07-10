import fs from "fs";
import path from "path";
import https from "https";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const API_JSON_PATH = "c:/Users/rebec/Documents/scatolin/imoveis_scatolin/api_1782907565845.json";
const DEST_IMAGES_DIR = path.join(process.cwd(), "public", "imoveis");

// Ensure dest dir exists
if (!fs.existsSync(DEST_IMAGES_DIR)) {
  fs.mkdirSync(DEST_IMAGES_DIR, { recursive: true });
}

function getCloudfrontUrl(fotoBase64: string): string {
  try {
    const decodedStr = Buffer.from(fotoBase64, "base64").toString("utf-8");
    const decodedJson = JSON.parse(decodedStr);
    const key = decodedJson.arquivoId || decodedJson.key;
    const baseUrl = decodedJson.url || "https://d3qmc6mg790as5.cloudfront.net";
    
    const payload = {
      key: key,
      edits: {
        resize: {
          width: 1024,
          height: 576,
          fit: "cover",
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      }
    };
    
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    return `${baseUrl}/${payloadBase64}`;
  } catch (err) {
    return "";
  }
}

function downloadImage(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        resolve(false);
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(true);
      });
    }).on("error", () => {
      file.close();
      fs.unlink(destPath, () => {});
      resolve(false);
    });
  });
}

async function main() {
  console.log("🚀 Starting synchronization of real photos from Scatolin Imóveis API...");
  
  // Clean up existing SC- images to ensure fresh download
  if (fs.existsSync(DEST_IMAGES_DIR)) {
    const files = fs.readdirSync(DEST_IMAGES_DIR);
    files.forEach(file => {
      if (file.startsWith("SC-")) {
        fs.unlinkSync(path.join(DEST_IMAGES_DIR, file));
      }
    });
    console.log("🧹 Cleaned up old SC- property images from public/imoveis/");
  }
  
  if (!fs.existsSync(API_JSON_PATH)) {
    console.error(`❌ Error: API JSON file not found at ${API_JSON_PATH}`);
    process.exit(1);
  }

  const apiData = JSON.parse(fs.readFileSync(API_JSON_PATH, "utf-8"));
  const anuncios = apiData.body.anuncios || [];
  console.log(`📋 Found ${anuncios.length} properties in API JSON.`);

  let updatedCount = 0;

  for (const anuncio of anuncios) {
    const dbCodigo = `SC-${anuncio.codigo}`;
    console.log(`\n🔹 Processing property ${dbCodigo}: "${anuncio.titulo}"`);

    // Verify if it exists in the database
    const dbImovel = await prisma.imovel.findUnique({
      where: { codigo: dbCodigo }
    });

    if (!dbImovel) {
      console.warn(`  ⚠️ Property ${dbCodigo} not found in the database. Skipping.`);
      continue;
    }

    // Determine the photos to download:
    // Index 0 is the watermarked banner, index 1 is the clean banner. Real photos start at index 2.
    const allFotos = anuncio.fotos || [];
    const fotosToProcess = allFotos.length > 2 
      ? allFotos.slice(2, 10) 
      : (allFotos.length > 1 ? allFotos.slice(1) : allFotos); // limit to max 8 real photos
    console.log(`  📸 Total photos: ${allFotos.length}. Downloading ${fotosToProcess.length} real photos...`);

    const imagensLocais: string[] = [];

    for (let i = 0; i < fotosToProcess.length; i++) {
      const fotoBase64 = fotosToProcess[i];
      const url = getCloudfrontUrl(fotoBase64);
      if (!url) continue;

      // Extract extension
      let ext = "png";
      try {
        const decodedStr = Buffer.from(fotoBase64, "base64").toString("utf-8");
        const decodedJson = JSON.parse(decodedStr);
        const key = decodedJson.arquivoId || decodedJson.key;
        ext = key.split(".").pop() || "png";
      } catch (e) {}

      const imgName = `${dbCodigo}_foto${i + 1}.${ext}`;
      const destPath = path.join(DEST_IMAGES_DIR, imgName);

      // Check if image already downloaded and has correct size
      let success = true;
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
        console.log(`  ✓ Image ${i + 1} already exists locally: ${imgName}`);
      } else {
        success = await downloadImage(url, destPath);
        if (success) {
          console.log(`  ✓ Image ${i + 1} downloaded successfully: ${imgName}`);
        } else {
          console.error(`  ✗ Failed to download Image ${i + 1}`);
        }
      }

      if (success) {
        imagensLocais.push(`/imoveis/${imgName}`);
      }
    }

    // Correct bairro/address fields and images in DB
    const cleanBairro = anuncio.bairro || "Centro";
    const cleanCidade = anuncio.municipio || "Ilha Solteira";
    const cleanUf = anuncio.uf || "SP";

    await prisma.imovel.update({
      where: { codigo: dbCodigo },
      data: {
        bairro: cleanBairro,
        cidade: cleanCidade,
        uf: cleanUf,
        imagens: imagensLocais
      }
    });

    console.log(`  ✅ Database updated! Bairro: "${cleanBairro}" | Images: ${imagensLocais.length}`);
    updatedCount++;
  }

  console.log(`\n🎉 Synchronization complete! Updated ${updatedCount} properties in the database.`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Execution failed:", err);
  process.exit(1);
});
