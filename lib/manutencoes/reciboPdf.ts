import type { ManutencaoView } from "@/app/(admin)/manutencoes/types";

type Pdf = import("jspdf").jsPDF;
const BLUE = [0, 71, 119] as const;
const INK = [40, 0, 3] as const;
const MUTED = [105, 105, 115] as const;

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function date(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function footer(pdf: Pdf, id: string) {
  pdf.setDrawColor(225, 228, 232);
  pdf.line(18, 282, 192, 282);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  pdf.text(`Registro ${id}`, 18, 287);
  pdf.text(`Página ${pdf.getNumberOfPages()}`, 192, 287, { align: "right" });
}

function label(pdf: Pdf, title: string, value: string, x: number, y: number, width: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...MUTED);
  pdf.text(title.toUpperCase(), x, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.3);
  pdf.setTextColor(...INK);
  const lines = pdf.splitTextToSize(value || "Não informado", width) as string[];
  pdf.text(lines, x, y + 5);
  return lines.length;
}

function receiptPage(pdf: Pdf, item: ManutencaoView) {
  const discounts = item.descontos.filter((discount) => discount.status !== "CANCELADO");
  const ownerTotal = discounts.reduce((total, discount) => total + discount.valor, 0);
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, 210, 30, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("RECIBO DE MANUTENÇÃO", 18, 17);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 192, 17, { align: "right" });

  label(pdf, "Data da manutenção", date(item.dataManutencao), 18, 42, 48);
  label(pdf, "Status", item.status === "FINALIZADA" ? "Finalizada" : "Em andamento", 72, 42, 48);
  label(pdf, "Valor total", currency(item.valor), 126, 42, 66);

  pdf.setFillColor(244, 246, 248);
  pdf.roundedRect(14, 59, 182, 48, 2, 2, "F");
  label(pdf, "Imóvel", `${item.imovel.codigo} · ${item.imovel.titulo}`, 18, 68, 78);
  label(pdf, "Contrato", item.contratoId, 108, 68, 80);
  label(pdf, "Endereço", item.imovel.endereco, 18, 88, 170);

  label(pdf, "Locatário", item.locatario, 18, 119, 52);
  label(pdf, "Proprietário", item.locador, 76, 119, 52);
  label(pdf, "Prestador", item.prestador ? `${item.prestador.nome} · ${item.prestador.area}` : "Não informado", 134, 119, 58);

  pdf.setDrawColor(220, 224, 228);
  pdf.line(18, 144, 192, 144);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...BLUE);
  pdf.text("SERVIÇO REALIZADO", 18, 154);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.2);
  pdf.setLineHeightFactor(1.35);
  pdf.setTextColor(...INK);
  const description = (pdf.splitTextToSize(item.descricao, 174) as string[]).slice(0, 14);
  pdf.text(description, 18, 161);

  const rateY = Math.min(224, 168 + description.length * 4.4);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...BLUE);
  pdf.text("RATEIO / DESCONTOS", 18, rateY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...INK);
  if (discounts.length === 0) {
    pdf.text("Sem desconto programado para o proprietário.", 18, rateY + 7);
  } else {
    discounts.slice(0, 4).forEach((discount, index) => {
      const [year, month] = discount.competencia.split("-");
      const status = discount.status === "APLICADO" ? "Aplicado" : "Programado";
      pdf.text(`${month}/${year} · ${status} · ${currency(discount.valor)}`, 18, rateY + 7 + index * 5);
    });
    pdf.setFont("helvetica", "bold");
    pdf.text(`Proprietário: ${currency(ownerTotal)}`, 118, rateY + 7);
    pdf.text(`Imobiliária: ${currency(Math.max(0, item.valor - ownerTotal))}`, 118, rateY + 12);
  }

  pdf.setFillColor(250, 250, 251);
  pdf.roundedRect(14, 249, 182, 24, 2, 2, "F");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.7);
  pdf.setTextColor(...MUTED);
  const note = item.status === "FINALIZADA"
    ? "Este documento comprova o registro da manutenção finalizada e de seus documentos de suporte no sistema da imobiliária."
    : "Este documento comprova o registro da manutenção em andamento e não representa quitação definitiva do serviço.";
  pdf.text(pdf.splitTextToSize(note, 168), 18, 257);
  pdf.text(`${item.documentos.length} anexo(s) relacionado(s) a este recibo.`, 18, 268);
  footer(pdf, item.id);
}

async function jpegFrom(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Imagem indisponível.");
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Imagem inválida.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { data: canvas.toDataURL("image/jpeg", 0.86), width: canvas.width, height: canvas.height };
}

async function appendImages(pdf: Pdf, item: ManutencaoView, skipped: string[]) {
  const images = item.documentos.filter((document) => document.mimeType.startsWith("image/"));
  for (let index = 0; index < images.length; index += 1) {
    const attachment = images[index];
    try {
      const image = await jpegFrom(`/api/manutencoes/documentos/${attachment.id}`);
      pdf.addPage("a4", "portrait");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...BLUE);
      pdf.text("ANEXO", 18, 18);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...MUTED);
      pdf.text(`${index + 1} de ${images.length} · ${attachment.nomeOriginal}`, 18, 24, { maxWidth: 174 });
      const ratio = Math.min(174 / image.width, 242 / image.height);
      const width = image.width * ratio;
      const height = image.height * ratio;
      pdf.addImage(image.data, "JPEG", 18 + (174 - width) / 2, 31, width, height, undefined, "FAST");
      footer(pdf, item.id);
    } catch {
      skipped.push(attachment.nomeOriginal);
    }
  }
}

export async function emitirReciboManutencao(item: ManutencaoView) {
  const [{ jsPDF }, { PDFDocument }] = await Promise.all([import("jspdf"), import("pdf-lib")]);
  const receipt = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const skipped: string[] = [];
  receiptPage(receipt, item);
  await appendImages(receipt, item, skipped);
  const merged = await PDFDocument.load(receipt.output("arraybuffer"));

  for (const attachment of item.documentos.filter((document) => document.mimeType === "application/pdf")) {
    try {
      const response = await fetch(`/api/manutencoes/documentos/${attachment.id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("PDF indisponível.");
      const source = await PDFDocument.load(await response.arrayBuffer());
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    } catch {
      skipped.push(attachment.nomeOriginal);
    }
  }

  merged.setTitle(`Recibo de manutenção ${item.imovel.codigo}`);
  merged.setSubject(item.descricao.slice(0, 180));
  merged.setCreator("Imob Pro");
  const bytes = await merged.save();
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `recibo-manutencao-${safeFileName(item.imovel.codigo)}-${item.dataManutencao}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { skipped };
}
