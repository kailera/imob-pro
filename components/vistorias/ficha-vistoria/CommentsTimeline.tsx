import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Clock, Edit2, Trash2, Save, X, Film } from "lucide-react";
import { PreviewableImage } from "./PreviewableImage";

export interface CommentMedia {
  url: string;
  type: 'image' | 'video';
}

export interface CommentData {
  id: string;
  roomId: string;
  roomName: string;
  text: string;
  status: 'Aprovado' | 'Atenção';
  timestamp: Date;
  media?: CommentMedia[];
}

interface CommentsTimelineProps {
  comments: CommentData[];
  onUpdateComment?: (
    commentId: string,
    text: string,
    status: 'Aprovado' | 'Atenção',
    media?: { url: string; type: 'image' | 'video' }[]
  ) => void;
  onDeleteComment?: (commentId: string) => void;
  disabled?: boolean;
}

export function CommentsTimeline({ comments, onUpdateComment, onDeleteComment, disabled = false }: CommentsTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editStatus, setEditStatus] = useState<'Aprovado' | 'Atenção'>('Aprovado');
  const [editMedia, setEditMedia] = useState<CommentMedia[]>([]);

  const startEdit = (comment: CommentData) => {
    setEditingId(comment.id);
    setEditText(comment.text);
    setEditStatus(comment.status);
    setEditMedia(comment.media || []);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditStatus('Aprovado');
    setEditMedia([]);
  };

  const saveEdit = (commentId: string) => {
    if (!editText.trim()) return;
    if (onUpdateComment) {
      onUpdateComment(commentId, editText.trim(), editStatus, editMedia);
    }
    cancelEdit();
  };

  const handleDelete = (commentId: string) => {
    if (confirm("Tem certeza de que deseja excluir este comentário e suas mídias?")) {
      if (onDeleteComment) {
        onDeleteComment(commentId);
      }
    }
  };

  const removeEditMedia = (index: number) => {
    setEditMedia(prev => prev.filter((_, i) => i !== index));
  };

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-[#EEEEF3] m-5">
        <Clock className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm font-semibold text-gray-500">Nenhum comentário adicionado</p>
        <p className="text-xs text-gray-400 mt-1">
          Use o formulário acima ou o ícone de microfone para iniciar a vistoria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-[#EEEEF3]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEEEF3]">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Histórico de Alterações ({comments.length})
        </h3>
      </div>
      
      <div className="p-5 pb-8 flex flex-col gap-4">
        {comments.map((comment) => {
          const isEditing = editingId === comment.id;

          return (
            <div key={comment.id} className="p-4 bg-white border border-[#EEEEF3] rounded-xl shadow-sm relative">
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-[#EEEEF3]/50 text-[#004777] rounded-md text-xs font-bold">
                      Editar: {comment.roomName}
                    </span>
                    <button
                      onClick={cancelEdit}
                      className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>

                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full min-h-[90px] p-2.5 border border-[#EEEEF3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/25 resize-y text-[#280003]"
                  />

                  {editMedia.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      {editMedia.map((med, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border bg-gray-50 flex items-center justify-center group">
                          {med.type === "image" ? (
                            <img src={med.url} alt="Edit preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white relative">
                              <Film className="w-4 h-4 text-gray-400" />
                              <span className="text-[6px] mt-0.5 font-bold uppercase tracking-wider text-gray-400">Vídeo</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeEditMedia(idx)}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all shadow-sm"
                            title="Remover anexo"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditStatus('Aprovado')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                          editStatus === 'Aprovado'
                            ? 'bg-[#708D81]/15 text-[#708D81] border-[#708D81]/30'
                            : 'bg-white text-gray-400 border-gray-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                      </button>
                      <button
                        onClick={() => setEditStatus('Atenção')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                          editStatus === 'Atenção'
                            ? 'bg-[#F0D18A]/20 text-[#8c6d1f] border-[#F0D18A]/40'
                            : 'bg-white text-gray-400 border-gray-200'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Atenção
                      </button>
                    </div>

                    <button
                      onClick={() => saveEdit(comment.id)}
                      disabled={!editText.trim()}
                      className="px-3.5 py-1.5 bg-[#004777] text-white hover:bg-[#00365a] rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#EEEEF3]/50 text-[#004777] rounded-md text-xs font-bold">
                        {comment.roomName}
                      </span>
                      {comment.id.startsWith("temp-") && (
                        <span className="bg-yellow-50 border border-yellow-200 text-yellow-750 text-[8px] font-bold px-1.5 py-0.5 rounded animate-pulse uppercase">
                          Pendente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium text-gray-400">
                        Hoje, {comment.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {!disabled && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(comment)}
                            className="p-1 text-gray-400 hover:text-[#004777] rounded hover:bg-slate-100 transition-colors"
                            title="Editar comentário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Excluir comentário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-[#280003] leading-relaxed mb-4 whitespace-pre-wrap">
                    {comment.text}
                  </p>
                  
                  {comment.media && comment.media.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {comment.media.map((med, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#EEEEF3] bg-gray-50 flex items-center justify-center shadow-sm">
                          {med.type === "image" ? (
                            <PreviewableImage src={med.url} alt={`Foto de ${comment.roomName}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="relative w-full h-full">
                              <video 
                                src={med.url} 
                                controls 
                                className="w-full h-full object-cover" 
                              />
                              {med.url.includes("/temp/") && (
                                <div className="absolute top-1 left-1 bg-black/75 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow flex items-center gap-1 select-none animate-pulse z-10">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                                  Otimizando
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-[#EEEEF3]/60">
                    {comment.status === 'Aprovado' ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#708D81] uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#8c6d1f] uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5" /> Atenção
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">Por Vistoriador</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
