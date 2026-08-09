'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { addContratoPartySchema } from '../schemas/party.schema'
import type { ActionState } from '../types/action-state'
import { requireUserContext } from '@/lib/auth'
import { LeasePartyRole, PersonCategory, PersonType } from '@/generated/prisma'
import { parseNumeroFlexivel } from '@/lib/locacao/financeiro'

export type AddPartyActionState = ActionState<string>

type PhonePayload = {
    phone?: string
    numero?: string
    type?: string
    tipo?: string
    observation?: string
    observacao?: string
}

function isPhonePayload(value: unknown): value is PhonePayload {
    return typeof value === 'object' && value !== null
}

export async function addContratoParty(
    contratoId: string,
    previousState: AddPartyActionState,
    formData: FormData,
): Promise<AddPartyActionState> {
    const context = await requireUserContext()

    const rawData = Object.fromEntries(formData.entries())
    const validation = addContratoPartySchema.safeParse(rawData)

    if (!validation.success) {
        return {
            success: false,
            message: 'Verifique os dados informados.',
            errors: validation.error.flatten().fieldErrors,
        }
    }

    const data = validation.data

    const lease = await prisma.lease.findFirst({
        where: {
            id: contratoId,
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

    const existingParty = data.partyId
        ? await prisma.leaseParty.findFirst({
            where: {
                id: data.partyId,
                leaseId: contratoId,
                lease: { tenantId: context.tenantId },
            },
            select: { id: true, personId: true },
        })
        : null

    if (data.partyId && !existingParty) {
        return { success: false, message: 'Participante não encontrado.', errors: {} }
    }

    let personId = data.personId

    if (!personId) {
        const cleanedCpfCnpj = data.cpfCnpj.replace(/\D/g, '')

        // Verificar se pessoa já existe pelo CPF/CNPJ na mesma Imob
        const existingPerson = existingParty
            ? await prisma.person.findFirst({
                where: { id: existingParty.personId, imobId: context.tenantId },
            })
            : await prisma.person.findFirst({
                where: {
                    imobId: context.tenantId,
                    cpfCnpj: cleanedCpfCnpj,
                },
            })

        const personTypeMap: Record<LeasePartyRole, PersonType> = {
            LANDLORD: PersonType.LOCADOR,
            TENANT: PersonType.LOCATARIO,
            CO_TENANT: PersonType.LOCATARIO,
            GUARANTOR: PersonType.FIADOR,
            SPOUSE: PersonType.LOCATARIO,
            LEGAL_REPRESENTATIVE: PersonType.LOCATARIO,
        }

        const role = data.role as LeasePartyRole
        const pType = personTypeMap[role]

        const birthDate = data.birthDate ? new Date(data.birthDate) : null
        const monthlyIncome = parseNumeroFlexivel(data.monthlyIncome)

        if (existingPerson) {
            personId = existingPerson.id
            await prisma.person.update({
                where: { id: personId },
                data: {
                    name: data.name,
                    cpfCnpj: cleanedCpfCnpj,
                    category: data.category as PersonCategory,
                    secondaryEmail: data.secondaryEmail || null,
                    email: data.email || null,
                    rg: data.rg || null,
                    issuingAgency: data.issuingAgency || null,
                    birthDate,
                    nationality: data.nationality || null,
                    profession: data.profession || null,
                    maritalStatus: data.maritalStatus || null,
                    gender: data.gender || null,
                    monthlyIncome,
                    rne: data.rne || null,

                    stateRegistration: data.stateRegistration || null,
                    municipalRegistration: data.municipalRegistration || null,
                    activity: data.activity || null,
                    icmsTaxpayerType: data.icmsTaxpayerType || null,
                    optantSimples: data.optantSimples ?? null,

                    legalRepName: data.legalRepName || null,
                    legalRepCpf: data.legalRepCpf ? data.legalRepCpf.replace(/\D/g, '') : null,
                    legalRepRg: data.legalRepRg || null,
                    legalRepIssuingAgency: data.legalRepIssuingAgency || null,
                    legalRepEmail: data.legalRepEmail || null,
                    legalRepPhoneMobile: data.legalRepPhoneMobile || null,
                    legalRepPhoneMobileDesc: data.legalRepPhoneMobileDesc || null,
                    legalRepPhoneLandline: data.legalRepPhoneLandline || null,
                    legalRepPhoneLandlineDesc: data.legalRepPhoneLandlineDesc || null,

                    financialName: data.financialName || null,
                    financialEmail: data.financialEmail || null,
                    financialPhoneMobile: data.financialPhoneMobile || null,
                    financialPhoneMobileDesc: data.financialPhoneMobileDesc || null,
                    financialPhoneLandline: data.financialPhoneLandline || null,
                    financialPhoneLandlineDesc: data.financialPhoneLandlineDesc || null,
                    ...(role === LeasePartyRole.LANDLORD ? {
                        bankName: data.bankName || null,
                        bankAgency: data.bankAgency || null,
                        bankAccount: data.bankAccount || null,
                        pixKey: data.pixKey || null,
                    } : {}),
                },
            })
        } else {
            const newPerson = await prisma.person.create({
                data: {
                    imobId: context.tenantId,
                    type: pType,
                    category: data.category as PersonCategory,
                    name: data.name,
                    cpfCnpj: cleanedCpfCnpj,
                    secondaryEmail: data.secondaryEmail || null,
                    email: data.email || null,
                    rg: data.rg || null,
                    issuingAgency: data.issuingAgency || null,
                    birthDate,
                    nationality: data.nationality || null,
                    profession: data.profession || null,
                    maritalStatus: data.maritalStatus || null,
                    gender: data.gender || null,
                    monthlyIncome,
                    rne: data.rne || null,

                    stateRegistration: data.stateRegistration || null,
                    municipalRegistration: data.municipalRegistration || null,
                    activity: data.activity || null,
                    icmsTaxpayerType: data.icmsTaxpayerType || null,
                    optantSimples: data.optantSimples ?? null,

                    legalRepName: data.legalRepName || null,
                    legalRepCpf: data.legalRepCpf ? data.legalRepCpf.replace(/\D/g, '') : null,
                    legalRepRg: data.legalRepRg || null,
                    legalRepIssuingAgency: data.legalRepIssuingAgency || null,
                    legalRepEmail: data.legalRepEmail || null,
                    legalRepPhoneMobile: data.legalRepPhoneMobile || null,
                    legalRepPhoneMobileDesc: data.legalRepPhoneMobileDesc || null,
                    legalRepPhoneLandline: data.legalRepPhoneLandline || null,
                    legalRepPhoneLandlineDesc: data.legalRepPhoneLandlineDesc || null,

                    financialName: data.financialName || null,
                    financialEmail: data.financialEmail || null,
                    financialPhoneMobile: data.financialPhoneMobile || null,
                    financialPhoneMobileDesc: data.financialPhoneMobileDesc || null,
                    financialPhoneLandline: data.financialPhoneLandline || null,
                    financialPhoneLandlineDesc: data.financialPhoneLandlineDesc || null,
                    ...(role === LeasePartyRole.LANDLORD ? {
                        bankName: data.bankName || null,
                        bankAgency: data.bankAgency || null,
                        bankAccount: data.bankAccount || null,
                        pixKey: data.pixKey || null,
                    } : {}),
                },
            })
            personId = newPerson.id
        }

        // Salvar Endereço se informado
        await prisma.personAddress.deleteMany({ where: { personId: personId! } })
        if (data.cep || data.logradouro) {
            await prisma.personAddress.create({
                data: {
                    personId: personId!,
                    cep: data.cep || '',
                    logradouro: data.logradouro || '',
                    numero: data.numero || 'S/N',
                    complemento: data.complemento || null,
                    bairro: data.bairro || '',
                    municipio: data.municipio || '',
                    estado: data.estado || '',
                },
            })
        }

        // Salvar Telefones do JSON se informado
        await prisma.personPhone.deleteMany({ where: { personId: personId! } })
        if (data.phonesJson) {
            try {
                const phones: unknown = JSON.parse(data.phonesJson)
                if (Array.isArray(phones)) {
                    for (const p of phones) {
                        if (isPhonePayload(p)) {
                            const phoneNumber = p.phone || p.numero
                            if (!phoneNumber) continue
                            await prisma.personPhone.create({
                                data: {
                                    personId: personId!,
                                    phone: phoneNumber,
                                    type: p.type || p.tipo || 'CELULAR',
                                    observation: p.observation || p.observacao || null,
                                },
                            })
                        }
                    }
                }
            } catch (err) {
                console.warn('Erro ao parsear phonesJson:', err)
            }
        }
    }

    if (existingParty) {
        await prisma.leaseParty.update({
            where: { id: existingParty.id },
            data: {
                personId: personId!,
                role: data.role as LeasePartyRole,
                jointlyLiable: data.jointlyLiable ?? false,
            },
        })
    } else {
        await prisma.leaseParty.upsert({
            where: {
                leaseId_personId_role: {
                    leaseId: contratoId,
                    personId: personId!,
                    role: data.role as LeasePartyRole,
                },
            },
            create: {
                leaseId: contratoId,
                personId: personId!,
                role: data.role as LeasePartyRole,
                jointlyLiable: data.jointlyLiable ?? false,
            },
            update: {
                jointlyLiable: data.jointlyLiable ?? false,
            },
        })
    }

    revalidatePath(`/locacao/contratos/${contratoId}/editar`)

    return {
        success: true,
        message: 'Participante salvo e vinculado com sucesso.',
        errors: {},
    }
}

export async function removeContratoParty(
    contratoId: string,
    partyId: string,
): Promise<{ success: boolean; message: string }> {
    const context = await requireUserContext()

    const party = await prisma.leaseParty.findFirst({
        where: {
            id: partyId,
            lease: {
                id: contratoId,
                tenantId: context.tenantId,
            },
        },
    })

    if (!party) {
        return { success: false, message: 'Participante não encontrado.' }
    }

    await prisma.leaseParty.delete({
        where: { id: partyId },
    })

    revalidatePath(`/locacao/contratos/${contratoId}/editar`)

    return { success: true, message: 'Participante removido.' }
}
