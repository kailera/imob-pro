import { z } from 'zod'

export const addContratoPartySchema = z.object({
    partyId: z.string().optional(),
    personId: z.string().optional(),
    role: z.enum([
        'TENANT',
        'CO_TENANT',
        'LANDLORD',
        'GUARANTOR',
        'SPOUSE',
        'LEGAL_REPRESENTATIVE'
    ]),
    jointlyLiable: z
        .string()
        .optional()
        .transform(value => value === 'true' || value === 'on'),

    category: z.enum(['FISICA', 'JURIDICA']).default('FISICA'),
    name: z.string().min(2, 'Nome / Razão Social é obrigatório'),
    cpfCnpj: z.string().min(11, 'CPF ou CNPJ inválido'),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    secondaryEmail: z.string().email('E-mail secundário inválido').optional().or(z.literal('')),

    // --- Telefones ---
    phonesJson: z.string().optional(), // JSON string de [{ type, phone, observation }]

    // --- Endereço ---
    cep: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    municipio: z.string().optional(),
    estado: z.string().optional(),

    // --- Pessoa Física ---
    birthDate: z.string().optional(),
    rg: z.string().optional(),
    issuingAgency: z.string().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    profession: z.string().optional(),
    nationality: z.string().optional(),
    monthlyIncome: z.string().optional(),
    rne: z.string().optional(),

    // --- Pessoa Jurídica ---
    stateRegistration: z.string().optional(),
    municipalRegistration: z.string().optional(),
    activity: z.string().optional(),
    icmsTaxpayerType: z.string().optional(),
    optantSimples: z.string().optional().transform(v => v === 'true' || v === 'Sim'),

    // --- Responsável Legal (PJ) ---
    legalRepName: z.string().optional(),
    legalRepCpf: z.string().optional(),
    legalRepRg: z.string().optional(),
    legalRepIssuingAgency: z.string().optional(),
    legalRepEmail: z.string().optional(),
    legalRepPhoneMobile: z.string().optional(),
    legalRepPhoneMobileDesc: z.string().optional(),
    legalRepPhoneLandline: z.string().optional(),
    legalRepPhoneLandlineDesc: z.string().optional(),

    // --- Contato Financeiro (PJ) ---
    financialName: z.string().optional(),
    financialEmail: z.string().optional(),
    financialPhoneMobile: z.string().optional(),
    financialPhoneMobileDesc: z.string().optional(),
    financialPhoneLandline: z.string().optional(),
    financialPhoneLandlineDesc: z.string().optional(),
})

export type AddContratoPartyInput = z.infer<typeof addContratoPartySchema>
