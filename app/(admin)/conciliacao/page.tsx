"use client";

import React, { useState, useEffect } from "react";
import { 
  FileCheck, 
  Upload, 
  ArrowLeft, 
  Check, 
  AlertCircle,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function ConciliacaoPage() {
  const [bankMovements, setBankMovements] = useState<any[]>([]);
  const [systemTransactions, setSystemTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Seleções do usuário para match
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      const [movRes, txRes] = await Promise.all([
        fetch("/api/financeiro/conciliacao?status=PENDENTE"),
        fetch("/api/financeiro/transacoes?status=PENDENTE")
      ]);

      if (movRes.ok) {
        const movData = await movRes.json();
        setBankMovements(movData);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setSystemTransactions(txData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de conciliação:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler de upload de arquivo
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadMessage("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/financeiro/conciliacao/importar", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setUploadMessage(data.message || "Arquivo importado com sucesso!");
        fetchData();
      } else {
        setUploadMessage(`Erro: ${data.error}`);
      }
    } catch (err) {
      setUploadMessage("Erro de rede ao carregar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Executar a conciliação/match
  const handleMatch = async () => {
    if (!selectedMovement || !selectedTransaction) return;

    try {
      const res = await fetch("/api/financeiro/conciliacao/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movimentacaoId: selectedMovement.id,
          transacaoId: selectedTransaction.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedMovement(null);
        setSelectedTransaction(null);
        fetchData();
        alert("Lançamentos conciliados e liquidados com sucesso!");
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar a conciliação.");
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  // Filtrar transações pendentes do sistema que correspondem ao tipo selecionado (CREDITO -> RECEITA, DEBITO -> DESPESA)
  const filteredSystemTransactions = selectedMovement
    ? systemTransactions.filter(t => {
        const expectedType = selectedMovement.tipo === "CREDITO" ? "RECEITA" : "DESPESA";
        return t.tipo === expectedType;
      })
    : systemTransactions;

  return (
    <div className="min-h-screen bg-[#EEEEF3] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Breadcrumb e cabeçalho */}
        <div className="space-y-2">
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#004777] transition-colors">
            <ArrowLeft className="w-3 h-3" />
            <span>Voltar para Financeiro</span>
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#280003] tracking-tight">Conciliação Bancária</h1>
              <p className="text-sm text-gray-500 mt-1">
                Importe faturas e extratos OFX/CSV para liquidar pagamentos e recebimentos pendentes.
              </p>
            </div>
          </div>
        </div>

        {/* Zona de Drag and Drop */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative bg-white rounded-3xl p-8 border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-3 ${
            dragActive ? "border-[#004777] bg-[#004777]/5" : "border-gray-300 hover:border-[#004777]/40"
          }`}
        >
          <input 
            type="file" 
            id="file-upload" 
            accept=".ofx,.csv"
            onChange={handleFileInput}
            className="hidden" 
          />
          <div className="w-14 h-14 bg-[#004777]/5 rounded-2xl flex items-center justify-center text-[#004777]">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <label htmlFor="file-upload" className="font-bold text-[#280003] hover:text-[#004777] cursor-pointer text-base">
              Clique para fazer upload
            </label>
            <span className="text-gray-400 font-medium"> ou arraste e solte o extrato bancário aqui</span>
          </div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Formatos Suportados: OFX e CSV (Extrato Bancário)</p>
          
          {uploading && <div className="text-sm text-[#004777] font-semibold mt-2">Processando e importando transações...</div>}
          {uploadMessage && (
            <div className={`text-sm font-bold mt-2 flex items-center gap-1.5 justify-center ${
              uploadMessage.startsWith("Erro") ? "text-red-600" : "text-emerald-600"
            }`}>
              <AlertCircle className="w-4 h-4" />
              <span>{uploadMessage}</span>
            </div>
          )}
        </div>

        {/* Interface de Conciliação Lado a Lado */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Lado Esquerdo: Movimentações do Extrato */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-white/60 shadow-sm p-6 space-y-4">
            <div className="border-b border-[#EEEEF3] pb-3 flex items-center justify-between">
              <h3 className="font-bold text-base text-[#280003] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>1. Lançamentos do Extrato ({bankMovements.length})</span>
              </h3>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Selecione uma linha</span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-6 text-gray-500">Carregando extrato...</div>
              ) : bankMovements.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhuma movimentação pendente encontrada no extrato.</div>
              ) : (
                bankMovements.map((mov) => {
                  const isSelected = selectedMovement?.id === mov.id;
                  return (
                    <div 
                      key={mov.id}
                      onClick={() => {
                        setSelectedMovement(isSelected ? null : mov);
                        setSelectedTransaction(null); // Reset a seleção da direita
                      }}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                        isSelected 
                          ? "border-[#004777] bg-[#004777]/5 shadow-sm scale-[0.99]" 
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold">{formatDate(mov.data)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                          mov.tipo === "CREDITO" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}>
                          {mov.tipo}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-[#280003] truncate">{mov.descricao}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400 font-medium">FITID: {mov.fitid || "N/D"}</span>
                        <span className={`font-extrabold text-sm ${mov.tipo === "CREDITO" ? "text-emerald-600" : "text-red-600"}`}>
                          {mov.tipo === "CREDITO" ? "+" : "-"} {formatCurrency(mov.valor)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Divisor Central / Ação de Match */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-6 lg:py-24 gap-4">
            {selectedMovement && selectedTransaction ? (
              <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300 w-full text-center">
                <div className="w-12 h-12 bg-[#004777] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#004777]/20">
                  <Check className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Match Pronto</div>
                <div className="text-xs text-gray-400 font-semibold px-2">
                  Diferença: {formatCurrency(Math.abs(selectedMovement.valor - selectedTransaction.valor))}
                </div>
                <button
                  onClick={handleMatch}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/10"
                >
                  Conciliar
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-gray-400">
                <HelpCircle className="w-10 h-10 text-gray-300" />
                <span className="text-xs font-semibold px-4">Selecione uma linha do extrato e uma fatura correspondente</span>
              </div>
            )}
          </div>

          {/* Lado Direito: Lançamentos Pendentes do Sistema */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-white/60 shadow-sm p-6 space-y-4">
            <div className="border-b border-[#EEEEF3] pb-3 flex items-center justify-between">
              <h3 className="font-bold text-base text-[#280003] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>2. Faturas / Repasses Pendentes ({filteredSystemTransactions.length})</span>
              </h3>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Correspondente</span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {!selectedMovement ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Selecione um lançamento do extrato bancário à esquerda primeiro para listar as faturas correspondentes.
                </div>
              ) : filteredSystemTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhuma fatura correspondente pendente do tipo {selectedMovement.tipo === "CREDITO" ? "RECEITA" : "DESPESA"} encontrada.
                </div>
              ) : (
                filteredSystemTransactions.map((tx) => {
                  const isSelected = selectedTransaction?.id === tx.id;
                  const valueMatches = Math.abs(tx.valor - selectedMovement.valor) < 0.01;
                  return (
                    <div 
                      key={tx.id}
                      onClick={() => setSelectedTransaction(isSelected ? null : tx)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                        isSelected 
                          ? "border-emerald-600 bg-emerald-50/30 shadow-sm scale-[0.99]" 
                          : valueMatches 
                          ? "border-emerald-200 bg-emerald-50/10 hover:border-emerald-300"
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold">Venc. {formatDate(tx.dataVencimento)}</span>
                        {valueMatches && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-extrabold tracking-wide uppercase px-2 py-0.5 rounded-full">
                            Valor Idêntico
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-[#280003]">{tx.descricao}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400 font-semibold px-2 py-0.5 bg-[#EEEEF3] rounded-md">{tx.categoria}</span>
                        <span className="font-extrabold text-sm text-[#004777]">
                          {formatCurrency(tx.valor)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
