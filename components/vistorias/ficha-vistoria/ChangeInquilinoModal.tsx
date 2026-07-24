"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Plus, User, Edit3, Loader2, Check, Phone, Mail, FileText } from "lucide-react";
import {
  getLocatarios,
  updateVistoriaInquilino,
  updateInquilinoDetails,
  createAndLinkInquilinoToVistoria,
} from "@/app/(admin)/vistorias/actions";

interface ChangeInquilinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vistoriaId: string;
  currentLocatarioId?: string;
  onInquilinoUpdated: (updatedVistoriaData: any) => void;
}

export function ChangeInquilinoModal({
  isOpen,
  onClose,
  vistoriaId,
  currentLocatarioId,
  onInquilinoUpdated,
}: ChangeInquilinoModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");
  const [locatarios, setLocatarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquilinoId, setSelectedInquilinoId] = useState<string | undefined>(currentLocatarioId);

  // Status de salvamento / erro
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para Edição Inline de Inquilino existente
  const [editingInquilinoId, setEditingInquilinoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCpfCnpj, setEditCpfCnpj] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [updatingDetails, setUpdatingDetails] = useState(false);

  // Estado para Cadastro de Novo Inquilino
  const [newNome, setNewNome] = useState("");
  const [newCpfCnpj, setNewCpfCnpj] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelefone, setNewTelefone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInquilinosList();
      setSelectedInquilinoId(currentLocatarioId);
      setErrorMessage(null);
      setEditingInquilinoId(null);
    }
  }, [isOpen, currentLocatarioId]);

  const loadInquilinosList = async () => {
    setLoading(true);
    try {
      const res = await getLocatarios();
      if (res.success && res.data) {
        setLocatarios(res.data);
      }
    } catch (e) {
      console.error("Erro ao carregar inquilinos:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Formatação auxiliar de telefone JSON ou String
  const formatPhone = (val: any) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (Array.isArray(val) && val.length > 0) {
      return val.map((t) => t.numero || t).join(", ");
    }
    return String(val);
  };

  // Iniciar edição inline de um inquilino existente
  const startEditingInquilino = (inq: any) => {
    setEditingInquilinoId(inq.id);
    setEditNome(inq.nome || "");
    setEditCpfCnpj(inq.cpfCnpj || "");
    setEditEmail(inq.email || "");
    setEditTelefone(formatPhone(inq.telefone));
    setErrorMessage(null);
  };

  // Salvar edições inline no banco de dados
  const handleSaveInquilinoEdit = async (inqId: string) => {
    if (!editNome.trim()) {
      setErrorMessage("Informe o nome do inquilino.");
      return;
    }
    setUpdatingDetails(true);
    setErrorMessage(null);
    try {
      const res = await updateInquilinoDetails(inqId, {
        nome: editNome.trim(),
        cpfCnpj: editCpfCnpj.trim(),
        email: editEmail.trim(),
        telefone: editTelefone.trim(),
      });

      if (res.success && res.data) {
        // Atualiza a lista local de inquilinos
        setLocatarios((prev) =>
          prev.map((i) => (i.id === inqId ? { ...i, ...res.data } : i))
        );
        setEditingInquilinoId(null);

        // Se este era o inquilino atualmente vinculado, notifica o componente pai
        if (inqId === currentLocatarioId) {
          onInquilinoUpdated({
            locatario: res.data,
          });
        }
      } else {
        setErrorMessage(res.error || "Erro ao atualizar dados do inquilino.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao salvar imóvel.");
    } finally {
      setUpdatingDetails(false);
    }
  };

  // Vincular um inquilino existente à vistoria
  const handleSelectInquilino = async (inqId: string) => {
    setSavingId(inqId);
    setErrorMessage(null);
    try {
      const res = await updateVistoriaInquilino(vistoriaId, inqId);
      if (res.success && res.data) {
        setSelectedInquilinoId(inqId);
        onInquilinoUpdated(res.data);
        onClose();
      } else {
        setErrorMessage((res as any).error || "Erro ao vincular inquilino.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao vincular inquilino.");
    } finally {
      setSavingId(null);
    }
  };

  // Cadastrar novo inquilino e vincular imediatamente
  const handleCreateAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim() || !newCpfCnpj.trim()) {
      setErrorMessage("Nome completo e CPF/CNPJ são obrigatórios.");
      return;
    }

    setCreating(true);
    setErrorMessage(null);
    try {
      const res = await createAndLinkInquilinoToVistoria(vistoriaId, {
        nome: newNome.trim(),
        cpfCnpj: newCpfCnpj.trim(),
        email: newEmail.trim(),
        telefone: newTelefone.trim(),
      });

      if (res.success && res.data) {
        onInquilinoUpdated(res.data);
        onClose();
      } else {
        setErrorMessage((res as any).error || "Erro ao criar e vincular inquilino.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao cadastrar inquilino.");
    } finally {
      setCreating(false);
    }
  };

  // Filtro de busca na lista
  const filteredLocatarios = locatarios.filter((inq) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nomeMatch = (inq.nome || "").toLowerCase().includes(q);
    const cpfMatch = (inq.cpfCnpj || "").toLowerCase().includes(q);
    const emailMatch = (inq.email || "").toLowerCase().includes(q);
    const telMatch = formatPhone(inq.telefone).toLowerCase().includes(q);
    return nomeMatch || cpfMatch || emailMatch || telMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-[#EEEEF3] flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-[#004777] p-5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base">Alterar Inquilino da Vistoria</h3>
              <p className="text-xs text-white/80">Busque, edite ou cadastre o inquilino responsável</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors text-2xl font-light leading-none p-1 rounded-lg hover:bg-white/10"
          >
            &times;
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#EEEEF3] bg-gray-50/70 p-1.5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab("search"); setErrorMessage(null); }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "search"
                ? "bg-white text-[#004777] shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-[#004777] hover:bg-white/50"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar e Editar Inquilino</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("create"); setErrorMessage(null); }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "create"
                ? "bg-white text-[#004777] shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-[#004777] hover:bg-white/50"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Novo Inquilino</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium shrink-0">
            {errorMessage}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === "search" ? (
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, CPF/CNPJ, e-mail ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EEEEF3] text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777]"
                />
              </div>

              {/* Inquilinos List */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#004777]" />
                  <span className="text-xs">Carregando lista de inquilinos...</span>
                </div>
              ) : filteredLocatarios.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50/50">
                  <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-600">Nenhum inquilino encontrado</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Tente buscar por outro termo ou cadastre um novo inquilino na aba ao lado.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredLocatarios.map((inq) => {
                    const isSelected = inq.id === selectedInquilinoId;
                    const isEditingThis = editingInquilinoId === inq.id;
                    const telFormatted = formatPhone(inq.telefone);

                    return (
                      <div
                        key={inq.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "border-[#004777] bg-[#004777]/5"
                            : "border-[#EEEEF3] bg-white hover:border-gray-300"
                        }`}
                      >
                        {isEditingThis ? (
                          /* Inline Edit Form */
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <span className="text-xs font-bold text-[#004777] flex items-center gap-1.5">
                                <Edit3 className="w-3.5 h-3.5" />
                                Editar Dados do Inquilino na Base
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingInquilinoId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                Cancelar
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                                  Nome Completo *
                                </label>
                                <input
                                  type="text"
                                  value={editNome}
                                  onChange={(e) => setEditNome(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#004777]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                                  CPF / CNPJ
                                </label>
                                <input
                                  type="text"
                                  value={editCpfCnpj}
                                  onChange={(e) => setEditCpfCnpj(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#004777]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                                  Telefone / Celular
                                </label>
                                <input
                                  type="text"
                                  value={editTelefone}
                                  onChange={(e) => setEditTelefone(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#004777]"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                                  E-mail
                                </label>
                                <input
                                  type="email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#004777]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => setEditingInquilinoId(null)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={updatingDetails}
                                onClick={() => handleSaveInquilinoEdit(inq.id)}
                                className="px-3 py-1.5 rounded-lg bg-[#004777] text-white text-xs font-bold hover:bg-[#00365a] flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {updatingDetails ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Salvar Alterações na Base</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Card */
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-[#280003] truncate">
                                  {inq.nome}
                                </span>
                                {isSelected && (
                                  <span className="bg-[#004777] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Atual na Vistoria
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                                {inq.cpfCnpj && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-gray-400" />
                                    CPF/CNPJ: {inq.cpfCnpj}
                                  </span>
                                )}
                                {telFormatted && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    {telFormatted}
                                  </span>
                                )}
                                {inq.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                    {inq.email}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => startEditingInquilino(inq)}
                                title="Editar dados deste inquilino no banco"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-[#004777] transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={savingId === inq.id || isSelected}
                                onClick={() => handleSelectInquilino(inq.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-default"
                                    : "bg-[#004777] text-white hover:bg-[#00365a] shadow-sm"
                                }`}
                              >
                                {savingId === inq.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isSelected ? (
                                  "Selecionado"
                                ) : (
                                  "Vincular"
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Tab Create New Tenant */
            <form onSubmit={handleCreateAndLink} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Nome Completo do Inquilino *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Marielly Gonçalves Anacleto Cestari"
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EEEEF3] text-xs focus:outline-none focus:border-[#004777]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    CPF / CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={newCpfCnpj}
                    onChange={(e) => setNewCpfCnpj(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EEEEF3] text-xs focus:outline-none focus:border-[#004777]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Telefone / Celular
                  </label>
                  <input
                    type="text"
                    placeholder="(41) 99949-2009"
                    value={newTelefone}
                    onChange={(e) => setNewTelefone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EEEEF3] text-xs focus:outline-none focus:border-[#004777]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="marielly.anacleto@rhyos.com.br"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EEEEF3] text-xs focus:outline-none focus:border-[#004777]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#EEEEF3]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-[#004777] text-white text-xs font-bold hover:bg-[#00365a] shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Cadastrar e Vincular à Vistoria</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
