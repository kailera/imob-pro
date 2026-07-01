import React from 'react';
import { DollarSign, CheckCircle, FileText, XCircle, Clock } from 'lucide-react';

interface SummaryProps {
  totals: {
    registrado: number;
    liquidado: number;
    baixado: number;
    recepcionado: number;
    cancelado: number;
  };
}

export default function FinancialSummary({ totals }: SummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const cards = [
    { title: 'Registrado', value: totals.registrado, icon: <FileText className="h-5 w-5 text-gray-500" />, color: 'bg-gray-100 text-gray-600' },
    { title: 'Liquidado', value: totals.liquidado, icon: <CheckCircle className="h-5 w-5 text-[#708D81]" />, color: 'bg-[#708D81]/10 text-[#708D81]' },
    { title: 'Baixado', value: totals.baixado, icon: <DollarSign className="h-5 w-5 text-blue-500" />, color: 'bg-blue-50 text-blue-600' },
    { title: 'Recepcionado', value: totals.recepcionado, icon: <Clock className="h-5 w-5 text-[#D4A017]" />, color: 'bg-[#F0D18A]/20 text-[#D4A017]' },
    { title: 'Cancelado', value: totals.cancelado, icon: <XCircle className="h-5 w-5 text-red-500" />, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full mt-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm p-5 flex flex-col items-start border border-transparent hover:border-gray-100 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2 rounded-lg ${card.color}`}>
              {card.icon}
            </div>
            <span className="text-sm font-medium text-gray-600">{card.title}</span>
          </div>
          <span className="text-2xl font-bold text-[#280003]">
            {formatCurrency(card.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
