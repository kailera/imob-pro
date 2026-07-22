"use client";

import React, { useEffect, useState } from 'react';
import { Key, DollarSign, FileText, Plus } from 'lucide-react';

// O componente de Cobranças que você já isolou antes!
import CobrancasTabContent from './CobrancasTabContent';

// Futuros componentes (vamos criá-los nos próximos passos)
import ContratosTabContent from './ContratosTabContent';
import ModelosTabContent, { ContractTemplate } from './ModelosTabContent';
import NovoContratoModal from './NovoContratoModal';
import AgendaVencimentosLocacao from './AgendaVencimentosLocacao';
import type { AgendaLocacaoEvento } from '../actions';
interface LocacaoClientContainerProps {
    initialContratos: any[];
    initialCobrancas: any[];
    initialImoveis: any[];
    initialAgenda: AgendaLocacaoEvento[];
    agendaAno: number;
    agendaMes: number;
}

export default function LocacaoClientContainer({
    initialContratos,
    initialCobrancas,
    initialImoveis,
    initialAgenda,
    agendaAno,
    agendaMes,
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
    // Extrai inquilinos, fiadores e proprietários dos contratos existentes
    const { allLocatarios, allFiadores, allLocador } = initialContratos.reduce(
        (acc, contrato) => {
            if (contrato.locatarios) acc.allLocatarios.push(...contrato.locatarios);
            if (contrato.fiadors) acc.allFiadores.push(...contrato.fiadors);

            if (contrato.imovel) {
                const locadoresDoContrato = contrato.imovel.imovelLocacaos?.flatMap((i: any) => i.locadors || []) || [];
                acc.allLocador.push(...locadoresDoContrato);
            }

            return acc;
        },
        {
            allLocatarios: [] as any[],
            allFiadores: [] as any[],
            allLocador: [] as any[]
        }
    );

    const removerDuplicados = (arr: any[]) =>
        Array.from(new Map(arr.map((item) => [item.id, item])).values());

    const locatariosUnicos = removerDuplicados(allLocatarios);
    const fiadoresUnicos = removerDuplicados(allFiadores);
    const locadoresUnicos = removerDuplicados(allLocador);

    // Totais de cobrança reais calculados dinamicamente
    const cobrancasTotals = initialCobrancas.reduce(
        (acc, curr) => {
            const val = curr.valor || 0;
            acc.registrado += val;
            if (curr.status === 'LIQUIDADO') acc.liquidado += val;
            else if (curr.status === 'CANCELADO') acc.cancelado += val;
            else acc.recepcionado += val;
            return acc;
        },
        { registrado: 0, liquidado: 0, baixado: 0, recepcionado: 0, cancelado: 0 }
    );

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
                <AgendaVencimentosLocacao
                    initialAno={agendaAno}
                    initialMes={agendaMes}
                    initialEventos={initialAgenda}
                />
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

            <NovoContratoModal
                isOpen={isAddContractModalOpen}
                onClose={() => setIsAddContractModalOpen(false)}
                allLocatarios={locatariosUnicos}
                allFiadores={fiadoresUnicos}
                allLocador={locadoresUnicos}
                templates={templates}
                onSuccess={handleContratoGerado}
            />
        </div>
    );
}
