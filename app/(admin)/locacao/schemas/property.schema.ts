import { z } from 'zod'

export const contratoPropertySchema = z.object({
    propertyId: z.string().min(1, 'Selecione um imóvel'),
    cep: z.string().transform(value => value.replace(/\D/g, '')).pipe(
        z.string().length(8, 'Informe um CEP válido'),
    ),
    logradouro: z.string().trim().min(2, 'Informe o logradouro'),
    numero: z.coerce.number().int().nonnegative('Informe um número válido'),
    complemento: z.string().trim().optional(),
    bairro: z.string().trim().min(2, 'Informe o bairro'),
    cidade: z.string().trim().min(2, 'Informe a cidade'),
    estado: z.string().trim().length(2, 'Informe a UF com duas letras'),
})
