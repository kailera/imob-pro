import React from 'react';
import CedenteForm from '@/components/CedenteForm';
import { List, Settings, Info, Home, ChevronRight } from 'lucide-react';

export default function CedenteConfigPage() {
  return (
    <div className="min-h-screen bg-[#EEEEF3] flex">
      {/* Sidebar Lateral */}
      <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6 shrink-0 shadow-sm z-10">
        <button className="p-2 text-gray-400 hover:bg-gray-50 hover:text-[#004777] rounded-lg transition-colors">
          <List className="w-5 h-5" />
        </button>
        {/* Active item */}
        <button className="p-2 text-[#004777] bg-[#EEEEF3] rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-400 hover:bg-gray-50 hover:text-[#004777] rounded-lg transition-colors">
          <Info className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between text-sm shadow-sm z-0">
          <div className="flex items-center gap-2 text-gray-500">
            <Home className="w-4 h-4" />
            <ChevronRight className="w-4 h-4" />
            <span className="cursor-pointer hover:text-[#004777] transition-colors">Configurações</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-[#280003]">Dados do cedente</span>
          </div>
          <div className="font-semibold text-[#280003]">
            Imob Pro
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto w-full">
            <CedenteForm />
          </div>
        </main>
      </div>
    </div>
  );
}
