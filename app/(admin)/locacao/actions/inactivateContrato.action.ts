'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'

export async function inactivateContrato(contratoId: string) {
    const context = await requireUserContext()
    const lease = await prisma.lease.findFirst({
        where: { id: contratoId, tenantId: context.tenantId },
        select: { id: true, status: true },
    })

    if (!lease) {
        return { success: false, message: 'Contrato não encontrado.' }
    }
    if (lease.status === 'SUSPENDED') {
        return { success: true, message: 'Este contrato já está inativo.' }
    }

    await prisma.lease.update({
        where: { id: lease.id },
        data: {
            status: 'SUSPENDED',
            version: { increment: 1 },
        },
    })

    revalidatePath('/locacao')
    revalidatePath('/locacao/inativos')
    revalidatePath(`/locacao/contratos/${contratoId}/editar`)
    return {
        success: true,
        message: 'Contrato inativado. Os dados e cobranças existentes foram preservados.',
    }
}
