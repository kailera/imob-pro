"use client"

import { useActionState } from 'react'
import { SaveContratoState, saveContrato } from '../../actions/saveContrato.action'

type NovoContratoFormProps = {
    tiposLocacao: Array<{
        value: string
        label: string
    }>
}

const initialState: SaveContratoState = {
    success: false,
    message: null,
    errors: {}
}

export default function NovoContratoForm({ tiposLocacao }: NovoContratoFormProps) {
    const [state, formAction, pending] = useActionState(
        saveContrato,
        initialState
    )

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 my-8">
            <form action={formAction}>
                <fieldset disabled={pending} className="space-y-5">
                    <h2 className="text-xl font-bold text-[#280003]">Identificação do Contrato</h2>

                    <div className="space-y-1.5">
                        <label htmlFor="rentalType" className="block text-sm font-medium text-gray-700">
                            Tipo da locação
                        </label>

                        <select
                            id="rentalType"
                            name="rentalType"
                            defaultValue=""
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#004777] outline-none text-sm"
                        >
                            <option value="">
                                Definir depois
                            </option>

                            {tiposLocacao.map(tipo => (
                                <option
                                    key={tipo.value}
                                    value={tipo.value}
                                >
                                    {tipo.label}
                                </option>
                            ))}
                        </select>
                        {state.errors?.rentalType?.map(error => (
                            <p key={error} role="alert" className="text-xs text-red-600">
                                {error}
                            </p>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={pending}
                        className="w-full py-2.5 px-4 bg-[#004777] hover:bg-[#003355] text-white font-semibold rounded-xl text-sm shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {pending ? 'Criando rascunho...' : 'Criar contrato em rascunho'}
                    </button>

                    {state.message && (
                        <p role="status" className={`text-sm ${state.success ? 'text-green-600' : 'text-red-600'}`}>
                            {state.message}
                        </p>
                    )}
                </fieldset>
            </form>
        </div>
    )
}
