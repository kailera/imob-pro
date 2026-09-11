import { readFile } from 'node:fs/promises'
import path from 'node:path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { noticeParagraphs, type ExitNotice } from './rescisao'

export async function generateExitDocument(notice: ExitNotice, format: 'docx' | 'pdf') {
  const paragraphs = noticeParagraphs(notice)
  if (format === 'docx') {
    const template = await readFile(path.join(process.cwd(), 'public/templates-docx/comunicado-desocupacao-v1.docx'))
    const doc = new Docxtemplater(new PizZip(template), { paragraphLoop: true, linebreaks: true })
    doc.render(Object.fromEntries(paragraphs.map((text, i) => [`p${i}`, text])))
    return doc.getZip().generate({ type: 'nodebuffer' })
  }
  const pdf = await PDFDocument.create()
  pdf.setTitle('Comunicado de desocupação de imóvel locado')
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  let page = pdf.addPage([595.28, 841.89])
  let y = 780
  for (const [index, paragraph] of paragraphs.entries()) {
    const size = index === 0 ? 13 : 12
    const face = index === 0 ? bold : font
    const lines: string[] = []
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (face.widthOfTextAtSize(candidate, size) > 475 && line) { lines.push(line); line = word } else line = candidate
    }
    if (line) lines.push(line)
    for (const text of lines) {
      if (y < 65) { page = pdf.addPage([595.28, 841.89]); y = 780 }
      const centered = index === 0 || index >= 6
      page.drawText(text, { x: centered ? Math.max(60, (595.28 - face.widthOfTextAtSize(text, size)) / 2) : 60, y, size, font: face })
      y -= 17
    }
    y -= index >= 6 ? 4 : 15
  }
  return Buffer.from(await pdf.save())
}
