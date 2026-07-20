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
  ExternalLink,
  Film
} from "lucide-react";
import { getVistoriaByToken, submitContestacao } from "@/app/(admin)/vistorias/actions";
import { getPresignedUploadUrl, triggerVideoCompression } from "@/app/actions/uploadMedia";

interface MidiaItem {
  url: string;
  nome: string;
  type?: "image" | "video";
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
  const [midias, setMidias] = useState<MidiaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // 1. Verificar autorização no sessionStorage
    const isAuth = sessionStorage.getItem(`vistoria_auth_${token}`) === "true";
    if (!isAuth) {
      router.push(`/vistorias/acesso/${token}`);
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
          router.push(`/vistorias/acesso/${token}`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    setUploadProgress("Iniciando...");
    try {
      let idx = 0;
      for (const file of files) {
        setUploadProgress(`Preparando arquivo ${idx + 1}...`);
        const { uploadUrl, fileKey, publicUrl } = await getPresignedUploadUrl(file.name, file.type);
        
        const isVideo = file.type.startsWith("video/");
        
        setUploadProgress(`Enviando ${idx + 1}/${files.length}: 0%`);
        
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(`Enviando ${idx + 1}/${files.length}: ${percent}%`);
            }
          };
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Erro status: ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Erro de rede ao enviar arquivo."));
          xhr.send(file);
        });

        setMidias(prev => [...prev, {
          url: publicUrl,
          nome: file.name,
          type: isVideo ? "video" : "image"
        }]);

        if (isVideo) {
          setUploadProgress(`Enfileirando vídeo ${idx + 1}...`);
          await triggerVideoCompression(fileKey);
        }

        idx++;
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Ocorreu um erro no upload dos arquivos da contestação.");
    } finally {
      setUploadProgress("");
      e.target.value = "";
    }
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

              {/* Arquivos de Mídia */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Anexar Fotos ou Vídeos (opcional)</span>
                  {uploadProgress && (
                    <span className="text-[#004777] text-[10px] font-semibold animate-pulse flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> {uploadProgress}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="tenant-file-upload"
                    accept="image/*,video/*"
                    multiple
                    disabled={submitting || !!uploadProgress}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="tenant-file-upload"
                    className="flex-1 px-3 py-3 border border-dashed border-[#EEEEF3] hover:border-[#004777] bg-gray-50/50 hover:bg-white rounded-xl text-center text-xs font-semibold text-gray-500 hover:text-[#004777] cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Escolher Fotos/Vídeos
                  </label>
                </div>
              </div>

              {/* Preview das Mídias Selecionadas para Upload */}
              {midias.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1 p-2 bg-white border border-[#EEEEF3] rounded-xl">
                  {midias.map((m, idx) => (
                    <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#EEEEF3] bg-gray-50 flex items-center justify-center group">
                      {m.type === "image" ? (
                        <img src={m.url} alt={m.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white relative">
                          <Film className="w-4 h-4 text-gray-400" />
                          <span className="text-[7px] mt-0.5 font-bold uppercase text-gray-400">Vídeo</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMidia(idx)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all"
                        title="Remover"
                      >
                        <Plus className="w-2.5 h-2.5 rotate-45" />
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
                      <div className="flex flex-wrap gap-2 pb-1">
                        {c.midias.map((m: any, idx: number) => {
                          const isVideo = m.type === "video" || m.url?.toLowerCase().includes(".mp4") || m.url?.toLowerCase().includes(".webm");
                          const isProcessing = m.url?.includes("/temp/");
                          return (
                            <div key={idx} className="relative flex items-center">
                              <a
                                href={m.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-[9px] text-[#004777] font-semibold border border-slate-200 transition-colors"
                              >
                                {isVideo ? (
                                  <Film className="w-3.5 h-3.5 text-gray-400" />
                                ) : (
                                  <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                                )}
                                <span>{isVideo ? "Vídeo" : "Foto"} {idx + 1}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              {isProcessing && (
                                <span className="absolute -top-1.5 -right-1 bg-yellow-500 text-white text-[6px] font-bold uppercase tracking-wider px-1 rounded shadow animate-pulse">
                                  Otimizando
                                </span>
                              )}
                            </div>
                          );
                        })}
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
