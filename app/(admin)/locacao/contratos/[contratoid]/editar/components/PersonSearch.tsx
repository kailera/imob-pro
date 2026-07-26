'use client'

import { useState, useEffect, useTransition } from 'react'
import { searchPersons, type PersonSearchResult } from '@/app/(admin)/locacao/actions/searchActions'

type Props = {
    onSelect: (person: PersonSearchResult) => void
    initialPerson?: PersonSearchResult | null
}

export function PersonSearch({ onSelect, initialPerson }: Props) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<PersonSearchResult[]>([])
    const [selected, setSelected] = useState<PersonSearchResult | null>(initialPerson ?? null)
    const [isPending, startTransition] = useTransition()
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setResults([])
            setIsOpen(false)
            return
        }

        const timer = setTimeout(() => {
            startTransition(async () => {
                const res = await searchPersons(query)
                setResults(res)
                setIsOpen(true)
            })
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (person: PersonSearchResult) => {
        setSelected(person)
        onSelect(person)
        setQuery('')
        setIsOpen(false)
    }

    const handleClear = () => {
        setSelected(null)
        setQuery('')
    }

    if (selected) {
        return (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div>
                    <p className="font-semibold text-gray-900">{selected.name}</p>
                    <p className="text-sm text-gray-500">
                        CPF/CNPJ: {selected.cpfCnpj} {selected.email ? `• ${selected.email}` : ''}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs font-medium text-red-600 hover:underline"
                >
                    Alterar
                </button>
            </div>
        )
    }

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar Pessoa (Nome / CPF / CNPJ / E-mail)
            </label>
            <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Digite o nome, CPF ou CNPJ..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            {isPending && (
                <div className="absolute right-3 top-9 text-xs text-gray-400">
                    Buscando...
                </div>
            )}

            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {results.length === 0 ? (
                        <li className="p-3 text-sm text-gray-500">Nenhuma pessoa encontrada.</li>
                    ) : (
                        results.map(person => (
                            <li
                                key={person.id}
                                onClick={() => handleSelect(person)}
                                className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                            >
                                <p className="font-medium text-gray-900">{person.name}</p>
                                <p className="text-xs text-gray-500">
                                    CPF/CNPJ: {person.cpfCnpj} {person.email ? `• ${person.email}` : ''}
                                </p>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    )
}

export default PersonSearch