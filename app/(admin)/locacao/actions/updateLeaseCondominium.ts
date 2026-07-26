'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'
import {
    parseLeaseAttachments,
    parseLeaseAttachmentsFormValue,
    serializeLeaseAttachments,
} from '@/lib/locacao/anexos'
import { deleteRemovedLeaseAttachments } from '@/lib/locacao/anexos.server'

export type CondominiumActionState = {
    success: boolean
    message: string | null
    errors: Record<string, string[]>
}

export async function updateLeaseCondominium(
    leaseId: string,
    prevState: CondominiumActionState,
    formData: FormData,
): Promise<CondominiumActionState> {
    const context = await requireUserContext()

    const lease = await prisma.lease.findFirst({
        where: {
            id: leaseId,
            tenantId: context.tenantId,
        },
        select: { id: true },
    })

    if (!lease) {
        return {
            success: false,
            message: 'Contrato não encontrado.',
            errors: {},
        }
    }

    const condoName = formData.get('condoName') as string || null
    const adminName = formData.get('adminName') as string || null
    const adminPhone = formData.get('adminPhone') as string || null
    const adminEmail = formData.get('adminEmail') as string || null
    const adminWebsite = formData.get('adminWebsite') as string || null
    const syndicName = formData.get('syndicName') as string || null
    const syndicPhone = formData.get('syndicPhone') as string || null
    const responsibleParty = formData.get('responsibleParty') as string || null
    const lastCheckedDateRaw = formData.get('lastCheckedDate') as string
    const lastCheckedDate = lastCheckedDateRaw ? new Date(lastCheckedDateRaw) : null
    const storagePrefix = `leases/${context.tenantId}/${leaseId}/`
    const attachments = parseLeaseAttachmentsFormValue(formData.get('condominiumAttachments'), storagePrefix)
    const existingCondominium = await prisma.leaseCondominium.findUnique({
        where: { leaseId },
        select: { documentUrl: true },
    })
    const previousAttachments = parseLeaseAttachments(existingCondominium?.documentUrl)
    const documentUrl = serializeLeaseAttachments(attachments)

    await prisma.leaseCondominium.upsert({
        where: { leaseId },
        create: {
            leaseId,
            condoName,
            adminName,
            adminPhone,
            adminEmail,
            adminWebsite,
            syndicName,
            syndicPhone,
            responsibleParty,
            lastCheckedDate,
            documentUrl,
        },
        update: {
            condoName,
            adminName,
            adminPhone,
            adminEmail,
            adminWebsite,
            syndicName,
            syndicPhone,
            responsibleParty,
            lastCheckedDate,
            documentUrl,
        },
    })

    await deleteRemovedLeaseAttachments(previousAttachments, attachments, storagePrefix)
    revalidatePath(`/locacao/contratos/${leaseId}/editar`)

    return {
        success: true,
        message: 'Dados de Condomínio salvos com sucesso.',
        errors: {},
    }
}
