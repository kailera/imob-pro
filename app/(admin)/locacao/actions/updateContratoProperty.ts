'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { contratoPropertySchema } from '../schemas/property.schema'
import type { ActionState } from '../types/action-state'
import { requireUserContext } from '@/lib/auth'

type PropertyField =
    | 'propertyId'
    | 'tipo'
    | 'cep'
    | 'logradouro'
    | 'numero'
    | 'complemento'
    | 'bairro'
    | 'cidade'
    | 'estado'

export type PropertyActionState = ActionState<PropertyField>

async function gerarCodigoImovel() {
    const imoveis = await prisma.imovel.findMany({ select: { codigo: true } })
    const maiorNumero = imoveis.reduce((maior, imovel) => {
        const match = /^IMB-(\d+)$/i.exec(imovel.codigo)
        return match ? Math.max(maior, Number(match[1])) : maior
    }, 0)
    return `IMB-${String(maiorNumero + 1).padStart(5, '0')}`
}

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

    const lease = await prisma.lease.findFirst({
        where: { id: contratoId, tenantId: context.tenantId },
        select: { id: true },
    })
    if (!lease) {
        return { success: false, message: 'Contrato não encontrado.', errors: {} }
    }

    const property = validation.data.propertyId
        ? await prisma.imovel.findFirst({
            where: {
                id: validation.data.propertyId,
                imobId: context.tenantId,
            },
            select: { id: true },
        })
        : null

    if (validation.data.propertyId && !property) {
        return {
            success: false,
            message: 'Imóvel não encontrado.',
            errors: { propertyId: ['Imóvel inválido ou sem permissão.'] },
        }
    }

    const codigoNovoImovel = property ? null : await gerarCodigoImovel()
    await prisma.$transaction(async tx => {
        const endereco = {
            cep: Number(validation.data.cep),
            logradouro: validation.data.logradouro,
            numero: validation.data.numero,
            complemento: validation.data.complemento || null,
            bairro: validation.data.bairro,
            cidade: validation.data.cidade,
            uf: validation.data.estado.toUpperCase(),
            tipo: validation.data.tipo,
        }
        const savedProperty = property
            ? await tx.imovel.update({
                where: { id: property.id },
                data: endereco,
                select: { id: true },
            })
            : await tx.imovel.create({
                data: {
                    ...endereco,
                    codigo: codigoNovoImovel!,
                    imobId: context.tenantId,
                    forLocacao: true,
                    titulo: `${validation.data.logradouro}, ${validation.data.numero}`,
                },
                select: { id: true },
            })

        await tx.lease.update({
            where: { id: lease.id },
            data: {
                propertyId: savedProperty.id,
                version: { increment: 1 },
            },
        })
    })

    revalidatePath(`/locacao/contratos/${contratoId}/editar`)
    revalidatePath('/locacao')

    return {
        success: true,
        message: property
            ? 'Imóvel e endereço atualizados com sucesso.'
            : `Novo imóvel ${codigoNovoImovel} criado e vinculado ao contrato.`,
        errors: {},
    }
}
