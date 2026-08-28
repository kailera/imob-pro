"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Key, DollarSign, FileText, Plus } from 'lucide-react';

// Futuros componentes (vamos criá-los nos próximos passos)
import ContratosTabContent from './ContratosTabContent';
import ModelosTabContent, { ContractTemplate } from './ModelosTabContent';
import AgendaVencimentosLocacao from './AgendaVencimentosLocacao';
import type { AgendaLocacaoEvento, PainelIndiceReajuste } from '../actions/actions';
import { countPendingContractUpdates } from '@/lib/locacao/contract-updates';
interface LocacaoClientContainerProps {
    initialContratos: any[];
    initialImoveis: any[];
    initialAgenda: AgendaLocacaoEvento[];
    initialIndices: PainelIndiceReajuste[];
    initialLocatarios?: any[];
    agendaAno: number;
    agendaMes: number;
}

export default function LocacaoClientContainer({
    initialContratos,
    initialImoveis,
    initialAgenda,
    initialIndices,
    initialLocatarios = [],
    agendaAno,
    agendaMes,
}: LocacaoClientContainerProps) {

    // 1. Estados que controlam a interface geral da página
    const [activeTab, setActiveTab] = useState<'contratos' | 'atualizacoes' | 'modelos'>('contratos');
    const [pendingUpdates, setPendingUpdates] = useState(() => countPendingContractUpdates(initialAgenda));
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

    const locatariosUnicos = removerDuplicados([...initialLocatarios, ...allLocatarios]).sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "")
    );
    const fiadoresUnicos = removerDuplicados(allFiadores);
    const locadoresUnicos = removerDuplicados(allLocador);

    return (
        <div className="space-y-6">
            {/* ── HEADER E ABAS DE NAVEGAÇÃO ── */}
            <div className="flex border-b border-gray-200 justify-between items-center gap-4">
                <div className="flex min-w-0 gap-3 overflow-x-auto sm:gap-6">
                    <button
                        onClick={() => setActiveTab('contratos')}
                        className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-all ${activeTab === 'contratos'
                            ? 'border-[#004777] text-[#004777]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Key className="w-4 h-4" />
                        Contratos de Locação
                    </button>
                    <Link
                        href="/cobrancas"
                        className="flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent pb-3 text-sm font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004777]"
                    >
                        <DollarSign className="h-4 w-4" aria-hidden="true" />
                        Cobranças de Aluguéis
                    </Link>
                    <button
                        type="button"
                        onClick={() => setActiveTab('atualizacoes')}
                        className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-all ${activeTab === 'atualizacoes'
                            ? 'border-[#004777] text-[#004777]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        <span>Atualizações de contratos</span>
                        <span
                            className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${pendingUpdates > 0
                                ? 'bg-red-600 text-white motion-safe:animate-pulse'
                                : 'bg-gray-100 text-gray-500'
                                }`}
                            aria-label={`${pendingUpdates} contratos precisam de atualização`}
                        >
                            {pendingUpdates}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('modelos')}
                        className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-all ${activeTab === 'modelos'
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
                    <Link
                        href="/locacao/contratos/novo"
                        className="flex items-center gap-2 bg-[#004777] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-[#003355] transition-all cursor-pointer mb-2"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Contrato
                    </Link>
                )}
            </div>

            {/* ── CONTEÚDO DAS ABAS ── */}

            {activeTab === 'atualizacoes' && (
                <AgendaVencimentosLocacao
                    initialAno={agendaAno}
                    initialMes={agendaMes}
                    initialEventos={initialAgenda}
                    initialIndices={initialIndices}
                    onPendingCountChange={setPendingUpdates}
                />
            )}
            {activeTab === 'contratos' && (
                <ContratosTabContent
                    contratos={initialContratos}
                />
            )}
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
        </div>
    );
}
