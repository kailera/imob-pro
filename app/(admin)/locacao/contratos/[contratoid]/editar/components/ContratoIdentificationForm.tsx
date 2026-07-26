// components/ContratoIdentificationForm.tsx

'use client'

import { updateContratoIdentification } from '@/app/(admin)/locacao/actions/updateContratoIdentification'
import { useActionState } from 'react'
import type { IdentificationActionState } from '@/app/(admin)/locacao/actions/updateContratoIdentification'

type ContratoIdentificationFormProps = {
    contrato: {
        id: string
        tipoLocacao: string
        finalidade: string
        dataInicio: string
        prazoMeses: string
        legacyCode: string
        billingStartDate: string
    }
}

const initialState: IdentificationActionState = {
    success: false,
    message: null,
    errors: {},
}

export function ContratoIdentificationForm({
    contrato,
}: ContratoIdentificationFormProps) {
    const action = updateContratoIdentification.bind(
        null,
        contrato.id,
    )

    const [state, formAction, pending] = useActionState(
        action,
        initialState,
    )

    return (
        <form
            action={formAction}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 space-y-4"
        >
            <fieldset disabled={pending} className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-lg">📋</span> Identificação do contrato
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Informe os dados gerais da locação.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                        <label htmlFor="tipoLocacao" className="block font-medium text-gray-700 mb-1">
                            Tipo da locação*
                        </label>
                        <select
                            id="tipoLocacao"
                            name="tipoLocacao"
                            defaultValue={contrato.tipoLocacao}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#004777]"
                        >
                            <option value="">Definir depois</option>
                            <option value="RESIDENCIAL">Residencial</option>
                            <option value="COMERCIAL">Comercial</option>
                        </select>
                        <FieldErrors errors={state.errors.tipoLocacao} />
                    </div>

                    <div>
                        <label htmlFor="prazoMeses" className="block font-medium text-gray-700 mb-1">
                            Prazo em meses
                        </label>
                        <input
                            id="prazoMeses"
                            name="prazoMeses"
                            type="number"
                            min={1}
                            defaultValue={contrato.prazoMeses}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                        />
                        <FieldErrors errors={state.errors.prazoMeses} />
                    </div>

                    <div>
                        <label htmlFor="dataInicio" className="block font-medium text-gray-700 mb-1">
                            Data de início
                        </label>
                        <input
                            id="dataInicio"
                            name="dataInicio"
                            type="date"
                            defaultValue={contrato.dataInicio}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                        />
                        <FieldErrors errors={state.errors.dataInicio} />
                    </div>

                    <div>
                        <label htmlFor="legacyCode" className="block font-medium text-gray-700 mb-1">
                            Código no SICADI
                        </label>
                        <input
                            id="legacyCode"
                            name="legacyCode"
                            type="text"
                            defaultValue={contrato.legacyCode}
                            placeholder="Ex.: 00037"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                        />
                        <FieldErrors errors={state.errors.legacyCode} />
                    </div>

                    <div>
                        <label htmlFor="billingStartDate" className="block font-medium text-gray-700 mb-1">
                            Gerar cobranças a partir de
                        </label>
                        <input
                            id="billingStartDate"
                            name="billingStartDate"
                            type="date"
                            defaultValue={contrato.billingStartDate}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">
                            Competências anteriores permanecem sob responsabilidade do SICADI.
                        </p>
                        <FieldErrors errors={state.errors.billingStartDate} />
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="finalidade" className="block font-medium text-gray-700 mb-1">
                            Finalidade
                        </label>
                        <textarea
                            id="finalidade"
                            name="finalidade"
                            defaultValue={contrato.finalidade}
                            rows={3}
                            placeholder="Finalidade do contrato (ex: Residência familiar)..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777] resize-y"
                        />
                        <FieldErrors errors={state.errors.finalidade} />
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2 text-xs">
                    <button
                        type="submit"
                        disabled={pending}
                        className="py-2.5 px-6 bg-[#004777] hover:bg-[#003355] text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {pending ? 'Salvando...' : 'Salvar identificação'}
                    </button>

                    {state.message && (
                        <p
                            role="status"
                            className={`text-xs font-medium ${
                                state.success ? 'text-emerald-600' : 'text-red-600'
                            }`}
                        >
                            {state.message}
                        </p>
                    )}
                </div>
            </fieldset>
        </form>
    )
}

function FieldErrors({
    errors,
}: {
    errors?: string[]
}) {
    if (!errors?.length) {
        return null
    }

    return (
        <div role="alert" className="mt-1 space-y-0.5">
            {errors.map(error => (
                <p key={error} className="text-xs font-medium text-red-600">
                    {error}
                </p>
            ))}
        </div>
    )
}
