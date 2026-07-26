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

export type IptuActionState = {
    success: boolean
    message: string | null
    errors: Record<string, string[]>
}

export async function updateLeaseIptu(
    leaseId: string,
    prevState: IptuActionState,
    formData: FormData,
): Promise<IptuActionState> {
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

    const inscription = formData.get('inscription') as string || null
    const sequentialNumber = formData.get('sequentialNumber') as string || null
    const bookletHolder = formData.get('bookletHolder') as string || null
    const responsibleParty = formData.get('responsibleParty') as string || null
    const lastCheckedDateRaw = formData.get('lastCheckedDate') as string
    const lastCheckedDate = lastCheckedDateRaw ? new Date(lastCheckedDateRaw) : null
    const storagePrefix = `leases/${context.tenantId}/${leaseId}/`
    const attachments = parseLeaseAttachmentsFormValue(formData.get('iptuAttachments'), storagePrefix)
    const existingIptu = await prisma.leaseIptu.findUnique({
        where: { leaseId },
        select: { documentUrl: true },
    })
    const previousAttachments = parseLeaseAttachments(existingIptu?.documentUrl)
    const documentUrl = serializeLeaseAttachments(attachments)

    await prisma.leaseIptu.upsert({
        where: { leaseId },
        create: {
            leaseId,
            inscription,
            sequentialNumber,
            bookletHolder,
            responsibleParty,
            lastCheckedDate,
            documentUrl,
        },
        update: {
            inscription,
            sequentialNumber,
            bookletHolder,
            responsibleParty,
            lastCheckedDate,
            documentUrl,
        },
    })

    await deleteRemovedLeaseAttachments(previousAttachments, attachments, storagePrefix)
    revalidatePath(`/locacao/contratos/${leaseId}/editar`)

    return {
        success: true,
        message: 'Dados de IPTU salvos com sucesso.',
        errors: {},
    }
}
