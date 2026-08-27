export type LegacyContractDeletionInput = {
  transactions: number;
  maintenances: number;
  inspectionLinks: number;
  documents: number;
};

export type LegacyContractDeletionInfo = LegacyContractDeletionInput & {
  canDelete: boolean;
  blockedReason: string | null;
};

export function hasLegacyDocument(value: unknown) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim().length > 0;
}

export function getLegacyContractDeletionInfo(
  input: LegacyContractDeletionInput,
): LegacyContractDeletionInfo {
  const blockers: string[] = [];
  if (input.maintenances > 0) {
    blockers.push(`${input.maintenances} manutenção(ões)`);
  }
  if (input.inspectionLinks > 0) {
    blockers.push(`${input.inspectionLinks} vínculo(s) de vistoria`);
  }

  return {
    ...input,
    canDelete: blockers.length === 0,
    blockedReason: blockers.length
      ? `Antes de excluir, remova ou transfira: ${blockers.join(" e ")}.`
      : null,
  };
}
