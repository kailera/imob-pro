"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLegacyContrato } from "../actions/deleteLegacyContrato.action";
import type { LegacyContractDeletionInfo } from "@/lib/locacao/legacy-contract-deletion";

type LegacyContractActionsProps = {
  contractId: string;
  deletionInfo?: LegacyContractDeletionInfo;
  isEditing?: boolean;
  redirectAfterDelete?: string;
  compact?: boolean;
};

export function LegacyContractActions({
  contractId,
  deletionInfo,
  isEditing = false,
  redirectAfterDelete,
  compact = false,
}: LegacyContractActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const editHref = isEditing
    ? `/locacao/view-locacao/${contractId}`
    : `/locacao/view-locacao/${contractId}?edit=true`;

  const handleDelete = () => {
    if (deletionInfo && !deletionInfo.canDelete) {
      setMessage(deletionInfo.blockedReason ?? "Este contrato não pode ser excluído.");
      return;
    }

    const transactionNotice = deletionInfo?.transactions
      ? `\n\n${deletionInfo.transactions} cobrança(s) já existente(s) serão preservadas no financeiro, sem vínculo com o contrato.`
      : "";
    const documentNotice = deletionInfo?.documents
      ? `\n${deletionInfo.documents} grupo(s) de documento(s) legado(s) deixarão de aparecer no sistema.`
      : "";
    const confirmed = window.confirm(
      `Excluir permanentemente este contrato legado?\n\nOs dados de vigência, períodos e participantes do legado serão removidos. Essa ação não pode ser desfeita.${transactionNotice}${documentNotice}`,
    );
    if (!confirmed) return;

    setMessage(null);
    startTransition(async () => {
      const result = await deleteLegacyContrato(contractId);
      setMessage(result.message);
      if (!result.success) return;
      if (redirectAfterDelete) {
        router.push(redirectAfterDelete);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "justify-end md:justify-start" : ""}`} data-slot="legacy-contract-actions">
      <Link
        href={editHref}
        className={compact
          ? "inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          : "inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004777] px-4 text-xs font-semibold text-white hover:bg-[#003355] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777] focus-visible:ring-offset-2"
        }
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        {isEditing ? "Concluir edição" : "Editar legado"}
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-describedby={message ? `legacy-delete-message-${contractId}` : undefined}
        className={compact
          ? "inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          : "inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Excluindo..." : "Excluir legado"}
      </button>
      {message && (
        <p
          id={`legacy-delete-message-${contractId}`}
          role="status"
          className="w-full text-xs font-medium text-red-700"
        >
          {message}
        </p>
      )}
    </div>
  );
}
