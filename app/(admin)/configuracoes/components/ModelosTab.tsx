import React from "react";
import { Plus, UploadCloud, Loader2, Trash2 } from "lucide-react";

interface ModelosTabProps {
  isAdmin: boolean;
  templates: any[];
  loadingTemplates: boolean;
  isUploadingTemplate: boolean;
  newTemplateName: string;
  setNewTemplateName: (value: string) => void;
  newTemplateType: string;
  setNewTemplateType: (value: string) => void;
  handleTemplateUpload: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleTemplateDelete: (id: string) => Promise<void>;
}

export function ModelosTab({
  isAdmin,
  templates,
  loadingTemplates,
  isUploadingTemplate,
  newTemplateName,
  setNewTemplateName,
  newTemplateType,
  setNewTemplateType,
  handleTemplateUpload,
  handleTemplateDelete,
}: ModelosTabProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#280003] border-b border-gray-100 pb-4 mb-6">
        Modelos de Contratos (.docx)
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Painel de Upload de Template */}
        <div className="xl:col-span-1 bg-gray-50/50 border border-gray-100 p-5 rounded-2xl h-fit">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#280003]" />
            Enviar Novo Modelo
          </h3>

          {!isAdmin ? (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 p-3.5 rounded-xl font-semibold">
              Apenas administradores podem enviar novos modelos de contratos (.docx).
            </div>
          ) : (
            <form onSubmit={handleTemplateUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nome do Modelo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Contrato de Locação Residencial"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#280003]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Tipo de Contrato <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTemplateType}
                  onChange={(e) => setNewTemplateType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#280003] bg-white cursor-pointer"
                >
                  <option value="LOCACAO">Locação</option>
                  <option value="VENDA">Venda (Intermediação)</option>
                  <option value="PROPOSTA">Proposta / Procuração</option>
                  <option value="LIMPEZA">Limpeza / Vistoria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Arquivo Word (.docx) <span className="text-red-500">*</span>
                </label>
                <div className="border border-dashed border-gray-200 bg-white hover:border-[#280003]/40 p-4 rounded-xl flex flex-col items-center justify-center transition-all relative">
                  <UploadCloud className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-[10px] font-bold text-gray-700">Escolher arquivo .docx</span>
                  <input
                    type="file"
                    accept=".docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploadingTemplate}
                className="w-full py-2 bg-[#280003] text-white hover:bg-[#280003]/90 rounded-lg text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isUploadingTemplate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Upload e Processar"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Lista de Modelos Existentes */}
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-gray-700">Modelos Cadastrados</h3>

          {loadingTemplates ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#280003]" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-gray-400 py-12 text-center text-xs italic">Nenhum modelo cadastrado no sistema.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="bg-white border border-gray-100 hover:border-gray-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-gray-800 leading-tight">{t.name}</span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                        {t.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 block mb-3 font-mono">{t.fileName}</span>

                    {t.variables && t.variables.length > 0 && (
                      <div className="mb-4">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Variáveis Detectadas:
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto border border-gray-50 p-1.5 rounded-lg bg-gray-50/20">
                          {t.variables.map((v: string) => (
                            <span
                              key={v}
                              className="text-[8px] bg-slate-100 text-[#004777] px-1 py-0.5 rounded font-mono font-bold"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-50 pt-2.5 mt-2">
                    <span className="text-[9px] text-gray-400">
                      {t.isDefault ? "Padrão do Sistema" : "Customizado"}
                    </span>
                    {!t.isDefault && isAdmin && (
                      <button
                        onClick={() => handleTemplateDelete(t.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
