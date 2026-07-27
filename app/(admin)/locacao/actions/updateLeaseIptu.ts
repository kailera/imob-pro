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
import { calcularIptuDaCobranca, parseQuantidadeParcelas } from '@/lib/locacao/iptu'

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
    const amountRaw = String(formData.get('amount') ?? '')
    const amount = parseNumeroFlexivel(amountRaw)
    const paymentStartDateRaw = String(formData.get('paymentStartDate') ?? '').trim()
    const paymentStartDate = paymentStartDateRaw
        ? new Date(`${paymentStartDateRaw}T00:00:00.000Z`)
        : null
    const installments = String(formData.get('installments') ?? '').trim() || null
    const errors: Record<string, string[]> = {}
    const hasBillingData = amount != null || paymentStartDate != null || installments != null

    if (hasBillingData) {
        if (amount == null || amount <= 0) errors.amount = ['Informe um valor de IPTU maior que zero.']
        if (!paymentStartDate || Number.isNaN(paymentStartDate.getTime())) {
            errors.paymentStartDate = ['Informe a data inicial do pagamento.']
        }
        if (!parseQuantidadeParcelas(installments)) {
            errors.installments = ['Informe a quantidade de parcelas usando somente números.']
        }
    }
    if (Object.keys(errors).length > 0) {
        return { success: false, message: 'Revise os dados de cobrança do IPTU.', errors }
    }

    const storagePrefix = `leases/${context.tenantId}/${leaseId}/`
    const attachments = parseLeaseAttachmentsFormValue(formData.get('iptuAttachments'), storagePrefix)
    const existingIptu = await prisma.leaseIptu.findUnique({
        where: { leaseId },
        select: { documentUrl: true },
    })
    const previousAttachments = parseLeaseAttachments(existingIptu?.documentUrl)
    const documentUrl = serializeLeaseAttachments(attachments)

    await prisma.$transaction(async tx => {
        const savedIptu = await tx.leaseIptu.upsert({
            where: { leaseId },
            create: {
                leaseId,
                inscription,
                sequentialNumber,
                bookletHolder,
                responsibleParty,
                lastCheckedDate,
                documentUrl,
                amount,
                paymentStartDate,
                installments,
            },
            update: {
                inscription,
                sequentialNumber,
                bookletHolder,
                responsibleParty,
                lastCheckedDate,
                documentUrl,
                amount,
                paymentStartDate,
                installments,
            },
        })

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
            const oldIptu = Number(metadata.iptuValue ?? 0)
            const iptuCharge = calcularIptuDaCobranca(savedIptu, charge.dataVencimento)
            const total = Number((charge.valor - (Number.isFinite(oldIptu) ? oldIptu : 0) + iptuCharge.valor).toFixed(2))
            const nextMetadata = {
                ...metadata,
                iptuValue: iptuCharge.valor,
                iptuInstallment: iptuCharge.numeroParcela,
                iptuInstallments: iptuCharge.quantidadeParcelas,
            }
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
    })

    await deleteRemovedLeaseAttachments(previousAttachments, attachments, storagePrefix)
    revalidatePath(`/locacao/contratos/${leaseId}/editar`)
    revalidatePath('/cobrancas')
    revalidatePath('/financeiro')

    return {
        success: true,
        message: 'Dados de IPTU salvos com sucesso.',
        errors: {},
    }
}
