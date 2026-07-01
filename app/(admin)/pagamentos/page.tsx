import { Metadata } from "next";
import PaymentsFilterBar from "@/components/PaymentsFilterBar";
import PaymentsTable, { PaymentData } from "@/components/PaymentsTable";

export const metadata: Metadata = {
  title: "Pagamentos e Emissão de NF-e | Imob Pro",
};

const mockedPayments: PaymentData[] = [
  {
    id: "1",
    ownerName: "João Carlos Silva",
    ownerCpf: "123.456.789-00",
    propertyRef: "Apt 402 - Edifício Monte Carlo",
    competence: "Junho/2026",
    grossValue: 2500.00,
    admFeeString: "10% (R$ 250,00)",
    netValue: 2250.00,
    paymentStatus: "Pago",
    nfeStatus: "Emitida",
  },
  {
    id: "2",
    ownerName: "Maria Antonieta Ramos",
    ownerCpf: "987.654.321-11",
    propertyRef: "Casa 12 - Jd. Botânico",
    competence: "Junho/2026",
    grossValue: 4500.00,
    admFeeString: "8% (R$ 360,00)",
    netValue: 4140.00,
    paymentStatus: "Pendente",
    nfeStatus: "Aguardando",
  },
  {
    id: "3",
    ownerName: "Roberto Almeida Junior",
    ownerCpf: "456.123.789-22",
    propertyRef: "Sala Com. 301 - Business Center",
    competence: "Maio/2026",
    grossValue: 8000.00,
    admFeeString: "10% (R$ 800,00)",
    netValue: 7200.00,
    paymentStatus: "Pago",
    nfeStatus: "Pendente",
  },
  {
    id: "4",
    ownerName: "Fernanda Costa Souza",
    ownerCpf: "321.654.987-33",
    propertyRef: "Apt 101 - Residencial Boa Vista",
    competence: "Junho/2026",
    grossValue: 1800.00,
    admFeeString: "10% (R$ 180,00)",
    netValue: 1620.00,
    paymentStatus: "Pendente",
    nfeStatus: "Erro na NF-e",
  },
  {
    id: "5",
    ownerName: "Antônio Carlos Mendes",
    ownerCpf: "111.222.333-44",
    propertyRef: "Casa - Cond. Vila Rica",
    competence: "Maio/2026",
    grossValue: 12500.00,
    admFeeString: "8% (R$ 1.000,00)",
    netValue: 11500.00,
    paymentStatus: "Pago",
    nfeStatus: "Pendente",
  }
];

export default function PagamentosPage() {
  return (
    <div className="flex-1 bg-[#EEEEF3] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#280003]">Pagamentos e Emissão de NF-e</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie repasses a proprietários e emita as notas fiscais de taxa de administração.
            </p>
          </div>
        </div>

        {/* Barra de Filtros */}
        <PaymentsFilterBar />

        {/* Tabela de Pagamentos */}
        <PaymentsTable payments={mockedPayments} />

      </div>
    </div>
  );
}
