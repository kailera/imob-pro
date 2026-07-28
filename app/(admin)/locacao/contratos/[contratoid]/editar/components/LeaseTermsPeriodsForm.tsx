'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import { INDICES_REAJUSTE, normalizarCodigoIndice } from '@/lib/indices/catalogo'
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput'
import {
    deleteLeaseTermsPeriod,
    saveLeaseTermsPeriod,
    type LeaseTermsPeriodState,
} from '../../../../actions/leaseTermsPeriods'

export type LeaseTermsPeriodView = {
    id: string
    effectiveFrom: string
    effectiveTo: string
    rentAmount: number
    paymentDueDay: number
    adjustmentIndex: string
    adjustmentPercentage: number | null
    previousRentAmount: number | null
    earlyPaymentDiscount: number | null
    discountType: string
    discountDaysBefore: number | null
    lateFeePercentage: number | null
    lateFeeDays: number | null
    lateInterestMonthly: number | null
    lateInterestDays: number | null
    lawyerFeePercentage: number | null
    lawyerFeeGraceDays: number | null
    transferGraceDays: number | null
    guaranteedPeriod: string
    guaranteeScope: string
    adminFeePercentage: number | null
    adminFeeFinesPercentage: number | null
    brokerageFeePercentage: number | null
    source: string
    reviewStatus: string
    notes: string
}

type PeriodDraft = Omit<LeaseTermsPeriodView, 'id'> & { id: string }

type LeaseTermsPeriodsFormProps = {
    leaseId: string
    leaseStartDate: string
    leaseEndDate: string
    legacyCode: string
    periods: LeaseTermsPeriodView[]
    defaults?: {
        rentValue?: number | null
        paymentDueDay?: number
        adjustmentIndex?: string
        earlyPaymentDiscount?: number | null
        discountType?: string
        discountDaysBefore?: number
        lateFeePercentage?: number | null
        lateFeeDays?: number
        lateInterestMonthly?: number | null
        lateInterestDays?: number
        lawyerFeePercentage?: number | null
        lawyerFeeGraceDays?: number
        transferGraceDays?: number
        guaranteedPeriod?: string
        guaranteeScope?: string
        adminFeePercentage?: number | null
        adminFeeFinesPercentage?: number | null
        brokerageFeePercentage?: number | null
    } | null
}

const initialState: LeaseTermsPeriodState = {
    success: false,
    message: null,
    errors: {},
}

function addDays(value: string, amount: number) {
    if (!value) return ''
    const date = new Date(`${value}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + amount)
    return date.toISOString().slice(0, 10)
}

function addMonthsInclusive(value: string, months: number) {
    if (!value) return ''
    const date = new Date(`${value}T12:00:00Z`)
    date.setUTCMonth(date.getUTCMonth() + months)
    date.setUTCDate(date.getUTCDate() - 1)
    return date.toISOString().slice(0, 10)
}

function minDate(first: string, second: string) {
    if (!first) return second
    if (!second) return first
    return first < second ? first : second
}

function formatDate(value: string) {
    if (!value) return 'Data pendente'
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
        .format(new Date(`${value}T12:00:00Z`))
}

function emptyDraft(
    props: LeaseTermsPeriodsFormProps,
    previous?: LeaseTermsPeriodView,
): PeriodDraft {
    const effectiveFrom = previous?.effectiveTo
        ? addDays(previous.effectiveTo, 1)
        : props.leaseStartDate
    const proposedEnd = addMonthsInclusive(effectiveFrom, 12)
    const effectiveTo = minDate(proposedEnd, props.leaseEndDate)
    const defaults = props.defaults

    return {
        id: '',
        effectiveFrom,
        effectiveTo,
        rentAmount: previous?.rentAmount ?? defaults?.rentValue ?? 0,
        paymentDueDay: previous?.paymentDueDay ?? defaults?.paymentDueDay ?? 10,
        adjustmentIndex: normalizarCodigoIndice(previous?.adjustmentIndex || defaults?.adjustmentIndex) || 'IGP-M',
        adjustmentPercentage: null,
        previousRentAmount: previous?.rentAmount ?? null,
        earlyPaymentDiscount: previous?.earlyPaymentDiscount ?? defaults?.earlyPaymentDiscount ?? null,
        discountType: previous?.discountType || defaults?.discountType || 'PERCENT',
        discountDaysBefore: previous?.discountDaysBefore ?? defaults?.discountDaysBefore ?? 1,
        lateFeePercentage: previous?.lateFeePercentage ?? defaults?.lateFeePercentage ?? 10,
        lateFeeDays: previous?.lateFeeDays ?? defaults?.lateFeeDays ?? 1,
        lateInterestMonthly: previous?.lateInterestMonthly ?? defaults?.lateInterestMonthly ?? 1,
        lateInterestDays: previous?.lateInterestDays ?? defaults?.lateInterestDays ?? 1,
        lawyerFeePercentage: previous?.lawyerFeePercentage ?? defaults?.lawyerFeePercentage ?? null,
        lawyerFeeGraceDays: previous?.lawyerFeeGraceDays ?? defaults?.lawyerFeeGraceDays ?? 90,
        transferGraceDays: previous?.transferGraceDays ?? defaults?.transferGraceDays ?? 10,
        guaranteedPeriod: previous?.guaranteedPeriod || defaults?.guaranteedPeriod || 'Não garantir',
        guaranteeScope: previous?.guaranteeScope || defaults?.guaranteeScope || 'Somente o aluguel',
        adminFeePercentage: previous?.adminFeePercentage ?? defaults?.adminFeePercentage ?? 10,
        adminFeeFinesPercentage: previous?.adminFeeFinesPercentage ?? defaults?.adminFeeFinesPercentage ?? 50,
        brokerageFeePercentage: previous?.brokerageFeePercentage ?? defaults?.brokerageFeePercentage ?? 100,
        source: props.legacyCode ? 'SICADI_MANUAL' : 'MANUAL',
        reviewStatus: 'PENDING',
        notes: '',
    }
}

export function LeaseTermsPeriodsForm(props: LeaseTermsPeriodsFormProps) {
    const orderedPeriods = useMemo(
        () => [...props.periods].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)),
        [props.periods],
    )
    const [draft, setDraft] = useState<PeriodDraft>(() => {
        const last = orderedPeriods.at(-1)
        return last ? { ...last } : emptyDraft(props)
    })
    const [state, formAction, pending] = useActionState(
        saveLeaseTermsPeriod.bind(null, props.leaseId),
        initialState,
    )
    const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
    const [deleting, startDeleting] = useTransition()

    const gaps = useMemo(() => {
        const messages: string[] = []
        orderedPeriods.forEach((period, index) => {
            if (index === 0 && props.leaseStartDate && period.effectiveFrom !== props.leaseStartDate) {
                messages.push(`O primeiro período não começa junto com o contrato (${formatDate(props.leaseStartDate)}).`)
            }
            const next = orderedPeriods[index + 1]
            if (next && addDays(period.effectiveTo, 1) !== next.effectiveFrom) {
                messages.push(`Há uma lacuna entre ${formatDate(period.effectiveTo)} e ${formatDate(next.effectiveFrom)}.`)
            }
        })
        const last = orderedPeriods.at(-1)
        if (last && props.leaseEndDate && last.effectiveTo !== props.leaseEndDate) {
            messages.push(`O histórico ainda não cobre o contrato até ${formatDate(props.leaseEndDate)}.`)
        }
        return messages
    }, [orderedPeriods, props.leaseEndDate, props.leaseStartDate])

    const selectPeriod = (period: LeaseTermsPeriodView) => {
        setDeleteMessage(null)
        setDraft({ ...period })
    }

    const addPeriod = () => {
        setDeleteMessage(null)
        setDraft(emptyDraft(props, orderedPeriods.at(-1)))
    }

    const handleDelete = () => {
        if (!draft.id) return
        if (!window.confirm('Excluir este período locatício? Esta ação não poderá ser desfeita.')) return

        startDeleting(async () => {
            const result = await deleteLeaseTermsPeriod(props.leaseId, draft.id)
            setDeleteMessage(result.message)
            if (result.success) setDraft(emptyDraft(props, orderedPeriods.at(-2)))
        })
    }

    const field = (
        name: keyof PeriodDraft,
        label: string,
        options: {
            type?: 'text' | 'number' | 'date'
            step?: string
            min?: number
            max?: number
            required?: boolean
        } = {},
    ) => (
        <div>
            <label htmlFor={`period-${name}`} className="mb-1 block font-medium text-gray-700">
                {label}
            </label>
            <input
                id={`period-${name}`}
                name={name}
                type={options.type || 'number'}
                step={options.step}
                min={options.min}
                max={options.max}
                required={options.required}
                value={draft[name] ?? ''}
                onChange={event => setDraft(current => ({
                    ...current,
                    [name]: event.target.value,
                }))}
                className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/20"
            />
            <FieldErrors errors={state.errors[name]} />
        </div>
    )

    const formattedField = (
        name: keyof PeriodDraft,
        label: string,
        format: 'currency' | 'percentage',
        options: { decimals?: number; required?: boolean } = {},
    ) => (
        <div>
            <label htmlFor={`period-${name}`} className="mb-1 block font-medium text-gray-700">{label}</label>
            <FormattedNumberInput
                id={`period-${name}`}
                name={name}
                required={options.required}
                value={String(draft[name] ?? '')}
                onValueChange={value => setDraft(current => ({ ...current, [name]: value }))}
                format={format}
                decimals={options.decimals}
                className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/20"
            />
            <FieldErrors errors={state.errors[name]} />
        </div>
    )

    return (
        <section id="periodos" className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <header className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-bold text-gray-900">Períodos locatícios</h2>
                    <p className="mt-1 text-xs text-gray-500">
                        O primeiro período é criado a partir do controle locatício. Adicione outros apenas para reajustes ou mudanças nas condições.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={addPeriod}
                    className="min-h-11 rounded-lg bg-[#004777] px-4 py-2 text-xs font-semibold text-white hover:bg-[#003355] focus:outline-none focus:ring-2 focus:ring-[#004777]/30"
                >
                    + Adicionar período
                </button>
            </header>

            {orderedPeriods.length > 0 && (
                <div className="flex gap-2 overflow-x-auto border-b border-gray-100 pb-2" role="tablist" aria-label="Períodos cadastrados">
                    {orderedPeriods.map(period => (
                        <button
                            key={period.id}
                            type="button"
                            role="tab"
                            aria-selected={draft.id === period.id}
                            onClick={() => selectPeriod(period)}
                            className={`min-h-11 shrink-0 rounded-lg border px-3 py-2 text-left text-xs ${
                                draft.id === period.id
                                    ? 'border-[#004777] bg-[#004777]/5 text-[#004777]'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <span className="block font-semibold">{formatDate(period.effectiveFrom)}</span>
                            <span className="block text-[11px]">R$ {period.rentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </button>
                    ))}
                </div>
            )}

            {gaps.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <p className="font-semibold">Histórico ainda incompleto</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                        {gaps.map(message => <li key={message}>{message}</li>)}
                    </ul>
                </div>
            )}

            <form action={formAction} className="space-y-5 text-xs">
                <input type="hidden" name="periodId" value={draft.id} />
                <input type="hidden" name="source" value={draft.source} />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {field('effectiveFrom', 'Início do período', { type: 'date', required: true })}
                    {field('effectiveTo', 'Fim do período (inclusive)', { type: 'date', required: true })}
                    {formattedField('rentAmount', 'Valor do aluguel', 'currency', { required: true })}
                    {field('paymentDueDay', 'Dia do vencimento', { min: 1, max: 31, required: true })}

                    <div>
                        <label htmlFor="period-adjustmentIndex" className="mb-1 block font-medium text-gray-700">
                            Índice de reajuste
                        </label>
                        <select
                            id="period-adjustmentIndex"
                            name="adjustmentIndex"
                            value={draft.adjustmentIndex}
                            onChange={event => setDraft(current => ({ ...current, adjustmentIndex: event.target.value }))}
                            className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#004777]/20"
                        >
                            {INDICES_REAJUSTE.map((indice) => (
                                <option key={indice.codigo} value={indice.codigo}>{indice.nome}</option>
                            ))}
                            <option value="OUTRO">Outro</option>
                        </select>
                    </div>
                    {formattedField('adjustmentPercentage', 'Percentual aplicado no reajuste', 'percentage', { decimals: 4 })}
                    {formattedField('previousRentAmount', 'Aluguel do período anterior', 'currency')}
                    {formattedField('earlyPaymentDiscount', 'Desconto de pontualidade', draft.discountType === 'FIXED' ? 'currency' : 'percentage')}
                </div>

                <details className="rounded-lg border border-gray-200">
                    <summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold text-gray-700">
                        Condições avançadas deste período
                    </summary>
                    <div className="grid grid-cols-1 gap-4 border-t border-gray-100 p-4 md:grid-cols-2">
                        <div>
                            <label htmlFor="period-discountType" className="mb-1 block font-medium text-gray-700">Tipo do desconto</label>
                            <select
                                id="period-discountType"
                                name="discountType"
                                value={draft.discountType}
                                onChange={event => setDraft(current => ({ ...current, discountType: event.target.value }))}
                                className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
                            >
                                <option value="PERCENT">Percentual</option>
                                <option value="FIXED">Valor fixo</option>
                            </select>
                        </div>
                        {field('discountDaysBefore', 'Dias de antecedência para desconto', { min: 0 })}
                        {formattedField('lateFeePercentage', 'Multa por atraso (%)', 'percentage')}
                        {field('lateFeeDays', 'Cobrar multa após (dias)', { min: 0 })}
                        {formattedField('lateInterestMonthly', 'Juros mensal (%)', 'percentage')}
                        {field('lateInterestDays', 'Cobrar juros após (dias)', { min: 0 })}
                        {formattedField('lawyerFeePercentage', 'Honorários advocatícios (%)', 'percentage')}
                        {field('lawyerFeeGraceDays', 'Carência dos honorários (dias)', { min: 0 })}
                        {field('transferGraceDays', 'Carência para repasse (dias)', { min: 0 })}
                        {formattedField('adminFeePercentage', 'Taxa de administração (%)', 'percentage')}
                        {formattedField('adminFeeFinesPercentage', 'Taxa sobre multas (%)', 'percentage')}
                        {formattedField('brokerageFeePercentage', 'Taxa de intermediação (%)', 'percentage')}
                        <div>
                            <label htmlFor="period-guaranteedPeriod" className="mb-1 block font-medium text-gray-700">Período garantido</label>
                            <input
                                id="period-guaranteedPeriod"
                                name="guaranteedPeriod"
                                value={draft.guaranteedPeriod}
                                onChange={event => setDraft(current => ({ ...current, guaranteedPeriod: event.target.value }))}
                                className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2"
                            />
                        </div>
                        <div>
                            <label htmlFor="period-guaranteeScope" className="mb-1 block font-medium text-gray-700">Abrangência da garantia</label>
                            <input
                                id="period-guaranteeScope"
                                name="guaranteeScope"
                                value={draft.guaranteeScope}
                                onChange={event => setDraft(current => ({ ...current, guaranteeScope: event.target.value }))}
                                className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="period-notes" className="mb-1 block font-medium text-gray-700">Observações do período</label>
                            <textarea
                                id="period-notes"
                                name="notes"
                                rows={3}
                                value={draft.notes}
                                onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                            />
                        </div>
                    </div>
                </details>

                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                        type="checkbox"
                        name="reviewed"
                        checked={draft.reviewStatus === 'REVIEWED'}
                        onChange={event => setDraft(current => ({
                            ...current,
                            reviewStatus: event.target.checked ? 'REVIEWED' : 'PENDING',
                        }))}
                        className="size-4"
                    />
                    <span>
                        <strong className="block text-gray-800">Conferido com o SICADI</strong>
                        <span className="text-[11px] text-gray-500">Marque depois de comparar datas e valores na tela antiga.</span>
                    </span>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        disabled={pending || deleting}
                        className="min-h-11 rounded-lg bg-[#004777] px-5 py-2 font-semibold text-white hover:bg-[#003355] disabled:opacity-50"
                    >
                        {pending ? 'Salvando...' : draft.id ? 'Salvar período' : 'Adicionar período'}
                    </button>
                    {draft.id && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={pending || deleting}
                            className="min-h-11 rounded-lg border border-red-200 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                            {deleting ? 'Excluindo...' : 'Excluir período'}
                        </button>
                    )}
                    {(state.message || deleteMessage) && (
                        <p
                            role="status"
                            className={`font-medium ${state.success && !deleteMessage ? 'text-emerald-700' : 'text-red-600'}`}
                        >
                            {deleteMessage || state.message}
                        </p>
                    )}
                </div>
            </form>
        </section>
    )
}

function FieldErrors({ errors }: { errors?: string[] }) {
    if (!errors?.length) return null
    return (
        <div role="alert" className="mt-1 space-y-1">
            {errors.map(error => <p key={error} className="font-medium text-red-600">{error}</p>)}
        </div>
    )
}
