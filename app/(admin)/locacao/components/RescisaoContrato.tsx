'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { comunicarSaida, confirmarRescisao } from '../actions/rescisao'
import { parseExitNotice, proportionalRent, reviewLabels, todayBrazil, type ExitReview, type ReviewKey } from '@/lib/locacao/rescisao'

type Props = { id: string; status: string; noticeValue: unknown; startDate: string; periods: { effectiveFrom: string; effectiveTo: string | null; rentAmount: number }[] }
type Draft = Record<ReviewKey, { status: '' | 'reviewed' | 'not_applicable'; amount: string; notes: string }>
const inputClass = 'mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm'
const buttonClass = 'min-h-11 rounded-lg bg-[#004777] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = (value: string) => value.split('-').reverse().join('/')

export default function RescisaoContrato({ id, status, noticeValue, startDate, periods }: Props) {
  const notice = parseExitNotice(noticeValue)
  const [open, setOpen] = useState(false)
  const [expectedDate, setExpectedDate] = useState('')
  const [actualDate, setActualDate] = useState(notice?.expectedDate ?? todayBrazil())
  const [noDebts, setNoDebts] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const basis = '30' as const
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const [review, setReview] = useState<Draft>({ water: { status: '', amount: '', notes: '' }, electricity: { status: '', amount: '', notes: '' }, condominium: { status: '', amount: '', notes: '' }, rent: { status: '', amount: '', notes: '' } })
  const router = useRouter()
  let calculation = 0
  let calculationError = ''
  try { calculation = proportionalRent(actualDate, startDate, periods, basis) } catch (error) { calculationError = error instanceof Error ? error.message : 'Revise os períodos do contrato.' }

  function change(key: ReviewKey, patch: Partial<Draft[ReviewKey]>) {
    setReview(current => ({ ...current, [key]: { ...current[key], ...patch } }))
    setConfirmed(false)
  }

  function submit() {
    startTransition(async () => {
      try {
        let result
        if (!notice) result = await comunicarSaida(id, expectedDate, noDebts)
        else {
          const values = Object.fromEntries((Object.keys(reviewLabels) as ReviewKey[]).map(key => [key, { ...review[key], amount: key === 'rent' && review[key].amount === '' ? calculation : Number(review[key].amount) }])) as ExitReview
          result = await confirmarRescisao(id, actualDate, values, basis)
        }
        setMessage(result.message)
        if (result.success) { setOpen(false); setConfirmed(false); router.refresh() }
      } catch { setMessage('Não foi possível concluir. Atualize a página para verificar o registro antes de tentar novamente.') }
    })
  }

  if (!notice && status !== 'ACTIVE') return null
  const allReviewed = (Object.keys(reviewLabels) as ReviewKey[]).every(key => review[key].status && (key === 'rent' || review[key].amount !== ''))

  return <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="rescisao-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="rescisao-heading" className="text-sm font-bold text-gray-900">{notice?.confirmed ? 'Contrato rescindido' : notice ? 'Em desocupação' : 'Desocupação e rescisão'}</h2>
        {notice && <p className="mt-1 text-sm text-gray-600">Saída prevista: {dateLabel(notice.expectedDate)}{notice.confirmed ? ` · Saída efetiva: ${dateLabel(notice.confirmed.date)}` : ' · Contrato ativo até a confirmação da rescisão'}</p>}
      </div>
      {!notice?.confirmed && status === 'ACTIVE' && <button type="button" className={buttonClass} onClick={() => { setOpen(!open); setConfirmed(false) }}>{open ? 'Fechar' : notice ? 'Confirmar rescisão' : 'Rescisão'}</button>}
    </div>
    {notice && <div className="mt-4 flex flex-wrap gap-3">
      <a className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-[#004777]" href={`/api/locacao/${id}/desocupacao?format=docx`}>Baixar comunicado Word</a>
      <a className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-[#004777]" href={`/api/locacao/${id}/desocupacao?format=pdf`}>Baixar comunicado PDF</a>
    </div>}
    {message && <p role="status" className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-gray-900">{message}</p>}
    {open && <form className="mt-5 space-y-4 border-t border-gray-100 pt-4" onSubmit={event => { event.preventDefault(); submit() }}>
      <fieldset disabled={pending} className="space-y-4">
        {!notice ? <>
          <p className="text-sm text-gray-600">Registre a previsão de saída para emitir o comunicado com os participantes e o imóvel deste contrato. A imobiliária cadastrada assina como notificante-locador.</p>
          <label className="block text-sm font-medium">Data prevista de saída<input type="date" required min={startDate > todayBrazil() ? startDate : todayBrazil()} value={expectedDate} onChange={e => { setExpectedDate(e.target.value); setConfirmed(false) }} className={inputClass} /></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={noDebts} onChange={e => { setNoDebts(e.target.checked); setConfirmed(false) }} />Conferi e quero incluir a declaração de que não há débitos até a data do comunicado.</label>
        </> : <>
          <label className="block text-sm font-medium">Data efetiva da saída / entrega das chaves<input type="date" required min={notice.issuedDate > startDate ? notice.issuedDate : startDate} max={todayBrazil()} value={actualDate} onChange={e => { setActualDate(e.target.value); change('rent', { amount: '', status: '' }) }} className={inputClass} /></label>
          <p className="text-sm font-medium">Aluguel proporcional: divisor fixo de 30 dias.</p>
          <p className="text-sm text-gray-600">Cálculo do início do mês (ou início do contrato) até a saída, inclusive, usando o aluguel vigente em cada dia. {calculationError || `Valor calculado: ${money(calculation)}.`} Um ajuste manual exige justificativa.</p>
          <p className="text-sm text-gray-600">Revise as contas abaixo. Os valores registram o acerto revisado; a confirmação não dá baixa nem emite cobranças. Consulte também as cobranças existentes no financeiro.</p>
          {(Object.keys(reviewLabels) as ReviewKey[]).map(key => <fieldset key={key} className="rounded-xl border border-gray-200 p-3">
            <legend className="px-1 text-sm font-bold">{reviewLabels[key]}</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Revisão<select required value={review[key].status} onChange={e => change(key, { status: e.target.value as Draft[ReviewKey]['status'], ...(e.target.value === 'not_applicable' ? { amount: '0' } : {}) })} className={inputClass}><option value="">Selecione</option><option value="reviewed">Revisado</option>{key !== 'rent' && <option value="not_applicable">Não se aplica</option>}</select></label>
              <label className="text-sm">Valor revisado (R$)<input type="number" min="0" step="0.01" required={key !== 'rent'} readOnly={review[key].status === 'not_applicable'} value={review[key].amount} placeholder={key === 'rent' ? calculation.toFixed(2) : '0,00'} onChange={e => change(key, { amount: e.target.value })} className={inputClass} /></label>
            </div>
            <label className="mt-3 block text-sm">Observações (pendências, comprovantes ou ajustes)<textarea maxLength={2000} value={review[key].notes} onChange={e => change(key, { notes: e.target.value })} className={inputClass} /></label>
          </fieldset>)}
        </>}
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{notice ? 'Confirmo a saída efetiva, revisei as quatro contas e desejo rescindir este contrato.' : 'Confirmo a data prevista e desejo registrar a comunicação de saída.'}</label>
        <button className={buttonClass} disabled={pending || !confirmed || (!!notice && (!allReviewed || !!calculationError))}>{pending ? 'Salvando…' : notice ? 'Registrar rescisão confirmada' : 'Confirmar e emitir comunicado'}</button>
      </fieldset>
    </form>}
    {notice?.confirmed && <div className="mt-4 space-y-2 text-sm">
      {(Object.keys(reviewLabels) as ReviewKey[]).map(key => <div key={key} className="rounded-lg bg-gray-50 p-3"><strong>{reviewLabels[key]}:</strong> {notice.confirmed!.review[key].status === 'not_applicable' ? 'Não se aplica' : money(notice.confirmed!.review[key].amount)}{notice.confirmed!.review[key].notes && <p className="mt-1 whitespace-pre-wrap text-gray-600">{notice.confirmed!.review[key].notes}</p>}</div>)}
      <p className="text-gray-600">Revisão registrada em {new Date(notice.confirmed.at).toLocaleString('pt-BR')}. As cobranças e os pagamentos são consultados no financeiro.</p>
    </div>}
  </section>
}
