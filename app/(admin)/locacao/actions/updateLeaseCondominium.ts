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
import { calcularCondominioDaCobranca } from '@/lib/locacao/condominio'
import { parseNumeroFlexivel } from '@/lib/locacao/financeiro'

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
    const amountRaw = String(formData.get('amount') ?? '').trim()
    const amount = parseNumeroFlexivel(amountRaw)
    if (amountRaw && (amount == null || amount <= 0)) {
        return {
            success: false,
            message: 'Revise o valor mensal do condomínio.',
            errors: { amount: ['Informe um valor maior que zero ou deixe o campo vazio.'] },
        }
    }
    const storagePrefix = `leases/${context.tenantId}/${leaseId}/`
    const attachments = parseLeaseAttachmentsFormValue(formData.get('condominiumAttachments'), storagePrefix)
    const existingCondominium = await prisma.leaseCondominium.findUnique({
        where: { leaseId },
        select: { documentUrl: true },
    })
    const previousAttachments = parseLeaseAttachments(existingCondominium?.documentUrl)
    const documentUrl = serializeLeaseAttachments(attachments)

    const atualizadas = await prisma.$transaction(async tx => {
        const savedCondominium = await tx.leaseCondominium.upsert({
            where: { leaseId },
            create: {
                leaseId,
                amount,
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
                amount,
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

        const condominiumValue = calcularCondominioDaCobranca(savedCondominium)
        const pendingCharges = await tx.transacaoFinanceira.findMany({
            where: {
                leaseId,
                categoria: 'ALUGUEL',
                tipo: 'RECEITA',
                status: 'PENDENTE',
                interNossoNumero: null,
                interCodigoSolicitacao: null,
                interTxId: null,
                interBarcode: null,
            },
        })

        for (const charge of pendingCharges) {
            const metadata = (
                charge.metadata && typeof charge.metadata === 'object' && !Array.isArray(charge.metadata)
                    ? charge.metadata
                    : {}
            ) as Record<string, unknown>
            const oldCondominium = Number(metadata.condominiumValue ?? 0)
            const previousValue = Number.isFinite(oldCondominium) ? oldCondominium : 0
            const total = Number((Number(charge.valor) - previousValue + condominiumValue).toFixed(2))
            const nextMetadata = { ...metadata, condominiumValue }

            await tx.transacaoFinanceira.update({
                where: { id: charge.id },
                data: { valor: total, metadata: nextMetadata },
            })

            const competence = typeof metadata.competence === 'string' ? metadata.competence : null
            if (competence) {
                await tx.leaseCharge.updateMany({
                    where: { leaseId, competence, chargeType: 'RENT', status: 'PENDING' },
                    data: { amount: total, calculationData: nextMetadata },
                })
            }
        }

        return pendingCharges.length
    })

    await deleteRemovedLeaseAttachments(previousAttachments, attachments, storagePrefix)
    revalidatePath(`/locacao/contratos/${leaseId}/editar`)
    revalidatePath('/cobrancas')
    revalidatePath('/financeiro')

    return {
        success: true,
        message: atualizadas > 0
            ? `Dados de Condomínio salvos e ${atualizadas} cobrança(s) pendente(s) atualizada(s).`
            : 'Dados de Condomínio salvos com sucesso.',
        errors: {},
    }
}
