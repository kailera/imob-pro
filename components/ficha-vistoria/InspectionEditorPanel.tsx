"use client";

import React, { useState, useEffect } from "react";
import { MessageSquarePlus, FileText, AlertTriangle } from "lucide-react";
import { Room } from "./FloorPlanVisualizer";
import { CommentForm } from "./CommentForm";
import { CommentsTimeline, CommentData } from "./CommentsTimeline";

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
  reportDescription: string;
  reportObservation: string;
  onUpdateReport: (description: string, observation: string) => void;
}

export function InspectionEditorPanel({ 
  rooms, 
  comments, 
  onAddComment,
  reportDescription,
  reportObservation,
  onUpdateReport
}: InspectionEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'report'>('comments');
  const [tempDesc, setTempDesc] = useState(reportDescription);
  const [tempObs, setTempObs] = useState(reportObservation);

  // Sincronizar com mudanças externas (ex: montagem inicial da página)
  useEffect(() => {
    setTempDesc(reportDescription);
  }, [reportDescription]);

  useEffect(() => {
    setTempObs(reportObservation);
  }, [reportObservation]);

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
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 text-center ${
            activeTab === 'comments'
              ? 'border-[#004777] text-[#004777] bg-white'
              : 'border-transparent text-gray-500 hover:text-[#280003] hover:bg-gray-100/50'
          }`}
        >
          Ambientes & Fotos
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 text-center ${
            activeTab === 'report'
              ? 'border-[#004777] text-[#004777] bg-white'
              : 'border-transparent text-gray-500 hover:text-[#280003] hover:bg-gray-100/50'
          }`}
        >
          Relatório Geral
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'comments' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Formulário Modularizado (Clean Code) */}
          <CommentForm rooms={rooms} onAddComment={onAddComment} />

          {/* Linha do Tempo Modularizada (Clean Code) */}
          <CommentsTimeline comments={comments} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-5 bg-white">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#004777]" />
              Descrição Geral do Relatório
            </label>
            <textarea
              value={tempDesc}
              onChange={(e) => {
                setTempDesc(e.target.value);
                onUpdateReport(e.target.value, tempObs);
              }}
              placeholder="Descreva o estado geral do imóvel..."
              className="w-full min-h-[180px] p-3 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] resize-none focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#8c6d1f]" />
              Observações Técnicas / Pontos de Atenção
            </label>
            <textarea
              value={tempObs}
              onChange={(e) => {
                setTempObs(e.target.value);
                onUpdateReport(tempDesc, e.target.value);
              }}
              placeholder="Informe observações técnicas específicas, se houver..."
              className="w-full min-h-[100px] p-3 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] resize-none focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm"
            />
          </div>
          
          <div className="bg-[#004777]/5 rounded-xl border border-[#004777]/10 p-4 mt-2">
            <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider mb-1">
              Sincronização em Tempo Real
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              O relatório geral consolida o estado de entrega do imóvel. Ao atualizar qualquer campo, a visualização à esquerda e os dados do PDF oficial serão atualizados automaticamente.
            </p>
          </div>
        </div>
      )}
      
    </div>
  );
}
