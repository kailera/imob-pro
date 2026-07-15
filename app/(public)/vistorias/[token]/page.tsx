"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  MessageSquare,
  Lock,
  Plus,
  Loader2,
  Calendar,
  User,
  MapPin,
  Check,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { getVistoriaByToken, submitContestacao } from "@/app/(admin)/vistorias/actions";

interface MidiaItem {
  url: string;
  nome: string;
}

export default function TenantDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [vistoria, setVistoria] = useState<any>(null);
  
  // Form de Contestação
  const [selectedAmbienteId, setSelectedAmbienteId] = useState("geral");
  const [descricao, setDescricao] = useState("");
  const [midiaUrl, setMidiaUrl] = useState("");
  const [midias, setMidias] = useState<MidiaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // 1. Verificar autorização no sessionStorage
    const isAuth = sessionStorage.getItem(`vistoria_auth_${token}`) === "true";
    if (!isAuth) {
      router.push(`/public/vistorias/acesso/${token}`);
      return;
    }
    setAuthorized(true);

    // 2. Carregar dados da vistoria
    async function loadData() {
      try {
        const res = await getVistoriaByToken(token);
        if (res.success && res.data) {
          setVistoria(res.data);
        } else {
          router.push(`/public/vistorias/acesso/${token}`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const handleAddMidia = () => {
    if (!midiaUrl) return;
    setMidias(prev => [...prev, { url: midiaUrl, nome: `Foto_${prev.length + 1}` }]);
    setMidiaUrl("");
  };

  const handleRemoveMidia = (index: number) => {
    setMidias(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao) {
      setFormError("Descreva o motivo da contestação.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setSuccessMsg("");

    let ambienteNome = "Geral";
    if (selectedAmbienteId !== "geral") {
      const amb = vistoria.ambienteVistorias.find((a: any) => a.id === selectedAmbienteId);
      if (amb) ambienteNome = amb.nome;
    }

    try {
      const res = await submitContestacao({
        tokenAcesso: token,
        ambienteId: selectedAmbienteId === "geral" ? undefined : selectedAmbienteId,
        ambienteNome,
        descricao,
        midias
      });

      if (res.success) {
        setSuccessMsg("Contestação enviada com sucesso! O administrador foi notificado.");
        setDescricao("");
        setMidias([]);
        
        // Recarregar dados para atualizar a lista
        const updated = await getVistoriaByToken(token);
        if (updated.success) {
          setVistoria(updated.data);
        }
      } else {
        setFormError(res.error || "Ocorreu um erro ao enviar.");
      }
    } catch (err: any) {
      setFormError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !authorized) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#004777]" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    NAO_INICIADA: "bg-slate-100 text-slate-700",
    EM_ANDAMENTO: "bg-[#F0D18A]/20 text-[#8c6d1f]",
    AGUARDANDO_APROVACAO: "bg-[#004777]/10 text-[#004777]",
    CONCLUIDA: "bg-[#708D81]/15 text-[#708D81]",
    CONTESTADA: "bg-red-50 text-red-700",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8 bg-brand-bg-primary">
      {/* Top Banner */}
      <header className="bg-white border border-[#EEEEF3] p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#280003] tracking-tight">
              Laudo de Vistoria
            </h1>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusColors[vistoria.status] || "bg-gray-100"}`}>
              {vistoria.status === "CONTESTADA" ? "Contestada" : vistoria.status === "CONCLUIDA" ? "Concluída" : "Em Análise"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" />
            {vistoria.imovel.bairro}, {vistoria.imovel.cidade}/{vistoria.imovel.uf} - Cód: {vistoria.imovel.codigo}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-500">
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl border border-[#EEEEF3]">
            <Calendar className="w-4 h-4 text-[#004777]" />
            <span>Data: {new Date(vistoria.data).toLocaleDateString("pt-BR")}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl border border-[#EEEEF3]">
            <User className="w-4 h-4 text-[#004777]" />
            <span>Proprietário: {vistoria.proprietario || "Não informado"}</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Columns: Rooms & Info */}
        <main className="lg:col-span-2 flex flex-col gap-8">
          
          {/* General Terms/Observations */}
          <section className="bg-white border border-[#EEEEF3] p-6 rounded-2xl shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#280003] flex items-center gap-2 border-b pb-2 border-gray-100">
              <FileText className="w-5 h-5 text-[#004777]" />
              Parecer Geral de Vistoria
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {vistoria.observacoes || "Nenhum parecer técnico inserido."}
            </div>
          </section>

          {/* Environments/Rooms */}
          <section className="bg-white border border-[#EEEEF3] p-6 rounded-2xl shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#280003] flex items-center gap-2 border-b pb-2 border-gray-100">
              <CheckCircle2 className="w-5 h-5 text-[#004777]" />
              Cômodos & Ambientes Vistoriados
            </h2>
            <div className="flex flex-col gap-3">
              {vistoria.ambienteVistorias.map((amb: any) => (
                <div key={amb.id} className="border border-[#EEEEF3] p-4 rounded-xl hover:bg-slate-50/50 transition-all flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#280003]">{amb.nome}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{amb.tipo}</span>
                  </div>
                  {amb.visaoGeral && (
                    <p className="text-xs text-gray-500 whitespace-pre-line">{amb.visaoGeral}</p>
                  )}
                  {amb.comentarios && (
                    <p className="text-xs text-[#004777] font-medium italic mt-1">Obs: {amb.comentarios}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

        </main>

        {/* Right Column: Contestations & Form */}
        <aside className="flex flex-col gap-8">
          
          {/* Contestation Form */}
          <section className="bg-white border border-[#EEEEF3] p-6 rounded-2xl shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#280003] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Contestar Vistoria
            </h2>
            
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Ambiente */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cômodo/Ambiente</label>
                <select
                  value={selectedAmbienteId}
                  onChange={(e) => setSelectedAmbienteId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                >
                  <option value="geral">Geral (Imóvel inteiro)</option>
                  {vistoria.ambienteVistorias.map((amb: any) => (
                    <option key={amb.id} value={amb.id}>{amb.nome}</option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">O que está divergente? *</label>
                <textarea
                  placeholder="Descreva detalhadamente o problema (ex: ar condicionado não liga, pintura descascando)..."
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  required
                />
              </div>

              {/* URL da Mídia */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">URL da Foto (opcional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={midiaUrl}
                    onChange={(e) => setMidiaUrl(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddMidia}
                    className="px-3 bg-gray-100 hover:bg-gray-200 border border-[#EEEEF3] text-xs font-bold text-gray-600 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
              </div>

              {/* Midias List */}
              {midias.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {midias.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-gray-50 border border-[#EEEEF3] px-2 py-1 rounded-lg text-[10px]">
                      <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate max-w-[80px]">{m.nome}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMidia(idx)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#004777] text-white font-bold text-xs rounded-lg hover:bg-[#00365a] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Contestação</span>
                )}
              </button>
            </form>
          </section>

          {/* Contestations List & Resolutions */}
          <section className="bg-white border border-[#EEEEF3] p-6 rounded-2xl shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#280003] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#004777]" />
              Minhas Contestações
            </h2>

            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1">
              {(!vistoria.contestacaoVistorias || vistoria.contestacaoVistorias.length === 0) ? (
                <div className="text-center py-6 text-gray-400 text-xs font-medium">
                  Nenhuma contestação enviada.
                </div>
              ) : (
                vistoria.contestacaoVistorias.map((c: any) => (
                  <div key={c.id} className="border border-[#EEEEF3] p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {c.ambienteNome || "Geral"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.resolvido ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                        {c.resolvido ? "Resolvido" : "Pendente"}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                      {c.descricao}
                    </p>

                    {/* Mídias da contestação */}
                    {c.midias && Array.isArray(c.midias) && c.midias.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {c.midias.map((m: any, idx: number) => (
                          <a
                            key={idx}
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-[9px] text-[#004777] font-semibold border border-slate-200"
                          >
                            <ImageIcon className="w-3 h-3" /> Foto {idx + 1} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* RESOLUÇÃO DA CONTESTAÇÃO */}
                    {c.resolvido && (
                      <div className="bg-[#708D81]/10 border border-[#708D81]/25 p-3 rounded-lg flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-[#5b756b] font-bold text-xs">
                          <Check className="w-4 h-4" />
                          <span>Resolução do Administrador</span>
                        </div>
                        {c.respostaAdmin && (
                          <p className="text-xs text-gray-600 leading-relaxed italic">
                            "{c.respostaAdmin}"
                          </p>
                        )}
                        {(c.profissionalNome || c.profissionalContato) && (
                          <div className="text-[11px] text-gray-500 font-medium">
                            🔧 Profissional: <strong className="text-gray-700">{c.profissionalNome || "Não informado"}</strong> {c.profissionalContato && `(${c.profissionalContato})`}
                          </div>
                        )}
                        {c.comprovanteUrl && (
                          <a
                            href={c.comprovanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#004777] font-bold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            📄 Visualizar Comprovante <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

        </aside>

      </div>
    </div>
  );
}
