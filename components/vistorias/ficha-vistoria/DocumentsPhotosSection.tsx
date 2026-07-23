"use client";

import React, { useRef, useState } from "react";
import { Download, File, Image as ImageIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { getPresignedUploadUrl } from "@/app/actions/uploadMedia";
import { PreviewableImage } from "./PreviewableImage";

export interface InspectionAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  description: string;
}

interface DocumentsPhotosSectionProps {
  attachments: InspectionAttachment[];
  onChange: (attachments: InspectionAttachment[]) => void;
  disabled?: boolean;
}

export function DocumentsPhotosSection({ attachments, onChange, disabled = false }: DocumentsPhotosSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!navigator.onLine) {
      setUploadError("Conecte-se à internet para enviar novos arquivos.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const uploaded: InspectionAttachment[] = [];
      for (const file of Array.from(files)) {
        const contentType = file.type || "application/octet-stream";
        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(file.name, contentType);
        const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
        if (!response.ok) throw new Error(`Falha ao enviar ${file.name}.`);
        uploaded.push({ id: crypto.randomUUID(), name: file.name, url: publicUrl, mimeType: contentType, description: "" });
      }
      onChange([...attachments, ...uploaded]);
    } catch (error) {
      console.error(error);
      setUploadError("Não foi possível enviar um ou mais arquivos. Tente novamente.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="border-t border-[#EEEEF3] pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
          <Paperclip className="h-4 w-4 text-[#004777]" /> Documentos e Fotos
        </label>
        {!disabled && (
          <>
            <input ref={inputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => uploadFiles(event.target.files)} className="hidden" id="inspection-attachments" />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 rounded-lg bg-[#004777] px-3 py-2 text-xs font-semibold text-white hover:bg-[#00365a] disabled:opacity-60">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Adicionar arquivos"}
            </button>
          </>
        )}
      </div>
      {uploadError && <p className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{uploadError}</p>}
      {attachments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#EEEEF3] bg-gray-50/50 p-6 text-center">
          <Paperclip className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          <p className="text-xs font-semibold text-gray-500">Nenhum documento ou foto anexado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {attachments.map((attachment) => {
            const isImage = attachment.mimeType.startsWith("image/");
            return (
              <div key={attachment.id} className="rounded-xl border border-[#EEEEF3] bg-white p-3 shadow-sm">
                <div className="flex gap-3">
                  <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-[#EEEEF3] bg-slate-50">
                    {isImage ? <PreviewableImage src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" /> : (
                      <div className="flex h-full flex-col items-center justify-center text-[#004777]"><File className="h-6 w-6" /><span className="mt-1 max-w-[80px] truncate text-[9px] font-bold uppercase">{attachment.name.split(".").pop() || "Arquivo"}</span></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {isImage ? <ImageIcon className="h-3.5 w-3.5 flex-shrink-0 text-[#004777]" /> : <File className="h-3.5 w-3.5 flex-shrink-0 text-[#004777]" />}
                        <span className="truncate text-xs font-bold text-[#280003]" title={attachment.name}>{attachment.name}</span>
                      </div>
                      <div className="flex flex-shrink-0 gap-1">
                        <a href={attachment.url} download={attachment.name} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-gray-400 hover:bg-slate-100 hover:text-[#004777]" title="Baixar arquivo"><Download className="h-4 w-4" /></a>
                        {!disabled && <button type="button" onClick={() => onChange(attachments.filter((item) => item.id !== attachment.id))} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remover arquivo"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>
                    <textarea value={attachment.description} disabled={disabled} onChange={(event) => onChange(attachments.map((item) => item.id === attachment.id ? { ...item, description: event.target.value } : item))} placeholder="Adicione uma descrição para este arquivo..." rows={2} className="w-full resize-y rounded-lg border border-[#EEEEF3] p-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 disabled:bg-gray-50" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
