'use client'

import { useActionState, useMemo, useState } from 'react'
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput'
import { INDICES_REAJUSTE, normalizarCodigoIndice } from '@/lib/indices/catalogo'
import {
    converterMesesParaPercentual,
    converterPercentualParaMeses,
    formatarMoeda,
    formatarNumeroEditavel,
    formatarPercentual,
    parseNumeroFlexivel,
} from '@/lib/locacao/financeiro'
import { updateContratoTerms, type TermsActionState } from '../../../../actions/updateContratoTerms'

const initialState: TermsActionState = {
    success: false,
    message: null,
    errors: {},
}

type Terms = {
    contractMonths?: number
    contractPenaltyValue?: number | null
    contractPenaltyType?: string
    penaltyBeforeDate?: string
    readjustmentPeriodM?: number
    readjustmentIndex?: string
    rentValue?: number | null
    paymentDueDay?: number
    firstPeriodStartDate?: string
    firstPeriodEndDay?: string
    firstPeriodDueDate?: string
    nextReadjustmentDate?: string
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
    irrfRetentionResponsibility?: string
    billingMethod?: string
}

type ContratoTermsFormProps = {
    contratoId: string
    leaseStartDate?: string
    terms?: Terms | null
}

type PenaltyType = 'PERCENT' | 'MONTHS' | 'FIXED'
type DiscountType = 'PERCENT' | 'FIXED'

const inputClass = 'min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-[#004777] focus:ring-2 focus:ring-sky-100'
const labelClass = 'mb-1 block font-medium text-gray-700'

function editable(value: number | null | undefined, fallback = 0) {
    return formatarNumeroEditavel(value ?? fallback, 2)
}

function addMonths(dateValue: string, monthsValue: string) {
    const months = Math.max(0, Math.trunc(parseNumeroFlexivel(monthsValue) ?? 0))
    if (!dateValue || months <= 0) return ''

    const [year, month, day] = dateValue.split('-').map(Number)
    if (!year || !month || !day) return ''

    const result = new Date(Date.UTC(year, month - 1, 1))
    result.setUTCMonth(result.getUTCMonth() + months)
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
    result.setUTCDate(Math.min(day, lastDay))

    return [
        result.getUTCFullYear(),
        String(result.getUTCMonth() + 1).padStart(2, '0'),
        String(result.getUTCDate()).padStart(2, '0'),
    ].join('-')
}

export function ContratoTermsForm({ contratoId, leaseStartDate, terms }: ContratoTermsFormProps) {
    const action = updateContratoTerms.bind(null, contratoId)
    const [state, formAction, pending] = useActionState(action, initialState)

    const [startDate, setStartDate] = useState(terms?.firstPeriodStartDate ?? leaseStartDate ?? '')
    const [contractMonths, setContractMonths] = useState(editable(terms?.contractMonths, 30))
    const [readjustmentMonths, setReadjustmentMonths] = useState(editable(terms?.readjustmentPeriodM, 12))
    const [penaltyType, setPenaltyType] = useState<PenaltyType>(
        terms?.contractPenaltyType === 'MONTHS' || terms?.contractPenaltyType === 'FIXED'
            ? terms.contractPenaltyType
            : 'PERCENT',
    )
    const [penaltyValue, setPenaltyValue] = useState(editable(terms?.contractPenaltyValue, 10))
    const [rentValue, setRentValue] = useState(editable(terms?.rentValue))
    const [discountType, setDiscountType] = useState<DiscountType>(
        terms?.discountType === 'FIXED' ? 'FIXED' : 'PERCENT',
    )
    const [discountValue, setDiscountValue] = useState(editable(terms?.earlyPaymentDiscount, 0))
    const [lateFee, setLateFee] = useState(editable(terms?.lateFeePercentage, 10))
    const [lateInterest, setLateInterest] = useState(editable(terms?.lateInterestMonthly, 1))
    const [lawyerFee, setLawyerFee] = useState(editable(terms?.lawyerFeePercentage, 100))
    const [adminFee, setAdminFee] = useState(editable(terms?.adminFeePercentage, 10))
    const [adminFinesFee, setAdminFinesFee] = useState(editable(terms?.adminFeeFinesPercentage, 50))
    const [brokerageFee, setBrokerageFee] = useState(editable(terms?.brokerageFeePercentage, 100))

    const nextReadjustmentDate = useMemo(
        () => addMonths(startDate, readjustmentMonths),
        [readjustmentMonths, startDate],
    )

    const penaltyPercentage = useMemo(() => {
        const penalty = parseNumeroFlexivel(penaltyValue) ?? 0
        const months = parseNumeroFlexivel(contractMonths) ?? 0
        return penaltyType === 'MONTHS'
            ? converterMesesParaPercentual(penalty, months)
            : penaltyType === 'PERCENT' ? penalty : null
    }, [contractMonths, penaltyType, penaltyValue])

    const rent = parseNumeroFlexivel(rentValue) ?? 0
    const discount = parseNumeroFlexivel(discountValue) ?? 0
    const discountPercentage = discountType === 'FIXED'
        ? (rent > 0 ? (discount / rent) * 100 : 0)
        : discount
    const discountCurrency = discountType === 'PERCENT'
        ? rent * (discount / 100)
        : discount

    function changePenaltyType(nextType: PenaltyType) {
        const current = parseNumeroFlexivel(penaltyValue) ?? 0
        const months = parseNumeroFlexivel(contractMonths) ?? 0

        if (penaltyType === 'PERCENT' && nextType === 'MONTHS') {
            setPenaltyValue(editable(converterPercentualParaMeses(current, months)))
        } else if (penaltyType === 'MONTHS' && nextType === 'PERCENT') {
            setPenaltyValue(editable(converterMesesParaPercentual(current, months)))
        }
        setPenaltyType(nextType)
    }

    function changeDiscountType(nextType: DiscountType) {
        if (discountType === nextType) return
        setDiscountValue(editable(nextType === 'FIXED' ? discountCurrency : discountPercentage))
        setDiscountType(nextType)
    }

    return (
        <section id="controle" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
                <h2 className="text-base font-bold text-gray-900">Controle locatício</h2>
                <p className="mt-1 text-xs text-gray-500">
                    Valores monetários e percentuais são formatados automaticamente.
                </p>
            </div>

            <form action={formAction} className="space-y-7 text-xs">
                <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Dados do contrato</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label htmlFor="firstPeriodStartDate" className={labelClass}>Início do contrato atual*</label>
                            <input
                                id="firstPeriodStartDate"
                                type="date"
                                name="firstPeriodStartDate"
                                value={startDate}
                                onChange={event => setStartDate(event.target.value)}
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="contractMonths" className={labelClass}>Duração do contrato (meses)*</label>
                            <FormattedNumberInput
                                id="contractMonths"
                                name="contractMonths"
                                value={contractMonths}
                                onValueChange={setContractMonths}
                                format="number"
                                decimals={0}
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="readjustmentPeriodM" className={labelClass}>Periodicidade do reajuste (meses)*</label>
                            <FormattedNumberInput
                                id="readjustmentPeriodM"
                                name="readjustmentPeriodM"
                                value={readjustmentMonths}
                                onValueChange={setReadjustmentMonths}
                                format="number"
                                decimals={0}
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="nextReadjustmentDate" className={labelClass}>Próximo reajuste (calculado)</label>
                            <input
                                id="nextReadjustmentDate"
                                type="date"
                                name="nextReadjustmentDate"
                                value={nextReadjustmentDate}
                                readOnly
                                className={`${inputClass} bg-gray-50 text-gray-700`}
                            />
                            <p className="mt-1 text-[11px] text-gray-500">
                                Calculado pela data inicial mais a periodicidade informada.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="readjustmentIndex" className={labelClass}>Índice de reajuste*</label>
                            <select
                                id="readjustmentIndex"
                                name="readjustmentIndex"
                                defaultValue={normalizarCodigoIndice(terms?.readjustmentIndex) ?? 'IGP-M'}
                                className={inputClass}
                            >
                                {INDICES_REAJUSTE.map((indice) => (
                                    <option key={indice.codigo} value={indice.codigo}>{indice.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="penaltyBeforeDate" className={labelClass}>Cobrar multa se encerrar antes de</label>
                            <input
                                id="penaltyBeforeDate"
                                type="date"
                                name="penaltyBeforeDate"
                                defaultValue={terms?.penaltyBeforeDate}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900">Aluguel e multa contratual</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label htmlFor="rentValue" className={labelClass}>Valor do aluguel*</label>
                            <FormattedNumberInput
                                id="rentValue"
                                name="rentValue"
                                value={rentValue}
                                onValueChange={setRentValue}
                                format="currency"
                                required
                                placeholder="R$ 0,00"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="paymentDueDay" className={labelClass}>Dia de vencimento*</label>
                            <input
                                id="paymentDueDay"
                                type="number"
                                min={1}
                                max={31}
                                name="paymentDueDay"
                                defaultValue={terms?.paymentDueDay ?? 10}
                                className={inputClass}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <label htmlFor="contractPenaltyValue" className="font-medium text-gray-700">
                                    Multa por quebra de contrato
                                </label>
                                <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                                    {([
                                        ['MONTHS', 'Meses'],
                                        ['PERCENT', 'Percentual'],
                                        ['FIXED', 'Valor fixo'],
                                    ] as const).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => changePenaltyType(value)}
                                            className={`min-h-9 rounded-md px-3 font-semibold ${
                                                penaltyType === value
                                                    ? 'bg-[#004777] text-white'
                                                    : 'text-gray-600 hover:bg-white'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input type="hidden" name="contractPenaltyType" value={penaltyType} />
                            <FormattedNumberInput
                                id="contractPenaltyValue"
                                name="contractPenaltyValue"
                                value={penaltyValue}
                                onValueChange={setPenaltyValue}
                                format={penaltyType === 'FIXED' ? 'currency' : penaltyType === 'PERCENT' ? 'percentage' : 'number'}
                                decimals={2}
                                className={inputClass}
                            />
                            <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-[#004777]">
                                {penaltyType === 'MONTHS' && (
                                    <>Equivale a <strong>{formatarPercentual(penaltyPercentage)}</strong> do prazo total do contrato.</>
                                )}
                                {penaltyType === 'PERCENT' && (
                                    <>Equivale a <strong>{formatarNumeroEditavel(converterPercentualParaMeses(penaltyPercentage ?? 0, parseNumeroFlexivel(contractMonths) ?? 0))} meses</strong> de aluguel.</>
                                )}
                                {penaltyType === 'FIXED' && <>A multa será cobrada como valor fixo em reais.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900">Primeiro período de cobrança</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label htmlFor="firstPeriodEndDay" className={labelClass}>Fim do período</label>
                            <select
                                id="firstPeriodEndDay"
                                name="firstPeriodEndDay"
                                defaultValue={terms?.firstPeriodEndDay || 'Último dia do mês'}
                                className={inputClass}
                            >
                                <option value="Último dia do mês">Último dia do mês</option>
                                <option value="Dia 10">Dia 10</option>
                                <option value="Dia 15">Dia 15</option>
                                <option value="Dia 20">Dia 20</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="firstPeriodDueDate" className={labelClass}>Primeiro vencimento</label>
                            <input
                                id="firstPeriodDueDate"
                                type="date"
                                name="firstPeriodDueDate"
                                defaultValue={terms?.firstPeriodDueDate}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900">Desconto de pontualidade</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <label htmlFor="earlyPaymentDiscount" className="font-medium text-gray-700">Desconto</label>
                                <div className="flex rounded-lg border border-gray-200 p-1">
                                    <button
                                        type="button"
                                        onClick={() => changeDiscountType('FIXED')}
                                        className={`min-h-9 rounded-md px-3 font-bold ${discountType === 'FIXED' ? 'bg-[#004777] text-white' : 'text-gray-600'}`}
                                    >
                                        R$
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => changeDiscountType('PERCENT')}
                                        className={`min-h-9 rounded-md px-3 font-bold ${discountType === 'PERCENT' ? 'bg-[#004777] text-white' : 'text-gray-600'}`}
                                    >
                                        %
                                    </button>
                                </div>
                            </div>
                            <input type="hidden" name="discountType" value={discountType} />
                            <FormattedNumberInput
                                id="earlyPaymentDiscount"
                                name="earlyPaymentDiscount"
                                value={discountValue}
                                onValueChange={setDiscountValue}
                                format={discountType === 'FIXED' ? 'currency' : 'percentage'}
                                className={inputClass}
                            />
                            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                                {discountType === 'FIXED'
                                    ? <>Esse valor corresponde a <strong>{formatarPercentual(discountPercentage)}</strong> do aluguel.</>
                                    : <>O desconto corresponde a <strong>{formatarMoeda(discountCurrency)}</strong>.</>}
                            </p>
                        </div>
                        <div>
                            <label htmlFor="discountDaysBefore" className={labelClass}>Até quantos dias antes do vencimento*</label>
                            <input
                                id="discountDaysBefore"
                                type="number"
                                min={0}
                                name="discountDaysBefore"
                                defaultValue={terms?.discountDaysBefore ?? 1}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900">Multas e outros encargos</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <PercentageField id="lateFeePercentage" name="lateFeePercentage" label="Multa por atraso (%)" value={lateFee} onChange={setLateFee} />
                        <NumberField name="lateFeeDays" label="Cobrar multa após quantos dias*" value={terms?.lateFeeDays ?? 1} />
                        <PercentageField id="lateInterestMonthly" name="lateInterestMonthly" label="Juros mensais pro rata (%)" value={lateInterest} onChange={setLateInterest} />
                        <NumberField name="lateInterestDays" label="Cobrar juros após quantos dias*" value={terms?.lateInterestDays ?? 1} />
                        <PercentageField id="lawyerFeePercentage" name="lawyerFeePercentage" label="Honorários advocatícios (%)" value={lawyerFee} onChange={setLawyerFee} />
                        <NumberField name="lawyerFeeGraceDays" label="Carência dos honorários (dias corridos)" value={terms?.lawyerFeeGraceDays ?? 90} />
                    </div>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900">Repasse e garantia</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <NumberField name="transferGraceDays" label="Carência para repasse (dias corridos)*" value={terms?.transferGraceDays ?? 10} />
                        <SelectField
                            name="guaranteedPeriod"
                            label="Período garantido"
                            value={terms?.guaranteedPeriod || 'Não garantir'}
                            options={['Não garantir', '12 meses', '24 meses', 'Todo o contrato']}
                        />
                        <SelectField
                            name="guaranteeScope"
                            label="Abrangência da garantia"
                            value={terms?.guaranteeScope || 'Somente o aluguel'}
                            options={['Somente o aluguel', 'Aluguel e encargos']}
                        />
                    </div>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900">Taxas da administração</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <PercentageField id="adminFeePercentage" name="adminFeePercentage" label="Taxa de administração (%)" value={adminFee} onChange={setAdminFee} />
                        <PercentageField id="adminFeeFinesPercentage" name="adminFeeFinesPercentage" label="Taxa sobre multas e encargos (%)" value={adminFinesFee} onChange={setAdminFinesFee} />
                        <PercentageField id="brokerageFeePercentage" name="brokerageFeePercentage" label="Taxa de intermediação (%)" value={brokerageFee} onChange={setBrokerageFee} />
                    </div>
                </div>

                <div className="grid gap-6 border-t border-gray-100 pt-6 md:grid-cols-2">
                    <fieldset>
                        <legend className="font-semibold text-gray-900">Responsabilidade pela retenção de IRRF</legend>
                        <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            {[
                                ['LOCATARIO', 'Locatário'],
                                ['ADMINISTRADORA', 'Administradora'],
                                ['LOCADOR', 'Locador'],
                            ].map(([value, label]) => (
                                <label key={value} className="flex min-h-9 items-center gap-2">
                                    <input
                                        type="radio"
                                        name="irrfRetentionResponsibility"
                                        value={value}
                                        defaultChecked={(terms?.irrfRetentionResponsibility ?? 'LOCATARIO') === value}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div>
                        <label htmlFor="billingMethod" className={labelClass}>Forma de cobrança</label>
                        <select
                            id="billingMethod"
                            name="billingMethod"
                            defaultValue={terms?.billingMethod || 'NONE'}
                            className={inputClass}
                        >
                            <option value="NONE">Não fazer cobrança bancária</option>
                            <option value="BANK_INTER">Boleto Banco Inter</option>
                            <option value="BANK_BRADESCO">Boleto Bradesco</option>
                            <option value="PIX">PIX direto</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                    <button
                        type="submit"
                        disabled={pending}
                        className="min-h-11 rounded-lg bg-[#004777] px-6 font-semibold text-white transition-colors hover:bg-[#003355] disabled:opacity-50"
                    >
                        {pending ? 'Salvando...' : 'Salvar controle locatício'}
                    </button>
                    {state.message && (
                        <p role="status" className={`font-medium ${state.success ? 'text-emerald-600' : 'text-red-600'}`}>
                            {state.message}
                        </p>
                    )}
                </div>
            </form>
        </section>
    )
}

function PercentageField({
    id,
    name,
    label,
    value,
    onChange,
}: {
    id: string
    name: string
    label: string
    value: string
    onChange: (value: string) => void
}) {
    return (
        <div>
            <label htmlFor={id} className={labelClass}>{label}</label>
            <FormattedNumberInput
                id={id}
                name={name}
                value={value}
                onValueChange={onChange}
                format="percentage"
                className={inputClass}
            />
        </div>
    )
}

function NumberField({ name, label, value }: { name: string; label: string; value: number }) {
    return (
        <div>
            <label htmlFor={name} className={labelClass}>{label}</label>
            <input id={name} type="number" min={0} name={name} defaultValue={value} className={inputClass} />
        </div>
    )
}

function SelectField({
    name,
    label,
    value,
    options,
}: {
    name: string
    label: string
    value: string
    options: string[]
}) {
    return (
        <div>
            <label htmlFor={name} className={labelClass}>{label}</label>
            <select id={name} name={name} defaultValue={value} className={inputClass}>
                {options.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
        </div>
    )
}
