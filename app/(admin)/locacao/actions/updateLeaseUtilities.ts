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
import { parseNumeroFlexivel } from '@/lib/locacao/financeiro'

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
        const amount = parseNumeroFlexivel(String(formData.get(`${prefix}_amount`) ?? '')) ?? null
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
                amount,
                identification,
                lastCheckedDate,
                observation,
                documentUrl,
            },
            update: {
                amount,
                identification,
                lastCheckedDate,
                observation,
                documentUrl,
            },
        })
        await deleteRemovedLeaseAttachments(previousAttachments, attachments, storagePrefix)
    }

    const atualizadas = await prisma.$transaction(async tx => {
        const utilities = await tx.leaseUtility.findMany({
            where: { leaseId, type: { in: ['WATER', 'ELECTRICITY'] } },
        })
        const waterValue = Number(utilities.find(item => item.type === 'WATER')?.amount ?? 0)
        const electricityValue = Number(
            utilities.find(item => item.type === 'ELECTRICITY')?.amount ?? 0,
        )
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
            const previousWater = Number(metadata.waterValue ?? 0)
            const previousElectricity = Number(metadata.electricityValue ?? 0)
            const total = Number((
                Number(charge.valor)
                - (Number.isFinite(previousWater) ? previousWater : 0)
                - (Number.isFinite(previousElectricity) ? previousElectricity : 0)
                + waterValue
                + electricityValue
            ).toFixed(2))
            const nextMetadata = { ...metadata, waterValue, electricityValue }

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

    revalidatePath(`/locacao/contratos/${leaseId}/editar`)
    if (atualizadas > 0) revalidatePath('/cobrancas')
    revalidatePath('/financeiro')

    return {
        success: true,
        message: 'Dados de Água, Luz e Gás salvos com sucesso.',
        errors: {},
    }
}
