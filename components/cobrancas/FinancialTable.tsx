import React, { useState } from 'react';
import { 
  Download, 
  QrCode, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap, 
  X, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  gerarBolePixWrapperAction, 
  consultarBolePixWrapperAction, 
  simularPagamentoBolePixWrapperAction, 
  getInterPdfUrlAction 
} from '@/app/actions/interActions';

export type BilletStatus = 'Liquidado' | 'Recepcionado' | 'Pendente' | 'Cancelado' | 'Baixado';

export interface BilletData {
  id: string;
  recepcaoData: string;
  recepcaoHora: string;
  movimentoData: string;
  movimentoHora: string;
  vencimento: string;
  situacao: BilletStatus;
  valor: number;
  cedente: string;
  sacadoNome: string;
  sacadoCpf: string;
  pagamentoData: string | null;
  pagamentoValor: number | null;
  contratoId?: string;
  contratoStatus?: 'Ativo' | 'Pendente' | 'Encerrado';
  
  // Banco Inter Fields
  interNossoNumero?: string | null;
  interPixCode?: string | null;
  interBarcode?: string | null;
  interPdfKey?: string | null;
  interStatus?: string | null;
}

interface TableProps {
  data: BilletData[];
  onOpenSignatureModal?: (item: BilletData) => void;
  onRefresh?: () => void;
}

const getStatusBadge = (status: BilletStatus) => {
  switch (status) {
    case 'Liquidado':
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/40">Liquidado</span>;
    case 'Recepcionado':
    case 'Pendente':
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/40">{status}</span>;
    case 'Cancelado':
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/40">Cancelado</span>;
    case 'Baixado':
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/40">Baixado</span>;
    default:
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{status}</span>;
  }
};

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function FinancialTable({ data, onOpenSignatureModal, onRefresh }: TableProps) {
  const [selectedBillet, setSelectedBillet] = useState<BilletData | null>(null);
  const [copied, setCopied] = useState<"pix" | "barcode" | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // transacaoId or "global"
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCopy = (text: string, type: "pix" | "barcode") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGerarBoleto = async (transacaoId: string) => {
    setActionLoading(transacaoId);
    setErrorMessage(null);
    try {
      const res = await gerarBolePixWrapperAction(transacaoId);
      if (res.success) {
        if (onRefresh) onRefresh();
      } else {
        setErrorMessage(res.error || "Falha ao gerar boleto no Banco Inter.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenBoletoDetails = async (billet: BilletData) => {
    setSelectedBillet(billet);
    setErrorMessage(null);
    setPdfUrl(null);
    if (billet.interPdfKey) {
      try {
        const url = await getInterPdfUrlAction(billet.interPdfKey);
        setPdfUrl(url);
      } catch (err) {
        console.error("Erro ao resolver URL do PDF:", err);
      }
    }
  };

  const handleSincronizarBoleto = async (transacaoId: string) => {
    setActionLoading(transacaoId);
    setErrorMessage(null);
    try {
      const res = await consultarBolePixWrapperAction(transacaoId);
      if (res.success) {
        if (onRefresh) onRefresh();
        // Se o modal estiver aberto com esta cobrança, fecha ou atualiza
        setSelectedBillet(null);
      } else {
        setErrorMessage(res.error || "Falha ao sincronizar status.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimularPagamento = async (transacaoId: string) => {
    setActionLoading(transacaoId);
    setErrorMessage(null);
    try {
      const res = await simularPagamentoBolePixWrapperAction(transacaoId);
      if (res.success) {
        if (onRefresh) onRefresh();
        setSelectedBillet(null);
      } else {
        setErrorMessage(res.error || "Falha ao simular pagamento.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="w-full">
      {errorMessage && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm w-full overflow-x-auto mt-6 border border-gray-100/80">
        <table className="w-full text-left text-sm divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-4 font-semibold text-[#280003]/80">Recepção</th>
              <th className="px-4 py-4 font-semibold text-[#280003]/80">Vencimento</th>
              <th className="px-4 py-4 font-semibold text-[#280003]/80">Situação</th>
              <th className="px-4 py-4 font-semibold text-[#280003]/80 text-right">Valor (R$)</th>
              <th className="px-4 py-4 font-semibold text-[#280003]/80">Sacado</th>
              <th className="px-4 py-4 font-semibold text-[#280003]/80">Status Inter</th>
              <th className="px-4 py-4 font-semibold text-[#280003]/80 text-center">Integração Inter</th>
              <th className="px-4 py-4 font-semibold text-[#280003]/80 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-[#280003] font-medium">{item.recepcaoData}</div>
                  <div className="text-xs text-gray-500">{item.recepcaoHora}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-[#280003] font-medium">{item.vencimento}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(item.situacao)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-[#280003]">
                  {formatCurrency(item.valor)}
                </td>
                <td className="px-4 py-3">
                  <div className="text-[#280003] font-medium truncate max-w-[180px]">{item.sacadoNome}</div>
                  <div className="text-xs text-gray-500">{item.sacadoCpf}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.interStatus ? (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 uppercase">
                      {item.interStatus}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {item.situacao !== 'Liquidado' && item.situacao !== 'Cancelado' ? (
                    !item.interNossoNumero ? (
                      <button
                        onClick={() => handleGerarBoleto(item.id)}
                        disabled={actionLoading !== null}
                        className="px-3 py-1.5 rounded-lg bg-[#280003]/5 hover:bg-[#280003]/10 text-[#280003] text-xs font-bold transition-all disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                      >
                        {actionLoading === item.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#280003]/30 border-t-[#280003] rounded-full animate-spin"></div>
                        ) : null}
                        Gerar Boleto Inter
                      </button>
                    ) : (
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenBoletoDetails(item)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver Boleto
                        </button>
                        <button
                          onClick={() => handleSincronizarBoleto(item.id)}
                          disabled={actionLoading !== null}
                          title="Sincronizar Status"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === item.id ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    )
                  ) : item.interNossoNumero ? (
                    <button
                      onClick={() => handleOpenBoletoDetails(item)}
                      className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver Detalhes
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  {item.contratoStatus === 'Pendente' && (
                    <button
                      onClick={() => onOpenSignatureModal?.(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#004777] hover:bg-[#00365c] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      Liberar p/ Assinatura
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALHES BOLETO INTER */}
      {selectedBillet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
            
            {/* Header */}
            <div className="bg-[#280003] text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">BolePix Banco Inter</h3>
                <p className="text-xs text-white/70 mt-0.5">Nosso Número: {selectedBillet.interNossoNumero}</p>
              </div>
              <button 
                onClick={() => setSelectedBillet(null)}
                className="p-1 rounded-full hover:bg-white/10 text-white/90 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-xs text-gray-500 block">Pagador</span>
                  <span className="text-sm font-bold text-[#280003]">{selectedBillet.sacadoNome}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Valor Nominal</span>
                  <span className="text-sm font-bold text-[#280003]">{formatCurrency(selectedBillet.valor)}</span>
                </div>
              </div>

              {/* Pix Copia e Cola */}
              {selectedBillet.interPixCode && (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5 uppercase tracking-wider">Pix Copia e Cola</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={selectedBillet.interPixCode}
                      className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-600 focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopy(selectedBillet.interPixCode || "", "pix")}
                      className="px-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-[#280003] flex items-center justify-center cursor-pointer"
                      title="Copiar Pix"
                    >
                      {copied === "pix" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Codigo de Barras */}
              {selectedBillet.interBarcode && (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5 uppercase tracking-wider">Código de Barras</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={selectedBillet.interBarcode}
                      className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-600 focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopy(selectedBillet.interBarcode || "", "barcode")}
                      className="px-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-[#280003] flex items-center justify-center cursor-pointer"
                      title="Copiar Código de Barras"
                    >
                      {copied === "barcode" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-bold text-gray-700 text-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                ) : (
                  <div className="flex-1 text-center py-3 text-xs text-gray-400 font-semibold border border-dashed border-gray-200 rounded-xl">
                    PDF indisponível
                  </div>
                )}

                {/* Simular Pagamento em Sandbox */}
                {selectedBillet.situacao !== "Liquidado" && (
                  <button
                    onClick={() => handleSimularPagamento(selectedBillet.id)}
                    disabled={actionLoading !== null}
                    className="flex-1 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-all flex items-center justify-center gap-2 font-bold text-sm cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === selectedBillet.id ? (
                      <div className="w-4 h-4 border-2 border-amber-800/30 border-t-amber-800 rounded-full animate-spin"></div>
                    ) : (
                      <Zap className="w-4 h-4 text-amber-700" />
                    )}
                    Simular Pagamento (Sandbox)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
