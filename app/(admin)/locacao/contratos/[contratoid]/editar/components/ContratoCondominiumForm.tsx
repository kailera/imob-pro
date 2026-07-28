'use client'

import { useActionState, useState } from 'react'
import { updateLeaseCondominium, type CondominiumActionState } from '@/app/(admin)/locacao/actions/updateLeaseCondominium'
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput'
import type { LeaseAttachment } from '@/lib/locacao/anexos'
import { formatarNumeroEditavel } from '@/lib/locacao/financeiro'
import { LeaseAttachmentsField } from './LeaseAttachmentsField'

const initialState: CondominiumActionState = {
    success: false,
    message: null,
    errors: {},
}

type Props = {
    contratoId: string
    condominium?: {
        amount: number | null
        condoName: string
        adminName: string
        adminPhone: string
        adminEmail: string
        adminWebsite: string
        syndicName: string
        syndicPhone: string
        responsibleParty: string
        lastCheckedDate: string
        attachments: LeaseAttachment[]
    } | null
}

export function ContratoCondominiumForm({ contratoId, condominium }: Props) {
    const action = updateLeaseCondominium.bind(null, contratoId)
    const [state, formAction, pending] = useActionState(action, initialState)
    const [amount, setAmount] = useState(formatarNumeroEditavel(condominium?.amount))

    return (
        <form action={formAction} id="sec-condominio" className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">🏙️</span> Condomínio
                </h3>
            </div>

            <div className="space-y-4 text-xs">
                <div>
                    <label htmlFor="condominiumAmount" className="block font-medium text-gray-700 mb-1">
                        Valor mensal do condomínio:
                    </label>
                    <FormattedNumberInput
                        id="condominiumAmount"
                        name="amount"
                        value={amount}
                        onValueChange={setAmount}
                        format="currency"
                        placeholder="R$ 0,00"
                        aria-describedby="condominiumAmountHelp"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                    <p id="condominiumAmountHelp" className="mt-1 text-gray-500">
                        Será somado à cobrança quando o responsável for o locatário.
                    </p>
                    {state.errors.amount?.map(error => (
                        <p key={error} className="mt-1 text-red-600">{error}</p>
                    ))}
                </div>
                {/* Identificação */}
                <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Identificação</h4>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Condomínio ou edifício:</label>
                        <input
                            type="text"
                            name="condoName"
                            defaultValue={condominium?.condoName}
                            placeholder="Nome do edifício / condomínio"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                        />
                    </div>
                </div>

                {/* Administradora */}
                <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Administradora</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Nome:</label>
                            <input
                                type="text"
                                name="adminName"
                                defaultValue={condominium?.adminName}
                                placeholder="Nome da administradora"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                            />
                        </div>
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Telefone:</label>
                            <input
                                type="text"
                                name="adminPhone"
                                defaultValue={condominium?.adminPhone}
                                placeholder="(00) 0000-0000"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                            />
                        </div>
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">E-mail:</label>
                            <input
                                type="email"
                                name="adminEmail"
                                defaultValue={condominium?.adminEmail}
                                placeholder="contato@administradora.com"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                            />
                        </div>
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Site:</label>
                            <input
                                type="text"
                                name="adminWebsite"
                                defaultValue={condominium?.adminWebsite}
                                placeholder="www.administradora.com.br"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                            />
                        </div>
                    </div>
                </div>

                {/* Síndico */}
                <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Síndico</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Nome:</label>
                            <input
                                type="text"
                                name="syndicName"
                                defaultValue={condominium?.syndicName}
                                placeholder="Nome do síndico"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                            />
                        </div>
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Telefone:</label>
                            <input
                                type="text"
                                name="syndicPhone"
                                defaultValue={condominium?.syndicPhone}
                                placeholder="(00) 00000-0000"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                            />
                        </div>
                    </div>
                </div>

                {/* Outras informações */}
                <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Outras informações</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Responsável pelo pagamento:</label>
                            <select
                                name="responsibleParty"
                                defaultValue={condominium?.responsibleParty || 'Locatário'}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#004777]"
                            >
                                <option value="Locatário">Locatário</option>
                                <option value="Locador">Locador</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Data última checagem:</label>
                            <input
                                type="date"
                                name="lastCheckedDate"
                                defaultValue={condominium?.lastCheckedDate}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <LeaseAttachmentsField
                leaseId={contratoId}
                name="condominiumAttachments"
                title="Arquivos do condomínio"
                description="Anexe convenções, atas, boletos, comunicados e comprovantes."
                initialAttachments={condominium?.attachments}
            />

            {/* Ações */}
            <div className="flex items-center gap-2 pt-2 text-xs">
                <button
                    type="submit"
                    disabled={pending}
                    className="py-2 px-5 bg-[#004777] hover:bg-[#003355] text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                    {pending ? 'Salvando...' : 'Salvar Condomínio'}
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
