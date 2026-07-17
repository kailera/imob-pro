import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'imoveis_scatolin_cheerio');
const IMAGES_DIR = path.join(OUTPUT_DIR, 'imagens');

const TENANT_ID = 'IAC-IMOB-35AC99F2';
const BASE_API = `https://www.imobiliariascatolin.com.br/api/tenants/${TENANT_ID}`;

// Criar diretórios de saída
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Helper para sanitizar nomes de arquivos
function slugify(text) {
  return (text || 'imovel')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// Decodificar URL da foto base64 e construir URL CloudFront em alta resolução
function buildImageUrl(fotoBase64Str, width = 1200, height = 800) {
  try {
    const decoded = JSON.parse(Buffer.from(fotoBase64Str, 'base64').toString('utf-8'));
    const payload = {
      bucket: 'mhstorage',
      edits: { resize: { fit: 'cover', width, height } },
      key: decoded.arquivoId,
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `${decoded.url}/${b64}`;
  } catch {
    return null;
  }
}

// Baixar imagem com retry
async function downloadImage(url, destPath, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 20000,
      });

      return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);
        writer.on('finish', () => resolve(destPath));
        writer.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });
    } catch (e) {
      if (attempt === retries) {
        console.error(`    ⚠️ Falha ao baixar imagem após ${retries + 1} tentativas: ${e.message}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

// Pequeno delay para não sobrecarregar o servidor
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function runScraper() {
  console.log('🚀 Iniciando Scraper para Imobiliária Scatolin...');
  console.log(`📁 Saída: ${OUTPUT_DIR}\n`);

  // ═══════════════════════════════════════════════════════════════
  // 1. BUSCAR LISTA DE IMÓVEIS (Aluguel + Venda)
  // ═══════════════════════════════════════════════════════════════
  const listUrl = `${BASE_API}/anunciosSiteSemMapa?offset=0&limit=200`;

  console.log('📡 Buscando imóveis para ALUGAR...');
  const locacaoRes = await axios.post(listUrl, { finalidade: 'ALUGAR' }, {
    headers: { 'Content-Type': 'application/json' },
  });
  const imoveisAluguel = locacaoRes.data.anuncios || [];
  console.log(`   ✅ ${imoveisAluguel.length} imóveis para alugar`);

  console.log('📡 Buscando imóveis para COMPRAR...');
  const vendaRes = await axios.post(listUrl, { finalidade: 'COMPRAR' }, {
    headers: { 'Content-Type': 'application/json' },
  });
  const imoveisVenda = vendaRes.data.anuncios || [];
  console.log(`   ✅ ${imoveisVenda.length} imóveis para comprar`);

  const todosAnuncios = [...imoveisAluguel, ...imoveisVenda];
  console.log(`\n📋 Total: ${todosAnuncios.length} imóveis encontrados\n`);

  // ═══════════════════════════════════════════════════════════════
  // 2. PROCESSAR CADA IMÓVEL (detalhes + fotos)
  // ═══════════════════════════════════════════════════════════════
  const imoveisColetados = [];

  for (let i = 0; i < todosAnuncios.length; i++) {
    const anuncio = todosAnuncios[i];
    const index = i + 1;
    const finalidade = anuncio.finalidade === 'COMPRAR' ? 'Venda' : 'Aluguel';

    console.log(`📍 [${index}/${todosAnuncios.length}] "${anuncio.titulo}" (${finalidade})`);

    // ── 2a. Buscar detalhes completos do imóvel ──
    let descricao = '';
    let caracteristicas = [];
    let caracteristicasComplementares = [];
    let valorCondominio = 0;
    let valorIptu = 0;
    let condominioFechado = false;
    let condominioNome = null;
    let cep = '';
    let aceitaFinanciamento = false;
    let permuta = false;
    let fotos360 = [];
    let video = null;

    try {
      const detailUrl = `${BASE_API}/anunciosSite/${anuncio.anuncioId}`;
      const detailRes = await axios.get(detailUrl, {
        headers: { Accept: 'application/json' },
      });
      const d = detailRes.data;

      descricao = d.descricao || '';
      caracteristicas = d.caracteristicas || [];
      caracteristicasComplementares = d.caracteristicasComplementares || [];
      valorCondominio = d.valorCondominio || 0;
      valorIptu = d.valorIptu || 0;
      condominioFechado = d.condominioFechado || false;
      condominioNome = d.condominio || null;
      cep = d.cep || '';
      aceitaFinanciamento = d.aceitaFinanciamento || false;
      permuta = d.permuta || false;
      fotos360 = d.fotos360 || [];
      video = d.video || null;

      console.log(`   📝 Descrição: ${descricao.substring(0, 60).replace(/\n/g, ' ')}...`);
    } catch (e) {
      console.error(`   ⚠️ Erro ao buscar detalhes: ${e.message}`);
    }

    await delay(300); // Pausa gentil entre requisições

    // ── 2b. Baixar fotos ──
    const fotosOriginais = (anuncio.fotos || []).map((f) => buildImageUrl(f)).filter(Boolean);
    const imagensLocais = [];
    const slugTitulo = slugify(anuncio.titulo || `imovel-${index}`);

    // Criar subpasta por imóvel
    const imovelImgDir = path.join(IMAGES_DIR, `${String(index).padStart(3, '0')}_${slugTitulo}`);
    fs.mkdirSync(imovelImgDir, { recursive: true });

    for (let j = 0; j < fotosOriginais.length; j++) {
      const imgUrl = fotosOriginais[j];
      const nomeFoto = `foto_${j + 1}.png`;
      const destPath = path.join(imovelImgDir, nomeFoto);

      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
        imagensLocais.push(`${String(index).padStart(3, '0')}_${slugTitulo}/${nomeFoto}`);
        console.log(`   📸 Foto ${j + 1}/${fotosOriginais.length} (já existe)`);
        continue;
      }

      const result = await downloadImage(imgUrl, destPath);
      if (result && fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
        imagensLocais.push(`${String(index).padStart(3, '0')}_${slugTitulo}/${nomeFoto}`);
        console.log(`   📸 Foto ${j + 1}/${fotosOriginais.length} ✅`);
      } else {
        console.log(`   📸 Foto ${j + 1}/${fotosOriginais.length} ❌`);
      }

      await delay(200);
    }

    // ── 2c. Montar objeto do imóvel ──
    imoveisColetados.push({
      index,
      anuncioId: anuncio.anuncioId,
      codigo: anuncio.codigo,
      titulo: anuncio.titulo,
      tipo: anuncio.tipo,
      finalidade,
      valor: anuncio.valor,
      valorCondominio,
      valorIptu,
      endereco: {
        logradouroNumero: anuncio.logradouroNumero || '',
        bairro: anuncio.bairro || '',
        municipio: anuncio.municipio || '',
        uf: anuncio.uf || '',
        cep,
      },
      composicao: {
        quartos: anuncio.quartos,
        banheiros: anuncio.banheiros,
        suites: anuncio.suites,
        vagas: anuncio.vagas,
        areaTotal: anuncio.areaTotal,
        areaUtil: anuncio.areaUtil,
        unidadeArea: anuncio.unidadeArea,
        composicaoLista: anuncio.composicaoLista || [],
      },
      descricao,
      caracteristicas,
      caracteristicasComplementares,
      condominio: {
        nome: condominioNome,
        fechado: condominioFechado,
      },
      detalhes: {
        destaque: anuncio.destaque,
        superDestaque: anuncio.superDestaque,
        exclusivo: anuncio.exclusivo,
        reservado: anuncio.reservado,
        aceitaFinanciamento,
        permuta,
      },
      localizacao: {
        latitude: anuncio.latitude,
        longitude: anuncio.longitude,
      },
      fotos: {
        quantidade: fotosOriginais.length,
        locais: imagensLocais,
        originais: fotosOriginais,
      },
      fotos360: fotos360.length > 0 ? fotos360 : undefined,
      video: video || undefined,
      urlFichaCompartilhada: anuncio.urlFichaCompartilhada,
    });

    console.log(`   ✅ Concluído (${imagensLocais.length} fotos)\n`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. SALVAR JSON FINAL
  // ═══════════════════════════════════════════════════════════════
  const resultado = {
    coletadoEm: new Date().toISOString(),
    site: 'https://www.imobiliariascatolin.com.br',
    totalImoveis: imoveisColetados.length,
    totalAluguel: imoveisColetados.filter((i) => i.finalidade === 'Aluguel').length,
    totalVenda: imoveisColetados.filter((i) => i.finalidade === 'Venda').length,
    imoveis: imoveisColetados,
  };

  const jsonPath = path.join(OUTPUT_DIR, 'imoveis_scatolin.json');
  fs.writeFileSync(jsonPath, JSON.stringify(resultado, null, 2), 'utf-8');

  // ═══════════════════════════════════════════════════════════════
  // 4. GERAR RELATÓRIO MARKDOWN
  // ═══════════════════════════════════════════════════════════════
  let md = `# 🏠 Imóveis — Scatolin Imóveis\n\n`;
  md += `> **Coletado em:** ${new Date().toLocaleString('pt-BR')}\n`;
  md += `> **Fonte:** [imobiliariascatolin.com.br](https://www.imobiliariascatolin.com.br)\n\n`;
  md += `| Métrica | Quantidade |\n|---|---|\n`;
  md += `| Total | ${resultado.totalImoveis} |\n`;
  md += `| Aluguel | ${resultado.totalAluguel} |\n`;
  md += `| Venda | ${resultado.totalVenda} |\n\n---\n\n`;

  for (const im of imoveisColetados) {
    md += `## ${im.index}. ${im.titulo}\n\n`;
    md += `- **Código:** ${im.codigo}\n`;
    md += `- **Tipo:** ${im.tipo} | **Finalidade:** ${im.finalidade}\n`;
    md += `- **Valor:** R$ ${im.valor?.toLocaleString('pt-BR') || '0'}\n`;
    if (im.valorCondominio) md += `- **Condomínio:** R$ ${im.valorCondominio.toLocaleString('pt-BR')}\n`;
    if (im.valorIptu) md += `- **IPTU:** R$ ${im.valorIptu.toLocaleString('pt-BR')}\n`;
    md += `- **Endereço:** ${im.endereco.logradouroNumero}, ${im.endereco.bairro} - ${im.endereco.municipio}/${im.endereco.uf}\n`;
    if (im.endereco.cep) md += `- **CEP:** ${im.endereco.cep}\n`;
    md += `- **Composição:** ${im.composicao.composicaoLista?.join(', ') || '-'}\n`;

    if (im.caracteristicas?.length > 0) {
      md += `- **Características:** ${im.caracteristicas.map((c) => c.descricao || c).join(', ')}\n`;
    }
    if (im.condominio?.nome) {
      md += `- **Condomínio:** ${im.condominio.nome} (${im.condominio.fechado ? 'Fechado' : 'Aberto'})\n`;
    }
    if (im.descricao) {
      md += `\n> ${im.descricao.replace(/\n/g, '\n> ').substring(0, 500)}\n`;
    }
    if (im.fotos.locais?.length > 0) {
      md += `\n**📷 ${im.fotos.quantidade} foto(s):**\n\n`;
      im.fotos.locais.slice(0, 3).forEach((foto) => {
        md += `![${im.titulo}](./imagens/${foto})\n\n`;
      });
    }
    md += `🔗 [Ver no site](${im.urlFichaCompartilhada})\n\n---\n\n`;
  }

  const mdPath = path.join(OUTPUT_DIR, 'imoveis_scatolin.md');
  fs.writeFileSync(mdPath, md, 'utf-8');

  // ═══════════════════════════════════════════════════════════════
  // 5. RESUMO FINAL
  // ═══════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 Scraping finalizado com sucesso!');
  console.log(`📊 Total: ${resultado.totalImoveis} imóveis (${resultado.totalAluguel} aluguel, ${resultado.totalVenda} venda)`);
  console.log(`📋 JSON: ${jsonPath}`);
  console.log(`📝 Relatório: ${mdPath}`);
  console.log(`📸 Imagens: ${IMAGES_DIR}`);
  console.log('═══════════════════════════════════════════════════');
}

runScraper().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
