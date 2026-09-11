import { requireUserContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseExitNotice } from '@/lib/locacao/rescisao'
import { generateExitDocument } from '@/lib/locacao/rescisao-documento'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireUserContext()
  const { id } = await params
  const format = new URL(request.url).searchParams.get('format')
  if (format !== 'docx' && format !== 'pdf') return Response.json({ error: 'Formato inválido.' }, { status: 400 })
  const lease = await prisma.lease.findFirst({ where: { id, tenantId: context.tenantId }, select: { exitNotice: true } })
  const notice = parseExitNotice(lease?.exitNotice)
  if (!notice) return Response.json({ error: 'Comunicado não encontrado.' }, { status: 404 })
  try {
    const file = await generateExitDocument(notice, format)
    return new Response(new Uint8Array(file), { headers: {
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="comunicado-desocupacao.${format}"`,
      'Cache-Control': 'private, no-store',
    } })
  } catch (error) {
    console.error('Falha ao gerar comunicado:', error)
    return Response.json({ error: 'Não foi possível gerar o documento. O comunicado está salvo; tente novamente.' }, { status: 500 })
  }
}
