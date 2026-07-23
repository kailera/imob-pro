"use client";

import React, { useState } from "react";
import { ClipboardCopy, MapPin, User, Calendar, ClipboardCheck, ArrowUpRight, Download, Loader2 } from "lucide-react";
import { getVistoriaById } from "@/app/(admin)/vistorias/actions";

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

export function VistoriaDetails({ vistoria, onViewFullReport, pdfButtonOnly = false, pdfButtonClassName }: VistoriaDetailsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      // 1. Carrega dados completos da vistoria diretamente do Banco de Dados
      const res = await getVistoriaById(vistoria.id);
      if (!res.success || !res.data) {
        alert("Erro ao buscar dados completos da vistoria para geração do PDF.");
        setIsGenerating(false);
        return;
      }

      const dbData = res.data;
      const vistoriadorFormatted = dbData.vistoriador 
        ? `${dbData.vistoriador.firstName} ${dbData.vistoriador.lastName}${dbData.vistoriador.creci ? ` (CRECI: ${dbData.vistoriador.creci})` : ''}` 
        : vistoria.vistoriador;
      const html2pdf = (await import("html2pdf.js")).default;

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

      const reportDesc = dbData.observacoes || "Nenhuma descrição detalhada informada.";
      const reportObs = dbData.reparosNecessarios || "";

      // 3. Mapear documentos e fotos (fichas antigas podem conter o formato de termos)
      const infoGeral = dbData.infoGeral as { attachments?: Array<{ id: string; name: string; url: string; mimeType: string; description?: string }> } | null;
      const attachments = Array.isArray(infoGeral?.attachments) ? infoGeral.attachments : [];
      const roomPhotos = (dbData.comentariosVistoria || []).flatMap((comment: any) =>
        (Array.isArray(comment.midias) ? comment.midias : Array.isArray(comment.media) ? comment.media : [])
          .filter((media: any) => media?.type === "image" && typeof media.url === "string")
          .map((media: any) => ({
            url: media.url as string,
            roomName: comment.roomName || rooms.find((room: any) => room.id === comment.roomId)?.name || "Ambiente",
            description: comment.texto || comment.text || ""
          }))
      );

      const qrCodeData = `${window.location.origin}/vistorias/ficha-vistoria/${vistoria.id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeData)}`;

      // Split rooms dynamically across pages
      const roomsP1 = rooms.slice(0, 3);
      const roomsP2 = rooms.slice(3, 7);
      const roomsP3 = rooms.slice(7);
      const photoChunks = Array.from(
        { length: Math.ceil(roomPhotos.length / 6) },
        (_, index) => roomPhotos.slice(index * 6, index * 6 + 6)
      );
      const photoPagesHtml = photoChunks.map((photos, pageIndex) => `
        <div style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden; page-break-before: always;">
          <div style="position: absolute; inset: 0; z-index: 0; pointer-events: none;">
            <img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" />
          </div>
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 3.5cm 2cm 2cm 3cm; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #004777; padding-bottom: 6px; margin-bottom: 12px;">
              <h2 style="font-size: 12px; color: #004777; text-transform: uppercase; margin: 0;">Registro Fotográfico</h2>
              <span style="font-size: 9px; color: #888; font-weight: bold;">Código: ${escapeHtml(vistoria.codigo)}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1; align-content: start;">
              ${photos.map((photo) => `
                <div style="border: 1px solid #EEEEF3; border-radius: 5px; padding: 5px; background: #fafafa; break-inside: avoid;">
                  <img src="${escapeHtml(photo.url)}" alt="Foto de ${escapeHtml(photo.roomName)}" crossorigin="anonymous" style="display: block; width: 100%; height: 190px; object-fit: cover; border-radius: 3px; background: #eee;" />
                  <strong style="display: block; color: #004777; font-size: 8px; margin-top: 4px;">${escapeHtml(photo.roomName)}</strong>
                  ${photo.description ? `<p style="font-size: 7px; line-height: 1.25; color: #555; margin: 2px 0 0;">${escapeHtml(photo.description)}</p>` : ""}
                </div>
              `).join("")}
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #EEEEF3; padding-top: 6px; font-size: 8px; color: #888; font-weight: bold;">
              <span>Laudo de Vistoria Técnica | Registro fotográfico</span>
              <span>Fotos ${pageIndex * 6 + 1}–${pageIndex * 6 + photos.length}</span>
            </div>
          </div>
        </div>
      `).join("");

      // Build the temporary container for PDF generation
      const tempDiv = document.createElement("div");
      tempDiv.style.width = "210mm";
      tempDiv.style.backgroundColor = "#ffffff";
      tempDiv.innerHTML = `
        <!-- PAGE 1 -->
        <div style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden;">
          <!-- Background Frame -->
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;">
            <img src="/lais.svg" alt="" style="width: 100%; height: 100%; object-fit: fill;" />
          </div>
          
          <!-- Content -->
          <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 3.5cm 2cm 2cm 3cm; box-sizing: border-box;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #004777; padding-bottom: 8px; margin-bottom: 15px;">
              <div style="width: 150px;"></div> <!-- Spacer for background logo -->
              <div style="text-align: center; flex: 1;">
                <h1 style="font-size: 15px; font-weight: 800; color: #004777; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Laudo de Vistoria Técnica</h1>
                <p style="font-size: 9px; color: #666; margin: 2px 0 0 0; font-weight: bold;">Código: <span style="color: #280003;">${vistoria.codigo}</span></p>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px; width: 120px;">
                <img src="${qrCodeUrl}" alt="QR Code" style="height: 42px; width: 42px; border: 1px solid #EEEEF3; padding: 2px; border-radius: 4px; background-color: #fff;" />
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
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">STATUS:</td>
                    <td style="padding: 2px 0; color: #708D81; font-weight: bold;">${vistoria.statusLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">DATA:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${vistoria.dataVistoria || "Não definida"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #666; font-weight: 600;">VISTORIADOR:</td>
                    <td style="padding: 2px 0; color: #280003; font-weight: bold;">${vistoriadorFormatted}</td>
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

            <!-- Parecer Técnico -->
            <div style="border: 1px solid #EEEEF3; border-radius: 6px; padding: 10px; margin-bottom: 12px; background-color: #ffffff;">
              <h2 style="font-size: 9px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #EEEEF3; padding-bottom: 4px; margin-top: 0; margin-bottom: 6px;">Parecer Técnico Geral</h2>
              <div style="font-size: 10px; line-height: 1.4; color: #280003; white-space: pre-wrap;">${reportDesc}</div>
              ${reportObs ? `
                <div style="margin-top: 6px; padding: 6px; background-color: rgba(240, 209, 138, 0.1); border: 1px solid rgba(240, 209, 138, 0.2); border-radius: 4px; font-size: 9px; color: #8c6d1f;">
                  <strong>Observação técnica:</strong> ${reportObs}
                </div>
              ` : ''}
            </div>

            <!-- Estado dos Ambientes (P1) -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
              <h2 style="font-size: 10px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #EEEEF3; padding-bottom: 2px; margin-bottom: 4px; margin-top: 0;">Estado dos Ambientes</h2>
              ${roomsP1.map((room: any) => `
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

            <!-- Footer indicator -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #EEEEF3; padding-top: 6px; margin-top: auto; font-size: 8px; color: #888; font-weight: bold;">
              <span>Laudo de Vistoria Técnica | Código: ${vistoria.codigo}</span>
              <span>Página 1 de 3</span>
            </div>
          </div>
        </div>

        <!-- PAGE 2 -->
        <div style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden; page-break-before: always;">
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
        <div style="width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background-color: #ffffff; overflow: hidden; page-break-before: always;">
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

            <!-- Documentos e Fotos -->
            ${attachments.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <h2 style="font-size: 10px; font-weight: bold; color: #004777; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #EEEEF3; padding-bottom: 2px; margin-bottom: 6px; margin-top: 0;">Documentos e Fotos</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 8px; line-height: 1.3;">
                  ${attachments.map((attachment) => `
                    <div style="padding: 5px; background-color: #fafafa; border: 1px solid #EEEEF3; border-radius: 4px;">
                      ${attachment.mimeType.startsWith("image/") ? `<img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.name)}" style="display: block; width: 100%; height: 80px; object-fit: cover; border-radius: 3px; margin-bottom: 4px;" />` : ""}
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
        ${photoPagesHtml}
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

      // Wait for all images inside tempDiv to load
      const images = tempDiv.getElementsByTagName("img");
      const promises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const opt = {
        margin: 0,
        filename: `Relatorio_Vistoria_${vistoria.codigo}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.82 },
        html2canvas: { scale: 1.5, useCORS: true, allowTaint: false, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      try {
        await html2pdf().from(tempDiv).set(opt).save();
      } finally {
        wrapper.remove();
      }
    } catch (error) {
      console.error("Erro ao gerar relatório em PDF:", error);
    } finally {
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
