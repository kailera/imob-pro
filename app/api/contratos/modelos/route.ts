import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { extractVariablesFromDocx } from '@/lib/contract-parser';
import { s3Client, bucketName } from '@/lib/storage';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Importamos os templates padrões para servir como fallback/iniciais
import LocacaocontratoResidencialSimples from '@/lib/templates/LocacaocontratoResidencialSimples';
import LocacaocontratoResidencialCompleto from '@/lib/templates/LocacaocontratoResidencialCompleto';
import LocacaoApartamentosTemplate from '@/lib/templates/LocacaoontratoLocacaoApartamentos';
import contratoPrestacaoAdmLocacao from '@/lib/templates/contratoPrestacaoAdmLocacao';
import contratoIntermediacaoVenda from '@/lib/templates/contratoIntermediacaoVenda';
import contratoProcuracao from '@/lib/templates/contratoProcuracao';

const DEFAULT_TEMPLATES = [
  {
    id: 'res-simples',
    name: 'Locação – Residencial Simples',
    type: 'LOCACAO',
    fileName: 'locacao-residencial-simples.docx',
    content: LocacaocontratoResidencialSimples,
    variables: [
      'NOME_LOCATARIO', 'CPF_LOCATARIO', 'RG_LOCATARIO', 'ENDERECO_ATUAL_LOCATARIO',
      'NOME_LOCADOR', 'CPF_LOCADOR', 'RG_LOCADOR', 'ENDERECO_LOCADOR',
      'NOME_FIADOR', 'CPF_FIADOR', 'RG_FIADOR', 'ENDERECO_FIADOR',
      'ENDERECO_IMOVEL', 'VALOR_ALUGUEL', 'VALOR_ALUGUEL_EXTENSO',
      'VALOR_BONIFICACAO', 'VALOR_ALUGUEL_BONIFICADO', 'VALOR_ALUGUEL_BONIFICADO_EXTENSO',
      'DIA_VENCIMENTO', 'DIA_PAGAMENTO_BONIFICADO', 'VALOR_CONDOMINIO', 'VALOR_IPTU',
      'PRAZO_MESES', 'PRAZO_CONTRATO', 'DATA_INICIO', 'DATA_FIM', 'DATA_ATUAL', 'CIDADE_CONTRATO'
    ],
    isDefault: true,
  },
  {
    id: 'res-completo',
    name: 'Locação – Residencial Completo',
    type: 'LOCACAO',
    fileName: 'locacao-residencial-completo.docx',
    content: LocacaocontratoResidencialCompleto,
    variables: [
      'NOME_LOCATARIO', 'CPF_LOCATARIO', 'RG_LOCATARIO', 'ENDERECO_ATUAL_LOCATARIO',
      'NOME_LOCADOR', 'CPF_LOCADOR', 'RG_LOCADOR', 'ENDERECO_LOCADOR',
      'NOME_FIADOR', 'CPF_FIADOR', 'RG_FIADOR', 'ENDERECO_FIADOR',
      'ENDERECO_IMOVEL', 'VALOR_ALUGUEL', 'VALOR_ALUGUEL_EXTENSO',
      'VALOR_BONIFICACAO', 'VALOR_ALUGUEL_BONIFICADO', 'VALOR_ALUGUEL_BONIFICADO_EXTENSO',
      'DIA_VENCIMENTO', 'DIA_PAGAMENTO_BONIFICADO', 'VALOR_CONDOMINIO', 'VALOR_IPTU',
      'PRAZO_MESES', 'PRAZO_CONTRATO', 'DATA_INICIO', 'DATA_FIM', 'DATA_ATUAL', 'CIDADE_CONTRATO'
    ],
    isDefault: true,
  },
  {
    id: 'apt-agatha',
    name: 'Locação – Contrato de Apartamentos (Res. Agatha)',
    type: 'LOCACAO',
    fileName: 'locacao-apartamentos.docx',
    content: LocacaoApartamentosTemplate,
    variables: [
      'NOME_LOCATARIO', 'CPF_LOCATARIO', 'RG_LOCATARIO',
      'NOME_LOCADOR', 'CPF_LOCADOR',
      'NOME_FIADOR', 'CPF_FIADOR', 'RG_FIADOR', 'ENDERECO_FIADOR',
      'ENDERECO_IMOVEL', 'VALOR_ALUGUEL', 'VALOR_ALUGUEL_EXTENSO',
      'VALOR_BONIFICACAO', 'VALOR_ALUGUEL_BONIFICADO', 'VALOR_ALUGUEL_BONIFICADO_EXTENSO',
      'DIA_VENCIMENTO', 'DIA_PAGAMENTO_BONIFICADO', 'VALOR_CONDOMINIO', 'VALOR_IPTU',
      'PRAZO_MESES', 'DATA_INICIO', 'DATA_FIM', 'DATA_ATUAL', 'CIDADE_CONTRATO',
      'DADOS_BANCARIOS_REPASSE', 'TAXA_LIMPEZA', 'TAXA_GAS', 'PROPRIETARIO_IMOVEL', 'DADOS_IMOVEL_CAUCAO'
    ],
    isDefault: true,
  },
  {
    id: 'prestacao-adm',
    name: 'Prestação de Serviço – Administração de Imóveis',
    type: 'PROPOSTA',
    fileName: 'prestacao-servico-adm.docx',
    content: contratoPrestacaoAdmLocacao,
    variables: [
      'NOME_LOCADOR', 'CPF_LOCADOR', 'RG_LOCADOR', 'ENDERECO_LOCADOR',
      'ENDERECO_IMOVEL', 'DATA_INICIO', 'CIDADE_CONTRATO', 'DATA_ATUAL'
    ],
    isDefault: true,
  },
  {
    id: 'intermediacao',
    name: 'Contrato – Intermediação de Venda',
    type: 'VENDA',
    fileName: 'intermediacao-venda.docx',
    content: contratoIntermediacaoVenda,
    variables: [
      'NOME_LOCADOR', 'CPF_LOCADOR', 'RG_LOCADOR', 'ENDERECO_LOCADOR',
      'ENDERECO_IMOVEL', 'VALOR_VENDA', 'VALOR_SINAL', 'VALOR_SINAL_EXTENSO', 'DADOS_FINANCIAMENTO',
      'CIDADE_CONTRATO', 'DATA_ATUAL'
    ],
    isDefault: true,
  },
  {
    id: 'procuracao',
    name: 'Procuração',
    type: 'PROPOSTA',
    fileName: 'procuracao.docx',
    content: contratoProcuracao,
    variables: [
      'NOME_LOCADOR', 'CPF_LOCADOR', 'RG_LOCADOR', 'ENDERECO_LOCADOR',
      'CIDADE_CONTRATO', 'DATA_ATUAL'
    ],
    isDefault: true,
  }
];

export async function GET(req: NextRequest) {
  try {
    // Buscar templates customizados do banco de dados
    const dbTemplates = await prisma.contractTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const isDevMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === 'true';

    const formattedDbTemplates = await Promise.all(
      dbTemplates.map(async t => {
        let vars = t.variables || [];
        
        // Se as variáveis estiverem vazias, tentamos ler e reprocessar o arquivo
        if (vars.length === 0) {
          try {
            let buffer: Buffer;

            if (isDevMock) {
              const filePath = path.join(process.cwd(), 'public', 'templates-docx', t.fileName);
              if (fs.existsSync(filePath)) {
                buffer = fs.readFileSync(filePath);
                vars = extractVariablesFromDocx(buffer);
              }
            } else {
              const key = `templates-docx/${t.fileName}`;
              const s3Item = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
              const responseBody = await s3Item.Body?.transformToByteArray();
              if (responseBody) {
                buffer = Buffer.from(responseBody);
                vars = extractVariablesFromDocx(buffer);
              }
            }

            if (vars.length > 0) {
              await prisma.contractTemplate.update({
                where: { id: t.id },
                data: { variables: vars }
              });
            }
          } catch (err) {
            console.error(`Erro ao atualizar variáveis dinamicamente para o template ${t.id}:`, err);
          }
        }

        return {
          id: t.id,
          name: t.name,
          type: t.type,
          fileName: t.fileName,
          content: t.content.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n'),
          variables: vars,
          isDefault: false,
        };
      })
    );

    // Mesclar os padrões com os customizados
    const allTemplates = [...formattedDbTemplates, ...DEFAULT_TEMPLATES];

    return NextResponse.json(allTemplates);
  } catch (err) {
    console.error('[modelos-get] Erro:', err);
    return NextResponse.json({ error: 'Erro ao listar templates.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do template é obrigatório.' }, { status: 400 });
    }

    // Buscar no banco
    const template = await prisma.contractTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 });
    }

    // Identificar modo de demonstração local ou upload S3
    const isDevMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === 'true';

    if (isDevMock) {
      // Deletar o arquivo do disco local
      const filePath = path.join(process.cwd(), 'public', 'templates-docx', template.fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) {
          console.error(`[modelos-delete] Falha ao excluir arquivo local: ${template.fileName}`, fileErr);
        }
      }
    } else {
      // Deletar do S3/RustFS
      const key = `templates-docx/${template.fileName}`;
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
      } catch (s3Err) {
        console.error(`[modelos-delete] Falha ao excluir arquivo S3: ${template.fileName}`, s3Err);
      }
    }

    // Deletar o registro no banco
    await prisma.contractTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Template excluído com sucesso.' });
  } catch (err) {
    console.error('[modelos-delete] Erro:', err);
    return NextResponse.json({ error: 'Erro ao excluir o template.' }, { status: 500 });
  }
}
