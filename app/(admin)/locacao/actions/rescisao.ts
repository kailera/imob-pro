'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'
import { type ExitNotice, type ExitReview, parseExitDate, parseExitNotice, proportionalRent, todayBrazil, validateExitReview } from '@/lib/locacao/rescisao'
import { generateExitDocument } from '@/lib/locacao/rescisao-documento'

function refresh(id: string) {
  for (const url of ['/locacao', '/locacao/inativos', `/locacao/view-locacao/${id}`, `/locacao/contratos/${id}/editar`]) revalidatePath(url)
}

export async function comunicarSaida(id: string, expectedDate: string, noDebts: boolean) {
  const context = await requireUserContext()
  try {
    const date = parseExitDate(expectedDate)
    if (typeof noDebts !== 'boolean') throw new Error('Confirmação de débitos inválida.')
    if (expectedDate < todayBrazil()) throw new Error('A data prevista de saída não pode ser anterior a hoje.')
    const lease = await prisma.lease.findFirst({ where: { id, tenantId: context.tenantId }, include: { property: true, parties: { include: { person: true }, orderBy: { createdAt: 'asc' } } } })
    if (!lease || lease.status !== 'ACTIVE') throw new Error('Somente contratos ativos podem comunicar a saída.')
    if (lease.exitNotice) throw new Error('Este contrato já possui um comunicado. Atualize a página.')
    if (!lease.startDate || date < lease.startDate) throw new Error('A saída deve ser posterior ou igual ao início do contrato.')
    const tenants = lease.parties.filter(p => p.role === 'TENANT' || p.role === 'CO_TENANT')
    const landlords = lease.parties.filter(p => p.role === 'LANDLORD')
    const property = lease.property
    if (!tenants.length || !landlords.length || !property?.logradouro || !property.cidade) throw new Error('Complete os locatários, o locador e o endereço do imóvel no contrato antes de emitir o comunicado.')
    const agency = context.user.imob
    const notice: ExitNotice = {
      schemaVersion: 1, expectedDate, issuedDate: todayBrazil(), createdAt: new Date().toISOString(), createdBy: context.userId,
      fields: {
        landlord: landlords.map(p => `${p.person.name}, CPF/CNPJ ${p.person.cpfCnpj}`).join('; '),
        tenant: tenants.map(p => p.person.name).join(' / '),
        property: [property.logradouro, property.numero, property.complemento, property.bairro, property.cidade, property.uf].filter(v => v !== null && v !== undefined && v !== '').join(', '),
        agency: agency.nomeFantasia || agency.razaoSocial || 'IMOBILIÁRIA SCATOLIN IMÓVEIS',
        agencyAddress: agency.logradouro ? [agency.logradouro, agency.numero, agency.complemento, agency.cidade, agency.uf].filter(Boolean).join(', ') : 'Passeio Cristalina, nº 113, Ilha Solteira - SP',
        city: agency.cidade || property.cidade, noDebts,
      },
    }
    // Verifica ambos os formatos antes de persistir a comunicação.
    await generateExitDocument(notice, 'docx')
    await generateExitDocument(notice, 'pdf')
    const updated = await prisma.lease.updateMany({ where: { id, tenantId: context.tenantId, status: 'ACTIVE', version: lease.version }, data: { exitNotice: notice, version: { increment: 1 } } })
    if (updated.count !== 1) throw new Error('O contrato foi alterado. Atualize a página antes de tentar novamente.')
    refresh(id)
    return { success: true, message: 'Saída comunicada. Word e PDF disponíveis para download.' }
  } catch (error) {
    console.error('Falha ao comunicar saída:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Não foi possível comunicar a saída.' }
  }
}

export async function confirmarRescisao(id: string, actualDate: string, review: ExitReview, basis: 'calendar' | '30') {
  const context = await requireUserContext()
  try {
    const date = parseExitDate(actualDate)
    if (actualDate > todayBrazil()) throw new Error('A confirmação exige uma data efetiva de saída até hoje.')
    if (basis !== '30') throw new Error('O aluguel proporcional deve usar o divisor fixo de 30 dias.')
    validateExitReview(review)
    await prisma.$transaction(async tx => {
      const lease = await tx.lease.findFirst({ where: { id, tenantId: context.tenantId }, include: { termsPeriods: true } })
      if (!lease || lease.status !== 'ACTIVE') throw new Error('Contrato não está ativo para rescisão.')
      const notice = parseExitNotice(lease.exitNotice)
      if (!notice || notice.confirmed) throw new Error('É necessário comunicar a saída antes de confirmar a rescisão.')
      if (!lease.startDate || date < lease.startDate || actualDate < notice.issuedDate) throw new Error('A saída efetiva não pode anteceder o contrato ou o comunicado.')
      // O banco guarda o fim exclusivo; o formulário e o cálculo usam o último dia incluído.
      const calculatedRent = proportionalRent(actualDate, lease.startDate.toISOString().slice(0, 10), lease.termsPeriods.map(p => ({ effectiveFrom: p.effectiveFrom.toISOString().slice(0, 10), effectiveTo: p.effectiveTo ? new Date(p.effectiveTo.getTime() - 86_400_000).toISOString().slice(0, 10) : null, rentAmount: Number(p.rentAmount) })), basis)
      if (Math.abs(review.rent.amount - calculatedRent) > 0.009 && !review.rent.notes.trim()) throw new Error('Explique nas observações o ajuste no aluguel proporcional.')
      const updated = await tx.lease.updateMany({ where: { id, tenantId: context.tenantId, status: 'ACTIVE', version: lease.version }, data: { status: 'TERMINATED', version: { increment: 1 }, exitNotice: { ...notice, confirmed: { date: actualDate, at: new Date().toISOString(), by: context.userId, review, rentBasis: basis, calculatedRent } } } })
      if (updated.count !== 1) throw new Error('O contrato foi alterado. Atualize a página antes de tentar novamente.')
    })
    refresh(id)
    return { success: true, message: 'Rescisão confirmada e revisão das contas registrada. As cobranças existentes permanecem no financeiro para acerto.' }
  } catch (error) {
    console.error('Falha ao confirmar rescisão:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Não foi possível confirmar a rescisão.' }
  }
}
