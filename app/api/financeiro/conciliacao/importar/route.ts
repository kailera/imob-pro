import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseOFX(text: string) {
  const transactions: any[] = [];
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|<STMTTRN>)/gi;
  let match;
  while ((match = stmttrnRegex.exec(text)) !== null) {
    const block = match[1];
    const trntype = (block.match(/<TRNTYPE>(.*)/i)?.[1] || '').trim();
    const dtposted = (block.match(/<DTPOSTED>(.*)/i)?.[1] || '').trim();
    const trnamt = (block.match(/<TRNAMT>(.*)/i)?.[1] || '').trim();
    const fitid = (block.match(/<FITID>(.*)/i)?.[1] || '').trim();
    const memo = (block.match(/<MEMO>(.*)/i)?.[1] || '').trim();
    
    let date = new Date();
    if (dtposted && dtposted.length >= 8) {
      const year = parseInt(dtposted.substring(0, 4));
      const month = parseInt(dtposted.substring(4, 6)) - 1;
      const day = parseInt(dtposted.substring(6, 8));
      date = new Date(year, month, day);
    }
    
    const value = parseFloat(trnamt);
    const type = value >= 0 ? 'CREDITO' : 'DEBITO';

    transactions.push({
      data: date,
      descricao: memo || trntype || 'Movimentação Bancária',
      valor: Math.abs(value),
      tipo: type,
      fitid: fitid || null
    });
  }
  return transactions;
}

function parseCSV(text: string) {
  const transactions: any[] = [];
  const lines = text.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    const parts = line.split(/[;,]/);
    if (parts.length < 3) continue;

    const dateStr = parts[0].trim();
    const desc = parts[1].trim();
    const valStr = parts[2].trim();

    if (dateStr.toLowerCase().includes('data') || valStr.toLowerCase().includes('valor')) {
      continue;
    }

    let date = new Date();
    if (dateStr.includes('/')) {
      const dParts = dateStr.split('/');
      if (dParts.length === 3) {
        date = new Date(parseInt(dParts[2]), parseInt(dParts[1]) - 1, parseInt(dParts[0]));
      }
    } else if (dateStr.includes('-')) {
      date = new Date(dateStr);
    }

    let cleanVal = valStr.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    let value = parseFloat(cleanVal);
    if (isNaN(value)) continue;

    const type = value >= 0 ? 'CREDITO' : 'DEBITO';

    transactions.push({
      data: date,
      descricao: desc || 'Movimentação Bancária',
      valor: Math.abs(value),
      tipo: type,
      fitid: null
    });
  }
  return transactions;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const text = await file.text();
    const filename = file.name.toLowerCase();
    
    let parsed: any[] = [];
    if (filename.endsWith('.ofx')) {
      parsed = parseOFX(text);
    } else if (filename.endsWith('.csv')) {
      parsed = parseCSV(text);
    } else {
      return NextResponse.json({ error: 'Formato de arquivo não suportado. Envie OFX ou CSV.' }, { status: 400 });
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: 'Nenhuma movimentação encontrada no arquivo.' }, { status: 400 });
    }

    const imported: any[] = [];
    for (const tx of parsed) {
      // Evitar duplicados se houver fitid
      if (tx.fitid) {
        const exist = await prisma.movimentacaoBancaria.findUnique({
          where: { fitid: tx.fitid }
        });
        if (exist) continue;
      }

      const created = await prisma.movimentacaoBancaria.create({
        data: {
          data: tx.data,
          descricao: tx.descricao,
          valor: tx.valor,
          tipo: tx.tipo,
          fitid: tx.fitid,
          status: 'PENDENTE'
        }
      });
      imported.push(created);
    }

    return NextResponse.json({
      message: `${imported.length} novas movimentações importadas com sucesso.`,
      imported
    });
  } catch (err) {
    console.error('[importar-post] Erro:', err);
    return NextResponse.json({ error: 'Erro ao importar extrato bancário.' }, { status: 500 });
  }
}
