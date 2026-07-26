'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { contratoPropertySchema } from '../schemas/property.schema'
import type { ActionState } from '../types/action-state'
import { requireUserContext } from '@/lib/auth'

type PropertyField =
    | 'propertyId'
    | 'cep'
    | 'logradouro'
    | 'numero'
    | 'complemento'
    | 'bairro'
    | 'cidade'
    | 'estado'

export type PropertyActionState = ActionState<PropertyField>

export async function updateContratoProperty(
    contratoId: string,
    previousState: PropertyActionState,
    formData: FormData,
): Promise<PropertyActionState> {
    const context = await requireUserContext()

    const validation = contratoPropertySchema.safeParse(Object.fromEntries(formData))
    if (!validation.success) {
        return {
            success: false,
            message: 'Revise o imóvel e o endereço informados.',
            errors: validation.error.flatten().fieldErrors,
        }
    }

    const property = await prisma.imovel.findFirst({
        where: {
            id: validation.data.propertyId,
            imobId: context.tenantId,
        },
        select: { id: true },
    })

    if (!property) {
        return {
            success: false,
            message: 'Imóvel não encontrado.',
            errors: { propertyId: ['Imóvel inválido ou sem permissão.'] },
        }
    }

    const lease = await prisma.lease.findFirst({
        where: { id: contratoId, tenantId: context.tenantId },
        select: { id: true },
    })
    if (!lease) {
        return { success: false, message: 'Contrato não encontrado.', errors: {} }
    }

    await prisma.$transaction([
        prisma.imovel.update({
            where: { id: property.id },
            data: {
                cep: Number(validation.data.cep),
                logradouro: validation.data.logradouro,
                numero: validation.data.numero,
                complemento: validation.data.complemento || null,
                bairro: validation.data.bairro,
                cidade: validation.data.cidade,
                uf: validation.data.estado.toUpperCase(),
            },
        }),
        prisma.lease.update({
            where: { id: lease.id },
            data: {
                propertyId: property.id,
                version: { increment: 1 },
            },
        }),
    ])

    revalidatePath(`/locacao/contratos/${contratoId}/editar`)
    revalidatePath('/locacao')

    return {
        success: true,
        message: 'Imóvel e endereço salvos com sucesso.',
        errors: {},
    }
}
