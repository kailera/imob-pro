'use client'

import { useActionState, useState } from 'react'
import { updateLeaseIptu, type IptuActionState } from '@/app/(admin)/locacao/actions/updateLeaseIptu'
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput'
import { formatarNumeroEditavel } from '@/lib/locacao/financeiro'
import type { LeaseAttachment } from '@/lib/locacao/anexos'
import { LeaseAttachmentsField } from './LeaseAttachmentsField'

const initialState: IptuActionState = {
    success: false,
    message: null,
    errors: {},
}

type Props = {
    contratoId: string
    iptu?: {
        inscription: string
        sequentialNumber: string
        bookletHolder: string
        responsibleParty: string
        lastCheckedDate: string
        amount: number | null
        paymentStartDate: string
        installments: string
        attachments: LeaseAttachment[]
    } | null
}

export function ContratoIptuForm({ contratoId, iptu }: Props) {
    const action = updateLeaseIptu.bind(null, contratoId)
    const [state, formAction, pending] = useActionState(action, initialState)
    const [amount, setAmount] = useState(formatarNumeroEditavel(iptu?.amount))

    return (
        <form action={formAction} id="sec-iptu" className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">🏢</span> IPTU
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                    <label htmlFor="iptuAmount" className="block font-medium text-gray-700 mb-1">Valor do IPTU:</label>
                    <FormattedNumberInput
                        id="iptuAmount"
                        name="amount"
                        value={amount}
                        onValueChange={setAmount}
                        format="currency"
                        placeholder="R$ 0,00"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                    {state.errors.amount?.map(error => <p key={error} className="mt-1 text-red-600">{error}</p>)}
                </div>

                <div>
                    <label htmlFor="iptuPaymentStartDate" className="block font-medium text-gray-700 mb-1">Pagamento a partir de:</label>
                    <input
                        id="iptuPaymentStartDate"
                        type="date"
                        name="paymentStartDate"
                        defaultValue={iptu?.paymentStartDate}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                    {state.errors.paymentStartDate?.map(error => <p key={error} className="mt-1 text-red-600">{error}</p>)}
                </div>

                <div>
                    <label htmlFor="iptuInstallments" className="block font-medium text-gray-700 mb-1">Quantidade de parcelas:</label>
                    <input
                        id="iptuInstallments"
                        type="text"
                        inputMode="numeric"
                        name="installments"
                        defaultValue={iptu?.installments}
                        placeholder="Ex.: 10"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                    {state.errors.installments?.map(error => <p key={error} className="mt-1 text-red-600">{error}</p>)}
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Inscrição:</label>
                    <input
                        type="text"
                        name="inscription"
                        defaultValue={iptu?.inscription}
                        placeholder="Inscrição IPTU"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Número sequencial:</label>
                    <input
                        type="text"
                        name="sequentialNumber"
                        defaultValue={iptu?.sequentialNumber}
                        placeholder="Número sequencial"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Carnê com:</label>
                    <select
                        name="bookletHolder"
                        defaultValue={iptu?.bookletHolder || 'Locatário'}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#004777]"
                    >
                        <option value="Locatário">Locatário</option>
                        <option value="Locador">Locador</option>
                        <option value="Imobiliária">Imobiliária</option>
                    </select>
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Responsável pelo pagamento:</label>
                    <select
                        name="responsibleParty"
                        defaultValue={iptu?.responsibleParty || 'Locatário'}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#004777]"
                    >
                        <option value="Locatário">Locatário</option>
                        <option value="Locador">Locador</option>
                        <option value="Dividido">Dividido</option>
                    </select>
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Data última checagem:</label>
                    <input
                        type="date"
                        name="lastCheckedDate"
                        defaultValue={iptu?.lastCheckedDate}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                </div>
            </div>

            <LeaseAttachmentsField
                leaseId={contratoId}
                name="iptuAttachments"
                title="Arquivos do IPTU"
                description="Anexe carnês, certidões, guias e comprovantes relacionados ao IPTU."
                initialAttachments={iptu?.attachments}
            />

            {/* Ações */}
            <div className="flex items-center gap-2 pt-2 text-xs">
                <button
                    type="submit"
                    disabled={pending}
                    className="py-2 px-5 bg-[#004777] hover:bg-[#003355] text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                    {pending ? 'Salvando...' : 'Salvar IPTU'}
                </button>
            </div>

            {state.message && (
                <p role="status" className={`text-xs font-medium ${state.success ? 'text-emerald-600' : 'text-red-600'}`}>
                    {state.message}
                </p>
            )}
        </form>
    )
}
