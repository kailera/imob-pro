"use client";

import { useId, useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import {
  discardLeaseAttachment,
  uploadLeaseAttachment,
} from "@/app/(admin)/locacao/actions/leaseAttachments";
import type { LeaseAttachment } from "@/lib/locacao/anexos";

type LocalAttachment = LeaseAttachment & { uploadedNow?: boolean };

type LeaseAttachmentsFieldProps = {
  leaseId: string;
  name: string;
  title?: string;
  description?: string;
  initialAttachments?: LeaseAttachment[];
  disabled?: boolean;
};

export function LeaseAttachmentsField({
  leaseId,
  name,
  title = "Documentos",
  description = "Informe um título e selecione o arquivo.",
  initialAttachments = [],
  disabled = false,
}: LeaseAttachmentsFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<LocalAttachment[]>(initialAttachments);
  const [documentTitle, setDocumentTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!documentTitle.trim()) {
      setMessage("Informe o título do arquivo.");
      return;
    }
    if (!selectedFile) {
      setMessage("Selecione um arquivo.");
      return;
    }

    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("title", documentTitle.trim());
      formData.append("file", selectedFile);
      const result = await uploadLeaseAttachment(leaseId, formData);
      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setAttachments(current => [...current, { ...result.attachment, uploadedNow: true }]);
      setDocumentTitle("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage("Arquivo enviado. Salve a seção para confirmar o vínculo.");
    } catch {
      setMessage("Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(attachment: LocalAttachment) {
    setAttachments(current => current.filter(item => item.id !== attachment.id));
    setMessage("Arquivo removido da lista. Salve a seção para confirmar a exclusão.");
    if (attachment.uploadedNow && attachment.storageKey) {
      void discardLeaseAttachment(leaseId, attachment.storageKey);
    }
  }

  const serializedAttachments = attachments.map(attachment => ({
    id: attachment.id,
    title: attachment.title,
    fileName: attachment.fileName,
    url: attachment.url,
    mimeType: attachment.mimeType,
    storageKey: attachment.storageKey,
  }));

  return (
    <div className="space-y-3 border-t border-gray-100 pt-4 text-xs" data-slot="lease-attachments-field">
      <input type="hidden" name={name} value={JSON.stringify(serializedAttachments)} />

      <div>
        <h4 className="flex items-center gap-2 font-bold text-gray-900">
          <Paperclip className="h-4 w-4 text-[#004777]" aria-hidden="true" />
          {title}
        </h4>
        <p className="mt-1 text-[11px] text-gray-500">{description}</p>
      </div>

      {!disabled && (
        <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor={`${inputId}-title`} className="mb-1 block font-medium text-gray-700">
              Título do arquivo*
            </label>
            <input
              id={`${inputId}-title`}
              type="text"
              value={documentTitle}
              onChange={event => setDocumentTitle(event.target.value)}
              placeholder="Ex.: Carnê de IPTU 2026"
              maxLength={160}
              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 outline-none focus:ring-2 focus:ring-[#004777]/20"
            />
          </div>

          <div>
            <label htmlFor={`${inputId}-file`} className="mb-1 block font-medium text-gray-700">
              Arquivo*
            </label>
            <input
              ref={fileInputRef}
              id={`${inputId}-file`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
              onChange={event => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                if (file && !documentTitle.trim()) {
                  setDocumentTitle(file.name.replace(/\.[^.]+$/, ""));
                }
                setMessage("");
              }}
              className="block min-h-11 w-full cursor-pointer rounded-lg border border-gray-200 bg-white text-xs text-gray-600 file:mr-3 file:min-h-11 file:border-0 file:bg-sky-50 file:px-3 file:font-semibold file:text-[#004777]"
            />
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#004777] px-4 font-semibold text-white hover:bg-[#003355] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]/30 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {uploading ? "Enviando..." : "Adicionar"}
          </button>
        </div>
      )}

      {message && (
        <p role="status" className={`rounded-lg px-3 py-2 font-medium ${
          message.startsWith("Arquivo enviado") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
        }`}>
          {message}
        </p>
      )}

      {attachments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-gray-500">
          Nenhum arquivo anexado.
        </div>
      ) : (
        <ul className="space-y-2">
          {attachments.map(attachment => (
            <li key={attachment.id} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-[#004777]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <label htmlFor={`${inputId}-${attachment.id}`} className="sr-only">Título do arquivo</label>
                <input
                  id={`${inputId}-${attachment.id}`}
                  type="text"
                  value={attachment.title}
                  disabled={disabled}
                  maxLength={160}
                  onChange={event => setAttachments(current => current.map(item => (
                    item.id === attachment.id ? { ...item, title: event.target.value } : item
                  )))}
                  className="min-h-9 w-full rounded-md border border-transparent px-2 font-semibold text-gray-900 outline-none hover:border-gray-200 focus:border-gray-200 focus:ring-2 focus:ring-[#004777]/20 disabled:bg-transparent"
                />
                <p className="truncate px-2 text-[11px] text-gray-500">{attachment.fileName}</p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={attachment.url}
                  download={attachment.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Baixar arquivo"
                  aria-label={`Baixar ${attachment.title}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#004777] hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]/30"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </a>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment)}
                    title="Excluir arquivo"
                    aria-label={`Excluir ${attachment.title}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
