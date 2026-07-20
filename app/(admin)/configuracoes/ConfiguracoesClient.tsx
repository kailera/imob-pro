"use client";

import React, { useState, useEffect, useTransition } from "react";
import { saveInterConfigAction, getInterConfigAction } from "@/app/actions/interActions";
import { getImobConfigAction, saveImobConfigAction, createNewUser, getUsers, getCurrentUserRole, deleteUser } from "@/app/(admin)/configuracoes/configuracoesActions";
import {
  Building,
  Key,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { PerfilTab } from "./components/PerfilTab";
import { InterTab } from "./components/InterTab";
import { UsersTab } from "./components/UsersTab";
import { ModelosTab } from "./components/ModelosTab";

export default function ConfiguracoesClient() {
  const { orgId, orgRole, userId: currentUserId } = useAuth();


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

  // Estado Criação de Usuário
  const [userEmail, setUserEmail] = useState("");
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userCreci, setUserCreci] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"ADMIN" | "OPERADOR" | "CORRETOR">("CORRETOR");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userDbRole, setUserDbRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);


  const isAdmin = !orgRole || orgRole === "org:admin" || userDbRole === "ADMIN" || userDbRole === "CORRETOR"; const [activeTab, setActiveTab] = useState<"perfil" | "inter" | "users" | "modelos">("perfil");

  async function handleCreateUserSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const activeOrgId = orgId || "org_default";

    setIsCreatingUser(true);
    try {
      const res = await createNewUser({
        email: userEmail,
        firstName: userFirstName,
        lastName: userLastName,
        creci: userCreci || undefined,
        password: userPassword || undefined,
        role: userRole,
        orgId: activeOrgId,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Usuário cadastrado com sucesso no Clerk e no banco local!" });
        setUserEmail("");
        setUserFirstName("");
        setUserLastName("");
        setUserCreci("");
        setUserPassword("");
        setUserRole("CORRETOR");
        loadUsers();
      } else {
        setMessage({ type: "error", text: res.error || "Erro ao cadastrar usuário." });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err?.message || "Erro de conexão ao cadastrar usuário." });
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function handleDeleteUser(targetUserId: string, userName: string) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userName}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setMessage(null);
    try {
      const res = await deleteUser(targetUserId);
      if (res.success) {
        setMessage({ type: "success", text: res.message || "Usuário excluído com sucesso!" });
        loadUsers();
      } else {
        setMessage({ type: "error", text: res.error || "Erro ao excluir usuário." });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err?.message || "Erro de conexão ao excluir usuário." });
    }
  }

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

      try {
        const roleRes = await getCurrentUserRole();
        if (roleRes.success && roleRes.role) {
          setUserDbRole(roleRes.role);
        }
      } catch (err) {
        console.error("Erro ao carregar role do usuário:", err);
      } finally {
        setLoadingRole(false);
      }

      // Templates
      loadTemplates();

      // Usuários
      loadUsers();
    }
    loadData();
  }, []);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await getUsers();
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoadingUsers(false);
    }
  }

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
          onClick={() => {
            setActiveTab("perfil");
            setMessage(null);
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === "perfil"
            ? "bg-[#280003]/5 text-[#280003]"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
        >
          <Building className="w-4 h-4" />
          Perfil da Imobiliária
        </button>
        <button
          onClick={() => {
            setActiveTab("inter");
            setMessage(null);
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === "inter"
            ? "bg-[#280003]/5 text-[#280003]"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
        >
          <Key className="w-4 h-4" />
          Integração Banco Inter
        </button>
        <button
          onClick={() => {
            setActiveTab("users");
            setMessage(null);
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === "users"
            ? "bg-[#280003]/5 text-[#280003]"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
        >
          <Users className="w-4 h-4" />
          Gerenciar Usuários
        </button>
        <button
          onClick={() => {
            setActiveTab("modelos");
            setMessage(null);
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === "modelos"
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
            className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${message.type === "success"
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
          <PerfilTab
            isAdmin={isAdmin}
            imob={imob}
            setImob={setImob}
            logoUrl={logoUrl}
            isUploadingLogo={isUploadingLogo}
            handleLogoUpload={handleLogoUpload}
            handleImobSubmit={handleImobSubmit}
            handleCepBlur={handleCepBlur}
            isPending={isPending}
          />
        )}

        {/* 2. ABA INTER (Banco Inter) */}
        {activeTab === "inter" && (
          <InterTab
            isAdmin={isAdmin}
            config={config}
            handleInterSubmit={handleInterSubmit}
            isPending={isPending}
          />
        )}

        {/* 3. ABA USUÁRIOS */}
        {activeTab === "users" && (
          <UsersTab
            isAdmin={isAdmin}
            currentUserId={currentUserId || ""}
            handleDeleteUser={handleDeleteUser}
            userEmail={userEmail}
            setUserEmail={setUserEmail}
            userFirstName={userFirstName}
            setUserFirstName={setUserFirstName}
            userLastName={userLastName}
            setUserLastName={setUserLastName}
            userCreci={userCreci}
            setUserCreci={setUserCreci}
            userPassword={userPassword}
            setUserPassword={setUserPassword}
            userRole={userRole}
            setUserRole={setUserRole}
            isCreatingUser={isCreatingUser}
            handleCreateUserSubmit={handleCreateUserSubmit}
            users={users}
            loadingUsers={loadingUsers}
          />
        )}

        {/* 4. ABA MODELOS DE CONTRATOS */}
        {activeTab === "modelos" && (
          <ModelosTab
            isAdmin={isAdmin}
            templates={templates}
            loadingTemplates={loadingTemplates}
            isUploadingTemplate={isUploadingTemplate}
            newTemplateName={newTemplateName}
            setNewTemplateName={setNewTemplateName}
            newTemplateType={newTemplateType}
            setNewTemplateType={setNewTemplateType}
            handleTemplateUpload={handleTemplateUpload}
            handleTemplateDelete={handleTemplateDelete}
          />
        )}
      </div>
    </div>
  );
}
