'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'
import { sincronizarPeriodoInicialLease } from '@/lib/locacao/sincronizarPeriodoInicialLease'

export async function finalizeContrato(contratoId: string) {
    const context = await requireUserContext()

    const scopedLease = await prisma.lease.findFirst({
        where: { id: contratoId, tenantId: context.tenantId },
        select: { id: true },
    })
    if (!scopedLease) {
        return { success: false, message: 'Contrato não encontrado.' }
    }
    await sincronizarPeriodoInicialLease(scopedLease.id)

    const lease = await prisma.lease.findFirst({
        where: {
            id: contratoId,
            tenantId: context.tenantId,
        },
        include: {
            parties: { select: { role: true } },
            terms: true,
            termsPeriods: { orderBy: { effectiveFrom: 'asc' } },
        },
    })

    if (!lease) {
        return { success: false, message: 'Contrato não encontrado.' }
    }

    const missing: string[] = []
    if (!lease.rentalType) missing.push('tipo da locação')
    if (!lease.propertyId) missing.push('imóvel')
    if (!lease.startDate || !lease.endDate) missing.push('vigência')
    if (!lease.parties.some(party => party.role === 'TENANT')) missing.push('locatário principal')
    if (!lease.parties.some(party => party.role === 'LANDLORD')) missing.push('locador')
    if (!lease.terms || Number(lease.terms.rentValue) <= 0) missing.push('controle locatício')
    if (lease.legacyCode && lease.termsPeriods.length === 0) missing.push('períodos do contrato legado')
    if (lease.legacyCode && !lease.billingStartDate) missing.push('data de início das cobranças')

    if (missing.length > 0) {
        return {
            success: false,
            message: `Complete antes de ativar: ${missing.join(', ')}.`,
        }
    }

    if (lease.legacyCode && lease.termsPeriods.some(period => period.reviewStatus !== 'REVIEWED')) {
        return {
            success: false,
            message: 'Confira todos os períodos com o SICADI antes de ativar o contrato.',
        }
    }

    if (lease.billingStartDate && lease.termsPeriods.length > 0) {
        const covered = lease.termsPeriods.some(period =>
            lease.billingStartDate! >= period.effectiveFrom
            && (!period.effectiveTo || lease.billingStartDate! < period.effectiveTo),
        )
        if (!covered) {
            return {
                success: false,
                message: 'A data inicial das cobranças não está coberta por um período locatício.',
            }
        }
    }

    await prisma.lease.update({
        where: { id: lease.id },
        data: {
            status: 'ACTIVE',
            reviewedAt: new Date(),
            version: { increment: 1 },
        },
    })

    revalidatePath(`/locacao/contratos/${contratoId}/editar`)
    revalidatePath('/locacao')
    return { success: true, message: 'Contrato conferido e ativado com sucesso.' }
}
