import { z } from 'zod'

const optionalDate = z.preprocess(
    value => value === '' ? undefined : value,
    z.coerce.date().optional(),
)

const optionalNumber = z.preprocess(
    value => value === '' ? undefined : value,
    z.coerce.number().int().positive().optional(),
)

export const contratoIdentificationSchema = z.object({
    tipoLocacao: z.preprocess(
        value => value === '' ? undefined : value,
        z.enum(['RESIDENCIAL', 'COMERCIAL']).optional(),
    ),
    finalidade: z.string().trim().max(
        1000,
        'A finalidade deve ter no máximo 1000 caracteres',
    ).optional(),
    dataInicio: optionalDate,
    prazoMeses: optionalNumber,
    legacyCode: z.string().trim().max(
        100,
        'O código do SICADI deve ter no máximo 100 caracteres',
    ).optional(),
    billingStartDate: optionalDate,
})

export type ContratoIdentificationInput =
    z.infer<typeof contratoIdentificationSchema>
