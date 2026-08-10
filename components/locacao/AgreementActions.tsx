"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, RefreshCw, Trash2, X } from "lucide-react"
import {
  deleteAgreementAction,
  reissueAgreementAction,
  updateAgreementAction,
} from "@/app/actions/agreementActions"

type AgreementActionsProps = {
  transaction: {
    id: string
    descricao: string
    valor: number
    dataVencimento: Date | string
    status: string
    interStatus?: string | null
  }
  onChanged?: () => void | Promise<void>
}

function isPaid(transaction: AgreementActionsProps["transaction"]) {
  return transaction.status === "LIQUIDADO"
    || transaction.interStatus === "RECEBIDO"
    || transaction.interStatus === "MARCADO_RECEBIDO"
}

export function AgreementActions({ transaction, onChanged }: AgreementActionsProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busyAction, setBusyAction] = useState<"edit" | "reissue" | "delete" | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [description, setDescription] = useState(transaction.descricao)
  const [value, setValue] = useState(String(transaction.valor))
  const [dueDate, setDueDate] = useState(new Date(transaction.dataVencimento).toISOString().slice(0, 10))
  const paid = isPaid(transaction)

  async function refresh() {
    router.refresh()
    await onChanged?.()
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyAction("edit")
    setFeedback(null)
    const result = await updateAgreementAction(transaction.id, {
      descricao: description,
      valor: Number(value),
      vencimento: dueDate,
    })
    setBusyAction(null)
    if (!result.success) {
      setFeedback({ type: "error", text: result.error })
      return
    }
    setFeedback({ type: result.warning ? "error" : "success", text: result.warning || result.message })
    setEditing(false)
    await refresh()
  }

  async function handleReissue() {
    if (!window.confirm("Cancelar o boleto atual e gerar uma nova cobrança no Banco Inter?")) return
    setBusyAction("reissue")
    setFeedback(null)
    const result = await reissueAgreementAction(transaction.id)
    setBusyAction(null)
    setFeedback({
      type: result.success ? "success" : "error",
      text: result.success ? result.message : result.error,
    })
    if (result.success) await refresh()
  }

  async function handleDelete() {
    if (!window.confirm("Excluir este acordo? Se houver boleto ativo, ele será cancelado no Inter antes da exclusão.")) return
    setBusyAction("delete")
    setFeedback(null)
    const result = await deleteAgreementAction(transaction.id)
    setBusyAction(null)
    setFeedback({
      type: result.success ? "success" : "error",
      text: result.success ? result.message : result.error,
    })
    if (result.success) await refresh()
  }

  return (
    <div className="mt-3 border-t border-dashed border-gray-200 pt-3" data-slot="agreement-actions">
      {paid ? (
        <p className="text-[11px] font-medium text-gray-500">Acordos pagos ficam bloqueados para preservar o histórico financeiro.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setFeedback(null)
              setEditing(true)
            }}
            disabled={busyAction !== null}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-[#004777] hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777] disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
          </button>
          <button
            type="button"
            onClick={handleReissue}
            disabled={busyAction !== null}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busyAction === "reissue" ? "animate-spin" : ""}`} aria-hidden="true" />
            {busyAction === "reissue" ? "Regerando…" : "Regerar boleto"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busyAction !== null}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {busyAction === "delete" ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className={`mt-2 text-[11px] font-semibold ${feedback.type === "success" ? "text-emerald-700" : "text-rose-700"}`}
        >
          {feedback.text}
        </p>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`agreement-edit-${transaction.id}`}>
          <form onSubmit={handleUpdate} className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h3 id={`agreement-edit-${transaction.id}`} className="text-base font-bold text-gray-900">Editar acordo</h3>
                <p className="mt-1 text-xs text-gray-500">Ao salvar, o boleto ativo será cancelado e reemitido com os novos dados.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Fechar edição do acordo"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-4 p-5">
              <label className="block text-xs font-bold text-gray-600">
                Descrição
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#004777]"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-gray-600">
                  Valor
                  <input
                    required
                    type="number"
                    min="2.50"
                    max="99999999.99"
                    step="0.01"
                    value={value}
                    onChange={event => setValue(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#004777]"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-600">
                  Vencimento
                  <input
                    required
                    type="date"
                    min={new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}
                    value={dueDate}
                    onChange={event => setDueDate(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#004777]"
                  />
                </label>
              </div>
              {feedback?.type === "error" && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{feedback.text}</p>
              )}
            </div>

            <footer className="flex justify-end gap-3 border-t border-gray-100 p-5">
              <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl px-4 text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button type="submit" disabled={busyAction !== null} className="min-h-11 rounded-xl bg-[#004777] px-5 text-xs font-bold text-white hover:bg-[#003355] disabled:opacity-50">
                {busyAction === "edit" ? "Salvando e reemitindo…" : "Salvar alterações"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
