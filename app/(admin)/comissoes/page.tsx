"use client";

import React, { useState, useEffect } from "react";
import { 
  UserCheck, 
  ArrowUpRight, 
  Plus, 
  X, 
  DollarSign, 
  Coins, 
  Check, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";

export default function ComissoesPage() {
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [usuarioId, setUsuarioId] = useState("");
  const [valorBruto, setValorBruto] = useState("");
  const [percentual, setPercentual] = useState("5");
  const [valorComissao, setValorComissao] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("VENDA");
  const [dataVencimento, setDataVencimento] = useState("");

  const fetchData = async () => {
    try {
      const [comRes, userRes] = await Promise.all([
        fetch("/api/financeiro/comissoes"),
        fetch("/api/financeiro/usuarios")
      ]);
      
      if (comRes.ok) {
        const comData = await comRes.ok ? await comRes.json() : [];
        setComissoes(comData);
      }
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsuarios(userData);
        if (userData.length > 0) setUsuarioId(userData[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de comissão:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-calcular valor de comissão quando altera valor bruto ou percentual
  useEffect(() => {
    const bruto = parseFloat(valorBruto) || 0;
    const perc = parseFloat(percentual) || 0;
    setValorComissao((bruto * (perc / 100)).toFixed(2));
  }, [valorBruto, percentual]);

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioId || !valorBruto || !percentual || !valorComissao || !dataVencimento) return;

    try {
      const res = await fetch("/api/financeiro/comissoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId,
          valorBrutoNegocio: parseFloat(valorBruto),
          percentual: parseFloat(percentual),
          valorComissao: parseFloat(valorComissao),
          tipoNegocio,
          dataVencimento
        })
      });

      if (res.ok) {
        setShowModal(false);
        setValorBruto("");
        setPercentual("5");
        setDataVencimento("");
        fetchData();
      }
    } catch (err) {
      console.error("Erro ao registrar comissão:", err);
    }
  };

  const handlePayCommission = async (id: string) => {
    if (!confirm("Confirmar o pagamento desta comissão? Isso gerará um lançamento de despesa no livro caixa.")) return;

    try {
      const res = await fetch("/api/financeiro/comissoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "PAGO"
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Erro ao pagar comissão:", err);
    }
  };

  const totalPago = comissoes
    .filter(c => c.status === "PAGO")
    .reduce((sum, c) => sum + c.valorComissao, 0);

  const totalPendente = comissoes
    .filter(c => c.status === "PENDENTE")
    .reduce((sum, c) => sum + c.valorComissao, 0);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

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
              <h1 className="text-3xl font-extrabold text-[#280003] tracking-tight">Comissões de Corretores</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gerencie regras e efetue pagamentos de comissões sobre vendas de imóveis/lotes ou locações.
              </p>
            </div>
            
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#004777] hover:bg-[#004777]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-[#004777]/10"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Comissão</span>
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-white/60 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Pago</span>
              <h2 className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPago)}</h2>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Check className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-white/60 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Pendente</span>
              <h2 className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendente)}</h2>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-white/60 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Beneficiários Ativos</span>
              <h2 className="text-2xl font-bold text-[#004777]">
                {new Set(comissoes.map(c => c.usuarioId)).size}
              </h2>
            </div>
            <div className="w-12 h-12 bg-[#004777]/5 rounded-2xl flex items-center justify-center text-[#004777]">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tabela de Comissões */}
        <div className="bg-white rounded-3xl border border-white/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#EEEEF3]">
            <h3 className="font-bold text-lg text-[#280003]">Comissões Lançadas</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 font-semibold">Carregando comissões...</div>
          ) : comissoes.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Nenhuma comissão cadastrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#280003]">
                <thead className="bg-[#EEEEF3]/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Data Venc.</th>
                    <th className="px-6 py-4">Corretor / Funcionário</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Valor Negócio</th>
                    <th className="px-6 py-4">Comissão (%)</th>
                    <th className="px-6 py-4">A Receber</th>
                    <th className="px-6 py-4">Situação</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEF3]">
                  {comissoes.map((c) => (
                    <tr key={c.id} className="hover:bg-[#EEEEF3]/20 transition-colors">
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        {formatDate(c.dataVencimento)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#280003]">
                          {c.usuario.firstName} {c.usuario.lastName}
                        </div>
                        <div className="text-xs text-gray-400">{c.usuario.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.tipoNegocio === "VENDA" ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-sky-50 text-sky-700 border border-sky-100"
                        }`}>
                          {c.tipoNegocio}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(c.valorBrutoNegocio)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-500">
                        {c.percentual}%
                      </td>
                      <td className="px-6 py-4 font-extrabold text-[#004777]">
                        {formatCurrency(c.valorComissao)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.status === "PAGO" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            c.status === "PAGO" ? "bg-emerald-600" : "bg-amber-500"
                          }`} />
                          <span>
                            {c.status === "PAGO" ? "Pago" : "Pendente"}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {c.status === "PENDENTE" ? (
                          <button
                            onClick={() => handlePayCommission(c.id)}
                            className="text-xs font-bold bg-[#004777] hover:bg-[#004777]/90 text-white py-1.5 px-3 rounded-lg transition-colors shadow-sm"
                          >
                            Pagar Comissão
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400">
                            Paga em {formatDate(c.dataPagamento)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Comissão */}
      {showModal && (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#EEEEF3] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-[#EEEEF3] flex items-center justify-between bg-[#EEEEF3]/30">
              <h3 className="font-extrabold text-[#280003] text-lg">Nova Regra de Comissão</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-[#EEEEF3] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCommission} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Corretor / Funcionário</label>
                <select
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none"
                  required
                >
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tipo do Negócio</label>
                  <select 
                    value={tipoNegocio}
                    onChange={(e) => setTipoNegocio(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none"
                  >
                    <option value="VENDA">Venda</option>
                    <option value="LOCACAO">Locação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Data Vencimento</label>
                  <input 
                    type="date" 
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Valor do Negócio (R$)</label>
                  <input 
                    type="number" 
                    value={valorBruto}
                    onChange={(e) => setValorBruto(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Taxa (%)</label>
                  <input 
                    type="number" 
                    value={percentual}
                    onChange={(e) => setPercentual(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#EEEEF3]/60 border-none rounded-xl text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Valor Líquido da Comissão (R$)</label>
                <input 
                  type="text" 
                  value={formatCurrency(parseFloat(valorComissao) || 0)}
                  className="w-full px-4 py-2.5 bg-[#EEEEF3]/30 border-none rounded-xl text-sm text-[#004777] font-bold focus:outline-none"
                  readOnly
                />
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
                  Confirmar Comissão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
