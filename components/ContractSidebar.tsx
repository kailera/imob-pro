import { FileText } from 'lucide-react';

interface ContractSidebarProps {
  models: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ContractSidebar({ models, selectedId, onSelect }: ContractSidebarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 h-full flex flex-col">
      <h2 className="text-[#280003] font-semibold text-lg mb-4 px-2">Modelos de Contrato</h2>
      <div className="flex flex-col space-y-1 overflow-y-auto flex-1">
        {models.map((model) => {
          const isActive = model.id === selectedId;
          return (
            <button
              key={model.id}
              onClick={() => onSelect(model.id)}
              className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left transition-colors duration-200 ${
                isActive
                  ? 'bg-[#004777]/10 text-[#004777] font-medium'
                  : 'text-[#280003]/70 hover:bg-[#EEEEF3] hover:text-[#280003]'
              }`}
            >
              <FileText className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#004777]' : 'text-[#280003]/50'}`} />
              <span className="text-sm leading-tight">{model.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
