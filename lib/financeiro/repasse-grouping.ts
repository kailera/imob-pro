import type { RepasseItem, RepasseOwner } from "./repasse-types";

export interface RepasseOwnerGroup {
  key: string;
  owner: RepasseOwner;
  items: RepasseItem[];
  grossTotal: number;
  adminFeeTotal: number;
  deductionTotal: number;
  netTotal: number;
  receivedCount: number;
  missingBankData: boolean;
}

function ownerGroupKey(item: RepasseItem): string {
  if (item.owner.id && item.owner.id !== "sem-proprietario") return `id:${item.owner.id}`;

  const document = item.owner.cpfCnpj.replace(/\D/g, "");
  if (document) return `document:${document}`;

  // Imóveis sem proprietário identificado não devem ser unidos como se
  // pertencessem à mesma pessoa.
  return `unidentified:${item.key}`;
}

export function groupRepassesByOwner(items: RepasseItem[]): RepasseOwnerGroup[] {
  const groups = new Map<string, RepasseOwnerGroup>();

  for (const item of items) {
    const key = ownerGroupKey(item);
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      existing.grossTotal += item.grossValue;
      existing.adminFeeTotal += item.adminFeeValue;
      existing.deductionTotal += item.deductionTotal;
      existing.netTotal += item.netValue;
      if (item.receivedAt) existing.receivedCount += 1;
      continue;
    }

    groups.set(key, {
      key,
      owner: item.owner,
      items: [item],
      grossTotal: item.grossValue,
      adminFeeTotal: item.adminFeeValue,
      deductionTotal: item.deductionTotal,
      netTotal: item.netValue,
      receivedCount: item.receivedAt ? 1 : 0,
      missingBankData: !item.owner.pixKey && !item.owner.bankAccount,
    });
  }

  return Array.from(groups.values());
}
