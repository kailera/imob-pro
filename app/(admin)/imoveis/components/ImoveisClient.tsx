"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building,
  Search,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { TipoImovel } from "@/generated/prisma";
import {
  getImoveis,
  getLoteamentos,
  deleteImovel
} from "@/app/actions/imoveisActions";
import ImovelFormModal from "./ImovelFormModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

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
  loteamentoId?: string | null;
  loteamento?: { id: string; nome: string } | null;
  aluguelDados?: any;
}

const TIPO_LABELS: Record<TipoImovel, string> = {
  CASA: "Casa",
  CONDOMINIO: "Condomínio",
  LOTE: "Loteamento (Lote)",
  COMERCIAL: "Comercial",
  RURAL: "Rural",
  KITNET: "Kitnet"
};

interface ImoveisClientProps {
  initialImoveis: any[];
  initialLoteamentos: any[];
}

export default function ImoveisClient({
  initialImoveis,
  initialLoteamentos,
}: ImoveisClientProps) {
  const imoveis = initialImoveis as Imovel[];
  const loteamentos = initialLoteamentos;
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>("TODOS");
  const [selectedModFilter, setSelectedModFilter] = useState<string>("TODOS");

  // State for Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingImovel, setEditingImovel] = useState<Imovel | null>(null);

  // Loading & Feedback
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Delete Dialog state
  const [imovelToDelete, setImovelToDelete] = useState<Imovel | null>(null);



  const searchParams = useSearchParams();

  // Success message auto-dismiss
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Open edit modal automatically if edit parameter is present
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && imoveis.length > 0) {
      const found = imoveis.find((im) => im.id === editId);
      if (found) {
        setEditingImovel(found);
        setErrorMsg("");
        setIsModalOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [searchParams, imoveis]);

  // Open modal for adding
  const handleAddClick = () => {
    setEditingImovel(null);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEditClick = (imovel: Imovel) => {
    setEditingImovel(imovel);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setIsModalOpen(false);

  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!imovelToDelete) return;
    const result = await deleteImovel(imovelToDelete.id);
    if (result.success) {
      setSuccessMsg("Imóvel excluído com sucesso!");
      setImovelToDelete(null);

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

      {/* Error alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="text-sm font-semibold">{errorMsg}</span>
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
                      {imovel.loteamento && (
                        <span className="block text-[#004777] text-xs font-semibold mt-0.5">
                          Cond: {imovel.loteamento.nome}
                        </span>
                      )}
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

      {/* CRUD Form Modal */}
      <ImovelFormModal
        isOpen={isModalOpen}
        editingImovel={editingImovel}
        loteamentos={loteamentos}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={!!imovelToDelete}
        codigo={imovelToDelete?.codigo || ""}
        onClose={() => setImovelToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
