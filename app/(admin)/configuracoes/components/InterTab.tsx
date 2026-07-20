import React from "react";
import { UploadCloud, CheckCircle, Loader2 } from "lucide-react";

interface InterTabProps {
  isAdmin: boolean;
  config: {
    clientId: string;
    sandbox: boolean;
    hasCert: boolean;
    hasKey: boolean;
  } | null;
  handleInterSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isPending: boolean;
}

export function InterTab({
  isAdmin,
  config,
  handleInterSubmit,
  isPending,
}: InterTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#280003]">Integração Banco Inter API Cobrança V3</h2>
          <p className="text-sm text-gray-500 mt-1">Configure as credenciais e certificados mTLS (Bolepix).</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            config?.sandbox
              ? "bg-amber-50 text-amber-700 border border-amber-200/50"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
          }`}
        >
          {config ? (config.sandbox ? "Ambiente: Sandbox" : "Ambiente: Produção") : "Sem Configuração"}
        </span>
      </div>

      {!isAdmin ? (
        <div className="bg-amber-50 border border-amber-200/50 p-6 rounded-2xl text-center text-amber-800 text-sm font-medium mt-6">
          Apenas corretores e administradores têm permissão para alterar as configurações de integração do Banco Inter.
        </div>
      ) : (
        <form onSubmit={handleInterSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="clientId"
                defaultValue={config?.clientId || ""}
                placeholder="Digite o Client ID gerado no aplicativo do Inter"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#280003]/25 focus:border-[#280003] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client Secret <span className="text-red-500">{config ? "" : "*"}</span>
              </label>
              <input
                type="password"
                name="clientSecret"
                placeholder={config ? "••••••••••••••••••••••••" : "Digite o Client Secret"}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#280003]/25 focus:border-[#280003] transition-all"
              />
              {config && (
                <span className="text-xs text-gray-400 mt-1 block">
                  Deixe em branco para manter a credencial secreta atual.
                </span>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#280003]">Ambiente de Testes (Sandbox)</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Se ativado, as transações serão enviadas para a API de Sandbox e nenhum boleto real será emitido.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="sandbox"
                defaultChecked={config?.sandbox ?? true}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#280003]/25 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#280003]"></div>
            </label>
          </div>

          {/* Certificate Files Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Certificado PEM */}
            <div className="border border-dashed border-gray-200 hover:border-[#280003]/40 p-5 rounded-2xl flex flex-col items-center justify-center transition-all bg-white relative">
              <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-bold text-gray-700 text-center">Certificado API (.pem)</span>
              <span className="text-xs text-gray-400 mt-1 mb-3 text-center">Formatos suportados: .pem, .crt</span>
              <input
                type="file"
                name="certFile"
                accept=".pem,.crt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {config?.hasCert && (
                <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-3 py-1 rounded-full text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Certificado Cadastrado
                </div>
              )}
            </div>

            {/* Chave Privada KEY */}
            <div className="border border-dashed border-gray-200 hover:border-[#280003]/40 p-5 rounded-2xl flex flex-col items-center justify-center transition-all bg-white relative">
              <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-bold text-gray-700 text-center">Chave Privada (.key)</span>
              <span className="text-xs text-gray-400 mt-1 mb-3 text-center">Formatos suportados: .key, .pem</span>
              <input
                type="file"
                name="keyFile"
                accept=".key,.pem"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {config?.hasKey && (
                <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-3 py-1 rounded-full text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Chave Privada Cadastrada
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 rounded-xl bg-[#280003] hover:bg-[#280003]/90 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 text-sm shadow-md cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando configurações...
                </>
              ) : (
                "Salvar Integração"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
