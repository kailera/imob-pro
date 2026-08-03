"use client";

import { useState, useEffect, startTransition } from "react";
import { X, Mail, Phone, Calendar, Sparkles, Loader2, Save, Send, Check } from "lucide-react";
import { LeadStatus, TipoImovel } from "@/generated/prisma";
import { updateLeadPreferencesAction, getMatchingImoveisForLeadAction, sendManualMatchEmailAction } from "@/app/actions/leadActions";

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  loteInfo: string | null;
  valorSimulado: number | null;
  status: LeadStatus;
  origem: string;
  createdAt: Date;
  updatedAt: Date;
  interesseTipo?: TipoImovel | null;
  interesseNegocio?: string | null;
  interessePrecoMin?: number | null;
  interessePrecoMax?: number | null;
  interesseQuartos?: number | null;
  interesseBanheiros?: number | null;
  interesseVagas?: number | null;
  interesseBairros?: string | null;
  envioAutomatico?: boolean;
}

interface LeadDetailsModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
}

export function LeadDetailsModal({ lead, onClose, onUpdateLead }: LeadDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "preferences" | "matches">("info");
  
  // Estados de edição das preferências
  const [tipo, setTipo] = useState<TipoImovel | "">(lead.interesseTipo || "");
  const [negocio, setNegocio] = useState<string>(lead.interesseNegocio || "AMBOS");
  const [precoMin, setPrecoMin] = useState<string>(lead.interessePrecoMin?.toString() || "");
  const [precoMax, setPrecoMax] = useState<string>(lead.interessePrecoMax?.toString() || "");
  const [quartos, setQuartos] = useState<string>(lead.interesseQuartos?.toString() || "");
  const [banheiros, setBanheiros] = useState<string>(lead.interesseBanheiros?.toString() || "");
  const [vagas, setVagas] = useState<string>(lead.interesseVagas?.toString() || "");
  const [bairros, setBairros] = useState<string>(lead.interesseBairros || "");
  const [envioAuto, setEnvioAuto] = useState<boolean>(lead.envioAutomatico || false);

  // Estados dos Imóveis Correspondentes (Match)
  const [matchingImoveis, setMatchingImoveis] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [selectedImoveis, setSelectedImoveis] = useState<string[]>([]);
  
  // Estados de submissão
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailSentSuccess, setMailSentSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Buscar os imóveis sugeridos ao entrar na aba ou quando as preferências mudam
  useEffect(() => {
    if (activeTab === "matches") {
      fetchMatches();
    }
  }, [activeTab]);

  const fetchMatches = async () => {
    setIsLoadingMatches(true);
    try {
      const res = await getMatchingImoveisForLeadAction(lead.id);
      setMatchingImoveis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        interesseTipo: tipo === "" ? null : tipo,
        interesseNegocio: negocio,
        interessePrecoMin: precoMin === "" ? null : Number(precoMin),
        interessePrecoMax: precoMax === "" ? null : Number(precoMax),
        interesseQuartos: quartos === "" ? null : Number(quartos),
        interesseBanheiros: banheiros === "" ? null : Number(banheiros),
        interesseVagas: vagas === "" ? null : Number(vagas),
        interesseBairros: bairros.trim() === "" ? null : bairros,
        envioAutomatico: envioAuto,
      };

      const res = await updateLeadPreferencesAction(lead.id, payload);
      if (res.success && res.lead) {
        setSaveSuccess(true);
        // Atualiza a listagem de leads no estado do Kanban
        onUpdateLead(res.lead as unknown as Lead);
        
        // Se estiver salvando na aba de preferências e tiver sucesso, atualiza o match
        if (activeTab === "matches") {
          fetchMatches();
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Erro ao salvar preferências.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMail = async () => {
    if (selectedImoveis.length === 0) return;
    setIsSendingMail(true);
    setMailSentSuccess(false);

    try {
      const res = await sendManualMatchEmailAction(lead.id, selectedImoveis);
      if (res.success) {
        setMailSentSuccess(true);
        setSelectedImoveis([]);
        setTimeout(() => setMailSentSuccess(false), 5000);
      } else {
        alert(res.error || "Erro ao enviar e-mail.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar e-mail.");
    } finally {
      setIsSendingMail(false);
    }
  };

  const toggleSelectImovel = (id: string) => {
    setSelectedImoveis((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllMatches = () => {
    if (selectedImoveis.length === matchingImoveis.length) {
      setSelectedImoveis([]);
    } else {
      setSelectedImoveis(matchingImoveis.map((im) => im.id));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200" style={{ zIndex: 9999 }}>
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-zinc-150 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-zinc-950 text-white p-6 md:px-8 flex justify-between items-center relative">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-brand-accent-gold text-brand-text font-extrabold uppercase px-2 py-0.5 rounded-md">
                {lead.origem}
              </span>
              <span className="text-xs text-zinc-400 font-semibold">
                Criado em: {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">{lead.nome}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-zinc-100 bg-zinc-50 px-4 md:px-8">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-4 px-4 text-xs md:text-sm font-extrabold border-b-2 transition-all ${
              activeTab === "info"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Informações Gerais
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`py-4 px-4 text-xs md:text-sm font-extrabold border-b-2 transition-all ${
              activeTab === "preferences"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Preferências de Interesse
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`py-4 px-4 text-xs md:text-sm font-extrabold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "matches"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-brand-accent-gold" />
            Imóveis Recomendados
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* TAB 1: INFO */}
          {activeTab === "info" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200/60 space-y-4">
                  <h3 className="font-extrabold text-sm text-zinc-900 uppercase tracking-wider">Contato</h3>
                  <div className="space-y-3 text-sm text-zinc-700">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-zinc-400" />
                      <a href={`tel:${lead.telefone}`} className="hover:text-brand-primary hover:underline font-semibold">{lead.telefone}</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="hover:text-brand-primary hover:underline font-semibold">{lead.email}</a>
                      ) : (
                        <span className="text-zinc-400 italic">E-mail não cadastrado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200/60 space-y-4">
                  <h3 className="font-extrabold text-sm text-zinc-900 uppercase tracking-wider">Origem do Lead</h3>
                  <div className="space-y-3 text-sm text-zinc-700">
                    {/* Badge da origem */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-brand-accent-gold text-brand-text font-extrabold uppercase px-2 py-0.5 rounded-md">
                        {lead.origem.replace("_", " ")}
                      </span>
                      {lead.interesseNegocio && lead.interesseNegocio !== "AMBOS" && (
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          lead.interesseNegocio === "VENDA" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {lead.interesseNegocio === "VENDA" ? "Compra" : "Locação"}
                        </span>
                      )}
                    </div>

                    {lead.loteInfo && (() => {
                      const isContraproposta = lead.loteInfo.startsWith("Contraproposta:");
                      const imovelPart = isContraproposta
                        ? lead.loteInfo.split(" | Procura:")[0].replace("Contraproposta: ", "")
                        : lead.loteInfo;
                      const procuraPart = isContraproposta && lead.loteInfo.includes(" | Procura:")
                        ? lead.loteInfo.split(" | Procura:")[1]
                        : null;
                      return (
                        <>
                          <div>
                            <span className="text-xs text-zinc-400 block mb-0.5">
                              {isContraproposta ? "Imóvel de Interesse" : "Referência / Lote de Interesse"}
                            </span>
                            <span className="font-semibold">{imovelPart}</span>
                          </div>
                          {procuraPart && (
                            <div>
                              <span className="text-xs text-zinc-400 block mb-0.5">Descrição do que procura</span>
                              <span className="text-zinc-600 leading-relaxed block">{procuraPart}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {lead.valorSimulado && (
                      <div>
                        <span className="text-xs text-zinc-400 block mb-0.5">
                          {lead.origem === "CONTRAPROPOSTA" ? "Valor da Proposta" : "Valor Simulado / Parcela"}
                        </span>
                        <span className="font-bold text-brand-primary text-lg">
                          R$ {lead.valorSimulado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          {lead.origem !== "CONTRAPROPOSTA" && <span className="text-sm font-semibold text-zinc-500">/mês</span>}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-brand-bg-primary/20 p-5 rounded-2xl border border-brand-bg-primary/50 text-sm text-brand-text space-y-2">
                <h4 className="font-bold flex items-center gap-1.5 text-brand-primary">
                  <Sparkles className="w-4 h-4 text-brand-accent-gold" />
                  Como funciona o Match?
                </h4>
                <p className="text-xs leading-relaxed text-zinc-600">
                  Preencha as preferências do cliente na aba <strong>"Preferências de Interesse"</strong>. 
                  O sistema irá buscar imóveis correspondentes para venda ou locação. 
                  Se você ativar o **Envio Automático**, novas correspondências serão enviadas por e-mail para o cliente no momento em que as preferências mudarem ou um novo imóvel der match.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PREFERENCES */}
          {activeTab === "preferences" && (
            <form onSubmit={handleSavePreferences} className="space-y-6">
              {saveSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                  <Check className="w-4 h-4 shrink-0" /> Prefêrencias salvas com sucesso!
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de Imóvel */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tipo de Imóvel</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoImovel | "")}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
                  >
                    <option value="">Qualquer tipo</option>
                    <option value="CASA">Casa</option>
                    <option value="CONDOMINIO">Apartamento / Condomínio</option>
                    <option value="LOTE">Lote</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="RURAL">Rural</option>
                  </select>
                </div>

                {/* Tipo de Negócio */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Interesse de Negócio</label>
                  <select
                    value={negocio}
                    onChange={(e) => setNegocio(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
                  >
                    <option value="AMBOS">Compra ou Aluguel</option>
                    <option value="VENDA">Apenas Compra (Venda)</option>
                    <option value="LOCACAO">Apenas Aluguel (Locação)</option>
                  </select>
                </div>

                {/* Faixa de Preço */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Preço Mínimo R$</label>
                    <input
                      type="number"
                      placeholder="Sem mínimo"
                      value={precoMin}
                      onChange={(e) => setPrecoMin(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Preço Máximo R$</label>
                    <input
                      type="number"
                      placeholder="Sem limite"
                      value={precoMax}
                      onChange={(e) => setPrecoMax(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>

                {/* Bairros de Interesse */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bairros de Interesse (Separados por vírgula)</label>
                  <input
                    type="text"
                    placeholder="Ex: Centro, Jardim Paulista, Aeroporto"
                    value={bairros}
                    onChange={(e) => setBairros(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                  />
                </div>

                {/* Ambientes (Cômodos Mínimos) */}
                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Quartos Mín.</label>
                    <input
                      type="number"
                      placeholder="Qualquer"
                      value={quartos}
                      onChange={(e) => setQuartos(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Banheiros Mín.</label>
                    <input
                      type="number"
                      placeholder="Qualquer"
                      value={banheiros}
                      onChange={(e) => setBanheiros(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Vagas Garagem Mín.</label>
                    <input
                      type="number"
                      placeholder="Qualquer"
                      value={vagas}
                      onChange={(e) => setVagas(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle de Envio Automático */}
              <div className="border-t border-zinc-100 pt-6 flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <span className="font-extrabold text-sm text-zinc-900 block">Enviar e-mail automaticamente</span>
                  <span className="text-xs text-zinc-400 block">
                    Sempre que novos imóveis compatíveis com as preferências acima forem cadastrados, o sistema enviará um e-mail de alerta para o cliente.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envioAuto}
                    onChange={(e) => setEnvioAuto(e.target.checked)}
                    className="sr-only peer"
                    disabled={!lead.email}
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
              </div>
              {!lead.email && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl">
                  ⚠️ Cadastre um e-mail para este lead na aba "Informações Gerais" para poder ativar o envio automático.
                </div>
              )}

              {/* Botão de Salvar */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md flex items-center gap-2 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvar...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Preferências
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MATCHES */}
          {activeTab === "matches" && (
            <div className="space-y-6">
              
              {mailSentSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                  <Check className="w-4 h-4 shrink-0" /> E-mail enviado com sucesso para {lead.email}!
                </div>
              )}

              {!lead.email && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl">
                  ⚠️ Não é possível realizar envios por e-mail, pois este lead não possui um e-mail cadastrado.
                </div>
              )}

              {/* Ações de Lote */}
              {matchingImoveis.length > 0 && lead.email && (
                <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-200/50">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={selectAllMatches} 
                      className="text-xs font-extrabold text-zinc-600 hover:text-zinc-950 underline"
                    >
                      {selectedImoveis.length === matchingImoveis.length ? "Desmarcar Todos" : "Selecionar Todos"}
                    </button>
                    <span className="text-xs text-zinc-400">
                      {selectedImoveis.length} de {matchingImoveis.length} selecionado(s)
                    </span>
                  </div>
                  
                  <button
                    onClick={handleSendMail}
                    disabled={selectedImoveis.length === 0 || isSendingMail}
                    className="bg-[#004777] hover:bg-[#004777]/95 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    {isSendingMail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Enviar Selecionados
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Listagem */}
              {isLoadingMatches ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
                  <span className="text-xs font-semibold">Buscando imóveis sugeridos no banco de dados...</span>
                </div>
              ) : matchingImoveis.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-zinc-300 rounded-3xl text-zinc-400 space-y-3">
                  <Sparkles className="w-10 h-10 mx-auto text-zinc-300" />
                  <p className="text-sm font-semibold">Nenhum imóvel compatível encontrado.</p>
                  <p className="text-xs max-w-md mx-auto px-4 leading-relaxed">
                    Tente ajustar as preferências de interesse do lead (como aumentar a faixa de preço, reduzir quartos ou liberar tipos de imóvel) para encontrar sugestões.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {matchingImoveis.map((im) => {
                    const price = im.forLocacao ? im.valorAluguel : im.valorVenda;
                    const formattedPrice = im.forLocacao
                      ? `R$ ${(price / 100).toLocaleString("pt-BR")}/mês`
                      : `R$ ${(price / 100).toLocaleString("pt-BR")}`;
                    
                    const isSelected = selectedImoveis.includes(im.id);

                    return (
                      <div
                        key={im.id}
                        onClick={() => lead.email && toggleSelectImovel(im.id)}
                        className={`bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow ${
                          isSelected 
                            ? "border-brand-primary ring-1 ring-brand-primary" 
                            : "border-zinc-200"
                        } ${!lead.email && "opacity-80 cursor-default"}`}
                      >
                        {/* Imagem */}
                        <div className="relative aspect-[16/10] bg-zinc-100">
                          <img
                            src={im.imagens?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"}
                            alt={im.titulo}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Checkbox (apenas se tiver e-mail do lead) */}
                          {lead.email && (
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-[2px] p-1.5 rounded-lg border border-zinc-200 shadow-sm flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Tratado no clique do container
                                className="w-4 h-4 accent-brand-primary cursor-pointer"
                              />
                            </div>
                          )}

                          <span className={`absolute bottom-3 left-3 text-[10px] font-extrabold uppercase px-2 py-1 rounded-md text-white shadow-sm ${
                            im.forLocacao ? "bg-brand-accent-green" : "bg-brand-accent-gold"
                          }`}>
                            {im.forLocacao ? "Locação" : "Venda"}
                          </span>
                        </div>

                        {/* Dados */}
                        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-extrabold text-zinc-400 block uppercase tracking-wider">CÓD: {im.codigo}</span>
                            <h4 className="font-extrabold text-sm text-zinc-900 leading-snug line-clamp-1">{im.titulo}</h4>
                            <span className="text-xs text-zinc-500 block">📍 {im.bairro}, {im.cidade}</span>
                          </div>

                          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                            <span className="font-extrabold text-sm text-brand-primary">{formattedPrice}</span>
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              {im.quartos}Q | {im.banheiros}B | {im.area}m²
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
