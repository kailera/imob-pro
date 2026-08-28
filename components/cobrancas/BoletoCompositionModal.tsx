"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Calculator, CheckCircle2, ExternalLink, Loader2, Pencil, Save, X } from "lucide-react";
import {
  getBoletoCompositionAction,
  updateBoletoCompositionAction,
} from "@/app/actions/boletoCompositionActions";
import { FormattedNumberInput } from "@/components/shared/FormattedNumberInput";
import { parseNumeroFlexivel } from "@/lib/locacao/financeiro";
import {
  calcularEncargosReemissaoVencida,
  type OverdueReissueInput,
} from "@/lib/financeiro/boleto-composicao";

type Composition = Extract<
  Awaited<ReturnType<typeof getBoletoCompositionAction>>,
  { success: true }
>["composition"];

type Props = {
  transactionId: string;
  onClose: () => void;
  onSaved?: () => void;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function numberString(value: number | null | undefined) {
  return String(value ?? 0).replace(".", ",");
}

function compositionToForm(value: Composition) {
  return {
    dueDate: value.dueDate.slice(0, 10),
    rentValue: numberString(value.rentValue),
    iptuValue: numberString(value.iptuValue),
    condominiumValue: numberString(value.condominiumValue),
    waterValue: numberString(value.waterValue),
    electricityValue: numberString(value.electricityValue),
    gasValue: numberString(value.gasValue),
    otherValue: numberString(value.otherValue),
    otherDescription: value.otherDescription,
    lateFeeAmount: numberString(value.lateFeeAmount),
    lateInterestAmount: numberString(value.lateInterestAmount),
    discountValue: numberString(value.discountValue),
    lateFeePercentage: numberString(value.lateFeePercentage),
    lateInterestMonthly: numberString(value.lateInterestMonthly),
    discountDaysBefore: String(value.discountDaysBefore),
    discountType: value.discountType,
    iptuPaymentStartDate: value.iptuPaymentStartDate ?? "",
    iptuInstallments: value.iptuInstallments ?? "",
  };
}

export default function BoletoCompositionModal({
  transactionId,
  onClose,
  onSaved,
}: Props) {
  const [composition, setComposition] = useState<Composition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [applyToContract, setApplyToContract] = useState(false);
  const [overdueReissue, setOverdueReissue] = useState<OverdueReissueInput | null>(null);

  useEffect(() => {
    let active = true;
    getBoletoCompositionAction(transactionId).then(result => {
      if (!active) return;
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      const value = result.composition;
      setComposition(value);
      setForm(compositionToForm(value));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [transactionId]);

  const parsed = useCallback(
    (key: string) => parseNumeroFlexivel(form[key] ?? "") ?? 0,
    [form],
  );
  const preview = useMemo(() => {
    const rent = parsed("rentValue");
    const nominal = [
      rent,
      parsed("iptuValue"),
      parsed("condominiumValue"),
      parsed("waterValue"),
      parsed("electricityValue"),
      parsed("gasValue"),
      parsed("otherValue"),
      parsed("lateFeeAmount"),
      parsed("lateInterestAmount"),
    ].reduce((sum, value) => sum + value, 0);
    const discount = ["PERCENT", "PERCENTAGE", "PERCENTUAL"].includes(
      (form.discountType ?? "").toUpperCase(),
    )
      ? rent * parsed("discountValue") / 100
      : parsed("discountValue");
    return {
      nominal,
      discount,
      withDiscount: Math.max(0, nominal - discount),
    };
  }, [form, parsed]);

  const setField = (key: string, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleCalculateOverdueReissue = () => {
    if (!composition?.canCalculateOverdueReissue) return;
    const originalDueDate = composition.dueDate.slice(0, 10);
    const calculationDate = composition.suggestedReissueDate;
    const baseAmount = composition.nominalTotal
      - composition.lateFeeAmount
      - composition.lateInterestAmount;
    const calculation = calcularEncargosReemissaoVencida({
      baseAmount,
      originalDueDate,
      calculationDate,
      lateFeePercentage: composition.lateFeePercentage,
      lateInterestMonthly: composition.lateInterestMonthly,
    });

    setForm(current => ({
      ...current,
      dueDate: calculationDate,
      discountValue: "0",
      discountDaysBefore: "0",
      lateFeeAmount: numberString(calculation.lateFeeAmount),
      lateInterestAmount: numberString(calculation.lateInterestAmount),
      // A multa já foi incorporada ao valor. Mantê-la faria o Inter cobrá-la novamente.
      lateFeePercentage: "0",
    }));
    setOverdueReissue({
      originalDueDate,
      calculationDate,
      daysLate: calculation.daysLate,
      baseAmount,
      lateFeePercentage: composition.lateFeePercentage,
      lateInterestMonthly: composition.lateInterestMonthly,
    });
    setApplyToContract(false);
    setError(null);
    setSuccess(null);
    setEditing(true);
  };

  const handleCancelEditing = () => {
    if (composition) setForm(compositionToForm(composition));
    setApplyToContract(false);
    setOverdueReissue(null);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await updateBoletoCompositionAction(transactionId, {
      dueDate: form.dueDate,
      rentValue: parsed("rentValue"),
      iptuValue: parsed("iptuValue"),
      condominiumValue: parsed("condominiumValue"),
      waterValue: parsed("waterValue"),
      electricityValue: parsed("electricityValue"),
      gasValue: parsed("gasValue"),
      otherValue: parsed("otherValue"),
      otherDescription: form.otherDescription?.trim() || "Outros",
      lateFeeAmount: parsed("lateFeeAmount"),
      lateInterestAmount: parsed("lateInterestAmount"),
      discountValue: parsed("discountValue"),
      discountType: form.discountType || "FIXED",
      discountDaysBefore: Math.trunc(parsed("discountDaysBefore")),
      lateFeePercentage: parsed("lateFeePercentage"),
      lateInterestMonthly: parsed("lateInterestMonthly"),
      applyToContract,
      iptuPaymentStartDate: form.iptuPaymentStartDate || null,
      iptuInstallments: form.iptuInstallments || null,
      overdueReissue,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess([result.message, result.warning].filter(Boolean).join(" "));
    setEditing(false);
    setOverdueReissue(null);
    onSaved?.();
    const refreshed = await getBoletoCompositionAction(transactionId);
    if (refreshed.success) {
      setComposition(refreshed.composition);
      setForm(compositionToForm(refreshed.composition));
    }
  };

  const components = [
    ["rentValue", "Aluguel"],
    ["iptuValue", "IPTU"],
    ["condominiumValue", "Condomínio"],
    ["waterValue", "Água"],
    ["electricityValue", "Energia"],
    ["gasValue", "Gás"],
  ] as const;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between bg-[#280003] px-6 py-5 text-white">
          <div>
            <h2 className="text-lg font-bold">Composição da cobrança</h2>
            <p className="mt-1 text-xs text-white/70">
              Valores e condições que serão enviados ao Banco Inter
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando composição...
            </div>
          )}

          {error && (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" /> {success}
            </div>
          )}

          {composition && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[#280003]">{composition.description}</p>
                  {editing ? (
                    <label className="mt-2 block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Data de vencimento
                      </span>
                      <input
                        type="date"
                        required
                        value={form.dueDate ?? ""}
                        onChange={event => setField("dueDate", event.target.value)}
                        disabled={Boolean(overdueReissue)}
                        className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-[#280003] disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </label>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Vencimento {new Date(composition.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      {composition.contractCode ? ` · Contrato ${composition.contractCode}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {composition.contractEditUrl && (
                    <a
                      href={composition.contractEditUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-[#004777] hover:bg-gray-50"
                    >
                      Abrir contrato <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {composition.canEdit && !editing && (
                    <>
                      {composition.canCalculateOverdueReissue && (
                        <button
                          type="button"
                          onClick={handleCalculateOverdueReissue}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-[#280003] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                        >
                          <Calculator className="h-4 w-4" /> Calcular reemissão vencida
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#004777] px-3 py-2 text-xs font-bold text-white hover:bg-[#00365c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar composição
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!composition.canEdit && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Esta cobrança está disponível somente para consulta porque não está pendente.
                </div>
              )}
              {composition.canEdit && composition.registeredAtInter && composition.status !== "CANCELADO" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Ao salvar, o boleto atual será cancelado no Banco Inter e um novo será emitido
                  automaticamente com o vencimento e a composição atualizados.
                </div>
              )}
              {overdueReissue && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Reemissão de cobrança vencida</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    Vencimento original {new Date(`${overdueReissue.originalDueDate}T00:00:00.000Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    {` · ${overdueReissue.daysLate} dia(s) em atraso. `}
                    O desconto foi retirado, a multa foi incorporada uma única vez e o contrato não será alterado.
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {components.map(([key, label]) => (
                  <label key={key} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {label}
                    </span>
                    {editing ? (
                      <FormattedNumberInput
                        value={form[key] ?? ""}
                        onValueChange={value => setField(key, value)}
                        format="currency"
                        disabled={Boolean(overdueReissue)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-bold text-[#280003] disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    ) : (
                      <span className="text-base font-bold text-[#280003]">
                        {money.format(composition[key])}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:grid-cols-[1fr_14rem]">
                <Field label="Outros — descrição">
                  {editing ? (
                    <input
                      value={form.otherDescription ?? ""}
                      onChange={event => setField("otherDescription", event.target.value)}
                      maxLength={120}
                      disabled={Boolean(overdueReissue)}
                      placeholder="Ex.: taxa extraordinária"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  ) : composition.otherDescription || "Outros"}
                </Field>
                <Field label="Outros — valor">
                  {editing ? (
                    <FormattedNumberInput
                      value={form.otherValue ?? ""}
                      onValueChange={value => setField("otherValue", value)}
                      format="currency"
                      disabled={Boolean(overdueReissue)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  ) : money.format(composition.otherValue)}
                </Field>
              </div>

              {(overdueReissue || parsed("lateFeeAmount") > 0 || parsed("lateInterestAmount") > 0) && (
                <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:grid-cols-2">
                  <Field label="Multa acumulada">
                    {money.format(parsed("lateFeeAmount"))}
                  </Field>
                  <Field label="Juros acumulados">
                    {money.format(parsed("lateInterestAmount"))}
                  </Field>
                </div>
              )}

              {composition.iptuValue > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-[#004777]">
                  IPTU incluído
                  {composition.competence ? ` na competência ${composition.competence}` : ""}
                  {composition.iptuInstallment
                    ? ` · parcela ${composition.iptuInstallment}/${composition.iptuInstallmentsOnCharge ?? composition.iptuInstallments ?? "?"}`
                    : ""}
                </div>
              )}

              <div className="rounded-2xl border border-gray-100 p-4">
                <h3 className="mb-3 text-sm font-bold text-[#280003]">Desconto, multa e juros</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Desconto">
                    {editing ? (
                      <FormattedNumberInput value={form.discountValue ?? ""} onValueChange={v => setField("discountValue", v)} format={["PERCENT", "PERCENTAGE", "PERCENTUAL"].includes(form.discountType) ? "percentage" : "currency"} disabled={Boolean(overdueReissue)} className="w-full rounded-xl border border-gray-200 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" />
                    ) : ["PERCENT", "PERCENTAGE", "PERCENTUAL"].includes(composition.discountType)
                      ? `${composition.discountValue.toLocaleString("pt-BR")}% (${money.format(composition.effectiveDiscount)})`
                      : money.format(composition.discountValue)}
                  </Field>
                  <Field label="Tipo">
                    {editing ? (
                      <select value={form.discountType} onChange={e => setField("discountType", e.target.value)} disabled={Boolean(overdueReissue)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500">
                        <option value="FIXED">Valor fixo</option>
                        <option value="PERCENT">Percentual</option>
                      </select>
                    ) : ["PERCENT", "PERCENTAGE", "PERCENTUAL"].includes(composition.discountType) ? "Percentual" : "Valor fixo"}
                  </Field>
                  <Field label="Antecedência">
                    {editing ? <input type="number" min={0} value={form.discountDaysBefore} onChange={e => setField("discountDaysBefore", e.target.value)} disabled={Boolean(overdueReissue)} className="w-full rounded-xl border border-gray-200 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" /> : `${composition.discountDaysBefore} dia(s)`}
                  </Field>
                  <Field label="Multa">
                    {editing ? <FormattedNumberInput value={form.lateFeePercentage ?? ""} onValueChange={v => setField("lateFeePercentage", v)} format="percentage" disabled={Boolean(overdueReissue)} className="w-full rounded-xl border border-gray-200 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" /> : `${composition.lateFeePercentage.toLocaleString("pt-BR")}%`}
                  </Field>
                  <Field label="Juros ao mês">
                    {editing ? <FormattedNumberInput value={form.lateInterestMonthly ?? ""} onValueChange={v => setField("lateInterestMonthly", v)} format="percentage" decimals={4} disabled={Boolean(overdueReissue)} className="w-full rounded-xl border border-gray-200 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" /> : `${composition.lateInterestMonthly.toLocaleString("pt-BR")}%`}
                  </Field>
                </div>
              </div>

              {editing && parsed("iptuValue") > 0 && applyToContract && (
                <div className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2">
                  <Field label="Primeira competência do IPTU">
                    <input type="date" value={form.iptuPaymentStartDate} onChange={e => setField("iptuPaymentStartDate", e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2" />
                  </Field>
                  <Field label="Quantidade de parcelas">
                    <input type="number" min={1} value={form.iptuInstallments} onChange={e => setField("iptuInstallments", e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2" />
                  </Field>
                </div>
              )}

              <div className="grid gap-3 rounded-2xl bg-[#280003] p-4 text-white sm:grid-cols-3">
                <Summary label="Total nominal" value={editing ? preview.nominal : composition.nominalTotal} />
                <Summary label="Desconto até a data" value={editing ? preview.discount : composition.effectiveDiscount} />
                <Summary label="Total com desconto" value={editing ? preview.withDiscount : composition.totalWithDiscount} />
              </div>

              <div className="rounded-2xl border border-[#004777]/20 bg-[#004777]/5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#004777]">
                    {composition.interMessageSent
                      ? "Mensagem enviada ao Banco Inter"
                      : "Prévia da mensagem para o Banco Inter"}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    até 5 linhas · 78 caracteres
                  </span>
                </div>
                <div className="space-y-1 rounded-xl bg-white p-3 font-mono text-xs text-gray-700">
                  {composition.interMessage.map((line, index) => (
                    <div key={`${index}-${line}`}>
                      <span className="mr-2 select-none text-gray-400">{index + 1}.</span>
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {editing && (
                <>
                  {composition.canUpdateContract && !overdueReissue && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <input type="checkbox" checked={applyToContract} onChange={e => setApplyToContract(e.target.checked)} className="mt-0.5 h-4 w-4" />
                      <span>
                        <span className="block text-sm font-bold text-[#004777]">Atualizar também o contrato</span>
                        <span className="block text-xs text-gray-600">Use estes valores e o novo dia de vencimento como padrão nas próximas cobranças. Desmarcado, altera somente esta cobrança.</span>
                      </span>
                    </label>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={handleCancelEditing} disabled={saving} className="min-h-11 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]">
                      Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#280003] px-5 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777] disabled:opacity-50">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {overdueReissue ? "Salvar e emitir novo boleto" : "Salvar alterações"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <div className="text-sm font-semibold text-[#280003]">{children}</div>
    </label>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wide text-white/60">{label}</span>
      <span className="mt-1 block text-lg font-black">{money.format(value)}</span>
    </div>
  );
}
