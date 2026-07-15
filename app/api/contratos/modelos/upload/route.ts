import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';
import PizZip from 'pizzip';
import { extractVariablesFromDocx } from '@/lib/contract-parser';
import { PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const type = formData.get('type') as string | null;

    if (!file || !name || !type) {
      return NextResponse.json({ error: 'Os campos file, name e type são obrigatórios.' }, { status: 400 });
    }

    // Gerar UUID e nome do arquivo
    const templateId = crypto.randomUUID();
    const fileExtension = '.docx';
    const fileName = `${templateId}${fileExtension}`;
    
    const buffer = Buffer.from(await file.arrayBuffer());

    // Identificar modo de demonstração local ou upload S3
    const isDevMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === 'true';

    if (isDevMock) {
      console.log('[upload-template] Utilizando gravação no disco local.');
      const uploadDir = path.join(process.cwd(), 'public', 'templates-docx');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
    } else {
      console.log('[upload-template] Enviando para S3/RustFS.');
      const key = `templates-docx/${fileName}`;
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      try {
        await s3Client.send(new PutObjectCommand(uploadParams));
      } catch (uploadError: any) {
        if (uploadError.name === 'NoSuchBucket') {
          await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
          await s3Client.send(new PutObjectCommand(uploadParams));
        } else {
          throw uploadError;
        }
      }
    }

    // Processar o arquivo DOCX usando PizZip para extrair variáveis e texto
    let variables: string[] = [];
    let previewText = '';

    try {
      variables = extractVariablesFromDocx(buffer);

      const zip = new PizZip(buffer);
      if (zip.files['word/document.xml']) {
        const xml = zip.files['word/document.xml'].asText();
        let text = xml.replace(/<\/w:p>/g, '\n');
        text = text.replace(/<w:br\/>/g, '\n');
        text = text.replace(/<w:tab\/>/g, ' ');
        text = text.replace(/<[^>]+>/g, '');
        // Colapsa múltiplos espaços horizontais e tabs para texto corrido limpo
        text = text.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n');
        previewText = text;
      }
    } catch (zipErr) {
      console.error('[upload] Erro ao extrair variáveis do DOCX:', zipErr);
    }

    // Salvar registro no banco de dados via Prisma
    const newTemplate = await prisma.contractTemplate.create({
      data: {
        id: templateId,
        name,
        type,
        fileName,
        content: previewText.trim() || 'Este documento de template não contém texto legível.',
        variables,
      },
    });

    return NextResponse.json({
      message: 'Template enviado e processado com sucesso.',
      template: newTemplate,
    });
  } catch (err: any) {
    console.error('[upload] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao realizar o upload do template.' }, { status: 500 });
  }
}
