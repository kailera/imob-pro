import { isValidCpfCnpj } from "@/lib/document-validation";

export type InterReadinessIssue = {
  code: string;
  group: "CONTRATO" | "INQUILINO" | "IMOVEL";
  message: string;
};

type AddressInput = {
  cep?: string | number | null;
  logradouro?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  cidade?: string | null;
  estado?: string | null;
  uf?: string | null;
};

type PropertyInput = AddressInput & {
  descricao?: string | null;
};

function texto(value: unknown) {
  return String(value ?? "").trim();
}

function cep(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return typeof value === "number" && digits
    ? digits.padStart(8, "0")
    : digits;
}

function logradouroImovel(property: PropertyInput | null | undefined) {
  if (!property) return "";
  if (texto(property.logradouro)) return texto(property.logradouro);
  const importedAddress = texto(property.descricao)
    .replace(/^Endereço completo importado:\s*/i, "")
    .trim();
  return importedAddress;
}

export function resolverEnderecoPagadorInter(input: {
  tenantAddress?: AddressInput | null;
  property?: PropertyInput | null;
}) {
  const tenant = input.tenantAddress;
  const property = input.property;
  const tenantHasBaseAddress = Boolean(texto(tenant?.logradouro))
    && cep(tenant?.cep).length === 8;

  if (tenantHasBaseAddress) {
    return {
      source: "INQUILINO" as const,
      logradouro: texto(tenant?.logradouro),
      cep: cep(tenant?.cep),
      bairro: texto(tenant?.bairro),
      cidade: texto(tenant?.municipio ?? tenant?.cidade),
      estado: texto(tenant?.estado ?? tenant?.uf),
    };
  }

  return {
    source: "IMOVEL" as const,
    logradouro: logradouroImovel(property),
    cep: cep(property?.cep),
    bairro: texto(property?.bairro),
    cidade: texto(property?.municipio ?? property?.cidade),
    estado: texto(property?.estado ?? property?.uf),
  };
}

export function listarPendenciasInter(input: {
  tenant?: {
    nome?: string | null;
    cpfCnpj?: string | null;
    address?: AddressInput | null;
  } | null;
  property?: PropertyInput | null;
}) {
  const issues: InterReadinessIssue[] = [];
  const tenant = input.tenant;
  const document = texto(tenant?.cpfCnpj).replace(/\D/g, "");

  if (!tenant) {
    issues.push({
      code: "TENANT_REQUIRED",
      group: "INQUILINO",
      message: "Defina o locatário principal do contrato.",
    });
  } else {
    if (!texto(tenant.nome)) {
      issues.push({
        code: "TENANT_NAME_REQUIRED",
        group: "INQUILINO",
        message: "Informe o nome do locatário principal.",
      });
    }
    if (!document) {
      issues.push({
        code: "TENANT_DOCUMENT_REQUIRED",
        group: "INQUILINO",
        message: "Informe o CPF/CNPJ do locatário principal.",
      });
    } else if (!isValidCpfCnpj(document)) {
      issues.push({
        code: "TENANT_DOCUMENT_INVALID",
        group: "INQUILINO",
        message: "Corrija o CPF/CNPJ do locatário principal; os dígitos verificadores são inválidos.",
      });
    }
  }

  if (!input.property) {
    issues.push({
      code: "PROPERTY_REQUIRED",
      group: "IMOVEL",
      message: "Vincule um imóvel ao contrato.",
    });
    return issues;
  }

  const address = resolverEnderecoPagadorInter({
    tenantAddress: tenant?.address,
    property: input.property,
  });
  if (!address.logradouro) {
    issues.push({
      code: "PAYER_STREET_REQUIRED",
      group: "IMOVEL",
      message: "Informe o logradouro do locatário ou do imóvel.",
    });
  }
  if (address.cep.length !== 8 || address.cep === "00000000") {
    issues.push({
      code: "PAYER_ZIP_INVALID",
      group: "IMOVEL",
      message: "Informe um CEP válido, com 8 dígitos, para o locatário ou imóvel.",
    });
  }
  if (!address.bairro) {
    issues.push({
      code: "PAYER_DISTRICT_REQUIRED",
      group: "IMOVEL",
      message: "Informe o bairro do endereço usado na cobrança.",
    });
  }
  if (!address.cidade) {
    issues.push({
      code: "PAYER_CITY_REQUIRED",
      group: "IMOVEL",
      message: "Informe a cidade do endereço usado na cobrança.",
    });
  }
  if (address.estado.length !== 2) {
    issues.push({
      code: "PAYER_STATE_INVALID",
      group: "IMOVEL",
      message: "Informe a UF do endereço usado na cobrança com 2 letras.",
    });
  }

  return issues;
}
