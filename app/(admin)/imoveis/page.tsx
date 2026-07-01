"use client";

import React, { useState, useEffect } from "react";
import { 
  Building, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  DollarSign, 
  Key, 
  MapPin, 
  AlertTriangle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { 
  getImoveis, 
  createImovel, 
  updateImovel, 
  deleteImovel,
  ImovelInput 
} from "@/app/actions/imoveisActions";
import { TipoImovel } from "@/generated/prisma";

interface Imovel {
  id: string;
  codigo: string;
  numero: number;
  bairro: string;
  cidade: string;
  uf: string;
  cep: number;
  tipo: TipoImovel;
  forVenda: boolean;
  forLocacao: boolean;
  valorAluguel: number | null;
  valorCondominio: number | null;
  valorIPTU: number | null;
  valorVenda: number | null;
  valorTotal: number | null;
}

const TIPO_LABELS: Record<TipoImovel, string> = {
  CASA: "Casa",
  CONDOMINIO: "Condomínio",
  LOTE: "Loteamento (Lote)",
  COMERCIAL: "Comercial",
  RURAL: "Rural",
};

export default function ImoveisPage() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>("TODOS");
  const [selectedModFilter, setSelectedModFilter] = useState<string>("TODOS");

  // State for Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingImovel, setEditingImovel] = useState<Imovel | null>(null);

  // Form Fields
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<TipoImovel>("CASA");
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");
  const [forVenda, setForVenda] = useState(false);
  const [forLocacao, setForLocacao] = useState(false);
  const [valorVenda, setValorVenda] = useState("");
  const [valorAluguel, setValorAluguel] = useState("");
  const [valorCondominio, setValorCondominio] = useState("");
  const [valorIPTU, setValorIPTU] = useState("");

  // Loading & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Delete Dialog state
  const [imovelToDelete, setImovelToDelete] = useState<Imovel | null>(null);

  // Fetch properties
  const fetchImoveis = async () => {
    setIsLoading(true);
    const res = await getImoveis();
    if (res.success && res.data) {
      setImoveis(res.data as Imovel[]);
    } else {
      setErrorMsg("Erro ao carregar imóveis.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchImoveis();
  }, []);

  // Rules: If type is LOTE, it cannot be for Locacao
  useEffect(() => {
    if (tipo === "LOTE") {
      setForLocacao(false);
      setValorAluguel("");
      setValorCondominio("");
      setValorIPTU("");
    }
  }, [tipo]);

  // Success message auto-dismiss
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Open modal for adding
  const handleAddClick = () => {
    setEditingImovel(null);
    setCodigo("");
    setTipo("CASA");
    setCep("");
    setCidade("");
    setUf("");
    setBairro("");
    setNumero("");
    setForVenda(true);
    setForLocacao(false);
    setValorVenda("");
    setValorAluguel("");
    setValorCondominio("");
    setValorIPTU("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEditClick = (imovel: Imovel) => {
    setEditingImovel(imovel);
    setCodigo(imovel.codigo);
    setTipo(imovel.tipo);
    setCep(String(imovel.cep));
    setCidade(imovel.cidade);
    setUf(imovel.uf);
    setBairro(imovel.bairro);
    setNumero(String(imovel.numero));
    setForVenda(imovel.forVenda);
    setForLocacao(imovel.forLocacao);
    setValorVenda(imovel.valorVenda ? String(imovel.valorVenda / 100) : "");
    setValorAluguel(imovel.valorAluguel ? String(imovel.valorAluguel / 100) : "");
    setValorCondominio(imovel.valorCondominio ? String(imovel.valorCondominio / 100) : "");
    setValorIPTU(imovel.valorIPTU ? String(imovel.valorIPTU / 100) : "");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // Form submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");

    // Front-end Validations
    if (!codigo || !bairro || !cidade || !uf || !cep || !numero) {
      setErrorMsg("Todos os campos de endereço, código e tipo são obrigatórios.");
      setIsSaving(false);
      return;
    }

    if (!forVenda && !forLocacao) {
      setErrorMsg("Selecione pelo menos uma modalidade (Venda ou Locação).");
      setIsSaving(false);
      return;
    }

    if (tipo === "LOTE" && forLocacao) {
      setErrorMsg("Loteamentos (Lotes) não podem ser alugados.");
      setIsSaving(false);
      return;
    }

    const payload: ImovelInput = {
      codigo,
      tipo,
      cep: parseInt(cep.replace(/\D/g, "")),
      cidade,
      uf: uf.toUpperCase(),
      bairro,
      numero: parseInt(numero),
      forVenda,
      forLocacao,
      valorVenda: forVenda && valorVenda ? Math.round(parseFloat(valorVenda) * 100) : null,
      valorAluguel: forLocacao && valorAluguel ? Math.round(parseFloat(valorAluguel) * 100) : null,
      valorCondominio: forLocacao && valorCondominio ? Math.round(parseFloat(valorCondominio) * 100) : null,
      valorIPTU: forLocacao && valorIPTU ? Math.round(parseFloat(valorIPTU) * 100) : null,
    };

    let result;
    if (editingImovel) {
      result = await updateImovel(editingImovel.id, payload);
    } else {
      result = await createImovel(payload);
    }

    if (result.success) {
      setSuccessMsg(editingImovel ? "Imóvel atualizado com sucesso!" : "Imóvel cadastrado com sucesso!");
      setIsModalOpen(false);
      fetchImoveis();
    } else {
      setErrorMsg(result.error || "Ocorreu um erro ao salvar o imóvel.");
    }
    setIsSaving(false);
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!imovelToDelete) return;
    const result = await deleteImovel(imovelToDelete.id);
    if (result.success) {
      setSuccessMsg("Imóvel excluído com sucesso!");
      setImovelToDelete(null);
      fetchImoveis();
    } else {
      setErrorMsg(result.error || "Ocorreu um erro ao excluir o imóvel.");
      setImovelToDelete(null);
    }
  };

  // Helper currency formatter
  const formatBRL = (centsValue: number | null) => {
    if (centsValue === null || centsValue === undefined) return "-";
    return (centsValue / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Filter and search logic
  const filteredImoveis = imoveis.filter((imovel) => {
    const matchesSearch = 
      imovel.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imovel.bairro.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imovel.cidade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      TIPO_LABELS[imovel.tipo].toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTipo = selectedTipoFilter === "TODOS" || imovel.tipo === selectedTipoFilter;
    
    const matchesMod = 
      selectedModFilter === "TODOS" ||
      (selectedModFilter === "VENDA" && imovel.forVenda) ||
      (selectedModFilter === "LOCACAO" && imovel.forLocacao);

    return matchesSearch && matchesTipo && matchesMod;
  });

  return (
    <div className="space-y-8 text-[#280003]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#280003]">Carteira de Imóveis</h1>
          <p className="text-[#280003]/70 mt-2">
            Cadastre, edite e acompanhe os imóveis de venda e locação da imobiliária.
          </p>
        </div>
        
        <button
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 bg-[#004777] text-white px-5 py-3 rounded-xl hover:bg-[#003355] transition-all font-semibold text-sm shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Cadastrar Novo Imóvel
        </button>
      </div>

      {/* Success Feedback Toast */}
      {successMsg && (
        <div className="bg-[#708D81]/15 border border-[#708D81]/30 text-[#3a5046] p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#708D81]" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col md:flex-row gap-5 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#280003]/40" />
          </div>
          <input
            type="text"
            placeholder="Buscar por código, bairro, cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-zinc-200 shadow-sm rounded-xl leading-5 bg-white placeholder-[#280003]/40 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] text-sm text-[#280003] transition-all"
          />
        </div>

        {/* Filters Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tipo Filter */}
          <div className="flex items-center gap-2 bg-[#EEEEF3]/60 px-3 py-1.5 rounded-xl border border-zinc-100">
            <span className="text-xs font-semibold text-[#280003]/60">Tipo:</span>
            <select
              value={selectedTipoFilter}
              onChange={(e) => setSelectedTipoFilter(e.target.value)}
              className="bg-transparent text-sm font-semibold text-[#280003] outline-none border-none cursor-pointer"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="CASA">Casa</option>
              <option value="CONDOMINIO">Condomínio</option>
              <option value="LOTE">Lote</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="RURAL">Rural</option>
            </select>
          </div>

          {/* Modalidade Filter */}
          <div className="flex items-center gap-2 bg-[#EEEEF3]/60 px-3 py-1.5 rounded-xl border border-zinc-100">
            <span className="text-xs font-semibold text-[#280003]/60">Modalidade:</span>
            <select
              value={selectedModFilter}
              onChange={(e) => setSelectedModFilter(e.target.value)}
              className="bg-transparent text-sm font-semibold text-[#280003] outline-none border-none cursor-pointer"
            >
              <option value="TODOS">Todas as Modalidades</option>
              <option value="VENDA">Apenas Venda</option>
              <option value="LOCACAO">Apenas Locação</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#EEEEF3]/30">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#280003]/50">Código</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#280003]/50">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#280003]/50">Endereço</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#280003]/50">Preço Venda</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#280003]/50">Aluguel / Encargos</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#280003]/50 text-center">Modalidade</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#280003]/50 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#280003]/60 font-medium">
                    <Loader2 className="w-6 h-6 animate-spin text-[#004777] mx-auto mb-2" />
                    Carregando imóveis da base de dados...
                  </td>
                </tr>
              ) : filteredImoveis.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#280003]/50 font-medium">
                    Nenhum imóvel encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredImoveis.map((imovel) => (
                  <tr key={imovel.id} className="hover:bg-zinc-50/60 transition-colors group">
                    {/* Código */}
                    <td className="px-6 py-4 text-sm font-bold text-[#004777]">
                      {imovel.codigo}
                    </td>

                    {/* Tipo */}
                    <td className="px-6 py-4 text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-[#280003]/40" />
                        {TIPO_LABELS[imovel.tipo]}
                      </span>
                    </td>

                    {/* Endereço */}
                    <td className="px-6 py-4 text-sm text-[#280003]/80">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#280003]/40" />
                        {imovel.bairro}, {imovel.cidade} - {imovel.uf}
                      </span>
                      <span className="block text-xs text-[#280003]/50 mt-0.5">
                        Número {imovel.numero} • CEP {imovel.cep}
                      </span>
                    </td>

                    {/* Preço Venda */}
                    <td className="px-6 py-4 text-sm font-semibold">
                      {imovel.forVenda ? (
                        <span className="text-zinc-800 font-bold">{formatBRL(imovel.valorVenda)}</span>
                      ) : (
                        <span className="text-zinc-400 font-normal">-</span>
                      )}
                    </td>

                    {/* Aluguel / Encargos */}
                    <td className="px-6 py-4 text-sm text-[#280003]/80">
                      {imovel.forLocacao ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-zinc-800 block">Aluguel: {formatBRL(imovel.valorAluguel)}/mês</span>
                          <span className="text-xs block text-[#280003]/60">
                            Cond: {formatBRL(imovel.valorCondominio)} • IPTU: {formatBRL(imovel.valorIPTU)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>

                    {/* Modalidade */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {imovel.forVenda && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-700">
                            Venda
                          </span>
                        )}
                        {imovel.forLocacao && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 border border-blue-100 text-blue-700">
                            Locação
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(imovel)}
                          className="p-1.5 text-zinc-600 hover:text-[#004777] hover:bg-[#EEEEF3] rounded-lg transition-colors cursor-pointer"
                          title="Editar Imóvel"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setImovelToDelete(imovel)}
                          className="p-1.5 text-zinc-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Imóvel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal/Drawer (Slide-over/Center Backdrop) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-zinc-200 transform transition-all duration-300 scale-100 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#EEEEF3]/50 border-b border-zinc-100">
              <h3 className="text-lg font-bold text-[#280003]">
                {editingImovel ? `Editar Imóvel: ${editingImovel.codigo}` : "Cadastrar Novo Imóvel"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Error alert */}
            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
              {/* Seção 1: Dados Gerais */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#280003]/50">Informações Básicas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Código */}
                  <div>
                    <label className="block text-xs font-bold text-[#280003] mb-1.5">Código do Imóvel *</label>
                    <input
                      type="text"
                      placeholder="Ex: IMB-101"
                      required
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                    />
                  </div>

                  {/* Tipo de Imóvel */}
                  <div>
                    <label className="block text-xs font-bold text-[#280003] mb-1.5">Tipo do Imóvel *</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as TipoImovel)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white cursor-pointer"
                    >
                      <option value="CASA">Casa</option>
                      <option value="CONDOMINIO">Condomínio</option>
                      <option value="LOTE">Loteamento (Lote)</option>
                      <option value="COMERCIAL">Comercial</option>
                      <option value="RURAL">Rural</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Endereço */}
              <div className="space-y-4 pt-2 border-t border-zinc-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#280003]/50">Endereço Completo</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* CEP */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-[#280003] mb-1.5">CEP *</label>
                    <input
                      type="text"
                      placeholder="Somente números"
                      required
                      maxLength={8}
                      value={cep}
                      onChange={(e) => setCep(e.target.value.replace(/\D/g, ""))}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-[#280003] mb-1.5">Cidade *</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      required
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                    />
                  </div>

                  {/* UF */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-[#280003] mb-1.5">UF *</label>
                    <input
                      type="text"
                      placeholder="Ex: SP"
                      required
                      maxLength={2}
                      value={uf}
                      onChange={(e) => setUf(e.target.value.toUpperCase())}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="col-span-3">
                    <label className="block text-xs font-bold text-[#280003] mb-1.5">Bairro *</label>
                    <input
                      type="text"
                      placeholder="Ex: Jardim Paulista"
                      required
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                    />
                  </div>

                  {/* Número */}
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-[#280003] mb-1.5">Número *</label>
                    <input
                      type="number"
                      placeholder="Ex: 15"
                      required
                      value={numero}
                      onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Modalidades & Preços */}
              <div className="space-y-4 pt-2 border-t border-zinc-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#280003]/50">Modalidades de Comercialização</h4>
                
                <div className="flex flex-col sm:flex-row gap-6 p-4 bg-[#EEEEF3]/25 rounded-xl border border-zinc-100">
                  {/* Option Venda */}
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={forVenda}
                      onChange={(e) => setForVenda(e.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 text-[#004777] focus:ring-[#004777]/20 rounded border-zinc-300 accent-[#004777]"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-[#280003]">Disponível para Venda</span>
                      <span className="text-xs text-[#280003]/50">Habilita o cadastro do preço total de venda.</span>
                    </div>
                  </label>

                  {/* Option Locação (Desabilitada para LOTES) */}
                  <label className={`flex items-start gap-3 cursor-pointer select-none ${tipo === "LOTE" ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <input
                      type="checkbox"
                      checked={forLocacao}
                      disabled={tipo === "LOTE"}
                      onChange={(e) => setForLocacao(e.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 text-[#004777] focus:ring-[#004777]/20 rounded border-zinc-300 accent-[#004777]"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-[#280003]">
                        Disponível para Locação
                      </span>
                      {tipo === "LOTE" ? (
                        <span className="text-xs font-bold text-amber-600 block mt-0.5">
                          Indisponível para Loteamento (Lote)
                        </span>
                      ) : (
                        <span className="text-xs text-[#280003]/50">Habilita aluguel, condomínio e IPTU.</span>
                      )}
                    </div>
                  </label>
                </div>

                {/* Dinamic price inputs rendering */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preço de Venda */}
                  {forVenda && (
                    <div className="border border-zinc-100 bg-[#EEEEF3]/10 p-4 rounded-xl space-y-2 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[#004777] font-semibold text-xs uppercase">
                        <DollarSign className="w-4 h-4" />
                        Finanças de Venda
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#280003] mb-1">Preço de Venda (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          required={forVenda}
                          value={valorVenda}
                          onChange={(e) => setValorVenda(e.target.value)}
                          className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Preço de Locação e Encargos */}
                  {forLocacao && tipo !== "LOTE" && (
                    <div className="border border-zinc-100 bg-[#EEEEF3]/10 p-4 rounded-xl space-y-3 col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[#004777] font-semibold text-xs uppercase col-span-1 sm:col-span-3">
                        <Key className="w-4 h-4" />
                        Finanças de Locação
                      </div>
                      
                      {/* Valor Aluguel */}
                      <div>
                        <label className="block text-xs font-bold text-[#280003] mb-1">Valor do Aluguel (R$/mês) *</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          required={forLocacao}
                          value={valorAluguel}
                          onChange={(e) => setValorAluguel(e.target.value)}
                          className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                        />
                      </div>

                      {/* Valor Condomínio */}
                      <div>
                        <label className="block text-xs font-bold text-[#280003] mb-1">Valor Condomínio (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={valorCondominio}
                          onChange={(e) => setValorCondominio(e.target.value)}
                          className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                        />
                      </div>

                      {/* Valor IPTU */}
                      <div>
                        <label className="block text-xs font-bold text-[#280003] mb-1">Valor IPTU (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={valorIPTU}
                          onChange={(e) => setValorIPTU(e.target.value)}
                          className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:text-zinc-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 bg-[#004777] hover:bg-[#003355] text-white px-5 py-2 text-sm font-semibold rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? "Salvando..." : "Salvar Imóvel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {imovelToDelete && (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 animate-scale-up">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#280003]">Confirmar Exclusão</h3>
                <p className="text-sm text-[#280003]/60 mt-2">
                  Deseja realmente excluir o imóvel <span className="font-bold text-[#004777]">{imovelToDelete.codigo}</span>? 
                  Esta ação é irreversível e excluirá todos os dados associados.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setImovelToDelete(null)}
                  className="px-4 py-2 text-sm font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Confirmar e Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
