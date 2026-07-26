'use client'

import { useState } from 'react'

type ContratoClausesDocumentsFormProps = {
    contratoId: string
    clauses?: Array<{ id: string; title: string; content: string }>
    documents?: Array<{ id: string; name: string; url: string }>
}

export function ContratoClausesDocumentsForm({
    contratoId,
    clauses = [],
    documents = [],
}: ContratoClausesDocumentsFormProps) {
    const [clauseList, setClauseList] = useState(clauses)
    const [docList, setDocList] = useState(documents)
    const [newTitle, setNewTitle] = useState('')
    const [newContent, setNewContent] = useState('')

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

                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-xs space-y-2 bg-gray-50">
                    <p className="text-gray-600 font-medium">
                        Arraste e solte arquivos aqui, ou clique para fazer upload de contratos assinados, comprovantes, etc.
                    </p>
                    <input type="file" multiple className="hidden" id="docUploadInput" />
                    <label
                        htmlFor="docUploadInput"
                        className="inline-block py-2 px-4 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium shadow-sm hover:bg-gray-100 cursor-pointer"
                    >
                        Selecionar Arquivos
                    </label>
                </div>

                {docList.length > 0 && (
                    <ul className="divide-y divide-gray-100 text-xs">
                        {docList.map(d => (
                            <li key={d.id} className="py-2 flex items-center justify-between">
                                <span className="font-medium text-gray-800">{d.name}</span>
                                <a
                                    href={d.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#004777] hover:underline"
                                >
                                    Visualizar
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
