export type RepasseStatus = "AGUARDANDO_RECEBIMENTO" | "PRONTO" | "PENDENTE" | "PAGO";

export interface RepasseOwner {
  id: string;
  name: string;
  cpfCnpj: string;
  participation: number | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  pixKey: string | null;
}

export interface RepasseDeduction {
  id: string;
  type: "BONIFICACAO" | "MANUTENCAO" | "DESPESA";
  description: string;
  value: number;
  selected: boolean;
}

export interface RepasseOtherDeduction {
  id: string;
  description: string;
  value: number;
}

export interface RepasseOtherAddition {
  id: string;
  description: string;
  value: number;
}

export interface RepasseNewMaintenance {
  id: string;
  description: string;
  maintenanceDate: string;
  value: number;
  status: "EM_ANDAMENTO" | "FINALIZADA";
  deductFromOwner: boolean;
}

export type RepasseOperationType =
  | "ALUGUEL"
  | "CONTA"
  | "TAXA_ADMINISTRACAO"
  | "MANUTENCAO"
  | "DESCONTO"
  | "ACRESCIMO"
  | "REPASSE";

export interface RepasseOperation {
  id: string;
  type: RepasseOperationType;
  description: string;
  date: string | null;
  value: number;
  direction: "CREDITO" | "DEBITO" | "INFORMATIVO";
  propertyId: string | null;
  propertyCode: string | null;
}

export interface RepasseItem {
  key: string;
  leaseId: string;
  legacyContractId: string | null;
  rentTransactionId: string | null;
  repasseId: string | null;
  competence: string;
  contractCode: string;
  owner: RepasseOwner;
  additionalOwners: RepasseOwner[];
  tenantNames: string[];
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  propertyAddress: string;
  residential: { id: string; name: string } | null;
  rentValue: number;
  chargeTotal: number;
  grossValue: number;
  receivedAt: string | null;
  adminFeePercent: number;
  adminFeeValue: number;
  deductions: RepasseDeduction[];
  otherDeductions: RepasseOtherDeduction[];
  otherAdditions: RepasseOtherAddition[];
  additionTotal: number;
  deductionTotal: number;
  netValue: number;
  transferDueDate: string | null;
  paidAt: string | null;
  status: RepasseStatus;
  operations: RepasseOperation[];
}

export interface RepasseResidentialReport {
  id: string;
  name: string;
  ownerNames: string[];
  propertyCount: number;
  receivedCount: number;
  rentTotal: number;
  chargeTotal: number;
  grossTotal: number;
  adminFeeTotal: number;
  additionTotal: number;
  deductionTotal: number;
  maintenanceTotal: number;
  netRepasseTotal: number;
  globalResult: number;
  operations: RepasseOperation[];
}

export interface RepasseCompany {
  name: string;
  legalName: string | null;
  cnpj: string | null;
  creci: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  address: string;
}

export interface RepasseSummary {
  contracts: number;
  received: number;
  grossTotal: number;
  adminFeeTotal: number;
  additionTotal: number;
  deductionTotal: number;
  netTotal: number;
}

export interface RepasseListResponse {
  success: true;
  data: RepasseItem[];
  company: RepasseCompany;
  summary: RepasseSummary;
  residentialReports: RepasseResidentialReport[];
}

export interface RepasseUpdateInput {
  leaseId: string;
  legacyContractId: string | null;
  rentTransactionId: string;
  repasseId: string | null;
  competence: string;
  adminFeePercent: number;
  selectedDeductionIds: string[];
  otherDeductions: RepasseOtherDeduction[];
  otherAdditions: RepasseOtherAddition[];
  newMaintenances: RepasseNewMaintenance[];
  transferDueDate: string | null;
}
