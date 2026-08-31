"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { criarCobrancaContratoAction } from "@/app/actions/contractChargeActions";
import type { HistoryTransaction } from "@/components/locacao/CobrancasAcordosHistory";

type ContractReference = {
  kind: "LEASE" | "LEGACY";
  id: string;
  editUrl: string;
};

function currentCompetence() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
}

function isAgreement(transaction: HistoryTransaction) {
  const metadata = metadataRecord(transaction.metadata);
  return metadata.origin === "MANUAL_AGREEMENT"
    || /^acordo de/i.test(transaction.descricao.trim());
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function ContractChargesModal({
  reference,
  transactions,
}: {
  reference: ContractReference;
  transactions: HistoryTransaction[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [competence, setCompetence] = useState(currentCompetence);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof criarCobrancaContratoAction>> | null>(null);
  const charges = useMemo(() => transactions
    .filter(transaction => !isAgreement(transaction))
    .sort((a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime()),
  [transactions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isPending]);

  const close = () => {
    if (isPending) return;
    setOpen(false);
    setResult(null);
  };

  const createCharge = () => {
    setResult(null);
    startTransition(async () => {
      const response = await criarCobrancaContratoAction(
        { kind: reference.kind, id: reference.id },
        competence,
      );
      setResult(response);
      if (response.success) router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004777] px-4 py-2 text-xs font-bold text-white hover:bg-[#00365c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        Gerenciar cobranças
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3 sm:p-6"
          role="presentation"
          onMouseDown={event => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="contract-charges-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 bg-[#280003] px-5 py-4 text-white">
              <div>
                <h2 id="contract-charges-title" className="text-base font-bold">Cobranças do contrato</h2>
                <p className="mt-1 text-xs text-white/70">
                  Consulte o histórico ou crie uma cobrança para uma competência específica.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                aria-label="Fechar cobranças"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-white/10 disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border-b border-gray-200 p-5 lg:border-b-0 lg:border-r">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Cobranças anteriores</h3>
                <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                  {charges.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                      Nenhuma cobrança registrada para este contrato.
                    </p>
                  ) : charges.map(charge => (
                    <article key={charge.id} className="rounded-xl border border-gray-200 p-3 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900">{charge.descricao}</p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Vencimento {formatDate(charge.dataVencimento)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-700">
                          {charge.interStatus || charge.status}
                        </span>
                      </div>
                      <p className="mt-2 font-bold text-[#280003]">{formatCurrency(charge.valor)}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Nova cobrança</h3>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-bold text-gray-700">Competência</span>
                  <input
                    type="month"
                    value={competence}
                    onChange={event => {
                      setCompetence(event.target.value);
                      setResult(null);
                    }}
                    disabled={isPending}
                    className="min-h-11 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-[#280003] outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15"
                  />
                </label>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                  O vencimento e os valores serão calculados pela vigência contratual correspondente. Nenhuma outra competência será alterada.
                </p>

                {result && !result.success && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3" aria-live="polite">
                    <div className="flex gap-2 text-sm font-bold text-amber-900">
                      <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {result.error}
                    </div>
                    {result.issues && result.issues.length > 0 && (
                      <ul className="mt-3 space-y-2 text-xs text-amber-900">
                        {result.issues.map(item => (
                          <li key={item.code} className="rounded-lg bg-white/70 p-2">
                            <span className="mr-1 font-bold">{item.group.toLowerCase()}:</span>
                            {item.message}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={reference.editUrl}
                      className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 hover:bg-amber-100"
                    >
                      Corrigir dados do contrato
                    </Link>
                  </div>
                )}

                {result?.success && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" aria-live="polite">
                    <div className="flex gap-2 font-bold">
                      <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {result.message}
                    </div>
                    <p className="mt-2 text-xs">
                      Competência {result.competence.split("-").reverse().join("/")} · vencimento {formatDate(result.dueDate)}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={createCharge}
                  disabled={isPending || !competence}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#280003] px-4 py-2 text-sm font-bold text-white hover:bg-[#3b0005] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Validando dados...</>
                  ) : (
                    <><CalendarPlus className="h-4 w-4" aria-hidden="true" /> Criar cobrança</>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
