import React from 'react';

interface ContractPreviewProps {
  modelName: string;
  content: React.ReactNode;
}

export function ContractVariable({ children }: { children: React.ReactNode }) {
  return (
    <span 
      className="inline-flex items-center px-1.5 py-0.5 mx-1 bg-[#F0D18A]/30 text-[#280003] font-medium rounded text-[13px] border border-[#F0D18A]/50 shadow-sm transition-all hover:bg-[#F0D18A]/50 cursor-default align-baseline"
      title="Esta variável será preenchida automaticamente"
    >
      {children}
    </span>
  );
}

export function ContractPreview({ modelName, content }: ContractPreviewProps) {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Fixed Header */}
      <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-[#EEEEF3] z-10 sticky top-0">
        <h2 className="text-xl font-semibold text-[#280003]">{modelName}</h2>
        <button className="bg-[#004777] hover:bg-[#004777]/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
          Gerar Contrato com Dados
        </button>
      </div>

      {/* A4 Sheet Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#EEEEF3]">
        <div className="bg-white rounded-md shadow-sm p-12 mx-auto max-w-4xl min-h-[1056px] text-[#280003]">
          {content}
        </div>
      </div>
    </div>
  );
}
