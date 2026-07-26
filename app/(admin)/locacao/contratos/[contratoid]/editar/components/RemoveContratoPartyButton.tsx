'use client'

import { useTransition } from 'react'
import { removeContratoParty } from '../../../../actions/contratoPartiesSection'

type Props = {
    contratoId: string
    partyId: string
}

export function RemoveContratoPartyButton({ contratoId, partyId }: Props) {
    const [isPending, startTransition] = useTransition()

    const handleRemove = () => {
        if (!confirm('Deseja realmente remover este participante?')) return

        startTransition(async () => {
            await removeContratoParty(contratoId, partyId)
        })
    }

    return (
        <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
        >
            {isPending ? 'Removendo...' : 'Remover'}
        </button>
    )
}
