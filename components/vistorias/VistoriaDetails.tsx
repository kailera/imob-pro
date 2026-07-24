"use client";

import React, { useState } from "react";
import { ClipboardCopy, MapPin, User, Calendar, ClipboardCheck, ArrowUpRight, Download, Loader2 } from "lucide-react";
import { getVistoriaById } from "@/app/(admin)/vistorias/actions";
import { DEFAULT_FINAL_INSPECTION_TERM, DEFAULT_INITIAL_INSPECTION_TERM } from "@/lib/vistorias/inspectionTerms";
import {
  CONDITIONS_PER_PAGE,
  fitImageInside,
  getAdaptivePhotoGrid,
  packRoomContentPages,
  PHOTO_CARD_HEIGHT,
  PHOTO_GRID_GAP,
  PHOTO_HEADING_HEIGHT,
  PHOTOS_PER_ROW,
  ROOM_HEADER_HEIGHT,
  ROOM_SECTION_GAP,
} from "@/lib/vistorias/pdfLayout";

export interface Vistoria {
  id: string;
  codigo: string;
  tipo: "Entrada" | "Saída" | "Periódica";
  status: "nao_iniciada" | "em_andamento" | "aguardando_aprovacao" | "concluida" | "contestada";
  statusLabel: string;
  solicitadaPor: string;
  dataSolicitacao: string;
  dataVistoria?: string;
  vistoriador: string;
  imovelCodigo: string;
  endereco: string;
  proprietario: string;
  inquilino: string;
  tipoImovel: string;
}

interface VistoriaDetailsProps {
  vistoria: Vistoria;
  onViewFullReport?: (id: string) => void;
  pdfButtonOnly?: boolean;
  pdfButtonClassName?: string;
}

const statusBadgeClasses = {
  nao_iniciada: "bg-slate-100 text-slate-700 border-slate-200",
  em_andamento: "bg-[#F0D18A]/20 text-[#8c6d1f] border-[#F0D18A]/40",
  aguardando_aprovacao: "bg-[#004777]/10 text-[#004777] border-[#004777]/20",
  concluida: "bg-[#708D81]/15 text-[#708D81] border-[#708D81]/30",
  contestada: "bg-red-50 text-red-700 border-red-100",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, step: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(
      () => reject(new Error(`Tempo limite excedido ao ${step}.`)),
      timeoutMs
    );
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function waitForImage(image: HTMLImageElement, timeoutMs = 8000): Promise<void> {
  if (image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      resolve();
    };
    const timeoutId = window.setTimeout(finish, timeoutMs);
    image.onload = finish;
    image.onerror = finish;
  });
}

async function preparePdfImageUrls(urls: string[], concurrency = 5) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  const urlMap = new Map<string, string>();
  const objectUrls: string[] = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < uniqueUrls.length) {
      const sourceUrl = uniqueUrls[cursor];
      cursor += 1;
      try {
        const response = await withTimeout(
          fetch(`/api/vistorias/pdf-image?url=${encodeURIComponent(sourceUrl)}`, { cache: "force-cache" }),
          12000,
          "preparar uma imagem do relatório"
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const objectUrl = URL.createObjectURL(await response.blob());
        objectUrls.push(objectUrl);
        urlMap.set(sourceUrl, objectUrl);
      } catch (error) {
        console.warn("[PDF] Variante do servidor indisponível; reduzindo no navegador:", sourceUrl, error);
        try {
          const response = await withTimeout(
            fetch(sourceUrl, { cache: "force-cache" }),
            12000,
            "baixar uma imagem do relatório"
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const bitmap = await createImageBitmap(await response.blob());
          const scale = Math.min(1, 1000 / bitmap.width, 750 / bitmap.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas indisponível.");
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          bitmap.close();
          const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (blob) => blob ? resolve(blob) : reject(new Error("Falha ao comprimir imagem.")),
              "image/jpeg",
              0.74
            );
          });
          const objectUrl = URL.createObjectURL(optimizedBlob);
          objectUrls.push(objectUrl);
          urlMap.set(sourceUrl, objectUrl);
        } catch (fallbackError) {
          console.warn("[PDF] Não foi possível reduzir a imagem:", sourceUrl, fallbackError);
          urlMap.set(sourceUrl, sourceUrl);
        }
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, () => worker())
  );
  return { urlMap, objectUrls };
}

async function loadPdfImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar uma foto do relatório."));
    image.src = src;
  });
}

export function VistoriaDetails({ vistoria, onViewFullReport, pdfButtonOnly = false, pdfButtonClassName }: VistoriaDetailsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    const generationStartedAt = Date.now();
    let preparedObjectUrls: string[] = [];
    setIsGenerating(true);
    try {
      // 1. Carrega dados completos da vistoria diretamente do Banco de Dados
      const res = await withTimeout(
        getVistoriaById(vistoria.id),
        20000,
        "carregar os dados da vistoria"
      );
      if (!res.success || !res.data) {
        alert("Erro ao buscar dados completos da vistoria para geração do PDF.");
        setIsGenerating(false);
        return;
      }

      const dbData = res.data;
      const primaryTenant =
        dbData.locatario ||
        dbData.locatariosAutorizados?.[0]?.locatario ||
        dbData.imovel?.contratoImovelLocacaos?.flatMap((contrato: any) => contrato.locatarios || [])?.[0] ||
        null;
      const realEstate = dbData.operador?.imob || dbData.imovel?.imob || null;
      const tenantContract = dbData.imovel?.contratoImovelLocacaos?.find((contrato: any) =>
        contrato.locatarios?.some((locatario: any) => locatario.id === primaryTenant?.id)
      );
      const realEstateName = realEstate?.nomeFantasia || realEstate?.razaoSocial || "Scatolin Imóveis";
      const realEstateDocument = realEstate?.cnpj || "CNPJ não informado";
      const tenantName = primaryTenant?.nome || vistoria.inquilino || "Locatário não informado";
      const tenantDocument = primaryTenant?.cpfCnpj || "CPF/CNPJ não informado";
      const contractCode = tenantContract?.id ? tenantContract.id.slice(0, 8).toUpperCase() : null;
      const inspectionTermText = dbData.observacoes?.trim() || DEFAULT_INITIAL_INSPECTION_TERM;
      const finalTermText = dbData.reparosNecessarios?.trim() || DEFAULT_FINAL_INSPECTION_TERM;
      const inspectionTerm = inspectionTermText.split(/\n\s*\n/);
      const finalTerm = finalTermText.split(/\n\s*\n/);
      const vistoriadorFormatted = dbData.vistoriador 
        ? `${dbData.vistoriador.firstName} ${dbData.vistoriador.lastName}${dbData.vistoriador.creci ? ` (CRECI: ${dbData.vistoriador.creci})` : ''}` 
        : vistoria.vistoriador;
      const [{ default: html2canvas }, { jsPDF }] = await withTimeout(
        Promise.all([import("html2canvas"), import("jspdf")]),
        15000,
        "carregar o gerador de PDF"
      );

      // 2. Mapear ambientes
      let rooms = dbData.ambienteVistorias.map((r: any) => ({
        id: r.id,
        name: r.nome,
        type: r.tipo,
        visaoGeral: r.visaoGeral,
        comentarios: r.comentarios
      }));

      if (rooms.length === 0) {
        rooms = [
          { id: "fallback-fachada", name: "Fachada", type: "Fachada", visaoGeral: "Em bom estado.", comentarios: "" },
          { id: "fallback-sala", name: "Sala", type: "Sala", visaoGeral: "Sem avarias detectadas.", comentarios: "" }
        ];
      }

      // 3. Mapear termos, documentos e fotos, mantendo compatibilidade com fichas antigas
      const rawInfoGeral = dbData.infoGeral as any;
      let infoGeralItems = Array.isArray(rawInfoGeral) ? rawInfoGeral : rawInfoGeral?.terms || [];
      const attachments: Array<{ id: string; name: string; url: string; mimeType: string; description?: string }> =
        !Array.isArray(rawInfoGeral) && Array.isArray(rawInfoGeral?.attachments) ? rawInfoGeral.attachments : [];
      if (!Array.isArray(infoGeralItems) || infoGeralItems.length === 0) {
        infoGeralItems = [
          { id: 1, titulo: "Visão Geral", conteudo: "Em perfeitas condições de habitação." }
        ];
      }
      const inspectionComments = dbData.comentariosVistoria || [];
      const roomPhotos = inspectionComments.flatMap((comment: any) =>
        (Array.isArray(comment.midias) ? comment.midias : Array.isArray(comment.media) ? comment.media : [])
          .filter((media: any) => media?.type === "image" && typeof media.url === "string")
          .map((media: any) => ({
            url: media.url as string,
            roomId: comment.roomId || "",
            roomName: comment.roomName || rooms.find((room: any) => room.id === comment.roomId)?.name || "Ambiente",
            description: comment.texto || comment.text || ""
          }))
      );
      const imageAttachmentUrls = attachments
        .filter((attachment) => attachment.mimeType.startsWith("image/"))
        .map((attachment) => attachment.url);
      const imagePreparationStartedAt = Date.now();
      const preparedImages = await preparePdfImageUrls(
        [...roomPhotos.map((photo: any) => photo.url), ...imageAttachmentUrls],
        5
      );
      preparedObjectUrls = preparedImages.objectUrls;
      const preparedRoomPhotos = roomPhotos.map((photo: any) => ({
        ...photo,
        pdfUrl: preparedImages.urlMap.get(photo.url) || photo.url,
      }));
      const preparedAttachments = attachments.map((attachment) => ({
        ...attachment,
        pdfUrl: preparedImages.urlMap.get(attachment.url) || attachment.url,
      }));
      console.info("[PDF] Imagens preparadas", {
        count: preparedImages.urlMap.size,
        elapsedMs: Date.now() - imagePreparationStartedAt,
      });

      const qrCodeData = `${window.location.origin}/vistorias/ficha-vistoria/${vistoria.id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeData)}`;

      const normalizeRoomName = (value: string) => value.trim().toLocaleLowerCase("pt-BR");
      const splitIntoChunks = <T,>(items: T[], size: number) =>
        Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
      const groupedRooms = Array.from(
        rooms.reduce((grouped: Map<string, any>, room: any) => {
          const key = normalizeRoomName(room.name || "Ambiente");
          const existing = grouped.get(key);
          if (existing) {
            existing.sourceIds.push(room.id);
            if (!existing.visaoGeral && room.visaoGeral) existing.visaoGeral = room.visaoGeral;
            if (!existing.comentarios && room.comentarios) existing.comentarios = room.comentarios;
          } else {
            grouped.set(key, { ...room, sourceIds: [room.id] });
          }
          return grouped;
        }, new Map<string, any>()).values()
      );
      const textMeasurePdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      textMeasurePdf.setFont("helvetica", "normal");
      textMeasurePdf.setFontSize(8.5);
      const splitTextForPdf = (value: string, fallback: string) => {
        const lines = textMeasurePdf.splitTextToSize(value.trim() || fallback, 162) as string[];
        const linesPerPage = 43;
        return Array.from(
          { length: Math.ceil(lines.length / linesPerPage) },
          (_, index) => lines.slice(index * linesPerPage, (index + 1) * linesPerPage).join(" ")
        );
      };
      type RoomPdfItem =
        | { type: "text"; label: string; text: string; continuation: boolean }
        | { type: "photo-row"; photos: any[]; photoStartIndex: number };
      const roomLayoutInputs = groupedRooms.map((room: any) => {
        const photos = preparedRoomPhotos.filter((photo: any) =>
          room.sourceIds.includes(photo.roomId) || normalizeRoomName(photo.roomName) === normalizeRoomName(room.name)
        );
        const linkedCommentTexts = inspectionComments
          .filter((comment: any) => room.sourceIds.includes(comment.roomId) || normalizeRoomName(comment.roomName || "") === normalizeRoomName(room.name))
          .map((comment: any) => String(comment.texto || comment.text || "").trim())
          .filter(Boolean);
        const roomComments = Array.from(new Set([String(room.comentarios || "").trim(), ...linkedCommentTexts].filter(Boolean))).join("\n\n");
        const overviewText = String(room.visaoGeral || "").trim() || "Não informado";
        const commentsText = roomComments || "Sem comentários registrados.";
        const textItems = [
          ...splitTextForPdf(overviewText, "Não informado").map((text, index) => ({
            kind: "text" as const,
            height: 8 + (textMeasurePdf.splitTextToSize(text, 162) as string[]).length * 3.8,
            payload: { type: "text" as const, label: "Visão geral", text, continuation: index > 0 },
          })),
          ...splitTextForPdf(commentsText, "Sem comentários registrados.").map((text, index) => ({
            kind: "text" as const,
            height: 8 + (textMeasurePdf.splitTextToSize(text, 162) as string[]).length * 3.8,
            payload: { type: "text" as const, label: "Comentários", text, continuation: index > 0 },
          })),
        ];
        const photoItems = splitIntoChunks(photos, PHOTOS_PER_ROW).map((photoRow, rowIndex) => ({
          kind: "photo-row" as const,
          height: PHOTO_CARD_HEIGHT + PHOTO_GRID_GAP,
          payload: {
            type: "photo-row" as const,
            photos: photoRow,
            photoStartIndex: rowIndex * PHOTOS_PER_ROW,
          },
        }));

        return {
          room,
          items: [...textItems, ...photoItems] as Array<{
            kind: "text" | "photo-row";
            height: number;
            payload: RoomPdfItem;
          }>,
        };
      });
      const roomPdfPages = packRoomContentPages(roomLayoutInputs);
      const roomPagesHtml = roomPdfPages.map((_, pageIndex) => `<div data-pdf-kind="room" data-room-page-index="${pageIndex}" style="width: 210mm; height: 297mm; page-break-before: always;"></div>`).join("");
      const termsPagesHtml = splitIntoChunks(
        infoGeralItems as Array<{ id?: string | number; titulo?: string; conteudo?: string }>,
        CONDITIONS_PER_PAGE
      ).map((terms, pageIndex) => `
        <div style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden; page-break-before: always;">
          <div style="position: absolute; inset: 0; z-index: 0; pointer-events: none;"><img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" /></div>
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 4.6cm 2cm 2.2cm 3cm; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #004777; padding-bottom: 6px; margin: 0 0 9px;"><span style="display: block; font-size: 7px; color: #708D81; font-weight: bold; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 2px;">Complemento do laudo</span><h2 style="font-size: 15px; color: #004777; margin: 0;">Condições gerais</h2></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px 9px; align-content: start;">${terms.map((item: any) => `<section style="border: 1px solid #EEEEF3; border-radius: 5px; padding: 7px; background: #ffffff;"><h3 style="font-size: 7px; color: #004777; text-transform: uppercase; margin: 0 0 3px; line-height: 1.2;">${escapeHtml(item.titulo || "Condição geral")}</h3><p style="font-size: 7px; line-height: 1.3; color: #333; margin: 0; text-align: justify; overflow-wrap: anywhere;">${escapeHtml(item.conteudo || "Não informado")}</p></section>`).join("")}</div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #EEEEF3; padding-top: 6px; margin-top: auto; font-size: 8px; color: #888; font-weight: bold;"><span>Laudo de Vistoria Técnica | Código: ${escapeHtml(vistoria.codigo)}</span><span>Condições ${pageIndex + 1}</span></div>
          </div>
        </div>`).join("");
      const attachmentPagesHtml = splitIntoChunks(preparedAttachments, 4).map((attachmentsPage, pageIndex) => `
        <div style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden; page-break-before: always;">
          <div style="position: absolute; inset: 0; z-index: 0; pointer-events: none;"><img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" /></div>
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 4.6cm 2cm 2.2cm 3cm; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #004777; padding-bottom: 7px; margin-bottom: 12px;"><span style="display: block; font-size: 8px; color: #708D81; font-weight: bold; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px;">Anexos</span><h2 style="font-size: 16px; color: #004777; margin: 0;">Documentos complementares</h2></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-content: start;">${attachmentsPage.map((attachment: any) => `<section style="border: 1px solid #EEEEF3; border-radius: 6px; padding: 6px; background: #fafafa;">${attachment.mimeType.startsWith("image/") ? `<img src="${escapeHtml(attachment.pdfUrl)}" alt="${escapeHtml(attachment.name)}" style="display: block; width: 100%; height: 145px; object-fit: cover; border-radius: 4px; background: #eee; margin-bottom: 6px;" />` : ""}<h3 style="font-size: 8px; color: #004777; margin: 0 0 4px; overflow-wrap: anywhere;">${escapeHtml(attachment.name)}</h3>${attachment.description ? `<p style="font-size: 8px; line-height: 1.4; color: #555; margin: 0; text-align: justify;">${escapeHtml(attachment.description)}</p>` : ""}</section>`).join("")}</div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #EEEEF3; padding-top: 6px; margin-top: auto; font-size: 8px; color: #888; font-weight: bold;"><span>Laudo de Vistoria Técnica | Código: ${escapeHtml(vistoria.codigo)}</span><span>Anexos ${pageIndex + 1}</span></div>
          </div>
        </div>`).join("");
      const finalTermPageHtml = `
        <div data-pdf-kind="closing" style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background: #fff; overflow: hidden; page-break-before: always;">
          <div style="position: absolute; inset: 0; z-index: 0; pointer-events: none;"><img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" /></div>
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 4.6cm 2cm 2.2cm 3cm; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #004777; padding-bottom: 7px; margin-bottom: 16px;">
              <span style="display: block; font-size: 8px; color: #708D81; font-weight: bold; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px;">Encerramento</span>
              <h2 style="font-size: 16px; color: #004777; margin: 0;">Termo final da vistoria</h2>
            </div>
            <div style="border: 1px solid #EEEEF3; border-radius: 6px; padding: 14px; background: #fafafa;">
              ${finalTerm.map((paragraph) => `<p style="font-size: 10px; line-height: 1.5; color: #280003; margin: 0 0 12px; text-align: justify;">${escapeHtml(paragraph)}</p>`).join("")}
            </div>
            <div style="margin-top: auto; margin-bottom: 48px;">
              <h3 style="font-size: 12px; color: #004777; border-bottom: 1px solid #004777; padding-bottom: 5px; margin: 0 0 55px;">Assinaturas</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 34px;">
                <div style="text-align: center; border-top: 1px solid #777; padding-top: 7px;">
                  <strong style="display: block; font-size: 10px; color: #280003;">${escapeHtml(tenantName)}</strong>
                  <span style="display: block; font-size: 8px; color: #555; margin-top: 3px;">${escapeHtml(tenantDocument)}</span>
                  <span style="display: block; font-size: 8px; color: #004777; text-transform: uppercase; font-weight: bold; margin-top: 6px;">Locatário</span>
                </div>
                <div style="text-align: center; border-top: 1px solid #777; padding-top: 7px;">
                  <strong style="display: block; font-size: 10px; color: #280003;">${escapeHtml(realEstateName)}</strong>
                  <span style="display: block; font-size: 8px; color: #555; margin-top: 3px;">${escapeHtml(realEstateDocument)}</span>
                  <span style="display: block; font-size: 8px; color: #004777; text-transform: uppercase; font-weight: bold; margin-top: 6px;">Imobiliária / Administradora</span>
                </div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #EEEEF3; padding-top: 6px; margin-top: auto; font-size: 8px; color: #888; font-weight: bold;">
              <span>Laudo de Vistoria Técnica | Código: ${escapeHtml(vistoria.codigo)}</span>
              <span>Termo final</span>
            </div>
          </div>
        </div>`;
      const roomsP2: any[] = [];
      const roomsP3: any[] = [];
      const photosPerPage = 12;
      const photoChunks: any[][] = [];
      const photoPagesHtml = "";
      /* Legacy photo-page layout kept out of the generated document. */
      /*
      const unusedPhotoPagesHtml = photoChunks.map((photos, pageIndex) => `
        <div data-pdf-kind="photo" data-photo-page-index="${pageIndex}" style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden; page-break-before: always;">
          <div style="position: absolute; inset: 0; z-index: 0; pointer-events: none;">
            <img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" />
          </div>
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 4.6cm 2cm 2.2cm 3cm; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #004777; padding-bottom: 6px; margin-bottom: 12px;">
              <h2 style="font-size: 12px; color: #004777; text-transform: uppercase; margin: 0;">Registro Fotográfico</h2>
              <span style="font-size: 9px; color: #888; font-weight: bold;">Código: ${escapeHtml(vistoria.codigo)}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; flex: 1; align-content: start;">
              ${photos.map((photo) => `
                <div style="border: 1px solid #EEEEF3; border-radius: 5px; padding: 4px; background: #fafafa; break-inside: avoid; overflow: hidden;">
                  <img src="${escapeHtml(photo.pdfUrl)}" alt="Foto de ${escapeHtml(photo.roomName)}" style="display: block; width: 100%; height: 128px; object-fit: cover; border-radius: 3px; background: #eee;" />
                  <strong style="display: block; color: #004777; font-size: 7px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(photo.roomName)}</strong>
                  ${photo.description ? `<p style="font-size: 6px; line-height: 1.2; color: #555; margin: 1px 0 0; height: 15px; overflow: hidden;">${escapeHtml(photo.description)}</p>` : ""}
                </div>
              `).join("")}
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #EEEEF3; padding-top: 6px; font-size: 8px; color: #888; font-weight: bold;">
              <span>Laudo de Vistoria Técnica | Registro fotográfico</span>
              <span>Fotos ${pageIndex * photosPerPage + 1}–${pageIndex * photosPerPage + photos.length}</span>
            </div>
          </div>
        </div>
      `).join("");
      */

      // Build the temporary container for PDF generation
      const tempDiv = document.createElement("div");
      tempDiv.style.width = "210mm";
      tempDiv.style.backgroundColor = "#ffffff";
      tempDiv.innerHTML = `
        <!-- PAGE 1 -->
        <div data-pdf-kind="opening" style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden;">
          <!-- Background Frame -->
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;">
            <img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" />
          </div>
          
          <!-- Content -->
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 4.6cm 2cm 2.2cm 3cm; box-sizing: border-box;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #004777; padding-bottom: 8px; margin-bottom: 15px;">
              <div style="width: 150px;"></div> <!-- Spacer for background logo -->
              <div style="text-align: center; flex: 1;">
                <h1 style="font-size: 15px; font-weight: 800; color: #004777; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Laudo de Vistoria Técnica</h1>
                <p style="font-size: 9px; color: #666; margin: 2px 0 0 0; font-weight: bold;">Código: <span style="color: #280003;">${vistoria.codigo}</span></p>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px; width: 120px;">
                <img src="${qrCodeUrl}" alt="QR Code" crossorigin="anonymous" style="height: 42px; width: 42px; border: 1px solid #EEEEF3; padding: 2px; border-radius: 4px; background-color: #fff;" />
                <span style="font-size: 6px; color: #888; font-weight: bold; text-transform: uppercase; text-align: right; line-height: 1.1;">Acesse a vistoria online</span>
              </div>
            </div>

            <!-- Info Cards -->
            <div style="display: flex; gap: 12px; margin-bottom: 12px;">
              <div style="flex: 1; border: 1px solid #EEEEF3; border-radius: 6px; padding: 10px; background-color: #ffffff;">
                <h2 style="font-size: 9px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #EEEEF3; padding-bottom: 4px; margin-top: 0; margin-bottom: 6px;">Dados da Vistoria</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600; width: 40%;">TIPO:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${vistoria.tipo}</td>
                  </tr>
                  ${contractCode ? `<tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">CONTRATO:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${escapeHtml(contractCode)}</td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">DATA:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${vistoria.dataVistoria || "Não definida"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">VISTORIADOR:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${vistoriadorFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">LOCATÁRIO:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${escapeHtml(tenantName)}</td>
                  </tr>
                </table>
              </div>
              <div style="flex: 1; border: 1px solid #EEEEF3; border-radius: 6px; padding: 10px; background-color: #ffffff;">
                <h2 style="font-size: 9px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #EEEEF3; padding-bottom: 4px; margin-top: 0; margin-bottom: 6px;">Dados do Imóvel</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600; width: 35%;">CÓDIGO:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${vistoria.imovelCodigo}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">TIPO IMÓVEL:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${vistoria.tipoImovel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">PROPRIETÁRIO:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${vistoria.proprietario}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600; vertical-align: top;">ENDEREÇO:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold; font-size: 9px; line-height: 1.2;">${vistoria.endereco}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Termo de vistoria -->
            <div style="border: 1px solid #EEEEF3; border-radius: 6px; padding: 9px; margin-bottom: 9px; background-color: #fafafa;">
              <h2 style="font-size: 9px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #d9dee4; padding-bottom: 4px; margin: 0 0 6px;">Termo da Vistoria</h2>
              ${inspectionTerm.map((paragraph) => `<p style="font-size: 7.4px; line-height: 1.3; color: #280003; margin: 0 0 5px; text-align: justify;">${escapeHtml(paragraph)}</p>`).join("")}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
              <div style="border-top: 1px solid #004777; padding-top: 5px;">
                <strong style="display: block; color: #004777; font-size: 8px; text-transform: uppercase; margin-bottom: 3px;">Chaves</strong>
                <span style="font-size: 8px; color: #333;">${dbData.chavesQuantidade || dbData.chavesObservacao
                  ? `${dbData.chavesQuantidade || 0} chave(s)${dbData.chavesObservacao ? ` — ${escapeHtml(dbData.chavesObservacao)}` : ""}`
                  : "Nenhuma chave registrada"}</span>
              </div>
              <div style="border-top: 1px solid #004777; padding-top: 5px;">
                <strong style="display: block; color: #004777; font-size: 8px; text-transform: uppercase; margin-bottom: 3px;">Medidores</strong>
                <span style="display: block; font-size: 8px; color: #333;">Água: ${escapeHtml([dbData.medidorAguaNumero, dbData.medidorAguaLeitura].filter(Boolean).join(" — ") || "não informado")}</span>
                <span style="display: block; font-size: 8px; color: #333; margin-top: 2px;">Energia: ${escapeHtml([dbData.medidorLuzNumero, dbData.medidorLuzLeitura].filter(Boolean).join(" — ") || "não informado")}</span>
              </div>
            </div>

            <!-- Footer indicator -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #EEEEF3; padding-top: 6px; margin-top: auto; font-size: 8px; color: #888; font-weight: bold;">
              <span>Laudo de Vistoria Técnica | Código: ${vistoria.codigo}</span>
              <span>Página 1 de 3</span>
            </div>
          </div>
        </div>

        <!-- PAGE 2 -->
        <div data-pdf-skip="true" style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden; page-break-before: always;">
          <!-- Background Frame -->
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;">
            <img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" />
          </div>
          <!-- Content -->
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 3.5cm 2cm 2cm 3cm; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #EEEEF3; padding-bottom: 6px; margin-bottom: 12px;">
              <span style="font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase;">Laudo de Vistoria Técnica</span>
              <span style="font-size: 9px; color: #888; font-weight: bold;">Código: ${vistoria.codigo}</span>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
              <h2 style="font-size: 10px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #EEEEF3; padding-bottom: 2px; margin-bottom: 4px; margin-top: 0;">Estado dos Ambientes (Continuação)</h2>
              ${roomsP2.length > 0 ? roomsP2.map((room: any) => `
                <div style="background-color: #fafafa; border: 1px solid #EEEEF3; border-radius: 4px; padding: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #EEEEF3; padding-bottom: 2px; margin-bottom: 4px;">
                    <strong style="font-size: 10px; color: #280003;">${room.name}</strong>
                    <span style="font-size: 8px; background-color: #EEEEF3; padding: 1px 3px; border-radius: 2px; font-weight: 600; color: #555;">${room.type}</span>
                  </div>
                  <div style="display: flex; gap: 10px; font-size: 9px;">
                    <div style="flex: 1;">
                      <span style="color: #777; font-weight: 600; display: block; margin-bottom: 1px; text-transform: uppercase; font-size: 7px;">Visão Geral</span>
                      <div style="padding: 3px; background-color: #fff; border: 1px solid #EEEEF3; border-radius: 2px; color: #333; min-height: 16px;">
                        ${room.visaoGeral || '<span style="color: #999; font-style: italic;">Não informado</span>'}
                      </div>
                    </div>
                    <div style="flex: 1;">
                      <span style="color: #777; font-weight: 600; display: block; margin-bottom: 1px; text-transform: uppercase; font-size: 7px;">Comentários</span>
                      <div style="padding: 3px; background-color: #fff; border: 1px solid #EEEEF3; border-radius: 2px; color: #333; min-height: 16px;">
                        ${room.comentarios || '<span style="color: #999; font-style: italic;">Não informado</span>'}
                      </div>
                    </div>
                  </div>
                </div>
              `).join('') : '<p style="font-size: 10px; color: #777; font-style: italic;">Nenhum cômodo adicional.</p>'}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #EEEEF3; padding-top: 6px; margin-top: auto; font-size: 8px; color: #888; font-weight: bold;">
              <span>Laudo de Vistoria Técnica | Código: ${vistoria.codigo}</span>
              <span>Página 2 de 3</span>
            </div>
          </div>
        </div>

        <!-- PAGE 3 -->
        <div data-pdf-skip="true" style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden; page-break-before: always;">
          <!-- Background Frame -->
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;">
            <img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" />
          </div>
          <!-- Content -->
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 3.5cm 2cm 2cm 3cm; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #EEEEF3; padding-bottom: 6px; margin-bottom: 12px;">
              <span style="font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase;">Laudo de Vistoria Técnica</span>
              <span style="font-size: 9px; color: #888; font-weight: bold;">Código: ${vistoria.codigo}</span>
            </div>

            <!-- Rooms P3 if any -->
            ${roomsP3.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                ${roomsP3.map((room: any) => `
                  <div style="background-color: #fafafa; border: 1px solid #EEEEF3; border-radius: 4px; padding: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #EEEEF3; padding-bottom: 2px; margin-bottom: 4px;">
                      <strong style="font-size: 10px; color: #280003;">${room.name}</strong>
                      <span style="font-size: 8px; background-color: #EEEEF3; padding: 1px 3px; border-radius: 2px; font-weight: 600; color: #555;">${room.type}</span>
                    </div>
                    <div style="display: flex; gap: 10px; font-size: 9px;">
                      <div style="flex: 1;">
                        <span style="color: #777; font-weight: 600; display: block; margin-bottom: 1px; text-transform: uppercase; font-size: 7px;">Visão Geral</span>
                        <div style="padding: 3px; background-color: #fff; border: 1px solid #EEEEF3; border-radius: 2px; color: #333; min-height: 16px;">
                          ${room.visaoGeral || '<span style="color: #999; font-style: italic;">Não informado</span>'}
                        </div>
                      </div>
                      <div style="flex: 1;">
                        <span style="color: #777; font-weight: 600; display: block; margin-bottom: 1px; text-transform: uppercase; font-size: 7px;">Comentários</span>
                        <div style="padding: 3px; background-color: #fff; border: 1px solid #EEEEF3; border-radius: 2px; color: #333; min-height: 16px;">
                          ${room.comentarios || '<span style="color: #999; font-style: italic;">Não informado</span>'}
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Termos Gerais -->
            ${infoGeralItems.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <h2 style="font-size: 10px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #EEEEF3; padding-bottom: 2px; margin-bottom: 6px; margin-top: 0;">Termos e Condições Gerais</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 8px; line-height: 1.3;">
                  ${infoGeralItems.map((item: any) => `
                    <div style="padding: 5px; background-color: #fafafa; border: 1px solid #EEEEF3; border-radius: 4px;">
                      <strong style="display: block; color: #004777; text-transform: uppercase; font-size: 7px; margin-bottom: 1px;">${escapeHtml(item.titulo || "")}</strong>
                      <p style="margin: 0; color: #333;">${escapeHtml(item.conteudo || "")}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${preparedAttachments.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <h2 style="font-size: 10px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #EEEEF3; padding-bottom: 2px; margin-bottom: 6px; margin-top: 0;">Documentos e Fotos</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 8px; line-height: 1.3;">
                  ${preparedAttachments.map((attachment) => `
                    <div style="padding: 5px; background-color: #fafafa; border: 1px solid #EEEEF3; border-radius: 4px;">
                      ${attachment.mimeType.startsWith("image/") ? `<img src="${escapeHtml(attachment.pdfUrl)}" alt="${escapeHtml(attachment.name)}" style="display: block; width: 100%; height: 80px; object-fit: cover; border-radius: 3px; margin-bottom: 4px;" />` : ""}
                      <strong style="display: block; color: #004777; font-size: 7px; margin-bottom: 1px;">${escapeHtml(attachment.name)}</strong>
                      ${attachment.description ? `<p style="margin: 0; color: #333;">${escapeHtml(attachment.description)}</p>` : ""}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Assinaturas (Removido Inquilino conforme feedback) -->
            <div style="margin-top: auto; border-top: 1px solid #EEEEF3; padding-top: 12px;">
              <div style="display: flex; justify-content: space-around; gap: 32px; font-size: 9px;">
                <div style="flex: 1; max-width: 250px; text-align: center;">
                  <div style="border-top: 1px solid #999; margin-top: 40px; padding-top: 4px;">
                    <strong style="color: #280003; display: block;">${vistoria.proprietario}</strong>
                    <span style="color: #666; font-size: 8px; text-transform: uppercase;">Proprietário</span>
                  </div>
                </div>
                <div style="flex: 1; max-width: 250px; text-align: center;">
                  <div style="border-top: 1px solid #999; margin-top: 40px; padding-top: 4px;">
                    <strong style="color: #280003; display: block;">${vistoriadorFormatted}</strong>
                    <span style="color: #666; font-size: 8px; text-transform: uppercase;">Vistoriador / Corretor Responsável</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #EEEEF3; padding-top: 6px; margin-top: 10px; font-size: 8px; color: #888; font-weight: bold;">
              <span>Laudo de Vistoria Técnica | Código: ${vistoria.codigo}</span>
              <span>Página 3</span>
            </div>
          </div>
        </div>
        ${roomPagesHtml}${termsPagesHtml}${attachmentPagesHtml}${photoPagesHtml}${finalTermPageHtml}
      `;

      const wrapper = document.createElement("div");
      wrapper.setAttribute("aria-hidden", "true");
      wrapper.style.position = "absolute";
      wrapper.style.top = "0";
      wrapper.style.left = "-10000px";
      wrapper.style.width = "210mm";
      wrapper.style.height = "auto";
      wrapper.style.overflow = "visible";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.pointerEvents = "none";
      wrapper.appendChild(tempDiv);
      document.body.appendChild(wrapper);

      try {
        // Descarta os antigos layouts fixos antes de carregar imagens ou renderizar páginas.
        // Assim, imagens dos blocos substituídos não consomem rede, memória ou tempo de decodificação.
        tempDiv.querySelectorAll<HTMLElement>('[data-pdf-skip="true"]').forEach((page) => page.remove());
        const pages = Array.from(tempDiv.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement
        );
        if (pages.length === 0) {
          throw new Error("Nenhuma página foi montada para o PDF.");
        }

        // Espera somente pelas imagens que realmente entrarão no documento final.
        const images = pages.flatMap((page) => Array.from(page.getElementsByTagName("img")));
        await withTimeout(
          Promise.all(images.map((image) => waitForImage(image))),
          10000,
          "preparar as imagens do relatório"
        );
        await new Promise((resolve) => setTimeout(resolve, 300));

        const pdf = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
        });

        const renderingStartedAt = Date.now();
        for (let index = 0; index < pages.length; index += 1) {
          const pageKind = pages[index].dataset.pdfKind;
          const isPhotoPage = pages[index].dataset.pdfKind === "photo";
          const isRoomPage = pages[index].dataset.pdfKind === "room";
          if (index > 0) pdf.addPage("a4", "portrait");

          if (pageKind === "opening") {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, 210, 297, "F");
            pdf.setDrawColor(0, 71, 119);
            pdf.setLineWidth(0.6);
            pdf.line(22, 35, 188, 35);
            pdf.setTextColor(0, 71, 119);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(15);
            pdf.text("TERMO DE VISTORIA", 22, 29);
            pdf.setFontSize(8);
            pdf.text(`Código: ${vistoria.codigo}`, 188, 29, { align: "right" });

            const drawInfo = (label: string, value: string, x: number, y: number, width: number) => {
              pdf.setFillColor(247, 248, 249);
              pdf.roundedRect(x, y, width, 13, 1.5, 1.5, "F");
              pdf.setTextColor(120, 120, 120);
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(6.5);
              pdf.text(label.toUpperCase(), x + 3, y + 4);
              pdf.setTextColor(40, 40, 40);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(8);
              pdf.text(pdf.splitTextToSize(value, width - 6), x + 3, y + 9);
            };
            drawInfo("Tipo de vistoria", vistoria.tipo, 22, 42, 52);
            drawInfo("Tipo de imóvel", vistoria.tipoImovel, 78, 42, 52);
            drawInfo("Data", vistoria.dataVistoria || "Não definida", 134, 42, 54);
            drawInfo("Locatário", tenantName, 22, 59, 80);
            drawInfo("Vistoriador", vistoriadorFormatted, 106, 59, 82);
            if (contractCode) drawInfo("Código do contrato", contractCode, 22, 76, 52);
            drawInfo("Imóvel", vistoria.endereco, contractCode ? 78 : 22, 76, contractCode ? 110 : 166);

            let termY = 98;
            pdf.setTextColor(0, 71, 119);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.text("TERMO DA VISTORIA", 22, termY);
            pdf.setDrawColor(210, 217, 223);
            pdf.line(22, termY + 3, 188, termY + 3);
            termY += 10;
            pdf.setTextColor(40, 40, 40);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            inspectionTerm.forEach((paragraph) => {
              const lines = pdf.splitTextToSize(paragraph, 166);
              pdf.text(lines, 22, termY, { lineHeightFactor: 1.3, align: "justify", maxWidth: 166 });
              termY += lines.length * 3.5 + 4;
            });

            const detailsY = Math.min(Math.max(termY + 2, 220), 251);
            pdf.setDrawColor(0, 71, 119);
            pdf.line(22, detailsY, 102, detailsY);
            pdf.line(108, detailsY, 188, detailsY);
            pdf.setTextColor(0, 71, 119);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            pdf.text("CHAVES", 22, detailsY + 6);
            pdf.text("MEDIDORES", 108, detailsY + 6);
            pdf.setTextColor(50, 50, 50);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7.5);
            const keysText = dbData.chavesQuantidade || dbData.chavesObservacao
              ? `${dbData.chavesQuantidade || 0} chave(s)${dbData.chavesObservacao ? ` — ${dbData.chavesObservacao}` : ""}`
              : "Nenhuma chave registrada";
            pdf.text(pdf.splitTextToSize(keysText, 80), 22, detailsY + 12);
            pdf.text(`Água: ${[dbData.medidorAguaNumero, dbData.medidorAguaLeitura].filter(Boolean).join(" — ") || "não informado"}`, 108, detailsY + 12);
            pdf.text(`Energia: ${[dbData.medidorLuzNumero, dbData.medidorLuzLeitura].filter(Boolean).join(" — ") || "não informado"}`, 108, detailsY + 17);

            pdf.setDrawColor(220, 225, 230);
            pdf.line(22, 282, 188, 282);
            pdf.setTextColor(110, 110, 110);
            pdf.setFontSize(7);
            pdf.text(`${realEstateName} | ${vistoria.codigo}`, 22, 287);
            pdf.text("Termo inicial", 188, 287, { align: "right" });
            pages[index].remove();
            continue;
          }

          if (pageKind === "closing") {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, 210, 297, "F");
            pdf.setDrawColor(0, 71, 119);
            pdf.setLineWidth(0.6);
            pdf.line(22, 35, 188, 35);
            pdf.setTextColor(0, 71, 119);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(15);
            pdf.text("TERMO FINAL DA VISTORIA", 22, 29);
            let finalY = 52;
            pdf.setTextColor(40, 40, 40);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            finalTerm.forEach((paragraph) => {
              const paragraphWithEmail = paragraph.includes("administração do imóvel") && realEstate?.emailContato
                ? `${paragraph} E-mail: ${realEstate.emailContato}.`
                : paragraph;
              const lines = pdf.splitTextToSize(paragraphWithEmail, 166);
              pdf.text(lines, 22, finalY, { lineHeightFactor: 1.4, align: "justify", maxWidth: 166 });
              finalY += lines.length * 4.1 + 7;
            });

            const signatureTitleY = 216;
            const signatureLineY = 244;
            pdf.setTextColor(0, 71, 119);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.text("ASSINATURAS", 22, signatureTitleY);
            pdf.setDrawColor(120, 120, 120);
            pdf.line(28, signatureLineY, 96, signatureLineY);
            pdf.line(114, signatureLineY, 182, signatureLineY);
            pdf.setTextColor(40, 40, 40);
            pdf.setFontSize(9);
            pdf.text(tenantName, 62, signatureLineY + 7, { align: "center" });
            pdf.text(realEstateName, 148, signatureLineY + 7, { align: "center" });
            pdf.setTextColor(90, 90, 90);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7.5);
            pdf.text(tenantDocument, 62, signatureLineY + 12, { align: "center" });
            pdf.text(realEstateDocument, 148, signatureLineY + 12, { align: "center" });
            pdf.setTextColor(0, 71, 119);
            pdf.setFont("helvetica", "bold");
            pdf.text("LOCATÁRIO", 62, signatureLineY + 19, { align: "center" });
            pdf.text("IMOBILIÁRIA / ADMINISTRADORA", 148, signatureLineY + 19, { align: "center" });

            pdf.setDrawColor(220, 225, 230);
            pdf.line(22, 282, 188, 282);
            pdf.setTextColor(110, 110, 110);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7);
            pdf.text(`${realEstateName} | ${vistoria.codigo}`, 22, 287);
            pdf.text("Termo final", 188, 287, { align: "right" });
            pages[index].remove();
            continue;
          }

          if (isRoomPage) {
            const roomPageIndex = Number(pages[index].dataset.roomPageIndex || 0);
            const roomPage: any = roomPdfPages[roomPageIndex];
            if (!roomPage) throw new Error("Não foi possível localizar os dados do ambiente para o PDF.");

            const writeParagraph = (label: string, value: string, y: number) => {
              pdf.setTextColor(0, 71, 119);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(8);
              pdf.text(label.toUpperCase(), 28, y);
              pdf.setTextColor(51, 51, 51);
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(8.5);
              const lines = pdf.splitTextToSize(value || "Não informado", 162);
              pdf.text(lines, 28, y + 5, { lineHeightFactor: 1.35 });
              return y + 8 + lines.length * 3.8;
            };

            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, 210, 297, "F");
            let contentY = 24;
            for (const [sectionIndex, section] of roomPage.sections.entries()) {
              if (sectionIndex > 0) contentY += ROOM_SECTION_GAP;

              pdf.setDrawColor(0, 71, 119);
              pdf.setLineWidth(0.6);
              pdf.line(28, contentY + 16, 190, contentY + 16);
              pdf.setTextColor(112, 141, 129);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(7);
              pdf.text(
                `ESTADO DO AMBIENTE${section.continuation ? " — CONTINUAÇÃO" : ""}`,
                28,
                contentY + 4
              );
              pdf.setTextColor(0, 71, 119);
              pdf.setFontSize(13);
              pdf.text(String(section.room.name), 28, contentY + 11);
              pdf.setTextColor(85, 85, 85);
              pdf.setFontSize(7);
              pdf.text(String(section.room.type || "Ambiente"), 190, contentY + 11, { align: "right" });
              contentY += ROOM_HEADER_HEIGHT;

              let hasPhotoHeading = false;
              for (const item of section.items) {
                const payload = item.payload as RoomPdfItem;
                if (payload.type === "text") {
                  contentY = writeParagraph(
                    `${payload.label}${payload.continuation ? " (continuação)" : ""}`,
                    payload.text,
                    contentY
                  );
                  continue;
                }

                if (!hasPhotoHeading) {
                  pdf.setTextColor(0, 71, 119);
                  pdf.setFont("helvetica", "bold");
                  pdf.setFontSize(8);
                  pdf.text(
                    `REGISTRO FOTOGRÁFICO${payload.photoStartIndex > 0 ? " — CONTINUAÇÃO" : ""}`,
                    28,
                    contentY
                  );
                  contentY += PHOTO_HEADING_HEIGHT;
                  hasPhotoHeading = true;
                }

                const loadedPhotos = await Promise.allSettled(
                  payload.photos.map((photo: any) => loadPdfImage(photo.pdfUrl))
                );
                const grid = getAdaptivePhotoGrid(
                  payload.photos.length,
                  162,
                  PHOTO_CARD_HEIGHT,
                  PHOTO_GRID_GAP
                );
                const captionHeight = 4;
                loadedPhotos.forEach((result, photoIndex) => {
                  if (result.status !== "fulfilled") return;
                  const image = result.value;
                  const cellX = 28 + photoIndex * (grid.cellWidth + PHOTO_GRID_GAP);
                  const imageAreaHeight = Math.max(1, grid.cellHeight - captionHeight);
                  const fitted = fitImageInside(
                    image.naturalWidth || image.width,
                    image.naturalHeight || image.height,
                    grid.cellWidth,
                    imageAreaHeight
                  );

                  pdf.setFillColor(247, 248, 249);
                  pdf.roundedRect(cellX, contentY, grid.cellWidth, imageAreaHeight, 1.5, 1.5, "F");
                  pdf.addImage(
                    image,
                    "JPEG",
                    cellX + fitted.offsetX,
                    contentY + fitted.offsetY,
                    fitted.width,
                    fitted.height,
                    undefined,
                    "FAST"
                  );
                  pdf.setTextColor(85, 85, 85);
                  pdf.setFont("helvetica", "normal");
                  pdf.setFontSize(6.5);
                  pdf.text(
                    `Foto ${payload.photoStartIndex + photoIndex + 1}`,
                    cellX,
                    contentY + grid.cellHeight - 1
                  );
                });
                contentY += PHOTO_CARD_HEIGHT + PHOTO_GRID_GAP;
              }
            }

            pdf.setDrawColor(220, 225, 230);
            pdf.line(28, 282, 190, 282);
            pdf.setTextColor(110, 110, 110);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7);
            pdf.text(`Laudo de Vistoria Técnica | Código: ${vistoria.codigo}`, 28, 287);
            pdf.text(`Página ${roomPageIndex + 2}`, 190, 287, { align: "right" });
            pages[index].remove();
            continue;
          }

          if (isPhotoPage) {
            const photoPageIndex = Number(pages[index].dataset.photoPageIndex || 0);
            const photos = photoChunks[photoPageIndex] || [];
            const loadedImages = await Promise.all(
              photos.map((photo) => loadPdfImage(photo.pdfUrl))
            );

            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, 210, 297, "F");
            pdf.setDrawColor(0, 71, 119);
            pdf.setLineWidth(0.6);
            pdf.line(28, 35, 190, 35);
            pdf.setTextColor(0, 71, 119);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.text("REGISTRO FOTOGRÁFICO", 28, 30);
            pdf.setFontSize(8);
            pdf.text(`Código: ${vistoria.codigo}`, 190, 30, { align: "right" });

            loadedImages.forEach((image, photoIndex) => {
              const column = photoIndex % 3;
              const row = Math.floor(photoIndex / 3);
              const x = 28 + column * 54;
              const y = 42 + row * 57;
              pdf.addImage(image, "JPEG", x, y, 50, 42, undefined, "FAST");
              pdf.setTextColor(0, 71, 119);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(7);
              pdf.text(
                String(photos[photoIndex].roomName || "Ambiente").slice(0, 34),
                x,
                y + 46
              );
            });

            pdf.setDrawColor(220, 225, 230);
            pdf.line(28, 282, 190, 282);
            pdf.setTextColor(110, 110, 110);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7);
            pdf.text("Laudo de Vistoria Técnica | Registro fotográfico", 28, 287);
            pdf.text(
              `Fotos ${photoPageIndex * photosPerPage + 1}–${photoPageIndex * photosPerPage + photos.length}`,
              190,
              287,
              { align: "right" }
            );
            pages[index].remove();
            continue;
          }

          const canvas = await withTimeout(
            html2canvas(pages[index], {
              scale: 1.4,
              useCORS: true,
              allowTaint: false,
              logging: false,
              backgroundColor: "#ffffff",
              imageTimeout: 8000,
              removeContainer: true,
            }),
            30000,
            `renderizar a página ${index + 1} de ${pages.length}`
          );

          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            throw new Error(`Não foi possível capturar a página ${index + 1}.`);
          }
          let hasVisibleContent = false;
          for (let y = 1; y < 12 && !hasVisibleContent; y += 1) {
            for (let x = 1; x < 8; x += 1) {
              const sample = context.getImageData(
                Math.floor((canvas.width * x) / 8),
                Math.floor((canvas.height * y) / 12),
                1,
                1
              ).data;
              if (sample[3] > 0 && (sample[0] < 248 || sample[1] < 248 || sample[2] < 248)) {
                hasVisibleContent = true;
                break;
              }
            }
          }
          if (!hasVisibleContent) {
            throw new Error(`A captura da página ${index + 1} ficou em branco.`);
          }

          pdf.addImage(
            canvas.toDataURL("image/jpeg", 0.82),
            "JPEG",
            0,
            0,
            210,
            297,
            undefined,
            "FAST"
          );
          // Evita que o html2canvas clone novamente todas as páginas já processadas.
          pages[index].remove();
        }

        pdf.save(`Relatorio_Vistoria_${vistoria.codigo}.pdf`);
        console.info("[PDF] Relatório concluído", {
          pages: pages.length,
          renderingElapsedMs: Date.now() - renderingStartedAt,
          elapsedMs: Date.now() - generationStartedAt,
        });
      } finally {
        wrapper.remove();
      }
    } catch (error) {
      console.error("Erro ao gerar relatório em PDF:", error);
      alert(error instanceof Error
        ? `Não foi possível gerar o PDF. ${error.message}`
        : "Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      preparedObjectUrls.forEach((url) => URL.revokeObjectURL(url));
      setIsGenerating(false);
    }
  };

  if (pdfButtonOnly) {
    return (
      <button
        onClick={handleGeneratePDF}
        disabled={isGenerating}
        className={pdfButtonClassName || "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-slate-200 disabled:opacity-50"}
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin text-[#004777]" /> : <Download className="h-4 w-4 text-[#004777]" />}
        <span>{isGenerating ? "Gerando PDF..." : "Gerar PDF Oficial"}</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EEEEF3] p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-300">
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#004777]" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEEEF3] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Código da Vistoria</span>
          </div>
          <h3 className="text-xl font-bold text-[#280003] flex items-center gap-2">
            {vistoria.codigo}
            <button
              onClick={() => navigator.clipboard.writeText(vistoria.codigo)}
              className="text-gray-400 hover:text-[#004777] p-1 rounded hover:bg-[#EEEEF3] transition-colors"
              title="Copiar código"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
            </button>
          </h3>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              statusBadgeClasses[vistoria.status] || "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
            {vistoria.statusLabel}
          </span>
        </div>
      </div>

      {/* Section 1: Informações da Vistoria */}
      <div>
        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-widest mb-4 flex items-center gap-2">
          <span>Informações da Vistoria</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Tipo
            </span>
            <span className="text-sm font-semibold text-[#280003] bg-[#EEEEF3] px-2 py-1 rounded">
              {vistoria.tipo}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Solicitada por
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.solicitadaPor}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Data de Solicitação
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.dataSolicitacao}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Data Vistoria
            </span>
            <span className="text-sm font-bold text-[#280003] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              {vistoria.dataVistoria || "Não definida"}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Vistoriador Designado
            </span>
            <span className="text-sm font-bold text-[#280003] flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              {vistoria.vistoriador}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#EEEEF3]" />

      {/* Section 2: Dados do Imóvel */}
      <div>
        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-widest mb-4">
          Dados do Imóvel
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Cód. Imóvel
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.imovelCodigo}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Tipo do Imóvel
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.tipoImovel}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Proprietário
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.proprietario}</span>
          </div>
          <div className="md:col-span-3">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Endereço
            </span>
            <span className="text-sm font-bold text-[#280003] flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span>{vistoria.endereco}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#EEEEF3] mt-2" />

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 mt-2">
        {["concluida", "contestada", "aguardando_aprovacao"].includes(vistoria.status) && (
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[#EEEEF3] text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#004777]" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#004777]" />
                <span>Gerar PDF</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={() => onViewFullReport?.(vistoria.id)}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#004777] text-white text-sm font-semibold hover:bg-[#00365a] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group"
        >
          <span>Informações da Vistoria</span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
