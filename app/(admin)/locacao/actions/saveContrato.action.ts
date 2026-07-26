"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireUserContext } from "@/lib/auth"
import { CreateContratoSchema } from "../schemas/contract.schema"

export type SaveContratoState = {
    success: boolean
    message: string | null
    errors: {
        rentalType?: string[]
        purpose?: string[]
        propertyId?: string[]
    }
}

export async function saveContrato(prevState: SaveContratoState, formData: FormData): Promise<SaveContratoState> {
    const context = await requireUserContext()

    const validation = CreateContratoSchema.safeParse({
        rentalType: formData.get('rentalType'),
        purpose: formData.get('purpose') || undefined,
        propertyId: formData.get('propertyId') || undefined,
    })

    if (!validation.success) {
        return {
            success: false,
            message: 'Verifique os campos informados.',
            errors: validation.error.flatten().fieldErrors,
        }
    }

    const count = await prisma.lease.count({
        where: { tenantId: context.tenantId }
    })
    const code = `LOC-${(count + 1).toString().padStart(4, '0')}`

    const lease = await prisma.lease.create({
        data: {
            tenantId: context.tenantId,
            code,
            status: 'DRAFT',
            rentalType: validation.data.rentalType as any,
            purpose: validation.data.purpose,
            propertyId: validation.data.propertyId,
        }
    })

    redirect(`/locacao/contratos/${lease.id}/editar`)
}