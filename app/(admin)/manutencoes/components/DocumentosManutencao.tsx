"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { uploadDocumentoManutencao } from "../actions";
import type { DocumentoManutencaoInput } from "../types";

type DocumentosManutencaoProps = {
  documentos: DocumentoManutencaoInput[];
  onChange: (documentos: DocumentoManutencaoInput[]) => void;
  disabled?: boolean;
};

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosManutencao({
  documentos,
  onChange,
  disabled = false,
}: DocumentosManutencaoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const uploaded: DocumentoManutencaoInput[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadDocumentoManutencao(formData);
        if (!result.success) throw new Error(result.error);
        uploaded.push(result.data);
      }
      onChange([...documentos, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o documento.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="documentos-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 id="documentos-title" className="text-xs font-bold text-[#280003]">Recibos e documentos</h4>
          <p className="text-[11px] text-zinc-500">PDF, JPG, PNG ou WEBP, até 10 MB por arquivo.</p>
        </div>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-[#004777] transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777] disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Enviando..." : "Adicionar"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

      {documentos.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-250 bg-zinc-50 p-4 text-zinc-500">
          <Paperclip className="h-5 w-5" />
          <p className="text-xs">Nenhum recibo anexado.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {documentos.map((documento, index) => (
            <li key={`${documento.url}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-[#004777]/8 p-2 text-[#004777]"><FileText className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#280003]">{documento.nomeOriginal}</p>
                  <p className="text-[10px] text-zinc-400">{formatBytes(documento.tamanhoBytes)}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(documentos.filter((_, itemIndex) => itemIndex !== index))}
                aria-label={`Remover ${documento.nomeOriginal}`}
                className="min-h-11 min-w-11 rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
