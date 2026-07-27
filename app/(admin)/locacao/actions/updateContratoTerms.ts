'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'
import { parseNumeroFlexivel } from '@/lib/locacao/financeiro'
import type { ActionState } from '../types/action-state'
import { sincronizarPeriodoInicialLease } from '@/lib/locacao/sincronizarPeriodoInicialLease'

export type TermsActionState = ActionState<string>

export async function updateContratoTerms(
    contratoId: string,
    previousState: TermsActionState,
    formData: FormData,
): Promise<TermsActionState> {
    const context = await requireUserContext()

    const lease = await prisma.lease.findFirst({
        where: { id: contratoId, tenantId: context.tenantId },
        select: { id: true },
    })

    if (!lease) {
        return { success: false, message: 'Contrato não encontrado.', errors: {} }
    }

    const parseNum = (val: FormDataEntryValue | null) => (
        val && typeof val === 'string' ? parseNumeroFlexivel(val) : null
    )
    const parseIntNum = (val: FormDataEntryValue | null) => {
        const parsed = val && typeof val === 'string' ? parseNumeroFlexivel(val) : null
        return parsed === null ? null : Math.trunc(parsed)
    }
    const parseDate = (val: FormDataEntryValue | null) => (val && typeof val === 'string' && val.trim() !== '') ? new Date(val) : null
    const parseStr = (val: FormDataEntryValue | null) => (val && typeof val === 'string') ? val.trim() : null

    const contractMonths = parseIntNum(formData.get('contractMonths')) ?? 30
    const contractPenaltyValue = parseNum(formData.get('contractPenaltyValue'))
    const contractPenaltyType = parseStr(formData.get('contractPenaltyType')) || 'PERCENT'
    const penaltyBeforeDate = parseDate(formData.get('penaltyBeforeDate'))
    const readjustmentPeriodM = parseIntNum(formData.get('readjustmentPeriodM')) ?? 12
    const readjustmentIndex = parseStr(formData.get('readjustmentIndex')) || 'IGP-M'

    const rentValue = parseNum(formData.get('rentValue')) ?? 0
    const paymentDueDay = parseIntNum(formData.get('paymentDueDay')) ?? 10
    const firstPeriodStartDate = parseDate(formData.get('firstPeriodStartDate'))
    const firstPeriodEndDay = parseStr(formData.get('firstPeriodEndDay'))
    const firstPeriodDueDate = parseDate(formData.get('firstPeriodDueDate'))
    const nextReadjustmentDate = parseDate(formData.get('nextReadjustmentDate'))

    const earlyPaymentDiscount = parseNum(formData.get('earlyPaymentDiscount'))
    const discountType = parseStr(formData.get('discountType')) || 'PERCENT'
    const discountDaysBefore = parseIntNum(formData.get('discountDaysBefore')) ?? 1

    const lateFeePercentage = parseNum(formData.get('lateFeePercentage')) ?? 10
    const lateFeeDays = parseIntNum(formData.get('lateFeeDays')) ?? 1
    const lateInterestMonthly = parseNum(formData.get('lateInterestMonthly')) ?? 1
    const lateInterestDays = parseIntNum(formData.get('lateInterestDays')) ?? 1
    const lawyerFeePercentage = parseNum(formData.get('lawyerFeePercentage')) ?? 100
    const lawyerFeeGraceDays = parseIntNum(formData.get('lawyerFeeGraceDays')) ?? 90

    const transferGraceDays = parseIntNum(formData.get('transferGraceDays')) ?? 10
    const guaranteedPeriod = parseStr(formData.get('guaranteedPeriod')) || 'Não garantir'
    const guaranteeScope = parseStr(formData.get('guaranteeScope')) || 'Somente o aluguel'

    const adminFeePercentage = parseNum(formData.get('adminFeePercentage')) ?? 10
    const adminFeeFinesPercentage = parseNum(formData.get('adminFeeFinesPercentage')) ?? 50
    const brokerageFeePercentage = parseNum(formData.get('brokerageFeePercentage')) ?? 100

    const irrfRetentionResponsibility = parseStr(formData.get('irrfRetentionResponsibility')) || 'LOCATARIO'
    const billingMethod = parseStr(formData.get('billingMethod')) || 'NONE'

    await prisma.leaseTerms.upsert({
        where: { leaseId: contratoId },
        create: {
            leaseId: contratoId,
            contractMonths,
            contractPenaltyValue,
            contractPenaltyType,
            penaltyBeforeDate,
            readjustmentPeriodM,
            readjustmentIndex,
            rentValue,
            paymentDueDay,
            firstPeriodStartDate,
            firstPeriodEndDay,
            firstPeriodDueDate,
            nextReadjustmentDate,
            earlyPaymentDiscount,
            discountType,
            discountDaysBefore,
            lateFeePercentage,
            lateFeeDays,
            lateInterestMonthly,
            lateInterestDays,
            lawyerFeePercentage,
            lawyerFeeGraceDays,
            transferGraceDays,
            guaranteedPeriod,
            guaranteeScope,
            adminFeePercentage,
            adminFeeFinesPercentage,
            brokerageFeePercentage,
            irrfRetentionResponsibility,
            billingMethod,
        },
        update: {
            contractMonths,
            contractPenaltyValue,
            contractPenaltyType,
            penaltyBeforeDate,
            readjustmentPeriodM,
            readjustmentIndex,
            rentValue,
            paymentDueDay,
            firstPeriodStartDate,
            firstPeriodEndDay,
            firstPeriodDueDate,
            nextReadjustmentDate,
            earlyPaymentDiscount,
            discountType,
            discountDaysBefore,
            lateFeePercentage,
            lateFeeDays,
            lateInterestMonthly,
            lateInterestDays,
            lawyerFeePercentage,
            lawyerFeeGraceDays,
            transferGraceDays,
            guaranteedPeriod,
            guaranteeScope,
            adminFeePercentage,
            adminFeeFinesPercentage,
            brokerageFeePercentage,
            irrfRetentionResponsibility,
            billingMethod,
        },
    })
    await sincronizarPeriodoInicialLease(contratoId)

    revalidatePath(`/locacao/contratos/${contratoId}/editar`)

    return { success: true, message: 'Dados do controle locatício salvos com sucesso.', errors: {} }
}
