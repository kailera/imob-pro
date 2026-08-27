export type InterTransactionTenantSource = {
  contrato?: { imobId?: string | null } | null;
  lease?: { tenantId?: string | null } | null;
  imovel?: { imobId?: string | null } | null;
};

export function resolveInterTransactionTenantId(
  transaction: InterTransactionTenantSource,
) {
  return transaction.contrato?.imobId
    ?? transaction.lease?.tenantId
    ?? transaction.imovel?.imobId
    ?? null;
}
