'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { finalizeContrato } from '../../../../actions/finalizeContrato.action'
import { inactivateContrato } from '../../../../actions/inactivateContrato.action'

export type EtapaStatus = {
    identificacao: boolean
    imovel: boolean
    iptu: boolean
    condominio: boolean
    utilidades: boolean
    locatario: boolean
    locatariosSolidarios: boolean
    garantia: boolean
    locador: boolean
    controleLocaticio: boolean
    clausulas: boolean
    cobranca: boolean
    comissionamento: boolean
    documentos: boolean
}

type EtapasCadastroNavProps = {
    contratoId: string
    status: string
    etapas: EtapaStatus
}

const ETAPAS_CONFIG = [
    { key: 'identificacao' as const, label: 'Identificação', href: '#identificacao' },
    { key: 'imovel' as const, label: 'Imóvel', href: '#imovel' },
    { key: 'iptu' as const, label: 'IPTU', href: '#iptu' },
    { key: 'condominio' as const, label: 'Condomínio', href: '#condominio' },
    { key: 'utilidades' as const, label: 'Água, luz e gás', href: '#utilidades' },
    { key: 'locatario' as const, label: 'Locatário', href: '#locatarios' },
    { key: 'locatariosSolidarios' as const, label: 'Locatários solidários', href: '#locatarios' },
    { key: 'garantia' as const, label: 'Garantia locatícia', href: '#garantia' },
    { key: 'locador' as const, label: 'Locador', href: '#locatarios' },
    { key: 'controleLocaticio' as const, label: 'Controle locatício', href: '#controle' },
    { key: 'clausulas' as const, label: 'Cláusula adicional', href: '#clausulas' },
    { key: 'cobranca' as const, label: 'Forma de cobrança', href: '#controle' },
    { key: 'comissionamento' as const, label: 'Comissionamento', href: '#controle' },
    { key: 'documentos' as const, label: 'Documentos digitalizados', href: '#documentos' },
]

export function EtapasCadastroNav({ contratoId, status, etapas }: EtapasCadastroNavProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState<string | null>(null)

    const handleFinalize = () => {
        if (confirm('Deseja realmente concluir e ativar este contrato de locação?')) {
            startTransition(async () => {
                const result = await finalizeContrato(contratoId)
                setMessage(result.message)
            })
        }
    }

    const handleInactivate = () => {
        if (confirm('Inativar este contrato? Nenhuma nova cobrança será gerada, mas todos os dados e cobranças existentes serão preservados.')) {
            startTransition(async () => {
                const result = await inactivateContrato(contratoId)
                setMessage(result.message)
                if (result.success) router.push('/locacao/inativos')
            })
        }
    }

    const isFinished = status === 'ACTIVE'
    const isInactive = status === 'SUSPENDED'

    return (
        <aside className="sticky top-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">
                Etapas do cadastro
            </h3>

            <nav className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 text-xs">
                {ETAPAS_CONFIG.map(item => {
                    const isDone = etapas[item.key]
                    return (
                        <a
                            key={item.key}
                            href={item.href}
                            className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <span className={isDone ? 'text-emerald-600 font-bold' : 'text-gray-300'}>
                                    {isDone ? '✓' : '•'}
                                </span>
                                <span className="truncate">{item.label}</span>
                            </span>
                        </a>
                    )
                })}
            </nav>

            <div className="pt-2 border-t border-gray-100">
                <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={isPending || isFinished || isInactive}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        isFinished
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : isInactive
                                ? 'bg-gray-100 text-gray-500 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50'
                    }`}
                >
                    <span>✓</span>
                    <span>{isFinished ? 'Contrato Concluído' : isInactive ? 'Contrato inativo' : isPending ? 'Concluindo...' : 'Concluir contrato'}</span>
                </button>
                {!isInactive && (
                    <button
                        type="button"
                        onClick={handleInactivate}
                        disabled={isPending}
                        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span aria-hidden="true">×</span>
                        <span>{isPending ? 'Salvando...' : 'Inativar contrato'}</span>
                    </button>
                )}
                {message && (
                    <p role="status" className={`mt-2 text-xs font-medium ${
                        isFinished ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                        {message}
                    </p>
                )}
            </div>
        </aside>
    )
}
