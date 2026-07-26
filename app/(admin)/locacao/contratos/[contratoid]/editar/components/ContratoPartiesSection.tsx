'use client'

import { useCallback, useMemo, useState } from 'react'
import {
    AddContratoPartyForm,
    type EditableContratoParty,
} from './AddContratoPartyForm'
import { RemoveContratoPartyButton } from './RemoveContratoPartyButton'

type Props = {
    contratoId: string
    parties: EditableContratoParty[]
}

const roleLabels: Record<string, string> = {
    TENANT: 'Locatário principal',
    CO_TENANT: 'Locatário adicional',
    LANDLORD: 'Locador / proprietário',
    GUARANTOR: 'Fiador',
    SPOUSE: 'Cônjuge',
    LEGAL_REPRESENTATIVE: 'Representante legal',
}

export function ContratoPartiesSection({ contratoId, parties }: Props) {
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null)
    const [formVersion, setFormVersion] = useState(0)

    const selectedParty = useMemo(
        () => parties.find(party => party.id === selectedPartyId) ?? null,
        [parties, selectedPartyId],
    )

    const clearForm = useCallback(() => {
        setSelectedPartyId(null)
        setFormVersion(version => version + 1)
    }, [])

    return (
        <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
            <div>
                <h2 className="text-base font-bold text-gray-900">Participantes do contrato</h2>
                <p className="mt-1 text-xs text-gray-500">
                    O formulário permanece vazio. Selecione uma pessoa na lista para consultar ou editar seus dados.
                </p>
            </div>

            <AddContratoPartyForm
                key={selectedParty?.id ?? `new-${formVersion}`}
                contratoId={contratoId}
                party={selectedParty}
                onSaved={clearForm}
                onCancelEdit={clearForm}
            />

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">Pessoas vinculadas</h3>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#004777]">
                        {parties.length} {parties.length === 1 ? 'participante' : 'participantes'}
                    </span>
                </div>

                {parties.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
                        Nenhum participante cadastrado.
                    </div>
                ) : (
                    <ul className="grid gap-3 md:grid-cols-2">
                        {parties.map(party => {
                            const selected = selectedParty?.id === party.id

                            return (
                                <li
                                    key={party.id}
                                    className={`rounded-xl border p-4 transition-colors ${
                                        selected
                                            ? 'border-[#004777] bg-sky-50/60'
                                            : 'border-gray-200 bg-white hover:border-sky-200'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-gray-900">
                                                {party.pessoa.nome}
                                            </p>
                                            <p className="mt-1 text-xs font-medium text-[#004777]">
                                                {roleLabels[party.papel] ?? 'Participante'}
                                            </p>
                                        </div>
                                        <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                            {party.pessoa.categoria === 'JURIDICA' ? 'Pessoa jurídica' : 'Pessoa física'}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-600">
                                        {party.responsavelSolidario && (
                                            <span className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">
                                                Responsável solidário
                                            </span>
                                        )}
                                        <span className="rounded-full bg-gray-50 px-2 py-1">
                                            Clique em editar para ver os dados
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedPartyId(party.id)}
                                            aria-pressed={selected}
                                            className="min-h-11 flex-1 rounded-lg border border-[#004777] px-3 font-semibold text-[#004777] transition-colors hover:bg-[#004777] hover:text-white"
                                        >
                                            {selected ? 'Dados em edição' : 'Ver e editar dados'}
                                        </button>
                                        <RemoveContratoPartyButton
                                            contratoId={contratoId}
                                            partyId={party.id}
                                        />
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </section>
    )
}
