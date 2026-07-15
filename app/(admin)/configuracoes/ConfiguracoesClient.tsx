"use client";

import React, { useState, useEffect, useTransition } from "react";
import { saveInterConfigAction, getInterConfigAction } from "@/app/actions/interActions";
import { getImobConfigAction, saveImobConfigAction } from "@/app/actions/imobActions";
import { 
  Building, 
  Key, 
  Users, 
  FileText, 
  CheckCircle, 
  UploadCloud, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Loader2 
} from "lucide-react";
import { useAuth, OrganizationProfile } from "@clerk/nextjs";

export default function ConfiguracoesClient() {
  const { orgRole } = useAuth();
  const isAdmin = !orgRole || orgRole === "org:admin"; // Em dev local (sem orgRole) permite acesso
  const [activeTab, setActiveTab] = useState<"perfil" | "inter" | "users" | "modelos">("perfil");
  const [isPending, startTransition] = useTransition();

  // Estado Banco Inter
  const [config, setConfig] = useState<{
    clientId: string;
    sandbox: boolean;
    hasCert: boolean;
    hasKey: boolean;
  } | null>(null);

  // Estado Perfil Imobiliária
  const [imob, setImob] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Estado Modelos de Contratos
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState("LOCACAO");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    async function loadData() {
      // Config Inter
      const interRes = await getInterConfigAction();
      if (interRes.success && interRes.config) {
        setConfig(interRes.config);
      }
      
      // Perfil Imob
      const imobRes = await getImobConfigAction();
      if (imobRes.success && imobRes.imob) {
        setImob(imobRes.imob);
        setLogoUrl(imobRes.imob.logoUrl);
      }

      // Templates
      loadTemplates();
    }
    loadData();
  }, []);

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/contratos/modelos");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Erro ao carregar templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  }

  // Submit Banco Inter
  async function handleInterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await saveInterConfigAction(null, formData);
      if (res.success) {
        setMessage({ type: "success", text: res.message || "Integração Banco Inter atualizada!" });
        const getRes = await getInterConfigAction();
        if (getRes.success && getRes.config) {
          setConfig(getRes.config);
        }
      } else {
        setMessage({ type: "error", text: res.error || "Erro ao salvar integração." });
      }
    });
  }

  // Submit Perfil Imobiliária
  async function handleImobSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await saveImobConfigAction(null, formData);
      if (res.success) {
        setMessage({ type: "success", text: res.message || "Perfil da imobiliária atualizado!" });
        const imobRes = await getImobConfigAction();
        if (imobRes.success && imobRes.imob) {
          setImob(imobRes.imob);
        }
      } else {
        setMessage({ type: "error", text: res.error || "Erro ao salvar perfil." });
      }
    });
  }

  // Upload Logo
  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/imob/logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogoUrl(data.url);
        setMessage({ type: "success", text: "Logotipo da imobiliária atualizado com sucesso!" });
      } else {
        setMessage({ type: "error", text: data.error || "Erro ao fazer upload do logotipo." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erro na conexão com o servidor." });
    } finally {
      setIsUploadingLogo(false);
    }
  }

  // Upload Template
  async function handleTemplateUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file || !newTemplateName) {
      alert("Por favor, preencha o nome e selecione um arquivo.");
      return;
    }

    setIsUploadingTemplate(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", newTemplateName);
    formData.append("type", newTemplateType);

    try {
      const res = await fetch("/api/contratos/modelos/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Modelo de contrato enviado com sucesso!" });
        setNewTemplateName("");
        form.reset();
        loadTemplates();
      } else {
        setMessage({ type: "error", text: data.error || "Erro ao enviar template." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao fazer upload do modelo." });
    } finally {
      setIsUploadingTemplate(false);
    }
  }

  // Excluir Template
  async function handleTemplateDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este modelo de contrato?")) return;

    setMessage(null);
    try {
      const res = await fetch(`/api/contratos/modelos?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Modelo excluído com sucesso!" });
        loadTemplates();
      } else {
        setMessage({ type: "error", text: data.error || "Erro ao excluir modelo." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erro de conexão ao excluir modelo." });
    }
  }

  // Consulta CEP automática
  async function handleCepBlur(event: React.FocusEvent<HTMLInputElement>) {
    const cep = event.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setImob((prev: any) => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf,
        }));
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 mt-6">
      {/* Sidebar de Navegação interna */}
      <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 bg-white p-3 rounded-2xl shadow-sm border border-gray-100/80 overflow-x-auto lg:overflow-visible">
        <button
          onClick={() => { setActiveTab("perfil"); setMessage(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === "perfil"
              ? "bg-[#280003]/5 text-[#280003]"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <Building className="w-4 h-4" />
          Perfil da Imobiliária
        </button>
        <button
          onClick={() => { setActiveTab("inter"); setMessage(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === "inter"
              ? "bg-[#280003]/5 text-[#280003]"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <Key className="w-4 h-4" />
          Integração Banco Inter
        </button>
        <button
          onClick={() => { setActiveTab("users"); setMessage(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === "users"
              ? "bg-[#280003]/5 text-[#280003]"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <Users className="w-4 h-4" />
          Gerenciar Usuários
        </button>
        <button
          onClick={() => { setActiveTab("modelos"); setMessage(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === "modelos"
              ? "bg-[#280003]/5 text-[#280003]"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          Modelos de Contratos
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100/80 transition-all duration-300">
        
        {/* Mensagens Globais de Status */}
        {message && (
          <div
            className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                : "bg-red-50 text-red-800 border-red-200/60"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* 1. ABA PERFIL */}
        {activeTab === "perfil" && (
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
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
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
        )}

        {/* 2. ABA INTER (Banco Inter) */}
        {activeTab === "inter" && (
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#280003]">Integração Banco Inter API Cobrança V3</h2>
                <p className="text-sm text-gray-500 mt-1">Configure as credenciais e certificados mTLS (Bolepix).</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  config?.sandbox ? "bg-amber-50 text-amber-700 border border-amber-200/50" : "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
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
                    <span className="text-xs text-gray-400 mt-1 mb-3 text-center">
                      Formatos suportados: .pem, .crt
                    </span>
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
                    <span className="text-xs text-gray-400 mt-1 mb-3 text-center">
                      Formatos suportados: .key, .pem
                    </span>
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
        )}

        {/* 3. ABA USUÁRIOS */}
        {activeTab === "users" && (
          <div>
            <h2 className="text-xl font-bold text-[#280003] border-b border-gray-100 pb-4 mb-6">
              Gerenciar Equipe e Convites
            </h2>

            {!isAdmin ? (
              <div className="bg-amber-50 border border-amber-200/50 p-6 rounded-2xl text-center text-amber-800 text-sm font-medium">
                Apenas corretores e administradores têm permissão para acessar a gestão de equipe e enviar convites.
              </div>
            ) : (
              <div className="flex justify-center w-full min-h-[500px]">
                {/* Organização Profile do Clerk integrada */}
                <OrganizationProfile 
                  routing="hash"
                  appearance={{
                    elements: {
                      rootBox: "w-full max-w-4xl shadow-none border border-gray-100 rounded-3xl overflow-hidden",
                      card: "shadow-none w-full max-w-none border-none p-0",
                      navbar: "hidden md:flex border-r border-gray-100 bg-gray-50/50",
                      scrollBox: "rounded-none",
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* 4. ABA MODELOS DE CONTRATOS */}
        {activeTab === "modelos" && (
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
                      className="w-full py-2 bg-[#280003] text-white hover:bg-[#280003]/90 rounded-lg text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                  <div className="text-gray-400 py-12 text-center text-xs italic">
                    Nenhum modelo cadastrado no sistema.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((t) => (
                      <div 
                        key={t.id} 
                        className="bg-white border border-gray-100 hover:border-gray-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between transition-all"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-800 leading-tight">
                              {t.name}
                            </span>
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                              {t.type}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block mb-3 font-mono">
                            {t.fileName}
                          </span>

                          {t.variables && t.variables.length > 0 && (
                            <div className="mb-4">
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                Variáveis Detectadas:
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto border border-gray-50 p-1.5 rounded-lg bg-gray-50/20">
                                {t.variables.map((v: string) => (
                                  <span key={v} className="text-[8px] bg-slate-100 text-[#004777] px-1 py-0.5 rounded font-mono font-bold">
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
                          {!t.isDefault && (
                            isAdmin && (
                              <button
                                onClick={() => handleTemplateDelete(t.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Modelo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
