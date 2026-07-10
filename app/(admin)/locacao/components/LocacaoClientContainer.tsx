"use client";

import React, { useEffect, useState } from 'react';
import { Key, DollarSign, FileText, Plus } from 'lucide-react';

// O componente de Cobranças que você já isolou antes!
import CobrancasTabContent from './CobrancasTabContent';

// Futuros componentes (vamos criá-los nos próximos passos)
import ContratosTabContent from './ContratosTabContent';
import ModelosTabContent, { ContractTemplate } from './ModelosTabContent';
import NovoContratoModal from './NovoContratoModal';
interface LocacaoClientContainerProps {
    initialContratos: any[];
    initialCobrancas: any[];
    initialImoveis: any[];
}

export default function LocacaoClientContainer({
    initialContratos,
    initialCobrancas,
    initialImoveis
}: LocacaoClientContainerProps) {

    // 1. Estados que controlam a interface geral da página
    const [activeTab, setActiveTab] = useState<'contratos' | 'cobrancas' | 'modelos'>('contratos');
    const [isAddContractModalOpen, setIsAddContractModalOpen] = useState(false);
    const [contractFields, setContractFields] = useState<Record<string, string>>({});
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    const [templates, setTemplates] = useState<ContractTemplate[]>([]);

    // Carregue os modelos na montagem (você já tinha algo similar)
    useEffect(() => {
        fetch('/api/contratos/modelos')
            .then(res => res.json())
            .then(data => {
                setTemplates(data);
                if (data.length > 0) setSelectedTemplateId(data[0].id);
            });
    }, []);

    const handleSaveTemplate = (id: string, name: string, content: string) => {
        const updated = templates.map(t => t.id === id ? { ...t, name, content } : t);
        setTemplates(updated);
        localStorage.setItem('imob-pro-contract-templates', JSON.stringify(updated)); // opcional
    };
    const handleContratoGerado = (newContract: any, fields: Record<string, string>, templateId: string) => {
        setIsAddContractModalOpen(false);
        setContractFields(fields);
        setSelectedTemplateId(templateId);
        setActiveTab('modelos'); // Joga o usuário automaticamente pra aba de modelos!
    };
    // Totais de cobrança (mantive os mocks do seu código original para não quebrar o componente)
    const cobrancasTotals = {
        registrado: 13150.50, liquidado: 6600.00, baixado: 0.00,
        recepcionado: 1850.50, cancelado: 1500.00
    };

    return (
        <div className="space-y-6">
            {/* ── HEADER E ABAS DE NAVEGAÇÃO ── */}
            <div className="flex border-b border-gray-200 justify-between items-center">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('contratos')}
                        className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'contratos'
                            ? 'border-[#004777] text-[#004777]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Key className="w-4 h-4" />
                        Contratos de Locação
                    </button>
                    <button
                        onClick={() => setActiveTab('cobrancas')}
                        className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'cobrancas'
                            ? 'border-[#004777] text-[#004777]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Cobranças de Aluguéis
                    </button>
                    <button
                        onClick={() => setActiveTab('modelos')}
                        className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'modelos'
                            ? 'border-[#004777] text-[#004777]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Modelos de Contratos
                    </button>
                </div>

                {/* Botão de Novo Contrato: só aparece na aba de contratos */}
                {activeTab === 'contratos' && (
                    <button
                        onClick={() => setIsAddContractModalOpen(true)}
                        className="flex items-center gap-2 bg-[#004777] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-[#003355] transition-all cursor-pointer mb-2"
                    >
                        <Plus className="w-4 h-4" />
                        Vincular Novo Inquilino e Contrato
                    </button>
                )}
            </div>

            {/* ── CONTEÚDO DAS ABAS ── */}

            {activeTab === 'contratos' && (
                // Temporário até criarmos o componente de Contratos
                <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-xl">
                    <p>Aba de Contratos será carregada aqui.</p>
                    <p className="text-xs mt-2">Contratos carregados: {initialContratos.length}</p>
                </div>

            )}
            {activeTab === 'contratos' && (
                <ContratosTabContent
                    contratos={initialContratos}
                    onOpenModal={() => setIsAddContractModalOpen(true)}
                />
            )}
            {/* O seu componente de Cobranças já está pronto e sendo usado aqui! */}
            <CobrancasTabContent
                activeTab={activeTab}
                cobrancaTotals={cobrancasTotals}
                cobrancas={initialCobrancas}
            />

            {activeTab === 'modelos' && (
                <ModelosTabContent
                    templates={templates}
                    selectedTemplateId={selectedTemplateId}
                    onSelectTemplate={setSelectedTemplateId}
                    contractFields={contractFields}
                    setContractFields={setContractFields}
                    onSaveTemplate={handleSaveTemplate}
                />
            )}

            {/* ── MODAL DE NOVO CONTRATO ── */}
            {isAddContractModalOpen && (
                // Temporário até extrairmos o "monstro" do modal
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-xl shadow-xl">
                        <h2 className="text-lg font-bold mb-4 text-[#280003]">Modal de Novo Contrato</h2>
                        <p className="text-sm text-gray-600 mb-4">Aqui entrarão os seus formulários de novo inquilino e vínculo de imóvel.</p>
                        <button
                            onClick={() => setIsAddContractModalOpen(false)}
                            className="bg-gray-200 px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            <NovoContratoModal
                isOpen={isAddContractModalOpen}
                onClose={() => setIsAddContractModalOpen(false)}
                allLocatarios={[]} // Passe os arrays extraídos de initialContratos aqui
                allFiadores={[]}
                allLocador={[]}
                templates={[]} // Você pode buscar os templates no Server ou passar via props
                onSuccess={handleContratoGerado}
            />
        </div>
    );
}