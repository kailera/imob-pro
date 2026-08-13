'use server'

import { Prisma } from '@/generated/prisma'
import { revalidatePath } from 'next/cache'
import { requireUserContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteRemovedLeaseAttachments } from '@/lib/locacao/anexos.server'
import {
  guaranteeAttachmentsFromDetails,
  guaranteeDetailsFromForm,
  isLeaseGuaranteeType,
} from '@/lib/locacao/garantia'

export type GuaranteeActionState = {
  success: boolean
  message: string | null
  errors: Record<string, string[]>
}

export async function updateLeaseGuarantee(
  leaseId: string,
  _previousState: GuaranteeActionState,
  formData: FormData,
): Promise<GuaranteeActionState> {
  const context = await requireUserContext()
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, tenantId: context.tenantId },
    select: {
      id: true,
      terms: { select: { rentValue: true } },
      guarantee: { select: { details: true } },
    },
  })
  if (!lease) return failure('Contrato não encontrado.')

  const storagePrefix = `leases/${context.tenantId}/${leaseId}/`
  const previousAttachments = guaranteeAttachmentsFromDetails(lease.guarantee?.details)
  const rawType = String(formData.get('type') ?? '')

  if (!rawType || rawType === 'NONE') {
    await prisma.leaseGuarantee.deleteMany({ where: { leaseId } })
    await deleteRemovedLeaseAttachments(previousAttachments, [], storagePrefix)
    revalidateLease(leaseId)
    return { success: true, message: 'Garantia removida do contrato.', errors: {} }
  }

  if (!isLeaseGuaranteeType(rawType)) return failure('Modalidade de garantia inválida.')

  const details = guaranteeDetailsFromForm(rawType, formData, storagePrefix)
  const errors: Record<string, string[]> = {}
  if (rawType === 'CASH_DEPOSIT' && typeof details.amount === 'number' && lease.terms?.rentValue) {
    const maximum = Number(lease.terms.rentValue) * 3
    if (details.amount > maximum) {
      errors.cashAmount = [`A caução em dinheiro não pode superar três aluguéis (R$ ${maximum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`]
    }
  }
  if (Object.keys(errors).length) {
    return { success: false, message: 'Revise os dados da garantia.', errors }
  }

  const detailsJson = JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue

  await prisma.leaseGuarantee.upsert({
    where: { leaseId },
    create: { leaseId, type: rawType, details: detailsJson },
    update: { type: rawType, details: detailsJson },
  })

  const currentAttachments = guaranteeAttachmentsFromDetails(details)
  await deleteRemovedLeaseAttachments(previousAttachments, currentAttachments, storagePrefix)
  revalidateLease(leaseId)
  return { success: true, message: 'Garantia locatícia salva com sucesso.', errors: {} }
}

function revalidateLease(leaseId: string) {
  revalidatePath(`/locacao/contratos/${leaseId}/editar`)
  revalidatePath(`/locacao/view-locacao/${leaseId}`)
}

function failure(message: string): GuaranteeActionState {
  return { success: false, message, errors: {} }
}
