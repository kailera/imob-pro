"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Plus, Building, MapPin, AlertTriangle, Loader2, Check, Edit2, Save, ArrowLeft } from "lucide-react";
import { formatImovelAddress } from "@/lib/vistorias/formatters";
import { getImoveisForVistoria, updateVistoriaImovel, createAndLinkImovelToVistoria, updateVistoriaImovelDetails } from "@/app/(admin)/vistorias/actions";

interface ChangeImovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  vistoriaId: string;
  currentImovelId?: string;
  onImovelUpdated: (updatedVistoriaData: any) => void;
}

export function ChangeImovelModal({
  isOpen,
  onClose,
  vistoriaId,
  currentImovelId,
  onImovelUpdated,
}: ChangeImovelModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");
  
  // Tab 1: Search state
  const [imoveis, setImoveis] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingImoveis, setLoadingImoveis] = useState(false);
  const [selectedImovelId, setSelectedImovelId] = useState<string>(currentImovelId || "");
  const [updating, setUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Inline Edit Imóvel State (inside Search Tab)
  const [editingImovelId, setEditingImovelId] = useState<string | null>(null);
  const [editLogradouro, setEditLogradouro] = useState("");
  const [editNumero, setEditNumero] = useState<number | "">("");
  const [editBairro, setEditBairro] = useState("");
  const [editCidade, setEditCidade] = useState("");
  const [editUf, setEditUf] = useState("SP");
  const [editTipo, setEditTipo] = useState<any>("CASA");
  const [editProprietario, setEditProprietario] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Tab 2: Create state
  const [newCodigo, setNewCodigo] = useState("");
  const [newLogradouro, setNewLogradouro] = useState("");
  const [newNumero, setNewNumero] = useState<number | "">("");
  const [newBairro, setNewBairro] = useState("");
  const [newCidade, setNewCidade] = useState("");
  const [newUf, setNewUf] = useState("SP");
  const [newTipo, setNewTipo] = useState<any>("CASA");
  const [newProprietario, setNewProprietario] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadImoveis();
      setErrorMessage("");
      setSelectedImovelId(currentImovelId || "");
      setEditingImovelId(null);
    }
  }, [isOpen, currentImovelId]);

  const loadImoveis = async () => {
    setLoadingImoveis(true);
    try {
      const res = await getImoveisForVistoria(vistoriaId);
      if (res.success && res.data) {
        setImoveis(res.data);
      }
    } catch (e) {
      console.error("Erro ao carregar lista de imóveis:", e);
    } finally {
      setLoadingImoveis(false);
    }
  };

  const filteredImoveis = imoveis.filter((im) => {
    const fullAddress = formatImovelAddress(im).toLowerCase();
    const code = (im.codigo || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullAddress.includes(query) || code.includes(query);
  });

  const handleSelectImovel = async (imovelId: string) => {
    setUpdating(true);
    setErrorMessage("");
    try {
      const res = await updateVistoriaImovel(vistoriaId, imovelId);
      if (res.success && res.data) {
        onImovelUpdated(res.data);
        onClose();
      } else {
        setErrorMessage(res.error || "Erro ao vincular imóvel à vistoria.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao atualizar imóvel.");
    } finally {
      setUpdating(false);
    }
  };

  const startEditImovel = (im: any) => {
    setEditingImovelId(im.id);
    setEditLogradouro(im.logradouro || "");
    setEditNumero(im.numero !== undefined && im.numero !== null ? im.numero : "");
    setEditBairro(im.bairro || "");
    setEditCidade(im.cidade || "");
    setEditUf(im.uf || "SP");
    setEditTipo(im.tipo || "CASA");
    setEditProprietario(im.imovelLocacaos?.[0]?.locadors?.[0]?.nome || "");
  };

  const handleSaveImovelDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImovelId) return;

    setSavingEdit(true);
    setErrorMessage("");
    try {
      const res = await updateVistoriaImovelDetails(vistoriaId, editingImovelId, {
        logradouro: editLogradouro || undefined,
        numero: typeof editNumero === "number" ? editNumero : 0,
        bairro: editBairro,
        cidade: editCidade,
        uf: editUf,
        tipo: editTipo,
        proprietario: editProprietario || undefined,
      });

      if (res.success && res.data) {
        // Se o imóvel editado é o atualmente vinculado a esta vistoria, vincula/recarrega
        onImovelUpdated(res.data);
        await loadImoveis();
        setEditingImovelId(null);
      } else {
        setErrorMessage(res.error || "Erro ao atualizar dados do imóvel no banco.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao salvar alterações.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBairro || !newCidade || !newUf) {
      setErrorMessage("Bairro, Cidade e UF são obrigatórios.");
      return;
    }

    setCreating(true);
    setErrorMessage("");
    try {
      const res = await createAndLinkImovelToVistoria(vistoriaId, {
        codigo: newCodigo || undefined,
        logradouro: newLogradouro || undefined,
        numero: typeof newNumero === "number" ? newNumero : 0,
        bairro: newBairro,
        cidade: newCidade,
        uf: newUf,
        tipo: newTipo,
        proprietario: newProprietario || undefined,
      });

      if (res.success && res.data) {
        onImovelUpdated(res.data);
        onClose();
      } else {
        setErrorMessage((res as any).error || "Erro ao criar e vincular imóvel.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao cadastrar imóvel.");
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-[#EEEEF3] flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#004777] p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            <h3 className="font-bold text-base">Alterar / Editar Imóvel da Vistoria</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-[#EEEEF3] bg-slate-50/50 p-1.5 gap-2">
          <button
            onClick={() => {
              setActiveTab("search");
              setEditingImovelId(null);
            }}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "search"
                ? "bg-white text-[#004777] shadow-sm border border-[#EEEEF3]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar e Editar Imóvel</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("create");
              setEditingImovelId(null);
            }}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "create"
                ? "bg-white text-[#004777] shadow-sm border border-[#EEEEF3]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Novo Imóvel</span>
          </button>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="m-4 mb-0 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "search" ? (
            editingImovelId ? (
              /* Inline Edit Imóvel Form */
              <form onSubmit={handleSaveImovelDetails} className="flex flex-col gap-4 bg-slate-50/50 p-4 rounded-xl border border-[#EEEEF3]">
                <div className="flex items-center justify-between border-b border-[#EEEEF3] pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingImovelId(null)}
                      className="text-gray-500 hover:text-[#004777] p-1 rounded transition-colors"
                      title="Voltar para a lista"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-sm font-bold text-[#004777]">Editar Endereço desta Vistoria</h4>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Não altera outras vistorias</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="font-bold text-gray-500 uppercase">Logradouro / Rua</label>
                    <input
                      type="text"
                      value={editLogradouro}
                      onChange={(e) => setEditLogradouro(e.target.value)}
                      placeholder="Ex: Rua XV de Novembro"
                      className="px-3 py-2 border border-[#EEEEF3] rounded-lg text-sm bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase">Número</label>
                    <input
                      type="number"
                      value={editNumero}
                      onChange={(e) => setEditNumero(e.target.value ? Number(e.target.value) : "")}
                      placeholder="Ex: 123"
                      className="px-3 py-2 border border-[#EEEEF3] rounded-lg text-sm bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase">Bairro *</label>
                    <input
                      type="text"
                      value={editBairro}
                      onChange={(e) => setEditBairro(e.target.value)}
                      placeholder="Ex: Centro"
                      className="px-3 py-2 border border-[#EEEEF3] rounded-lg text-sm bg-white"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase">Cidade *</label>
                    <input
                      type="text"
                      value={editCidade}
                      onChange={(e) => setEditCidade(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="px-3 py-2 border border-[#EEEEF3] rounded-lg text-sm bg-white"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase">UF *</label>
                    <input
                      type="text"
                      value={editUf}
                      maxLength={2}
                      onChange={(e) => setEditUf(e.target.value.toUpperCase())}
                      placeholder="Ex: SP"
                      className="px-3 py-2 border border-[#EEEEF3] rounded-lg text-sm bg-white uppercase"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase">Tipo</label>
                    <select
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value)}
                      className="px-3 py-2 border border-[#EEEEF3] rounded-lg text-sm bg-white"
                    >
                      <option value="CASA">Casa</option>
                      <option value="CONDOMINIO">Apartamento / Condomínio</option>
                      <option value="COMERCIAL">Comercial</option>
                      <option value="RURAL">Rural</option>
                      <option value="LOTE">Lote</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase">Proprietário</label>
                    <input
                      type="text"
                      value={editProprietario}
                      onChange={(e) => setEditProprietario(e.target.value)}
                      placeholder="Nome do proprietário"
                      className="px-3 py-2 border border-[#EEEEF3] rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#EEEEF3]">
                  <button
                    type="button"
                    onClick={() => setEditingImovelId(null)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-1.5 rounded-lg bg-[#004777] text-white text-xs font-semibold hover:bg-[#00365a] transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {savingEdit ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salavando no banco...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar e Atualizar Vistoria</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Search List view */
              <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por código, rua, número, bairro ou cidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-slate-50/50"
                    autoFocus
                  />
                </div>

                {/* Property List */}
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {loadingImoveis ? (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#004777]" />
                      <span className="text-xs font-medium">Carregando imóveis...</span>
                    </div>
                  ) : filteredImoveis.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">
                      Nenhum imóvel encontrado para a busca digitada.
                    </div>
                  ) : (
                    filteredImoveis.map((im) => {
                      const fullAddress = formatImovelAddress(im);
                      const isSelected = im.id === selectedImovelId;
                      const ownerName = im.imovelLocacaos?.[0]?.locadors?.[0]?.nome;

                      return (
                        <div
                          key={im.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "border-[#004777] bg-[#004777]/5"
                              : "border-[#EEEEF3] hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#004777] bg-[#004777]/10 px-2 py-0.5 rounded">
                                {im.codigo}
                              </span>
                              <span className="text-xs text-slate-500 font-medium capitalize">
                                {im.tipo?.toLowerCase()}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-[#280003] truncate flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{fullAddress || "Endereço não preenchido"}</span>
                            </p>
                            {ownerName && (
                              <span className="text-[11px] text-gray-400">
                                Proprietário: <strong className="text-gray-600">{ownerName}</strong>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditImovel(im);
                              }}
                              className="p-2 rounded-lg text-gray-500 hover:text-[#004777] hover:bg-slate-100 transition-colors"
                              title="Editar dados deste imóvel na base"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              disabled={updating}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectImovel(im.id);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                isSelected
                                  ? "bg-[#004777] text-white"
                                  : "bg-[#EEEEF3] text-gray-700 hover:bg-[#004777] hover:text-white"
                              }`}
                            >
                              {updating && isSelected ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Selecionado</span>
                                </>
                              ) : (
                                <span>Selecionar</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )
          ) : (
            /* Tab 2: Create Form */
            <form onSubmit={handleCreateAndLink} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Código do Imóvel (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: IMB-006 (Deixe vazio p/ automático)"
                    value={newCodigo}
                    onChange={(e) => setNewCodigo(e.target.value)}
                    className="px-3 py-2 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Tipo do Imóvel
                  </label>
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                    className="px-3 py-2 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                  >
                    <option value="CASA">Casa</option>
                    <option value="CONDOMINIO">Apartamento / Condomínio</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="RURAL">Rural</option>
                    <option value="LOTE">Lote</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Logradouro / Rua
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Flores, Avenida Brasil..."
                    value={newLogradouro}
                    onChange={(e) => setNewLogradouro(e.target.value)}
                    className="px-3 py-2 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Número
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 123"
                    value={newNumero}
                    onChange={(e) => setNewNumero(e.target.value ? Number(e.target.value) : "")}
                    className="px-3 py-2 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Centro, Jardim América"
                    value={newBairro}
                    onChange={(e) => setNewBairro(e.target.value)}
                    className="px-3 py-2 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo, Campinas"
                    value={newCidade}
                    onChange={(e) => setNewCidade(e.target.value)}
                    className="px-3 py-2 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    UF *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SP"
                    maxLength={2}
                    value={newUf}
                    onChange={(e) => setNewUf(e.target.value.toUpperCase())}
                    className="px-3 py-2 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20 uppercase"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Proprietário (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do proprietário responsável"
                    value={newProprietario}
                    onChange={(e) => setNewProprietario(e.target.value)}
                    className="px-3 py-2 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 border-t border-[#EEEEF3] pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-[#004777] text-white text-sm font-semibold hover:bg-[#00365a] transition-all shadow-sm flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar e Vincular Imóvel</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
