import { CalendarClock, CircleDollarSign, FileText } from "lucide-react"
import { AgreementActions } from "@/components/locacao/AgreementActions"

export type HistoryTransaction = {
  id: string
  descricao: string
  valor: number
  status: string
  dataVencimento: Date | string
  dataPagamento?: Date | string | null
  createdAt?: Date | string
  metadata?: unknown
  interStatus?: string | null
  interNossoNumero?: string | null
  interCodigoSolicitacao?: string | null
  interOrigemRecebimento?: string | null
}

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {}
}

function isAgreement(transaction: HistoryTransaction) {
  const metadata = metadataRecord(transaction.metadata)
  return metadata.origin === "MANUAL_AGREEMENT"
    || /^acordo de/i.test(transaction.descricao.trim())
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

const statusLabels: Record<string, string> = {
  RECEBIDO: "Recebido",
  MARCADO_RECEBIDO: "Recebido manualmente",
  A_RECEBER: "A receber",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
  EXPIRADO: "Expirado",
  FALHA_EMISSAO: "Falha na emissão",
  EM_PROCESSAMENTO: "Em processamento",
  PROTESTO: "Em protesto",
  APROVADO: "Emitido",
  LIQUIDADO: "Liquidado",
  PENDENTE: "Pendente",
}

function effectiveStatus(transaction: HistoryTransaction) {
  return transaction.interStatus || transaction.status
}

function statusClass(status: string) {
  if (["RECEBIDO", "MARCADO_RECEBIDO", "LIQUIDADO"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
  if (["ATRASADO", "PROTESTO", "FALHA_EMISSAO"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }
  if (["CANCELADO", "EXPIRADO"].includes(status)) {
    return "border-gray-200 bg-gray-100 text-gray-600"
  }
  return "border-amber-200 bg-amber-50 text-amber-700"
}

function HistoryList({
  transactions,
  empty,
  showAgreementActions = false,
}: {
  transactions: HistoryTransaction[]
  empty: string
  showAgreementActions?: boolean
}) {
  if (!transactions.length) {
    return <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs italic text-gray-400">{empty}</p>
  }

  return (
    <div className="space-y-3">
      {transactions.map(transaction => {
        const status = effectiveStatus(transaction)
        return (
          <article key={transaction.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4" data-slot="billing-history-item">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-gray-900">{transaction.descricao}</h4>
                <p className="mt-1 text-[11px] text-gray-500">
                  Vencimento {formatDate(transaction.dataVencimento)}
                  {transaction.interNossoNumero ? ` · Nosso número ${transaction.interNossoNumero}` : ""}
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass(status)}`}>
                {statusLabels[status] || status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-gray-200 pt-3 text-xs">
              <strong className="text-gray-900">{formatCurrency(transaction.valor)}</strong>
              <span className="text-gray-500">
                {transaction.dataPagamento
                  ? `Pago em ${formatDate(transaction.dataPagamento)}${transaction.interOrigemRecebimento ? ` via ${transaction.interOrigemRecebimento}` : ""}`
                  : transaction.interCodigoSolicitacao ? "Cobrança registrada no Inter" : "Sem emissão registrada no Inter"}
              </span>
            </div>
            {showAgreementActions && <AgreementActions transaction={transaction} />}
          </article>
        )
      })}
    </div>
  )
}

export function CobrancasAcordosHistory({ transactions }: { transactions: HistoryTransaction[] }) {
  const sorted = [...transactions].sort((a, b) => (
    new Date(b.createdAt || b.dataVencimento).getTime() - new Date(a.createdAt || a.dataVencimento).getTime()
  ))
  const agreements = sorted.filter(isAgreement)
  const charges = sorted.filter(transaction => !isAgreement(transaction)).slice(0, 5)

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" data-slot="financial-history">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <CircleDollarSign className="h-4 w-4 text-[#004777]" aria-hidden="true" />
        <h2 className="text-sm font-bold text-gray-900">Acordos e cobranças recentes</h2>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            <FileText className="h-4 w-4" aria-hidden="true" /> Acordos realizados
          </h3>
          <HistoryList
            transactions={agreements}
            empty="Nenhum acordo registrado para esta locação."
            showAgreementActions
          />
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            <CalendarClock className="h-4 w-4" aria-hidden="true" /> Últimas cobranças
          </h3>
          <HistoryList transactions={charges} empty="Nenhuma cobrança registrada para esta locação." />
        </div>
      </div>
    </section>
  )
}
