import test from 'node:test'
import assert from 'node:assert/strict'
import PizZip from 'pizzip'
import { PDFDocument } from 'pdf-lib'
import { parseExitDate, proportionalRent, validateExitReview, noticeParagraphs, type ExitNotice, type ExitReview } from '../lib/locacao/rescisao'
import { generateExitDocument } from '../lib/locacao/rescisao-documento'

const periods = [{ effectiveFrom: '2026-01-01', effectiveTo: null, rentAmount: 1500 }]
const review: ExitReview = { water: { status: 'reviewed', amount: 90, notes: 'Conta final' }, electricity: { status: 'reviewed', amount: 120, notes: '' }, condominium: { status: 'not_applicable', amount: 0, notes: '' }, rent: { status: 'reviewed', amount: 600, notes: '' } }
const notice: ExitNotice = { schemaVersion: 1, expectedDate: '2026-05-12', issuedDate: '2026-04-12', createdAt: '2026-04-12T12:00:00Z', createdBy: 'test', fields: { landlord: 'Locador Exemplo', tenant: 'Locatário Exemplo', property: 'Rua Exemplo, 123, Ilha Solteira - SP', agency: 'IMOBILIÁRIA SCATOLIN IMÓVEIS', agencyAddress: 'Passeio Cristalina, nº 113', city: 'Ilha Solteira', noDebts: false } }

test('aluguel usa divisor 30 e inclui o dia de entrega', () => {
  assert.equal(proportionalRent('2026-05-12', '2026-01-01', periods, '30'), 600)
  assert.equal(proportionalRent('2026-02-28', '2026-01-01', periods, '30'), 1400)
  assert.equal(proportionalRent('2026-05-31', '2026-01-01', periods, '30'), 1550)
  assert.equal(proportionalRent('2026-05-12', '2026-05-10', periods, '30'), 150)
})
test('cálculo respeita reajuste dentro do mês e rejeita lacunas ou sobreposição', () => {
  const changed = [{ ...periods[0], effectiveTo: '2026-05-10' }, { effectiveFrom: '2026-05-11', effectiveTo: null, rentAmount: 1800 }]
  assert.equal(proportionalRent('2026-05-12', '2026-01-01', changed, '30'), 620)
  assert.throws(() => proportionalRent('2026-05-12', '2026-01-01', [], '30'))
  assert.throws(() => proportionalRent('2026-05-12', '2026-01-01', [...periods, ...periods], '30'))
})
test('datas impossíveis e anteriores ao contrato são rejeitadas', () => {
  assert.throws(() => parseExitDate('2026-02-30'))
  assert.throws(() => parseExitDate('12/05/2026'))
  assert.throws(() => proportionalRent('2026-05-12', '2026-06-01', periods, '30'))
})
test('exige revisão das quatro contas sem confundir revisão com pagamento', () => {
  assert.doesNotThrow(() => validateExitReview(review))
  assert.throws(() => validateExitReview({ ...review, water: undefined } as unknown as ExitReview))
  assert.throws(() => validateExitReview({ ...review, water: { status: 'reviewed', amount: -1, notes: '' } }))
  assert.throws(() => validateExitReview({ ...review, rent: { status: 'not_applicable', amount: 0, notes: '' } }))
  assert.throws(() => validateExitReview({ ...review, condominium: { status: 'not_applicable', amount: 10, notes: '' } }))
})
test('declaração de ausência de débitos somente com confirmação explícita', () => {
  assert.ok(!noticeParagraphs(notice).join(' ').includes('não possuo débitos'))
  assert.ok(noticeParagraphs({ ...notice, fields: { ...notice.fields, noDebts: true } }).join(' ').includes('não possuo débitos'))
})
test('gera Word com dados do contrato e PDF válido a partir do mesmo comunicado', async () => {
  const word = await generateExitDocument(notice, 'docx')
  const xml = new PizZip(word).file('word/document.xml')!.asText()
  assert.ok(xml.includes('Locatário Exemplo'))
  assert.ok(xml.includes('IMOBILIÁRIA SCATOLIN IMÓVEIS'))
  assert.ok(xml.includes('12 de maio de 2026'))
  assert.ok(!xml.includes('{p'))
  assert.ok(!xml.includes('ROBERT'))
  const pdf = await PDFDocument.load(await generateExitDocument(notice, 'pdf'))
  assert.equal(pdf.getPageCount(), 1)
})
