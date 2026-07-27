'use client'

import { useActionState, useState } from 'react'
import { updateLeaseDocuments, type LeaseDocumentsActionState } from '@/app/(admin)/locacao/actions/updateLeaseDocuments'
import { LeaseAttachmentsField } from './LeaseAttachmentsField'
import type { LeaseAttachment } from '@/lib/locacao/anexos'

type ContratoClausesDocumentsFormProps = {
    contratoId: string
    clauses?: Array<{ id: string; title: string; content: string }>
    documents?: Array<{ id: string; name: string; url: string; type?: string | null }>
}

const initialDocumentsState: LeaseDocumentsActionState = {
    success: false,
    message: null,
}

export function ContratoClausesDocumentsForm({
    contratoId,
    clauses = [],
    documents = [],
}: ContratoClausesDocumentsFormProps) {
    const [clauseList, setClauseList] = useState(clauses)
    const [newTitle, setNewTitle] = useState('')
    const [newContent, setNewContent] = useState('')
    const action = updateLeaseDocuments.bind(null, contratoId)
    const [documentsState, documentsFormAction, documentsPending] = useActionState(action, initialDocumentsState)

    const initialAttachments: LeaseAttachment[] = documents.map(document => ({
        id: document.id,
        title: document.name,
        fileName: document.name,
        url: document.url,
        mimeType: document.type || 'application/octet-stream',
    }))

    const handleAddClause = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTitle.trim() || !newContent.trim()) return
        setClauseList([
            ...clauseList,
            { id: Date.now().toString(), title: newTitle, content: newContent },
        ])
        setNewTitle('')
        setNewContent('')
    }

    return (
        <div className="space-y-6">
            {/* Cláusulas Adicionais */}
            <div id="clausulas" className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                    Cláusulas Adicionais
                </h2>

                <form onSubmit={handleAddClause} className="space-y-3 text-xs">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">
                            Título da Cláusula
                        </label>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="Ex: Cláusula de Animais de Estimação"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">
                            Conteúdo / Descrição
                        </label>
                        <textarea
                            rows={3}
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                            placeholder="Digite o texto completo da cláusula contratual..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                        />
                    </div>

                    <button
                        type="submit"
                        className="py-2 px-4 bg-gray-800 hover:bg-black text-white font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                        + Adicionar Cláusula
                    </button>
                </form>

                {clauseList.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                        {clauseList.map(c => (
                            <div key={c.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <h4 className="font-semibold text-gray-800">{c.title}</h4>
                                <p className="text-gray-600 mt-1 whitespace-pre-line">{c.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Documentos Digitalizados */}
            <div id="documentos" className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                    Documentos Digitalizados
                </h2>

                <form action={documentsFormAction} className="space-y-3">
                    <LeaseAttachmentsField
                        leaseId={contratoId}
                        name="documentsAttachments"
                        title="Arquivos do contrato"
                        description="Anexe contratos assinados, comprovantes e outros documentos relacionados à locação."
                        initialAttachments={initialAttachments}
                    />

                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={documentsPending}
                            className="py-2 px-5 bg-[#004777] hover:bg-[#003355] text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {documentsPending ? 'Salvando...' : 'Salvar documentos'}
                        </button>
                    </div>

                    {documentsState.message && (
                        <p role="status" className={`text-xs font-medium ${documentsState.success ? 'text-emerald-600' : 'text-red-600'}`}>
                            {documentsState.message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    )
}
