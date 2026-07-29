'use client'

import { useActionState } from 'react'
import { updateLeaseUtilities, type UtilitiesActionState } from '@/app/(admin)/locacao/actions/updateLeaseUtilities'
import type { LeaseAttachment } from '@/lib/locacao/anexos'
import { LeaseAttachmentsField } from './LeaseAttachmentsField'

const initialState: UtilitiesActionState = {
    success: false,
    message: null,
    errors: {},
}

type UtilityItem = {
    type: string
    amount: number | null
    identification: string
    lastCheckedDate: string
    observation: string
    attachments: LeaseAttachment[]
}

type Props = {
    contratoId: string
    utilities?: UtilityItem[]
}

export function ContratoUtilitiesForm({ contratoId, utilities = [] }: Props) {
    const action = updateLeaseUtilities.bind(null, contratoId)
    const [state, formAction, pending] = useActionState(action, initialState)

    const getUtil = (type: string) => utilities.find(u => u.type === type)

    const water = getUtil('WATER')
    const electricity = getUtil('ELECTRICITY')
    const gas = getUtil('GAS')

    return (
        <form action={formAction} id="sec-agua-luz-gas" className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">💧</span> Água, luz e gás
                </h3>
            </div>

            {/* Companhia de água */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <h4 className="font-bold text-gray-800">Companhia de água</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Valor mensal cobrado no boleto:</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="water_amount"
                            defaultValue={water?.amount ?? ''}
                            placeholder="R$ 0,00"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Identificação:</label>
                        <input
                            type="text"
                            name="water_identification"
                            defaultValue={water?.identification}
                            placeholder="Nº da conta / Matrícula"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Data última checagem:</label>
                        <input
                            type="date"
                            name="water_lastCheckedDate"
                            defaultValue={water?.lastCheckedDate}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block font-medium text-gray-700 mb-1">Observação:</label>
                        <textarea
                            name="water_observation"
                            defaultValue={water?.observation}
                            rows={2}
                            placeholder="Observações sobre o abastecimento ou titularidade"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none resize-y"
                        />
                    </div>
                </div>
                <LeaseAttachmentsField
                    leaseId={contratoId}
                    name="water_attachments"
                    title="Arquivos da conta de água"
                    description="Anexe contas, comprovantes e documentos de titularidade."
                    initialAttachments={water?.attachments}
                />
            </div>

            {/* Companhia de energia */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <h4 className="font-bold text-gray-800">Companhia de energia</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Valor mensal cobrado no boleto:</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="electricity_amount"
                            defaultValue={electricity?.amount ?? ''}
                            placeholder="R$ 0,00"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Identificação:</label>
                        <input
                            type="text"
                            name="electricity_identification"
                            defaultValue={electricity?.identification}
                            placeholder="Nº da instalação / Conta contrato"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Data última checagem:</label>
                        <input
                            type="date"
                            name="electricity_lastCheckedDate"
                            defaultValue={electricity?.lastCheckedDate}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block font-medium text-gray-700 mb-1">Observação:</label>
                        <textarea
                            name="electricity_observation"
                            defaultValue={electricity?.observation}
                            rows={2}
                            placeholder="Observações sobre a energia"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none resize-y"
                        />
                    </div>
                </div>
                <LeaseAttachmentsField
                    leaseId={contratoId}
                    name="electricity_attachments"
                    title="Arquivos da conta de energia"
                    description="Anexe contas, comprovantes e documentos de titularidade."
                    initialAttachments={electricity?.attachments}
                />
            </div>

            {/* Companhia de gás */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <h4 className="font-bold text-gray-800">Companhia de gás</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="hidden" name="gas_amount" value="" />
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Identificação:</label>
                        <input
                            type="text"
                            name="gas_identification"
                            defaultValue={gas?.identification}
                            placeholder="Nº de cliente do gás"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Data última checagem:</label>
                        <input
                            type="date"
                            name="gas_lastCheckedDate"
                            defaultValue={gas?.lastCheckedDate}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block font-medium text-gray-700 mb-1">Observação:</label>
                        <textarea
                            name="gas_observation"
                            defaultValue={gas?.observation}
                            rows={2}
                            placeholder="Observações sobre o gás encanado ou botijão"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none resize-y"
                        />
                    </div>
                </div>
                <LeaseAttachmentsField
                    leaseId={contratoId}
                    name="gas_attachments"
                    title="Arquivos da conta de gás"
                    description="Anexe contas, comprovantes e documentos de titularidade."
                    initialAttachments={gas?.attachments}
                />
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 pt-2 text-xs">
                <button
                    type="submit"
                    disabled={pending}
                    className="py-2 px-5 bg-[#004777] hover:bg-[#003355] text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                    {pending ? 'Salvando...' : 'Salvar Água, Luz e Gás'}
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
