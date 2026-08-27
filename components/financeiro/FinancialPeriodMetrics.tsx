import {
  BadgeCheck,
  Barcode,
  Building2,
  ReceiptText,
} from "lucide-react";

export type FinancialPeriodMetricsData = {
  activeContracts: number;
  contractCharges: number;
  generatedBills: number;
  settledBills: number;
};

type FinancialPeriodMetricsProps = {
  data: FinancialPeriodMetricsData;
  periodLabel: string;
  loading?: boolean;
  error?: string | null;
  layout?: "list" | "grid";
};

const METRICS = [
  {
    key: "activeContracts" as const,
    label: "Contratos ativos",
    icon: Building2,
    tone: "bg-[#004777]/10 text-[#004777]",
  },
  {
    key: "contractCharges" as const,
    label: "Cobranças contratuais",
    icon: ReceiptText,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    key: "generatedBills" as const,
    label: "Boletos gerados",
    icon: Barcode,
    tone: "bg-sky-50 text-sky-700",
  },
  {
    key: "settledBills" as const,
    label: "Boletos liquidados",
    icon: BadgeCheck,
    tone: "bg-emerald-50 text-emerald-700",
  },
];

export function FinancialPeriodMetrics({
  data,
  periodLabel,
  loading = false,
  error,
  layout = "list",
}: FinancialPeriodMetricsProps) {
  return (
    <aside
      aria-label={`Indicadores operacionais de ${periodLabel}`}
      className="rounded-3xl border border-white/60 bg-white p-5 shadow-sm"
      data-slot="financial-period-metrics"
    >
      <div className="border-b border-[#EEEEF3] pb-3">
        <h2 className="text-sm font-bold text-[#280003]">Indicadores do período</h2>
        <p className="mt-1 text-xs text-gray-500">{periodLabel}</p>
      </div>

      {error ? (
        <p role="alert" className="py-5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        <dl className={layout === "grid" ? "mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" : "divide-y divide-[#EEEEF3]"}>
          {METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.key}
                className={layout === "grid"
                  ? "flex min-h-20 items-center gap-3 rounded-2xl border border-[#EEEEF3] bg-[#FAFAFC] px-4 py-3"
                  : "flex min-h-16 items-center gap-3 py-3"}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <dt className="min-w-0 flex-1 text-xs font-medium leading-4 text-gray-600">
                  {metric.label}
                </dt>
                <dd className="text-xl font-extrabold tabular-nums text-[#280003]" aria-busy={loading}>
                  {loading ? "—" : data[metric.key].toLocaleString("pt-BR")}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </aside>
  );
}
