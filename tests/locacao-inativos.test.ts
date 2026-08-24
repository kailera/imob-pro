import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isCompleteCanonicalLease } from '../lib/locacao/contract-deduplication.js'

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

test('ação de inativação preserva dados e altera apenas o status do contrato', () => {
  const source = readSource('../app/(admin)/locacao/actions/inactivateContrato.action.ts')
  assert.match(source, /status: 'SUSPENDED'/)
  assert.match(source, /version: \{ increment: 1 \}/)
  assert.doesNotMatch(source, /\.delete\(/)
  assert.doesNotMatch(source, /deleteMany/)
})

test('gerador mensal remove registros legados cobertos por contrato canônico', () => {
  const source = readSource('../app/actions/financeiroActions.ts')
  assert.match(source, /removeLegacyDuplicatesWithCompleteLease/)
  assert.match(source, /status: \{ in: \["ACTIVE", "SUSPENDED"\] \}/)
  assert.match(source, /where:\s*\{\s*status: "ACTIVE"/)
})

test('navegação de locação oferece acesso à lista de inativos', () => {
  const navbar = readSource('../components/shared/Navbar.tsx')
  const inactivePage = readSource('../app/(admin)/locacao/inativos/page.tsx')
  assert.match(navbar, /Inativos/)
  assert.match(navbar, /\/locacao\/inativos/)
  assert.match(inactivePage, /onlyInactive: true/)
})
