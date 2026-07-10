"use client";

import React, { useState, useEffect } from "react";
import { 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Plus, 
  Calendar, 
  Filter, 
  FileCheck, 
  Check, 
  X,
  CreditCard,
  UserCheck
} from "lucide-react";
import Link from "next/link";

export default function FinanceiroPage() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  // Campos do formulário de nova transação
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("RECEITA");
  const [categoria, setCategoria] = useState("ALUGUEL");
  const [dataVencimento, setDataVencimento] = useState("");
  const [status, setStatus] = useState("PENDENTE");

  const fetchTransacoes = async () => {
    try {
      const res = await fetch("/api/financeiro/transacoes");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTransacoes(data);
    } catch (err) {
      console.error("Erro ao buscar transações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransacoes();
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !dataVencimento) return;

    try {
      const res = await fetch("/api/financeiro/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao,
          valor: parseFloat(valor),
          tipo,
          categoria,
          status,
          dataVencimento,
          dataPagamento: status === "LIQUIDADO" ? new Date().toISOString() : null
        })
      });

      if (res.ok) {
        setShowModal(false);
        // Reset form
        setDescricao("");
        setValor("");
        setDataVencimento("");
        setStatus("PENDENTE");
        fetchTransacoes();
      }
    } catch (err) {
      console.error("Erro ao criar transação:", err);
    }
  };

  // Calcular resumos
  const totalReceitas = transacoes
    .filter(t => t.tipo === "RECEITA" && t.status === "LIQUIDADO")
    .reduce((sum, t) => sum + t.valor, 0);

  const totalDespesas = transacoes
    .filter(t => t.tipo === "DESPESA" && t.status === "LIQUIDADO")
    .reduce((sum, t) => sum + t.valor, 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  const pendingReceitas = transacoes
    .filter(t => t.tipo === "RECEITA" && t.status === "PENDENTE")
    .reduce((sum, t) => sum + t.valor, 0);

  const pendingDespesas = transacoes
    .filter(t => t.tipo === "DESPESA" && t.status === "PENDENTE")
    .reduce((sum, t) => sum + t.valor, 0);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-[#EEEEF3] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#280003] tracking-tight">Gestão Financeira</h1>
            <p className="text-sm text-gray-500 mt-1">
              Controle de fluxo de caixa, receitas, custos operacionais e liquidações.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Link 
              href="/comissoes" 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EEEEF3] hover:bg-[#EEEEF3] text-[#280003] font-medium rounded-xl text-sm transition-all shadow-sm"
            >
              <UserCheck className="w-4 h-4 text-[#004777]" />
              <span>Gerenciar Comissões</span>
            </Link>
            <Link 
              href="/conciliacao" 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EEEEF3] hover:bg-[#EEEEF3] text-[#280003] font-medium rounded-xl text-sm transition-all shadow-sm"
            >
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Conciliação Bancária</span>
            </Link>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#004777] hover:bg-[#004777]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-[#004777]/10"
            >
              <Plus className="w-4 h-4" />
              <span>Lançamento Manual</span>
            </button>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Receitas */}
          <div className="bg-white rounded-3xl p-6 border border-white/60 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Receitas Liquidadas</span>
              <h2 className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceitas)}</h2>
              <span className="text-xs text-gray-500 block">Pendente: {formatCurrency(pendingReceitas)}</span>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          {/* Card Despesas */}
          <div className="bg-white rounded-3xl p-6 border border-white/60 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Despesas Pagas</span>
              <h2 className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</h2>
              <span className="text-xs text-gray-500 block">A pagar: {formatCurrency(pendingDespesas)}</span>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
              <ArrowDownRight className="w-6 h-6" />
            </div>
          </div>

          {/* Card Saldo Líquido */}
          <div className="bg-white rounded-3xl p-6 border border-white/60 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Resultado Líquido</span>
              <h2 className={`text-2xl font-bold ${saldoLiquido >= 0 ? "text-[#004777]" : "text-amber-600"}`}>
                {formatCurrency(saldoLiquido)}
              </h2>
              <span className="text-xs text-gray-500 block">Considerando liquidados</span>
            </div>
            <div className="w-12 h-12 bg-[#004777]/5 rounded-2xl flex items-center justify-center text-[#004777]">
              <Coins className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="bg-white rounded-3xl border border-white/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#EEEEF3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-lg text-[#280003]">Fluxo de Caixa e Lançamentos</h3>
            
            {/* Filtros simples */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Período:</span>
              </span>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-xs bg-[#EEEEF3] border-none rounded-lg py-1.5 px-3 font-medium text-[#280003] focus:outline-none"
              >
                <option value="all">Todas as transações</option>
                <option value="this-month">Mês Atual</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 font-semibold">Carregando livro caixa...</div>
          ) : transacoes.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Nenhuma transação encontrada no banco de dados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#280003]">
                <thead className="bg-[#EEEEF3]/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Data Venc.</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEF3]">
                  {transacoes.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#EEEEF3]/20 transition-colors">
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        {formatDate(tx.dataVencimento)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#280003]">
                        {tx.descricao}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEEEF3] text-[#280003]">
                          {tx.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          tx.tipo === "RECEITA" ? "text-emerald-600" : "text-red-600"
                        }`}>
                          {tx.tipo === "RECEITA" ? "+" : "-"} {tx.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {formatCurrency(tx.valor)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          tx.status === "LIQUIDADO" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : tx.status === "CANCELADO"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            tx.status === "LIQUIDADO" ? "bg-emerald-600" : tx.status === "CANCELADO" ? "bg-gray-400" : "bg-amber-500"
                          }`} />
                          <span>
                            {tx.status === "LIQUIDADO" ? "Liquidado" : tx.status === "CANCELADO" ? "Cancelado" : "Pendente"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Lançamento Manual */}
      {showModal && (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#EEEEF3] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-[#EEEEF3] flex items-center justify-between bg-[#EEEEF3]/30">
              <h3 className="font-extrabold text-[#280003] text-lg">Novo Lançamento Manual</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-[#EEEEF3] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Descrição</label>
                <input 
                  type="text" 
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Pagamento de Energia Escritório"
                  className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Data Vencimento</label>
                  <input 
                    type="date" 
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tipo</label>
                  <select 
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  >
                    <option value="RECEITA">RECEITA (+)</option>
                    <option value="DESPESA">DESPESA (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Categoria</label>
                  <select 
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  >
                    <option value="ALUGUEL">Aluguel</option>
                    <option value="REPASSE">Repasse proprietário</option>
                    <option value="TAXA_ADM">Taxa Adm.</option>
                    <option value="COMISSAO">Comissão</option>
                    <option value="CUSTO_OPERACIONAL">Custo Operacional</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Situação</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none"
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="LIQUIDADO">Liquidado / Pago</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#EEEEF3] flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-[#EEEEF3] rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#004777] hover:bg-[#004777]/90 text-white rounded-xl transition-colors shadow-md"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
