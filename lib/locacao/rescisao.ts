export const reviewLabels = { water: 'Água', electricity: 'Luz', condominium: 'Condomínio', rent: 'Aluguel proporcional' } as const
export type ReviewKey = keyof typeof reviewLabels
export type ExitReview = Record<ReviewKey, { status: 'reviewed' | 'not_applicable'; amount: number; notes: string }>
export type ExitNotice = {
  schemaVersion: 1
  expectedDate: string
  issuedDate: string
  createdAt: string
  createdBy: string
  fields: { landlord: string; tenant: string; property: string; agency: string; agencyAddress: string; city: string; noDebts: boolean }
  confirmed?: { date: string; at: string; by: string; review: ExitReview; rentBasis: 'calendar' | '30'; calculatedRent: number }
}

export function parseExitNotice(value: unknown): ExitNotice | null {
  if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 1) return null
  return value as ExitNotice
}

export function parseExitDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe uma data válida.')
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Informe uma data válida.')
  return date
}

export function todayBrazil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function proportionalRent(date: string, start: string, periods: { effectiveFrom: string; effectiveTo: string | null; rentAmount: number }[], basis: 'calendar' | '30') {
  const end = parseExitDate(date)
  const monthStart = `${date.slice(0, 7)}-01`
  const first = start > monthStart ? start : monthStart
  if (first > date) throw new Error('A saída não pode ocorrer antes do início do contrato.')
  const daysInMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()
  const denominator = basis === '30' ? 30 : daysInMonth
  let total = 0
  for (let cursor = parseExitDate(first); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const day = cursor.toISOString().slice(0, 10)
    const matching = periods.filter(p => p.effectiveFrom <= day && (!p.effectiveTo || p.effectiveTo >= day))
    if (matching.length !== 1) throw new Error('Revise os períodos de aluguel: deve existir uma única vigência para cada dia da rescisão.')
    if (!Number.isFinite(matching[0].rentAmount) || matching[0].rentAmount < 0) throw new Error('Valor de aluguel inválido.')
    total += matching[0].rentAmount / denominator
  }
  return Math.round((total + Number.EPSILON) * 100) / 100
}

export function validateExitReview(value: ExitReview) {
  for (const key of Object.keys(reviewLabels) as ReviewKey[]) {
    const item = value?.[key]
    if (!item || !['reviewed', 'not_applicable'].includes(item.status)) throw new Error(`Revise a conta de ${reviewLabels[key]}.`)
    if (!Number.isFinite(item.amount) || item.amount < 0 || Math.round(item.amount * 100) !== item.amount * 100 && Math.abs(Math.round(item.amount * 100) - item.amount * 100) > 0.00001) throw new Error('Informe valores válidos com até duas casas decimais.')
    if (typeof item.notes !== 'string' || item.notes.length > 2000) throw new Error('Observações devem ter no máximo 2.000 caracteres.')
    if (item.status === 'not_applicable' && (key === 'rent' || item.amount !== 0)) throw new Error('Itens não aplicáveis devem ter valor zero; o aluguel deve ser revisado.')
  }
}

export function noticeParagraphs(notice: ExitNotice) {
  const f = notice.fields
  const date = (value: string) => parseExitDate(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return [
    'COMUNICADO DE DESOCUPAÇÃO DE IMÓVEL LOCADO',
    `LOCADOR(A): ${f.landlord}. Aos cuidados da ${f.agency} — setor de desocupações.`,
    'Prezado(a) Senhor(a),',
    `Pela presente, estou dando ciência de não haver interesse em continuar a locação vigente do imóvel que ocupo, situado em ${f.property}, razão pela qual comunico que no dia ${date(notice.expectedDate)}, será o mesmo desocupado de pessoas e coisas e suas chaves devidamente entregues no escritório do(a) administrador(a), sito em ${f.agencyAddress}, para fins de vistoria e posterior encerramento da locação e quitação de débitos pendentes.${f.noDebts ? ' Declaro que até a presente data não possuo débitos referentes à locação.' : ''}`,
    'Conforme estabelecido em contrato, informo que, dentro do prazo de 5 dias antes da entrega do imóvel, entrarei em contato com a administração para agendarmos a vistoria final do imóvel.',
    `${f.city}, ${date(notice.issuedDate)}`,
    '_______________________________________', f.agency, 'NOTIFICANTE-LOCADOR',
    '_______________________________________', f.tenant, 'LOCATÁRIO',
  ]
}
