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

export type UtilitiesActionState = {
    success: boolean
    message: string | null
    errors: Record<string, string[]>
}

export async function updateLeaseUtilities(
    leaseId: string,
    prevState: UtilitiesActionState,
    formData: FormData,
): Promise<UtilitiesActionState> {
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

    const types = ['WATER', 'ELECTRICITY', 'GAS']

    for (const type of types) {
        const prefix = type.toLowerCase()
        const identification = formData.get(`${prefix}_identification`) as string || null
        const lastCheckedDateRaw = formData.get(`${prefix}_lastCheckedDate`) as string
        const lastCheckedDate = lastCheckedDateRaw ? new Date(lastCheckedDateRaw) : null
        const observation = formData.get(`${prefix}_observation`) as string || null
        const storagePrefix = `leases/${context.tenantId}/${leaseId}/`
        const attachments = parseLeaseAttachmentsFormValue(
            formData.get(`${prefix}_attachments`),
            storagePrefix,
        )
        const existingUtility = await prisma.leaseUtility.findUnique({
            where: { leaseId_type: { leaseId, type } },
            select: { documentUrl: true },
        })
        const previousAttachments = parseLeaseAttachments(existingUtility?.documentUrl)
        const documentUrl = serializeLeaseAttachments(attachments)

        await prisma.leaseUtility.upsert({
            where: {
                leaseId_type: {
                    leaseId,
                    type,
                },
            },
            create: {
                leaseId,
                type,
                identification,
                lastCheckedDate,
                observation,
                documentUrl,
            },
            update: {
                identification,
                lastCheckedDate,
                observation,
                documentUrl,
            },
        })
        await deleteRemovedLeaseAttachments(previousAttachments, attachments, storagePrefix)
    }

    revalidatePath(`/locacao/contratos/${leaseId}/editar`)

    return {
        success: true,
        message: 'Dados de Água, Luz e Gás salvos com sucesso.',
        errors: {},
    }
}
