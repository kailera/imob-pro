"use client";

import React, { useState, useEffect } from "react";
import { Save, CheckCircle2, AlertTriangle, Image as ImageIcon, Mic, Square, Loader2, X, Film } from "lucide-react";
import { Room } from "./FloorPlanVisualizer";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { processAudioComment } from "@/app/actions/processAudio";
import { uploadMediaToRustFS } from "@/app/actions/uploadMedia";
import { db } from "@/lib/db";

interface CommentFormProps {
  rooms: Room[];
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void,
  onAddComment: (
    roomId: string,
    roomName: string,
    text: string,
    status: 'Aprovado' | 'Atenção',
    media?: { url: string; type: 'image' | 'video' }[]
  ) => void;
}

export function CommentForm({ rooms, onAddComment, onUpdateRoom }: CommentFormProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('geral');
  const [commentText, setCommentText] = useState("");
  const [status, setStatus] = useState<'Aprovado' | 'Atenção'>('Aprovado');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: 'image' | 'video' }[]>([]);

  const { isRecording, audioBlob, startRecording, stopRecording, setAudioBlob } = useAudioRecorder();
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const [recordingField, setRecordingField] = useState<'geral' | 'visaoGeral' | 'comentarios'>('geral');

  const handleStartRecording = (field: 'geral' | 'visaoGeral' | 'comentarios') => {
    setRecordingField(field);
    startRecording();
  };

  // Enviar áudio para a IA assim que a gravação for concluída
  useEffect(() => {
    async function processAudio() {
      if (!audioBlob) return;

      setIsProcessingAI(true);
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "vistoria-audio.webm");

        const room = selectedRoomId === 'geral'
          ? null
          : rooms.find(r => r.id === selectedRoomId);

        if (room) {
          formData.append("roomName", room.name);
          formData.append("roomType", room.type);
        }

        const aiText = await processAudioComment(formData);

        // Adiciona a transcrição inteligente ao campo correto
        if (recordingField === 'geral') {
          setCommentText(prev => prev ? `${prev}\n${aiText}` : aiText);
        } else if (recordingField === 'visaoGeral' && selectedRoom && onUpdateRoom) {
          const currentVal = selectedRoom.visaoGeral || "";
          onUpdateRoom(selectedRoom.id, {
            visaoGeral: currentVal ? `${currentVal}\n${aiText}` : aiText
          });
        } else if (recordingField === 'comentarios' && selectedRoom && onUpdateRoom) {
          const currentVal = selectedRoom.comentarios || "";
          onUpdateRoom(selectedRoom.id, {
            comentarios: currentVal ? `${currentVal}\n${aiText}` : aiText
          });
        }
      } catch (error) {
        console.error("Erro ao transcrever áudio:", error);
        alert("Ocorreu um erro ao processar o áudio com a IA. Tente novamente.");
      } finally {
        setIsProcessingAI(false);
        setAudioBlob(null); // Limpa para evitar envio duplicado
      }
    }

    processAudio();
  }, [audioBlob, setAudioBlob, selectedRoomId, rooms, recordingField, selectedRoom, onUpdateRoom]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(file => {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith("video/") ? ("video" as const) : ("image" as const);
      return { url, type };
    });

    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePreview = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (!previews[index].url.startsWith("data:")) {
      URL.revokeObjectURL(previews[index].url);
    }
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!commentText.trim()) return;

    setIsUploading(true);
    const uploadedMedia: { url: string; type: 'image' | 'video'; offlineId?: string }[] = [];

    try {
      if (navigator.onLine) {
        // Fazer o upload de cada arquivo selecionado usando a Server Action
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await uploadMediaToRustFS(formData);
          uploadedMedia.push(res);
        }
      } else {
        // Fluxo Offline: Salva as mídias fisicamente no IndexedDB e gera URLs locais temporárias
        for (const file of selectedFiles) {
          const offlineId = "offline-media-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
          
          await db.offlineMedia.put({
            id: offlineId,
            blob: file,
            type: file.type.startsWith("video/") ? "video" : "image",
            fileName: file.name
          });

          uploadedMedia.push({
            url: URL.createObjectURL(file),
            type: file.type.startsWith("video/") ? "video" : "image",
            offlineId: offlineId
          });
        }
      }

      const roomName = selectedRoomId === 'geral'
        ? 'Comentário Geral'
        : rooms.find(r => r.id === selectedRoomId)?.name || 'Ambiente Desconhecido';

      onAddComment(selectedRoomId, roomName, commentText.trim(), status, uploadedMedia);

      // Resetar formulário
      setCommentText("");
      setSelectedFiles([]);
      previews.forEach(p => {
        if (!p.url.startsWith("data:")) {
          URL.revokeObjectURL(p.url);
        }
      });
      setPreviews([]);
    } catch (error) {
      console.error("Erro ao fazer upload e salvar comentário:", error);
      alert("Ocorreu um erro ao enviar os arquivos para o storage. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-5 border-b border-[#EEEEF3] bg-gray-50/50 flex flex-col gap-4">
      {/* Context Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Contexto do Comentário
        </label>
        <select
          value={selectedRoomId}
          disabled={isUploading}
          onChange={(e) => setSelectedRoomId(e.target.value)}
          className="px-3 py-2.5 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm disabled:opacity-60"
        >
          <option value="geral">📝 Comentário Geral / Informações</option>
          {rooms.length > 0 && <optgroup label="Ambientes">
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.type})
              </option>
            ))}
          </optgroup>}
        </select>
      </div>

      {selectedRoomId !== 'geral' && selectedRoom && onUpdateRoom ? (
        <div className="flex flex-col gap-4">
          
          {/* Visão Geral do Ambiente */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-bold text-[#004777] uppercase tracking-wider flex items-center justify-between">
              <span>Visão Geral do Ambiente ({selectedRoom.name})</span>
              {isRecording && recordingField === 'visaoGeral' && (
                <span className="text-red-500 flex items-center gap-1 animate-pulse font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Gravando...
                </span>
              )}
              {isProcessingAI && recordingField === 'visaoGeral' && (
                <span className="text-[#004777] flex items-center gap-1 font-semibold">
                  <Loader2 className="w-3 h-3 animate-spin" /> Processando IA...
                </span>
              )}
            </label>
            <div className="relative">
              <textarea
                value={selectedRoom.visaoGeral || ""}
                onChange={(e) => onUpdateRoom(selectedRoom.id, { visaoGeral: e.target.value })}
                disabled={isProcessingAI || isUploading}
                placeholder="Descreva o estado geral do ambiente (ex: Pintura nova, piso ok...)"
                className="w-full min-h-[100px] p-3 pb-12 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] resize-y focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm disabled:opacity-70"
              />
              
              {/* Microphone Action Button */}
              <div className="absolute bottom-3 right-3">
                {isRecording && recordingField === 'visaoGeral' ? (
                  <button
                    onClick={stopRecording}
                    className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                    title="Parar gravação"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartRecording('visaoGeral')}
                    disabled={isRecording || isProcessingAI || isUploading}
                    className="flex items-center justify-center w-8 h-8 bg-[#004777]/10 text-[#004777] rounded-full hover:bg-[#004777]/20 transition-colors shadow-sm disabled:opacity-50"
                    title="Gravar áudio com Inteligência Artificial"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Comentários do Ambiente */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-bold text-[#004777] uppercase tracking-wider flex items-center justify-between">
              <span>Comentários do Ambiente</span>
              {isRecording && recordingField === 'comentarios' && (
                <span className="text-red-500 flex items-center gap-1 animate-pulse font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Gravando...
                </span>
              )}
              {isProcessingAI && recordingField === 'comentarios' && (
                <span className="text-[#004777] flex items-center gap-1 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processando IA...
                </span>
              )}
            </label>
            <div className="relative">
              <textarea
                value={selectedRoom.comentarios || ""}
                onChange={(e) => onUpdateRoom(selectedRoom.id, { comentarios: e.target.value })}
                disabled={isProcessingAI || isUploading}
                placeholder="Descreva observações detalhadas do ambiente..."
                className="w-full min-h-[100px] p-3 pb-12 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] resize-y focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm disabled:opacity-70"
              />
              
              {/* Microphone Action Button */}
              <div className="absolute bottom-3 right-3">
                {isRecording && recordingField === 'comentarios' ? (
                  <button
                    onClick={stopRecording}
                    className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                    title="Parar gravação"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartRecording('comentarios')}
                    disabled={isRecording || isProcessingAI || isUploading}
                    className="flex items-center justify-center w-8 h-8 bg-[#004777]/10 text-[#004777] rounded-full hover:bg-[#004777]/20 transition-colors shadow-sm disabled:opacity-50"
                    title="Gravar áudio com Inteligência Artificial"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <>
          {/* Text Area */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Observações ou Edições</span>
              {isRecording && recordingField === 'geral' && (
                <span className="text-red-500 flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Gravando...
                </span>
              )}
              {isProcessingAI && recordingField === 'geral' && (
                <span className="text-[#004777] flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Processando IA...
                </span>
              )}
              {isUploading && (
                <span className="text-[#004777] flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Enviando arquivos...
                </span>
              )}
            </label>

            <div className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isProcessingAI || isUploading}
                placeholder="Descreva o estado do ambiente, ou use o microfone para a IA transcrever..."
                className="w-full min-h-[120px] p-3 pb-12 bg-white border border-[#EEEEF3] rounded-lg text-sm text-[#280003] resize-none focus:outline-none focus:ring-2 focus:ring-[#004777]/20 shadow-sm disabled:opacity-70"
              />

              {/* Microphone Action Button */}
              <div className="absolute bottom-3 right-3">
                {isRecording && recordingField === 'geral' ? (
                  <button
                    onClick={stopRecording}
                    className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                    title="Parar gravação"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartRecording('geral')}
                    disabled={isRecording || isProcessingAI || isUploading}
                    className="flex items-center justify-center w-8 h-8 bg-[#004777]/10 text-[#004777] rounded-full hover:bg-[#004777]/20 transition-colors shadow-sm disabled:opacity-50"
                    title="Gravar áudio com Inteligência Artificial"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Media Previews Container */}
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2.5 p-3 bg-white border border-[#EEEEF3] rounded-xl shadow-sm">
              {previews.map((preview, index) => (
                <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#EEEEF3] bg-gray-50 flex items-center justify-center shadow-sm group">
                  {preview.type === "image" ? (
                    <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white relative">
                      <Film className="w-5 h-5 text-gray-400" />
                      <span className="text-[8px] mt-0.5 font-bold uppercase tracking-wider text-gray-400">Vídeo</span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => removePreview(index)}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all shadow-sm opacity-90 group-hover:scale-105 disabled:opacity-50"
                    title="Remover"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatus('Aprovado')}
                disabled={isUploading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${status === 'Aprovado'
                  ? 'bg-[#708D81]/15 text-[#708D81] border-[#708D81]/30'
                  : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                  } disabled:opacity-50`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
              </button>
              <button
                onClick={() => setStatus('Atenção')}
                disabled={isUploading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${status === 'Atenção'
                  ? 'bg-[#F0D18A]/20 text-[#8c6d1f] border-[#F0D18A]/40'
                  : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                  } disabled:opacity-50`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Requer Atenção
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* File Upload Selector */}
              <input
                type="file"
                id="file-upload"
                accept="image/*,video/*"
                multiple
                capture="environment"
                disabled={isProcessingAI || isUploading}
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className={`p-2 text-gray-400 hover:text-[#004777] hover:bg-[#EEEEF3] rounded-lg transition-colors cursor-pointer flex items-center justify-center ${(isProcessingAI || isUploading) ? "opacity-50 pointer-events-none" : ""
                  }`}
                title="Anexar Foto ou Vídeo"
              >
                <ImageIcon className="w-4 h-4" />
              </label>

              <button
                onClick={handleSave}
                disabled={!commentText.trim() || isProcessingAI || isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-[#004777] text-white rounded-lg text-sm font-semibold hover:bg-[#00365a] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
