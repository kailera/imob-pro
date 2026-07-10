import PizZip from 'pizzip';

export function extractVariablesFromDocx(buffer: Buffer): string[] {
  try {
    const zip = new PizZip(buffer);
    const xmlFiles = Object.keys(zip.files).filter(name => 
      name.endsWith('.xml') && !name.includes('_rels')
    );

    const varsSet = new Set<string>();

    for (const xmlFile of xmlFiles) {
      const xml = zip.files[xmlFile].asText();
      // Limpa as tags XML para evitar delimitadores quebrados por tags w:t do Word
      const cleanText = xml.replace(/<[^>]+>/g, '');
      
      // 1. Delimitadores duplos {{VAR}}
      const dMatches = cleanText.matchAll(/\{\{([^}]+)\}\}/g);
      for (const m of dMatches) {
        const key = m[1].trim();
        if (key && !key.includes('{') && !key.includes('}')) {
          varsSet.add(key);
        }
      }
      
      // 2. Delimitadores com cifrão ${VAR}
      const dlMatches = cleanText.matchAll(/\$\{([^}]+)\}/g);
      for (const m of dlMatches) {
        const key = m[1].trim();
        if (key && !key.includes('{') && !key.includes('}')) {
          varsSet.add(key);
        }
      }

      // 3. Delimitadores simples {VAR}
      const sMatches = cleanText.matchAll(/\{([^}]+)\}/g);
      for (const m of sMatches) {
        const val = m[1].trim();
        // Evita falsos positivos de tags xml/html, JSON ou CSS
        if (
          val &&
          !val.includes('{') &&
          !val.includes('}') &&
          !val.includes(':') && 
          !val.includes('=') && 
          !val.includes('<') && 
          !val.includes('>') && 
          val.length < 50
        ) {
          varsSet.add(val);
        }
      }
    }

    return Array.from(varsSet);
  } catch (zipErr) {
    console.error('[contract-parser] Erro ao extrair variáveis do DOCX:', zipErr);
    return [];
  }
}
