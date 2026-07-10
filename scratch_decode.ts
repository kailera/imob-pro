import fs from "fs";
import path from "path";

const apiFilePath = "c:/Users/rebec/Documents/scatolin/imoveis_scatolin/api_1782907565845.json";
const apiData = JSON.parse(fs.readFileSync(apiFilePath, "utf-8"));
const anuncios = apiData.body.anuncios || [];

console.log(`Loaded ${anuncios.length} anuncios.`);

anuncios.slice(0, 5).forEach((anuncio: any) => {
  console.log(`\nAnuncio Code: ${anuncio.codigo} | Title: ${anuncio.titulo}`);
  console.log(`Total fotos: ${anuncio.fotos.length}`);
  anuncio.fotos.forEach((fotoBase64: string, index: number) => {
    try {
      const decodedStr = Buffer.from(fotoBase64, "base64").toString("utf-8");
      const decodedJson = JSON.parse(decodedStr);
      console.log(`  [Foto ${index + 1}]: key = ${decodedJson.arquivoId || decodedJson.key}`);
    } catch (err: any) {
      console.log(`  [Foto ${index + 1}]: (Failed to decode: ${err.message})`);
    }
  });
});
