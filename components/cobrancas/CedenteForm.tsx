import React from 'react';
import { User, ArrowLeft, Save, X, Plus, Edit, Trash2, Building } from 'lucide-react';

export default function CedenteForm() {
  const contas = [
    {
      id: 1,
      banco: '077 - Banco Inter',
      agencia: '0001-9',
      conta: '45033751-0',
      tipo: 'Corrente',
      codBeneficiario: '45033751',
      inativa: 'Não'
    }
  ];

  return (
    <div className="w-full space-y-6">
      {/* Voltar */}
      <div>
        <button className="flex items-center gap-2 bg-[#004777] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#00385e] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <User className="w-5 h-5 text-[#280003]" />
          <h2 className="text-lg font-bold text-[#280003]">Dados do cedente</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-[#280003]/70">Nome*</label>
              <input type="text" defaultValue="Imob Pro Ltda" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-[#280003]/70">Nome fantasia*</label>
              <input type="text" defaultValue="Imob Pro" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-[#280003]/70">CPF/CNPJ*</label>
              <input type="text" defaultValue="50.671.836/0001-40" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-[#280003]/70">CEP*</label>
              <input type="text" defaultValue="15.385-122" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
            </div>

            {/* Row with 3 elements */}
            <div className="flex flex-col space-y-1 md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="flex flex-col space-y-1 md:col-span-5">
                  <label className="text-xs font-medium text-[#280003]/70">Logradouro*</label>
                  <input type="text" defaultValue="Passeio Cristalina" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
                </div>
                <div className="flex flex-col space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-[#280003]/70">Número*</label>
                  <input type="text" defaultValue="113" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
                </div>
                <div className="flex flex-col space-y-1 md:col-span-5">
                  <label className="text-xs font-medium text-[#280003]/70">Complemento</label>
                  <input type="text" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-[#280003]/70">Bairro*</label>
              <input type="text" defaultValue="Zona Norte" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-[#280003]/70">Código IBGE município*</label>
              <input type="text" defaultValue="3520442" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-[#280003]/70">Telefone*</label>
              <input type="text" defaultValue="(18) 99694 2082" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-[#280003]/70">E-mail*</label>
              <input type="email" defaultValue="contato@imobpro.com.br" className="bg-[#EEEEF3]/50 border border-gray-200 rounded-md p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
            </div>
          </div>
        </div>
      </div>

      {/* Contas Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-[#280003]" />
            <h2 className="text-lg font-bold text-[#280003]">Contas Bancárias</h2>
          </div>
        </div>
        
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <button className="flex items-center gap-2 bg-[#425cc7] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#344b9e] transition-colors">
            <Plus className="w-4 h-4" />
            Cadastrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 font-semibold text-[#280003]/80">Banco</th>
                <th className="px-6 py-4 font-semibold text-[#280003]/80">Agência</th>
                <th className="px-6 py-4 font-semibold text-[#280003]/80">Conta</th>
                <th className="px-6 py-4 font-semibold text-[#280003]/80">Tipo</th>
                <th className="px-6 py-4 font-semibold text-[#280003]/80">Cód. Beneficiário</th>
                <th className="px-6 py-4 font-semibold text-[#280003]/80">Inativa</th>
                <th className="px-6 py-4 font-semibold text-[#280003]/80 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contas.map((conta) => (
                <tr key={conta.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-[#280003]">{conta.banco}</td>
                  <td className="px-6 py-4 text-[#280003]">{conta.agencia}</td>
                  <td className="px-6 py-4 text-[#280003]">{conta.conta}</td>
                  <td className="px-6 py-4 text-[#280003]">{conta.tipo}</td>
                  <td className="px-6 py-4 text-[#280003]">{conta.codBeneficiario}</td>
                  <td className="px-6 py-4 text-[#280003]">{conta.inativa}</td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button className="p-2 bg-[#425cc7] text-white rounded hover:bg-[#344b9e] transition-colors shadow-sm">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-[#DC2626] text-white rounded hover:bg-[#B91C1C] transition-colors shadow-sm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button className="flex items-center gap-2 bg-[#004777] text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-[#00385e] transition-colors shadow-sm">
          <Save className="w-4 h-4" />
          Salvar
        </button>
        <button className="flex items-center gap-2 bg-[#DC2626] text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-[#B91C1C] transition-colors shadow-sm">
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
