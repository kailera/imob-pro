import React from 'react';
import { User, Building2, Search } from 'lucide-react';

interface SelectionCardProps {
  title: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  onToggle: () => void;
}

function SelectionCard({ title, name, description, icon, onToggle }: SelectionCardProps) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#280003]/60 mb-2">{title}</h3>
      <div className="flex items-center justify-between p-3 border border-[#EEEEF3] rounded-xl bg-white shadow-sm hover:border-[#004777]/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EEEEF3] flex items-center justify-center text-[#004777]">
            {icon}
          </div>
          <div>
            <p className="font-semibold text-[#280003] text-sm">{name}</p>
            <p className="text-xs text-[#280003]/60">{description}</p>
          </div>
        </div>
        <button 
          onClick={onToggle}
          className="text-xs font-semibold text-[#004777] hover:bg-[#004777]/5 px-2.5 py-1.5 rounded-lg border border-[#004777]/10 transition-colors"
        >
          Trocar
        </button>
      </div>
    </div>
  );
}

interface SmartSelectorProps {
  locadorName: string;
  locadorCpf: string;
  locatarioName: string;
  locatarioCpf: string;
  imovelName: string;
  imovelAddr: string;
  onToggleLocador: () => void;
  onToggleLocatario: () => void;
  onToggleImovel: () => void;
  onAddFiador: () => void;
  hasFiador: boolean;
  fiadorName?: string;
}

export function SmartSelector({
  locadorName,
  locadorCpf,
  locatarioName,
  locatarioCpf,
  imovelName,
  imovelAddr,
  onToggleLocador,
  onToggleLocatario,
  onToggleImovel,
  onAddFiador,
  hasFiador,
  fiadorName
}: SmartSelectorProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 w-full h-full flex flex-col border border-black/5">
      <div className="mb-6">
        <h2 className="text-[#280003] font-semibold text-lg">Vínculo de Dados</h2>
        <p className="text-xs text-[#280003]/60 mt-1">Os dados selecionados preencherão o contrato automaticamente.</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SelectionCard 
          title="Proprietário (Locador)" 
          name={locadorName} 
          description={`CPF: ${locadorCpf}`} 
          icon={<User className="w-5 h-5" />} 
          onToggle={onToggleLocador}
        />
        
        <SelectionCard 
          title="Inquilino (Locatário)" 
          name={locatarioName} 
          description={`CPF: ${locatarioCpf}`} 
          icon={<User className="w-5 h-5" />} 
          onToggle={onToggleLocatario}
        />
        
        <SelectionCard 
          title="Imóvel" 
          name={imovelName} 
          description={imovelAddr} 
          icon={<Building2 className="w-5 h-5" />} 
          onToggle={onToggleImovel}
        />

        {hasFiador && (
          <SelectionCard 
            title="Fiador Garantidor" 
            name={fiadorName || 'Roberto Souza'} 
            description="CPF: 333.444.555-88" 
            icon={<User className="w-5 h-5" />} 
            onToggle={onAddFiador}
          />
        )}
      </div>

      {!hasFiador && (
        <div className="mt-4 pt-4 border-t border-[#EEEEF3]">
          <button 
            onClick={onAddFiador}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-[#280003]/20 text-[#280003]/60 hover:text-[#004777] hover:border-[#004777]/50 hover:bg-[#004777]/5 transition-colors text-sm font-medium"
          >
            <Search className="w-4 h-4" />
            Adicionar Fiador (Opcional)
          </button>
        </div>
      )}
    </div>
  );
}
