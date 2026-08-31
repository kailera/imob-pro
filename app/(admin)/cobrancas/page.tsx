'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FinancialFilterBar from '@/components/cobrancas/FinancialFilterBar';
import FinancialTable, { BilletData } from '@/components/cobrancas/FinancialTable';
import FinancialSummary from '@/components/cobrancas/FinancialSummary';
import {
  FinancialPeriodMetrics,
  type FinancialMetricNavigationTarget,
  type FinancialPeriodMetricsData,
} from '@/components/financeiro/FinancialPeriodMetrics';
import { gerarCobrançasMensaisAction } from '@/app/actions/financeiroActions';
import { Zap, X, CheckCircle, AlertTriangle, Loader2, Calendar, RefreshCw } from 'lucide-react';
import { resolverSituacaoVisualBoleto } from '@/lib/financeiro/situacao-boleto';
import { formatarDataLocalISO } from '@/lib/locacao/financeiro';
import {
  INTER_BATCH_TASK_FINISHED_EVENT,
  useInterBatchTasks,
} from '@/components/cobrancas/InterBatchTaskProvider';

interface ApiTransaction {
  id: string;
  descricao: string;
  valor: number;
  status: 'PENDENTE' | 'LIQUIDADO' | 'CANCELADO';
  createdAt: string;
  updatedAt: string;
  dataVencimento: string;
  dataPagamento: string | null;
  interNossoNumero?: string | null;
  interCodigoSolicitacao?: string | null;
  interPixCode?: string | null;
  interBarcode?: string | null;
  interPdfKey?: string | null;
  interStatus?: string | null;
  interTxId?: string | null;
  metadata?: unknown;
  contrato?: {
    locatarios?: Array<{ telefone?: unknown; cpfCnpj?: string | null }>;
  } | null;
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Erro inesperado.';

const EMPTY_PERIOD_METRICS: FinancialPeriodMetricsData = {
  activeContracts: 0,
  contractCharges: 0,
  generatedBills: 0,
  settledBills: 0,
  chargesWithoutBill: 0,
  overdueBills: 0,
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function CobrancasPage() {
  const loadDataRef = useRef<(silent?: boolean) => Promise<void>>(async () => undefined);
  const loadRequestIdRef = useRef(0);
  const currentPageRef = useRef(1);
  const automaticFiltersReadyRef = useRef(false);
  const [metricNavigationVersion, setMetricNavigationVersion] = useState(0);
  const [cobrancas, setCobrancas] = useState<BilletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ registrado: 0, liquidado: 0, baixado: 0, recepcionado: 0, cancelado: 0 });
  const [periodMetrics, setPeriodMetrics] = useState<FinancialPeriodMetricsData>(EMPTY_PERIOD_METRICS);
  const [periodMetricsLoading, setPeriodMetricsLoading] = useState(true);
  const [periodMetricsError, setPeriodMetricsError] = useState('');
  const {
    tasks: interBatchTasks,
    hasActiveTask,
    startingOperation,
    startTask,
  } = useInterBatchTasks();

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
  const [appliedSearch, setAppliedSearch] = useState('');

  // Estados de Geração de Cobranças Mensais
  const [showGenModal, setShowGenModal] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{
    success: boolean;
    count?: number;
    updatedCount?: number;
    removedCount?: number;
    error?: string;
  } | null>(null);

  const metricsMonth = filters.mesReferencia === 'TODOS'
    ? currentMonth()
    : filters.mesReferencia;
  const metricsMonthLabel = useMemo(() => {
    const [year, month] = metricsMonth.split('-').map(Number);
    const label = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));
    const formatted = label.charAt(0).toUpperCase() + label.slice(1);
    return filters.mesReferencia === 'TODOS' ? `${formatted} (mês atual)` : formatted;
  }, [filters.mesReferencia, metricsMonth]);

  const loadPeriodMetrics = useCallback(async () => {
    setPeriodMetricsLoading(true);
    setPeriodMetricsError('');
    try {
      const response = await fetch(`/api/financeiro/metricas?month=${encodeURIComponent(metricsMonth)}`);
      if (!response.ok) throw new Error('Falha ao carregar os indicadores.');
      setPeriodMetrics(await response.json() as FinancialPeriodMetricsData);
    } catch (loadError) {
      console.error('Erro ao buscar indicadores das cobranças:', loadError);
      setPeriodMetrics(EMPTY_PERIOD_METRICS);
      setPeriodMetricsError('Não foi possível carregar os indicadores do período.');
    } finally {
      setPeriodMetricsLoading(false);
    }
  }, [metricsMonth]);

  const handleGenerateMonthlyBillings = async () => {
    setIsGenerating(true);
    setGenResult(null);
    try {
      const res = await gerarCobrançasMensaisAction(Number(genMonth), Number(genYear));
      if (res.success) {
        setGenResult({
          success: true,
          count: res.geradosCount,
          updatedCount: res.atualizadosCount,
          removedCount: res.removidosCount,
        });
        loadData();
        void loadPeriodMetrics();
      } else {
        setGenResult({ success: false, error: res.error });
      }
    } catch (err: unknown) {
      setGenResult({ success: false, error: errorMessage(err) });
    } finally {
      setIsGenerating(false);
    }
  };

  async function loadData(silent = false) {
    const requestId = ++loadRequestIdRef.current;
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        categoria: 'ALUGUEL',
        page: String(currentPage),
        limit: '10',
        dateField: filters.dateField,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: appliedSearch
      });
      if (filters.mesReferencia !== 'TODOS') {
        params.set('referenceMonth', filters.mesReferencia);
      }

      const res = await fetch(`/api/financeiro/transacoes?${params.toString()}`);
      if (!res.ok) throw new Error();
      const responseData = await res.json() as {
        data?: ApiTransaction[];
        total?: number;
        totalPages?: number;
        totals?: { registrado: number; liquidado: number; baixado: number; recepcionado: number; cancelado: number };
      };
      if (requestId !== loadRequestIdRef.current) return;
      
      const rawData = responseData.data || [];
      const total = responseData.total || 0;
      setTotalPages(responseData.totalPages || 1);
      setTotalItems(total);

      if (responseData.totals) {
        setTotals(responseData.totals);
      }

      // Mapear do banco de dados para a interface da tabela
      const mapped: BilletData[] = rawData.map((tx) => {
          const formatShortDate = (dStr: string | null) => {
            if (!dStr) return null;
            const d = new Date(dStr);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          };
          const formatTime = (dStr: string) => {
            const d = new Date(dStr);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          };

          const estadoBoleto = resolverSituacaoVisualBoleto({
            ...tx,
            hoje: formatarDataLocalISO(),
          });

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
            situacao: estadoBoleto.situacao,
            valor: tx.valor,
            cedente: 'Imob Pro',
            sacadoNome: tx.descricao.replace('Aluguel - ', ''),
            sacadoCpf: locatarioObj?.cpfCnpj || '***.***.***-**',
            sacadoTelefone,
            pagamentoData: formatShortDate(tx.dataPagamento),
            pagamentoValor: tx.status === 'LIQUIDADO' ? tx.valor : null,
            interNossoNumero: tx.interNossoNumero,
            interCodigoSolicitacao: tx.interCodigoSolicitacao,
            interPixCode: tx.interPixCode,
            interBarcode: tx.interBarcode,
            interPdfKey: tx.interPdfKey,
            interStatus: tx.interStatus,
            interStatusLabel: estadoBoleto.interStatusLabel,
            boletoAtivo: estadoBoleto.boletoAtivo,
            podeCorrigirEReemitir: estadoBoleto.podeCorrigirEReemitir,
          };
      });
      setCobrancas(mapped);
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error(err);
      if (silent) return;
      setCobrancas([]);
      setTotals({ registrado: 0, liquidado: 0, baixado: 0, recepcionado: 0, cancelado: 0 });
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }

  loadDataRef.current = loadData;
  currentPageRef.current = currentPage;

  const refreshFromFirstPage = useCallback(() => {
    if (currentPageRef.current === 1) {
      void loadDataRef.current();
    } else {
      setCurrentPage(1);
    }
  }, []);

  const handleApplyFilters = () => {
    if (filters.search !== appliedSearch) {
      setAppliedSearch(filters.search);
      return;
    }
    refreshFromFirstPage();
  };

  const handleMetricNavigation = useCallback((target: FinancialMetricNavigationTarget) => {
    setFilters(previous => ({
      ...previous,
      dateField: 'vencimento',
      status: target === 'WITHOUT_BILL' ? 'Sem boleto' : 'Em atraso',
      mesReferencia: metricsMonth,
      startDate: '',
      endDate: '',
      search: '',
    }));
    setAppliedSearch('');
    setCurrentPage(1);
    setMetricNavigationVersion(version => version + 1);
    window.setTimeout(() => {
      document.getElementById('lista-cobrancas')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }, [metricsMonth]);

  useEffect(() => {
    void loadDataRef.current();
  }, [currentPage, metricNavigationVersion]);

  useEffect(() => {
    const initialMetricsLoad = window.setTimeout(() => void loadPeriodMetrics(), 0);
    return () => window.clearTimeout(initialMetricsLoad);
  }, [loadPeriodMetrics]);

  useEffect(() => {
    const refreshAfterBatch = () => {
      void loadDataRef.current(true);
      void loadPeriodMetrics();
    };
    window.addEventListener(INTER_BATCH_TASK_FINISHED_EVENT, refreshAfterBatch);
    return () => window.removeEventListener(INTER_BATCH_TASK_FINISHED_EVENT, refreshAfterBatch);
  }, [loadPeriodMetrics]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedSearch(filters.search);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    if (!automaticFiltersReadyRef.current) {
      automaticFiltersReadyRef.current = true;
      return;
    }
    refreshFromFirstPage();
  }, [appliedSearch, filters.mesReferencia, refreshFromFirstPage]);

  useEffect(() => {
    const refreshVisiblePage = () => {
      if (document.visibilityState === 'visible') void loadDataRef.current(true);
    };
    const interval = window.setInterval(refreshVisiblePage, 5 * 60 * 1000);
    window.addEventListener('focus', refreshVisiblePage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisiblePage);
    };
  }, []);

  const handleBatchGenerate = () => void startTask('EMIT');
  const handleBatchStatusSync = () => void startTask('SYNC');
  const activeBatchOperation = interBatchTasks.find(task => (
    task.status === 'QUEUED' || task.status === 'RUNNING'
  ))?.operation;

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

            <button
              type="button"
              onClick={handleBatchStatusSync}
              disabled={hasActiveTask || startingOperation !== null}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#004777]/20 bg-white px-4 text-sm font-semibold text-[#004777] shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004777] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${startingOperation === 'SYNC' || activeBatchOperation === 'SYNC' ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
              <span>Atualizar status dos boletos</span>
            </button>

            <button
              type="button"
              onClick={handleBatchGenerate}
              disabled={hasActiveTask || startingOperation !== null}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#280003] px-4 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#280003]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#280003] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Zap className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>Gerar boletos automaticamente</span>
            </button>
          </div>
        </div>

        <FinancialFilterBar 
          filters={filters}
          onChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
          onApply={handleApplyFilters}
        />
        <FinancialPeriodMetrics
          data={periodMetrics}
          periodLabel={metricsMonthLabel}
          loading={periodMetricsLoading}
          error={periodMetricsError}
          layout="grid"
          onNavigate={handleMetricNavigation}
        />
        <div id="lista-cobrancas" className="scroll-mt-6">
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
      </div>

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
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Mês de vencimento</label>
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
                        Foram geradas com sucesso <span className="font-extrabold text-[#280003]">{genResult.count}</span> novas cobranças com vencimento em {String(genMonth).padStart(2, '0')}/{genYear}.
                      </p>
                      {(genResult.updatedCount ?? 0) > 0 && (
                        <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-[#004777]">
                          <span className="font-extrabold">{genResult.updatedCount}</span>{" "}
                          {genResult.updatedCount === 1
                            ? "cobrança pendente foi sincronizada"
                            : "cobranças pendentes foram sincronizadas"}{" "}
                          com o período contratual vigente.
                        </p>
                      )}
                      {(genResult.removedCount ?? 0) > 0 && (
                        <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                          <span className="font-extrabold">{genResult.removedCount}</span>{" "}
                          {genResult.removedCount === 1
                            ? "rascunho antigo sem boleto foi removido"
                            : "rascunhos antigos sem boleto foram removidos"}.
                        </p>
                      )}
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
