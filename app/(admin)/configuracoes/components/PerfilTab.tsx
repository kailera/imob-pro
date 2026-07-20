import React from "react";
import { Building, Loader2 } from "lucide-react";

interface PerfilTabProps {
  isAdmin: boolean;
  imob: any;
  setImob: React.Dispatch<React.SetStateAction<any>>;
  logoUrl: string | null;
  isUploadingLogo: boolean;
  handleLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImobSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleCepBlur: (event: React.FocusEvent<HTMLInputElement>) => Promise<void>;
  isPending: boolean;
}

export function PerfilTab({
  isAdmin,
  imob,
  setImob,
  logoUrl,
  isUploadingLogo,
  handleLogoUpload,
  handleImobSubmit,
  handleCepBlur,
  isPending,
}: PerfilTabProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#280003] border-b border-gray-100 pb-4 mb-6">
        Perfil da Imobiliária
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Upload Logotipo */}
        <div className="flex flex-col items-center gap-3 md:col-span-1 border-r border-gray-100 pr-6">
          <span className="text-sm font-semibold text-gray-700">Logotipo</span>
          <div className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center overflow-hidden hover:border-[#280003]/40 transition-all">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Building className="w-10 h-10 text-gray-300" />
            )}
            {isUploadingLogo && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#280003]" />
              </div>
            )}
          </div>
          <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
            Alterar Logotipo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={isUploadingLogo}
            />
          </label>
        </div>

        {/* Form de Dados Cadastrais */}
        <div className="md:col-span-3">
          {!isAdmin ? (
            <div className="bg-amber-50 border border-amber-200/50 p-6 rounded-2xl text-center text-amber-800 text-sm font-medium">
              Apenas corretores e administradores têm permissão para atualizar os dados do perfil da imobiliária.
            </div>
          ) : (
            <form onSubmit={handleImobSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razão Social</label>
                  <input
                    type="text"
                    name="razaoSocial"
                    value={imob?.razaoSocial || ""}
                    onChange={(e) => setImob({ ...imob, razaoSocial: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    name="nomeFantasia"
                    value={imob?.nomeFantasia || ""}
                    onChange={(e) => setImob({ ...imob, nomeFantasia: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                  <input
                    type="text"
                    name="cnpj"
                    value={imob?.cnpj || ""}
                    onChange={(e) => setImob({ ...imob, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CRECI Jurídico</label>
                  <input
                    type="text"
                    name="creci"
                    value={imob?.creci || ""}
                    onChange={(e) => setImob({ ...imob, creci: e.target.value })}
                    placeholder="CRECI J-00000"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone de Contato</label>
                  <input
                    type="text"
                    name="telefone"
                    value={imob?.telefone || ""}
                    onChange={(e) => setImob({ ...imob, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail de Contato</label>
                  <input
                    type="email"
                    name="emailContato"
                    value={imob?.emailContato || ""}
                    onChange={(e) => setImob({ ...imob, emailContato: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-6">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Endereço da Sede</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                    <input
                      type="text"
                      name="cep"
                      value={imob?.cep || ""}
                      onChange={(e) => setImob({ ...imob, cep: e.target.value })}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logradouro</label>
                    <input
                      type="text"
                      name="logradouro"
                      value={imob?.logradouro || ""}
                      onChange={(e) => setImob({ ...imob, logradouro: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label>
                    <input
                      type="text"
                      name="numero"
                      value={imob?.numero || ""}
                      onChange={(e) => setImob({ ...imob, numero: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Complemento</label>
                    <input
                      type="text"
                      name="complemento"
                      value={imob?.complemento || ""}
                      onChange={(e) => setImob({ ...imob, complemento: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label>
                    <input
                      type="text"
                      name="bairro"
                      value={imob?.bairro || ""}
                      onChange={(e) => setImob({ ...imob, bairro: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label>
                    <input
                      type="text"
                      name="cidade"
                      value={imob?.cidade || ""}
                      onChange={(e) => setImob({ ...imob, cidade: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">UF</label>
                    <input
                      type="text"
                      name="uf"
                      value={imob?.uf || ""}
                      onChange={(e) => setImob({ ...imob, uf: e.target.value })}
                      maxLength={2}
                      placeholder="SP"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#280003]/10 text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-[#280003] hover:bg-[#280003]/90 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 text-sm shadow-md cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Perfil"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
