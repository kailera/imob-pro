import { z } from 'zod'
import { parseNumeroFlexivel } from '@/lib/locacao/financeiro'

const requiredMoney = z.preprocess(
    value => typeof value === 'string' ? parseNumeroFlexivel(value) ?? value : value,
    z.coerce.number().positive('Informe um valor maior que zero.'),
)

const optionalNumber = z.preprocess(
    value => value === '' || value === null ? undefined
        : typeof value === 'string' ? parseNumeroFlexivel(value) ?? value
            : value,
    z.coerce.number().optional(),
)

const optionalInteger = z.preprocess(
    value => value === '' || value === null ? undefined : value,
    z.coerce.number().int().optional(),
)

export const leaseTermsPeriodSchema = z.object({
    periodId: z.string().trim().optional(),
    effectiveFrom: z.coerce.date(),
    effectiveTo: z.coerce.date(),
    rentAmount: requiredMoney,
    paymentDueDay: z.coerce.number().int().min(1).max(31),
    adjustmentIndex: z.string().trim().max(30).optional(),
    adjustmentPercentage: optionalNumber,
    previousRentAmount: optionalNumber,
    earlyPaymentDiscount: optionalNumber,
    discountType: z.enum(['PERCENT', 'FIXED']).optional(),
    discountDaysBefore: optionalInteger,
    lateFeePercentage: optionalNumber,
    lateFeeDays: optionalInteger,
    lateInterestMonthly: optionalNumber,
    lateInterestDays: optionalInteger,
    lawyerFeePercentage: optionalNumber,
    lawyerFeeGraceDays: optionalInteger,
    transferGraceDays: optionalInteger,
    guaranteedPeriod: z.string().trim().max(100).optional(),
    guaranteeScope: z.string().trim().max(100).optional(),
    adminFeePercentage: optionalNumber,
    adminFeeFinesPercentage: optionalNumber,
    brokerageFeePercentage: optionalNumber,
    source: z.enum(['MANUAL', 'SICADI_MANUAL', 'CALCULATION']).default('MANUAL'),
    reviewed: z.preprocess(
        value => value === 'on' || value === 'true' || value === true,
        z.boolean(),
    ),
    notes: z.string().trim().max(2000).optional(),
})

export type LeaseTermsPeriodInput = z.infer<typeof leaseTermsPeriodSchema>
