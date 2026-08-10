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
  type: "MANUTENCAO" | "DESPESA";
  description: string;
  value: number;
  selected: boolean;
}

export interface RepasseOtherDeduction {
  id: string;
  description: string;
  value: number;
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
  rentValue: number;
  grossValue: number;
  receivedAt: string | null;
  adminFeePercent: number;
  adminFeeValue: number;
  deductions: RepasseDeduction[];
  otherDeductions: RepasseOtherDeduction[];
  deductionTotal: number;
  netValue: number;
  transferDueDate: string | null;
  paidAt: string | null;
  status: RepasseStatus;
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
  deductionTotal: number;
  netTotal: number;
}

export interface RepasseListResponse {
  success: true;
  data: RepasseItem[];
  company: RepasseCompany;
  summary: RepasseSummary;
}

export interface RepasseUpdateInput {
  leaseId: string;
  rentTransactionId: string;
  repasseId: string | null;
  competence: string;
  adminFeePercent: number;
  selectedDeductionIds: string[];
  otherDeductions: RepasseOtherDeduction[];
  transferDueDate: string | null;
}
