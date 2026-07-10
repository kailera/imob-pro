import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { prisma } from '@/lib/prisma';

// Mapeamento templateId → arquivo .docx em /public/templates-docx/
const TEMPLATE_FILES: Record<string, string> = {
  'res-simples':    'locacao-residencial-simples.docx',
  'res-completo':   'locacao-residencial-completo.docx',
  'res-caninde':    'locacao-residencial-simples.docx', // alias
  'apt-agatha':     'locacao-apartamentos.docx',
  'prestacao-adm':  'prestacao-servico-adm.docx',
  'intermediacao':  'intermediacao-venda.docx',
  'procuracao':     'procuracao.docx',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { templateId: string; fields: Record<string, string> };
    const { templateId, fields } = body;

    if (!templateId || !fields) {
      return NextResponse.json({ error: 'templateId e fields são obrigatórios.' }, { status: 400 });
    }

    let fileName = '';
    
    // 1. Procurar primeiro no Banco de Dados (templates customizados)
    const dbTemplate = await prisma.contractTemplate.findUnique({
      where: { id: templateId }
    });

    if (dbTemplate) {
      fileName = dbTemplate.fileName;
    } else {
      // 2. Fallback para os templates padrões estáticos
      fileName = TEMPLATE_FILES[templateId];
    }

    if (!fileName) {
      return NextResponse.json({ error: `Template não encontrado: ${templateId}` }, { status: 404 });
    }

    // Caminho absoluto para o template (dentro de /public/templates-docx/)
    const templatePath = path.join(process.cwd(), 'public', 'templates-docx', fileName);

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Arquivo de template não encontrado: ${fileName}. Verifique se o .docx está em public/templates-docx/` },
        { status: 404 }
      );
    }

    // Lê o arquivo .docx como buffer
    const content = fs.readFileSync(templatePath);

    // PizZip descomprime o .docx (formato ZIP/OOXML)
    const zip = new PizZip(content);

    // Auto-detecção inteligente de delimitadores
    let startDelimiter = '{{';
    let endDelimiter = '}}';
    let hasDouble = false;
    let hasDollar = false;
    let hasSingle = false;

    const xmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xml'));
    for (const xmlFile of xmlFiles) {
      const xml = zip.files[xmlFile].asText();
      const cleanText = xml.replace(/<[^>]+>/g, '');
      if (cleanText.includes('{{')) {
        hasDouble = true;
        break;
      }
      if (cleanText.includes('${')) {
        hasDollar = true;
      }
      if (cleanText.includes('{')) {
        hasSingle = true;
      }
    }

    if (hasDouble) {
      startDelimiter = '{{';
      endDelimiter = '}}';
    } else if (hasDollar) {
      startDelimiter = '${';
      endDelimiter = '}';
    } else if (hasSingle) {
      startDelimiter = '{';
      endDelimiter = '}';
    }

    console.log(`[gerar-docx] Usando delimitadores: ${startDelimiter} e ${endDelimiter} para o template ${templateId}`);

    // Docxtemplater substitui os placeholders pelos valores
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: startDelimiter, end: endDelimiter },
    });

    // Injeta os campos
    doc.render(fields);

    // Gera o buffer do .docx preenchido
    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // Monta nome do arquivo de saída
    const locatario = fields['NOME_LOCATARIO'] || fields['nome_cliente'] || 'Contrato';
    const safeLocatario = locatario.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim().slice(0, 40);
    const outputName = `Contrato_${safeLocatario}_${new Date().toISOString().slice(0, 10)}.docx`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(outputBuffer.length),
      },
    });
  } catch (err: unknown) {
    console.error('[gerar-docx] Erro:', err);
    
    // Erro específico do docxtemplater (campo não encontrado no template)
    if (err && typeof err === 'object' && 'properties' in err) {
      const dtError = err as { properties?: { errors?: unknown[] } };
      return NextResponse.json(
        { error: 'Erro ao processar template DOCX', details: dtError.properties?.errors },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: 'Erro interno ao gerar o contrato.' }, { status: 500 });
  }
}

