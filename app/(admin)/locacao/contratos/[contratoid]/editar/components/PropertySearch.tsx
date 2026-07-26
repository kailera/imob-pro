'use client'

import { searchProperties, type PropertySearchResult } from '@/app/(admin)/locacao/actions/searchActions'
import { useState, useEffect, useTransition } from 'react'

type Props = {
    onSelect: (property: PropertySearchResult) => void
    initialProperty?: {
        id: string
        codigo: string
        logradouro?: string | null
        numero?: string | number | null
        cidade?: string | null
    } | null
}

export function PropertySearch({ onSelect, initialProperty }: Props) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<PropertySearchResult[]>([])
    const [selected, setSelected] = useState<PropertySearchResult | null>(
        initialProperty
            ? {
                id: initialProperty.id,
                codigo: initialProperty.codigo,
                logradouro: initialProperty.logradouro ?? null,
                numero: Number(initialProperty.numero) || 0,
                bairro: '',
                cidade: initialProperty.cidade ?? '',
                uf: '',
            }
            : null,
    )
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
                const res = await searchProperties(query)
                setResults(res)
                setIsOpen(true)
            })
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (property: PropertySearchResult) => {
        setSelected(property)
        onSelect(property)
        setQuery('')
        setIsOpen(false)
    }

    const handleClear = () => {
        setSelected(null)
        setQuery('')
    }

    if (selected) {
        return (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 mb-4">
                <div>
                    <p className="font-semibold text-gray-900">
                        Código: {selected.codigo}
                    </p>
                    <p className="text-sm text-gray-500">
                        {selected.logradouro ? `${selected.logradouro}, ${selected.numero}` : ''}
                        {selected.bairro ? ` - ${selected.bairro}` : ''}
                        {selected.cidade ? `, ${selected.cidade}` : ''}
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
        <div className="relative mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar Imóvel (Código / Logradouro / Bairro / Cidade)
            </label>
            <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Digite o código ou endereço do imóvel..."
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
                        <li className="p-3 text-sm text-gray-500">Nenhum imóvel encontrado.</li>
                    ) : (
                        results.map(prop => (
                            <li
                                key={prop.id}
                                onClick={() => handleSelect(prop)}
                                className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                            >
                                <p className="font-medium text-gray-900">Código: {prop.codigo}</p>
                                <p className="text-xs text-gray-500">
                                    {prop.logradouro ? `${prop.logradouro}, ${prop.numero}` : ''}
                                    {prop.bairro ? ` - ${prop.bairro}` : ''}
                                    {prop.cidade ? `, ${prop.cidade}` : ''}
                                </p>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    )
}

export default PropertySearch