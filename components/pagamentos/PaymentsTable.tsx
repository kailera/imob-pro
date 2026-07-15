import { FileText, Eye, Download } from "lucide-react";

export interface PaymentData {
  id: string;
  ownerName: string;
  ownerCpf: string;
  propertyRef: string;
  competence: string;
  grossValue: number;
  admFeeString: string;
  netValue: number;
  paymentStatus: "Pago" | "Pendente";
  nfeStatus: "Emitida" | "Aguardando" | "Erro na NF-e" | "Pendente";
}

interface PaymentsTableProps {
  payments: PaymentData[];
}

export default function PaymentsTable({ payments }: PaymentsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "Pago":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#708D81]/10 text-[#708D81]">
            Pago
          </span>
        );
      case "Pendente":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0D18A]/20 text-yellow-800">
            Pendente
          </span>
        );
    }
  };

  const getNfeBadge = (status: string) => {
    switch (status) {
      case "Emitida":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#708D81]/10 text-[#708D81]">
            Emitida
          </span>
        );
      case "Aguardando":
      case "Pendente":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
      case "Erro na NF-e":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
            Erro na NF-e
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100/50">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-white">
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Proprietário
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Imóvel Referência
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Competência
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Valor Bruto
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Taxa Adm
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Valor Líquido
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Status Pagamento
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Status NF-e
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-[#280003]">
                    {payment.ownerName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {payment.ownerCpf}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">
                    {payment.propertyRef}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">
                    {payment.competence}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-700">
                    {formatCurrency(payment.grossValue)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-500">
                    {payment.admFeeString}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-[#280003]">
                    {formatCurrency(payment.netValue)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getPaymentBadge(payment.paymentStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getNfeBadge(payment.nfeStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {payment.nfeStatus === "Emitida" ? (
                      <>
                        <button
                          className="inline-flex items-center p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Visualizar NF-e"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="inline-flex items-center p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Baixar NF-e"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-[#004777] hover:bg-[#00385e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004777] transition-colors">
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Emitir NF-e
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
