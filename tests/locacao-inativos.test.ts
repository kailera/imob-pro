import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isCompleteCanonicalLease } from '../lib/locacao/contract-deduplication.js'
import { inicioProximoMesNoBrasil } from '../lib/locacao/cobrancas-inativos.js'

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  'utf8',
)

test('contrato inativo permanece canônico e bloqueia o legado correspondente', () => {
  assert.equal(isCompleteCanonicalLease({
    id: 'lease-inativo',
    propertyId: 'imovel-1',
    status: 'SUSPENDED',
    termsPeriods: [],
    parties: [{ role: 'TENANT', person: { cpfCnpj: '12345678901' } }],
  }), true)
})

test('ação de inativação preserva o contrato e limpa rascunhos futuros', () => {
  const source = readSource('../app/(admin)/locacao/actions/inactivateContrato.action.ts')
  assert.match(source, /status: 'SUSPENDED'/)
  assert.match(source, /version: \{ increment: 1 \}/)
  assert.doesNotMatch(source, /\.delete\(/)
  assert.match(source, /removerRascunhosFuturosDeContratoInativo/)
})

test('limpeza de inativos começa no primeiro dia do mês seguinte em São Paulo', () => {
  assert.equal(
    inicioProximoMesNoBrasil(new Date('2026-08-31T23:30:00-03:00')).toISOString(),
    '2026-09-01T00:00:00.000Z',
  )
  assert.equal(
    inicioProximoMesNoBrasil(new Date('2026-12-15T12:00:00-03:00')).toISOString(),
    '2027-01-01T00:00:00.000Z',
  )
})

test('limpeza preserva cobranças emitidas e remove somente rascunhos futuros', () => {
  const source = readSource('../lib/locacao/cobrancas-inativos.ts')
  assert.match(source, /status: 'PENDENTE'/)
  assert.match(source, /dataVencimento: \{ gte: cutoff \}/)
  assert.match(source, /interNossoNumero: null/)
  assert.match(source, /interCodigoSolicitacao: null/)
  assert.match(source, /interSeuNumero: null/)
  assert.match(source, /interTxId: null/)
  assert.match(source, /interBarcode: null/)
  assert.match(source, /interStatus: null/)
})

test('gerador mensal remove registros legados cobertos por contrato canônico', () => {
  const source = readSource('../app/actions/financeiroActions.ts')
  assert.match(source, /removeLegacyDuplicatesWithCompleteLease/)
  assert.match(source, /const \{ tenantId \} = await requireUserContext\(\)/)
  assert.match(source, /imobId: tenantId/)
  assert.match(source, /tenantId,\s*status: "ACTIVE"/)
  assert.match(source, /\{ leaseId: lease\.id \}/)
  assert.match(source, /\{ contratoId: \{ in: legacyContractIds \} \}/)
  assert.ok(
    source.indexOf('const leasesSemPeriodo') < source.indexOf('const [contratosLegados, leasesCanonicos]'),
    'o reparo de períodos deve acontecer antes da escolha entre legado e canônico',
  )
})

test('gerador mensal limpa inativos antigos e revalida o status antes de gravar', () => {
  const source = readSource('../app/actions/financeiroActions.ts')
  assert.match(source, /where: \{ tenantId, status: "SUSPENDED" \}/)
  assert.match(source, /removerRascunhosFuturosDeContratoInativo/)
  assert.match(source, /currentLease\?\.status !== "ACTIVE"/)
  assert.match(source, /if \(!persisted\) continue/)
})

test('navegação de locação oferece acesso à lista de inativos', () => {
  const navbar = readSource('../components/shared/Navbar.tsx')
  const inactivePage = readSource('../app/(admin)/locacao/inativos/page.tsx')
  assert.match(navbar, /Inativos/)
  assert.match(navbar, /\/locacao\/inativos/)
  assert.match(inactivePage, /onlyInactive: true/)
})
