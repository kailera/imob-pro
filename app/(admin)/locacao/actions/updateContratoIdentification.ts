'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { contratoIdentificationSchema } from '../schemas/contratoIdentification.schema'
import type { ActionState } from '../types/action-state'
import { requireUserContext } from '@/lib/auth'

type IdentificationField =
    | 'tipoLocacao'
    | 'finalidade'
    | 'dataInicio'
    | 'prazoMeses'
    | 'legacyCode'
    | 'billingStartDate'

export type IdentificationActionState = ActionState<IdentificationField>

function calculateInclusiveEndDate(startDate: Date, months: number) {
    const endDate = new Date(startDate)
    endDate.setUTCMonth(endDate.getUTCMonth() + months)
    endDate.setUTCDate(endDate.getUTCDate() - 1)
    return endDate
}

export async function updateContratoIdentification(
    contratoId: string,
    previousState: IdentificationActionState,
    formData: FormData,
): Promise<IdentificationActionState> {
    const context = await requireUserContext()

    const validation = contratoIdentificationSchema.safeParse({
        tipoLocacao: formData.get('tipoLocacao'),
        finalidade: formData.get('finalidade'),
        dataInicio: formData.get('dataInicio'),
        prazoMeses: formData.get('prazoMeses'),
        legacyCode: formData.get('legacyCode'),
        billingStartDate: formData.get('billingStartDate'),
    })

    if (!validation.success) {
        return {
            success: false,
            message: 'Verifique os campos informados.',
            errors: validation.error.flatten().fieldErrors,
        }
    }

    const lease = await prisma.lease.findFirst({
        where: { id: contratoId, tenantId: context.tenantId },
        select: { id: true, migratedAt: true },
    })

    if (!lease) {
        return { success: false, message: 'Contrato não encontrado.', errors: {} }
    }

    const startDate = validation.data.dataInicio ?? null
    const endDate = startDate && validation.data.prazoMeses
        ? calculateInclusiveEndDate(startDate, validation.data.prazoMeses)
        : null
    const billingStartDate = validation.data.billingStartDate ?? null
    const legacyCode = validation.data.legacyCode || null

    if (billingStartDate && startDate && billingStartDate < startDate) {
        return {
            success: false,
            message: 'A geração de cobranças não pode começar antes do contrato.',
            errors: { billingStartDate: ['Informe uma data dentro da vigência do contrato.'] },
        }
    }

    if (billingStartDate && endDate && billingStartDate > endDate) {
        return {
            success: false,
            message: 'A geração de cobranças não pode começar depois do contrato.',
            errors: { billingStartDate: ['Informe uma data dentro da vigência do contrato.'] },
        }
    }

    if (legacyCode) {
        const duplicate = await prisma.lease.findFirst({
            where: {
                tenantId: context.tenantId,
                legacySystem: 'SICADI',
                legacyCode,
                NOT: { id: contratoId },
            },
            select: { id: true },
        })

        if (duplicate) {
            return {
                success: false,
                message: 'Já existe um contrato com este código do SICADI.',
                errors: { legacyCode: ['Use o código original de um contrato ainda não cadastrado.'] },
            }
        }
    }

    const rentalType = validation.data.tipoLocacao
        ? validation.data.tipoLocacao === 'RESIDENCIAL' ? 'RESIDENTIAL' : 'COMMERCIAL'
        : null

    await prisma.lease.update({
        where: { id: lease.id },
        data: {
            rentalType,
            purpose: validation.data.finalidade || null,
            startDate,
            endDate,
            legacySystem: legacyCode ? 'SICADI' : null,
            legacyCode,
            migratedAt: legacyCode ? lease.migratedAt ?? new Date() : null,
            billingStartDate,
            version: { increment: 1 },
        },
    })

    revalidatePath(`/locacao/contratos/${contratoId}/editar`)
    revalidatePath('/locacao')

    return {
        success: true,
        message: 'Identificação salva com sucesso.',
        errors: {},
    }
}
