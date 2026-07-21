import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import FinancialFilterBar, { FilterState } from "@/components/cobrancas/FinancialFilterBar";
import FinancialSummary from "@/components/cobrancas/FinancialSummary";
import FinancialTable from "@/components/cobrancas/FinancialTable";

interface ICobrancaTabContent {
    cobrancaTotals: any;
    cobrancas: any;
    activeTab: string;
}

export default function CobrancasTabContent({ activeTab, cobrancaTotals, cobrancas = [] }: ICobrancaTabContent) {
    const [filters, setFilters] = useState<FilterState>({
        dateField: 'vencimento',
        status: 'Todas',
        banco: 'Todos',
        conta: 'Todas as contas',
        startDate: '',
        endDate: '',
        mesReferencia: 'TODOS',
        search: ''
    });
    const [currentPage, setCurrentPage] = useState(1);

    const formatShortDate = (dStr: string | null) => {
        if (!dStr) return null;
        const d = new Date(dStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };
    const formatTime = (dStr: string) => {
        const d = new Date(dStr);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const mappedCobrancas = (cobrancas || []).map((tx: any) => {
        const situacaoLabel = tx.status === 'LIQUIDADO' ? 'Liquidado' : tx.status === 'CANCELADO' ? 'Cancelado' : 'Recepcionado';

        return {
            id: tx.id,
            recepcaoData: formatShortDate(tx.createdAt) || '',
            recepcaoHora: formatTime(tx.createdAt),
            movimentoData: formatShortDate(tx.updatedAt) || '',
            movimentoHora: formatTime(tx.updatedAt),
            vencimento: formatShortDate(tx.dataVencimento) || '',
            situacao: situacaoLabel,
            valor: tx.valor,
            cedente: 'Imob Pro',
            sacadoNome: tx.descricao.replace('Aluguel - ', ''),
            sacadoCpf: '***.***.***-**',
            pagamentoData: formatShortDate(tx.dataPagamento),
            pagamentoValor: tx.status === 'LIQUIDADO' ? tx.valor : null,
            interNossoNumero: tx.interNossoNumero,
            interPixCode: tx.interPixCode,
            interBarcode: tx.interBarcode,
            interPdfKey: tx.interPdfKey,
            interStatus: tx.interStatus,
        };
    });

    // Apply client-side filters
    const filteredCobrancas = mappedCobrancas.filter((item: any) => {
        if (filters.status !== 'Todas') {
            if (item.situacao !== filters.status) return false;
        }

        if (filters.search) {
            const query = filters.search.toLowerCase();
            const name = (item.sacadoNome || '').toLowerCase();
            const cpf = (item.sacadoCpf || '').toLowerCase();
            if (!name.includes(query) && !cpf.includes(query)) return false;
        }

        if (filters.startDate || filters.endDate) {
            const parts = (item.vencimento || '').split('/');
            if (parts.length === 3) {
                const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                if (filters.startDate) {
                    const start = new Date(filters.startDate + 'T00:00:00');
                    if (itemDate < start) return false;
                }
                if (filters.endDate) {
                    const end = new Date(filters.endDate + 'T23:59:59');
                    if (itemDate > end) return false;
                }
            }
        }

        return true;
    });

    const pageSize = 10;
    const totalItems = filteredCobrancas.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedCobrancas = filteredCobrancas.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (<>
        {
            activeTab === 'cobrancas' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-[#280003]">Cobranças de Aluguéis</h2>
                            <p className="text-sm text-gray-500 mt-1">Gerencie os recebimentos, boletos e repasses dos aluguéis ativos</p>
                        </div>
                        <a 
                            href="/cobrancas"
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#004777] hover:bg-[#003355] text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer mb-2"
                        >
                            <Coins className="w-4 h-4" />
                            <span>Faturamento e Boletos Banco Inter</span>
                        </a>
                    </div>
                    <FinancialFilterBar 
                        filters={filters}
                        onChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
                        onApply={() => setCurrentPage(1)}
                    />
                    <FinancialSummary totals={cobrancaTotals} />
                    <FinancialTable 
                        data={paginatedCobrancas} 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )
        }
    </>)
}