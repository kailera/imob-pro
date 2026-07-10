import fs from "fs";
import path from "path";

const API_JSON_PATH = "c:/Users/rebec/Documents/scatolin/imoveis_scatolin/api_1782907565845.json";
const apiData = JSON.parse(fs.readFileSync(API_JSON_PATH, "utf-8"));
const anuncios = apiData.body.anuncios || [];

const anuncio = anuncios.find((a: any) => a.codigo === "0083");
if (anuncio) {
  console.log(`Property 0083 has ${anuncio.fotos.length} photos.`);
  anuncio.fotos.forEach((fotoBase64: string, index: number) => {
    const decodedStr = Buffer.from(fotoBase64, "base64").toString("utf-8");
    const decodedJson = JSON.parse(decodedStr);
    const key = decodedJson.arquivoId || decodedJson.key;
    console.log(`  [Foto ${index + 1}]: key = ${key}`);
  });
} else {
  console.log("Property 0083 not found.");
}
