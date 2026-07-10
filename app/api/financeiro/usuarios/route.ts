import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.users.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error('[financeiro-usuarios-get] Erro:', err);
    return NextResponse.json({ error: 'Erro ao listar usuários.' }, { status: 500 });
  }
}
