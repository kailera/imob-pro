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
  AlertCircle,
  CheckSquare,
  Coins,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  gerarBolePixWrapperAction, 
  consultarBolePixWrapperAction, 
  simularPagamentoBolePixWrapperAction, 
  getInterPdfUrlAction 
} from '@/app/actions/interActions';
import { liquidarCobrancaAction } from '@/app/actions/financeiroActions';

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
  sacadoTelefone?: string | null;
}

interface TableProps {
  data: BilletData[];
  onOpenSignatureModal?: (item: BilletData) => void;
  onRefresh?: () => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
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

export default function FinancialTable({ 
  data, 
  onOpenSignatureModal, 
  onRefresh,
  currentPage,
  totalPages,
  totalItems,
  onPageChange
}: TableProps) {
  const [selectedBillet, setSelectedBillet] = useState<BilletData | null>(null);
  const [copied, setCopied] = useState<"pix" | "barcode" | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // transacaoId or "global"
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual payment states
  const [payingBillet, setPayingBillet] = useState<BilletData | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentValue, setPaymentValue] = useState<number>(0);

  const handleOpenPayModal = (billet: BilletData) => {
    setPayingBillet(billet);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentValue(billet.valor);
    setErrorMessage(null);
  };

  const handleConfirmPayment = async () => {
    if (!payingBillet) return;
    setActionLoading(payingBillet.id);
    setErrorMessage(null);
    try {
      const res = await liquidarCobrancaAction(payingBillet.id, new Date(paymentDate), paymentValue);
      if (res.success) {
        setPayingBillet(null);
        if (onRefresh) onRefresh();
      } else {
        setErrorMessage(res.error || "Falha ao registrar pagamento.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    } finally {
      setActionLoading(null);
    }
  };

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

  const handleWhatsAppSend = async (billet: BilletData) => {
    if (!billet.interPdfKey) {
      setErrorMessage("PDF indisponível para esta cobrança.");
      return;
    }
    setActionLoading(`wa-${billet.id}`);
    setErrorMessage(null);
    try {
      const url = await getInterPdfUrlAction(billet.interPdfKey);
      
      let phone = "";
      if (billet.sacadoTelefone) {
        phone = billet.sacadoTelefone.replace(/\D/g, "");
        if (phone.length > 0 && !phone.startsWith("55")) {
          phone = "55" + phone;
        }
      }
      
      const text = encodeURIComponent(
        `Olá, ${billet.sacadoNome}!\n` +
        `Segue o link para o PDF do boleto de aluguel (Vencimento: ${billet.vencimento}, Valor: ${formatCurrency(billet.valor)}):\n\n` +
        `${url}`
      );
      
      const waUrl = phone 
        ? `https://api.whatsapp.com/send?phone=${phone}&text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;
        
      window.open(waUrl, "_blank");
    } catch (err: any) {
      console.error("Erro ao enviar via WhatsApp:", err);
      setErrorMessage(err.message || "Erro ao gerar link de envio via WhatsApp.");
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
                          onClick={() => handleWhatsAppSend(item)}
                          disabled={actionLoading !== null}
                          title="Enviar via WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-all cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
                        >
                          {actionLoading === `wa-${item.id}` ? (
                            <div className="w-3.5 h-3.5 border-2 border-emerald-800/30 border-t-emerald-800 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.465 5.468 0 12.18 0 15.44 0 18.5 1.277 20.81 3.604c2.312 2.327 3.584 5.423 3.579 8.686-.009 6.714-5.474 12.18-12.187 12.18-1.999-.001-3.966-.492-5.717-1.428L0 24zm6.09-3.232c1.7.996 3.396 1.488 5.923 1.489 5.565-.001 10.093-4.529 10.098-10.095.002-2.7-.1.036-1.922-3.856a9.055 9.055 0 0 0-7.3-3.633c-5.567 0-10.098 4.531-10.103 10.097-.002 1.889.493 3.729 1.43 5.375l-1.002 3.662 3.754-.984zm13.111-7.464c-.267-.134-1.583-.781-1.829-.871-.247-.09-.427-.134-.607.134-.18.269-.696.871-.853 1.05-.157.179-.315.201-.582.067-.267-.134-1.13-.416-2.152-1.328-.795-.71-1.332-1.587-1.488-1.854-.157-.267-.017-.411.117-.544.121-.119.267-.313.401-.47.134-.157.179-.269.268-.448.09-.179.045-.335-.022-.47-.068-.134-.607-1.46-.831-2.001-.219-.526-.459-.452-.627-.457-.16-.004-.343-.005-.526-.005-.18 0-.473.067-.719.336-.247.269-.942.921-.942 2.247 0 1.326.966 2.607 1.1 2.787.134.18 1.9 2.901 4.603 4.069.642.278 1.144.444 1.536.569.645.205 1.233.176 1.698.107.518-.077 1.583-.647 1.808-1.272.225-.625.225-1.161.157-1.272-.068-.112-.247-.179-.513-.313z"/>
                            </svg>
                          )}
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
                  <div className="flex justify-end items-center gap-2">
                    {item.situacao !== 'Liquidado' && item.situacao !== 'Cancelado' && (
                      <button
                        onClick={() => handleOpenPayModal(item)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                        title="Marcar como Pago"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Marcar Pago
                      </button>
                    )}
                    {item.contratoStatus === 'Pendente' && (
                      <button
                        onClick={() => onOpenSignatureModal?.(item)}
                        className="px-3 py-1.5 rounded-lg bg-[#004777] hover:bg-[#00365c] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                      >
                        Liberar p/ Assinatura
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
          <div className="text-xs font-semibold text-gray-500">
            Mostrando página <span className="font-bold text-[#280003]">{currentPage}</span> de <span className="font-bold text-[#280003]">{totalPages}</span> ({totalItems} cobranças no total)
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first, last, and pages around current page
                return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
              })
              .map((page, idx, arr) => {
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="text-gray-400 text-sm px-1">...</span>}
                    <button
                      onClick={() => onPageChange(page)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#280003] text-white shadow-md'
                          : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
              
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Próxima Página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
                  <>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-bold text-gray-700 text-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </a>
                    <button
                      onClick={() => {
                        let phone = "";
                        if (selectedBillet.sacadoTelefone) {
                          phone = selectedBillet.sacadoTelefone.replace(/\D/g, "");
                          if (phone.length > 0 && !phone.startsWith("55")) {
                            phone = "55" + phone;
                          }
                        }
                        const text = encodeURIComponent(
                          `Olá, ${selectedBillet.sacadoNome}!\n` +
                          `Segue o link para o PDF do boleto de aluguel (Vencimento: ${selectedBillet.vencimento}, Valor: ${formatCurrency(selectedBillet.valor)}):\n\n` +
                          `${pdfUrl}`
                        );
                        const waUrl = phone 
                          ? `https://api.whatsapp.com/send?phone=${phone}&text=${text}`
                          : `https://api.whatsapp.com/send?text=${text}`;
                        window.open(waUrl, "_blank");
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-2 font-bold text-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.465 5.468 0 12.18 0 15.44 0 18.5 1.277 20.81 3.604c2.312 2.327 3.584 5.423 3.579 8.686-.009 6.714-5.474 12.18-12.187 12.18-1.999-.001-3.966-.492-5.717-1.428L0 24zm6.09-3.232c1.7.996 3.396 1.488 5.923 1.489 5.565-.001 10.093-4.529 10.098-10.095.002-2.7-.1.036-1.922-3.856a9.055 9.055 0 0 0-7.3-3.633c-5.567 0-10.098 4.531-10.103 10.097-.002 1.889.493 3.729 1.43 5.375l-1.002 3.662 3.754-.984zm13.111-7.464c-.267-.134-1.583-.781-1.829-.871-.247-.09-.427-.134-.607.134-.18.269-.696.871-.853 1.05-.157.179-.315.201-.582.067-.267-.134-1.13-.416-2.152-1.328-.795-.71-1.332-1.587-1.488-1.854-.157-.267-.017-.411.117-.544.121-.119.267-.313.401-.47.134-.157.179-.269.268-.448.09-.179.045-.335-.022-.47-.068-.134-.607-1.46-.831-2.001-.219-.526-.459-.452-.627-.457-.16-.004-.343-.005-.526-.005-.18 0-.473.067-.719.336-.247.269-.942.921-.942 2.247 0 1.326.966 2.607 1.1 2.787.134.18 1.9 2.901 4.603 4.069.642.278 1.144.444 1.536.569.645.205 1.233.176 1.698.107.518-.077 1.583-.647 1.808-1.272.225-.625.225-1.161.157-1.272-.068-.112-.247-.179-.513-.313z"/>
                      </svg>
                      Enviar WhatsApp
                    </button>
                  </>
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

      {/* MODAL REGISTRAR PAGAMENTO MANUAL */}
      {payingBillet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
            
            {/* Header */}
            <div className="bg-[#280003] text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Registrar Pagamento Manual</h3>
                <p className="text-xs text-white/70 mt-0.5">Marcar cobrança como paga no sistema</p>
              </div>
              <button 
                onClick={() => setPayingBillet(null)}
                disabled={actionLoading !== null}
                className="p-1 rounded-full hover:bg-white/10 text-white/90 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Info Sacado / Valor */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                <div>
                  <span className="text-xs text-gray-500 block font-medium">Sacado (Inquilino)</span>
                  <span className="text-sm font-bold text-[#280003]">{payingBillet.sacadoNome}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60">
                  <div>
                    <span className="text-xs text-gray-500 block font-medium">Vencimento</span>
                    <span className="text-sm font-bold text-[#280003]">{payingBillet.vencimento}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block font-medium">Valor Original</span>
                    <span className="text-sm font-bold text-[#280003]">{formatCurrency(payingBillet.valor)}</span>
                  </div>
                </div>
              </div>

              {/* Data Pagamento */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-[#280003]/70 uppercase tracking-wider">Data do Pagamento</label>
                <input 
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={actionLoading !== null}
                  className="border border-gray-200 rounded-xl p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]"
                />
              </div>

              {/* Valor Pago */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-[#280003]/70 uppercase tracking-wider">Valor Pago (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={paymentValue}
                  onChange={(e) => setPaymentValue(parseFloat(e.target.value) || 0)}
                  disabled={actionLoading !== null}
                  className="border border-gray-200 rounded-xl p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPayingBillet(null)}
                  disabled={actionLoading !== null}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all font-semibold text-gray-700 text-sm cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={actionLoading !== null}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-sm cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading === payingBillet.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <CheckSquare className="w-4 h-4" />
                  )}
                  <span>Confirmar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
