export type TenantOption = {
  id: string;
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: unknown;
};

export type PersonTenant = {
  id: string;
  name: string;
  cpfCnpj: string;
  email: string | null;
  phones: { phone: string }[];
};

export function mergeTenantOptions(legacy: TenantOption[], persons: PersonTenant[]): TenantOption[] {
  const documents = new Set(legacy.map((tenant) => tenant.cpfCnpj.replace(/\D/g, "")).filter(Boolean));
  const ids = new Set(legacy.map((tenant) => tenant.id));
  const result = [...legacy];
  for (const person of persons) {
    const document = person.cpfCnpj.replace(/\D/g, "");
    if (ids.has(person.id) || (document && documents.has(document))) continue;
    result.push({
      id: person.id, nome: person.name, cpfCnpj: person.cpfCnpj,
      email: person.email ?? "",
      telefone: person.phones.map(({ phone }) => ({ numero: phone })),
    });
    ids.add(person.id);
    if (document) documents.add(document);
  }
  return result.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
