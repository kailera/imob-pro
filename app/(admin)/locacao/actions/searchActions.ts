'use server'

import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'

export type PersonSearchResult = {
  id: string
  name: string
  cpfCnpj: string
  email: string | null
}

export type PersonDocumentResult = {
  category: 'FISICA' | 'JURIDICA'
  values: Record<string, string>
  phones: Array<{ id: string; type: string; phone: string; observation: string }>
  address: { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; municipio: string; estado: string } | null
}

export async function findPersonByCpfCnpj(document: string): Promise<PersonDocumentResult | null> {
  const cpfCnpj = document.replace(/\D/g, '')
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) return null

  const context = await requireUserContext()
  const person = await prisma.person.findFirst({
    where: { imobId: context.tenantId, cpfCnpj },
    include: { phones: true, addresses: { take: 1 } },
  })
  if (!person) return null

  const values: Record<string, string> = {
    cpfCnpj: person.cpfCnpj,
    name: person.name,
    email: person.email ?? '',
    secondaryEmail: person.secondaryEmail ?? '',
    birthDate: person.birthDate?.toISOString().slice(0, 10) ?? '',
    rg: person.rg ?? '', issuingAgency: person.issuingAgency ?? '',
    nationality: person.nationality ?? '', profession: person.profession ?? '',
    maritalStatus: person.maritalStatus ?? '', gender: person.gender ?? '',
    monthlyIncome: person.monthlyIncome?.toString() ?? '', rne: person.rne ?? '',
    stateRegistration: person.stateRegistration ?? '', municipalRegistration: person.municipalRegistration ?? '',
    activity: person.activity ?? '', icmsTaxpayerType: person.icmsTaxpayerType ?? '',
    optantSimples: person.optantSimples === false ? 'Nao' : 'Sim',
    legalRepName: person.legalRepName ?? '', legalRepCpf: person.legalRepCpf ?? '',
    legalRepRg: person.legalRepRg ?? '', legalRepIssuingAgency: person.legalRepIssuingAgency ?? '',
    legalRepEmail: person.legalRepEmail ?? '', legalRepPhoneMobile: person.legalRepPhoneMobile ?? '',
    legalRepPhoneMobileDesc: person.legalRepPhoneMobileDesc ?? '', legalRepPhoneLandline: person.legalRepPhoneLandline ?? '',
    legalRepPhoneLandlineDesc: person.legalRepPhoneLandlineDesc ?? '', financialName: person.financialName ?? '',
    financialEmail: person.financialEmail ?? '', financialPhoneMobile: person.financialPhoneMobile ?? '',
    financialPhoneMobileDesc: person.financialPhoneMobileDesc ?? '', financialPhoneLandline: person.financialPhoneLandline ?? '',
    financialPhoneLandlineDesc: person.financialPhoneLandlineDesc ?? '',
  }
  const address = person.addresses[0]
  return {
    category: person.category,
    values,
    phones: person.phones.map(phone => ({ id: phone.id, type: phone.type, phone: phone.phone, observation: phone.observation ?? '' })),
    address: address ? {
      cep: address.cep, logradouro: address.logradouro, numero: address.numero,
      complemento: address.complemento ?? '', bairro: address.bairro,
      municipio: address.municipio, estado: address.estado,
    } : null,
  }
}

export type PropertySearchResult = {
  id: string
  codigo: string
  logradouro: string | null
  numero: number
  bairro: string
  cidade: string
  uf: string
}

export async function searchPersons(query: string): Promise<PersonSearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const context = await requireUserContext()
  const q = query.trim()

  const persons = await prisma.person.findMany({
    where: {
      imobId: context.tenantId,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { cpfCnpj: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      cpfCnpj: true,
      email: true,
    },
    take: 10,
    orderBy: { name: 'asc' },
  })

  return persons
}

export async function searchProperties(query: string): Promise<PropertySearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const context = await requireUserContext()
  const q = query.trim()

  const properties = await prisma.imovel.findMany({
    where: {
      imobId: context.tenantId,
      OR: [
        { codigo: { contains: q, mode: 'insensitive' } },
        { logradouro: { contains: q, mode: 'insensitive' } },
        { bairro: { contains: q, mode: 'insensitive' } },
        { cidade: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      codigo: true,
      logradouro: true,
      numero: true,
      bairro: true,
      cidade: true,
      uf: true,
    },
    take: 10,
    orderBy: { codigo: 'asc' },
  })

  return properties
}
