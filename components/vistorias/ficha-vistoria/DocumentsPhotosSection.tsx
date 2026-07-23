"use client";

import React, { useRef, useState } from "react";
import { Download, File, Image as ImageIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { getPresignedUploadUrl, uploadMediaToRustFS } from "@/app/actions/uploadMedia";
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
  const [error, setError] = useState("");

  async function uploadFile(file: File) {
    const contentType = file.type || "application/octet-stream";
    try {
      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(file.name, contentType);
      const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
      if (!response.ok) throw new Error("Falha no envio direto.");
      return publicUrl;
    } catch {
      const formData = new FormData();
      formData.append("file", file);
      return (await uploadMediaToRustFS(formData)).url;
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    if (!navigator.onLine) {
      setError("Conecte-se à internet para enviar novos arquivos.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded: InspectionAttachment[] = [];
      for (const file of Array.from(files)) {
        uploaded.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: await uploadFile(file),
          mimeType: file.type || "application/octet-stream",
          description: "",
        });
      }
      onChange([...attachments, ...uploaded]);
    } catch (uploadError) {
      console.error(uploadError);
      setError("Não foi possível enviar um ou mais arquivos. Tente novamente.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3" data-slot="documents-photos-section">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Paperclip className="h-4 w-4 text-[#004777]" /> Documentos e Fotos
          </h4>
          <p className="mt-1 text-[11px] text-gray-400">Envie arquivos e descreva o conteúdo de cada item.</p>
        </div>
        {!disabled && (
          <>
            <input ref={inputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => handleFiles(event.target.files)} className="hidden" />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#004777] px-3 text-xs font-semibold text-white hover:bg-[#00365a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]/30 disabled:opacity-60">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Adicionar"}
            </button>
          </>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{error}</p>}

      {attachments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#EEEEF3] bg-gray-50/50 p-6 text-center text-xs font-semibold text-gray-400">
          Nenhum documento ou foto anexado.
        </div>
      ) : attachments.map((attachment) => {
        const isImage = attachment.mimeType.startsWith("image/");
        return (
          <div key={attachment.id} className="flex gap-3 rounded-xl border border-[#EEEEF3] bg-white p-3 shadow-sm">
            <div className="h-20 w-24 flex-none overflow-hidden rounded-lg border border-[#EEEEF3] bg-slate-50">
              {isImage ? <PreviewableImage src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" /> : (
                <div className="flex h-full flex-col items-center justify-center text-[#004777]"><File className="h-6 w-6" /><span className="mt-1 max-w-20 truncate text-[9px] font-bold uppercase">{attachment.name.split(".").pop()}</span></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-bold text-[#280003]">
                  {isImage && <ImageIcon className="h-3.5 w-3.5 flex-none text-[#004777]" />}{attachment.name}
                </span>
                <div className="flex flex-none gap-1">
                  <a href={attachment.url} download={attachment.name} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-gray-400 hover:bg-slate-100 hover:text-[#004777]" title="Baixar arquivo"><Download className="h-4 w-4" /></a>
                  {!disabled && <button type="button" onClick={() => onChange(attachments.filter((item) => item.id !== attachment.id))} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remover arquivo"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
              <textarea value={attachment.description} disabled={disabled} onChange={(event) => onChange(attachments.map((item) => item.id === attachment.id ? { ...item, description: event.target.value } : item))} rows={2} placeholder="Descrição do arquivo..." className="w-full resize-y rounded-lg border border-[#EEEEF3] p-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 disabled:bg-gray-50" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
