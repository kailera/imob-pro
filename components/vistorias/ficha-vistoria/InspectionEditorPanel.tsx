"use client";

import React, { useState, useEffect } from "react";
import { MessageSquarePlus, FileText, AlertTriangle, Key, Loader2, Upload } from "lucide-react";
import { Room } from "./FloorPlanVisualizer";
import { useAuth } from "@clerk/nextjs";
import { CommentForm } from "./CommentForm";
import { CommentsTimeline, CommentData } from "./CommentsTimeline";
import { uploadMediaToRustFS } from "@/app/actions/uploadMedia";
import { DocumentsPhotosSection } from "./DocumentsPhotosSection";
import type { InspectionAttachment } from "./DocumentsPhotosSection";

interface InspectionEditorPanelProps {
  rooms: Room[];
  comments: CommentData[];
  onAddComment: (
    roomId: string,
    roomName: string,
    text: string,
    status: 'Aprovado' | 'Atenção',
    media?: { url: string; type: 'image' | 'video' }[]
  ) => void;
  onUpdateComment?: (
    commentId: string,
    text: string,
    status: 'Aprovado' | 'Atenção',
    media?: { url: string; type: 'image' | 'video' }[]
  ) => void;
  onDeleteComment?: (commentId: string) => void;
  reportDescription: string;
  reportObservation: string;
  onUpdateReport: (description: string, observation: string) => void;
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
  chavesQuantidade: number;
  chavesObservacao: string;
  onUpdateKeys: (quantidade: number, observacao: string) => void;
  attachments: InspectionAttachment[];
  onUpdateAttachments: (attachments: InspectionAttachment[]) => void;
  onResolveContestacao?: (id: string, input: any) => Promise<void>;
  userRole?: string;
  disabled?: boolean;
  activeTab?: 'comments' | 'report' | 'contestations';
  onTabChange?: (tab: 'comments' | 'report' | 'contestations') => void;
  contestations?: any[];
}

export function InspectionEditorPanel({
  rooms,
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  reportDescription,
  reportObservation,
  onUpdateReport,
  onUpdateRoom,
  chavesQuantidade,
  chavesObservacao,
  onUpdateKeys,
  attachments,
  onUpdateAttachments,
  activeTab: controlledActiveTab,
  onTabChange,
  contestations = [],
  onResolveContestacao,
  userRole,
  disabled = false
}: InspectionEditorPanelProps) {
  const { orgRole } = useAuth();
  const isBrokerOrAdmin = userRole === "ADMIN" || userRole === "CORRETOR" || orgRole === "org:admin";
  const [internalTab, setInternalTab] = useState<'comments' | 'report' | 'contestations'>('comments');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const setActiveTab = onTabChange !== undefined ? onTabChange : setInternalTab;

  const [tempDesc, setTempDesc] = useState(reportDescription);
  const [tempObs, setTempObs] = useState(reportObservation);
  const [tempChavesQtd, setTempChavesQtd] = useState(chavesQuantidade);
  const [tempChavesObs, setTempChavesObs] = useState(chavesObservacao);

  // States para Formulários de Resolução de Contestação
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [profissionais, setProfissionais] = useState<Record<string, string>>({});
  const [contatos, setContatos] = useState<Record<string, string>>({});
  const [comprovantes, setComprovantes] = useState<Record<string, string>>({});
  const [loadingResolution, setLoadingResolution] = useState<Record<string, boolean>>({});
  const [uploadingReceipt, setUploadingReceipt] = useState<Record<string, boolean>>({});

  const handleReceiptUpload = async (contestacaoId: string, file: File) => {
    if (!file) return;
    setUploadingReceipt(prev => ({ ...prev, [contestacaoId]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadMediaToRustFS(formData);
      if (res && res.url) {
        setComprovantes(prev => ({ ...prev, [contestacaoId]: res.url }));
      } else {
        alert("Erro no upload do comprovante.");
      }
    } catch (err) {
      console.error(err);
      alert("Falha no upload do arquivo.");
    } finally {
      setUploadingReceipt(prev => ({ ...prev, [contestacaoId]: false }));
    }
  };

  // Sincronizar com mudanças externas
  useEffect(() => {
    setTempDesc(reportDescription);
  }, [reportDescription]);

  useEffect(() => {
    setTempObs(reportObservation);
  }, [reportObservation]);

  useEffect(() => {
    setTempChavesQtd(chavesQuantidade);
  }, [chavesQuantidade]);

  useEffect(() => {
    setTempChavesObs(chavesObservacao);
  }, [chavesObservacao]);

  const handleResolveSubmit = async (contestacaoId: string) => {
    if (!onResolveContestacao) return;
    setLoadingResolution(prev => ({ ...prev, [contestacaoId]: true }));
    try {
      await onResolveContestacao(contestacaoId, {
        respostaAdmin: respostas[contestacaoId] || "",
        profissionalNome: profissionais[contestacaoId] || "",
        profissionalContato: contatos[contestacaoId] || "",
        comprovanteUrl: comprovantes[contestacaoId] || ""
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao resolver contestação.");
    } finally {
      setLoadingResolution(prev => ({ ...prev, [contestacaoId]: false }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EEEEF3] shadow-sm flex flex-col overflow-hidden h-[calc(100vh-8rem)]">

      {/* Header do Painel */}
      <div className="bg-[#004777] px-5 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <MessageSquarePlus className="w-5 h-5 text-white/90" />
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">Área do Vistoriador</h2>
            <p className="text-[#EEEEF3]/80 text-xs mt-0.5 font-medium">Controle de observações e relatório</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EEEEF3] bg-gray-50/50 print:hidden">
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 text-center ${activeTab === 'comments'
            ? 'border-[#004777] text-[#004777] bg-white'
            : 'border-transparent text-gray-500 hover:text-[#280003] hover:bg-gray-100/50'
            }`}
        >
          Ambientes & Fotos
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 text-center ${activeTab === 'report'
            ? 'border-[#004777] text-[#004777] bg-white'
            : 'border-transparent text-gray-500 hover:text-[#280003] hover:bg-gray-100/50'
            }`}
        >
          Relatório Geral
        </button>
        <button
          onClick={() => setActiveTab('contestations')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 text-center ${activeTab === 'contestations'
            ? 'border-[#004777] text-[#004777] bg-white'
            : 'border-transparent text-gray-500 hover:text-[#280003] hover:bg-gray-100/50'
            }`}
        >
          Contestações ({contestations.filter((c: any) => !c.resolvido).length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'comments' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Formulário Modularizado (Clean Code) */}
          {!disabled && <CommentForm rooms={rooms} onAddComment={onAddComment} onUpdateRoom={onUpdateRoom} />}

          {/* Linha do Tempo Modularizada (Clean Code) */}
          <CommentsTimeline 
            comments={comments} 
            onUpdateComment={onUpdateComment} 
            onDeleteComment={onDeleteComment}
            disabled={disabled}
          />
        </div>
      )}

      {activeTab === 'report' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-5 bg-white">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#004777]" />
              Descrição Geral do Relatório
            </label>
            <textarea
              value={tempDesc}
              disabled={disabled}
              onChange={(e) => {
                setTempDesc(e.target.value);
                onUpdateReport(e.target.value, tempObs);
              }}
              placeholder="Descreva o estado geral do imóvel..."
              className="w-full min-h-[140px] p-3 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] resize-none focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm disabled:bg-gray-55 disabled:text-gray-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#8c6d1f]" />
              Observações Técnicas / Pontos de Atenção
            </label>
            <textarea
              value={tempObs}
              disabled={disabled}
              onChange={(e) => {
                setTempObs(e.target.value);
                onUpdateReport(tempDesc, e.target.value);
              }}
              placeholder="Informe observações técnicas específicas, se houver..."
              className="w-full min-h-[90px] p-3 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] resize-none focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm disabled:bg-gray-55 disabled:text-gray-500"
            />
          </div>

          {/* Controle de Chaves */}
          <div className="border-t border-[#EEEEF3] pt-4 flex flex-col gap-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#004777]" />
              Localização das Chaves
            </label>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5 col-span-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Qtd de Chaves
                </label>
                <input
                  type="number"
                  min="0"
                  value={tempChavesQtd}
                  disabled={disabled}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTempChavesQtd(val);
                    onUpdateKeys(val, tempChavesObs);
                  }}
                  className="w-full p-2 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm disabled:bg-gray-55"
                />
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Obs / Localização
                </label>
                <input
                  type="text"
                  placeholder="Ex: Retiradas na Matriz..."
                  value={tempChavesObs}
                  disabled={disabled}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempChavesObs(val);
                    onUpdateKeys(tempChavesQtd, val);
                  }}
                  className="w-full p-2 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm disabled:bg-gray-55"
                />
              </div>
            </div>
          </div>

          <DocumentsPhotosSection attachments={attachments} onChange={onUpdateAttachments} disabled={disabled} />
        </div>
      )}

      {activeTab === 'contestations' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-5 bg-white">
          <div className="flex flex-col gap-4">
            {contestations.length === 0 ? (
              <div className="text-center text-gray-400 py-12 text-xs font-semibold">
                Nenhuma contestação enviada pelo inquilino.
              </div>
            ) : (
              contestations.map((c: any) => (
                <div key={c.id} className="border border-[#EEEEF3] rounded-xl p-4 flex flex-col gap-3.5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold uppercase">
                      {c.ambienteNome || "Geral"}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.resolvido ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                      {c.resolvido ? "Resolvida" : "Pendente"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 font-medium">
                    {c.descricao}
                  </p>

                  {/* Midias da contestacao */}
                  {c.midias && Array.isArray(c.midias) && c.midias.length > 0 && (
                    <div className="flex gap-2">
                      {c.midias.map((m: any, idx: number) => (
                        <a
                          key={idx}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#004777] bg-slate-100 border px-2 py-1 rounded hover:bg-slate-200 font-semibold"
                        >
                          Ver Anexo {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Form de Resolução se pendente */}
                  {!c.resolvido ? (
                    !isBrokerOrAdmin ? (
                      <div className="border-t border-red-100 bg-red-50/50 p-3 mt-1 rounded-lg text-[11px] text-red-700 font-semibold">
                        Apenas corretores/administradores têm permissão para resolver contestações.
                      </div>
                    ) : (
                      <div className="border-t border-[#EEEEF3] pt-3 mt-1 flex flex-col gap-3">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          Resolver Contestação
                        </h4>
                        
                        <div className="flex flex-col gap-2">
                          <textarea
                            placeholder="Resposta / Ação tomada pelo administrador..."
                            value={respostas[c.id] || ""}
                            onChange={(e) => setRespostas(prev => ({ ...prev, [c.id]: e.target.value }))}
                            rows={2}
                            className="w-full p-2.5 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Nome do Profissional..."
                              value={profissionais[c.id] || ""}
                              onChange={(e) => setProfissionais(prev => ({ ...prev, [c.id]: e.target.value }))}
                              className="p-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Contato (Telefone)..."
                              value={contatos[c.id] || ""}
                              onChange={(e) => setContatos(prev => ({ ...prev, [c.id]: e.target.value }))}
                              className="p-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="URL do Comprovante (PDF/Imagem)..."
                              value={comprovantes[c.id] || ""}
                              onChange={(e) => setComprovantes(prev => ({ ...prev, [c.id]: e.target.value }))}
                              className="flex-1 p-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none"
                            />
                            <input
                              type="file"
                              id={`receipt-upload-${c.id}`}
                              accept="image/*,application/pdf"
                              disabled={uploadingReceipt[c.id]}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleReceiptUpload(c.id, file);
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor={`receipt-upload-${c.id}`}
                              className={`px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                                uploadingReceipt[c.id] ? "opacity-50 pointer-events-none" : ""
                              }`}
                            >
                              {uploadingReceipt[c.id] ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Enviando...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={() => handleResolveSubmit(c.id)}
                          disabled={loadingResolution[c.id]}
                          className="py-2 bg-[#708D81] hover:bg-[#5b756b] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {loadingResolution[c.id] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Marcar como Resolvida"
                          )}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="bg-[#708D81]/10 border border-[#708D81]/25 p-3 rounded-lg flex flex-col gap-1.5 text-xs text-gray-600">
                      <span className="font-bold text-[#5b756b] flex items-center gap-1">✓ Resolvido</span>
                      {c.respostaAdmin && <p className="italic">"{c.respostaAdmin}"</p>}
                      {c.profissionalNome && (
                        <p>🔧 Profissional: <strong>{c.profissionalNome}</strong> {c.profissionalContato && `(${c.profissionalContato})`}</p>
                      )}
                      {c.comprovanteUrl && (
                        <a href={c.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="text-[#004777] font-bold hover:underline">
                          Visualizar Comprovante
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
