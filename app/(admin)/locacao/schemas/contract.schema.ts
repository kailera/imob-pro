import { z } from "zod"

export const CreateContratoSchema = z.object({
    rentalType: z.preprocess(
        value => {
            if (value === null || value === undefined || value === '') return undefined
            if (typeof value !== 'string') return value
            const upper = value.trim().toUpperCase()
            if (upper === 'RESIDENCIAL') return 'RESIDENTIAL'
            if (upper === 'COMERCIAL') return 'COMMERCIAL'
            return upper
        },
        z.enum(['RESIDENTIAL', 'COMMERCIAL']).optional(),
    ),
    propertyId: z.string().trim().optional(),
    purpose: z.string().trim().max(
        1000,
        'A finalidade deve ter no máximo 1000 caracteres',
    ).optional(),
})

export type CreateContratoFormData = z.infer<typeof CreateContratoSchema>
