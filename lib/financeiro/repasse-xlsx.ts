import type { RepasseCompany, RepasseItem } from "./repasse-types";

type Cell = { value: string | number; style?: number };
type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let result = "";
  for (let current = index; current > 0; current = Math.floor((current - 1) / 26)) {
    result = String.fromCharCode(65 + ((current - 1) % 26)) + result;
  }
  return result;
}

function cellXml(cell: Cell, row: number, column: number) {
  const reference = `${columnName(column)}${row}`;
  const style = cell.style == null ? "" : ` s="${cell.style}"`;
  if (typeof cell.value === "number") return `<c r="${reference}"${style}><v>${cell.value}</v></c>`;
  return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(cell.value)}</t></is></c>`;
}

function worksheetXml(rows: Cell[][], lastColumn: string, lastRow: number) {
  const body = rows.map((cells, rowIndex) => {
    const row = rowIndex + 1;
    return `<row r="${row}">${cells.map((cell, columnIndex) => cellXml(cell, row, columnIndex + 1)).join("")}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>
    <col min="1" max="1" width="25" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="4" width="20" customWidth="1"/><col min="5" max="5" width="42" customWidth="1"/>
    <col min="6" max="7" width="18" customWidth="1"/><col min="8" max="13" width="16" customWidth="1"/>
    <col min="14" max="14" width="18" customWidth="1"/><col min="15" max="16" width="34" customWidth="1"/>
  </cols>
  <sheetData>${body}</sheetData>
  <mergeCells count="2"><mergeCell ref="A1:P1"/><mergeCell ref="A2:P2"/></mergeCells>
  <autoFilter ref="A4:P${Math.max(4, lastRow)}"/>
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="R$ #,##0.00;[Red]-R$ #,##0.00"/></numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF004777"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF004777"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEEEF3"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF4F1"/></patternFill></fill></fills>
  <borders count="2"><border/><border><left style="thin"><color rgb="FFD9DCE1"/></left><right style="thin"><color rgb="FFD9DCE1"/></right><top style="thin"><color rgb="FFD9DCE1"/></top><bottom style="thin"><color rgb="FFD9DCE1"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0"/>
    <xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function write32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function createZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0x0800);
    write16(localView, 8, 0); write32(localView, 14, checksum); write32(localView, 18, entry.data.length);
    write32(localView, 22, entry.data.length); write16(localView, 26, name.length); local.set(name, 30);
    localParts.push(local, entry.data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50); write16(centralView, 4, 20); write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800); write16(centralView, 10, 0); write32(centralView, 16, checksum);
    write32(centralView, 20, entry.data.length); write32(centralView, 24, entry.data.length);
    write16(centralView, 28, name.length); write32(centralView, 42, localOffset); central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length + entry.data.length;
  }

  const centralDirectory = concat(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50); write16(endView, 8, entries.length); write16(endView, 10, entries.length);
  write32(endView, 12, centralDirectory.length); write32(endView, 16, localOffset);
  return concat([...localParts, centralDirectory, end]);
}

function statusLabel(item: RepasseItem) {
  if (!item.receivedAt) return "Aluguel não recebido";
  return { PRONTO: "Pronto para gerar", PENDENTE: "Repasse pendente", PAGO: "Repassado", AGUARDANDO_RECEBIMENTO: "Aluguel não recebido" }[item.status];
}

export function createRepasseXlsx(items: RepasseItem[], company: RepasseCompany, competence: string) {
  const [year, month] = competence.split("-").map(Number);
  const competenceLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  const headers = ["Proprietário", "CPF/CNPJ", "Contrato", "Imóvel", "Endereço", "Situação", "Recebido em", "Aluguel bruto", "Acréscimos", "Taxa adm. (%)", "Taxa adm.", "Descontos", "Valor líquido", "Data do repasse", "Detalhes dos acréscimos", "Detalhes dos descontos"];
  const rows: Cell[][] = [
    [{ value: company.name, style: 1 }],
    [{ value: `Relação mensal de repasses · ${competenceLabel}`, style: 2 }],
    [],
    headers.map((value) => ({ value, style: 3 })),
  ];

  for (const item of items) {
    const deductions = [
      ...item.deductions.filter((entry) => entry.selected).map((entry) => `${entry.description}: ${entry.value.toFixed(2)}`),
      ...item.otherDeductions.map((entry) => `${entry.description}: ${entry.value.toFixed(2)}`),
    ].join("; ");
    const additions = item.otherAdditions.map((entry) => `${entry.description}: ${entry.value.toFixed(2)}`).join("; ");
    rows.push([
      { value: item.owner.name, style: 4 }, { value: item.owner.cpfCnpj, style: 4 }, { value: item.contractCode, style: 4 },
      { value: `${item.propertyCode} · ${item.propertyTitle}`, style: 4 }, { value: item.propertyAddress, style: 4 },
      { value: statusLabel(item), style: 4 }, { value: item.receivedAt ? new Date(item.receivedAt).toLocaleDateString("pt-BR") : "", style: 4 },
      { value: item.grossValue, style: 5 }, { value: item.additionTotal, style: 5 }, { value: item.adminFeePercent, style: 4 },
      { value: item.adminFeeValue, style: 5 }, { value: item.deductionTotal, style: 5 }, { value: item.netValue, style: 6 },
      { value: item.transferDueDate ? new Date(item.transferDueDate).toLocaleDateString("pt-BR") : "", style: 4 },
      { value: additions, style: 4 }, { value: deductions, style: 4 },
    ]);
  }

  const totals = items.reduce((sum, item) => ({
    gross: sum.gross + item.grossValue,
    additions: sum.additions + item.additionTotal,
    admin: sum.admin + item.adminFeeValue,
    deductions: sum.deductions + item.deductionTotal,
    net: sum.net + item.netValue,
  }), { gross: 0, additions: 0, admin: 0, deductions: 0, net: 0 });
  rows.push([], [
    { value: "TOTAL DA COMPETÊNCIA", style: 7 }, ...Array.from({ length: 6 }, () => ({ value: "", style: 7 })),
    { value: totals.gross, style: 8 }, { value: totals.additions, style: 8 }, { value: "", style: 7 },
    { value: totals.admin, style: 8 }, { value: totals.deductions, style: 8 }, { value: totals.net, style: 8 },
  ]);

  const sheet = worksheetXml(rows, "P", rows.length);
  const now = new Date().toISOString();
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`) },
    { name: "_rels/.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Repasses ${String(month).padStart(2, "0")}-${year}" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheet) },
    { name: "xl/styles.xml", data: encoder.encode(stylesXml) },
    { name: "docProps/core.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>${xml(company.name)}</dc:creator><dc:title>Repasses ${xml(competenceLabel)}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`) },
    { name: "docProps/app.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Scatolin Imóveis</Application></Properties>`) },
  ];
  return createZip(entries);
}

export function downloadRepasseXlsx(items: RepasseItem[], company: RepasseCompany, competence: string) {
  const file = createRepasseXlsx(items, company, competence);
  const url = URL.createObjectURL(new Blob([file], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `repasses-${competence}.xlsx`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
