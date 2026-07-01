import React from 'react';

interface LiveFilledDocumentProps {
  modelName: string;
  content: React.ReactNode;
}

export function FilledVariable({ children }: { children: React.ReactNode }) {
  return (
    <span 
      className="inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-[#708D81]/15 text-[#708D81] font-semibold rounded text-[14.5px] border border-[#708D81]/30 transition-all cursor-default align-baseline"
      title="Dado preenchido automaticamente"
    >
      {children}
    </span>
  );
}

export function LiveFilledDocument({ modelName, content }: LiveFilledDocumentProps) {
  return (
    <div className="flex flex-col h-full w-full bg-[#EEEEF3] rounded-2xl overflow-hidden shadow-sm border border-black/5">
      {/* Header Visualizer */}
      <div className="bg-[#280003] px-6 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#708D81] animate-pulse"></span>
          <span className="text-sm font-medium opacity-90">Auto-preenchimento Ativo</span>
        </div>
        <span className="text-xs opacity-60 font-mono">Modo de Visualização</span>
      </div>

      {/* A4 Sheet Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white shadow-sm p-12 mx-auto max-w-4xl min-h-[1056px] text-[#280003]">
          {content}
        </div>
      </div>
    </div>
  );
}
