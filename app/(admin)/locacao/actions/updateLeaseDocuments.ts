'use server'

import { revalidatePath } from 'next/cache'
import { requireUserContext } from '@/lib/auth'
import { parseLeaseAttachmentsFormValue } from '@/lib/locacao/anexos'
import { prisma } from '@/lib/prisma'

export type LeaseDocumentsActionState = {
  success: boolean
  message: string | null
}

export async function updateLeaseDocuments(
  leaseId: string,
  _prevState: LeaseDocumentsActionState,
  formData: FormData,
): Promise<LeaseDocumentsActionState> {
  const context = await requireUserContext()
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, tenantId: context.tenantId },
    select: { id: true },
  })

  if (!lease) {
    return { success: false, message: 'Contrato não encontrado.' }
  }

  const storagePrefix = `leases/${context.tenantId}/${leaseId}/`
  const attachments = parseLeaseAttachmentsFormValue(
    formData.get('documentsAttachments'),
    storagePrefix,
  )

  await prisma.$transaction(async tx => {
    await tx.leaseDocument.deleteMany({ where: { leaseId } })
    if (attachments.length) {
      await tx.leaseDocument.createMany({
        data: attachments.map(attachment => ({
          leaseId,
          name: attachment.title,
          url: attachment.url,
          type: attachment.mimeType,
        })),
      })
    }
  })

  revalidatePath(`/locacao/contratos/${leaseId}/editar`)
  return { success: true, message: 'Documentos salvos com sucesso.' }
}
