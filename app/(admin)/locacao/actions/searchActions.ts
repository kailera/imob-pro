'use server'

import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'

export type PersonSearchResult = {
  id: string
  name: string
  cpfCnpj: string
  email: string | null
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
