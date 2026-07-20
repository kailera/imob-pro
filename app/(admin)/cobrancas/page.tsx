'use client';

import React, { useState, useEffect } from 'react';
import FinancialFilterBar from '@/components/cobrancas/FinancialFilterBar';
import FinancialTable, { BilletData } from '@/components/cobrancas/FinancialTable';
import FinancialSummary from '@/components/cobrancas/FinancialSummary';
import { gerarBolePixWrapperAction } from '@/app/actions/interActions';
import { gerarCobrançasMensaisAction } from '@/app/actions/financeiroActions';
import { Zap, Play, X, CheckCircle, AlertTriangle, Loader2, Calendar } from 'lucide-react';

const DEFAULT_COBRANCAS: BilletData[] = [
  {
    id: '1',
    recepcaoData: '25/06/2026',
    recepcaoHora: '10:15',
    movimentoData: '25/06/2026',
    movimentoHora: '10:15',
    vencimento: '30/06/2026',
    situacao: 'Liquidado',
    valor: 2500.00,
    cedente: 'Imob Pro',
    sacadoNome: 'João Silva Oliveira',
    sacadoCpf: '111.222.333-44',
    pagamentoData: '24/06/2026',
    pagamentoValor: 2500.00,
  },
  {
    id: '2',
    recepcaoData: '24/06/2026',
    recepcaoHora: '14:30',
    movimentoData: '24/06/2026',
    movimentoHora: '14:30',
    vencimento: '05/07/2026',
    situacao: 'Recepcionado',
    valor: 1850.50,
    cedente: 'Imob Pro',
    sacadoNome: 'Maria Mendes',
    sacadoCpf: '222.333.444-55',
    pagamentoData: null,
    pagamentoValor: null,
  },
  {
    id: '3',
    recepcaoData: '23/06/2026',
    recepcaoHora: '09:00',
    movimentoData: '23/06/2026',
    movimentoHora: '09:00',
    vencimento: '20/06/2026',
    situacao: 'Pendente',
    valor: 3200.00,
    cedente: 'Imob Pro',
    sacadoNome: 'Carlos Drummond',
    sacadoCpf: '333.444.555-66',
    pagamentoData: null,
    pagamentoValor: null,
  },
  {
    id: '4',
    recepcaoData: '22/06/2026',
    recepcaoHora: '11:45',
    movimentoData: '22/06/2026',
    movimentoHora: '11:45',
    vencimento: '25/06/2026',
    situacao: 'Cancelado',
    valor: 1500.00,
    cedente: 'Imob Pro',
    sacadoNome: 'Ana Paula Rocha',
    sacadoCpf: '444.555.666-77',
    pagamentoData: null,
    pagamentoValor: null,
  },
  {
    id: '5',
    recepcaoData: '21/06/2026',
    recepcaoHora: '16:20',
    movimentoData: '21/06/2026',
    movimentoHora: '16:20',
    vencimento: '10/06/2026',
    situacao: 'Liquidado',
    valor: 4100.00,
    cedente: 'Imob Pro',
    sacadoNome: 'Empresa Fictícia LTDA',
    sacadoCpf: '12.345.678/0001-99',
    pagamentoData: '09/06/2026',
    pagamentoValor: 4100.00,
  }
];

export default function CobrancasPage() {
  const [cobrancas, setCobrancas] = useState<BilletData[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters state
  const [filters, setFilters] = useState({
    dateField: 'vencimento',
    status: 'Todas',
    banco: 'Todos',
    conta: 'Todas as contas',
    startDate: '',
    endDate: '',
    mesReferencia: 'TODOS',
    search: ''
  });

  // Estados do processamento em lote
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrent, setBatchCurrent] = useState(0);
  const [batchSuccessCount, setBatchSuccessCount] = useState(0);
  const [batchErrors, setBatchErrors] = useState<{ sacado: string; error: string }[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Estados de Geração de Cobranças Mensais
  const [showGenModal, setShowGenModal] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  const handleGenerateMonthlyBillings = async () => {
    setIsGenerating(true);
    setGenResult(null);
    try {
      const res = await gerarCobrançasMensaisAction(Number(genMonth), Number(genYear));
      if (res.success) {
        setGenResult({ success: true, count: res.geradosCount });
        loadData();
      } else {
        setGenResult({ success: false, error: res.error });
      }
    } catch (err: any) {
      setGenResult({ success: false, error: err.message || "Erro inesperado." });
    } finally {
      setIsGenerating(false);
    }
  };

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        categoria: 'ALUGUEL',
        page: String(currentPage),
        limit: '10',
        dateField: filters.dateField,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: filters.search
      });

      const res = await fetch(`/api/financeiro/transacoes?${params.toString()}`);
      if (!res.ok) throw new Error();
      const responseData = await res.json();
      
      const rawData = responseData.data || [];
      const total = responseData.total || 0;
      setTotalPages(responseData.totalPages || 1);
      setTotalItems(total);

      const noFiltersApplied = 
        filters.status === 'Todas' && 
        filters.startDate === '' && 
        filters.endDate === '' && 
        filters.search === '';

      if (rawData.length === 0 && noFiltersApplied && currentPage === 1) {
        // Inicializar banco com dados mockados de demonstração se estiver vazio
        const savedList: BilletData[] = [];
        for (const item of DEFAULT_COBRANCAS) {
          const parts = item.vencimento.split('/');
          const vencDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          
          let pgDate = null;
          if (item.pagamentoData) {
            const pgParts = item.pagamentoData.split('/');
            pgDate = new Date(parseInt(pgParts[2]), parseInt(pgParts[1]) - 1, parseInt(pgParts[0]));
          }

          const postRes = await fetch('/api/financeiro/transacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              descricao: `Aluguel - ${item.sacadoNome}`,
              valor: item.valor,
              tipo: 'RECEITA',
              categoria: 'ALUGUEL',
              status: item.situacao === 'Liquidado' ? 'LIQUIDADO' : item.situacao === 'Cancelado' ? 'CANCELADO' : 'PENDENTE',
              dataVencimento: vencDate.toISOString(),
              dataPagamento: pgDate ? pgDate.toISOString() : null
            })
          });
          if (postRes.ok) {
            const created = await postRes.json();
            savedList.push({
              ...item,
              id: created.id
            });
          }
        }
        setCobrancas(savedList);
        setTotalPages(1);
        setTotalItems(savedList.length);
      } else {
        // Mapear do banco de dados para a interface da tabela
        const mapped: BilletData[] = rawData.map((tx: any) => {
          const formatShortDate = (dStr: string | null) => {
            if (!dStr) return null;
            const d = new Date(dStr);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          };
          const formatTime = (dStr: string) => {
            const d = new Date(dStr);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          };

          const situacaoLabel = tx.status === 'LIQUIDADO' ? 'Liquidado' : tx.status === 'CANCELADO' ? 'Cancelado' : 'Recepcionado';

          const locatarioObj = tx.contrato?.locatarios?.[0];
          let sacadoTelefone = "";
          if (locatarioObj?.telefone) {
            try {
              const telList = typeof locatarioObj.telefone === 'string' 
                ? JSON.parse(locatarioObj.telefone) 
                : locatarioObj.telefone;
              if (Array.isArray(telList) && telList.length > 0) {
                sacadoTelefone = telList[0]?.numero || "";
              }
            } catch (e) {
              console.error(e);
            }
          }

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
            sacadoTelefone,
            pagamentoData: formatShortDate(tx.dataPagamento),
            pagamentoValor: tx.status === 'LIQUIDADO' ? tx.valor : null,
            interNossoNumero: tx.interNossoNumero,
            interPixCode: tx.interPixCode,
            interBarcode: tx.interBarcode,
            interPdfKey: tx.interPdfKey,
            interStatus: tx.interStatus,
          };
        });
        setCobrancas(mapped);
      }
    } catch (err) {
      console.error(err);
      setCobrancas(DEFAULT_COBRANCAS);
    } finally {
      setLoading(false);
    }
  }

  const handleApplyFilters = () => {
    if (currentPage === 1) {
      loadData();
    } else {
      setCurrentPage(1);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const pendingBatchList = cobrancas.filter(
    c => !c.interNossoNumero && (c.situacao === 'Pendente' || c.situacao === 'Recepcionado')
  );

  const handleBatchGenerate = async () => {
    if (pendingBatchList.length === 0) return;

    setIsBatchProcessing(true);
    setBatchTotal(pendingBatchList.length);
    setBatchCurrent(0);
    setBatchSuccessCount(0);
    setBatchErrors([]);
    setShowBatchModal(true);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < pendingBatchList.length; i++) {
      const transacao = pendingBatchList[i];
      setBatchCurrent(i + 1);

      try {
        const res = await gerarBolePixWrapperAction(transacao.id);
        if (res.success) {
          setBatchSuccessCount(prev => prev + 1);
        } else {
          setBatchErrors(prev => [...prev, { sacado: transacao.sacadoNome, error: res.error || 'Erro na API.' }]);
        }
      } catch (err: any) {
        setBatchErrors(prev => [...prev, { sacado: transacao.sacadoNome, error: err.message || 'Erro inesperado.' }]);
      }

      // Intervalo de 500ms entre as requisições para respeitar o rate-limit
      await sleep(500);
    }

    setIsBatchProcessing(false);
    loadData();
  };

  const totals = cobrancas.reduce(
    (acc, curr) => {
      const val = curr.valor || 0;
      acc.registrado += val;
      if (curr.situacao === 'Liquidado') acc.liquidado += val;
      else if (curr.situacao === 'Recepcionado') acc.recepcionado += val;
      else if (curr.situacao === 'Cancelado') acc.cancelado += val;
      else if (curr.situacao === 'Baixado') acc.baixado += val;
      return acc;
    },
    { registrado: 0, liquidado: 0, baixado: 0, recepcionado: 0, cancelado: 0 }
  );

  const percentProgress = batchTotal > 0 ? Math.round((batchCurrent / batchTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#EEEEF3] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#280003]">Cobranças de Aluguéis</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie os recebimentos, boletos e repasses</p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <button
              onClick={() => {
                setGenResult(null);
                setShowGenModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-[#280003] font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#280003]/70" />
              <span>Gerar Cobranças Mensais</span>
            </button>

            {pendingBatchList.length > 0 && (
              <button
                onClick={handleBatchGenerate}
                disabled={isBatchProcessing}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#280003] hover:bg-[#280003]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Gerar {pendingBatchList.length} Boletos Pendentes</span>
              </button>
            )}
          </div>
        </div>

        <FinancialFilterBar 
          filters={filters}
          onChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
          onApply={handleApplyFilters}
        />
        {loading ? (
          <div className="text-center py-12 text-[#280003] font-semibold">Carregando cobranças...</div>
        ) : (
          <>
            <FinancialSummary totals={totals} />
            <FinancialTable 
              data={cobrancas} 
              onRefresh={loadData}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* MODAL DE PROGRESSO DO LOTE */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            
            {/* Header */}
            <div className="bg-[#280003] text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Emissão de Boletos em Lote</h3>
                <p className="text-xs text-white/70 mt-0.5">
                  {isBatchProcessing ? 'Processando fila...' : 'Lote Concluído'}
                </p>
              </div>
              {!isBatchProcessing && (
                <button 
                  onClick={() => setShowBatchModal(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/90 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              
              {/* Progress Indicator */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-gray-700">
                  <span>Progresso Geral</span>
                  <span>{batchCurrent} de {batchTotal} ({percentProgress}%)</span>
                </div>
                
                {/* Progress Bar Container */}
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#280003] transition-all duration-300 rounded-full"
                    style={{ width: `${percentProgress}%` }}
                  />
                </div>
              </div>

              {/* Status Box */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="text-center border-r border-gray-200/60">
                  <span className="text-2xl font-black text-emerald-600 block">{batchSuccessCount}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sucesso</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-black text-red-500 block">{batchErrors.length}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Falhas</span>
                </div>
              </div>

              {/* Logs / Errors Area */}
              {batchErrors.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-red-700 block uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Lista de Falhas ({batchErrors.length})
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-red-100 bg-red-50/30 rounded-2xl p-3 space-y-2.5 divide-y divide-red-100/40">
                    {batchErrors.map((err, idx) => (
                      <div key={idx} className="text-xs pt-2 first:pt-0">
                        <span className="font-bold text-gray-800 block">{err.sacado}</span>
                        <span className="text-red-600 font-medium block mt-0.5">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer action */}
              {!isBatchProcessing && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="px-6 py-2.5 rounded-xl bg-[#280003] hover:bg-[#280003]/90 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {isBatchProcessing && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#280003]" />
                  Aguardando intervalo de segurança anti-rate-limit...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERAÇÃO DE COBRANÇAS MENSAIS */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100">
            
            {/* Header */}
            <div className="bg-[#280003] text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Gerar Cobranças Mensais</h3>
                <p className="text-xs text-white/70 mt-0.5">Disparar faturamento de contratos ativos</p>
              </div>
              {!isGenerating && (
                <button 
                  onClick={() => setShowGenModal(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/90 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {!genResult ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Mês de Competência</label>
                      <select
                        value={genMonth}
                        onChange={(e) => setGenMonth(Number(e.target.value))}
                        disabled={isGenerating}
                        className="block w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-[#280003] bg-white cursor-pointer focus:outline-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, '0')} - {new Date(2026, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Ano de Competência</label>
                      <select
                        value={genYear}
                        onChange={(e) => setGenYear(Number(e.target.value))}
                        disabled={isGenerating}
                        className="block w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-[#280003] bg-white cursor-pointer focus:outline-none"
                      >
                        {[2025, 2026, 2027, 2028, 2029].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 bg-zinc-50 border border-zinc-100 p-3.5 rounded-2xl">
                    Este processo irá percorrer todos os contratos de locação ativos e criar cobranças de aluguel pendentes para o período selecionado (evitando duplicatas automaticamente).
                  </p>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowGenModal(false)}
                      disabled={isGenerating}
                      className="px-5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-gray-700 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateMonthlyBillings}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#280003] hover:bg-[#280003]/90 text-white text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gerando...</span>
                        </>
                      ) : (
                        <span>Iniciar Geração</span>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-center py-4">
                  {genResult.success ? (
                    <div className="space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-lg">Geração Concluída!</h4>
                      <p className="text-sm text-gray-600">
                        Foram geradas com sucesso <span className="font-extrabold text-[#280003]">{genResult.count}</span> novas cobranças para a competência {String(genMonth).padStart(2, '0')}/{genYear}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-lg">Erro na Geração</h4>
                      <p className="text-sm text-red-600">{genResult.error}</p>
                    </div>
                  )}

                  <div className="flex justify-center pt-4 border-t border-zinc-100">
                    <button
                      onClick={() => {
                        setShowGenModal(false);
                        setGenResult(null);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#280003] hover:bg-[#280003]/90 text-white text-sm font-bold shadow-sm transition-all cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
