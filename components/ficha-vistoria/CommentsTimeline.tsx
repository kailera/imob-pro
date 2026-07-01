"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

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
}

export function CommentsTimeline({ comments }: CommentsTimelineProps) {
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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEEEF3]">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Histórico de Alterações ({comments.length})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 pb-8 flex flex-col gap-4">
        {comments.map((comment) => (
          <div key={comment.id} className="p-4 bg-white border border-[#EEEEF3] rounded-xl shadow-sm relative">
            <div className="flex items-start justify-between mb-2">
              <span className="px-2.5 py-1 bg-[#EEEEF3]/50 text-[#004777] rounded-md text-xs font-bold">
                {comment.roomName}
              </span>
              <span className="text-[10px] font-medium text-gray-400">
                Hoje, {comment.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <p className="text-sm text-[#280003] leading-relaxed mb-4 whitespace-pre-wrap">
              {comment.text}
            </p>
            
            {comment.media && comment.media.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {comment.media.map((med, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#EEEEF3] bg-gray-50 flex items-center justify-center shadow-sm">
                    {med.type === "image" ? (
                      <img 
                        src={med.url} 
                        alt="Comentário" 
                        onClick={() => window.open(med.url, '_blank')}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                      />
                    ) : (
                      <video 
                        src={med.url} 
                        controls 
                        className="w-full h-full object-cover" 
                      />
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
          </div>
        ))}
      </div>
    </div>
  );
}
