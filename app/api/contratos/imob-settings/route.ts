import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

async function getImob() {
  const { orgId } = await auth();

  if (orgId) {
    const imob = await prisma.imob.findUnique({ where: { orgId } });
    if (imob) return imob;

    return prisma.imob.create({ data: { orgId } });
  }

  // Fallback dev
  const fallback = await prisma.imob.findFirst();
  if (fallback) return fallback;
  return prisma.imob.create({ data: { orgId: 'org_default' } });
}

// Maps Imob DB fields → SYS_ contract variables
function imobToSysVars(imob: Awaited<ReturnType<typeof getImob>>) {
  const address = [
    imob.logradouro,
    imob.numero ? `nº ${imob.numero}` : null,
    imob.complemento,
    imob.bairro,
    imob.cidade,
    imob.uf,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    SYS_NOME_IMOBILIARIA: imob.nomeFantasia || imob.razaoSocial || '',
    SYS_RAZAO_SOCIAL_IMOBILIARIA: imob.razaoSocial || '',
    SYS_CNPJ_IMOBILIARIA: imob.cnpj || '',
    SYS_CRECI_IMOBILIARIA: imob.creci || '',
    SYS_NOME_REPRESENTANTE: imob.representanteNome || '',
    SYS_ENDERECO_IMOBILIARIA: address,
    SYS_TELEFONE_IMOBILIARIA: imob.telefone || '',
    SYS_EMAIL_IMOBILIARIA: imob.emailContato || '',
  };
}

export async function GET() {
  try {
    const imob = await getImob();
    return NextResponse.json({ settings: imobToSysVars(imob) });
  } catch (err: any) {
    console.error('[imob-settings GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar configurações.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orgRole } = await auth();
    if (orgRole && orgRole !== 'org:admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem alterar as configurações da imobiliária.' },
        { status: 403 }
      );
    }

    const body: Record<string, string> = await req.json();

    const imob = await getImob();

    await prisma.imob.update({
      where: { id: imob.id },
      data: {
        nomeFantasia: body.SYS_NOME_IMOBILIARIA || undefined,
        razaoSocial: body.SYS_RAZAO_SOCIAL_IMOBILIARIA || undefined,
        cnpj: body.SYS_CNPJ_IMOBILIARIA || undefined,
        creci: body.SYS_CRECI_IMOBILIARIA || undefined,
        representanteNome: body.SYS_NOME_REPRESENTANTE || undefined,
        telefone: body.SYS_TELEFONE_IMOBILIARIA || undefined,
        emailContato: body.SYS_EMAIL_IMOBILIARIA || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[imob-settings PATCH]', err);
    return NextResponse.json({ error: 'Erro ao salvar configurações.' }, { status: 500 });
  }
}
