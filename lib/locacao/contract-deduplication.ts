type TenantWithCpf = {
  cpfCnpj?: string | null;
};

export type CanonicalLeaseForDeduplication = {
  id: string;
  code?: string | null;
  legacyCode?: string | null;
  propertyId?: string | null;
  status?: string | null;
  termsPeriods?: Array<{ reviewStatus?: string | null }>;
  parties?: Array<{
    role?: string | null;
    person?: TenantWithCpf | null;
  }>;
};

export type LegacyContractForDeduplication = {
  id: string;
  imovelId?: string | null;
  locatarios?: TenantWithCpf[];
};

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function isCompleteCanonicalLease(
  lease: CanonicalLeaseForDeduplication,
) {
  const hasIdentity = Boolean(lease.propertyId) && lease.parties?.some(
    (party) => party.role === "TENANT" && digits(party.person?.cpfCnpj),
  );
  if (!hasIdentity) return false;

  // Um contrato inativado deve continuar sendo a referência canônica mesmo
  // sem histórico revisado, para o legado não reaparecer nem voltar a cobrar.
  if (lease.status === "SUSPENDED") return true;

  return lease.status === "ACTIVE"
    && Boolean(lease.termsPeriods?.length)
    && lease.termsPeriods!.every(
      (period) => period.reviewStatus === "REVIEWED",
    );
}

export function findCompleteLeaseForLegacyContract(
  legacy: LegacyContractForDeduplication,
  leases: CanonicalLeaseForDeduplication[],
) {
  // O vínculo gravado pela migração é a identidade mais forte disponível.
  // Mesmo que o contrato canônico ainda esteja incompleto, o legado não pode
  // voltar a ser fonte de cobrança para o mesmo contrato.
  const directMatch = leases.find((lease) => lease.legacyCode === legacy.id);
  if (directMatch) return directMatch;

  const legacyCpfs = new Set(
    (legacy.locatarios ?? [])
      .map((tenant) => digits(tenant.cpfCnpj))
      .filter(Boolean),
  );
  if (!legacy.imovelId || legacyCpfs.size === 0) return null;

  const matches = leases.filter((lease) => {
    if (!isCompleteCanonicalLease(lease)) return false;
    if (lease.propertyId !== legacy.imovelId) return false;
    return lease.parties!.some(
      (party) =>
        party.role === "TENANT" &&
        legacyCpfs.has(digits(party.person?.cpfCnpj)),
    );
  });

  return matches.length === 1 ? matches[0] : null;
}

export function removeLegacyDuplicatesWithCompleteLease<
  T extends LegacyContractForDeduplication,
>(
  legacyContracts: T[],
  leases: CanonicalLeaseForDeduplication[],
) {
  return legacyContracts.filter(
    (legacy) => !findCompleteLeaseForLegacyContract(legacy, leases),
  );
}
