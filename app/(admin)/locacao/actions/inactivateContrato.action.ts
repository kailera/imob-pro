'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'
import { removerRascunhosFuturosDeContratoInativo } from '@/lib/locacao/cobrancas-inativos'

export async function inactivateContrato(contratoId: string) {
    const context = await requireUserContext()
    const lease = await prisma.lease.findFirst({
        where: { id: contratoId, tenantId: context.tenantId },
        select: { id: true, status: true },
    })

    if (!lease) {
        return { success: false, message: 'Contrato não encontrado.' }
    }
    const cleanup = await prisma.$transaction(async tx => {
        if (lease.status !== 'SUSPENDED') {
            await tx.lease.update({
                where: { id: lease.id },
                data: {
                    status: 'SUSPENDED',
                    version: { increment: 1 },
                },
            })
        }
        return removerRascunhosFuturosDeContratoInativo(tx, lease.id)
    })

    revalidatePath('/locacao')
    revalidatePath('/locacao/inativos')
    revalidatePath('/cobrancas')
    revalidatePath('/financeiro')
    revalidatePath(`/locacao/contratos/${contratoId}/editar`)
    return {
        success: true,
        message: cleanup.transactionsRemoved > 0
            ? `Contrato inativado. ${cleanup.transactionsRemoved} cobrança(s) futura(s) em rascunho foram removidas.`
            : lease.status === 'SUSPENDED'
                ? 'Este contrato já está inativo e não possui cobranças futuras em rascunho.'
                : 'Contrato inativado. Nenhuma nova cobrança será gerada.',
    }
}
