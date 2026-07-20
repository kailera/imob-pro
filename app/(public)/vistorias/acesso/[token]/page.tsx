"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, FileText, AlertCircle, Loader2 } from "lucide-react";
import { validateTenantAccess } from "@/app/(admin)/vistorias/actions";

export default function TenantAccessPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [cpfCnpj, setCpfCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpfCnpj) {
      setError("Por favor, informe seu CPF ou CNPJ.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await validateTenantAccess(token, cpfCnpj);
      if (res.success) {
        // Salva autorização no sessionStorage para a sessão atual
        sessionStorage.setItem(`vistoria_auth_${token}`, "true");
        router.push(`/vistorias/${token}`);
      } else {
        setError(res.error || "Acesso negado. CPF/CNPJ incorreto.");
      }
    } catch (err: any) {
      setError("Ocorreu um erro ao validar o acesso. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 bg-brand-bg-primary">
      <div className="w-full max-w-md bg-white border border-[#EEEEF3] rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#004777] p-6 text-white text-center flex flex-col items-center gap-3">
          <div className="p-3 bg-white/10 rounded-full">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Acesso Seguro da Vistoria</h1>
            <p className="text-xs text-white/70 mt-1">
              Confirme sua identidade para visualizar e contestar a vistoria do imóvel.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cpf-input" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              CPF ou CNPJ do Locatário ou Proprietário
            </label>
            <input
              id="cpf-input"
              type="text"
              placeholder="Digite apenas números..."
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 border border-[#EEEEF3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20 transition-all font-mono"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#004777] text-white font-semibold rounded-xl text-sm hover:bg-[#00365a] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Acessar Laudo de Vistoria</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
