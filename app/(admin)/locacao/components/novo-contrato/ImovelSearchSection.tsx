import React from 'react';
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput';
import { Building, Search, Info } from 'lucide-react';

interface ImovelSearchSectionProps {
  imovelSearchQuery: string;
  imovelSearchResults: any[];
  selectedImovelId: string;
  resolvedLandlord: any;
  vistoriaStatus: string;
  customAluguel: string;
  customCondominio: string;
  customIptu: string;
  selectedTemplateIdForNew: string;
  templates: any[];
  handlePropertySearch: (val: string) => void;
  handleSelectSearchedProperty: (imovel: any) => void;
  setSelectedTemplateIdForNew: (val: string) => void;
  setCustomAluguel: (val: string) => void;
  setCustomCondominio: (val: string) => void;
  setCustomIptu: (val: string) => void;
  onEditLandlord?: () => void;
  onEditProperty?: () => void;
}

export function ImovelSearchSection({
  imovelSearchQuery,
  imovelSearchResults,
  selectedImovelId,
  resolvedLandlord,
  vistoriaStatus,
  customAluguel,
  customCondominio,
  customIptu,
  selectedTemplateIdForNew,
  templates,
  handlePropertySearch,
  handleSelectSearchedProperty,
  setSelectedTemplateIdForNew,
  setCustomAluguel,
  setCustomCondominio,
  setCustomIptu,
  onEditLandlord,
  onEditProperty
}: ImovelSearchSectionProps) {
  return (
    <div id="section-imovel" className="bg-[#EEEEF3]/10 p-4 rounded-xl border border-zinc-100 space-y-4 col-span-1 scroll-mt-2">
      <div className="flex items-center gap-2 text-sm font-bold text-[#004777]">
        <Building className="w-4 h-4" />
        2. Dados do Imóvel da Carteira
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Buscar Imóvel por Endereço *</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Digite o código ou endereço..."
              value={imovelSearchQuery}
              onChange={e => handlePropertySearch(e.target.value)}
              className="block w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#004777]"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
          </div>

          {imovelSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 mt-1 max-h-48 overflow-y-auto">
              {imovelSearchResults.map(imovel => (
                <button
                  key={imovel.id}
                  type="button"
                  onClick={() => handleSelectSearchedProperty(imovel)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 border-b border-zinc-100 last:border-0 flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-gray-700">{imovel.codigo} - {imovel.tipo}</span>
                  <span className="text-gray-500">{imovel.bairro}, {imovel.cidade} - {imovel.uf}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Modelo de Contrato a Usar *</label>
          <select
            value={selectedTemplateIdForNew}
            onChange={e => setSelectedTemplateIdForNew(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedImovelId !== '' && (
        <div className="space-y-4 mt-2">
          {onEditProperty && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onEditProperty}
                className="text-[10px] text-[#004777] font-bold hover:underline"
              >
                Editar Dados/Endereço do Imóvel
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            {/* Proprietário */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Proprietário (Locador)</span>
                {resolvedLandlord && onEditLandlord && (
                  <button
                    type="button"
                    onClick={onEditLandlord}
                    className="text-[10px] text-[#004777] font-bold hover:underline"
                  >
                    Editar
                  </button>
                )}
              </div>
              {resolvedLandlord ? (
                <div className="space-y-1.5 text-xs text-gray-700">
                  <p className="font-bold text-emerald-950 text-sm">{resolvedLandlord.nome}</p>
                  <p><strong>CPF/CNPJ:</strong> {resolvedLandlord.cpfCnpj}</p>
                  <p><strong>RG:</strong> {resolvedLandlord.rg || 'Não informado'}</p>
                  {(() => {
                    let displayAddr = '';
                    if (Array.isArray(resolvedLandlord.endereco) && resolvedLandlord.endereco.length > 0) {
                      try {
                        const parsed = JSON.parse(resolvedLandlord.endereco[0]);
                        displayAddr = `${parsed.logradouro || ''}, ${parsed.numero || ''} ${parsed.bairro || ''} - ${parsed.municipio || ''}/${parsed.estado || ''}`;
                      } catch (e) {
                        displayAddr = resolvedLandlord.endereco[0];
                      }
                    } else {
                      displayAddr = resolvedLandlord.endereco || '';
                    }
                    return displayAddr ? <p className="text-gray-500 leading-tight"><strong>Endereço:</strong> {displayAddr}</p> : null;
                  })()}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Nenhum proprietário associado a este imóvel no sistema.</p>
              )}
            </div>

            {/* Vistoria */}
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">Laudo de Vistoria</span>
              {vistoriaStatus ? (
                <div className="space-y-1.5 text-xs text-gray-700">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-zinc-500" />
                    {vistoriaStatus.includes('CONCLUIDA') ? 'Vistoria Concluída' : 'Vistoria Verificada'}
                  </p>
                  <p className="text-gray-600 leading-relaxed">{vistoriaStatus}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Nenhum registro de vistoria para este imóvel.</p>
              )}
            </div>
          </div>

          {/* Valores Financeiros */}
          <div className="bg-white p-4 rounded-xl border border-zinc-200 text-xs grid grid-cols-1 gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Aluguel do Imóvel (R$)</span>
              <FormattedNumberInput
                format="currency"
                value={customAluguel}
                onValueChange={setCustomAluguel}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Taxa Condomínio (R$)</span>
              <FormattedNumberInput
                format="currency"
                value={customCondominio}
                onValueChange={setCustomCondominio}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Taxa IPTU (R$)</span>
              <FormattedNumberInput
                format="currency"
                value={customIptu}
                onValueChange={setCustomIptu}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
