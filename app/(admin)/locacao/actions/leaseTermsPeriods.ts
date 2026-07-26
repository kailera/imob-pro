'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'
import { leaseTermsPeriodSchema } from '../schemas/leaseTermsPeriod.schema'
import type { ActionState } from '../types/action-state'

export type LeaseTermsPeriodState = ActionState<string>

const DAY_MS = 86_400_000

function addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS)
}

async function syncCurrentTerms(leaseId: string) {
    const today = new Date()
    const period = await prisma.leaseTermsPeriod.findFirst({
        where: {
            leaseId,
            effectiveFrom: { lte: today },
            effectiveTo: { gt: today },
        },
        orderBy: { effectiveFrom: 'desc' },
    }) ?? await prisma.leaseTermsPeriod.findFirst({
        where: { leaseId },
        orderBy: { effectiveFrom: 'desc' },
    })

    if (!period) return

    await prisma.leaseTerms.upsert({
        where: { leaseId },
        create: {
            leaseId,
            rentValue: period.rentAmount,
            paymentDueDay: period.paymentDueDay,
            nextReadjustmentDate: period.effectiveTo,
            readjustmentIndex: period.adjustmentIndex || 'IGP-M',
            earlyPaymentDiscount: period.earlyPaymentDiscount,
            discountType: period.discountType || 'PERCENT',
            discountDaysBefore: period.discountDaysBefore,
            lateFeePercentage: period.lateFeePercentage,
            lateFeeDays: period.lateFeeDays,
            lateInterestMonthly: period.lateInterestMonthly,
            lateInterestDays: period.lateInterestDays,
            lawyerFeePercentage: period.lawyerFeePercentage,
            lawyerFeeGraceDays: period.lawyerFeeGraceDays,
            transferGraceDays: period.transferGraceDays,
            guaranteedPeriod: period.guaranteedPeriod,
            guaranteeScope: period.guaranteeScope,
            adminFeePercentage: period.adminFeePercentage,
            adminFeeFinesPercentage: period.adminFeeFinesPercentage,
            brokerageFeePercentage: period.brokerageFeePercentage,
        },
        update: {
            rentValue: period.rentAmount,
            paymentDueDay: period.paymentDueDay,
            nextReadjustmentDate: period.effectiveTo,
            readjustmentIndex: period.adjustmentIndex || 'IGP-M',
            earlyPaymentDiscount: period.earlyPaymentDiscount,
            discountType: period.discountType || 'PERCENT',
            discountDaysBefore: period.discountDaysBefore,
            lateFeePercentage: period.lateFeePercentage,
            lateFeeDays: period.lateFeeDays,
            lateInterestMonthly: period.lateInterestMonthly,
            lateInterestDays: period.lateInterestDays,
            lawyerFeePercentage: period.lawyerFeePercentage,
            lawyerFeeGraceDays: period.lawyerFeeGraceDays,
            transferGraceDays: period.transferGraceDays,
            guaranteedPeriod: period.guaranteedPeriod,
            guaranteeScope: period.guaranteeScope,
            adminFeePercentage: period.adminFeePercentage,
            adminFeeFinesPercentage: period.adminFeeFinesPercentage,
            brokerageFeePercentage: period.brokerageFeePercentage,
        },
    })
}

export async function saveLeaseTermsPeriod(
    leaseId: string,
    previousState: LeaseTermsPeriodState,
    formData: FormData,
): Promise<LeaseTermsPeriodState> {
    const context = await requireUserContext()
    const parsed = leaseTermsPeriodSchema.safeParse(Object.fromEntries(formData))

    if (!parsed.success) {
        return {
            success: false,
            message: 'Revise os dados do período locatício.',
            errors: parsed.error.flatten().fieldErrors,
        }
    }

    const lease = await prisma.lease.findFirst({
        where: { id: leaseId, tenantId: context.tenantId },
        select: { id: true, startDate: true, endDate: true },
    })

    if (!lease) {
        return { success: false, message: 'Contrato não encontrado.', errors: {} }
    }

    const effectiveFrom = parsed.data.effectiveFrom
    const effectiveTo = addDays(parsed.data.effectiveTo, 1)

    if (effectiveFrom >= effectiveTo) {
        return {
            success: false,
            message: 'O término deve ser posterior ao início do período.',
            errors: { effectiveTo: ['Informe uma data posterior ao início.'] },
        }
    }

    if (lease.startDate && effectiveFrom < lease.startDate) {
        return {
            success: false,
            message: 'O período começa antes da vigência do contrato.',
            errors: { effectiveFrom: ['Use uma data dentro da vigência contratual.'] },
        }
    }

    if (lease.endDate && effectiveTo > addDays(lease.endDate, 1)) {
        return {
            success: false,
            message: 'O período termina depois da vigência do contrato.',
            errors: { effectiveTo: ['Use uma data dentro da vigência contratual.'] },
        }
    }

    const overlap = await prisma.leaseTermsPeriod.findFirst({
        where: {
            leaseId,
            ...(parsed.data.periodId ? { NOT: { id: parsed.data.periodId } } : {}),
            effectiveFrom: { lt: effectiveTo },
            effectiveTo: { gt: effectiveFrom },
        },
        select: { id: true },
    })

    if (overlap) {
        return {
            success: false,
            message: 'Este intervalo se sobrepõe a outro período cadastrado.',
            errors: {
                effectiveFrom: ['Ajuste as datas para não sobrepor períodos.'],
                effectiveTo: ['Ajuste as datas para não sobrepor períodos.'],
            },
        }
    }

    const data = {
        effectiveFrom,
        effectiveTo,
        rentAmount: parsed.data.rentAmount,
        paymentDueDay: parsed.data.paymentDueDay,
        adjustmentIndex: parsed.data.adjustmentIndex || null,
        adjustmentPercentage: parsed.data.adjustmentPercentage ?? null,
        previousRentAmount: parsed.data.previousRentAmount ?? null,
        earlyPaymentDiscount: parsed.data.earlyPaymentDiscount ?? null,
        discountType: parsed.data.discountType || 'PERCENT',
        discountDaysBefore: parsed.data.discountDaysBefore ?? null,
        lateFeePercentage: parsed.data.lateFeePercentage ?? null,
        lateFeeDays: parsed.data.lateFeeDays ?? null,
        lateInterestMonthly: parsed.data.lateInterestMonthly ?? null,
        lateInterestDays: parsed.data.lateInterestDays ?? null,
        lawyerFeePercentage: parsed.data.lawyerFeePercentage ?? null,
        lawyerFeeGraceDays: parsed.data.lawyerFeeGraceDays ?? null,
        transferGraceDays: parsed.data.transferGraceDays ?? null,
        guaranteedPeriod: parsed.data.guaranteedPeriod || null,
        guaranteeScope: parsed.data.guaranteeScope || null,
        adminFeePercentage: parsed.data.adminFeePercentage ?? null,
        adminFeeFinesPercentage: parsed.data.adminFeeFinesPercentage ?? null,
        brokerageFeePercentage: parsed.data.brokerageFeePercentage ?? null,
        source: parsed.data.source,
        reviewStatus: parsed.data.reviewed ? 'REVIEWED' : 'PENDING',
        notes: parsed.data.notes || null,
    }

    if (parsed.data.periodId) {
        const existing = await prisma.leaseTermsPeriod.findFirst({
            where: { id: parsed.data.periodId, leaseId },
            select: { id: true },
        })
        if (!existing) {
            return { success: false, message: 'Período não encontrado.', errors: {} }
        }
        await prisma.leaseTermsPeriod.update({
            where: { id: existing.id },
            data,
        })
    } else {
        await prisma.leaseTermsPeriod.create({
            data: { leaseId, ...data },
        })
    }

    await prisma.lease.update({
        where: { id: leaseId },
        data: { version: { increment: 1 } },
    })
    await syncCurrentTerms(leaseId)

    revalidatePath(`/locacao/contratos/${leaseId}/editar`)
    revalidatePath('/locacao')

    return {
        success: true,
        message: parsed.data.periodId ? 'Período atualizado.' : 'Período adicionado.',
        errors: {},
    }
}

export async function deleteLeaseTermsPeriod(leaseId: string, periodId: string) {
    const context = await requireUserContext()
    const period = await prisma.leaseTermsPeriod.findFirst({
        where: {
            id: periodId,
            leaseId,
            lease: { tenantId: context.tenantId },
        },
        select: {
            id: true,
            _count: { select: { charges: true } },
        },
    })

    if (!period) {
        return { success: false, message: 'Período não encontrado.' }
    }

    if (period._count.charges > 0) {
        return {
            success: false,
            message: 'Este período já originou cobranças e não pode ser excluído.',
        }
    }

    await prisma.leaseTermsPeriod.delete({ where: { id: period.id } })
    await prisma.lease.update({
        where: { id: leaseId },
        data: { version: { increment: 1 } },
    })
    await syncCurrentTerms(leaseId)

    revalidatePath(`/locacao/contratos/${leaseId}/editar`)
    revalidatePath('/locacao')
    return { success: true, message: 'Período excluído.' }
}
